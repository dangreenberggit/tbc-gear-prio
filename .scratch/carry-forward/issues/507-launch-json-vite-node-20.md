Status: closed
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2c, Step 4 STOP 1 (2026-09-24)
Blocks: none
Blocked by: none
Related: none

# launch.json starts the vite dev server on Node 20

## Evidence

`.scratch/stage-gate/upgrades-tab-closeout/decision-log.md`, R2c STOP 1
entry (2026-09-24):

> Note: .claude/launch.json wowsims-fork runs vite on Node 20 (vite 8
> refuses) -- the executor uses Node 22 manually; ticket candidate.

Memory note `reference-node22-pnpm-invocation`: this repo's tooling needs
Node 22 (`node:sqlite`), and the shell's default PATH resolves Node 20
unless pinned.

The `wowsims-fork` entry in `.claude/launch.json` runs
`npx vite serve --port 5173` with `cwd: vendor/tbc-new-fork`, under
whatever Node is first on PATH — Node 20.18.1 on this machine. Vite 8
refuses to start on Node 20. Since 2026-09-24, executors driving the tab
dev server have had to start vite by hand with Node 22 pinned first on
PATH, bypassing the `preview_start` launch entry entirely.

## What would close this

The `wowsims-fork` preview entry starts vite on Node 22 on this machine,
so `preview_start` with name `wowsims-fork` works without a manual PATH
pin. `.claude/launch.json` may be a tracked settings file — if so, the fix
needs the owner's approval before editing it.

## Resolution

2026-09-28: closed by the commit "Start the tab dev server on Node 22"
(the same commit that closes this ticket). The owner approved the edit.
`.claude/launch.json`'s `wowsims-fork` entry now starts vite with
`fnm exec --using=22 -- node node_modules/vite/bin/vite.js serve --port 5173 --strictPort`.
Checked by running that command from `vendor/tbc-new-fork`: the child
process was `fnm\node-versions\v22.17.1\installation\node.exe`, vite
printed `VITE v8.2.1 ready` with no "requires Node 20.19+" warning, and
`Invoke-WebRequest http://localhost:5173/tbc/` returned 200.
