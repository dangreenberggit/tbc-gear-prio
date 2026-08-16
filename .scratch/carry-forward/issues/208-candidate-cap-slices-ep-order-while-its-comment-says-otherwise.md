Status: open
Type: correctness (wrong items shown, not wrong numbers)
Origin: ticket 156 slice C session, 2026-08-16
(`.scratch/carry-forward/plans/ticket-156/handoff-2026-08-16.md` §8 item 1)
Blocks: none
Blocked by: none

# `candidateCap` slices the EP order, while the code around it says screening order

`rank.ts`'s racing path caps the promoted set with a positional slice:

```ts
// packages/core/src/rank.ts (M2 racing branch)
const promotedOrdered = ordered.filter((e) => promotedIds.has(e.itemId));
// Cap applies to the promoted set (Dean Q2): the first N of the EP
// order *within the promoted set*, plus every owned row regardless of
// N — same shape as the pre-M2 cap, just over a narrower input.
const promotedCap = input.candidateCap ?? promotedOrdered.length;
simCandidates = promotedOrdered.filter(
  (e, i) => i < promotedCap || equippedIds.has(e.itemId)
);
```

`ordered` is the **EP order**, so `promotedOrdered` preserves EP order and the
slice keeps the first N by EP — not the N that screened best. The comment is
honest about this ("the first N of the EP order"), but it sits directly under
M2's stated purpose, which is that *the sim, not EP, picks what a cap keeps
once racing is active* (candidate-pool.md §5.1.1 Dean Q2). Racing screens every
candidate and then discards the screening ranking at exactly the step the
screening ranking exists to inform.

## Why this is worth its own ticket rather than a fix inside 156

**It does not change how many sims run,** so it does not invalidate a timing
measurement: the cap is a positional slice and `totalSims` depends only on
`simCandidates.length`. Ticket 156 is a throughput ticket, and this is a
correctness-of-selection question — different subject, different acceptance.

**It does change which items a user sees.** At Candidates = 20 with a promoted
set larger than 20, the user gets the 20 highest-EP promoted candidates rather
than the 20 that screened highest. An item that screens well but prices low on
EP is exactly the case racing was built to catch, and the cap drops it.

Second-order: a different item set can change which set-bonus completion
packages are reachable, so the set-bonus sim count can move even though the
per-candidate count does not.

## Not yet established

- Whether ordering by screening delta is the intended behaviour or whether
  Dean Q2 deliberately chose EP order for the cap. The comment asserts Q2
  settled it, but reads as describing the pre-M2 shape being preserved rather
  than a decision to keep EP under racing. **Read the Q2 decision before
  changing anything** — if EP order is deliberate, the fix is to say why in
  the comment, not to change the sort.
- How often the two orders actually differ on a real pool. Unmeasured; a run
  that reported both orders side by side would size the problem.

## Acceptance criteria

- [ ] The Dean Q2 decision is read and quoted here, settling whether EP order
      under a cap is intended.
- [ ] Either the cap slices the screening order, or the comment states plainly
      why EP order is correct under racing despite §5.1.1.
- [ ] If behaviour changes: a test at the `rankUpgrades` interface with racing
      on, pinning which candidates survive a cap when the two orders disagree.
- [ ] The same decision is applied to the fork port (`engine/rank.ts`), with
      E-W3 re-run and `PROVENANCE.md` updated in that order.
