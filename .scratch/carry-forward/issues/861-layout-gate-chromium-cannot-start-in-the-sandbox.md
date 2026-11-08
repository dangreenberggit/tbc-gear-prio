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

Log: `.scratch/agent-reports/2026-11-08-860-chromium-abort.log` in the main
checkout. Playwright's headless-shell build of the same version
(`~/.cache/ms-playwright/chromium_headless_shell-1200/...`) starts and
answers on its DevTools port in the same sandbox. Tickets 754 and 800 used
it through a `PLAYWRIGHT_BROWSERS_PATH` shim, and ticket 860 got its green
gate run the same way.

So every merge an agent runs that changes the tab's layout skips the gate,
and ticket 401 means the skip does not block the merge.

## Done when

An agent's `python scripts/check_layout_gate.py` inside the Claude Code
sandbox, with no environment override, gives a `measured` verdict; or the
owner rules that the gate is run outside the sandbox, and the docs that
tell agents to run `pnpm merge-to-dev` say so.

Ways in, all untested: have `chromium.mjs` return the headless-shell build
(whether it moves the measured geometry is untested, and the digest would
need to hash that build's entry); or a sandbox setting that allows the
socket (the owner's decision).
