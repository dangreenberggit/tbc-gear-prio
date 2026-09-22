Status: open
Type: bug
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 467

# A commit-time break with no measured B credits the gain and drops the loss

Finding A1. In `rank.ts`'s `applySetContext` `commitBreaks` block and
`view.ts`'s `rankableSetPotential`, a `commitBreaks` entry with no `dps` is
skipped (`if (brk.dps !== undefined)`), while the fallback only checks
`futureBonuses` — so the row keeps the gain and loses nothing.

Trigger: worn set X = 3; the top package overwrites one X slot (3→2, no
break); the row's item goes into a different X slot; the substituted set
overwrites 2 X slots (3→1) and breaks (X,2), which no package and no
single ever measured, so B is missing.

## What would close this

1. When any `commitBreaks` entry lacks `dps`, fall back to disclosure-only
   for the row (same treatment as a missing `futureBonuses` dps), or
   measure the missing B.
2. A test fixture reproducing the trigger.
3. PROVENANCE cycle on the fork engine files, re-pin.
