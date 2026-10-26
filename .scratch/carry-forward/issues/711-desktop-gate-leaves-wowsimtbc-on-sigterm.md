Status: open
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
