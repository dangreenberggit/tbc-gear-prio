Status: open
Type: task
Origin: recurring block observed across tab-signoff-followups + tab-ui-refinements executor runs, 2026-09-18
Blocks: none
Blocked by: none
Related: docs/agents/known-traps.md, scripts/check_desktop_tab.py, the desktop gate

# Desktop gate leaves a stray wowsimtbc.exe on :3333 that blocks the next run

Observed THREE times this session (once in tab-signoff-followups, twice in
tab-ui-refinements): `pnpm desktop-gate:check` builds a `wowsimtbc.exe` and binds
port 3333, but a prior run's binary is left running and still holding 3333, so the
next gate run cannot bind. Freeing it (`Stop-Process` / `taskkill`) is denied to
the executor seat by the auto-mode permission classifier ("Interfere With
Workloads"), so the executor correctly STOPS — and the orchestrator has to free
the port by hand every time before the gate can run.

This is a real recurring tax on every fork re-pin that runs the desktop gate. The
executor is doing the right thing (not working around the permission system); the
gate itself should not leave a stray, and/or the trap should be documented so the
orchestrator frees the port proactively before dispatching the executor's re-pin
step.

## What would close this

Pick one (or both):
1. **Make the gate clean up after itself.** `scripts/check_desktop_tab.py` should
   stop the `wowsimtbc.exe` it spawned on exit (success OR failure), and/or
   free/verify 3333 is clear before it binds. Confirm it doesn't already try and
   fail (e.g. it may kill the wrong PID, or leave the process on a build error
   path). This is the durable fix.
2. **Document the trap** in `docs/agents/known-traps.md` under the desktop-gate /
   dev-servers section: "the desktop gate can leave a stray wowsimtbc.exe on 3333;
   free it before the next run; the executor seat is permission-denied from
   killing it, so the orchestrator frees it before dispatching a re-pin step."
   Propose the exact line in chat before editing known-traps (docs steer future
   sessions).

## Where

`scripts/check_desktop_tab.py` (the build/serve/teardown lifecycle),
`docs/agents/known-traps.md` (the doc note).

## Notes

Filed during the tab-ui-refinements batch. Not a blocker for that batch (the
orchestrator freed the port each time), but it will keep costing every future
fork re-pin until fixed. The permission denial is CORRECT (killing a process is
a workload-interference action the executor shouldn't do unattended); the fix is
to stop creating the stray, not to loosen the permission.
