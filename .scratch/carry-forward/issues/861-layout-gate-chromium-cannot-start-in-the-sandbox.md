Status: open
Type: gap
Origin: ticket 860, 2026-11-08 (pair `tbc-wt/gate-pipe`, fork `68b2afacf`)
Blocks: none
Blocked by: none
Related: 401, 754, 800, 860

# The layout gate's Chromium aborts inside the Claude Code sandbox

## What happens

When an agent runs `pnpm merge-to-dev` and the tab's layout source changed,
the layout gate builds the bundle and then cannot start its browser:

```
test-layout: Error: Chromium CDP endpoint did not come up
LAYOUT_GATE_VERDICT {"outcome":"unmeasured","reason":"Chromium CDP endpoint did not come up"}
layout gate: SKIPPED -- ...
```

`launchChrome()` in `scripts/tab-harness/test-tab-harness.mjs` starts the
browser with `stdio: "ignore"`, so the cause does not show. Started by hand
in the sandbox with the same flags, Playwright's `chromium-1200` build aborts:

```
FATAL:chrome/browser/process_singleton_posix.cc:292] Check failed: . socket() failed: Operation not permitted (1)
```

Log:
`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-08-860-chromium-abort.log`.
Playwright's headless-shell build of the same version
(`~/.cache/ms-playwright/chromium_headless_shell-1200/...`) starts and
answers on its DevTools port in the same sandbox. Tickets 754 and 800
(`800-desktop-gate-goldens-for-more-specs.md`) used
it through a `PLAYWRIGHT_BROWSERS_PATH` shim, and ticket 860 got its green
gate run the same way.

So every merge an agent runs that changes the tab's layout skips the gate,
and ticket 401 means the skip does not block the merge.

## Done when

An agent's `python scripts/check_layout_gate.py` inside the Claude Code
sandbox, with no environment override, gives a `measured` verdict (pass or
fail: this ticket is about the gate being able to measure); or the owner
rules that the owner runs the gate outside the sandbox, and `AGENTS.md`
§ Commits and merges and `docs/workflow.md` § The loop, which tell agents to
run `pnpm merge-to-dev`, say so.

Ways in, all untested: have `scripts/tab-harness/chromium.mjs` return the
headless-shell build (whether it moves the measured geometry is untested,
and the layout lock's digest, `testedTabHash` in
`data/wowsims-fork-layout.lock.json`, would need to hash that build's
browsers.json entry); or a sandbox setting that allows the socket (the
owner's decision).

## Comments

- 2026-11-13, `feat/instruction-pointer-check` stage-gate trial: the same
  Chromium start failure stops `pnpm tab-fixtures:smoke`, so a builder
  cannot do a plan's `Visual check:` step from a sandboxed agent.
  Both trial builders (pairs `tbc-wt/trial-sg-new`, `trial-sg-old`) got
  `Error: Chromium CDP endpoint did not come up` (rc 1); a hand start
  crashed at `process_singleton_posix.cc:292 ... socket() failed:
  Operation not permitted`. The T3 browser-pane route also failed: a vite
  server started in one sandboxed command was unreachable from
  `preview_open` (`net::ERR_CONNECTION_REFUSED`) and from another
  command's `curl`. Reports: `.scratch/agent-reports/2026-11-13-general-task-pointer-check-finish.md`.
