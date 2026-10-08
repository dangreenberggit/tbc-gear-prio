Status: open
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
