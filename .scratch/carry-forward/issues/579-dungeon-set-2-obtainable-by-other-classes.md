Status: open
Type: task
Origin: docs/reviews/feat-upstream-react-port.md, round 2, finding D4
Blocks: none
Blocked by: none
Related: 576

# Can another class obtain a Dungeon Set 2 piece?

## Owner's rule

> "Obviously it shouldn't be in the candidate list because it's impossible."

(Owner, 2026-10-08T16:22Z, `.scratch/stage-gate/cleanup-upstream-footprint/decision-log.md`, gitignored, owner's checkout.)

## What is true now

Ticket 576 removed other classes' Tier 3 pieces (sets 521 and 523-530) from the candidate lists and kept Dungeon Set 2 (sets 511-519). The reason recorded for keeping Dungeon Set 2 (decision-log 2026-10-08T23:36Z, a session ruling, not the owner's) is that Wowhead tags each Tier 3 set with one class and each Dungeon Set 2 set with an armor type only.

The review's Domain axis found that this does not separate the two groups:

- The Wowhead TBC item tooltips for Tier 3 pieces have no "Classes:" line, for example Cryptstalker Tunic (`nether.wowhead.com/tbc/tooltip/item/22436`) and Dreadnaught Breastplate (`.../item/22416`). "Class: Hunter" appears only on the set tooltip (`.../item-set/530`).
- A Dungeon Set 2 piece, Belt of Heroism (`.../item/21994`), also has no class line.
- Upstream's `vendor/wowsims/db.json` has no `classAllowlist` on these pieces.

So the real reason Tier 3 is impossible for another class is probably that the token turn-in is class-specific (hypothesis, untested). If the Dungeon Set 2 upgrade quests are class-specific too, the Dungeon Set 2 pieces in other classes' lists are just as impossible (hypothesis, untested). The rows kept on 2026-10-08 were 1,724 minus 1,280 = 444 (decision-log 23:36Z and the cleanup plan's table).

## Done when

- A primary source (the Wowhead TBC quest pages for the Dungeon Set 2 upgrade quests, or the TBC Classic quest data) answers whether a character can obtain a Dungeon Set 2 piece that belongs to another class's set, quoted here with its URL.
- If it cannot: sets 511-519 are added to `data/class-restricted-sets.json` with their class and source, the universes are regenerated (`data-pipeline-work` skill), `python scripts/check_class_restricted_sets.py` passes, the fork's bundled copies are synced and re-pinned, and `pnpm verify` is green.
- If it can: the answer is recorded here and the ticket is closed.
