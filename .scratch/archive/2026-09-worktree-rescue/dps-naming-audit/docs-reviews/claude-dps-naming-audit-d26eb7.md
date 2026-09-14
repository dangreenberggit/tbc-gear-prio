# Pre-merge review — claude/dps-naming-audit-d26eb7

Reviewed range: `9e0a637c0216a17ba9e6ca2aa9765ccec55a15f7..02b3bb30239ae388f7f985298a241be4a721df52`

Dispatch note: round 1. `codex` not on PATH → fresh review-lane subagents (Claude
Code Opus, effort medium) for all three axes in one parallel batch. This is the
harness's review lane, not a downgrade.

Scope reminder for reviewers: this branch is a **pure rename** neutralizing
DPS-baked names to `metric` vocabulary in `packages/core`; the fork engine copy
(gitignored `vendor/`) is out of scope and absent from this worktree, so vendor-gated
checks and the fork-parity test cannot run here.

## Adversarial

**No defects found.** The branch holds up as a pure rename plus one correct cache guard.

- **Guards sound** (`rank.ts`): both use `Number.isFinite`, not truthiness —
  `readCachedSim` (rank.ts:1957) misses iff `!Number.isFinite(cached.value)`; the
  `ranking:` read (rank.ts:784) serves the cache only if
  `Number.isFinite(cached.baseline.value)`. A real `0` DPS, negative delta, or any
  finite value passes, so no legitimate new-shape hit is dropped. Miss-only confirmed:
  neither guard mutates/patches/writes back; recompute re-`put`s the key. Cannot
  produce a wrong number — it forces a fresh sim.
- **Guard test is real, not theatre** (`rank.test.ts`): `LegacyShapeStore` synthesises
  the pre-rename shape on read (keys match the real `simStoreKey`/`rankingCacheKey`),
  drives the miss path through public `rankUpgrades`, asserts `sim.runs` strictly
  increased after `armLegacy()` (genuine recompute) and the baseline stays finite/equal.
- **No silent `.dps`→undefined leak** (`git grep`): zero residual renamed identifiers in
  src+test. The three surviving `.dps` reads (`cli-sim-runner.ts:73-74`,
  `int-mechanism-support.ts`, `measure-int-mechanism.ts`) are upstream `raidMetrics.dps`
  / a separate local record type — correctly left. The fixture key `baselineDps` and its
  `measure-*.ts` consumers are a disjoint serialized field, internally consistent.
- **Fixture/artifact rewrites clean**: `synthetic-roster-recordings.json` 957 `dps`→957
  `value`, values byte-identical; both `.scratch/` artifacts key-only, no value/non-key
  content changed.
- **Working tree:** one untracked file, `docs/reviews/claude-dps-naming-audit-d26eb7.md`
  (this review's own doc) — left as found.

Unexamined: full `tsc`/test run (brief forbids a build; completeness verified by grep,
not compile); `view.ts`/`set-value.ts`/`plausibility.ts`/`rank-report-rules.ts` internals
spot-checked via the identifier sweep, not line-by-line (no cache/JSON boundary there, so
the silent-NaN risk doesn't apply).

## Domain

**Verdict: no domain contradiction found.** Faithful names-only rename; every
game-domain number the brief flagged is preserved.

- **Cutoff / noise-floor — all numbers intact.** `cutoff.ts`: `absValue: 3.4` (ret),
  `absValue: 3.6` (feral), `pct: 0.15`, `setBonusNoiseFloorMetric = Math.SQRT2 *
cutoff.absValue`, derivation comments (2×1.678, 2×1.774, ≈4.81/≈5.09) all unchanged.
  Numeric literals removed-vs-added across `src` balance. Matches verification-log
  R5/cutoff-derivation.
- **Committed artifacts — keys only, values bit-identical.** Extracted `dev:` and
  `HEAD:` copies of both artifacts, normalized the six renamed keys, deep-compared:
  `normalized(old) == new` True for both. No measured DPS/baseline/delta/SE moved;
  ticket-118 acceptance preserved.
- **User-facing "DPS" copy still says DPS.** `ResultRow.tsx` renders `... " dps"`;
  `cli.ts` prints `DPS`/`%`; `rank-report.ts` keeps `<span class="unit">DPS</span>` and
  the DPS-threshold tooltip. No new user-facing string literal containing "metric". The
  reader is never told the number is a generic "metric".
- **No non-DPS objective implied as live.** The only new "objective" text is the honest
  `cutoff.ts` comment that a non-DPS objective must re-derive the floor. No
  `hps|tmi|healing|threat` copy added.
- **Cache-shape guard is domain-neutral** — treats a pre-rename blob as a miss and
  re-sims; no game semantic, cutoff, or slot mapping touched.
- **New WCL assumptions: none.** Slot mapping (R17), enchant namespace (R19), race (R8),
  spec classification, `currentPhase` sourcing all untouched.

Unexamined: the ~35 test/measure files + `synthetic-roster-recordings.json` (mechanical
fixture renames, no game-domain claim; a value drift would show as the key-vs-value diff
already proven absent in the two shipped artifacts); `view.ts`/`plausibility.ts`/`caps.ts`/
`dead-slots.ts`/`rank-report-rules.ts` scanned for numeric/objective-claim changes (none),
not line-by-line.

Environment note (not a diff finding): the shared scratchpad held `rename-compounds.sh`
and `old-*/new-*.json` from another agent's work — left untouched; no tree-changing git
command run.

## Standards + Spec

### Standards axis

Commands: `git diff dev...HEAD` per file; `grep -E '^\+' | grep -E '[Dd]ps'` over
`packages/core/src` (no residual code identifiers). Standards read: root `AGENTS.md`
(+ @-included writing-style rules), CLAUDE.md.

**Verdict: clean. No hard violations. Two minor judgement notes, both defensible.**

Documented-standard checks all pass:

- **Comment policy** — the two new guard comment blocks (rank.ts ~781, ~1955) are
  why-not-what, state the "miss-only, never write back" constraint, cite OQ1.
  Exemplary.
- **Vocabulary consistency** — `metric`/`Metric`/`MetricSample` for types/fields,
  `.value` for the sample payload; `SimObservation.dps`→`value`. Correctly NOT
  renamed: `raidMetrics?.dps?.avg` (wowsims wire field). `Cutoff.absValue` (not
  `absMetric`) with a comment that it is a DPS-unit number today — avoids a
  Mysterious Name that would over-claim neutrality. User-facing "DPS" unit labels
  kept. No synonym drift (no stray `Value`/`Score`/`Amount` mixed with `Metric`).
- **Testing** — OQ1 guard tested at `rankUpgrades` through a `LegacyShapeStore` (the
  correct seam, not a stage internal).

Baseline smells (judgement calls, would not block):

- **S1 — Duplicated Code (minor):** the two shape guards use near-identical
  non-finite-field logic on two blob types (`Ranking` vs `SimObservation`). Not worth
  extracting — different fields on different types, each inline at its own cache read.
- Mysterious Name — none introduced; every new name reads as well as or better than
  its `dps` predecessor.

Cache-shape guard verdict: sound. The field rename doesn't change `content-hash.ts`
inputs, so a stale blob keeps its key with a now-missing field — exactly the silent-NaN
hazard the guard closes. Miss-only, no write-back, recompute re-`put`s the new shape.
Standards-correct (no hash bump, no legacy migration), covered by a test at the right
seam. Nothing to change.

### Spec axis

**Verdict: PASS.** No findings in any of the three categories. Faithfully executes the
rev-3/rev-4 plan.

- **(a) Missing/partial — none.** Grep over `packages/core/src` (excl. `proto/**`) for
  every mapped-away name returns empty; every §2 symbol renamed to `metric` vocabulary.
  The 6 residual case-insensitive `dps` src hits are legitimate keeps (3× `raidMetrics.dps`
  upstream reads, 3× JSDoc "DPS spec" copy).
- **(b) Scope creep — none.** §3 files `cap-profile.ts`/`candidate-gems.ts` not in the
  diff; `caps.ts`'s only change is the C10-authorized structural `deltaDps`→`deltaMetric`
  reads (cap logic / `CONTRIBUTES_TO_DAMAGE` / `SURVIVAL_STATS` untouched);
  `IMPLEMENTED_IN_SIM` / weapon-DPS pseudo-stat untouched; upstream-shaped `.dps` reads
  kept; `ResultRow.tsx` keeps the `" dps"` label; `git diff --name-only` shows nothing
  outside the rev-4 manifest; the 3 `"baselineDps"` fixture keys retained.
- **(c) Implemented-but-wrong — none.** Both artifacts + the fixture rewrite key text
  only (non-key diff line set empty → no number moved); `cutoff.ts` keeps `3.4`/`3.6`/
  `0.15`/`Math.SQRT2` verbatim; OQ1 guard is miss-only at both sites (narrows an existing
  `if (cached)`, falls through to recompute, no mutation/write-back, finite-data behavior
  unchanged).

Note: this axis did not run `pnpm verify` (done-criterion 2 is confirmed by the executor
ledger + the check gate below); it covers spec conformance of the diff content only.

## Summary

All four axes clean. **No blocking or material findings.**

- Adversarial: no defects — guards verified `Number.isFinite` (not truthiness),
  miss-only, real test; no silent `.dps`→undefined leak; fixture/artifact rewrites
  value-clean.
- Domain: no contradiction — every cutoff number preserved; both artifacts deep-compared
  `normalized(old) == new`; user-facing "DPS" copy intact; no non-DPS objective implied
  live.
- Standards: clean, no hard violations; one minor Duplicated-Code judgement note (S1) the
  reviewer would not block on.
- Spec: PASS — every §2 symbol renamed, no scope creep, nothing implemented-but-wrong.

Worst issue within each axis: Adversarial — none; Domain — none; Standards — S1 (minor,
would-not-block); Spec — none.

**Carry-forward caveat (not a diff finding), for the merge decision:** the gitignored
fork engine copy (`vendor/tbc-new-fork/.../upgrades/engine/`) is absent from this worktree,
so the vendor-gated `*:check` scripts and `wowsims-fork-parity.test.ts` cannot run here.
The rename must be mirrored to (or the copy relationship resolved for) the fork copy in the
main checkout before/with merge — this is execution-report follow-up **F1**. Filed as a
carry-forward ticket below.

## Merge-gate check (`pnpm merge-to-dev --check-only`)

**Not green in this worktree — and it cannot be, for an environmental reason, not the
rename.** The gate runs `pnpm verify` and `die`s if it fails
(`scripts/merge_to_dev.py:107-109`); `pnpm verify` gets **green through
codegen/typecheck/lint/format** (after formatting this review doc — the one regression the
gate surfaced, now fixed) and then fails at `test` with **exactly the 10 pre-existing
vendor-ENOENT failures**: `pool-hardening` (2), `archetype-specs` (5), `synthetic-fixtures`
(3), each failing on a missing `vendor/wowsims/*.gear.json` input file because `vendor/` is
gitignored and absent here. Confirmed every one of the 10 is an `ENOENT` on a vendor gear
path (`ret_preraid`, `feral_preraid`, `hunter_p4_bm_2h_9p`, `rogue_p3`, `shadow_p3`,
`warrior_p5_arms`); zero rename-induced failures. The renamed `setBonusNoiseFloorMetric`
test passes.

**What this means for merge:** the gate must be run from the **main checkout** (where
`vendor/` is populated) — the same place ticket 338 must sync the fork copy. In this
worktree, typecheck/lint/format/codegen are green and the only red is the vendor-absent
test floor.

## Disposition

| ID  | Axis            | Disposition | Ticket / note                                                                                                                                                                                 |
| --- | --------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial     | wontfix     | No defect found — nothing to fix.                                                                                                                                                             |
| D1  | Domain          | wontfix     | No contradiction — nothing to fix.                                                                                                                                                            |
| S1  | Standards       | wontfix     | Duplicated shape-guard predicate across two blob types; reviewer would not block. Different fields on different types, each inline at its own cache read — extracting would hurt readability. |
| SP1 | Spec            | wontfix     | PASS — nothing to fix.                                                                                                                                                                        |
| F1  | (carry-forward) | defer       | Fork engine copy diverges; mirror the rename / resolve the copy relationship in the main checkout. `.scratch/carry-forward/issues/338-mirror-metric-rename-to-fork-engine-copy.md`            |
