# Brief — Upgrades tab UI rebuild

Opened 2026-08-27. Base SHA at open: `b8c0d8e`, branch
`feat/upgrades-dedup-wowsims`. Fork `vendor/tbc-new-fork` at `342f6a74`
(`feat/upgrades-tab`), matching the pin. Both trees clean.

## Goal

Rebuild the Upgrades tab's controls so the tab reads as part of this product.
The owner reviewed the running page and found the toolbar unusable: seven
controls on one undifferentiated row, sentence-length checkbox labels, and no
grouping separating a control from its own text. They failed to find a toggle
they had themselves specified, which is the sharpest evidence available that
the labelling is the defect.

## Scope

In: tickets 312 (toolbar rebuild), 313 (set-bonus share on a row), 314 (TMB
export box), and 311's presentation half only (a raw Go stack trace renders in
the UI).

Out: 311's panic half (a fork/upstream Go bug, separate decision), 310 (blocked
— the narrow-width bug is currently unreproducible because the viewport tooling
is inert), 305, 126.

## Direction — already decided by the owner

Copy the Bulk/Batch tab's settings-card structure. Recorded in ticket 312 under
"Owner's direction, 2026-08-27 — decided". Not open for relitigation. Two
riders, also decided: the post-run view controls move next to the results they
filter (this is the structural fix for the lost toggle), and the Bulk progress
modal is **not** taken — the inline status line stays.

## What done looks like

Run configuration in a sticky settings card in a right-hand panel. View
controls above the results, with short control-name labels. Set-bonus share
visible on rows that have one. A ThatsMyBis export box tracking the displayed
rows in displayed order. No stack trace in the UI. All five fork gates green,
`pnpm verify` green after re-pin, and none of the owner's eleven original asks
regressed.

## Constraints

`pnpm verify` does not cover the fork; its own five gates are the only signal.
The anti-jitter height reservation must survive. The results-table rules belong
to ticket 310 and are off limits.
