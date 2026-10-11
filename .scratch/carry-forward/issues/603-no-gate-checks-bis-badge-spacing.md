Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b
Type: task
Origin: Chunk 3b step 7 regression check (commit c5741e2c), follow-up to ticket 425's closing note
Blocks: none
Blocked by: none
Related: 423 (added the spacing rule), 425 (closed: the assertion no longer exists), 560 (moved the layout gate)

# No gate checks the BiS badge spacing any more

Ticket 423 added a layout-gate assertion that a "BiS" badge which wraps
below the item name sits at least 2px below it. That assertion lived in the
fork's `test-layout.mjs`. When ticket 560 moved the layout gate to
`scripts/tab-harness/test-layout.mjs`, the assertion did not move, and
ticket 425 (which said the old assertion could pass without testing
anything) was closed on 2026-10-11 because the assertion is gone. Its
closing note left one question open: "whether any gate now checks the BiS
badge spacing at all". None does:

```
ls vendor/tbc-new-fork/test-layout.mjs                                 # No such file or directory
grep -c badgeGaps scripts/tab-harness/test-layout.mjs                  # 0
grep -n -i bis scripts/tab-harness/test-layout.mjs                     # only :59, the default fixture name
```

The React tab's unit test `components/ResultsTable/ItemNameCell.test.tsx`
checks which badges a row shows, not where they sit.

The Chunk 3b captures (main checkout, gitignored,
`.scratch/tab-scope-refresh/review/310-post-run-375-0.png`; the manifest
that made them is gitignored too, so another checkout cannot rebuild
them) show the badges
below the name with a visible gap today, so this is a coverage gap, not a
known defect.

## What would close this

- An assertion in `scripts/tab-harness/test-layout.mjs` that a badge below
  the item name clears it by at least 2px, at the gate's narrow widths
  (`:45`, 375 and 653).
- The assertion cannot pass with nothing to check: it fails when no row in
  the fixture has a badge below its name (the 425 lesson), or the fixture
  is chosen so that one does.
- One gate run that shows the assertion reading real rows.
