Status: closed
Type: bug
Origin: mislabelling found while reading ADR-0033 Consequence 5, feat/desktop-transport-gate
Blocks: none
Blocked by: none

# The ret preset files are named `p2.` but wear phase 1 gear

## What

`data/presets/ret/p2.raid-sim-skeleton.json` and
`data/presets/ret/p2.individual-sim-settings.json` both carry the phase 1 ret
gear set, not phase 2. Their 17 equipment ids are an exact match for the fork's
`ui/paladin/retribution/gear_sets/p1.gear.json` and do not match `p2.gear.json`:

```sh
python -c "import json,functools; \
  g=lambda p,*k:[i.get('id') if i else None for i in functools.reduce(lambda o,x:o[x],k,json.load(open(p)))['items']]; \
  V='vendor/tbc-new-fork/ui/paladin/retribution/gear_sets/'; \
  s=g('data/presets/ret/p2.raid-sim-skeleton.json','raid','parties',0,'players',0,'equipment'); \
  i=g('data/presets/ret/p2.individual-sim-settings.json','player','equipment'); \
  print(s==i==g(V+'p1.gear.json'), s==g(V+'p2.gear.json'))"
# -> True False
```

The gear is `[29073, 28745, 29075, 24259, 29071, 28795, 30644, 28779, 30257,
28608, 28757, 30834, 29383, 28830, 28429, null, 27484]`. The P2 set begins
`32461, 30022, 30055, 30098, 30129, ...`.

The mislabelling is old, not a regression. `git log --follow` shows both files
arriving already holding this gear — `1d5cf2d4` ("Close Phase 0") for the
settings export, `ced1e9ff` ("Add compose stage and promote the ret P2
RaidSimRequest skeleton") for the skeleton. No commit ever put P2 gear in them
and no commit replaced it, so they were P1 from the start and simply misnamed.

## Why it mattered

Two durable documents describe engine measurements run on this input and call
the gear "P2": `docs/adr/0033-upstream-is-master-again.md` Consequence 5 and
`.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md`. A later reader
chasing a ranking shift could have gone looking for a phase-2 character that
was never there.

## Resolution

**Documented, not renamed.** The `p2` in the path is composed by template —
`loadOfflineInputs` in `packages/core/src/cli-wiring.ts` builds
`data/presets/${spec}/p2.raid-sim-skeleton.json`, and `skeletonPresetIdFor` in
`packages/core/src/spec-registry.ts` derives the preset id the same way — and
the literal appears in roughly sixty places across source, tests, docs and
tickets, plus the parallel `data/presets/feral/p2.raid-sim-skeleton.json` which
this finding says nothing about. It is also embedded in committed `presetId`
values that content hashes and recorded fixtures key on. Renaming would be a
large, wide blast radius in exchange for a filename; documenting the contents
costs nothing and puts the correction where a reader of these files will hit it.

The gear was **not** changed to phase 2 either. These are golden fixtures —
committed sim numbers, recorded adapter fixtures and content hashes are all
baselined on this exact equipment — and the Upgrades tab never reads a skeleton
file at all (ADR-0031), so a swap would invalidate baselines for no product
gain. Phase filtering of ranked candidates comes from the universe pool, not
from this baseline character.

Landed on `feat/desktop-transport-gate`:

1. `data/presets/ret/README.md` — new. States that the `p2.` prefix is a path
   template rather than a gear claim, carries the verification command above
   and its `True False` output, and says why neither the names nor the gear are
   being changed.
2. `docs/adr/0033-upstream-is-master-again.md` — a `**Corrected:**` line in the
   header and a dated "Correction, 2026-09-15" section at the end, following
   the repo's existing dated-amendment convention (ADR-0023, ADR-0024) rather
   than rewriting an accepted ADR's assertion in place.
3. `.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md` — the "ret P2
   skeleton" phrase in its Answer section now reads "ret baseline skeleton", and
   a correction paragraph sits under the header.

## No number moved

Every figure in ADR-0033 Consequence 5 and in `engine-delta.md` stands. The
measurement compares two engine builds on one fixed, unmodified input at a fixed
seed and iteration count; which phase that input's gear belongs to does not
enter the comparison. Nothing was recomputed and no simulation was re-run.

The two-handed framing those documents rest on also survives, and this was
checked rather than assumed. The main hand is equipment index 14 — index 15 is
null in every one of these sets — and the P1 set's Lionheart Champion (`28429`)
and the P2 set's Lionheart Executioner (`28430`) both carry `handType: 4`,
which `vendor/tbc-new-fork/proto/common.proto:356` defines as
`HandTypeTwoHand`. The one-handers swapped in for the −80.35 DPS result carry
`handType` 1 and 2 (`35110`, `35101`) and the in-band 2H controls carry 4
(`34247`, `33465`), so the split the measurement turns on is identical under
either phase's gear.

## Done when

- [x] Both files independently confirmed to equal `p1.gear.json` and differ from
      `p2.gear.json`.
- [x] Git history checked — P1 from the first commit, never a regression.
- [x] Every referrer enumerated before choosing rename vs document.
- [x] `data/presets/ret/README.md` records the contents and the reasoning.
- [x] ADR-0033 and `engine-delta.md` no longer call the input P2 gear, with no
      number touched.
- [x] `pnpm verify` green.
