Status: open
Type: bug
Origin: pre-merge review round 4, Domain axis finding D3, 2026-08-27
Blocks: none
Blocked by: none

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
