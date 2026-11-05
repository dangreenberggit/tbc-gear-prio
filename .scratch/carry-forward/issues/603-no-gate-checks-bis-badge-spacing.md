Status: closed
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

## Closed (2026-11-03)

`scripts/tab-harness/test-layout.mjs` check 19 measures, at 375 and 653,
the gap between each BiS badge below an item name and the name's last line
of text, and fails under 2 px. Checks 19-21 also fail at a width where no
fixture gave them anything to measure (the 425 lesson).

The check found a real defect. The React tab had lost the row gap that
ticket 423's fix added, so every badge sat 0.5 px below the name's text on
every fixture (red run against fork `13a980cf3`). Fork commit
`tbc-new-fork@2bedbf6b7` gives the name and its badges a 4 px row gap
again (`ItemNameCell.tsx`, `gap-y-1`); the gate then read a 4 px gap on 3
to 19 rows per fixture.

The empty-subject guard was shown failing for check 20 with a fixture that
had no BiS rows. For check 19 it could not be shown that way: a badge from
the page's selected gear sets stays even when every BiS tag is removed.
Check 19 uses the same guard code.

Verified by:

```
PATH=/tmp/claude-1000/shim:$PATH PLAYWRIGHT_BROWSERS_PATH=/tmp/claude-1000/pwb pnpm layout-gate:check
```

Run from the pair's main worktree on branch `fix/narrow-width-607-603`;
it passed with exit 0 on 2026-11-03.
