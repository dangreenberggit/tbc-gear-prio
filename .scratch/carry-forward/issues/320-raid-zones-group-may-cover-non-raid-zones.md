Status: open
Type: bug
Origin: pre-merge review round 4, Domain axis finding D3, 2026-08-27
Blocks: none
Blocked by: none

## Measured 2026-08-30 (bucket-2 pass) — hypothesis PARTIALLY confirmed; left open for an owner rename call

Enumerated every distinct `zone` value across all 44 built universes
(`data/universes/<spec>-p<N>.json`), with the source `kind`(s) each carries and
an item count. Re-runnable: the scan walks each item's `source`/`sources` for a
`zone` string and tallies. Result — 10 distinct zone values:

| zone | kind(s) | items | verdict |
|---|---|---|---|
| Black Temple | raid, token | 151 | genuine raid ✓ |
| Gruul's Lair | raid, token | 40 | genuine raid ✓ |
| Hyjal Summit | raid, token | 85 | genuine raid ✓ |
| Karazhan | raid, token | 170 | genuine raid ✓ |
| Magtheridon's Lair | raid, token | 22 | genuine raid ✓ |
| Serpentshrine Cavern | raid, token | 98 | genuine raid ✓ |
| Sunwell Plateau | raid, token | 122 | genuine raid ✓ |
| Tempest Keep | raid, token | 73 | genuine raid ✓ |
| Zul'Aman | raid | 73 | genuine raid ✓ |
| **World Bosses** | raid | 20 | **not a raid *instance*** |

Nine of the ten are genuine TBC raids and correctly land under "Raid zones". The
one exception is **"World Bosses"** (20 items, e.g. Doomwalker / Doom Lord
Kazzak drops): it carries a `zone` field with `kind=raid`, so under
`raidFilterGroups` (engine/view.ts:100-114) it appears in the `zone` group
labelled "Raid zones". World bosses are raid-*difficulty* outdoor encounters, not
a raid zone/instance. The assignment is deliberate — `assemble_universe.py:76`
sets `WORLD_BOSS_ZONE = "World Bosses"` because outdoor bosses have no zoneId and
this string is the only thing tying their drops to a phase, matching AtlasLoot's
own `WorldBossesBC` alias (`parse_atlasloot.py:65`), which groups them alongside
raids. (Note the separate zoneless `world` bucket, labelled "World drop", is for
BoE world drops — a different thing.)

So it is a real, narrow mislabel, but the fix is a **taste/labeling decision only
the owner should make**, not an objective bug fix — hence left open, not closed:

- Option A — rename the group label from "Raid zones" to the ticket's own
  suggestion **"Content"** (true of raids and world bosses alike; the filter's
  internal key is already `zone`, and the flat-list label is what a player reads).
  Cleanest; touches one i18n string.
- Option B — move "World Bosses" into the zoneless "Other sources" group (add it
  to the bucket list / `SOURCE_LABELS` handling). But it is legitimately
  raid-tier gear a raider shortlists, so demoting it to "Other" may read as more
  wrong than the current placement.
- Option C — accept the status quo (AtlasLoot groups world bosses with raids;
  many players do too) and only fix the *hypothesis-was-unmeasured* gap by
  recording this measurement. Zero code change.

On the human-inspection checklist as an owner rename decision.

# "Raid zones" filter group may list non-raid zones

**This is a hypothesis, not a measurement.** The domain reviewer flagged the
mechanism and explicitly did not enumerate the source data.

The content filter splits options into two groups purely by whether a source
key is one of the zoneless buckets (`engine/view.ts:73-81`: badge, crafted, rep,
pvp, world, heroic, unknown). Anything else — that is, anything whose source
carries a `zone` field — falls into the group labelled "Raid zones"
(`upgrades_tab.view.raid_filter_group_zone`, `view.ts:96-111`).

So if the source data attaches a `zone` to a **normal (non-heroic) dungeon or a
world boss**, that entry would be listed under "Raid zones" and read as
inaccurate to a TBC player. Heroic dungeons are safe: `heroic` is its own
bucket, so they correctly land in "Other sources".

## How to settle it

Enumerate the distinct `zone` values actually present in a built universe and
check whether any is a non-raid instance. If none is, close this as
not-applicable and note the measurement. If some are, either widen the bucket
list or rename the group to something true of both (the filter's own label,
"Content", is fine and is not in question).

Low harm if wrong; cheap to check.
