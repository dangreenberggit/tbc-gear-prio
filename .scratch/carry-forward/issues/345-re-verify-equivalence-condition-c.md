Status: open
Type: task
Origin: Step 10 of the batch-sim web track (stage-gate, 2026-09-01)
Blocks: none
Blocked by: none

# Re-verify bulk-vs-loop equivalence condition (c) with a design the metric can express

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

Step 10 of the batch-sim plan pre-registered four equivalence conditions between
the per-candidate loop and the bulk screening route. Three passed decisively.
Condition (c) — "paired-replication top-N selection overlap >= 90%" — measured
**88.89%** and was **accepted with reason** by the orchestrator rather than
passed. This ticket is the re-verification that acceptance deferred.

Re-run the comparison with a design whose metric can actually express the
threshold, and with a control that says what tail jitter looks like when nothing
differs at all.

## Why the measured number is not decisive either way

Two independent problems with the measurement as run, both structural:

1. **The metric could not express 90% at that set size.** The loop ranked 9
   items and the bulk ranked 10. Overlap is computed over `k = min(9, 10) = 9`,
   so the achievable values are 8/9 = 88.89% and 9/9 = 100%. The registered 90%
   threshold sits in a gap only a perfect result could clear. A pass/fail against
   it measures set size as much as agreement.
2. **There is no control.** Nothing establishes how much tail membership moves
   between two runs that differ only by seed. Without that baseline, an 8/9
   overlap cannot be attributed to the route change rather than to ordinary
   run-to-run noise at the cutoff.

## The measured evidence to carry forward

From `.scratch/stage-gate/batch-sim-web-local/equiv-dump.json` (220 rows per arm,
feral-p2, 5,000 iterations, `hasBulkCapability` false vs true):

- Conditions (a), (b), (d): loop 220 / bulk 220 rows; Spearman **rho = 0.999229**
  over n=220; **0 of 8** shared ranked members outside combined error bars.
- **Ranks 1-8 identical in both runs**, item for item and rank for rank
  (deltas 49.96, 33.92, 13.75, 10.21, 7.36, 6.66, 5.68, 5.07).
- The whole disagreement is three tail items, each measured by **both** runs and
  agreeing within combined 1-sigma:

| item | loop | bulk | gap | combined 1-sigma band |
| --- | --- | --- | --- | --- |
| 29995 Leggings of Murderous Intent | rank 9, dDps 3.572, se 1.087 | below cutoff, 2.419, se 1.093 | 1.154 | 2.180 |
| 32814 Veteran's Leather Bracers | below cutoff, 3.113, se 1.082 | rank 9, 3.564, se 1.079 | 0.451 | 2.161 |
| 32647 Shard-bound Bracers | below cutoff, 2.473, se 1.077 | rank 10, 3.219, se 1.077 | 0.746 | 2.154 |

So no item was ranked differently *because the routes disagree about its DPS* —
they agree on all three within noise. What differed is which side of the
ranked/below-cutoff boundary each landed on, decided by gaps roughly **three
times smaller than the error bars** at that depth.

Overlap stated several ways, because the metric is asymmetric:

```
loopRanked=9 bulkRanked=10
as scored (first k=9 of loop vs bulk set):  8/9  = 88.89%   <- the registered metric
symmetric intersection / union:             8/11 = 72.73%
intersection / loop set:                    8/9  = 88.89%
intersection / bulk set:                    8/10 = 80.00%
```

## What to do

1. **Deepen the ranked set** so the metric has resolution — a character/phase
   whose ranking produces enough ranked rows that one item's movement does not
   swing the percentage by 11 points. Decide and record the minimum set size at
   which the 90% threshold is expressible before running.
2. **Run a loop-vs-loop control at different seeds** to establish baseline
   tail-membership jitter. This is the number any route comparison should be
   judged against: if loop-vs-loop also moves one tail item, then bulk-vs-loop
   moving one tail item is not evidence of a route difference.
3. **Re-cut condition (c) against that control**, or replace it with a condition
   that is not sensitive to cutoff-boundary membership — for example, overlap
   restricted to items whose delta exceeds their own error bar by some margin,
   so items that are statistically tied for the cutoff cannot flip the metric.

## Acceptance

- [ ] Control run (loop vs loop, different seeds) measured; baseline tail-membership
      jitter quoted as a number.
- [ ] Re-run on a ranked set large enough for the threshold to be expressible;
      the minimum set size recorded *before* the run.
- [ ] Condition (c) either passes on the new design, or is replaced by a stated
      condition that is robust to cutoff-boundary ties — with the reasoning written down.
- [ ] Result folded back into the batch-sim record so the "accepted with reason"
      disposition is either confirmed or corrected.

## Notes

The raw dump for the original measurement is committed at
`.scratch/stage-gate/batch-sim-web-local/equiv-dump.json`, and the offline scorer
that produced these numbers is described in the execution ledger alongside it.
The scorer was verified in both directions (passes a clean fixture, fails an
inverted one) before its output was trusted.
