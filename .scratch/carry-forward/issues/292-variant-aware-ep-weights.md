Status: open
Type: enhancement
Origin: stage-gate feature upgrades-all-dps-specs, step 6, 2026-08-25
Blocks: none
Blocked by: none

# Give variant-shipping specs their own EP weights per variant

`data/presets/ep-weights-by-phase.json` is single-axis: one entry per
`SpecId`, keyed by phase, with no variant key. Three specs upstream ship
EP presets that differ by **build**, not by phase, and each was therefore
reduced to one entry during the all-DPS-specs pass:

| Spec | Transcribed | Not transcribed |
|---|---|---|
| warrior | Fury (`P1_FURY_EP_PRESET`, `P2_FURY_EP_PRESET`) | Arms (`P1_ARMS_EP_PRESET`, `P3_ARMS_EP_PRESET`) |
| hunter | BM (`P1_BM_EP_PRESET`) | SV (`P1_SV_EP_PRESET`) |
| warlock | Affli/Demo/Destro (`P1_AFFLI_DEMO_DESTRO_EP`) | Destruction/Fire (`P1_DESTRUCTION_FIRE_EP`) |

The kept variant is the one that spec's own `sim.ts` wires as its default
(`ui/warrior/dps/sim.ts:63`, `ui/hunter/dps/sim.ts:75`,
`ui/warlock/dps/sim.ts:60`), so the choice is upstream's rather than ours.

## Why it matters

EP weights drive the candidate prefilter and the gem fill; they never
produce a ranking number, which is why shipping one variant is defensible
rather than wrong. But an Arms warrior is prefiltered and gemmed by Fury's
weights, and those genuinely differ — Arms weights strength around 5.85-6.0
against Fury's 2.79-2.80, a different stat priority, not a rescaling.

The likely visible symptom is a shortlist ordered slightly wrong for the
off-default build, and gems chosen for the wrong stat.

## What to do

Either add a variant axis to `ep-weights-by-phase.json` (and to
`resolveEpWeights` in `packages/core/src/ep-weights.ts`, plus the fork's
`data.ts`), or decide deliberately that one-variant-per-spec is the
shipped behaviour and record that as an ADR. The schema change is the
larger half: both the Python (`_ep_weights_map`) and the TypeScript
readers parse the same file and must not drift (ticket 159).

Note the warlock case is smaller than it looks: `P1_DESTRUCTION_FIRE_EP`
is derived from the other preset via `.withStat()` rather than being an
independent map (`ui/warlock/dps/presets.ts:56-58`).

## Done when

Either every variant a spec ships has its own weights and the tab selects
by the page's current build, or an ADR records the single-variant choice
with its reasoning.
