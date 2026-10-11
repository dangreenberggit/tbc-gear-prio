Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b
Type: task
Origin: Chunk 3b step 7 regression check (commit c5741e2c)
Blocks: none
Blocked by: none
Related: 310 (closed; owner signed off the sideways-scrolling table), 327 (closed; slot column)

# At 375 px the DPS figure is outside the table panel

At 375 px wide the results table is 602 px wide inside a 361 px panel, and
the panel scrolls sideways. That is the design ticket 310 built; its
2026-09-18 owner sign-off section records that the owner "viewed the
results table at narrow width on the live tab" and accepted that it
scrolls sideways within its panel. A consequence is that the DPS
figure, the number the table exists to show, starts outside the panel: the
first row's DPS cell is at x 336–420 and the panel ends at x 368. A phone
user sees Rank, Item and Slot, and must scroll sideways to read any
figure.

Evidence, Chunk 3b capture set (main checkout, gitignored,
`.scratch/tab-scope-refresh/review/`; that folder's `manifest.json` is
gitignored too, so a re-check from another checkout needs a new
`pnpm tab-review` manifest), fixture `ret-p3-p2`, fork `316326a95`:

- `facts.json` `310` at 375: `scrollerClientWidth` 361,
  `scrollerScrollWidth` 602, `scrollerRect.right` 368.
- `facts.json` `327-table` at 375: `row0DeltaRect` x 336–420 (the
  same for rows 1 and 2).
- `310-post-run-375-0.png`: no DPS column in view.

At 653 px and wider the table fits its panel (`scrollerScrollWidth` equals
`scrollerClientWidth`), so this is 375 px only.

This is not a regression: it follows from the signed-off design. It is
filed so the owner can decide whether the DPS figure should be visible
without scrolling at phone width (for example by putting DPS before Slot,
or narrowing the Item column).

## What would close this

- An owner ruling: the figure must be in view at 375 px, or the current
  layout stays (quote it here and close).
- If the figure must be in view: a `pnpm tab-review` capture at 375 px
  where the first row's DPS cell lies inside the panel, with the table
  still scrolling sideways for the remaining columns.

## Comments

**2026-10-11 — owner ruling (Q-606-phone-dps, Chunk 3b step 6 of
`.scratch/plans/upgrades-tab-finish-line.md`).** Asked "should the DPS
number be visible on a phone without scrolling sideways?", the owner
answered: "Yes". The first close condition is met by this ruling; the
second (a 375 px capture with the first row's DPS cell inside the panel)
is now the work. The ticket moves to Tab-blocking in
`docs/upgrades-tab-scope.md`.
