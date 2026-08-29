Status: open
Type: bug
Origin: pre-merge review round 5, Adversarial finding A2, 2026-08-28
Blocks: none
Blocked by: none

# Layout gate assertion #5 can pass with the F11 span dropped

In `test-layout.mjs` (fork), the F11-containment assertion is
`ok = spans || widthMatch`, where `widthMatch = |hostWidth - tabsWidth| <= 1`.
The `|| widthMatch` is an escape hatch: when the panel renders a single
`auto-fit minmax(220px, 1fr)` column, the controls host and the sub-tabs are
**both** full-width regardless of whether `grid-column: 1 / -1` is present, so
`widthMatch` passes even with the span rule dropped.

It is **not** vacuous at the width the gate actually tests: at 1280 the panel is
two ~321px columns (per the stage decision-log), so a dropped span puts the host
on one 321px track while the sub-tabs span the full ~664px — `widthMatch` fails,
`spans` fails, and the assertion correctly bites. So the gate is sound as it
stands. The concern is robustness: if the tested width or the grid template ever
changes such that a one-column layout is measured, this assertion would silently
stop testing the span.

## Fix

Tighten to assert the span directly — check the computed `grid-column`
(`1 / -1`, or the resolved `gridColumnStart/End`) rather than accepting width
parity as a proxy — or gate the `widthMatch` fallback on the two-column layout
being active (assert the panel has ≥2 tracks first). Low harm today; worth
hardening so the gate can't quietly go vacuous under a future layout change.

Related: the other four assertions and the probe-failure path were confirmed
honest in the same review (a missing nav button, absent host, or page-eval throw
all fail loudly and exit non-zero).
