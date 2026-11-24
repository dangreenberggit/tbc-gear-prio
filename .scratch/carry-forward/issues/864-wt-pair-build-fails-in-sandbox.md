Status: closed
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

## Closed (2026-11-24)

The plain form now works from an agent's sandboxed shell, because the
sandbox exclusion `pnpm wt:pair *` (`~/.claude_router/settings.json:165`)
runs that exact text outside the sandbox, so tsx can open its pipe. A
`pnpm -C <main> wt:pair …` call is not excluded and would still fail the
old way; `docs/agents/paired-worktrees.md` and `upstream-catch-up.md` give
only the plain form once `chore/plain-wt-pair-commands` is on `dev`. The
makefile still uses the tsx CLI; nothing upstream was edited.

Verified by: `pnpm wt:pair t864-probe chore/864-build-probe chore/864-build-probe -b --new-fork-branch --build`,
sent alone from a subagent's sandboxed shell in the main checkout on `dev`
7811fc26, 2026-11-24. It ran `make … dist/tbc/.dirstamp` (`npx tsx
vite.build-workers.mts`, rc=0 in 22s) and printed `pair ready in 67s`
with no `WARNING` line. The pair was then removed with
`pnpm wt:unpair t864-probe` ("removed t864-probe: neither repo lists it")
and both probe branches deleted.
