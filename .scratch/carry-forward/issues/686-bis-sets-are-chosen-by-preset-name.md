Status: closed
Type: decision
Origin: pre-merge review feat/tab-wowsims-items, A5 (same as P2)
Blocks: none
Blocked by: none
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

## Closing note

Owner ruling, 2026-10-18, verbatim: "i dont care if it gets a mark that says
bulwark or "alt" (usually a bis alternative that wowsims or the user thought
worth noting)". Fork `c61cc72d6` removes `NOT_BIS_NAME`: every wowsims preset
of the tag phase is a BiS set. `pool_source.cells.fixture.json` bisRows go
from 842 to 858 over the 44 cells at phases 2-5 (ret p3-p5 +1, feral p2 +5,
shadow p2 +8, as an independent Python measurement predicted), and
`pool_source.test.ts` asserts the items each changed cell gained. ADR-0038
records the ruling (`tbc-gear-prio@67e4a648`). Re-recorded
`data/tab-fixtures/ret-p3-p2.json` tags 28485 and shows the "Bulwark" set,
and `feral-p2-malorne4.json` tags the five Alt-set items
(`tbc-gear-prio@bb984a99`).

Verified by: `tbc-new-fork@c61cc72d6` and `pnpm fork-tests:check` at
`tbc-gear-prio@ef9d6ffd` (fork tests check ok, 694 tests passed).
