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

**The current values are correct — verified, not assumed.** Diffed against
`ui/druid/feralcat/presets.ts` @ 8aa378b3 on 2026-08-08: all 11 `CONSUMABLES`
keys, the `StandardTalents` string, and all five `OtherDefaults` match upstream
exactly, with no extra keys. This is **not** the ret-inheritance bug that
ADR-0022 fixed; these were read off feral's own presets from the start.

The gap is provenance, not correctness. Nothing re-checks them, so a wowsims tag
bump that retunes the default talent build or swaps a consumable would leave
them stale without failing any gate — the failure mode ADR-0022 closed for the
buff blocks, still open for these. Priority is accordingly low: this is
insurance against a future upstream change, not a live defect.

Not in scope here: that these are wowsims' defaults rather than the player's own
settings. There is no customization to diverge from yet, and adding it is
carry-forward 72.

## Why it wasn't done in ADR-0022

Scope. That ticket was about buff/debuff defaults diverging from wowsims; the
extractor was built to serve it. Widening it mid-change would have mixed a
correctness fix with a tooling refactor.

## Partly overtaken by events, 2026-08-21

**`CONSUMABLES` is gone** — deleted in `25e8173`, but not by extraction. The
skeleton now reads consumables from the owner's committed export
(`data/presets/feral/owner-p2.settings-export.json`), because ticket 244 moved
the whole skeleton onto the rotation actually played rather than upstream's
preset.

That is a different answer to this ticket's question, and arguably a better one
for this constant: extracting `DefaultConsumables` would have pinned us to
upstream's idea of what a feral druid drinks, which is not what we want to
simulate. The old constant was also **wrong** — `potId` 22838 against the
owner's 22832, and no `potions` / `conjuredItems` lists at all, which silently
disarmed the rotation's rune and Fel Mana Potion branches.

One field survives as a constant, `CONSUMABLES_EXTRA = {"drumsId": ...}`,
deliberately: drums are a raid-provided buff rather than a personal consumable
and the owner's export carries none.

**`TALENTS` is untouched and this ticket still stands for it.** Note it now sits
oddly: the rotation and consumables come from the owner's export, which also
carries a `talentsString`, while `TALENTS` remains hand-ported from upstream's
`StandardTalents`. Whoever picks this up should decide whether talents follow
the export (consistent with 244's reasoning) or the extractor (consistent with
ADR-0022) rather than assuming the extractor is still the goal.

`RACE`, `PROFESSION1`, `PROFESSION2` are likewise still hand-ported, and the
export carries those too.

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
