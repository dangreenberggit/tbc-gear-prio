Status: open
Type: decision
Origin: pre-merge review feat/tab-wowsims-items, A5 (same as P2)
Blocks: none
Blocked by: owner ruling
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on
Related: 505

# BiS sets are chosen partly by reading preset names

## What the player sees

The BiS badge and the sets ticked by default come from the wowsims presets of
the pool's phase, except presets whose name matches
`NOT_BIS_NAME = /pre[- ]?raid|prebis|realistic|\balt\b|bulwark/i`
(fork `ui/features/upgrades/model/pool_source.ts:51`, at fork `527c0d798`).
`bulwark` matches one preset, ret's "Bulwark". Today the rule gives the
expected result for all 104 presets in `pool_source.presets.fixture.json`
(adversarial axis, Python check).

## Why it is a ticket

The owner ruled on 2026-10-17 against name-reading rules as a fix. The code
before this branch chose default sets by item ids and phase, with no name
pattern
(`git -C vendor/tbc-new-fork show 160ae36c2:ui/features/upgrades/model/settings_pool.ts`).
The stage-gate decision log accepted the rule at session level (01:21Z note,
row N3); no owner approval is recorded. wowsims' `PresetGear` has no BiS
field, so the name is the only signal wowsims gives.

## Done means

The owner rules: keep the rule as a recorded exception (ADR-0038 says so), or
replace it with a rule over wowsims data only and accept what that does to the
default sets and badges.
