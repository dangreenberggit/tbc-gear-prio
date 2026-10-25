#!/usr/bin/env node
// `format:check` over the top-level entries git tracks, not `prettier --check
// .`. A sandboxed Claude Code session mounts unreadable stand-ins for untracked
// dotfiles (.bashrc, .idea, .mcp.json, ...) in the folder it starts in, and
// `prettier --check .` fails on them with EACCES (seen 2026-10-24 in the main
// checkout). Prettier still walks each tracked folder, so untracked files inside
// one are checked, as before. Untracked entries at the repo root, where the
// mounts are, are not; lint-staged (.lintstagedrc) still formats every staged
// file at commit. Passing every tracked file instead checks the same 492 files
// but took 6.2 s against 2.1 s (warm cache, main checkout, 2026-10-24).
import { spawnSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const listed = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
if (listed.error || listed.status !== 0) {
  console.error(
    `format_check_tracked: git ls-files failed: ${listed.error?.message ?? listed.stderr}`
  );
  process.exit(1);
}

// A tracked entry deleted in the working tree is not an error here, but
// prettier exits 2 on an explicit path that does not exist.
const topLevel = [
  ...new Set(
    listed.stdout
      .split("\0")
      .filter(Boolean)
      .map((path) => path.split("/")[0])
  ),
];
const entries = topLevel.filter((entry) => {
  try {
    const stat = lstatSync(entry);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
});

const require = createRequire(import.meta.url);
const prettierBin = join(
  dirname(require.resolve("prettier/package.json")),
  "bin/prettier.cjs"
);

const run = spawnSync(
  process.execPath,
  [prettierBin, "--cache", "--check", "--ignore-unknown", ...entries],
  { stdio: "inherit" }
);
if (run.error) {
  console.error(
    `format_check_tracked: could not run prettier: ${run.error.message}`
  );
  process.exit(1);
}
process.exit(run.status ?? 1);
