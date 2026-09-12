# 378 — Shape smells in the spec registry, deferred from its pre-merge review

Status: open
Filed: 2026-09-11
Origin: pre-merge review of `feat/spec-registry`, Standards axis
Formerly: 373 on feat/spec-registry, renumbered 2026-09-12 to clear a
collision with `fix/sim-header-null-assertion`'s own 373. Commit messages
on this branch still name the old number; see
`.scratch/stage-gate/ledger-consolidation-and-merge-train/merge-order.md`
§ Ticket renumber map.
See: `docs/reviews/feat-spec-registry.md`

## What

The Standards axis raised four judgement-call smells against the new
`packages/core/src/spec-registry.ts`. None is a correctness defect — the
adversarial, domain and spec axes all came back clean — and all four are
arguable against the shape three plan-review rounds deliberately settled. They
are recorded here rather than fixed on the branch.

Locate by grep, not line number — citations in this repo rot (ticket 368).

1. **Middle Man — `presetIdFor` in `packages/core/src/rank.ts`.** It is now pure
   delegation to `skeletonPresetIdFor`, and the doc comment above it
   ("Hashed and disclosed from one place…") describes the callee rather than
   the wrapper. Either inline it and move the comment, or state why the wrapper
   earns its keep.

2. **Divergent Change — `spec-registry.ts` owns four concerns.** Hit-rating
   constants, the two cutoff values, the preferred-meta constant, and the
   registry itself. `CUTOFF`/`CUTOFF_FERAL` and `PHYSICAL_HIT_*` change for
   reasons unrelated to adding a spec (a new five-seed spread; a wowsims
   mechanics change). The registry needs to *reference* them, not *define*
   them.

3. **Feature Envy — `preferredMetasFor` in `candidate-gems.ts`.** Its body reads
   `SPEC_REGISTRY` plus a hardcoded `feral-tank` branch, and its long doc
   comment is mostly about registry entries and `isSpecId`. Only the
   `feral-tank` branch is candidate-gems' own business.

4. **Repeated Switches — the untyped-boundary cascade appears three times.**
   `isSpecId(spec) ? SPEC_REGISTRY[spec].X : DEFAULT` in `cap-profile.ts`,
   `cutoff.ts` and `candidate-gems.ts`, each with a near-identical ~10-line
   comment restating the same rule. One shared helper, or one comment plus two
   pointers, would carry it.

Also noted, softer: `cutoff.ts` and `cap-profile.ts` re-export the moved
constants purely so existing import paths keep working. Real consumers exist
(`caps.ts`, and the two test files), so it is not dead code — but it is a
compatibility shim with no expiry note.

## Why deferred rather than fixed

The registry's shape was argued across three plan-review rounds. The leaf
constants sit in the registry precisely so the modules that used to own them
stop being per-spec edit sites — which is the point of the refactor. Re-cutting
that boundary immediately after merging would re-open a closed design question,
and the smells are judgement calls by the reviewing skill's own framing.

## Not claimed

Nobody has measured whether any of these four changes would leave the
add-a-spec cost at 4 hand-written sites. Item 2 in particular could easily
raise it again if the constants move back to modules that then need per-spec
rows. Check that before acting.

Item 1 is the cheapest and least contentious; it is the one to do first if only
one gets done.
