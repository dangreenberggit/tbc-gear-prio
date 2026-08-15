# Worker handoff

## Status
partial — one of ticket 156's three "Done when" items answered (production
build vs dev server, now recorded); the other two (20-candidate table,
variance explanation) remain open. `pnpm verify` could not be run fully
green in this shared checkout for reasons unrelated to this slice (see
Verification).

## Branch
`feat/sweep-tab-tickets` (main checkout, not isolated — worked directly per
this respawn's instructions; committed `25d341d`)

## Base
- Main repo: worked directly on `feat/sweep-tab-tickets`, not a worktree.
  Started at `e1f460c` (per session's initial git status), ended at `25d341d`
  after my commit.
- Fork: confirmed at start `adb0d135336a26eab613215fa85b1265d7ce2e5d` per the
  prompt's expected SHA. Built and served from that commit. By the time I ran
  `pnpm verify`, the fork tip had moved to `57a84f1e4ecce1ef3e11da675bf623964caea907`
  — worker A2 committed in the shared fork checkout while I was mid-measurement.
  I did not commit anything in the fork myself (confirmed: `git -C
  vendor/tbc-new-fork status --short` shows only `?? .ew1-scratch/`,
  untracked, left alone).

## What I did
- Confirmed fork SHA and main-repo branch as specified; read `AGENTS.md`.
- Built the fork's production bundle: `npx tsx vite.build-workers.mts` then
  `npx vite build` (2m36s, 532 modules, `dist/tbc/bundle/` populated —
  confirmed non-empty, not just an exit code).
- Served `vendor/tbc-new-fork/dist` (not `dist/tbc`) with `http-server` on
  `localhost:8123`, matching the `/tbc/` prefix the makefile's own `host`
  target expects.
- Opened `http://localhost:8123/tbc/paladin/retribution/` in the Claude Code
  Browser pane and ran repeated Simulate clicks at 3,000 and 5,000
  iterations, single baseline candidate, page's own default of 4 workers.
- Caught and discarded two measurement traps before trusting any number: a
  static "N iterations complete" label that reads as a completion flag from
  the instant the button is clicked, and a live-updating DPS estimate that is
  nonzero and drifting well before the run finishes. Valid detection polls
  the progress numeral until it equals the iteration target.
- Recorded three single-candidate wall-clock numbers (5.3s, 13.4s, 12.1s —
  see plan §5 and ticket 156 for the full method and table) and flagged that
  they are inconsistent with each other, unexplained, and not a substitute
  for the ticket's 20-candidate ask.
- Recorded the Browser pane's `computer{action:"screenshot"}` failure
  ("the Browser pane is not displayed, so the page is not compositing
  frames") as a harness limitation on every number obtained via that pane.
- Updated `docs/plans/wowsims-tab/plan.md` §5 (E-W2 findings + a serving
  recipe covering `vite.build-workers.mts`) and
  `.scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md`
  (`## Comments`, `Status: open` retained, one acceptance box checked).
- Committed both files as `25d341d`.

## Paths touched
- `docs/plans/wowsims-tab/plan.md`
- `.scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md`
- `.scratch/handoffs/ticket-sweep/a3/HANDOFF.md` (this file)
- Fork: read/build/run only. No fork commits. Did not touch
  `ui/core/components/individual_sim_ui/upgrades/**` (A2's).

## Verification
- `git -C vendor/tbc-new-fork rev-parse HEAD` → confirmed
  `adb0d135336a26eab613215fa85b1265d7ce2e5d` before starting.
- `git -C . rev-parse --abbrev-ref HEAD` → confirmed `feat/sweep-tab-tickets`.
- `npx tsc --noEmit` (in fork) → clean, no output.
- `npx tsx vite.build-workers.mts` (in fork) → 4 worker bundles built,
  confirmed by log output naming each output file.
- `npx vite build` (in fork) → `✓ built in 2m 36s`, confirmed
  `dist/tbc/bundle/` populated (`ls` showed CSS/JS chunk files).
- `npx http-server vendor/tbc-new-fork/dist -p 8123 --cors` → confirmed via
  `curl -o /dev/null -w "%{http_code}"` returning `200` for
  `/tbc/paladin/retribution/index.html`.
- Browser pane: `preview_start` → `navOk: true`; `read_console_messages`
  showed one 404 (`/version`, expected — no such endpoint on a static
  server) and no other errors; `read_network_requests` showed real
  `sim_worker.js`/`lib.wasm`/asset fetches with `200 OK`.
- `computer{action:"screenshot"}` → **failed**: "the Browser pane is not
  displayed, so the page is not compositing frames." Recorded as a harness
  limitation, not extrapolated past.
- Three `javascript_exec` timed runs (5000/3000/5000 iterations) → each
  validated by polling the progress counter to its target and cross-checked
  against DPS varying run-to-run (1908.14/1919.52/1901.33 across three
  same-settings runs), ruling out a stale/cached result. Raw traces are in
  this session's tool-call history; the ticket and plan carry the summarized
  numbers plus the two invalid-detector traces that were caught and
  discarded (not reproduced verbatim in committed docs, per scope — durable
  claims there are the validated numbers, not the debugging trail).
- `pnpm -C . verify` → **failed**, at the `engine-port-drift:check` step,
  reporting `disclosure.ts`/`rank.ts` drifted from `engine/PROVENANCE.md`'s
  recorded hashes. Isolated this from my own change: `git stash` (removing my
  two-file diff), re-ran `pnpm engine-port-drift:check` alone → **same
  failure**, byte-for-byte identical hashes reported. `git stash pop`
  restored my files. This confirms the failure is pre-existing in the shared
  checkout — caused by worker A2's in-flight fork commits (files under
  `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/**`,
  explicitly not mine to touch) — not by anything in this slice. I did not
  attempt to fix it; it is out of my slice's scope (A2 owns E-W3/PROVENANCE
  re-sync for that path) and I do not know whether A2's work is finished. Did
  not run the rest of `pnpm verify` past this failing step (it stops the
  pipeline) — typecheck/lint/format/test for my own two files were not
  separately re-verified, though both are prose Markdown with no lint/type
  surface.

## Notes / concerns
- The fork's tip moved under me mid-session
  (`adb0d135...` → `57a84f1e...`) — expected, since A2 shares this checkout
  and commits there. I built from the SHA specified in my prompt
  (`adb0d135...`); by the time `pnpm verify` ran, A2 had moved the tip. The
  production-build numbers I recorded reflect the code at `adb0d135...`, not
  `57a84f1e...` — worth noting if A2's `upgrades/**` changes affect anything
  measured here (unlikely, since E-W2 exercises upstream's own Simulate
  button and page, not the tab's ported engine).
- `engine-port-drift:check` failing is A2's open item, not mine — flagging it
  here only so the delegator does not read my `partial` status as implying
  I broke `pnpm verify`; I found it already broken and confirmed that with
  `git stash`.
- The 5.3s/13.4s/12.1s variance is the biggest loose thread. I did not have
  time to isolate whether it's caused by my own `javascript_exec` polling
  overhead, the pane's non-displayed state, or something else — flagged as
  **hypothesis, untested** in both the plan and the ticket, deliberately not
  resolved to a single number.
- I did not attempt the 20-candidate batch measurement — single-candidate
  runs already took most of the session's time once the two measurement
  traps had to be diagnosed and fixed. A 20-candidate run would need the
  same trap-free detector, scaled to a batch-sim progress signal I have not
  located in the DOM yet (the Batch tab, not the single-candidate Simulate
  button used here).

## Suggested follow-ups
- Re-attempt E-W2's 20-candidate table specifically, reusing the validated
  polling method in this handoff (poll the progress numeral to its target;
  never trust "iterations complete" as a substring match; corroborate with
  DPS variance across repeated runs).
- Investigate the 5.3s-12.1s single-candidate variance before trusting any
  number for D7's iteration default — candidates: polling overhead,
  pane-visibility throttling of the main thread (not yet re-tested; only
  Worker throttling was ruled out), or genuine variance in the WASM/worker
  scheduling this environment exposes but Node does not.
- If a genuinely foregrounded (compositing, human-visible) browser tab
  becomes available in this environment, re-run at least one of the numbers
  above there as a sanity check against the harness-limitation caveat.
