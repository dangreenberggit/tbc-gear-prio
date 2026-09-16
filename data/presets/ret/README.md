# `data/presets/ret/` — what the filenames do and do not tell you

## The `p2.` prefix is a filename, not a claim about the gear

`p2.raid-sim-skeleton.json` and `p2.individual-sim-settings.json` both wear
**phase 1** gear. The `p2.` prefix is the CLI harness's path template, not a
description of the equipment inside.

`loadOfflineInputs` in `packages/core/src/cli-wiring.ts` composes the skeleton
path as `data/presets/${spec}/p2.raid-sim-skeleton.json`, and
`skeletonPresetIdFor` in `packages/core/src/spec-registry.ts` derives the
matching preset id the same way. The literal `p2` is baked into both templates
and into roughly sixty references across source, tests, docs and tickets, so
the names stay as they are; this file is the correction.

Verified 2026-09-15 — the 17 equipment ids in both files are an exact match for
the fork's phase 1 ret gear set, and do not match its phase 2 set:

```sh
python -c "import json; f=lambda p:[i.get('id') if i else None for i in json.load(open(p))['items']]; \
  g=lambda p,*k:(lambda d:[i.get('id') if i else None for i in d['items']])(__import__('functools').reduce(lambda o,x:o[x], k, json.load(open(p)))); \
  V='vendor/tbc-new-fork/ui/paladin/retribution/gear_sets/'; \
  s=g('data/presets/ret/p2.raid-sim-skeleton.json','raid','parties',0,'players',0,'equipment'); \
  i=g('data/presets/ret/p2.individual-sim-settings.json','player','equipment'); \
  print(s==i==f(V+'p1.gear.json'), s==f(V+'p2.gear.json'))"
# -> True False
```

The gear list is `[29073, 28745, 29075, 24259, 29071, 28795, 30644, 28779,
30257, 28608, 28757, 30834, 29383, 28830, 28429, null, 27484]`.

## Why the gear is not being changed to phase 2

These files are golden fixtures. Committed sim numbers, recorded adapter
fixtures and content hashes are all baselined against this exact equipment, so
swapping in phase 2 gear would invalidate them for no product gain — the
Upgrades tab never reads a skeleton file at all (see
[`ADR-0031`](../../../docs/adr/0031-the-raid-sim-skeleton-is-a-cli-harness-input-not-a-product-input.md)).
The phase filtering that governs which candidates get ranked comes from the
universe pool, not from this baseline character.

Everything measured on these files stays valid. Only the "P2 gear" label was
ever wrong. See ticket
`.scratch/carry-forward/issues/402-ret-preset-filenames-say-p2-but-the-gear-is-p1.md`.

## What else is here

- `p2.ep-weights.json`, `p3.ep-weights.json` — EP weights, phase-named by their
  own content.
- `p2.individual-sim-settings.json` — a wowsims **UI settings export**, a
  different shape from the `RaidSimRequest` skeleton. See
  [`../feral/README-owner-export.md`](../feral/README-owner-export.md) for the
  two formats side by side.
