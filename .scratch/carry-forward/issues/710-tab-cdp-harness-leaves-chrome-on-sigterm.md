Status: closed
Type: bug
Origin: pre-merge review feat/headless-run-no-orphans, P1, 2026-10-25
Blocks: none
Blocked by: none

# The tab browser driver can leave Chrome running when it is stopped by a signal

## What happens today

`scripts/tab-harness/run-tab-cdp.mjs` (the driver the 2026-10-25 p45
batch used, and the desktop gate runs) starts Chrome before its `try`
block and stops it only in `finally`. Node skips `finally` and every
`exit` handler when a SIGTERM or SIGHUP ends the process, so a driver
stopped by `timeout`, by a killed subagent or by `kill <pid>` may leave
headless Chrome running (hypothesis, untested on the driver itself).

The same applies to the other users of `scripts/tab-harness/test-tab-harness.mjs`
(`test-layout`, `test-review`, `test-stop`, `record`): they rely on the
`exit` handlers at `test-tab-harness.mjs` (Chrome and http-server) and do not
turn a signal into an exit (hypothesis, untested).

`scripts/tab-fixtures/smoke.mjs` already does this (`process.on(sig, () =>
process.exit(...))`), and a SIGTERM mid-run left no process
(`.scratch/agent-reports/2026-10-25-headless-no-orphans/proof.out`, last case).

## What done looks like

Each of those scripts turns SIGINT, SIGTERM and SIGHUP into `process.exit`,
and `run-tab-cdp.mjs`'s Chrome has an `exit` handler. Check: start the
driver in one Bash call, send it SIGTERM once Chrome is up, and
`ps -eo pid,args | grep -E 'chrome'` in the same call prints nothing.

## Resolution

Fixed in `tbc-gear-prio@af44b109` on `feat/headless-run-no-orphans`.
`scripts/process-group.mjs` gained `exitOnSignals()`, which turns SIGINT,
SIGTERM and SIGHUP into `process.exit` once per process. `test-tab-harness.mjs`
calls it where it registers the `exit` handlers for Chrome and http-server, so
every script that launches through it is covered; `run-tab-cdp.mjs`'s own
`launchChrome` now also stops Chrome in an `exit` handler and calls it;
`smoke.mjs` uses it in place of its own loop.

Verified by: `tbc-gear-prio@af44b109`, `docs/reviews/feat-headless-run-no-orphans.md`, and
`bash /home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-10-25-headless-review/signal-tests.sh`
(untracked, in the main checkout). With the fix, SIGTERM to
`run-tab-cdp.mjs` and to a script that calls `test-tab-harness.mjs`'s
`launchChrome` left 0 Chrome processes (7 were running); with the code before
the fix (stashed), 7 and 6 Chrome processes survived. Review:
`docs/reviews/feat-headless-run-no-orphans.md`.
