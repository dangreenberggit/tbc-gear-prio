# Pre-merge review — feat/spec-registry

Reviewed range: `624eb3c7302f8b72dfe9aae5a580c6e16cce520e..58d8d85483a6dbf1a8d7872c3d5a0f25ebf45c5e`

Dispatch note: `codex` is not on `PATH` in this environment, so all four axes
ran as fresh review-lane subagents (Claude Code: Opus at effort `medium`, per
`docs/agents/model-policy.md`). No wall was hit; the axes ran in parallel. None
of the reviewers wrote to the repo.

The branch is the execution half of a `stage-gate` run whose artifacts are in
`.scratch/stage-gate/spec-registry/` — brief, plan (revision 2), a three-round
plan review, the decision log, and the execution report. The plan was reviewed
adversarially **before any code existed**; this file reviews the diff after.

## What the branch does

Replaces ~12 hand-written per-spec touch points with one registry —
`packages/core/src/spec-registry.ts` (typed, one annotated literal),
`spec-registry.json` (values shared with Python), and a generated
`spec-ids.generated.ts` — so that adding a spec becomes cheap. **No new spec was
added**; the deliverable is that adding one becomes cheap, demonstrated by the
11 existing specs routing through the registry unchanged.

13 commits, 25 files, one commit per green slice.

## Adversarial

**No findings.** Every claim the branch makes survived an attempt to break it
by execution rather than by reading.

- **Totality is real, not vacuous.** A scratchpad probe compiled with the
  repo's own tsc flags: omitting an entry gives
  `TS2741: Property 'warrior' is missing … required in type 'Readonly<Record<"balance"|…|"warrior", SpecEntry>>'`;
  omitting a field gives `TS2741: Property 'cutoff' is missing … required in type 'SpecEntry'`.
  No `as`, `satisfies`, `?.` or `??` launders the check on the registry path.
  This repo has twice shipped a vacuous assertion that "reads as rigour and
  proves nothing" (`AGENTS.md` § Types from JSON); the axis hunted for a third
  and did not find one.
- **Untyped boundary unchanged.** Runtime probe against the built dist with
  `SPEC_REGISTRY.warrior` deleted: a registered-but-missing entry **throws
  TypeError** from all three accessors, while an unregistered string degrades
  exactly as the old `??` did (ret's melee profile, `{absDps:3.4}`,
  `undefined`). Loud where it must be loud, unchanged where it was pinned.
- **The fidelity chain proves what it claims.** `f79e46d`'s two temporary tests
  compared the registry against the old tables **by reference**, with no
  hand-typed expectations, so a transcription slip could not agree with itself.
  The link carrying that proof forward is byte-identity, and it holds:
  `spec-registry.ts` is blob `7416a48` at `f79e46d`, `6698c23`, `6ae84e7`,
  `e6f956c`, `6354b9e`, `a0cb8aa` and `58d8d85`.
- **No test theatre.** `spec-registry.test.ts` asserts observable values; the
  retired fidelity tests were the strong ones.
- **Python half safe.** `SLUG_TO_FORK_SPEC` reads the same 11 pairs from JSON;
  `_ep_fields` always passing `ep_weights_by_phase` is identical to the old
  omission because feral's `byPhase` is empty and the constructor does `or {}`.

Environment note, not a finding: tool shells default to Node 20, where 16
suites fail with `No such built-in module: node:sqlite`. Under the pinned
22.17.1 — 65 files, **1289 tests passing**, rc 0.

## Domain

**No game fact changed value in the move.** Every field of all eleven entries
was compared against the pre-refactor tables at `624eb3c`.

- **Cap profiles** — all eleven `hitStat`/`hitCapPercent`/`ratingPerPercent`/
  `trackExpertise` and all ten `talentHit` blocks identical. The three
  "Precision"-style talents check out: ret Protection seg 1 idx 2 @1%/3, rogue
  Combat seg 1 idx 5 @1%/5, warrior Fury seg 1 idx 16 @1%/3; enh's seg 1 idx 16
  is Dual Wield Specialization @2%/3. Feral correctly still has no `talentHit`.
- **Cutoffs** — `3.4` general, `3.6` feral, still the only raised one, still
  justified by `docs/five-seed-spread-feral.json` against
  `docs/five-seed-spread.json`. The untested-nine debt note survived.
- **Meta gems** — identical to the old table; `32409` matches
  `docs/verification-log.md`. `feral-tank`, which the old table held as a key
  but a `Record<SpecId,…>` cannot, is preserved by an explicit branch ahead of
  the `isSpecId` guard.
- **Tree indices, class names, fork proto names, preset ids** — all eleven
  match, including the non-obvious `shadow → Priest` and `warrior → DpsWarrior`.

**D1 (low, pre-existing — comment, not value).** The `sitePath` doc comment
claimed the values follow "the fork's own `ui/<class>/<spec>/` layout". The
fork ships `ui/druid/feralcat`, not `ui/druid/feral`, so the stated rule is
wrong for the one spec the comment used as its example. The **value** is
byte-identical to the old `SPEC_PAGE` entry, so the branch shipped no wrong
URL — it carried an inaccurate comment across. Consequence was limited to a
reader adding a spec and trusting the stated rule. **Fixed on the branch.**

Unverified, not wrong: `spec-page.test.ts` covers only ret and warlock (a
nested path and a bare one). The other nine `sitePath` values are correct today
— checked by hand against `624eb3c` — but no surviving test gates them against
a future edit. Noted in ADR-0032 rather than left implicit.

No contradiction of `docs/stage0-findings.md` or `docs/verification-log.md`.
The registry touches no WCL field.

## Standards + Spec

### Standards

- **S1 — the file header duplicates ADR-0032 rather than pointing at it.**
  `AGENTS.md` § Comment policy allows "a pointer to the finding/ADR that forced
  the shape" — a pointer, not a restatement. The ~60-line header's
  "why no derived table" and "why accessors index directly" sections repeat the
  ADR's Q3 in substance.
- **S2 (soft)** — `cutoff.ts` and `cap-profile.ts` re-export the moved constants
  for import-path compatibility. Real consumers exist (`caps.ts` and two test
  files), so not dead — but a shim with no expiry note.
- **S3–S6 (judgement calls)** — Middle Man (`presetIdFor` is now pure
  delegation), Divergent Change (`spec-registry.ts` also defines the hit-rating
  constants, both cutoffs and the meta constant), Feature Envy
  (`preferredMetasFor`), Repeated Switches (the untyped-boundary cascade
  appears three times with near-identical comments).

Clean: generated-file handling, the JSON-is-values rule, `as const` handling,
direct unit tests of pure functions (explicitly permitted by § Testing), and
ADR-0032's causal claims each citing a re-runnable command (§ Durable claims).

### Spec

**No blocking findings.** Both spec documents are satisfied.

- **Q4 demonstrated, not asserted.** The axis re-ran the before/after grep
  itself and got 8 lines across 5 files, matching the ADR's pasted output.
  Notably the executor did **not** paste the plan's _projected_ 6 — it measured
  8 and explained both extras as second matches inside entries already counted.
  Counted as the brief asks ("places a human edits"): **12 → 4** hand-written
  sites plus one generated. That self-correction against the plan's own number
  is the opposite of an asserted figure.
- **Constraint 5** — verified by mechanism and by the byte-identity fidelity
  chain above.
- **Constraint 4** — satisfied; `spec-ids.generated.ts` is committed `as const`
  code from the generator, gated by `codegen:json-types:check`.
- **No scope creep.** Nothing under `vendor/`, no `items.ts` /
  `item-source-kinds.json` / `slots-table.json`, no `wowsims-fork.lock.json`,
  no ticket-376 files, no `AGENTS.md` / `CLAUDE.md` / `workflow.md` / skills.
  `spec-registry.json` holds exactly the 11 existing ids.
- **SP1 (nit)** — ADR-0032 said the fidelity tests carried "23 assertions". 23
  is the test-_case_ count; the executed `expect` count is 78. ADRs are durable
  claims, so the wording was corrected. **Fixed on the branch.**

## Summary

Four axes, and the two that hunt for defects — adversarial and domain-value —
came back clean, each having tried to break the branch's central claims by
execution rather than by reading. The registry's totality guarantee is proven
in three directions; the untyped boundary behaves exactly as before; no game
fact changed value across eleven specs.

Two findings were fixed here because both are defects in **durable claims**
rather than in code: a doc comment that stated a rule contradicted by the
fork's own directory layout (D1), and an ADR miscounting its own evidence
(SP1). Four shape smells are deferred to ticket 378 — they are judgement calls
against a file shape three plan-review rounds deliberately settled, and acting
on them now would re-open a closed design question at the worst moment.

The measured result: adding a spec goes from **12 hand-written sites to 4**,
with a missing entry now a compile error instead of a silent inheritance of
ret's numbers.

`pnpm verify` exits 2 at `equip-eligibility:check`, and `fork-lint:check` and
`meta-conditions:check` refuse the same way — all three the fork-clone-vs-pin
mismatch of **ticket 377**, proved pre-existing by stashing the work and
re-running at base for a byte-identical message. Everything the branch can move
is green.

## Disposition

| ID  | Axis             | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial      | wontfix     | No findings — totality, the untyped boundary, the fidelity chain, codegen sync and the Python half each proven by execution                                                                                                                                                                                                                                               |
| D1  | Domain           | fixed       | `sitePath` doc comment claimed the fork's `ui/` layout; the fork ships `ui/druid/feralcat`. Value was already correct and unchanged; comment rewritten to say these are the public wowsims.com routes                                                                                                                                                                     |
| D2  | Domain           | defer       | `.scratch/carry-forward/issues/378-spec-registry-shape-review-smells.md` — nine of eleven `sitePath` values are gated by no test; recorded in ADR-0032 and carried with the shape work                                                                                                                                                                                    |
| S1  | Standards + Spec | defer       | `.scratch/carry-forward/issues/378-spec-registry-shape-review-smells.md` — file header restates ADR-0032 instead of pointing at it                                                                                                                                                                                                                                        |
| S2  | Standards + Spec | defer       | `.scratch/carry-forward/issues/378-spec-registry-shape-review-smells.md` — re-export shim with no expiry note                                                                                                                                                                                                                                                             |
| S3  | Standards + Spec | defer       | `.scratch/carry-forward/issues/378-spec-registry-shape-review-smells.md` — Middle Man: `presetIdFor` is pure delegation                                                                                                                                                                                                                                                   |
| S4  | Standards + Spec | defer       | `.scratch/carry-forward/issues/378-spec-registry-shape-review-smells.md` — Divergent Change: registry also defines the leaf constants                                                                                                                                                                                                                                     |
| S5  | Standards + Spec | defer       | `.scratch/carry-forward/issues/378-spec-registry-shape-review-smells.md` — Feature Envy: `preferredMetasFor`                                                                                                                                                                                                                                                              |
| S6  | Standards + Spec | defer       | `.scratch/carry-forward/issues/378-spec-registry-shape-review-smells.md` — Repeated Switches: the untyped-boundary cascade appears three times                                                                                                                                                                                                                            |
| SP1 | Standards + Spec | fixed       | ADR-0032 said "23 assertions" for what is 23 test cases / 78 executed `expect`s; corrected, since ADRs are durable claims                                                                                                                                                                                                                                                 |
| E1  | Environment      | wontfix     | `equip-eligibility` / `fork-lint` / `meta-conditions` refuse on the fork clone-vs-pin mismatch — pre-existing, ticket 377 (filed as 372, renumbered), out of scope by the brief. 377 is now **closed as an inverted diagnosis**: the clone was ahead of the pin, not behind it, and `dev` resolved the mismatch by moving the pin forward to `bbad1b8a4`. See the ticket. |
