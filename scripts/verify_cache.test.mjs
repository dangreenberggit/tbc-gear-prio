import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  FORCE_VAR,
  computeKeyParts,
  keyOf,
  verifyWithCache,
} from "./verify_cache.mjs";
import { OPT_OUT } from "./verify_fork_guard.mjs";

const TAG = "abc123";
const cleanup = [];
afterEach(() => {
  for (const dir of cleanup.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanup.push(dir);
  return dir;
}

/**
 * The environment the cache sees. GIT_DIR and its kin are dropped so the
 * fixture's git acts on the temp repos, not on this checkout (ticket 742);
 * GIT_CONFIG* stays, as the pre-push hook keeps it.
 */
function baseEnv() {
  const env = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith("GIT_") || name.startsWith("GIT_CONFIG")) {
      env[name] = value;
    }
  }
  for (const name of [FORCE_VAR, OPT_OUT, "CI", "GITHUB_ACTIONS"]) {
    delete env[name];
  }
  return env;
}

function put(root, rel, text, mode) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  if (mode !== undefined) chmodSync(path, mode);
}

function git(cwd, env, ...args) {
  return execFileSync(
    "git",
    [
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd, env, stdio: "pipe" }
  ).toString();
}

/**
 * A checkout with one file of each kind the key reads or leaves out: tracked
 * and ignored files, vendor/ inputs, install records, build outputs, and a
 * fork repo with its own generated and ignored files.
 */
function makeCheckout() {
  const root = tempDir("verify-cache-");
  const gitconfig = join(tempDir("verify-cache-gitconfig-"), "config");
  writeFileSync(gitconfig, "[core]\n\tautocrlf = false\n");
  const env = { ...baseEnv(), GIT_CONFIG_GLOBAL: gitconfig };
  // A command-scope setting, as the sandbox passes its proxy.
  env.GIT_CONFIG_PARAMETERS = [
    env.GIT_CONFIG_PARAMETERS,
    "'http.proxy=http://localhost:1'",
  ]
    .filter(Boolean)
    .join(" ");

  put(
    root,
    ".gitignore",
    [
      "node_modules/",
      "vendor/",
      "dist/",
      "dist-server/",
      "__pycache__/",
      "*.tsbuildinfo",
      ".env",
      ".scratch/*",
      ".claude/.cc-writes/",
      ".claude/scheduled_tasks.json",
      "",
    ].join("\n")
  );
  put(root, "src/a.ts", "export const a = 1;\n");
  put(root, "data/wowsims.lock.json", JSON.stringify({ tag: TAG }));
  git(root, env, "init", "-q");
  git(root, env, "add", "-A");
  git(root, env, "commit", "-q", "-m", "base");

  put(root, "node_modules/.pnpm/lock.yaml", "lockfileVersion: 9\n");
  put(
    root,
    "node_modules/.modules.yaml",
    JSON.stringify({ layoutVersion: 5, prunedAt: "Thu", storeDir: "/s/a" })
  );
  put(root, "node_modules/left-pad/index.js", "x");
  put(root, "vendor/wowsims/db.json", "{}");
  put(root, "vendor/atlasloot/loot.lua", "x");
  put(root, `vendor/wowsimcli-${TAG}-linux-x64/wowsimcli`, "bin", 0o755);
  put(root, "vendor/wowsimcli-oldtag-linux-x64/wowsimcli", "old", 0o755);
  put(root, ".env", "X=1\n");
  put(root, "packages/core/dist/index.js", "built\n");
  put(root, "apps/web/dist-server/main.js", "built\n");
  put(root, "packages/core/tsconfig.tsbuildinfo", "{}");
  put(root, "scripts/__pycache__/x.pyc", "pyc");
  put(root, ".scratch/agent-runs/log.jsonl", "{}");
  put(root, ".claude/.cc-writes/a.json", "{}");
  put(root, ".claude/scheduled_tasks.json", "[]");

  const fork = join(root, "vendor", "tbc-new-fork");
  put(
    fork,
    ".gitignore",
    [
      "node_modules/",
      "dist/",
      "binary_dist/",
      "/wowsimtbc*",
      "ui/generated/",
      "",
    ].join("\n")
  );
  put(fork, "ui/tab.ts", "export const t = 1;\n");
  git(fork, env, "init", "-q");
  git(fork, env, "add", "-A");
  git(fork, env, "commit", "-q", "-m", "fork base");
  put(fork, "ui/generated/proto.ts", "gen\n");
  put(fork, "node_modules/.package-lock.json", "{}");
  put(fork, "node_modules/dep/index.js", "x");
  put(fork, "dist/tbc/lib.wasm", "wasm");
  put(fork, "binary_dist/stub", "x");
  put(fork, "wowsimtbc", "bin", 0o755);

  const c = {
    root,
    fork,
    env,
    gitconfig,
    cacheDir: tempDir("verify-cache-store-"),
    toolsText: "node v22.0.0\npnpm 12.0.0",
  };
  c.tools = async () => c.toolsText;
  return c;
}

async function keyFor(c) {
  return keyOf(
    await computeKeyParts({ root: c.root, env: c.env, tools: c.tools })
  );
}

const withEnv = (extra) => (c) => {
  c.env = { ...c.env, ...extra };
};

// Each change, made on its own, must move the key: a stamp for the old key
// would otherwise pass a run whose gates read something new.
const MOVES = [
  {
    what: "a tracked file's content",
    change: (c) => put(c.root, "src/a.ts", "export const a = 2;\n"),
  },
  {
    what: "a tracked file's executable bit",
    change: (c) => chmodSync(join(c.root, "src/a.ts"), 0o755),
  },
  {
    what: "a tracked file deleted",
    change: (c) => unlinkSync(join(c.root, "src/a.ts")),
  },
  {
    what: "an untracked file",
    change: (c) => put(c.root, "src/new.ts", "x\n"),
  },
  {
    // format:check reads only tracked files, so tracking one matters.
    what: "an untracked file staged",
    before: (c) => put(c.root, "src/new.ts", "x\n"),
    change: (c) => git(c.root, c.env, "add", "src/new.ts"),
  },
  {
    what: "an ignored file outside the left-out folders (.env)",
    change: (c) => put(c.root, ".env", "X=2\n"),
  },
  {
    what: "a new ignored folder",
    change: (c) => put(c.root, "coverage/index.html", "x"),
  },
  {
    what: "a build output in dist/",
    change: (c) => put(c.root, "packages/core/dist/index.js", "stale\n"),
  },
  {
    what: "a build output in dist-server/",
    change: (c) => put(c.root, "apps/web/dist-server/main.js", "stale\n"),
  },
  {
    what: "a vendor/wowsims file",
    change: (c) => put(c.root, "vendor/wowsims/db.json", "{1}"),
  },
  {
    what: "a vendor/atlasloot file",
    change: (c) => put(c.root, "vendor/atlasloot/loot.lua", "y"),
  },
  {
    what: "the wowsimcli binary for the lock's tag",
    change: (c) =>
      put(c.root, `vendor/wowsimcli-${TAG}-linux-x64/wowsimcli`, "bin2"),
  },
  {
    what: "the lock's wowsimcli tag",
    change: (c) =>
      put(c.root, "data/wowsims.lock.json", JSON.stringify({ tag: "oldtag" })),
  },
  {
    what: "the fork's HEAD commit alone",
    change: (c) =>
      git(c.fork, c.env, "commit", "-q", "--allow-empty", "-m", "empty"),
  },
  {
    what: "a tracked fork file",
    change: (c) => put(c.fork, "ui/tab.ts", "export const t = 2;\n"),
  },
  {
    what: "an untracked fork file",
    change: (c) => put(c.fork, "ui/new.ts", "x\n"),
  },
  {
    what: "a generated (ignored) fork file",
    change: (c) => put(c.fork, "ui/generated/proto.ts", "gen2\n"),
  },
  {
    what: "the fork's installed-package record",
    change: (c) => put(c.fork, "node_modules/.package-lock.json", '{"a":1}'),
  },
  {
    what: "pnpm's lock record",
    change: (c) =>
      put(c.root, "node_modules/.pnpm/lock.yaml", "lockfileVersion: 10\n"),
  },
  {
    what: "a .modules.yaml field other than prunedAt and storeDir",
    change: (c) =>
      put(
        c.root,
        "node_modules/.modules.yaml",
        JSON.stringify({ layoutVersion: 6, prunedAt: "Thu", storeDir: "/s/a" })
      ),
  },
  {
    what: "a tool version",
    change: (c) => {
      c.toolsText = "node v22.1.0\npnpm 12.0.0";
    },
  },
  {
    what: "a global git setting",
    change: (c) => writeFileSync(c.gitconfig, "[core]\n\tautocrlf = true\n"),
  },
  {
    what: "a command-scope git setting",
    change: (c) => {
      c.env = {
        ...c.env,
        GIT_CONFIG_PARAMETERS: `${c.env.GIT_CONFIG_PARAMETERS} 'core.autocrlf=true'`,
      };
    },
  },
  {
    what: "the fork's own git config",
    change: (c) => git(c.fork, c.env, "config", "core.filemode", "false"),
  },
  {
    what: "NODE_OPTIONS",
    change: withEnv({ NODE_OPTIONS: "--max-old-space-size=512" }),
  },
  { what: "a TBC_ variable", change: withEnv({ TBC_TAB_FIXTURE: "x" }) },
  { what: "a PYTHON variable", change: withEnv({ PYTHONHASHSEED: "1" }) },
  { what: "a GO variable", change: withEnv({ GOFLAGS: "-buildvcs=false" }) },
  { what: "a VITEST variable", change: withEnv({ VITEST_MAX_THREADS: "1" }) },
  { what: "TZ", change: withEnv({ TZ: "Asia/Tokyo" }) },
  { what: "an LC_ variable", change: withEnv({ LC_ALL: "C" }) },
];

// Inputs left out of the key on purpose (verify_cache.mjs header): a change
// to any of them alone must not cost a run.
const STAYS = [
  {
    what: "a dirty edit committed as it stood",
    before: (c) => put(c.root, "src/a.ts", "export const a = 2;\n"),
    change: (c) => git(c.root, c.env, "commit", "-q", "-am", "x"),
  },
  {
    what: "Claude Code's ignored session files under .claude/",
    change: (c) => {
      put(c.root, ".claude/.cc-writes/a.json", "{1}");
      put(c.root, ".claude/scheduled_tasks.json", "[1]");
    },
  },
  {
    what: "an ignored file under .scratch/",
    change: (c) => put(c.root, ".scratch/agent-runs/log.jsonl", "{1}"),
  },
  {
    what: "a .tsbuildinfo",
    change: (c) => put(c.root, "packages/core/tsconfig.tsbuildinfo", "{1}"),
  },
  {
    what: "a __pycache__ file",
    change: (c) => put(c.root, "scripts/__pycache__/x.pyc", "pyc2"),
  },
  {
    what: "an installed package's file",
    change: (c) => put(c.root, "node_modules/left-pad/index.js", "y"),
  },
  {
    what: ".modules.yaml's prunedAt and storeDir",
    change: (c) =>
      put(
        c.root,
        "node_modules/.modules.yaml",
        JSON.stringify({ layoutVersion: 5, prunedAt: "Fri", storeDir: "/s/b" })
      ),
  },
  {
    what: "a wowsimcli folder for another tag",
    change: (c) =>
      put(c.root, "vendor/wowsimcli-oldtag-linux-x64/wowsimcli", "o2"),
  },
  {
    what: "the fork's dist/",
    change: (c) => put(c.fork, "dist/tbc/lib.wasm", "wasm2"),
  },
  {
    what: "the fork's binary_dist/ and wowsimtbc binary",
    change: (c) => {
      put(c.fork, "binary_dist/stub", "y");
      put(c.fork, "wowsimtbc", "bin2");
    },
  },
  {
    what: "a fork dependency's file",
    change: (c) => put(c.fork, "node_modules/dep/index.js", "y"),
  },
  {
    what: "PATH",
    change: (c) => {
      c.env = { ...c.env, PATH: `/nonexistent-dir:${c.env.PATH}` };
    },
  },
  { what: FORCE_VAR, change: withEnv({ [FORCE_VAR]: "1" }) },
  {
    what: "GIT_EXEC_PATH, which git sets in hooks",
    change: (c) => {
      const execPath = execFileSync("git", ["--exec-path"]).toString().trim();
      c.env = { ...c.env, GIT_EXEC_PATH: execPath };
    },
  },
  {
    what: "pnpm's per-call variables",
    change: withEnv({
      npm_lifecycle_event: "other",
      PNPM_SCRIPT_SRC_DIR: "/x",
      INIT_CWD: "/x",
    }),
  },
  {
    what: "the sandbox's git proxy value",
    change: (c) => {
      c.env = {
        ...c.env,
        GIT_CONFIG_PARAMETERS: c.env.GIT_CONFIG_PARAMETERS.replace(
          "localhost:1",
          "localhost:2"
        ),
      };
    },
  },
];

describe("verify cache key", () => {
  it("is the same when nothing changed", async () => {
    const c = makeCheckout();
    expect(await keyFor(c)).toBe(await keyFor(c));
  });

  it.each(MOVES)("moves with $what", async ({ before, change }) => {
    const c = makeCheckout();
    if (before) before(c);
    const old = await keyFor(c);
    change(c);
    expect(await keyFor(c)).not.toBe(old);
  });

  it.each(STAYS)("stays with $what", async ({ before, change }) => {
    const c = makeCheckout();
    if (before) before(c);
    const old = await keyFor(c);
    change(c);
    expect(await keyFor(c)).toBe(old);
  });

  it("cannot be computed in a folder that is not its own git repository", async () => {
    const c = makeCheckout();
    const sub = join(c.root, "src");
    await expect(
      computeKeyParts({ root: sub, env: c.env, tools: c.tools })
    ).rejects.toThrow();
  });

  it("cannot be computed when the lock's tag would nest a folder", async () => {
    const c = makeCheckout();
    put(c.root, "data/wowsims.lock.json", JSON.stringify({ tag: "feature/x" }));
    await expect(keyFor(c)).rejects.toThrow(/tag/);
  });
});

/** Runs verifyWithCache with a stand-in for the full run. */
async function verify(c, { env = c.env, full } = {}) {
  const lines = [];
  let ran = false;
  const code = await verifyWithCache({
    root: c.root,
    env,
    cacheDir: c.cacheDir,
    tools: c.tools,
    log: (line) => lines.push(line),
    runFull: async () => {
      ran = true;
      return full ? full(c) : { code: 0, ran: 7, skipped: 0 };
    },
  });
  return { code, lines, ran, text: lines.join("\n") };
}

const stamps = (c) =>
  readdirSync(c.cacheDir).filter((f) => f.endsWith(".json"));

describe("verifyWithCache", () => {
  it("runs in full and leaves a stamp; the same inputs then pass without a run", async () => {
    const c = makeCheckout();
    const first = await verify(c);
    expect(first).toMatchObject({ code: 0, ran: true });
    expect(stamps(c)).toHaveLength(1);

    const second = await verify(c);
    expect(second).toMatchObject({ code: 0, ran: false });
    expect(second.lines.some((l) => l.startsWith("verify: cached -- "))).toBe(
      true
    );
  });

  it("keeps the cached line free of `gates:`, so log counts of real runs stay honest", async () => {
    const c = makeCheckout();
    await verify(c);
    const hit = await verify(c);
    expect(hit.ran).toBe(false);
    expect(hit.text).not.toMatch(/gates:/);
  });

  it.each([
    ["a tracked edit", (c) => put(c.root, "src/a.ts", "export const a = 3;\n")],
    ["a fork edit", (c) => put(c.fork, "ui/tab.ts", "export const t = 3;\n")],
    ["a changed NODE_OPTIONS", withEnv({ NODE_OPTIONS: "--no-warnings" })],
  ])("runs in full after %s", async (_, change) => {
    const c = makeCheckout();
    await verify(c);
    change(c);
    expect((await verify(c)).ran).toBe(true);
  });

  it("names the parts that changed since this folder's last pass", async () => {
    const c = makeCheckout();
    await verify(c);
    put(c.root, "src/a.ts", "export const a = 3;\n");
    withEnv({ NODE_OPTIONS: "--no-warnings" })(c);
    const miss = await verify(c);
    expect(miss.ran).toBe(true);
    expect(miss.text).toMatch(/main-tree/);
    expect(miss.text).toMatch(/env/);
  });

  it(`runs in full under ${FORCE_VAR}=1 and still leaves a stamp`, async () => {
    const c = makeCheckout();
    await verify(c);
    const forced = await verify(c, { env: { ...c.env, [FORCE_VAR]: "1" } });
    expect(forced.ran).toBe(true);
    rmSync(c.cacheDir, { recursive: true, force: true });
    await verify(c, { env: { ...c.env, [FORCE_VAR]: "1" } });
    expect(stamps(c)).toHaveLength(1);
    expect((await verify(c)).ran).toBe(false);
  });

  it("leaves no stamp after a failed run", async () => {
    const c = makeCheckout();
    const failed = await verify(c, {
      full: () => ({ code: 1, ran: 0, skipped: 0 }),
    });
    expect(failed.code).toBe(1);
    expect(stamps(c)).toHaveLength(0);
    expect((await verify(c)).ran).toBe(true);
  });

  it("leaves no stamp after a run that reported skips", async () => {
    const c = makeCheckout();
    await verify(c, { full: () => ({ code: 0, ran: 5, skipped: 2 }) });
    expect(stamps(c)).toHaveLength(0);
  });

  it.each([
    ["the opt-out", { [OPT_OUT]: "1" }],
    ["GitHub Actions", { GITHUB_ACTIONS: "true" }],
    ["CI", { CI: "true" }],
    ["GIT_DIR", { GIT_DIR: "/elsewhere/.git" }],
    ["GIT_INDEX_FILE", { GIT_INDEX_FILE: "/elsewhere/index" }],
  ])("neither reads nor leaves a stamp under %s", async (_, extra) => {
    const c = makeCheckout();
    const env = { ...c.env, ...extra };
    const off = await verify(c, { env });
    expect(off.ran).toBe(true);
    expect(stamps(c)).toHaveLength(0);

    await verify(c);
    expect(stamps(c)).toHaveLength(1);
    expect((await verify(c, { env })).ran).toBe(true);
  });

  it("leaves no stamp when a key input changed while verify ran", async () => {
    const c = makeCheckout();
    const run = await verify(c, {
      full: (cc) => {
        put(cc.root, "src/a.ts", "export const a = 4;\n");
        return { code: 0, ran: 7, skipped: 0 };
      },
    });
    expect(stamps(c)).toHaveLength(0);
    expect(run.text).toMatch(/main-tree/);
  });

  it("leaves a stamp for the rebuilt outputs when verify's own build rewrote them", async () => {
    const c = makeCheckout();
    await verify(c, {
      full: (cc) => {
        put(cc.root, "packages/core/dist/index.js", "rebuilt\n");
        return { code: 0, ran: 7, skipped: 0 };
      },
    });
    expect(stamps(c)).toHaveLength(1);
    expect((await verify(c)).ran).toBe(false);
  });

  it("runs in full when the stamp will not parse", async () => {
    const c = makeCheckout();
    await verify(c);
    const [name] = stamps(c);
    writeFileSync(join(c.cacheDir, name), "{not json");
    const run = await verify(c);
    expect(run.ran).toBe(true);
    expect(run.text).toMatch(/could not be read/);
  });

  it.each([
    [
      "a missing install record",
      (c) => unlinkSync(join(c.fork, "node_modules", ".package-lock.json")),
    ],
    [
      "a tool that will not report its version",
      (c) => {
        c.tools = async () => {
          throw new Error("go: not found");
        };
      },
    ],
  ])("runs in full and leaves no stamp with %s", async (_, breakIt) => {
    const c = makeCheckout();
    breakIt(c);
    const run = await verify(c);
    expect(run.ran).toBe(true);
    expect(run.text).toMatch(/verify: cache off -- /);
    expect(stamps(c)).toHaveLength(0);
  });
});
