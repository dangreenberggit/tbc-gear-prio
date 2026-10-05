Status: closed
Type: investigation (observation; no defect found)
Origin: stage-gate run 553-554-silence-followups on feat/round-11-followups, plan claim C19 (Chrome research for ticket 553), 2026-10-05
Blocks: none
Blocked by: none
Related: 553, 545

# Chrome Energy Saver may freeze a hidden tab run after 5 min (Chrome 133+)

## What is known

Chrome 133 and later, with Energy Saver on, can freeze a tab that has
been hidden for more than 5 minutes and is CPU-intensive
(https://developer.chrome.com/blog/freezing-on-energy-saver, read by the
553 plan's researcher; plan claim C19). A frozen page also freezes its
dedicated workers (Chromium `core/workers/dedicated_worker.cc:662-674`,
plan claim C16), so a frozen run makes no progress until the tab is
shown again.

An Upgrades-tab run is long and CPU-intensive: one feral run took
2,062 s (ticket 545, "Live check"). The 553 plan says long hidden runs
are the owner's normal use; that is the plan's statement, not checked
against the owner's words.

Untested: whether Energy Saver freezes a tab run on the owner's
machine, and whether Memory Saver discards such a tab rather than
freezing it (plan C19 marks the Memory Saver claim unverified).

## Why it matters

A run left in a hidden tab may take much longer than its sims need, and
nothing tells the user why. Ticket 553's silence check re-arms after a
freeze instead of failing the run, except in a narrow band of freeze
lengths near the limit (ticket 553, "Item 2", "What G costs"), so the
check does not report a freeze either.

## What would close this

A check on Chrome 133+ with Energy Saver on: start a tab run, hide the
tab for more than 5 minutes, and record whether progress stops (for
example from the timestamps of progress messages) and whether it
resumes when the tab is shown. Then record a decision: accept it, or
tell the user.

## Closed 2026-10-05: freeze seen and accepted by owner decision

Owner, verbatim (2026-10-05, session ce6ca879): "accept it. no need to
tell the user if it pauses smoothly and gracefully thats fine."

No user-facing notice: owner decision.

**Test environment.** Brave 154 (Chromium 154), not Google Chrome, on
the owner's Windows machine, unplugged, fork `4cdc02b8a`, vite on :5173
with `WASM_WORKER=1`. Two attempts; the page got a `freeze` event in
both (attempt 1 at 20:11:02, attempt 2 at 21:00:04), and Brave's CPU
use fell to 0.02-0.03 cores, so the workers stopped too. Both runs were
hidden from page load, so there is no visible baseline. Whether Brave
ships Chrome's Energy Saver freeze unchanged is unverified. Source:
`.scratch/stage-gate/555-557-silence-followups/555-chrome-check.md`
(gitignored), "Answers" 1 and "Environment".

The owner's acceptance depends on the pause being smooth. What
supports that, and what does not:

1. **The run went on after a freeze lifted, with the tab still
   hidden.** Attempt 1: `resume` event at 20:55:02 with visibility
   still hidden; then "Simming candidates 5/401 ... 4 rows landed" at
   20:55:26 and "9/401 ... 8 rows landed" at 20:56:26, with Brave at
   3.89 cores. That freeze also covered a system sleep, and which of
   the two (or the machine being plugged in) lifted it is a
   hypothesis, untested. Source: `555-chrome-check.md`, "Attempt 1"
   table and "Answers" 2.
2. **The silence check reads a late timer as a freeze and re-arms.** In
   `SilenceMonitor.arm`, a timer that fires more than `FREEZE_MS`
   (5 s) after its due time arms a fresh full limit instead of calling
   `onExpire`, so a frozen run does not fail its workers on resume.
   Source: `git -C vendor/tbc-new-fork show
   3b75509a:ui/core/worker_silence.ts`, lines 142-145 (`FREEZE_MS` at
   line 41). The fork build tested in the browser, `4cdc02b8a`, has the
   same check at line 123 (`armedAt` in place of `basisAt`).
3. **Unit tests cover the late-fire path.**
   `packages/core/test/fork-worker-silence.test.ts:211` "re-arms a full
   limit instead of failing when its timer fires more than 5 s late"
   moves the clock with `vi.setSystemTime` past the due time plus
   5001 ms, fires the timer by hand, and checks that nothing expired
   and a full limit is armed. Line 223 checks the other side (at most
   5 s late fails), and line 230 checks that a late fire re-arms with
   the current regime's limit. These tests pass at main `95be23a9`
   (fork `3b75509a`): ticket 556, close section, vitest rc=0, 109
   passed.
4. **Not tested.**
   - The run continuing after the tab is shown again: the run tab was
     never visible in either attempt (`555-chrome-check.md`,
     "Environment", "Window was never visible").
   - A console read at the moment the freeze lifted: in attempt 1 the
     console was not read before the tab closed, so the absence of a
     `Sim worker N sent nothing for ... s; it was restarted` line is
     not shown. Attempt 2 never resumed (`555-chrome-check.md`,
     "Answers" 3).
   - The edge band from the `worker_silence.ts` header (lines 15-20 at
     `3b75509a`): a freeze that ends with less of the limit left than
     the worker needs for its next message, or that ends at most
     `FREEZE_MS` after the due time, can still fail a healthy worker
     (hypothesis, untested). On expiry the pool fails every request
     waiting on that worker and restarts it
     (`packages/core/test/fork-worker-silence.test.ts`, lines 7-8).
