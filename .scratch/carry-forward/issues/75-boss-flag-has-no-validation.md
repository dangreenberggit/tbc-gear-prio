Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (adversarial axis)
Blocks: phase-3
Blocked by: none

# `--boss` has no validation, so a typo silently returns an empty shortlist

`cli.ts` validates `--raid` against `zonesInPool(pool)` (around line 280) and
prints "known zones" plus exits 2 on a miss. `--boss` gets no equivalent —
it's parsed straight into `out.view.boss` and compared exactly by
`matchesBoss` in `view.ts`.

Trigger: `--raid Karazhan --boss "Prince Malchezar"` (the real spelling is
`Prince Malchezaar`). `applyView` filters every row out; the CLI prints the
baseline and hit banner, then no rows, exit 0 — indistinguishable from "this
boss genuinely drops no upgrades for you."

## What to do

Add the same membership-check-and-list-known-values pattern `--raid` already
has, scoped to bosses within the selected raid (or all bosses in the pool if
`--raid` wasn't given). Reuse whatever enumerates boss names for
`zonesInPool` if one exists, or add the equivalent.
