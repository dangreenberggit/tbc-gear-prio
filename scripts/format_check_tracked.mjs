#!/usr/bin/env node
// `format:check` over the files git tracks, not `prettier --check .`. A
// sandboxed Claude Code session mounts unreadable stand-ins for untracked
// dotfiles (.bashrc, .idea, .mcp.json, ...) in the folder it starts in, and
// `prettier --check .` fails on them with EACCES (seen 2026-10-24 in the main
// checkout). Trade-off: untracked files are no longer checked here; lint-staged
// (.lintstagedrc) still formats every staged file at commit.
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

// A tracked file deleted in the working tree is not an error here, but prettier
// exits 2 on an explicit path that does not exist.
const files = listed.stdout.split("\0").filter((path) => {
  try {
    return lstatSync(path).isFile();
  } catch {
    return false;
  }
});

const require = createRequire(import.meta.url);
const prettierBin = join(
  dirname(require.resolve("prettier/package.json")),
  "bin/prettier.cjs"
);

// Windows caps a command line at 32,767 characters and the tracked paths add up
// to far more, so batch there. Elsewhere one run is faster: 6.7 s against 8.2 s
// for 30,000-character batches, warm cache, 2026-10-24.
const MAX_CHARS = process.platform === "win32" ? 30_000 : Infinity;
const batches = [];
let chars = 0;
for (const path of files) {
  if (batches.length === 0 || chars + path.length + 1 > MAX_CHARS) {
    batches.push([]);
    chars = 0;
  }
  batches.at(-1).push(path);
  chars += path.length + 1;
}

let worst = 0;
for (const batch of batches) {
  const run = spawnSync(
    process.execPath,
    [prettierBin, "--cache", "--check", "--ignore-unknown", ...batch],
    { stdio: "inherit" }
  );
  if (run.error) {
    console.error(
      `format_check_tracked: could not run prettier: ${run.error.message}`
    );
    process.exit(1);
  }
  worst = Math.max(worst, run.status ?? 1);
}
process.exit(worst);
