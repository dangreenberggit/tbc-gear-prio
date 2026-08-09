Status: open
Type: chore
Origin: ADR-0022 follow-up, 2026-08-08
Blocks: none
Blocked by: none

# TALENTS and CONSUMABLES are still hand-ported constants

## Problem

ADR-0022 replaced feral's hand-transcribed buff/debuff defaults with a build-time
extraction (`scripts/extract_sim_defaults.mjs`), pinned and gated by
`pnpm sim-defaults:check`. Two constants in `scripts/build_feral_skeleton.py`
did **not** get that treatment and are still typed by hand:

- `TALENTS` — `StandardTalents.data.talentsString` from
  `ui/druid/feralcat/presets.ts`
- `CONSUMABLES` — `DefaultConsumables` from the same file

Also hand-ported from `OtherDefaults` in that file: `RACE`, `PROFESSION1`,
`PROFESSION2`, `REACTION_TIME_MS`, `DISTANCE_FROM_TARGET`.

Nothing checks these against upstream. A wowsims tag bump that retunes the
default talent build or swaps a consumable leaves them silently stale — exactly
the failure mode ADR-0022 closed for the buff blocks, still open for these.

## Why it wasn't done in ADR-0022

Scope. That ticket was about buff/debuff defaults diverging from wowsims; the
extractor was built to serve it. Widening it mid-change would have mixed a
correctness fix with a tooling refactor.

## Scope

1. Extend `extract_sim_defaults.mjs` to read `presets.ts` as well as `sim.ts`.
   `DefaultConsumables` is a `ConsumesSpec.create({...})` — the same shape the
   extractor already handles. `StandardTalents` is a `SavedTalents.create({...})`
   wrapping a string.
2. Add `ui/druid/feralcat/presets.ts` to `sync_wowsims.py` `TRACKED`.
3. Fold the extracted values into `data/presets/feral/buff-defaults.json` (or a
   sibling file — naming is open; the current name would become wrong if it
   carries talents).
4. Delete the corresponding constants from `build_feral_skeleton.py`.

## Watch out for

- **`potions`/`conjuredItems`**: `check_raid_sim_skeleton.py`'s docstring records
  these as exported UI menus with an unknown filter, deliberately omitted for
  feral. Extraction must not quietly reintroduce them.
- **The talent-preset choice is a judgement call, not a lookup.**
  `build_feral_skeleton.py` documents picking `StandardTalents` over
  `MonocatTalents` because it is listed first upstream and the P2 gear sets are
  built around it. An extractor must keep that choice explicit and reviewable —
  "first preset in the file" is not the same claim.
- Regenerating must leave `data/presets/feral/p2.raid-sim-skeleton.json`
  byte-identical, since none of these values are changing. That is the test.
