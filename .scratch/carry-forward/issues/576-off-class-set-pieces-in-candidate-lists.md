Status: closed
Type: bug
Origin: stage-gate cleanup-upstream-footprint, plan revision 4, step D3 (work in chunk E), 2026-10-08 (`.scratch/stage-gate/cleanup-upstream-footprint/plan.md`; gitignored, owner's checkout)
Blocks: none
Blocked by: none
Related: 524, 532

# Candidate lists hold set pieces that belong to another class

## Owner's words (2026-10-08)

> "Cryp thing: I have no idea why non hunters would even get a chance to sim
> hunter only gear.  Couldn't measure is fine this seems like a wowsims bug.
> Obviously it shouldn't be in the candidate list because it's impossible."

> "you dont need to find what introduced the off class set pieces. i havent
> seen this BS until this session and i honestly dont care."

> "Chink e: this work seems to have introduced this problem and we will not be
> merging that crap in"

About those words, the session then wrote: "I read those words the other way: the off-class
pieces must not be in what gets merged." The owner answered: "That is indeed
the only intelligent way to read that". So the fix runs on the tab branch
before any merge.

The cause is not investigated, by the owner's instruction.

## What is wrong (unverified until step E1 re-measures it)

- Claim C19: Cryptstalker Armor (hunter tier 3, item ids 22436-22443) reaches
  warrior, Elemental and Enhancement lists, because wowsims' `db.json` gives
  those 8 pieces no `classAllowlist` and the pool builder trusts
  `canEquipItem`. Unverified.
- Claim C20: 1,724 candidate rows in 36 of 44 lists are pieces of another
  class's set: Dungeon Set 2 (setIds 511-519) and Naxxramas tier 3 (521,
  523-530). 0 rows violate a `classAllowlist`; ret and feral lists have 0.
  Claimed rows per list: warrior 85, hunter 66, ele 63, enh 63, balance 44,
  rogue 44, mage 22, shadow 22, warlock 22, the same at every phase.
  Unverified.

## Plan (cleanup plan, chunk E)

1. Re-measure C19 and C20 with a script over `vendor/wowsims/db.json` and
   `data/universes/*-p?.json`. Check the set-to-class table against Wowhead
   and write it to a new tracked `data/class-restricted-sets.json`. If the
   counts differ, use the measured ones and say so here. If ret or feral
   lists show leaks, stop: their fixtures may need re-recording.
2. In `scripts/assemble_universe.py` `eligible_d7`, exclude an item whose set
   belongs to another class. Add a check wired into `pnpm verify` that fails
   if any universe entry's set belongs to another class.
3. Regenerate the universes, sync the fork's bundled copies, regenerate the
   pool listings; ret and feral files stay byte-identical.
4. Fork commit of the bundled universes, the re-pin, and the layout gate.

Ticket 524 keeps the separate question of same-class level-60 set items.

## Done when

The re-measure script prints 0, the new verify check passes, `pnpm verify`
passes after the re-pin, and this ticket records the measured counts.

## Comments

### 2026-10-08, cleanup stage cleanup-upstream-footprint, chunk E — closed

- **C19 holds.** `vendor/wowsims/db.json` ids 22436-22443 are the eight
  Cryptstalker pieces, `setId` 530, with no `classAllowlist`.
- **C20's count was wrong; the measured one is used.** Under the plan's table
  the count reproduces (1,724 rows in 36 of 44 lists). But Wowhead, the source
  the plan names, tags only the Naxxramas Tier 3 sets with a class. It tags
  Dungeon Set 2 (511-519) with an armor type and no class
  (`https://nether.wowhead.com/tbc/tooltip/item-set/530` shows "Class:
  Hunter"; `.../512` shows no class). The tag is on the set only: the
  pieces' own tooltips have no class line (`.../item/22436`). By the owner's
  rule (another class's gear is "impossible" in a candidate list), the
  session ruled at 2026-10-08T23:36Z to exclude Tier 3 only. Whether another
  class can obtain a Dungeon Set 2 piece is ticket 579 (wording corrected by
  review finding D4, `docs/reviews/feat-upstream-react-port.md`). Measured: **1,280 rows in 36 of 44 lists**, the same at p2-p5:
  warrior 64, hunter 48, ele 48, enh 48, balance 32, rogue 32, mage 16,
  shadow 16, warlock 16; ret and feral 0. The 444 Dungeon Set 2 rows stay.
- **Fix.** `data/class-restricted-sets.json` lists the nine Tier 3 sets (521,
  523-530), each with its Wowhead class and source URL. `eligible_d7` in
  `scripts/assemble_universe.py` drops a piece of one of them from every other
  class's universe. `scripts/check_class_restricted_sets.py`
  (`pnpm class-restricted-sets:check`, in `pnpm verify`) fails on any
  remaining one; before the regen it reported the 1,280 rows above, after it
  "0 off-class entries". Port `3f219d9b`.
- **Regen.** Each of the 36 changed universes loses exactly those entries; no
  other entry, order or header field moved. The ret and feral universes are
  byte-identical, so **no fixture is re-recorded**. Their report sidecars
  change in two counts only (`d7EligibleTotal` and `excludedNoSource`, both
  down 64 for ret and 32 for feral): those pieces were equip-eligible there
  but never sourced. `data/pool-listings/{ret,feral}-p3.md` drop the same
  pieces from their "wowsims-only" lists. A second regen gave the same bytes.
- **Fork and pin.** Fork `c122cf73b` refreshes the 36 bundled copies
  (`pnpm fork-universes:check` ok, 63 of 63). Port `e6296aea` pins it;
  `data/sim-implemented-effects.json` moved only its `forkCommit`.
  `pnpm verify` passed (1517 gates). `pnpm tab-fixtures:check` warns stale,
  errors on none. `pnpm layout-gate:check` measured a pass (36 PASS, 0 FAIL)
  and advanced the baseline to `85fe4d5bb041`.
- **What moves in the tab:** the warrior, ele and enh rankings lose the
  Cryptstalker rows, and the nine affected specs lose the other classes'
  Tier 3 rows; their set-bonus popups lose the "couldn't measure" lines for
  those sets (the plan's prediction, untested in a live run). Ticket 524 keeps the same-class level-60 set question.
