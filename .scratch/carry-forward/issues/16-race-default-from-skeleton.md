Status: resolved
Type: bug
Origin: `.scratch/handoffs/sim-settings-gap-dig.md`
Blocks: none
Blocked by: none

# Default race from the preset skeleton, not hardcoded Human

## Problem

`rankUpgrades` used `input.race ?? "RaceHuman"`. PLAN.md says race defaults
to the **preset**. Ret P2 skeleton and user wowsims profiles are Blood Elf.
Slamaltman ranks were ~40 DPS high as Human; mace upgrades vs Lionheart
(sword) were understated because of the Human sword racial.

## Fix

Read `raid.parties[0].players[0].race` from `deps.raidSimSkeleton` when
`RankInput.race` is omitted. Standing assumption text notes “from the pinned
preset.”

## Done when

- [x] Default matches skeleton (Blood Elf for ret P2).
- [x] Explicit `RankInput.race` still overrides.
- [x] Test covers omit → skeleton race.
