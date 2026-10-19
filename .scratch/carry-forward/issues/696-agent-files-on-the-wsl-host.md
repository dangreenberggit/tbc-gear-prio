Status: closed
Type: task
Origin: docs/reviews/feat-wsl-linux-support.md
Blocks: none
Blocked by: none

# Agent files left to change for the WSL dev host (A7, S10, Q9, P3)

Each item edits a file under `.claude/`, which needs the owner's approval of
the exact edit (AGENTS.md "Writing for agents"; `pre-merge-review` "Agent
files"). The review of `feat/wsl-linux-support` recorded them and changed
nothing.

## A7. The `wowsims-fork` launch entry runs vite directly

`.claude/launch.json` `wowsims-fork` runs `node node_modules/vite/bin/vite.js`
with cwd the fork. A SIGTERM to vite alone leaves vite's
`tsc --noEmit --watch` running (the WSL branch worker saw pid 276933 left
over in its first `dev-tab.mjs` test; `.scratch/agent-reports/2026-10-18-general-task-wsl-linux-branch.md`,
slice 1). Whether `preview_stop` signals one pid or the group is untested.
The Windows entry ran vite the same way under `fnm exec`.

Proposed edit: run the entry as `node ../../scripts/dev-tab.mjs frontend`
(cwd the fork) or `node scripts/dev-tab.mjs frontend` (cwd the repo root),
which stops the whole server group on SIGTERM. Test it with `preview_start`
and `preview_stop` from a Claude Code session inside WSL, then `pgrep -f
'tsc --noEmit --watch'`.

## Q9. The backend build steps exist twice

`wowsims-backend` repeats `dev-tab.mjs` `backend()` as a `sh -c` one-liner
(`mkdir -p binary_dist/tbc && cp sim/web/dist.go.tmpl ... && go build ...`).
Proposed edit: run `node scripts/dev-tab.mjs backend` instead, so one place
holds the steps. The entry must keep `port: 3333` and `autoPort: false`.

## S10. Launch entries assume a login-shell PATH

`node` and `go` in `.claude/launch.json` must resolve to the `.node-version`
Node and the profile's Go. A `bash -c` in WSL gets no `go`, and before the
one-time Node setup it also gets a different `/usr/local/bin/node`
(`docs/agents/known-traps.md`, "Before running node / pnpm / test
commands"). Whether a Claude Code session started inside WSL
passes a login-shell PATH to `preview_start`: hypothesis, untested. Check it
by starting `wowsims-backend` from such a session.

## P3. `.claude/hooks/bash-footguns.sh`

The hook guards Git Bash `/c/Users/...` paths. The coupling report
(`.scratch/agent-reports/2026-10-17-general-task-windows-coupling-for-wsl-move.md`)
says to drop it on the WSL host, and the AGENTS.md proposal
(`.scratch/wsl-move/agents-md-proposal.md`) lists it only under "Related,
outside this proposal". Decide whether to drop it or keep it for the Windows
checkout until that is frozen.

## Closing note

Resolved by the commit "Apply WSL edits to AGENTS.md and launch.json" on
`feat/wsl-linux-support`, the child of `tbc-gear-prio@12b5c899`; that commit
also closes this ticket, so it cannot name its own sha. The owner approved
`.scratch/wsl-move/agents-md-proposal-v2.md` P1-P12 as written, and P9-P12
cover all four items:

- A7 (P9): `wowsims-fork` runs `node scripts/dev-tab.mjs frontend` from the
  repo root.
- Q9 (P10): `wowsims-backend` runs `node scripts/dev-tab.mjs backend`, with
  `port: 3333` and `autoPort: false` kept.
- S10 (P11): no change. `node` and `go` resolve in every consumer measured on
  2026-10-18 (known-traps entry, as committed in `tbc-gear-prio@12b5c899`).
- P3 (P12): no change to the tracked hook; its tests pass on WSL.

Verified by:

```sh
# from the repo root, for each entry: start its runtimeExecutable and
# runtimeArgs, wait for the port, SIGTERM only the top-level pid, then:
node scripts/dev-tab.mjs frontend & sleep 5; kill -TERM $!; sleep 2
pgrep -f 'tsc --noEmit --watch'   # prints nothing
node scripts/dev-tab.mjs backend & sleep 30; kill -TERM $!; sleep 2
pgrep -af 'vite|wowsimtbc'; ss -ltn 'sport = :5173 or sport = :3333'
bash .claude/hooks/tests/bash-footguns.sh
```

On 2026-10-18 on WSL, before the stop, Windows `Invoke-WebRequest` got 200
from `http://localhost:5173/tbc/` and from `http://localhost:3333/version`.
After the SIGTERM, each top-level process exited 0, `pgrep` found no tsc,
vite, wowsimtbc or dev-tab process, and both ports were free. These runs
started the entries by hand; `preview_start` and `preview_stop` from a Claude
Code session in WSL were not run, so whether `preview_stop` sends SIGTERM is
untested.
