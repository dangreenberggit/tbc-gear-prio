Status: closed
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

## Comments

### 2026-10-09, review round 2 fix round — closed

- **Answer: the owner's.** The owner confirmed that a class cannot obtain
  another class's Dungeon Set 2 pieces: "I'm confirming it. Remove."
  (decision-log 2026-10-09, relayed by the session). The first done line
  asked for a primary source instead; Wowhead's quest data does not give one.
  The 18 "Just Compensation" quests that award the belts and gloves
  (`https://www.wowhead.com/tbc/quest=8944/just-compensation` lists them as a
  series) carry a class restriction in Wowhead's data only for quest 8935
  (`"reqclass":8`, rogue); the others show `"reqclass":0` and no "Class:"
  line. So the restriction rests on the owner's confirmation, and each row
  records it.
- **The class per set.** Wowhead's appearance-set page for each set has a
  "Classes:" line, and each matches the expected class: 511 Battlegear of
  Heroism warrior (`https://www.wowhead.com/classic/transmog-set=935`), 512
  Darkmantle Armor rogue (640), 513 Feralheart Raiment druid (530), 514
  Vestments of the Virtuous priest (618), 515 Beastmaster Armor hunter (552),
  516 Soulforge Armor paladin (596), 517 Sorcerer's Regalia mage (574), 518
  Deathmist Raiment warlock (684), 519 The Five Thunders shaman (662).
- **Fix.** Port `3bb52a91` adds the nine sets to
  `data/class-restricted-sets.json`, each with its appearance-set URL and a
  `confirmed` note, and regenerates the universes: 36 lists lose exactly the
  off-class Dungeon Set 2 entries, the same at p2-p5 (warrior 21, hunter 18,
  ele 15, enh 15, balance 12, rogue 12, mage 6, shadow 6, warlock 6; 444 in
  all); no other entry or header field moved; the ret and feral universes are
  byte-identical, and their reports change only `d7EligibleTotal` and
  `excludedNoSource`. Two generator runs gave identical bytes for all 88
  files. `python scripts/check_class_restricted_sets.py` printed the 444
  leaks before the regen and "ok (18 sets: 9 matching their ring's
  classAllowlist, 9 on an appearance set and the owner's confirmation; 44
  universes, 0 off-class entries)" after. Fork `1b28ad005` syncs the 36
  bundled copies; port `37c5c67b` re-pins it; `pnpm verify` rc 0.
