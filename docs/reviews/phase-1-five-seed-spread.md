# Pre-merge review — phase-1/five-seed-spread

Diffed against: `dev...phase-1/five-seed-spread` (merge-base `6dccd17`, tip `fc9d5d6`)

75 commits, 228 files, 241k insertions — but the raw numbers mislead. The
hand-written surface is **61 files / ~8.3k lines**; the rest is generated
(`data/items/index.json`, `packages/core/src/proto/*`, palettes, universes).
Reviewers were given the extracted source diff and told not to line-read
generated artifacts.

**Dispatch.** `codex` is not on `PATH`, so all four axes ran as fresh subagents
on the sharp lane (Opus), each with no memory of writing the code. Adversarial
and Domain used `.agents/reviews/*.md`; Standards and Spec came from the
`code-review` skill, invoked unchanged.

> **Supersedes** the earlier review of this branch at tip `e50996f`, which
> predates the gem-optimizer, raid-scoped universe and gate-reconciliation work.
> All of that review's findings were dispositioned at the time; a copy is kept
> at `.scratch/pre-merge-p1/prior-review.md`.

## Adversarial

Six findings; one filed as critical, which I downgraded after failing to
reproduce the stated mechanism (A1).

- **A1 — meta socket filled by raw EP.** Reproduced: filling an empty meta
  socket picks **Swift Skyfire Diamond (25894)** over **Relentless Earthstorm
  Diamond (32409)**. The reviewer's proposed mechanism — that
  `metaDeficit(metaCtx.metaId, …)` scores candidates against the _worn_ meta —
  is real but is **not** what causes this: both gems return `ownDeficit: 0` on
  the probe set, so the tie-break is neutral and EP legitimately decides
  (9.84 vs 9.00). Patching the deficit call changed nothing (tried, reverted).
  The true cause is Domain's D1. **Not a land blocker; ticket 20.**
- **A2 — test theatre in `rank.test.ts`.** `candidateEquipmentForTest` is a
  hand-copy of production's swap path, and the tests assert the copy against
  itself. Worse, it calls `fillEmptyCandidateGems` with **four** arguments where
  production passes a fifth (`fillOptsForSwap`), so the `usedUnique` / `meta`
  feature — the headline change of commit `fb1488b` — is never exercised through
  `rankUpgrades`. This is why A1/D1 were invisible to the suite. **Ticket 22.**
- **A3 — sim failures silently swallowed.** `rank.ts` had a bare `catch {}`
  around the candidate sim. A one-slot item whose sim failed vanished from the
  ranking with no error, no counter, no disclosure. **Fixed.**
- **A4 — hard-coded universe counts are change-detectors.** `toBe(362)` /
  `toBe(238)` assert on a committed artifact and were each edited to match new
  output. A regression swapping 10 good items for 10 junk ones keeps the count.
  **Ticket 22.**
- **A5 — default `wowheadRecall` is the circular number.** Correct, and already
  documented in-code and in the verification log; `--hold-out-wowhead` exists and
  is used. Noted here rather than re-filed. **wontfix.**
- **A6 — float tie-break direction in the two fill functions.** Real but
  low-impact; both currently agree. **wontfix.**

Explicitly cleared after checking: `otherGemIds` double-counting is unreachable
from `rank.ts`; `simCacheKey` has no collision path; the 19→17 slot mapping is
name-keyed and throws on bad input; `packages/core/src` is pure apart from
`cli.ts`.

## Domain

Three findings, plus an unusually thorough "verified correct" list worth keeping
so these aren't re-litigated.

- **D1 — meta gem stats are effect-blind, so no meta can be ranked by EP.**
  The root cause behind A1, and better diagnosed: in `db.json` _every_ meta's
  stats array describes only incidental stats, never its effect. Relentless is
  `12 Agi` (its 3% crit damage invisible); Thundering Skyfire is **all zeros**.
  Ranking metas by EP is therefore meaningless in general, not just in the one
  case reproduced. Worth ~1–2% ret DPS on any head candidate reaching the
  empty-meta path. **Ticket 20.**
- **D2 — `CASTER_ONLY_STATS` contradicts the ret EP weights.**
  `assemble_universe.py:101` classifies stat 5 (`StatSpellDamage`) as
  caster-only, while `data/presets/ret/p2.ep-weights.json` prices it at `0.17`.
  Ret scales with spell power in 2.4.3. Harmless today (the filter only
  measures), but those counts are the input to ticket 18's go/no-go.
  **Appended to ticket 18 as a blocker.**
- **D3 — world-boss zone strings not canonicalised.** Terrorweave Tunic (30730,
  a Doomwalker drop) carries a third source attributing it to Doom Lord Kazzak in
  Hellfire Peninsula, because `parse_wowhead_source` does no zone normalisation
  where `parse_atlasloot` does. Introduced by this branch's world-boss change.
  Ranking unaffected; the "where do I get this" answer is wrong. **Ticket 21.**

Verified correct (high confidence, against vendored data): weapon eligibility
incl. the polearm/staff split; the leather/mail/plate armor rule with zero cloth
in body slots; librams-only ranged; all 7 Kael temp legendaries; the phase→raid
mapping incl. World Bosses at P1; all 18 meta activation conditions and the
compare-colour encoding; purple/orange/green matching; the 7 excluded JC
Dragon's Eye gems; tier set IDs 626/629/680 and 2pc/4pc thresholds; stat indices
and ret EP weights; the 19→17 mapping byte-for-byte against R17; `maxPhase`
provenance from the lock file; race defaulting and disclosure.

Flagged unverified: whether the pinned Go engine models the two P2 librams' proc
effects — both score EP 0, so the entire ranged ranking depends on it.

## Standards + Spec

### Standards

- **Comment policy** (AGENTS.md): four comments restate their code. **Fixed** in
  `stats.ts`; `pool.ts`'s keeps its load-bearing ADR pointer.
- **Durable claims** (AGENTS.md): a test comment asserted a live-wowsimcli result
  with no re-runnable command, and the universe-count comments made causal claims
  with no regen command. **Both fixed** — commands added.
- **Self-contained report claim was false.** `rank-report.ts` declared "one file,
  no build step" while loading Google Fonts over the network. **Fixed** — system
  font stacks; the report now renders identically offline, which matters in a
  project whose premise is offline determinism.
- **Smells (judgement calls):** duplicated pinned-fetch logic across three sync
  scripts; a `(palette, epWeightRecord, epWeights)` data clump with `EpWeights`
  declared twice; Feature Envy in `fillOptsForSwap`; slot names as bare `string`
  where `indexOf` returning `-1` silently drops a candidate; `void deps.store;
void deps.clock;`; `rank-report.ts` at 588 lines. **Deferred — ticket 24.**

### Spec

The Spec axis was explicitly asked to audit whether the nine gate boxes I had
just checked are honest. It supports five as written and challenges four.

- **S1 — two of three seams ship one adapter.** PLAN.md §5: _"Each seam below has
  two adapters that both actually get built, in Phase 1, and both actually get
  used."_ Shipped: `SimRunner` has two; `GearSource` has only
  `RecordedGearSource`; `Store` has only `MemoryStore`. By the plan's own test
  ("one adapter is a hypothetical seam"), two seams are unproven and every "runs
  offline from fixtures" claim is true but unfalsifiable. **Ticket 19** — too
  large for a review; `WclGearSource` is most of Phase 2's caching work.
- **S2 — box 8 checked against different values than the spec names.** The box
  said "run the same character at 1 and at 2". At those values the gem axis
  provably cannot move. **Accepted: PLAN.md amended** to "two `maxPhase` values"
  with the measurement and reasoning recorded inline, rather than checking the
  original wording on a technicality.
- **S3–S7 — spec drift:** `fullPool` unimplemented; `source: null` measured but
  not gated; `Deps` grew four fields beyond §4; per-tier universes replaced the
  single accumulating pool R2 argued for, with no ADR; `setBonusNote` emits a raw
  `setId` rather than an explanatory name. **Ticket 23.** (The reviewer also
  claimed the 2pc note string is malformed — that part is wrong; the branch
  correctly emits `(below 2)`.)

Boxes the Spec axis affirms: seed determinism — crediting the log for scoping it
to the seam rather than claiming binary determinism — offline-from-fixtures, the
five-seed spread and cutoff derivation, and the slot mapping, which it calls the
best-evidenced box on the list.

On box 2 it agrees the Wowhead substitution is legitimate (§8.3 predicted wowsims
would stop at P2, and the box lists three alternatives) and credits
`--hold-out-wowhead` as good practice, but makes a fair criticism: **the "0
absent" headline is the circular number**, and the denominator narrowed
123 → 21 → 14 across three log entries. Each narrowing is defensible, but the
honest single headline is **15/21 held-out Best-family**, not 14/14. Accepted.

## Summary

Four axes, 18 distinct findings. **No land blocker survived verification** — the
one finding filed as critical reproduces, but not for the stated reason, and the
real cause (D1) is a modelling limitation rather than a code defect.

Fixed in this review: the silent sim-failure swallow (A3), the false
self-contained claim in the HTML report, and two documented-standard breaches.

The two findings I take most seriously are **S1** (two seams have one adapter, so
the offline claim is unfalsifiable) and **A2** (the test helper duplicates
production and omits the argument carrying this branch's headline feature).
Neither breaks a shipped number today; both weaken the evidence behind boxes I
checked, and both are ticketed.

Phase 1's gate stands, with box 8's wording amended to match what the data can
demonstrate.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                        |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/20-meta-gem-ep-model-blind-to-proc-effects.md` — reproduced; severity downgraded, mechanism corrected |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/22-rank-test-duplicates-production-swap.md`                                                           |
| A3  | Adversarial | fixed       | Skipped candidates now recorded as `Substitution` rows instead of a bare `catch {}`                                                  |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/22-rank-test-duplicates-production-swap.md`                                                           |
| A5  | Adversarial | wontfix     | Already documented in-code and in the log; `--hold-out-wowhead` is the answer and is used                                            |
| A6  | Adversarial | wontfix     | Float tie-break nit; both functions currently agree                                                                                  |
| D1  | Domain      | defer       | `.scratch/carry-forward/issues/20-meta-gem-ep-model-blind-to-proc-effects.md`                                                        |
| D2  | Domain      | defer       | Appended as a blocker to `.scratch/carry-forward/issues/18-universe-recall-measurement.md`                                           |
| D3  | Domain      | defer       | `.scratch/carry-forward/issues/21-world-boss-zone-strings-not-canonicalised.md`                                                      |
| ST1 | Standards   | fixed       | `stats.ts` restating comment deleted                                                                                                 |
| ST2 | Standards   | fixed       | Durable-claim commands added in `candidate-gems.test.ts` and `pool-hardening.test.ts`                                                |
| ST3 | Standards   | fixed       | Google Fonts removed from `rank-report.ts`; system stacks, genuinely self-contained                                                  |
| ST4 | Standards   | defer       | `.scratch/carry-forward/issues/24-standards-smells-cleanup.md`                                                                       |
| S1  | Spec        | defer       | `.scratch/carry-forward/issues/19-second-adapter-gear-source-store.md`                                                               |
| S2  | Spec        | fixed       | PLAN.md §14 box 8 amended to "two `maxPhase` values" with reasoning recorded                                                         |
| S3  | Spec        | defer       | `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md`                                                         |
| S4  | Spec        | defer       | `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md`                                                         |
| S5  | Spec        | defer       | `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md`                                                         |
| S6  | Spec        | defer       | `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md`                                                         |
| S7  | Spec        | defer       | `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md` — partially wrong as filed; `(below 2)` is correct      |
