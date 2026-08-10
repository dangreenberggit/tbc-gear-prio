# ADR-0022 — Each spec carries its own upstream buff defaults, and cross-spec DPS comparability is dropped

**Status:** accepted
**Date:** 2026-08-08
**Relates to:** PLAN.md §8.2 (design C, the RaidSimRequest skeleton)
**Tickets:** `.scratch/phase-2/issues/07-sim-defaults-diverge-from-wowsims.md`,
`.scratch/carry-forward/issues/72-import-a-user-supplied-wowsims-setup.md`
**Origin:** `scripts/build_feral_skeleton.py` copying ret's raid blocks

## Context

`build_feral_skeleton.py` built the feral skeleton by loading ret's and
overwriting the player. Its docstring justified keeping `raid.buffs`,
`raid.debuffs`, `parties[].buffs` and `encounter` on the grounds that they
"describe the FIGHT rather than the player and must match for the two specs to
be comparable at all."

The premise is false in the way that matters. `raid.buffs` and friends are not
properties of the fight — they are the raid composition standing next to the
player, and upstream sets them **per spec**, because the raid a feral cat is
assumed to be sitting in is not the raid a ret paladin is assumed to be sitting
in. Ret assumes `curseOfElements` and `thorns`; feral assumes
`ferociousInspiration: 2` (two other Beast Mastery hunters) and `giftOfArthas`.
Copying ret's made feral's raid match **neither** spec's upstream defaults, so
an absolute DPS number from our sim could not be checked against a wowsims
number the user produces in the browser — the obvious sanity check.

### Where the defaults actually live

Not in `presets.ts`, where `TALENTS` and `CONSUMABLES` were sourced. Both specs
set them in their `sim.ts` `defaults` block, by different routes:

| spec  | route                                                               |
| ----- | ------------------------------------------------------------------- |
| feral | inline `RaidBuffs.create({...})` etc. in `ui/druid/feralcat/sim.ts` |
| ret   | `Presets.DefaultRaidBuffs` → `ui/paladin/retribution/presets.ts`    |

Ret additionally respreads phase-specific settings in `P2_PLAYER_SETTINGS`.
Every row of the ticket's divergence table is accounted for by this difference,
including one the ticket misattributed — see below.

## Decision

**Source each spec's buff, debuff and individual-buff blocks from that spec's
own upstream defaults. Keep copying only `encounter`. Accept that absolute DPS
is no longer comparable across specs.**

The values are **extracted from upstream's TypeScript at build time**, not
hand-transcribed. `scripts/extract_sim_defaults.mjs` parses `sim.ts` with the
TypeScript compiler API and statically evaluates the literals into
`data/presets/feral/buff-defaults.json`, which `build_feral_skeleton.py` reads.

Parsing rather than executing, because `sim.ts` imports the whole upstream
`ui/` tree — widgets, SCSS, the lot — so importing it needs a full upstream
checkout. Parsing needs only the one file. The two spread helpers
(`defaultRaidBuffMajorDamageCooldowns()`,
`defaultExposeWeaknessSettings(Phase.PhaseN)`) are resolved by reading
`ui/core/proto_utils/utils.ts` the same way, so no upstream value is retyped
anywhere in this repo.

`ui/druid/feralcat/sim.ts` and `ui/core/proto_utils/utils.ts` are now pinned in
`sync_wowsims.py` `TRACKED`, so an upstream tag bump trips a checksum mismatch,
and `pnpm sim-defaults:check` independently fails if the committed JSON stops
matching the pinned source. Both were verified to fire by mutating each input.

This is deliberately _unlike_ `TALENTS` and `CONSUMABLES`, which remain
hand-ported constants in `build_feral_skeleton.py` and can still go stale
silently. Extending the extractor to cover them is carry-forward 73
(`.scratch/carry-forward/issues/73-extend-sim-defaults-extractor-to-talents-and-consumables.md`);
it was left out here to keep this change scoped to the ticket.

`encounter` keeps being copied, and this is now a checked claim rather than an
assumption: neither spec's `encounterPicker` sets any encounter or target
value — `showExecuteProportion` is UI-only — so there is no per-spec upstream
encounter block to diverge from.

### Cross-spec comparability is dropped deliberately

This is the thing the old copy existed to protect, so it needs stating plainly:
**a feral DPS number and a ret DPS number from this tool are no longer
comparable to each other.** They are each comparable to the same spec's wowsims
browser output, which is the comparison a user actually makes.

That trade is right on its own terms — nothing in this tool ranks a feral item
against a ret item, so the abandoned property had no consumer — and carry-forward
72 makes it unavoidable regardless. Once a user imports _their_ config, the raid
blocks are per-user, and no choice of defaults can hold comparability across two
specs configured by different people. Choosing ret's raid for feral bought a
property we do not use, at the cost of the one we do.

### The exposeWeakness row was not this bug

The ticket reads `exposeWeaknessHunterAgility: 1150` vs upstream `1080` as
ret-inheritance. It is not. `utils.ts:1317-1324` maps Phase1 → 1080 and
Phase2 → 1150, and feral's `sim.ts` spreads `defaultExposeWeaknessSettings(Phase.Phase1)`
with an **explicit Phase1 argument** while ret's `P2_PLAYER_SETTINGS` respreads
Phase2. So 1080 is feral's genuine upstream default and the value now shipped —
even though this repo is a P2 tool and 1150 is the P2 number.

Mirroring upstream wins over "correcting" it to P2: the point of this change is
that our number matches what the user's browser prints, and the browser prints 1080. Treat it as an upstream quirk to re-check on a tag bump, not as a bug to
fix locally. Fixing it locally would silently reintroduce exactly the class of
divergence this ADR removes.

### Rotation stays `TypeAPL`, and drums keeps both fields

Two loose ends the ticket asked to resolve as explicit decisions.

**`TypeAPL`, not the export's `TypeSimple`.** verification-log 2026-07-27
measured that the APL block — `prepullActions` especially — is what the Go sim
actually runs for ret, and that `type`+`simple` alone produces a different,
wrong DPS. Upstream offers feral both (`Presets.SIMPLE`, `Presets.APL`) and its
`sim.ts` default is `TypeSimple`, so this is a deliberate divergence from
upstream's default, not an artifact of the copy. It is the divergence that makes
our number correct rather than incorrect; the DPS-fidelity goal above does not
override running the rotation the sim honours.

**Both drums fields stay.** They are different fields, not a duplicate:
`common.proto:479` `PartyBuffs.drums` is what someone else in the party plays;
`common.proto:593` `ConsumesSpec.drums_id` is what this player plays. Upstream
feral sets both, at different strengths (`LesserDrumsOfBattle` party,
`GreaterDrumsOfBattle` consumable), and so do we.

## Consequences

- **Absolute feral DPS changes.** Every number moves; this is the intended
  effect and it is a level shift, not a reordering — see below.
- **Rankings should be unaffected.** A buff applied to baseline and every
  candidate alike shifts the whole list together. The exception the ticket
  flags — APL entries 7-10 gating sappers/trinkets/potions on
  `currentEnergy <= 30`, a non-uniform interaction with haste and crit — is
  untouched by this change and remains open.
- **Cached rankings are stale.** Any cache keyed on a content hash that does not
  cover the skeleton will serve pre-change numbers.
- **Adding a third spec now means sourcing its own `sim.ts` defaults**, not
  copying either existing skeleton.
- **A wowsims tag bump now fails loudly**, twice over: the `TRACKED` checksum
  and `pnpm sim-defaults:check`. Refreshing means re-running
  `pnpm sim-defaults:build` and `python scripts/build_feral_skeleton.py`, not
  re-reading upstream by eye.
- **An upstream shape change stops the build rather than corrupting it.** The
  extractor throws on anything it cannot statically resolve — a computed value,
  or `defaultExposeWeaknessSettings()` losing its explicit phase argument (it
  refuses to assume `CURRENT_PHASE`). Exit 2 with the offending expression, so
  the failure mode is a red build, never a silently wrong raid.
- **`scripts/*.mjs` is now a linted file class.** `eslint.config.js` gives it
  Node globals; `packages/core`'s purity rules are unaffected.
- **If carry-forward 72 lands**, these constants become the _fallback_ for a user
  who supplies no config, rather than the only raid definition.

## Alternatives considered

**Keep ret's blocks for comparability.** Rejected: the property has no consumer
in this tool, and carry-forward 72 destroys it regardless.

**Hand-transcribe the constants into `build_feral_skeleton.py`.** This is what
the first cut of this change did, on the reasoning that `TRACKED` fetches files
rather than expressions so there was "no upstream JSON to pin". That conflated
two things: pinning the file and extracting its values. The file is perfectly
pinnable, and the TypeScript compiler API — already a dependency — parses the
values out in ~200 lines without executing anything. Rejected once measured:
the extractor's output was byte-identical to the transcription, so the accuracy
argument was neutral and the drift-gate argument decided it.

**Execute upstream's TypeScript to read the exported values.** Rejected on
evidence: importing `sim.ts` fails on the first of many transitive imports into
the upstream `ui/` tree, so it needs a full upstream checkout and toolchain to
read four object literals.

**Normalise both specs onto a hand-built "neutral" raid.** Rejected: it restores
comparability by matching neither spec's browser output — the original bug, with
extra steps, and no upstream source to check against.

**Correct `exposeWeaknessHunterAgility` to the P2 value 1150.** Rejected above:
it re-diverges from the browser to chase an internal consistency no user checks.
