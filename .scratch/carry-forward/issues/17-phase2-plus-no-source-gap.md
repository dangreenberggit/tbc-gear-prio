Status: open
Type: task
Origin: `.scratch/handoffs/raid-scoped-pool-implementation-review.md` defect 3
Blocks: none
Blocked by: none

# Own the phase-2+ `excludedNoSource` gap

## Problem

Universe assembly drops items with no resolvable source (db sources,
AtlasLoot, Wowhead list, or two-hop). Reports show thousands excluded;
among them **~673 at phase ≥ 2** that are not “vanilla junk.” Concrete miss:
**Shattrath Leggings (30257)** — in all three vendored wowsims ret gear sets,
quality 3, no db/AtlasLoot/Wowhead list source → absent from the universe
(`pool-hardening` has an `it.todo` for it).

Also named: Band of the Eternal Champion (29301) and Band of Eternity family.

Plan §3 treated no-source as mostly acceptable; the phase-2+ remainder needs
an owner and a triage, not silent acceptance.

## Done when

- A short inventory (script or report section) lists phase≥2 `excludedNoSource`
  IDs that appear in wowsims ret gear sets and/or Wowhead ret lists after a
  fresh collect — ranked by relevance.
- Decision per bucket: add AtlasLoot/Wowhead coverage, explicit force-include
  with documented source, or accept exclude with reason.
- 30257 either enters the universe with a real source row, or a ticket note
  explains why it stays out (and the `it.todo` is updated).
