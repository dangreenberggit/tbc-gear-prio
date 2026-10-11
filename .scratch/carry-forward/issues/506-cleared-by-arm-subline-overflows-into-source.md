Status: closed
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2c, Step 8 (2026-09-24)
Blocks: none
Blocked by: none
Related: 493, 499, 504

# "cleared by %-arm" sub-line overflows into the Source column

## Evidence

`.scratch/stage-gate/upgrades-tab-closeout/round-2c/measurements.md`,
section "5. Other defects the fixtures show (not in this round's tickets)":

> The "cleared by %-arm" sub-line (`.upgrades-cutoff-arm`) runs 110.9px
> past its DPS cell into Source at 768 and 1280 (2 rows in ret-p3-p2, e.g.
> Midnight Chestguard; see `mockups/494-I-lightbringer-1280.png`). Below
> 768 it fits (−3.5px). Gate assertion (11) checks only
> `.upgrades-set-bonus` sub-lines, so it cannot see this one.

On 2 rows of the ret phase-3 fixture (`data/tab-fixtures/ret-p3-p2.json`),
the `.upgrades-cutoff-arm` sub-line printed under the DPS figure runs
110.9px into the Source column at 768px and 1280px wide. It fits at 375
and 653. `test-layout.mjs` assertion (11) only measures
`.upgrades-set-bonus` sub-lines, so a real gate run cannot see this
overflow.

This is the same class of defect as 493 (the `.upgrades-set-bonus`
sub-line overprinting Source, fixed by shortening the hover-hint string)
and 499 (the DPS figure and focus outline overrunning the DPS cell). Both
of those were driven out by picking a shorter string; assertion (11) was
never widened to catch a different sub-line class, which is why this one
reached the fixture pass unseen.

## What would close this

1. The `.upgrades-cutoff-arm` text fits inside the DPS cell at 375, 653,
   768 and 1280px, on the same fixtures used above
   (`data/tab-fixtures/ret-p3-p2.json`).
2. `test-layout.mjs` assertion (11) (or a new assertion) checks every
   DPS-cell sub-line class, not only `.upgrades-set-bonus`, so a future
   regression in either sub-line is caught by a real gate run.
3. Fork commit, re-pin, `pnpm verify` rc=0, and a real layout gate run
   confirming `failed:0` at all four widths on the fixtures above.

## Closed 2026-10-11

The note this ticket is about no longer exists. ADR-0037 (owner ruling
2026-10-11) removed the percentage rule, and with it the tab's "by % rule"
note (`DeltaCell.tsx`) and the report's "cleared by %-arm" note, so item 1
has nothing to fit. Item 2 is covered by layout check (7) in
`scripts/tab-harness/test-layout.mjs` (line 22: "nothing in a table cell past
the cell"), which reads every cell rather than one sub-line class.

Verified by: tbc-new-fork@be3d703a1 (removes the note);
`git -C vendor/tbc-new-fork grep -n "upgrades-cutoff-arm" -- ui` prints only
the `ResultRow.test.tsx` assertion that no row carries it.
