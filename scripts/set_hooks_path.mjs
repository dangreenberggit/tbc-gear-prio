#!/usr/bin/env node
// The root `prepare` script. A sandboxed Claude Code session started in the
// main checkout mounts .git/config read-only; there `git config
// core.hooksPath .githooks` fails with "could not lock config file
// .git/config" even when the value is already set (seen 2026-10-24). A linked
// worktree writes that same file, so `pnpm install` failed in both. Write only
// when the value differs; a fresh clone (unset) and a wrong value are still
// set to .githooks.
import { spawnSync } from "node:child_process";

const WANTED = ".githooks";

const current = spawnSync("git", ["config", "--get", "core.hooksPath"], {
  encoding: "utf8",
});
// --get exits 1 when the key is unset; any other non-zero status (not a repo)
// is left to the write below, whose git error reaches the terminal. When git
// cannot be started at all, spawnSync prints nothing and sets `error`, so say
// why here.
if (current.status === 0 && current.stdout.trim() === WANTED) {
  process.exit(0);
}
const write = spawnSync("git", ["config", "core.hooksPath", WANTED], {
  stdio: "inherit",
});
const startError = current.error ?? write.error;
if (startError) {
  console.error(`set_hooks_path: could not run git: ${startError.message}`);
  process.exit(1);
}
process.exit(write.status ?? 1);
