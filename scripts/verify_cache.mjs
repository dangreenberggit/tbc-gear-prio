/**
 * Pass cache for `pnpm verify` (ticket 876).
 *
 * The full suite takes about five minutes, and on the way to dev it ran 8-10
 * times per branch, 3-5 of them on inputs that had already passed
 * (.scratch/agent-reports/2026-11-12-general-task-verify-run-cache.md). A
 * green full run leaves a stamp named by a hash of what its gates read; a
 * later run whose inputs hash the same prints `verify: cached -- ...` and
 * exits 0. Every caller (the pre-push hook, merge-to-dev, a hand run) goes
 * through run_verify.mjs, so this is the one place that reads and writes it.
 *
 * The danger is a false pass: a hit when something a gate reads has changed.
 * So the key errs wide (a miss costs one run), a part that cannot be computed
 * means a full run, and a stamp is written only when the inputs were the same
 * after the run as before it.
 *
 * Left out of the key on purpose, each because it changes between runs whose
 * gates read the same things:
 * - PATH and GIT_EXEC_PATH: git's hooks prepend its exec path to PATH and set
 *   GIT_EXEC_PATH, so with them a hand run would never match the pre-push run.
 *   The tools verify runs are pinned by the `tools` part instead.
 * - npm_*, PNPM_* and INIT_CWD: pnpm's per-call bookkeeping. Other GIT_*
 *   variables (GIT_EDITOR, GIT_SSH_COMMAND): no gate opens an editor or ssh;
 *   GIT_CONFIG* reaches the key through `git config --list`.
 * - The values of command-scope proxy and credential git settings: the
 *   sandbox injects them, and no gate fetches over git. Their names stay in.
 * - Ignored files under .scratch/ and .claude/worktrees/: no verify step reads
 *   them, vitest and eslint exclude them, and agent hooks write there while a
 *   run is going.
 * - __pycache__/: Python checks each .pyc against its source's mtime and size.
 * - *.tsbuildinfo: tsc's build history (it differs between checkouts built in
 *   a different order); `tsc --build` checks it against the sources, and the
 *   dist/ and dist-server/ files it emits are in the key.
 * - Installed package files under node_modules/, beyond pnpm's and npm's
 *   install records; and prunedAt and storeDir in .modules.yaml.
 * - In vendor/, wowsimcli folders for tags other than data/wowsims.lock.json's:
 *   resolveWowsimcli (packages/core/src/cli-wiring.ts) builds the path from it.
 * - In the fork: dist/, binary_dist/ and the wowsimtbc*, wowsimcli* binaries
 *   at its root. Only the layout gate and the dev servers read them, and
 *   verify runs neither.
 * - This repo's commits, branches and staged content: no verify step reads
 *   them. format:check reads which paths are tracked, which is in the key.
 */

import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { OPT_OUT } from "./verify_fork_guard.mjs";

const execFileAsync = promisify(execFile);

/** Bump to drop every stamp, e.g. after the key gains a part. */
export const SCHEMA = 1;
export const FORCE_VAR = "TBC_VERIFY_FRESH";

/** Every part of the key, in key order. */
export const PART_NAMES = [
  "schema",
  "main-tree",
  "main-ignored",
  "build-outputs",
  "vendor",
  "node-modules",
  "fork-head",
  "fork-tree",
  "fork-ignored",
  "fork-node-modules",
  "git-config",
  "tools",
  "env",
];

/**
 * Parts verify itself rewrites: the typecheck step's `tsc --build` emits
 * dist/ and dist-server/ before any later step reads them. A change to these
 * during a run does not block the stamp; the stamp is keyed on what the run
 * left behind.
 */
const RUN_OUTPUT_PARTS = new Set(["build-outputs"]);

const ENV_PREFIXES = [
  "TBC_",
  "NODE_",
  "VITE",
  "PYTHON",
  "GO",
  "CGO_",
  "PLAYWRIGHT",
  "LC_",
];
// Names verify's code or its tools read that no prefix above covers
// (a search of process.env and os.environ reads, 2026-11-12).
const ENV_NAMES = new Set([
  "CI",
  "GITHUB_ACTIONS",
  "HOME",
  "TMPDIR",
  "TMP",
  "TEMP",
  "TZ",
  "LANG",
  "LANGUAGE",
  "TERM",
  "FORCE_COLOR",
  "NO_COLOR",
  "UV_THREADPOOL_SIZE",
  "DATABASE_URL",
  "PORT",
  "SIM_CONCURRENCY",
  "TAB_FIXTURE_DIR",
  "WASM_WORKER",
  "FAKE_VITEST_MODE",
  "STUB_RC",
  "STUB_VERDICT",
]);

/** Command-scope git settings the sandbox injects; their values stay out. */
const SANDBOX_GIT_KEY = /^(credential\.|https?\.(.*\.)?proxy$)/i;

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

/** @param {Record<string, string | undefined>} env */
export function defaultCacheDir(env) {
  const base = env.XDG_CACHE_HOME || join(homedir(), ".cache");
  return join(base, "tbc-gear-prio", "verify-pass");
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]} the variable names whose values are in the key
 */
export function keyedEnvNames(env) {
  return Object.keys(env)
    .filter(
      (name) =>
        name !== FORCE_VAR &&
        (ENV_NAMES.has(name) || ENV_PREFIXES.some((p) => name.startsWith(p)))
    )
    .sort();
}

function git(cwd, args, env) {
  return execFileSync("git", ["-C", cwd, ...args], {
    env,
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const nulList = (buf) =>
  buf
    .toString("utf8")
    .split("\0")
    .filter((s) => s.length > 0);

/**
 * Refuses a folder that is not the top of its own repository: git would read
 * the enclosing repository instead, as for a fork folder that is a plain copy.
 */
function assertRepoTop(dir, env) {
  const top = git(dir, ["rev-parse", "--show-toplevel"], env)
    .toString("utf8")
    .trim();
  if (realpathSync(top) !== realpathSync(dir)) {
    throw new Error(`${dir} is not the top of its own git repository`);
  }
}

/** What is on disk at `abs`: kind and content, never trusting git's index. */
function entryDigest(abs) {
  let st;
  try {
    st = lstatSync(abs);
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "ENOTDIR") return "missing";
    throw err;
  }
  if (st.isSymbolicLink()) return `link:${readlinkSync(abs)}`;
  if (st.isFile()) {
    return `${st.mode & 0o111 ? "x" : "f"}:${sha256(readFileSync(abs))}`;
  }
  if (st.isDirectory()) return "dir";
  return "other";
}

/**
 * Tracked and untracked files with the bytes on disk. Bytes, not git's blob
 * ids: git's index can report a file clean whose line endings a write
 * changed, and the gates read the bytes (known-traps.md, scripted edits).
 */
function treeLines(root, env) {
  const lines = [];
  for (const p of nulList(git(root, ["ls-files", "-z"], env))) {
    lines.push(`T ${p}\0${entryDigest(join(root, p))}`);
  }
  const others = ["ls-files", "-z", "--others", "--exclude-standard"];
  for (const p of nulList(git(root, others, env))) {
    if (p.endsWith("/")) {
      throw new Error(
        `${p} is a nested git repository the key cannot see into`
      );
    }
    lines.push(`U ${p}\0${entryDigest(join(root, p))}`);
  }
  return lines;
}

/**
 * Calls `visit` for every file under `rel`, in a fixed order, minus what
 * `skip` names. Symlinks are not followed.
 */
function walk(root, rel, visit, skip) {
  if (skip(rel)) return;
  const abs = join(root, rel);
  if (!lstatSync(abs).isDirectory()) {
    visit(rel, entryDigest(abs));
    return;
  }
  for (const name of readdirSync(abs).sort()) {
    walk(root, `${rel}/${name}`, visit, skip);
  }
}

function ignoredPaths(root, env) {
  const args = [
    "ls-files",
    "-z",
    "--others",
    "--ignored",
    "--exclude-standard",
    "--directory",
  ];
  return nulList(git(root, args, env)).map((p) => p.replace(/\/$/, ""));
}

const segments = (p) => p.split("/");
const derivedCache = (p) =>
  segments(p).some((s) => s === "node_modules" || s === "__pycache__") ||
  p.endsWith(".tsbuildinfo");

/** @returns {"skip" | "build-outputs" | "main-ignored"} */
function mainIgnoredClass(p) {
  const [first, second] = segments(p);
  if (derivedCache(p) || first === "vendor" || first === ".scratch") {
    return "skip";
  }
  if (first === ".claude" && second === "worktrees") return "skip";
  if (segments(p).some((s) => s === "dist" || s === "dist-server")) {
    return "build-outputs";
  }
  return "main-ignored";
}

function forkIgnoredSkipped(p) {
  const segs = segments(p);
  if (derivedCache(p)) return true;
  if (segs[0] === "dist" || segs[0] === "binary_dist") return true;
  return segs.length === 1 && /^(wowsimtbc|wowsimcli)/.test(segs[0]);
}

function lockTag(root) {
  const lock = JSON.parse(
    readFileSync(join(root, "data", "wowsims.lock.json"), "utf8")
  );
  const tag = lock.tag;
  if (typeof tag !== "string" || tag === "" || tag.includes("/")) {
    throw new Error(
      `data/wowsims.lock.json tag ${JSON.stringify(tag)} names no single vendor/wowsimcli-<tag>-* folder`
    );
  }
  return tag;
}

function vendorLines(root, tag) {
  if (!existsSync(join(root, "vendor"))) return ["absent"];
  const lines = [];
  const skip = (child) => {
    const segs = segments(child);
    if (segs.length !== 2) return false;
    if (segs[1] === "tbc-new-fork") return true;
    return (
      segs[1].startsWith("wowsimcli-") &&
      !segs[1].startsWith(`wowsimcli-${tag}-`)
    );
  };
  walk(root, "vendor", (rel, digest) => lines.push(`${rel}\0${digest}`), skip);
  return lines;
}

function nodeModulesLines(root) {
  const nm = join(root, "node_modules");
  const modules = JSON.parse(readFileSync(join(nm, ".modules.yaml"), "utf8"));
  delete modules.prunedAt;
  delete modules.storeDir;
  return [
    `lock.yaml\0${sha256(readFileSync(join(nm, ".pnpm", "lock.yaml")))}`,
    `.modules.yaml\0${JSON.stringify(modules)}`,
  ];
}

/** `git config --list` as git applies it, sandbox plumbing values left out. */
function gitConfigLines(dir, env) {
  const tokens = git(dir, ["config", "--list", "--show-scope", "-z"], env)
    .toString("utf8")
    .split("\0");
  const lines = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const scope = tokens[i];
    const nl = tokens[i + 1].indexOf("\n");
    const name = nl === -1 ? tokens[i + 1] : tokens[i + 1].slice(0, nl);
    const value = nl === -1 ? "" : tokens[i + 1].slice(nl + 1);
    lines.push(
      scope === "command" && SANDBOX_GIT_KEY.test(name)
        ? `${scope} ${name}`
        : `${scope} ${name}=${value}`
    );
  }
  return lines;
}

/** The tools verify's steps run, as the shell finds them. */
export async function toolVersions(env) {
  const probe = async (cmd, args) => {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      env,
      // Windows resolves a bare `pnpm` only through a shell (run_verify.mjs).
      shell: process.platform === "win32" && cmd === "pnpm",
    });
    return `${cmd} ${(stdout + stderr).trim()}`;
  };
  const lines = await Promise.all([
    probe("node", ["--version"]),
    probe("pnpm", ["--version"]),
    probe("python", ["--version"]),
    probe("go", ["version"]),
    probe("git", ["--version"]),
  ]);
  return [
    `platform ${process.platform} ${process.arch}`,
    `node-running ${process.version}`,
    ...lines,
  ].join("\n");
}

/**
 * @param {{
 *   root: string,
 *   env: Record<string, string | undefined>,
 *   tools?: (env: Record<string, string | undefined>) => Promise<string>,
 * }} input
 * @returns {Promise<Record<string, string>>} a digest per PART_NAMES entry;
 *   throws when any part cannot be computed
 */
export async function computeKeyParts({ root, env, tools = toolVersions }) {
  const text = {};
  const forkRoot = join(root, "vendor", "tbc-new-fork");
  assertRepoTop(root, env);
  assertRepoTop(forkRoot, env);

  text.schema = String(SCHEMA);
  text["main-tree"] = treeLines(root, env);
  // Classified per file: git reports a folder that holds only ignored files
  // as one entry, so a dist/ can sit inside an entry that is not one.
  const ignored = { "main-ignored": [], "build-outputs": [] };
  const visitMain = (rel, digest) =>
    ignored[mainIgnoredClass(rel)].push(`${rel}\0${digest}`);
  const skipMain = (rel) => mainIgnoredClass(rel) === "skip";
  for (const p of ignoredPaths(root, env)) walk(root, p, visitMain, skipMain);
  text["main-ignored"] = ignored["main-ignored"];
  text["build-outputs"] = ignored["build-outputs"];
  text.vendor = vendorLines(root, lockTag(root));
  text["node-modules"] = nodeModulesLines(root);

  text["fork-head"] = git(forkRoot, ["rev-parse", "HEAD"], env)
    .toString("utf8")
    .trim();
  text["fork-tree"] = treeLines(forkRoot, env);
  const forkIgnored = [];
  const visitFork = (rel, digest) => forkIgnored.push(`${rel}\0${digest}`);
  for (const p of ignoredPaths(forkRoot, env)) {
    walk(forkRoot, p, visitFork, forkIgnoredSkipped);
  }
  text["fork-ignored"] = forkIgnored;
  text["fork-node-modules"] = sha256(
    readFileSync(join(forkRoot, "node_modules", ".package-lock.json"))
  );

  text["git-config"] = [
    "main",
    ...gitConfigLines(root, env),
    "fork",
    ...gitConfigLines(forkRoot, env),
  ];
  text.tools = await tools(env);
  text.env = keyedEnvNames(env).map((name) => `${name}=${env[name]}`);

  const parts = {};
  for (const name of PART_NAMES) {
    const value = text[name];
    parts[name] = sha256(Array.isArray(value) ? value.join("\n") : value);
  }
  return parts;
}

/** @param {Record<string, string>} parts */
export function keyOf(parts) {
  return sha256(PART_NAMES.map((name) => `${name}\0${parts[name]}\0`).join(""));
}

const changedParts = (a, b) => PART_NAMES.filter((name) => a[name] !== b[name]);

/**
 * @returns {{read: boolean, write: boolean, reason: string | null}}
 */
function cachePolicy(env) {
  if (env.GITHUB_ACTIONS === "true" || env.CI) {
    return { read: false, write: false, reason: "this is CI" };
  }
  if (env[OPT_OUT] === "1") {
    return {
      read: false,
      write: false,
      reason: `${OPT_OUT}=1 runs without the fork gates`,
    };
  }
  // The variables the pre-push hook clears (.githooks/pre-push): with any of
  // them set, the key's git reads could describe another repository.
  const probeEnv = Object.fromEntries(
    Object.entries(env).filter(([name]) => !name.startsWith("GIT_"))
  );
  const local = execFileSync("git", ["rev-parse", "--local-env-vars"], {
    env: probeEnv,
  })
    .toString("utf8")
    .split("\n")
    .filter((name) => name && !name.startsWith("GIT_CONFIG"));
  const set = local.filter((name) => env[name] !== undefined);
  if (set.length > 0) {
    return {
      read: false,
      write: false,
      reason: `${set.join(", ")} is set, so git would read another repository`,
    };
  }
  if (env[FORCE_VAR]) {
    return { read: false, write: true, reason: `${FORCE_VAR} is set` };
  }
  return { read: true, write: true, reason: null };
}

const stampPath = (dir, key) => join(dir, `${key}.json`);

function readStamp(dir, key) {
  let text;
  try {
    text = readFileSync(stampPath(dir, key), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return { state: "none" };
    return { state: "corrupt" };
  }
  try {
    const stamp = JSON.parse(text);
    if (stamp.schema === SCHEMA && stamp.key === key) {
      return { state: "hit", stamp };
    }
  } catch {
    // Falls through: a stamp that will not parse is treated as no stamp.
  }
  return { state: "corrupt" };
}

/** The newest stamp written from `root`, to say what moved since. */
function lastStampFrom(dir, root) {
  let names;
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch {
    return null;
  }
  let newest = null;
  for (const name of names) {
    try {
      const stamp = JSON.parse(readFileSync(join(dir, name), "utf8"));
      if (
        stamp.root === root &&
        (!newest || stamp.writtenAt > newest.writtenAt)
      ) {
        newest = stamp;
      }
    } catch {
      // An unreadable stamp says nothing about what moved.
    }
  }
  return newest;
}

function writeStamp(dir, key, stamp) {
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${key}.${process.pid}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(stamp, null, 2)}\n`);
  renameSync(tmp, stampPath(dir, key));
}

/**
 * Runs `runFull` unless a stamp shows these exact inputs already passed in
 * full, and leaves a stamp after a green full run.
 *
 * @param {{
 *   root: string,
 *   env: Record<string, string | undefined>,
 *   runFull: () => Promise<{code: number, ran: number, skipped: number}>,
 *   cacheDir?: string,
 *   tools?: (env: Record<string, string | undefined>) => Promise<string>,
 *   log?: (line: string) => void,
 * }} input
 * @returns {Promise<number>} the exit code
 */
export async function verifyWithCache({
  root,
  env,
  runFull,
  cacheDir = defaultCacheDir(env),
  tools = toolVersions,
  log = console.log,
}) {
  let policy;
  try {
    policy = cachePolicy(env);
  } catch (err) {
    policy = {
      read: false,
      write: false,
      reason: `git failed: ${err.message}`,
    };
  }
  if (!policy.write) {
    log(`verify: cache off -- ${policy.reason}; running in full.`);
    return (await runFull()).code;
  }

  let before;
  try {
    before = await computeKeyParts({ root, env, tools });
  } catch (err) {
    log(
      `verify: cache off -- could not compute the inputs key (${err.message}); running in full.`
    );
    return (await runFull()).code;
  }

  if (policy.read) {
    const found = readStamp(cacheDir, keyOf(before));
    if (found.state === "hit") {
      const s = found.stamp;
      log(
        `verify: cached -- these inputs passed in full at ${s.writtenAt} in ${s.root} (${s.ran} ran, 0 skipped). ${FORCE_VAR}=1 runs it again.`
      );
      return 0;
    }
    if (found.state === "corrupt") {
      log(
        `verify: the stamp ${stampPath(cacheDir, keyOf(before))} could not be read; running in full.`
      );
    } else {
      const last = lastStampFrom(cacheDir, root);
      const moved = last?.parts ? changedParts(last.parts, before) : [];
      log(
        moved.length > 0
          ? `verify: no cached pass for these inputs (changed since the last pass here: ${moved.join(", ")}); running in full.`
          : "verify: no cached pass for these inputs; running in full."
      );
    }
  } else {
    log(`verify: cache not read -- ${policy.reason}; running in full.`);
  }

  const result = await runFull();
  if (result.code !== 0) return result.code;
  if (result.skipped !== 0) {
    log("verify: no pass stamp -- the run reported skips.");
    return result.code;
  }

  let after;
  try {
    after = await computeKeyParts({ root, env, tools });
  } catch (err) {
    log(
      `verify: no pass stamp -- could not compute the inputs key after the run (${err.message}).`
    );
    return result.code;
  }
  const moved = changedParts(before, after).filter(
    (name) => !RUN_OUTPUT_PARTS.has(name)
  );
  if (moved.length > 0) {
    log(
      `verify: no pass stamp -- ${moved.join(", ")} changed while verify ran.`
    );
    return result.code;
  }
  const key = keyOf(after);
  writeStamp(cacheDir, key, {
    schema: SCHEMA,
    key,
    writtenAt: new Date().toISOString(),
    root,
    ran: result.ran,
    parts: after,
    envNames: keyedEnvNames(env),
  });
  log(`verify: pass stamp written to ${stampPath(cacheDir, key)}`);
  return result.code;
}
