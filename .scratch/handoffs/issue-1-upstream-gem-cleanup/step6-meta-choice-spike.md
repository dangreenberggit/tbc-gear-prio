# Spike: how should the meta gem be chosen for non-ret specs? (README step 6)

Status: design note, no code change. Produced by the delegator during the issue-1 fan-out.

## Problem

`PREFERRED_META_IDS = [32409]` in `packages/core/src/candidate-gems.ts` hardcodes Relentless Earthstorm Diamond. Correct for ret; silently wrong for every other spec. The doc comment above it already establishes the structural fact that makes this hard: **stat EP cannot rank meta gems** — nine of eighteen TBC metas score 0.00 against stat weights, and multiplicative effects (crit damage, spell damage %) invert the ordering that additive EP produces. So "just score them" is not on the table, for any spec.

## Options considered

1. **Per-spec preferred-meta table, sourced from upstream wowsims gear presets.** Extend the constant to `SPEC_PREFERRED_METAS: Record<DetectedSpecId, readonly number[]>`. The evidence procedure is the one already used for ret: read the meta socketed in upstream's presets for that spec (`ui/<class>/<spec>/gear_sets/`, preraid/p1/p2), stamped "as of `wowsims/tbc-new` @ v0.0.101 (`8aa378b3`)". Specs with **no entry** must fail loudly at the disclosure layer — keep the worn meta, never fill/substitute a meta, and disclose "no meta preference recorded for <spec>" — rather than inheriting ret's gem.
2. **Sim-based A/B of candidate metas per character.** Rejected: contradicts PLAN.md §9 (repair, not re-optimize), multiplies sim budget per ranking, and reintroduces the tie-noise problem for effects worth <1% dps.
3. **Hand-modelled EP extensions for meta effects** (e.g. value crit-damage multiplier from the character's crit). Rejected for now: per-character, non-constant (the existing comment derives 0.6%–2.4% swing by crit), and duplicates sim logic we deliberately don't own. Revisit only if option 1's presets disagree with community consensus for some spec.

## Recommendation

Option 1. It is the same epistemics we already accepted for ret, extended per spec, with fail-loud instead of silent-wrong for uncovered specs.

## Implementation item (for a future slice, not this branch)

- Thread the detected spec (`DetectedSpecId` from `spec.ts`) into `fillEmptyCandidateGems` / meta-repair's palette context.
- Replace `PREFERRED_META_IDS` with the per-spec table; keep ret's entry `[32409]` byte-identical in behavior (existing tests must not change).
- Feral entry: read upstream feral presets at the pin — do this *after* the re-pin, since the feral overhaul lives on `feature/backend-reforge`.
- Add the "no meta preference" disclosure path + test for a spec absent from the table.
- Activation stays deliberately unchecked (existing comment's rationale holds spec-independently).

## Implemented (2026-08-12, `ec56939`)

Option 1, with one finding from the local evidence pass that changed the shape:

- `SPEC_PREFERRED_METAS` (`packages/core/src/candidate-gems.ts`) keyed by
  `DetectedSpecId`, carrying `ret: [32409]`.
- **Feral got no entry, and none was expected.** The implementation item above
  said "read upstream feral presets at the pin". Doing so found that all five
  vendored feral presets wear Wolfshead Helm 8345 — no sockets, no meta. There
  is no feral meta to copy at the pin, so feral takes the fail-loud path.
  The re-pin this note anticipated will not change that unless the feral
  overhaul also changes the head choice.
- Fail-loud path: `missingMetaPreferenceNote`, surfaced through
  `substitutions` as `gems.meta-preference`. The meta socket is left as worn.
- The spec threads through `GemContext` and `FillEmptyOpts`. Absent spec keeps
  ret's entry, so ret's behaviour is byte-identical and no existing test moved.
- Activation stays unchecked, as this note argued.

Scope correction worth recording: this note assumed a table over specs
generally. `DetectedSpecId` is `"ret" | "feral" | "feral-tank"`, so the table
can only ever have three rows. The eight other specs in `meta-gem-research.md`
are unreachable from this code.
