Status: open
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

`node` and `go` in `.claude/launch.json` must resolve to nvm's Node 22.17.1
and the profile's Go. A plain `bash -c` in WSL gets `/usr/local/bin/node`
(v22.23.2) and no `go` (`docs/agents/known-traps.md`, "Before running node /
pnpm / test commands"). Whether a Claude Code session started inside WSL
passes a login-shell PATH to `preview_start`: hypothesis, untested. Check it
by starting `wowsims-backend` from such a session.

## P3. `.claude/hooks/bash-footguns.sh`

The hook guards Git Bash `/c/Users/...` paths. The coupling report
(`.scratch/agent-reports/2026-10-17-general-task-windows-coupling-for-wsl-move.md`)
says to drop it on the WSL host, and the AGENTS.md proposal
(`.scratch/wsl-move/agents-md-proposal.md`) lists it only under "Related,
outside this proposal". Decide whether to drop it or keep it for the Windows
checkout until that is frozen.
