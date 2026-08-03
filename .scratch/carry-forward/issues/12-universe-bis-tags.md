Status: closed
Type: task
Origin: docs/reviews/phase-1-five-seed-spread.md (split from 11)
Blocks: none
Blocked by: none
Resolution: `assemble_universe.py` tags universe rows with `bisTags: ["BiS"]`
  when the item id appears in a pinned ret gear set; membership proven
  unchanged by id-list diff. 2026-07-30.

# Import wowsims BiS tags onto universe rows

## Problem

Raid-scoped handoff: wowsims curated gear-set IDs should become `bisTags`
for display/pinning only. Universe rows currently ship with empty/absent
tags. S6 (tags do not change membership) is already tested.

## Done when

- Universe assembly (or a follow-on tag pass) populates `bisTags` from the
  pinned wowsims ret gear sets where IDs match.
- Rank membership is unchanged when tags are stripped (existing S6 tests).

## Closed 2026-07-30

`scripts/assemble_universe.py` now reads the three pinned ret gear-set files
(`vendor/wowsims/ret_preraid.gear.json`, `ret_p1.gear.json`, `ret_p2.gear.json`
— same file list `pool-hardening.test.ts`'s `wowsimsCuratedItemIds()` already
used) via a new `wowsims_curated_item_ids()` helper, and sets
`entry["bisTags"] = ["BiS"]` on any universe row whose `itemId` is in that set.
Rows with no match omit the key entirely (existing optional-field convention;
`packages/core/src/pool.ts`'s `UniverseEntry.bisTags` is `?:` and downstream
code reads `entry.bisTags ?? []`).

`bisTags` is typed `Array<"BiS" | "Alt" | "Realistic">` in
`packages/core/src/rank.ts` / `pool.ts`. Retribution's upstream `tbc-new` gear
sets carry no BiS/Alt/Realistic split (confirmed: only `preraid.gear.json`,
`p1.gear.json`, `p2.gear.json` exist under
`.scratch/wowsims-tbc-new-src/ui/paladin/retribution/gear_sets/`, each wired
to a single `PresetUtils.makePresetGear` call in `presets.ts`, no variant
tagging) — so every matched item gets the single `"BiS"` tag.

Gear-set JSON shape (verified by reading the files directly):
`{"items": [{"id": <number>, "enchant"?: <number>, "gems"?: [<number>...]}]}`.

Membership-unchanged proof — sorted `itemId` lists captured before and after
regeneration are byte-identical for both universes:

```
$ diff .scratch/data_universes_ret-p2.json.ids.before.txt .scratch/data_universes_ret-p2.json.ids.after.txt && echo "ret-p2 MEMBERSHIP UNCHANGED"
ret-p2 MEMBERSHIP UNCHANGED
$ diff .scratch/data_universes_ret-p3.json.ids.before.txt .scratch/data_universes_ret-p3.json.ids.after.txt && echo "ret-p3 MEMBERSHIP UNCHANGED"
ret-p3 MEMBERSHIP UNCHANGED
```

Counts: `ret-p2.json` 230 entries, `ret-p3.json` 354 entries, both before and
after (unchanged from the tree state this work started from — the 238/362
figures once in this ticket's history predate a separate, already-landed
classAllowlist fix and are stale; the live `pool.test.ts`/`pool-hardening.test.ts`
assertions are 230/354).

Regenerated both universes and report sidecars:
`python scripts/assemble_universe.py --max-phase 2 --out <ABS>/data/universes/ret-p2.json --report <ABS>/data/universes/ret-p2.report.json`
and the same with `--max-phase 3` / `ret-p3.*`.

Test added: `packages/core/test/pool-hardening.test.ts` —
"tags wowsims curated ret gear-set members with bisTags (ticket 12)" — pins
itemId 30098 (Razor-Scale Battlecloak, verified present in
`vendor/wowsims/ret_p2.gear.json` and in the regenerated `ret-p3.json`) to
`bisTags: ["BiS"]`, and sweeps all of `WOWSIMS_ADMITTED_IN_P3` for the same.

`pnpm verify`: typecheck, lint, test (116 passed), skeleton:check, and
mirrors:check all green. `format:check` fails only on a pre-existing,
untracked, unrelated file (`docs/adr/0017-per-tier-generated-universes-...md`)
not touched by this change.
