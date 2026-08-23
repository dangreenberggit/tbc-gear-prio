Status: open (deferred deliberately; reason recorded)
Type: deferred feature
Origin: stage-gate `phase-item-pool`, Q3 decision, 2026-08-23
Blocks: none
Blocked by: 35

# The Upgrades tab's raid filter has no boss sub-filter, on purpose

The tab now has a post-sim raid filter: a completed shopping list can be
narrowed to one zone, or to one of the labelled zoneless buckets (badge
vendor, crafted, reputation, PvP, world drop, source not recorded), without
re-simming.

A **boss** sub-filter was considered at the same time and deliberately left
out. The engine would support it — `applyView` already carries a `boss`
option alongside `raid` — so this is a product decision, not a missing
capability.

## Why it was deferred

**Ticket 35 makes boss grouping misleading today.** An item that drops from
several bosses is bucketed arbitrarily, so a boss filter would confidently
show a wrong answer: filter to one boss and an item that genuinely drops from
that boss can be missing, because it was filed under a different one. A raid
filter does not have this problem — an item that drops in a zone is in that
zone whichever boss dropped it.

**The raid filter alone answers the question players ask.** "What should I
look for in the content I am actually running this week" is a zone-level
question. Boss-level narrowing is a refinement of an answer that already
works, not a missing answer.

Adding a filter that is wrong in a way the user cannot see is worse than not
having it, which is why this waits on 35 rather than shipping alongside it.

## Done when

Either ticket 35 is fixed and the boss sub-filter is added on top of the
existing raid filter, or a decision is recorded that boss-level narrowing is
not wanted at all and this ticket closes without the feature.
