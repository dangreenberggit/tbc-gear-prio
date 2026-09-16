# Open question — should the candidate pool be reshaped so culling is useful?

Written 2026-09-16. Not a task. A question with no record, raised by the owner
after ticket 403 merged, for the owner to investigate further.

## The question

Upstream's bulk sim culls a large combinatorial space. We never used the culling.
The owner asked why, and the answer turned out to have a gap in it.

**What is written down:** ticket 340 investigated using the culling and rejected
it, with measurements.

**What is not written down anywhere:** whether the *pool itself* should change
shape so that culling would have something to do.

## What the record actually says (verified, not recalled)

Ticket 340, "Use wowsims' native bulk sim (tournament) for the BiS-prune mode",
ran a full stage-gate investigation with pre-registered win conditions. It
rejected culling for two independent reasons:

1. **Culling erases the output.** Measured on the full 212-candidate pool:
   the tournament culled to 20 rows — **192 of 212 candidates returned no row**,
   "erasing whole slots (head, shoulder, hands, and trinket1 returned zero rows)"
   (`.scratch/stage-gate/340-tournament-route/report.md:328-346`, Q3;
   `.scratch/carry-forward/issues/340-tournament-for-bis-prune-mode.md:76-80`).
   The win condition was pre-registered before measuring: "A mode qualifies iff
   the batch route can return every row that mode UI renders today"
   (`report.md:56-59`).
2. **Even where culling never engages, it costs more.** At BiS-prune pool sizes
   (15-27 items) the tournament spent **1.7x to 7.2x more iterations** than a
   flat pass, chasing a 0.05% accuracy target nobody asked for
   (`report.md:139-149`, `:274-305`).

The invariant that followed is written into the code: "no candidate is ever
dropped" (`partition.ts:75`), enforced at runtime by `BulkScreenIntegrityError`
(`engine/seams/sim-runner.ts:106-107`), which the driver never swallows.

**Causality worth getting right:** `MAX_CANDIDATES_PER_BULK_REQUEST = 25` came
*after* that decision, not instead of it. Introduced at 25 in fork commit
`ed88f07b5` specifically to keep the rejected machinery dormant. Ticket **349**
is a later, narrower question — whether 25 stays single-stage as iteration counts
rise — and presupposes the decision rather than making it.

## The gap

Ticket 340 took the pool's shape as **given** and asked only whether the existing
pool could route through the tournament. Nobody asked the inverse.

Today each candidate is **one item swapped into one slot** with a single fixed
gem/enchant repair (`engine/rank.ts:868-956`, `:2016-2050`). That is a flat list,
so there is nothing to cull — every entry must be priced and displayed.

A pool that enumerated **item x gem x enchant combinations** would be a genuinely
combinatorial space, which is what the culling pipeline was built for. Searched
`.scratch/` for any consideration of this: **no record found.** Not rejected —
never raised.

## What settles it

This turns on a product question, not an engineering one: **do we ever want
combinatorial gem/enchant optimisation as a feature?**

- **No** — then the pool shape is correct, culling is permanently inapplicable,
  and ticket 340's rejection is the final word. Nothing further to do.
- **Yes** — then the shape of the candidate space is the real design question,
  and the culling pipeline becomes relevant again for a reason 340 never tested.
  Note ticket 403 removed the bulk RPC from the desktop runtime path but left the
  code in the tree (ticket **406**), so re-enabling is a one-line change.

Worth knowing before investing: the reforge/bulk engine already has candidate
generation and a reforge optimizer the tab does not use. That is a separate
capability from culling and may be the more interesting thread.

## Do not conclude from this

That ticket 340 was wrong. It measured what it set out to measure and got a clear
answer for the pool we have. The gap is a question it did not ask, not an error
it made.
