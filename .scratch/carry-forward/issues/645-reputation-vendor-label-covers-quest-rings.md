Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: docs/reviews/feat-tab-view-filter.md, D3
Blocks: none
Blocked by: none
Related: 619, 620

# "Reputation vendor" names the Band of Eternity rings, which are not sold

The tab labels every `rep` source "Reputation vendor" (fork
`ui/features/upgrades/model/engine/view.ts:153` `SOURCE_LABELS`). That covers the Band
of Eternity rings (29298-29309), which AtlasLoot gives as `rep` at a
standing (`data/atlasloot_sources.json`, entries 29298-29309, faction The Scale Of The Sands). From general knowledge these
rings are quest rewards gated by Scale of the Sands standing, not vendor
items (hypothesis, untested against a primary source). With "Filter by
source" (ticket 527) the label also appears in the results dialog, not only
in the pre-run Sources dialog and the Source cell.

The label is older than ticket 527; the review of `feat/tab-view-filter`
found it.

Done when: a primary source (in-game data or wowsims `db.json`) settles how
the rings are obtained, and the label for that bucket is true for every
item in it (for example "Reputation"), or the rings move to a bucket whose
label is true for them.
