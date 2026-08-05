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

## The candidate universe, and why it is the sharpest part of this ticket

Feral needs a `data/universes/feral-p*.json`, which means running
`scripts/assemble_universe.py`. **That script is ret-hardcoded in at least
seven independent places**, found by inspection:

| what | where |
|---|---|
| `CLASS_PALADIN = 2`, gating `classAllowlist` | `assemble_universe.py:152` |
| `EP_WEIGHTS` → `data/presets/ret/p2.ep-weights.json` | `:25` |
| `WOWSIMS_GEAR_SETS` → three `vendor/wowsims/ret_*.gear.json` | `:35–37` |
| `TWO_HOP` → `data/two-hop/ret-tokens.json` | `:39` |
| `SUNMOTE_UPGRADES` → `data/two-hop/ret-sunmote-upgrades.json` | `:43` |
| `WOWHEAD_DIR` → `data/wowhead-lists/ret` | `:45` |
| `RET_TIER_PIECE_IDS`, and `"spec": "ret"` stamped into the payload | `:104`, `:910` |

Plus `ret_eligible_d7()` (`:198`), whose name is honest about its scope.

**This is a spec-coupling surface the gate box does not currently name.** §14's
box asks only about *"`rankUpgrades` or its seams"*, and the generator is
neither — it is a build-time script that produces one of the `Deps` data
fields. So it is possible to pass the gate box as written while the pipeline
that *feeds* the engine turns out to be substantially spec-coupled.

Do not paper over that. Two things this ticket owes:

1. **Report the generator's coupling separately from the gate box.** If
   `rankUpgrades` and the seams are untouched but `assemble_universe.py` needed
   a parameterisation pass, say exactly that — the box is legitimately checked
   and the finding is still real. Ret's own tier/token/Wowhead data is
   genuinely per-spec input, so *some* of this is expected and fine; what
   matters is whether the **logic** needed changes or only the **paths** did.
2. **Feral is additive to `data/universes/`.** Adding `feral-p*.json` is in
   scope. **Re-generating or editing the existing `ret-p*.json` is not** — those
   bytes must be unchanged at the end of this branch (`git diff --stat` on that
   directory shows additions only). If a generator change moves a ret byte,
   stop and report it: per AGENTS.md § Durable claims, a committed generated
   artifact must be regenerable from committed sources with the pinned
   toolchain, so a silent ret drift here is a real defect, not noise.

Ticket 17's phase-1 pre-raid / heroic-dungeon remainder stays out of scope
regardless — it is about which items belong in the **ret** universes.

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
- `data/universes/feral-p*.json` exists, generated by the pinned toolchain from
  committed sources, with the regen command recorded.
- **`git diff --stat data/universes/` shows additions only** — no `ret-p*.json`
  byte moved.
- The generator's spec-coupling is reported: which of the seven hard-codings
  needed **logic** changes vs only **path** parameterisation.
- Both gate boxes closed, or the structural change feral forced is written down
  and Phase 3 is blocked on fixing the seam.
- `pnpm verify` green; review at `docs/reviews/phase-2-feral.md`.
