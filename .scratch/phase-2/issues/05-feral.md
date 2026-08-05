Status: open
Type: task
Origin: PLAN.md §14 Phase 2, §5.2, §5.4
Blocks: none
Blocked by: 04

# Feral cat — the second spec, and the real gate

Branch: `phase-2/feral` off `phase-2/trust`, after 04.

**Last, deliberately.** PLAN.md §14 calls feral *"the real gate"*, and the gate
box is a falsification test, not a feature request:

> ☐ **feral shipped without a structural change to `rankUpgrades` or its
> seams** — if it needed one, stop and fix the seam before Phase 3

Running it after the four trust slices means they have already applied whatever
pressure they were going to apply to the seams. Any structural change feral
forces is therefore a **finding about those slices**, not ambient noise. Running
feral first would prove nothing, because the seams would be reshaped four more
times before the gate is read.

## The claim under test

> Adding a spec should be a preset JSON plus the disambiguation confidence
> field, and nothing else.

Treat that as a hypothesis to falsify, not a plan to execute. **If you find
yourself editing `rank.ts`, `compose.ts`, or any file under `seams/` to make
feral work, stop and write down what forced it before continuing** — that
sentence is the deliverable of this ticket even when the answer is "it needed a
change."

## What is genuinely spec-coupled today

Known hard-codings to resolve, found by inspection:

- `packages/core/src/spec.ts` — `PALADIN_TREE_SPEC` maps tree index 2 → `ret`
  and `classifySpec` returns `unsupported-class` for any `className !== "Paladin"`.
  The header comment says "Paladin-only until other classes have a verified
  fixture", which is the disambiguation work this ticket owns.
- `packages/core/src/rank.ts` — `PRESET_ID = "ret/p2.raid-sim-skeleton"` is a
  module constant, commented *"Hashed and disclosed from one place, so the two
  cannot drift apart."* It must become per-spec without losing that property.
- `data/presets/` contains only `ret/`; `data/universes/` contains only
  `ret-p*.json`.
- `packages/core/src/candidate-gems.ts` and the EP weights are ret-tuned.

Whether each of these is "data, not code" is exactly what the gate box asks.
`Deps` already carries `raidSimSkeleton`, `epWeights`, `gemPalette` and `pool`
as **data rather than ports** (§4, ADR-0019), which is the design that is
supposed to make this cheap.

## Spec disambiguation

§5.2 makes spec identification talent-tree plurality, **not** a `specName`
string — `CombatantInfo.specID` is 0 for every combatant on TBC Anniversary
logs seen so far (ticket 01). Feral adds a real difficulty ret does not have:
**feral tank and feral cat share a talent tree.** Plurality alone will not
separate them. §14's phrasing — *"a preset JSON plus the disambiguation
confidence field"* — is pointing at this. Decide and record how a low-confidence
classification surfaces rather than silently guessing cat.

## Gate boxes owned

> ☐ **feral shipped without a structural change to `rankUpgrades` or its seams**
> ☐ ≥3 real characters produce believable shortlists

The second box lands here because this is the only slice where more than one
spec exists — three characters across two specs is a stronger check than three
ret characters would be. "Believable" is a domain judgment: run the
`sme-rank-review` skill on the shortlists, per AGENTS.md, audience the
engineering team (gate and bugs), not player loot advice.

Note the scope limit already recorded for the Phase 1 human-check box: wowsims
has no ret P3 set. Check what curated feral sets exist upstream **before**
promising a comparison basis, and record the limit either way.

## Testing

No new seam. If feral appears to need a fourth port, that is the gate failing —
AGENTS.md § Testing: *"Do not introduce a fourth port without agreeing it
first."*

## Done when

- Feral cat produces a ranking through the same `rankUpgrades` entry point.
- Spec disambiguation handles the cat/tank ambiguity with a stated confidence
  behaviour.
- Both gate boxes closed, or the structural change feral forced is written down
  and Phase 3 is blocked on fixing the seam.
- `pnpm verify` green; review at `docs/reviews/phase-2-feral.md`.
