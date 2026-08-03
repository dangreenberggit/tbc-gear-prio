Status: closed
Type: bug
Closed: 2026-07-29 — canonical_zone() folds world-boss spellings; AtlasLoot owns
the boss attribution for that zone. Test in pool-hardening.test.ts.
Origin: `docs/reviews/phase-1-five-seed-spread.md` Domain finding 3
Blocks: none
Blocked by: none

# World-boss zone strings are not canonicalised, so an item lists the wrong boss

## Problem

`data/universes/ret-p3.json`, item **30730 Terrorweave Tunic**:

```json
{"boss":"Doomwalker","kind":"raid","zone":"World Bosses"}
{"kind":"raid","zone":"World Boss","boss":"Doomwalker"}
{"kind":"raid","zone":"World Boss in Hellfire Peninsula","boss":"Doom Lord Kazzak"}
```

Terrorweave Tunic drops from **Doomwalker** in Shadowmoon Valley. The third row
attributes it to Doom Lord Kazzak in Hellfire Peninsula — wrong boss, wrong zone.

Cause: `parse_atlasloot.py` canonicalises instance zones through
`INSTANCE_ZONE_ALIASES` (this is where `"World Bosses"` comes from), but
`parse_wowhead_source` in `assemble_universe.py` does no equivalent
normalisation, so Wowhead's free-text `wowheadSourceText` yields `"World Boss"`
and `"World Boss in Hellfire Peninsula"` as distinct zones. `add_source`
de-duplicates on the exact `{kind, zone, boss}` tuple, so three spellings of the
same place survive as three rows.

The ID ranges split cleanly — Doomwalker owns 30722–30733, Kazzak owns
30734–30742 — and every other world-boss entry respects it. Only 30730 and
30738 (Ring of Reciprocity, mirrored shape) are affected.

## Impact

Ranking is unaffected: the item is in the pool with the right phase, and zone
filtering matches on any of the rows. The damage is to the "where do I get this"
answer — a user is told to farm the wrong boss in the wrong zone, which is
exactly the kind of quiet trust-killer PLAN.md §8.3.2 warns about for sources.

## Done when

- World-boss zone labels from Wowhead are canonicalised to `"World Bosses"`
  before `add_source`, so the three rows collapse to one per boss.
- 30730 lists only Doomwalker; 30738 lists only Doom Lord Kazzak.
- A test pins both, alongside the existing world-boss admission test in
  `pool-hardening.test.ts`.
