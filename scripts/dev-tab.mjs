// Start the Upgrades-tab dev servers from the main checkout: the Go sim
// backend on :3333 and the vite frontend on :5173 (http://localhost:5173/tbc/).
// Both build and serve the fork clone at vendor/tbc-new-fork, which is
// gitignored, so this script finds it relative to its own path.
//
// Usage:
//   node scripts/dev-tab.mjs [both|backend|frontend|desktop]
//        [--backend-port N] [--frontend-port N]
//
//   both      (default) backend and frontend together in this terminal, each
//             log line prefixed; Ctrl+C stops both, and either one exiting
//             stops the other.
//   backend   build ./sim/web and serve dist/ live from disk (--usefs=true),
//             so a frontend rebuild shows without rebuilding the binary.
//   frontend  vite with scripts/tab-harness/vite.config.mjs (upstream's config
//             plus the tab-fixture plugin), with upstream's type checker on.
//   desktop   `make wowsimtbc` and run the packaged binary WITHOUT --usefs, so
//             it serves its embedded net_worker.js: the HTTP transport that
//             `pnpm desktop-gate:check` verifies.
//
// The backend port must stay 3333 unless the frontend's proxy target changes
// too: the frontend hardcodes it.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { USE_PROCESS_GROUPS, killGroup, killTree } from "./process-group.mjs";

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), "..");
const FORK = path.join(ROOT, "vendor", "tbc-new-fork");
const VITE_CONFIG = path.join(
  ROOT,
  "scripts",
  "tab-harness",
  "vite.config.mjs"
);
const EXE = process.platform === "win32" ? ".exe" : "";

function parseArgs(argv) {
  const args = { mode: "both", backendPort: 3333, frontendPort: 5173 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // pnpm passes a literal `--` through to the script.
    if (a === "--") continue;
    if (a === "--backend-port") args.backendPort = Number(argv[++i]);
    else if (a === "--frontend-port") args.frontendPort = Number(argv[++i]);
    else if (["both", "backend", "frontend", "desktop"].includes(a))
      args.mode = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  for (const p of [args.backendPort, args.frontendPort])
    if (!Number.isInteger(p) || p <= 0)
      throw new Error(`not a port number: ${p}`);
  return args;
}

const log = (msg) => console.log(`[dev-tab] ${msg}`);

// A signal death has no exit code; 128 + its number is the shell's convention.
const signalExitCode = (signal) => 128 + (os.constants.signals[signal] ?? 0);

function runSync(cmd, args, env = process.env) {
  const r = spawnSync(cmd, args, { cwd: FORK, stdio: "inherit", env });
  if (r.error) throw r.error;
  if (r.status !== 0)
    throw new Error(`${cmd} ${args.join(" ")} exited ${r.status}`);
}

// A server that ends without this script stopping it, even with code 0 or by
// a signal from outside, is a failure the caller (a terminal, a launcher, or
// `both` mode) must be able to see.
// The server runs in its own process group so that stopping it also stops
// what it started (scripts/process-group.mjs).
function serve(cmd, args, env = process.env) {
  // stdin is ignored because a process outside the terminal's foreground
  // group is stopped (SIGTTIN) when it reads the terminal, and both servers
  // read it for interactive commands this script does not need.
  const detached = USE_PROCESS_GROUPS;
  const child = spawn(cmd, args, {
    cwd: FORK,
    stdio: ["ignore", "inherit", "inherit"],
    detached,
    env,
  });
  let stopRequested = false;
  const stop = () => {
    stopRequested = true;
    killTree(child, detached);
  };
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, stop);
  child.on("error", (err) => {
    console.error(`[dev-tab] could not start ${cmd}: ${err.message}`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (detached) killGroup(child.pid);
    if (stopRequested) process.exit(0);
    console.error(
      `[dev-tab] the server ended on its own (${signal ? `signal ${signal}` : `exit ${code}`}).`
    );
    process.exit(signal ? signalExitCode(signal) : code || 1);
  });
}

function backend(port) {
  log(`building the sim backend (port ${port})...`);
  // go:embed needs binary_dist/dist.go and binary_dist/tbc/embedded to exist;
  // the embedded marker stays empty because this mode serves dist/ from disk.
  fs.mkdirSync(path.join(FORK, "binary_dist", "tbc"), { recursive: true });
  fs.copyFileSync(
    path.join(FORK, "sim", "web", "dist.go.tmpl"),
    path.join(FORK, "binary_dist", "dist.go")
  );
  fs.writeFileSync(path.join(FORK, "binary_dist", "tbc", "embedded"), "");
  const name = port === 3333 ? `wowsimtbc${EXE}` : `wowsimtbc-${port}${EXE}`;
  runSync("go", ["build", "-o", name, "./sim/web"]);
  log(`starting the backend on :${port}...`);
  serve(path.join(FORK, name), [
    "--usefs=true",
    "--launch=false",
    `--host=:${port}`,
  ]);
}

function desktop(port) {
  log("building the packaged desktop binary (make wowsimtbc)...");
  const env = { ...process.env };
  if (process.platform === "win32") {
    // The makefile calls `uname -s` and `realpath`, which on Windows exist
    // only in Git's usr\bin.
    const git = spawnSync("where", ["git"], { encoding: "utf8" });
    const gitExe = git.stdout?.split(/\r?\n/)[0];
    if (gitExe) {
      const usrBin = path.join(
        path.dirname(path.dirname(gitExe)),
        "usr",
        "bin"
      );
      if (fs.existsSync(path.join(usrBin, "uname.exe")))
        env.PATH = `${usrBin}${path.delimiter}${env.PATH}`;
    }
  }
  runSync("make", ["wowsimtbc"], env);
  // No --usefs here: serving dist/ from disk would bypass the embedded
  // net_worker.js this mode exists to exercise.
  log(`starting the embedded desktop server on :${port}...`);
  serve(path.join(FORK, `wowsimtbc${EXE}`), [
    "--launch=false",
    `--host=:${port}`,
  ]);
}

function frontend(port) {
  log(`starting vite on :${port}...`);
  // cwd stays the fork: upstream's vite config resolves some paths against it.
  // This is the one launcher that turns the type checker back on, because
  // serve stops its `tsc --watch` with the server. A batch that starts it can
  // set TBC_TAB_TYPE_CHECKER=0 to skip the watcher it does not need.
  serve(
    process.execPath,
    [
      path.join(FORK, "node_modules", "vite", "bin", "vite.js"),
      "serve",
      "--config",
      VITE_CONFIG,
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      ...process.env,
      TBC_TAB_TYPE_CHECKER: process.env.TBC_TAB_TYPE_CHECKER ?? "1",
    }
  );
}

function prefixLines(stream, tag, out) {
  let rest = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const lines = (rest + chunk).split(/\r?\n/);
    rest = lines.pop();
    for (const line of lines) out.write(`${tag} ${line}\n`);
  });
  stream.on("end", () => {
    if (rest) out.write(`${tag} ${rest}\n`);
  });
}

function both(args) {
  log(
    `starting backend :${args.backendPort} and frontend :${args.frontendPort}; ` +
      `Ctrl+C stops both. Tab: http://localhost:${args.frontendPort}/tbc/`
  );
  const children = [
    ["backend", "--backend-port", String(args.backendPort)],
    ["frontend", "--frontend-port", String(args.frontendPort)],
  ].map(([mode, ...rest]) => {
    const child = spawn(process.execPath, [SELF, mode, ...rest], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const tag = `[${mode}]`;
    prefixLines(child.stdout, tag, process.stdout);
    prefixLines(child.stderr, tag, process.stderr);
    return { mode, child };
  });
  let exitCode = null;
  let stopRequested = false;
  const stopAll = () => children.forEach(({ child }) => killTree(child));
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.on(sig, () => {
      stopRequested = true;
      stopAll();
    });
  for (const { mode, child } of children) {
    child.on("exit", (code, signal) => {
      // A wrapper exits 0 only when it stopped its own server on a stop
      // signal (see serve), so its code can be passed on unchanged.
      if (exitCode === null) {
        exitCode = stopRequested ? 0 : (code ?? signalExitCode(signal));
        log(
          `${mode} stopped (${signal ? `signal ${signal}` : `exit ${code}`}); stopping the other server.`
        );
        stopAll();
      }
      if (
        children.every(
          (c) => c.child.exitCode !== null || c.child.signalCode !== null
        )
      )
        process.exit(exitCode);
    });
  }
}

const args = parseArgs(process.argv.slice(2));
if (!fs.existsSync(FORK)) {
  console.error(
    `[dev-tab] no fork clone at ${FORK}. The tab servers need vendor/tbc-new-fork ` +
      "(gitignored): run this from the main checkout or a pair."
  );
  process.exit(1);
}
try {
  if (args.mode === "backend") backend(args.backendPort);
  else if (args.mode === "frontend") frontend(args.frontendPort);
  else if (args.mode === "desktop") desktop(args.backendPort);
  else both(args);
} catch (err) {
  console.error(`[dev-tab] ${err.message}`);
  process.exit(1);
}
