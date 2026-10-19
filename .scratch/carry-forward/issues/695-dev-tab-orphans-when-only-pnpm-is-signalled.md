Status: open
Type: bug
Origin: docs/reviews/feat-wsl-linux-support.md
Blocks: none
Blocked by: none

# Tab dev servers keep running when only the pnpm process is signalled (A6)

## What happens

`pnpm tab:dev` runs `node scripts/dev-tab.mjs both` under pnpm. A SIGTERM or
SIGHUP sent to the pnpm process alone (one pid, not its process group) makes
pnpm exit (rc 143 or 129), but the `dev-tab.mjs` parent, both mode wrappers,
the Go backend and vite keep running and keep ports 3333 and 5173. The next
`pnpm tab:dev` then fails with the port in use.

Seen with stub servers in WSL by the round-1 adversarial axis of the review
(the review session's scratchpad, `wsl-review/adv/t3.sh`). A signal to the
whole group, or Ctrl+C in a terminal, stops everything.

## Why it is not fixed on the branch

pnpm does not pass a single-pid signal on to its child script. The same holds
for every pnpm script in the repo (for example `pnpm web:dev`), so it is not
specific to `dev-tab.mjs`.

## Open question

How do T3 Code (`t3.json` scripts) and Claude Code's `preview_stop` stop a
process: one pid, the process group, or by closing the terminal (SIGHUP to
the foreground group)? Hypothesis, untested. If either sends one pid to pnpm,
the tab servers are orphaned every time. Test it by starting
`pnpm tab:dev -- --backend-port <free> --frontend-port <free>` from each tool,
stopping it there, and checking `ss -ltnp` for the two ports.

Possible fixes if it does: have the `t3.json` and launch entries run
`node scripts/dev-tab.mjs` without pnpm, or have `dev-tab.mjs` notice that its
parent is gone (for example by polling `process.ppid`) and stop its servers.
