Status: open
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
freeze instead of failing the run, except in a narrow band (ticket 553,
"Item 2", the 0-5 s band), so the check does not report a freeze
either.

## What would close this

A check on Chrome 133+ with Energy Saver on: start a tab run, hide the
tab for more than 5 minutes, and record whether progress stops (for
example from the timestamps of progress messages) and whether it
resumes when the tab is shown. Then record a decision: accept it, or
tell the user.
