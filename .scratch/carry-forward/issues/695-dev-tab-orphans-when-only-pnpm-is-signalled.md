Status: wontfix
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

## Answer (2026-11-10)

Neither tool sends a signal to pnpm alone, so the code stays as it is.

### T3 Code (`t3.json` scripts)

From T3 Code 0.1.2's bundled source (`strings -n 6
~/.t3/runtime/versions/0.1.2/t3`, and `client/assets/*.js` beside it):

- The client runs a script by writing ` <command>\r` into a terminal, with a
  leading space that keeps it out of the shell's history
  (``function ge(e){return` ${e}\r`}`` in `projectScriptEditor-*.js`).
- The terminal is `$SHELL` started with no arguments in a node-pty pty
  (`resolveShellCandidates`). That is an interactive bash with job control,
  so `pnpm tab:dev` runs as its foreground job, in a process group of its
  own. With a systemd user manager, the shell starts through
  `agentScope.wrap({..., survivesRestart: true})`, which runs it under
  `systemd-run --user --scope --slice=app-t3code-agents.slice`; each step
  `exec`s, so the pid T3 signals is still the shell's.
- Closing the terminal runs `terminal.closeSession`, then `stopProcess`, then
  `runKillEscalation`: `process.kill("SIGTERM")`, and `process.kill("SIGKILL")`
  after `DEFAULT_PROCESS_KILL_GRACE_MS = 1e3` if the process is still alive.
  node-pty's `UnixTerminal.kill` is `process.kill(this.pid, signal)`, so both
  signals go to the shell's pid only.
- An interactive bash ignores SIGTERM, so the SIGKILL ends it. The shell is the
  terminal's controlling process, so the kernel then sends SIGHUP to the
  terminal's foreground process group (POSIX `_exit()`, "Consequences of
  Process Termination"). That group is pnpm's: it holds the `dev-tab.mjs`
  parent and both mode wrappers, and each wrapper stops its server's group
  (`serve` in `scripts/dev-tab.mjs`).

The live test copies that sequence: a pty, an interactive `$SHELL`, the
command typed in, SIGTERM to the shell, SIGKILL 1 s later. It ran on
2026-11-10 in the pair `fix/695-dev-tab-orphans`, in WSL, inside the Claude
Code sandbox, from Python rather than from the T3 app, and without T3's
`systemd-run` scope.

- Mode `t3`: both ports listened before the stop and neither did afterwards.
  In the run that review round 2 recorded, every tab process was gone 1 s
  after the stop (`docs/reviews/fix-695-dev-tab-orphans.md`, round 2,
  check 4).
- Mode `pnpm`, the ticket's case, as a control: after SIGTERM to the pnpm pid
  alone, the corepack shim exited, and `pnpm-native`, the `dev-tab.mjs`
  parent, both wrappers, both servers and tsc kept running, with both ports
  listening. So the test does see orphans when there are some.

Not tested: stopping or restarting T3 itself. The terminal scopes are in
`app-t3code-agents.slice`, outside `t3code.service`, so that unit's
`KillMode=mixed` does not reach them.

### Claude Code's preview (`.claude/launch.json`)

The tab entries `wowsims-fork` and `wowsims-backend` run
`node scripts/dev-tab.mjs frontend|backend` with no pnpm, so whatever the
preview sends goes to the wrapper itself. The ticket's case cannot happen
there. What `preview_stop` sends is not known: its code is in the Claude
desktop app, whose files under `C:\Program Files\WindowsApps` are not readable
from WSL, and the Claude Code CLI 2.1.309 has no `preview_stop`.

One signal to the wrapper's pid alone, with `695-single-pid-check.sh`
below: SIGTERM, SIGHUP and SIGINT each stopped the wrapper, vite and tsc
within 2 s. SIGKILL left vite and tsc running with the port open for the
full 30 s, because the wrapper cannot catch it. If the preview sends SIGKILL
(hypothesis, untested), none of this ticket's fixes would help, because the
wrapper is the process that dies.

### Why no change

- **Do nothing:** T3's stop, and the preview entries for every signal a
  process can catch, already stop everything. What is left is a person or a
  script sending a signal to the pnpm pid alone. That holds for every pnpm
  script in the repo, and `docs/agents/known-traps.md` ("A script or batch
  that starts the servers") already says to start
  `node scripts/dev-tab.mjs frontend|backend` and signal that.
- **`t3.json` runs `node scripts/dev-tab.mjs` without pnpm:** changes nothing
  the T3 test shows, because T3 never signals pnpm.
- **`dev-tab.mjs` polls `process.ppid`:** new code for a case that no
  launcher in use produces.

Verified by:

```
python3 .scratch/carry-forward/notes/695-t3-stop-check.py t3 3391 5191
python3 .scratch/carry-forward/notes/695-t3-stop-check.py pnpm 3392 5192
bash .scratch/carry-forward/notes/695-single-pid-check.sh 5193
```
