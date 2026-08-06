Status: closed
Type: task
Origin: PLAN.md §14 Phase 2, §5.2, §5.4
Blocks: none
Blocked by: 04

# Feral cat — the second spec, and the real gate

**Closed 2026-08-06 on `phase-2/feral`.** Verdict in
[`../feral-gate-verdict.md`](../feral-gate-verdict.md), evidence in
[`../feral-coupling-audit.md`](../feral-coupling-audit.md).

- **Gate box "no structural change to `rankUpgrades` or its seams": PASS.**
  `seams/` and `compose.ts` are untouched; `rankUpgrades`, `Deps`, `RankInput`
  and `Ranking` are unchanged. `rank.ts` moved 20 lines to make `PRESET_ID`
  per-spec. `spec.ts` did change shape, which §14 anticipated in the words
  "plus the disambiguation confidence field".
- **Gate box "≥3 real characters produce believable shortlists": PARTIAL.**
  Three characters rank (slamaltman ret, shredzepelin and nexess feral).
  `sme-rank-review` returned **trust-with-caveats** and found a real defect,
  filed as carry-forward 41 — the ranged slot offers two items and the worn
  idol is not comparable. Ret has the same shape, so it is a standing pool
  property rather than a feral regression.
- **Generator coupling reported separately**, per this ticket: 6 of 7 named
  hard-codings were paths, `CLASS_PALADIN` and `ret_eligible_d7` were logic.
- Ret universes regenerate byte-identically; `data/universes/` gained files
  only.

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

## Preconditions — settle these before writing code

Both verified 2026-08-05, and both gate work in this ticket rather than being
discovered mid-branch:

- **Two more character fixtures are needed and do not exist.** `test/fixtures/`
  holds only `slamaltman.raw.json`, so the "≥3 real characters" box below cannot
  close today. At least one must be feral, or the box proves nothing about the
  second spec. Capturing them is in scope; record the capture command.
- **`vendor/` is gitignored** (`.gitignore:13`), so `WOWSIMS_GEAR_SETS` and any
  other `vendor/wowsims/*` input is absent on a fresh worktree. Restore with
  `pnpm sync:wowsims`, confirm the pin with `pnpm sync:wowsims:check`, and cite
  those rather than asserting the files are present (AGENTS.md § Durable claims).

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

**A neighbouring gap this ticket does not own, but composes with:** nothing on
the resolution path calls `classifySpec` at all, so the engine can pick a fight
the character played in a *different* spec and sim it against the requested
spec's preset — ticket 04's first capture was a ret paladin's protection night,
scored as ret. That is
`.scratch/carry-forward/issues/40-fight-resolution-is-not-spec-aware.md`.

The two are the same question at two levels: 40 is "is this fight the spec you
asked for" (talent plurality, §5.4 level 1), this ticket is "which feral is it"
(form uptime, level 2). A druid can fail either. Whatever `confidence` shape
you land on here should be the one 40 reads — `FightSummary.confidence` is
currently decorative, and feral is the first thing that gives it meaning.

## Gate boxes owned

> ☐ **feral shipped without a structural change to `rankUpgrades` or its seams**
> ☐ ≥3 real characters produce believable shortlists

The second box lands here because this is the only slice where more than one
spec exists — three characters across two specs is a stronger check than three
ret characters would be. It needs the two extra fixtures named in
**Preconditions**. "Believable" is a domain judgment: run the `sme-rank-review`
skill on the shortlists, per AGENTS.md, audience the engineering team (gate and
bugs), not player loot advice.

Note the scope limit already recorded for the Phase 1 human-check box: wowsims
has no ret P3 set. Check what curated feral sets exist upstream **before**
promising a comparison basis, and record the limit either way.

## Testing

No new seam. If feral appears to need a fourth port, that is the gate failing —
AGENTS.md § Testing: *"Do not introduce a fourth port without agreeing it
first."*

## Done when

The deliverable is **a written verdict on the claim**, plus whatever code the
verdict required. A branch that concludes "feral needed a seam change", says
exactly which and why, and blocks Phase 3 is a *complete* ticket — the gate is a
measurement, and a negative result is a result.

- **Feral cat ranks through the same `rankUpgrades` entry point**, from a
  feral preset and a feral universe.
- **The cat/tank verdict is stated and implemented.** Feral tank and cat share a
  talent tree, so plurality cannot separate them; record what a low-confidence
  classification returns to the caller and what the caller shows for it.
- **`data/universes/feral-p*.json` is committed**, regenerable from committed
  sources with the pinned toolchain, with the regen command in the ticket.
- **`git diff --stat data/universes/` shows additions only.** A moved
  `ret-p*.json` byte is a reportable defect (AGENTS.md § Durable claims), so
  stop and write it up rather than absorbing it.
- **The generator's coupling is reported per hard-coding**: for each of the seven
  in the table above, whether feral needed a **logic** change or only a **path**
  parameterisation. This is separate from the gate box, which asks only about
  `rankUpgrades` and its seams — the box can legitimately pass while the
  generator turns out to be spec-coupled, and both facts get recorded.
- **Both gate boxes carry a verdict**, each either checked with its evidence or
  failed with the structural change named and Phase 3 blocked on it.
- `pnpm verify` green; `writing-for-agents` review applied to this ticket and to
  any doc this branch edits (AGENTS.md § Writing for agents);
  `sme-rank-review` run for the believable-shortlists box; `pre-merge-review`
  written to `docs/reviews/phase-2-feral.md`.
