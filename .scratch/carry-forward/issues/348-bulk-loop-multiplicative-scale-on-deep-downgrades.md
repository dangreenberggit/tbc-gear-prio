Status: open
Type: bug
Origin: Pre-merge review round-2 fix round, feat/upgrades-tab-batch-sim (2026-09-01)
Blocks: none
Blocked by: none

# Bulk and loop routes differ by ~1.6% multiplicatively on deep downgrades

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

The bulk screening route and the per-candidate loop route do not measure quite
the same delta. Regressing one against the other over the web track's 220-row
equivalence dump gives a slope **1.6% above 1.0**, with an intercept that is
indistinguishable from zero:

```
bulkDelta = 1.015998 * loopDelta + 0.1527
  slope     1.015998 +- 0.002162   (t vs 1.0 = 7.40)
  intercept 0.1527   +- 0.2696     (not distinguishable from zero)
  residual sd 3.247,  n = 220
```

So the two routes differ by a **scale factor, not an offset**. That matters
because every mitigation already in the engine assumes an additive relationship:
a shared additive offset cancels inside a same-run subtraction (which is why
screened deltas need no re-basing — see `rank.ts`'s `individualDeltasByItemId`
comment), but a multiplicative factor does not.

The effect is concentrated entirely in large-magnitude **downgrades**:

| loopDelta bucket | n | mean loopDelta | mean (bulk - loop) | as % of delta |
| --- | --- | --- | --- | --- |
| [-500, -100) | 47 | -238.99 | -3.533 | 1.48% |
| [-100, -40) | 50 | -54.53 | -0.528 | 0.97% |
| [-40, -10) | 68 | -30.28 | -0.453 | 1.50% |
| [-10, 0) | 25 | -6.11 | -0.004 | 0.06% |
| [0, 20) | 28 | 2.36 | 0.023 | 0.98% |

Near the decision boundary (|delta| < 10) the mean difference is ~0.004 DPS. At
-239 DPS it is 3.5 DPS, against a per-row `se` of about 1.05 — measurable, but
only where nothing is being decided.

## Why this is filed rather than fixed

**It changes no ranking today.** Rows this far below baseline are hundreds of DPS
worse than the worn item; they sort last and sit far below the 3.4 DPS cutoff on
either route. The web track's acceptance run scored Spearman **0.999229** across
220 rows, and the top rows are bit-identical between the arms because winners are
re-simmed through paired replication rather than read off the screening route.

**The risk is future arithmetic, not present output.** Everything that consumes a
screened delta today either compares it against other deltas (the sort, the
per-row cutoff) or subtracts it inside the same run. The one consumer that
combines deltas across routes is `computeSynergy` (`engine/set-value.ts`), which
computes `bonusDps = (packageDps - baseline) - sum(addedPieceDeltas)` with the
package simmed through the loop and the pieces possibly screened. A 1.6% scale
error on set-piece deltas is negligible at the tens-of-DPS magnitudes real set
pieces carry — but it is the shape of arithmetic that would surface this, and
anything future that sums large negative deltas across routes would inherit it.

## Evidence and how to re-run it

Source data: `.scratch/stage-gate/batch-sim-web-local/equiv-dump.json` (committed;
220 candidates, feral, both arms). Its provenance block confirms the two arms
really did take different routes and shared one baseline:

```
loop: hasBulkCapability=false rows=220 elapsed=2699.5s baselineDps=2131.7093840892107
bulk: hasBulkCapability=true  rows=220 elapsed=4333.1s baselineDps=2131.7093840892107
```

The figures above are an ordinary least-squares fit of `bulk.items[].deltaDps` on
`loop.items[].deltaDps`, joined by `itemId`. Re-derivable from the committed dump
with any least-squares fit; the numbers in this ticket were computed directly from
it rather than taken from the ledger, which does not report a slope.

**Replication rows do not explain it.** Exactly 8 of the 220 rows carry
`seMethod: "paired-replicate"`, and those 8 are precisely the bit-identical ones —
re-simmed through the shared final pass, so identical by construction. Excluding
them and refitting on the 212 screening-route rows leaves the slope essentially
unchanged:

```
n = 212,  slope 1.016153 +- 0.002236  (t vs 1.0 = 7.22),  intercept 0.1803
```

So the scale difference is a property of the screening route itself, not an
artifact of mixing replicated and screened rows.

## What is NOT claimed

- **Not an additive offset.** The 65.3 DPS baseline gap discussed in the
  batch-sim ledger and in `rank.ts`'s `screenCandidates` comment is a *seed*
  artifact (loop@seed777 = 2181.37 sits within 0.3 DPS of the bulk probe's
  2181.67) and is unrelated to this. This ticket is about slope, that one was
  about intercept, and the intercept here is zero.
- **Not a cause of any observed misranking.** No row in the 220-row dump ranks
  differently because of it.
- **Cause unknown.** This is a measured property of two committed arms, not a
  diagnosis. Candidate explanations worth testing: the bulk tournament's adaptive
  iteration count (the ledger measured 7,091 adaptive vs 5,000 flat, ticket 346),
  a stage-metric difference in how the tournament aggregates DPS, or genuine
  divergence in how the two engines handle a badly-itemised gear set. Nothing
  here distinguishes them.

## What to do

1. **Confirm it reproduces** on a fresh pair of arms, ideally with matched
   iteration counts (ticket 346 covers the accuracy-mismatch measurement that
   would make this a controlled comparison rather than a confounded one). If the
   slope disappears at matched accuracy, this is ticket 346 wearing a different
   hat and should be closed into it.
2. **If it reproduces**, decide whether it needs correcting at all. The honest
   default is to leave it and record the bound: "screened deltas are within X% of
   loop deltas, degrading with magnitude, immaterial above -10 DPS."
3. **Guard the arithmetic rather than the measurement.** If any future consumer
   sums large negative deltas across routes, that consumer is where this becomes a
   defect — the fix belongs there (or in a rule that such a consumer must use
   same-route deltas), not in a global scale correction, which would be a
   correction fitted to one measurement of one spec.

## Acceptance

- [ ] The slope is re-measured on a fresh pair of arms at matched iteration
      counts, and either reproduces or is shown to be an accuracy-mismatch
      artifact (closing into ticket 346).
- [ ] If it reproduces: the magnitude bound is recorded next to
      `MAX_CANDIDATES_PER_BULK_REQUEST` or in the screening pass's doc comment,
      stated as "immaterial near the cutoff, up to N% at deep downgrades".
- [ ] Any consumer that sums deltas across routes is identified and either uses
      same-route deltas or documents why the scale difference is tolerable there.

## Notes

Surfaced while verifying the round-2 review's claim that
`individualDeltasByItemId` leaked the screening baseline into set-bonus
arithmetic. That claim was refuted — a same-run delta cancels any additive
difference, and re-scaling it would have injected a 65.3 DPS error per added
piece rather than removing one — but checking it required characterising how the
two routes actually differ, which is where the slope turned up. The additive
question is settled and fixed; this is the multiplicative remainder.

Related: 345 (equivalence metric granularity), 346 (bulk vs loop cost at matched
accuracy — the likeliest confound here), 349 (batch bound vs iteration count).
