Status: open
Type: bug
Origin: Chunk 6 session, 2026-11-08, making pair `t852-810` with `pnpm wt:pair ... --build`
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 860, 861

# `pnpm wt:pair --build` fails in the Claude Code sandbox

## What happens today

`pnpm wt:pair t852-810 fix/852-810-sim-errors-bis-labels fix/852-810 -b --new-fork-branch --build`,
run in the Claude Code sandbox on 2026-11-08, made both worktrees, installed,
and ran `make proto` and `make go-to-ts`, then stopped at its last step,
`make -C <pair>/vendor/tbc-new-fork dist/tbc/.dirstamp`, with rc 2. The fork's
makefile rule for `dist/tbc/bundle/.dirstamp` runs `npx tsx vite.build-workers.mts`,
and tsx fails to open its IPC pipe:
`Error: listen EPERM: operation not permitted /tmp/claude-1000/tsx-1000/<pid>.pipe`.
The pair command then prints `FAILED` and says the pair is partly made.

Ticket 860 fixed the same failure in the layout-gate harness by running
`node --import tsx vite.build-workers.mts` there
(`scripts/tab-harness/test-tab-harness.mjs`); the fork makefile and
`scripts/worktree_pair.py` still use the tsx CLI.

## Workaround that worked (2026-11-08)

In `<pair>/vendor/tbc-new-fork`: `node --import tsx vite.build-workers.mts`,
then `npx vite build`, then `touch dist/tbc/bundle/.dirstamp`, then
`make -C <pair>/vendor/tbc-new-fork -o dist/tbc/bundle/.dirstamp dist/tbc/.dirstamp`
(rc 0). The pair needed nothing else: the build is the pair command's last step
(`scripts/worktree_pair.py`, the `if args.build:` block).

## Done when

`pnpm wt:pair <name> <branch> <fork-branch> -b --new-fork-branch --build` run in
the Claude Code sandbox prints `pair ready` with no `WARNING` line, with no
edit to an existing upstream wowsims file unless the owner approved that exact edit.
