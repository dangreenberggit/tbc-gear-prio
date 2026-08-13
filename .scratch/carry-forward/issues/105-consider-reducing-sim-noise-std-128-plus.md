Status: open
Type: investigation
Origin: owner observation, 2026-08-10, while reviewing the shredzepelin-p3 report
Blocks: none
Blocked by: none

# consider reducing sim noise (std 128+ seems like a lot)

The owner flagged that the standard deviation figures shown in the report
read as large — 128+ DPS on a ~2152 DPS baseline. Decide whether that noise
level is actually hurting the rankings, and if so, what to do about it.

Questions to answer, in order:

1. **What is the 128+ figure actually measuring?** Per-iteration DPS spread
   within one sim, or the standard error on a delta between two sims? Those
   are very different problems. Find where the displayed number comes from
   (`se`, `seMethod` on report items; the sim runner's raw output) and state
   it plainly in the disposition.
2. **Does it matter for decisions?** The report ranks items by delta. If the
   per-seed spread on deltas (the 5-seed, 3000-iteration setup) keeps
   neighboring items' error bars overlapping near the cutoff, the noise is
   changing what makes the shortlist. Measure: take a few adjacent pairs near
   the cutoff in `.scratch/rank-reports/shredzepelin-p3.json` and check
   whether their difference exceeds its own error.
3. **If it matters, what's the cheapest fix?** Candidates, each with a cost:
   more iterations per sim, more seeds, common-random-numbers style pairing
   (same seeds both arms — already done; confirm), or longer fights. Note
   spec §2.4's sim-budget constraints before proposing anything expensive.

If (2) shows the ranking near the cutoff is stable despite the spread,
close this with that finding — a big std on the absolute DPS is harmless if
the deltas are tight.
