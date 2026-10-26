Status: closed
Type: bug
Origin: pre-merge review feat/headless-run-no-orphans, P2, 2026-10-25
Blocks: none
Blocked by: none

# The desktop gate can leave `wowsimtbc` on :3333 when it is stopped by a signal

## What happens today

`scripts/check_desktop_tab.py` stops the `wowsimtbc` server it started in a
`finally` block. Python does not run `finally` when SIGTERM ends the
process: `python3 -c $'import os,signal\ntry:\n os.kill(os.getpid(), signal.SIGTERM)\nfinally:\n print("finally ran")'; echo "rc=$?"`
prints `Terminated` and `rc=143`, never `finally ran` (run 2026-10-25). So a gate stopped by `timeout` or `kill <pid>` probably leaves
`wowsimtbc` holding :3333 (hypothesis, untested on the gate itself).

## What done looks like

The gate installs a SIGTERM (and SIGHUP) handler that calls `sys.exit(143)`,
so its `finally` runs. Check: start `pnpm desktop-gate:check`, send the
Python process SIGTERM once the server is up, and confirm no `wowsimtbc`
is left (`ps -eo pid,args | grep wowsimtbc`, outside the sandbox).

## Resolution

Fixed in `tbc-gear-prio@af44b109` on `feat/headless-run-no-orphans`.
`scripts/check_desktop_tab.py` installs `exit_on_signal` for SIGTERM and
SIGHUP when run as a script; it raises `SystemExit(128 + signum)`, so
`main`'s `finally` stops the server. SIGINT already raises
`KeyboardInterrupt`. The gate itself was not run.

Verified by: `tbc-gear-prio@af44b109`, `docs/reviews/feat-headless-run-no-orphans.md`, and
`bash /home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-10-25-headless-review/signal-tests.sh`
(untracked, in the main checkout; the `py711.py` cases): a `try/finally` that stops a `sleep 411` child,
with the gate's `exit_on_signal` installed, self-SIGTERM gives rc=143,
"finally ran" and 0 `sleep` left; without it, rc=143 and the `sleep` is
left running. Review: `docs/reviews/feat-headless-run-no-orphans.md`.
