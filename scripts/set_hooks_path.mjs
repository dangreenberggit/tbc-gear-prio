#!/usr/bin/env node
// The root `prepare` script. In a linked worktree, `git config` writes the
// main checkout's .git/config, which the agent sandbox mounts read-only, so
// `pnpm install` there failed even though the value was already right. Write
// only when the value differs; a fresh clone (unset) and a wrong value are
// still set to .githooks.
import { spawnSync } from "node:child_process";

const WANTED = ".githooks";

const current = spawnSync("git", ["config", "--get", "core.hooksPath"], {
  encoding: "utf8",
});
// --get exits 1 when the key is unset; any other non-zero status is a real
// error (not a repo, git missing), which the write below reports.
if (current.status === 0 && current.stdout.trim() === WANTED) {
  process.exit(0);
}
const write = spawnSync("git", ["config", "core.hooksPath", WANTED], {
  stdio: "inherit",
});
process.exit(write.status ?? 1);
