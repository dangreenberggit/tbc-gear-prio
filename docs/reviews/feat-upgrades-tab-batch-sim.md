# Pre-merge review — feat/upgrades-tab-batch-sim

Reviewed range: `15541f8895409c6d898dc8e9bc539ac3fae6fcde..cf83e95decdcd683fbf82b68b09b27ad24375695`
Reviewed range: `cf83e95decdcd683fbf82b68b09b27ad24375695..21d48b5` (fix round; fork `52679533f548..164fce593`)
Reviewed range: `21d48b5..2e2430d2c9c25fa1d2fa64464a94717b273687d1` (round-2 fix + tickets; fork `164fce593..7b736a0c2`)

Dispatch: four fresh Opus subagents (adversarial, domain, standards, spec —
`codex` not on PATH; Claude Code review lane). The fork-side diff
(`vendor/tbc-new-fork`, gitignored) was reviewed explicitly by every axis:
`git -C vendor/tbc-new-fork diff cab940cd6..52679533f548` (round 1) and
`..164fce593` / `..7b736a0c2` (later rounds). Round 3's diff is comments,
test assertions, PROVENANCE rows and two tickets; its substance was
verified by the round-2 reviewer's finding disposition plus the fix seat's
red/green mutation evidence (the prescribed re-base was implemented,
produced the predicted 4 × 65.32 DPS failure signature, and was removed) —
labeled as such rather than re-dispatched.

## Adversarial

Seven findings. A1 (blocking): screened deltas subtracted the per-candidate
loop's baseline while observations carried the bulk pass's own — the
bulk-returned `result.baseline` was computed, asserted non-null, threaded
through chunks, and discarded. A2 (blocking): `bulk-screen-branch.test.ts`
promised a `rankUpgrades`-through-recorded-adapters test and never called
`rankUpgrades` — the exact blind spot that let the earlier `composeForBulk`
database defect ship. A3 (material): the HTTP runner's pre-dispatch abort
check tested a freshly created signal (unconditionally false, dead code),
and no caller ever aborts either runner's `SimSignalManager`. A4
(material): `screenCandidates` reimplemented the pricing loop's guards with
divergent behavior (silent skip vs throw / `candidateSkips`). A5
(material): screened observations were never written to the sim cache, so
re-runs re-simmed everything. A6 (minor): unreadable/corrupt localStorage
silently converted a user's Off into the multi-worker default. A7 (minor):
`randomSeed: '11'` hard-coded in the builder, correct only while
`DEFAULT_SEEDS[0] === 11`; the seam could not express the seed.

## Domain

Five findings. D1 (blocking) independently confirmed A1 and sized it: a
~65 DPS baseline offset against the 3.4 DPS cutoff defeats the
below-cutoff gate for screened rows, selects replication membership from
corrupted deltas, and leaves every non-replicated row biased. (The offset
was later shown by measurement to be a seed artifact, not cross-engine —
the fix, differencing each observation against its own run's baseline, is
correct under either reading.) D2 (material): load-bearing comments
misstated the Go cull mechanism ("Medium at 26") — the operative gate is
`shouldUseLegacyBulkSim`, measured flip 32/33 at 5,000 iterations. D3
(material) = A7. D4 (minor) = the stale "there is no bulk RPC" comment. D5
(minor/unverified): the 25-candidate bound is validated only at ≤5,000
iterations and the boundary moves down as iterations rise. Positive
domain verdicts: the union `SimDatabase` is a pure lookup registry with no
cross-contamination path; chunking is TBC-slot-safe (attempts enumerated
per (item, slot) before partitioning); the cutoff needs no re-derivation
at 5,000 (ADR-0021 — an independent, deliberately coarse SE bar).

## Standards + Spec

Standards: two hard violations — the stale "no bulk RPC" comment this
branch's own doc flags as false (S1 = D4), and the undocumented rationale
for `DEFAULT_ITERATIONS` 3000→5000 (S2). Three judgment-call smells:
duplicated `runBulkScreen` loop across the two runners (S3), unused
`bulkScreenCacheKey` in production (S4 — now used by the `screen:` cache
namespace, resolving itself), `composeForBulk`'s database-union walk
living inside `rankUpgrades` (S5). Clean: line endings, commit messages,
test placement, PROVENANCE rows. Spec: P1 = A2 (the missing N1 test); P4 =
A3 (dead abort guard, contradicting local plan Step 2's text); P5:
chunk-level failure aborts the whole screening pass rather than degrading
to the loop (self-flagged in the web ledger, unticketed at the time).

## Round 2 (fix verification)

One material finding: set-bonus synergy arithmetic combined loop-scaled
`packageDeltaDps` with screened per-piece deltas via
`individualDeltasByItemId`, and the new test asserted nothing about
`setBonuses`. Resolution (round 3): the prescribed re-base was implemented
and **empirically refuted** — it injected exactly the predicted 4 × 65.32
DPS error, proving screened deltas (same-run differences) already cancel
the offset before storage. Code shipped unchanged apart from load-bearing
comments stating the invariant; the test gained set-bonus and
`rankableSetPotential` assertions with anti-vacuity guards (at the old
candidate cap, every bonus was `unmeasured` and the assertions would have
been green while testing nothing). A residual observation — a ~1.6%
multiplicative route difference confined to deep downgrades (slope
1.016 ± 0.002, intercept ≈ 0, robust to excluding replicated rows) —
became ticket 348.

## Summary

The branch routes the upgrades tab's screening pass through wowsims'
native bulk tournament on both transports (in-browser TS tournament on
web; `POST /bulkSimAsync` to the Go server locally), partitioned at 25
candidates per request — under both engines' measured 32/33 culling flip —
with the paired-seed replication final pass unchanged. Equivalence was
measured with pre-registered conditions on both transports (web: ρ=0.999,
identical top-8; local: all four conditions pass, and a loop-vs-loop seed
control showed the bulk route agrees with the loop better than the loop
agrees with itself across seeds). The review found two blocking defects
(wrong-baseline subtraction; test theatre), both fixed and mutation-
verified; four material defects fixed; the rest fixed or ticketed. Every
round ended with `pnpm verify` green and the PROVENANCE cycle run for
engine-file edits. Open deferred work is fully ticketed: 345, 346, 347,
348, 349.

## Disposition

| ID    | Axis               | Disposition | Ticket / note                                                                                                                                                                                                                 |
| ----- | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1/D1 | Adversarial+Domain | fixed       | screened deltas differenced against their own run's baseline (fork `164fce593`); offset later shown to be a seed artifact, fix correct either way                                                                             |
| A2/P1 | Adversarial+Spec   | fixed       | real `rankUpgrades` bulk/loop same-fixture test, red under the A1 bug (outer `21d48b5`); set-bonus assertions added in `e35fae9`                                                                                              |
| A3/P4 | Adversarial+Spec   | fixed       | dead check removed, comment corrected (fork `164fce593`); cancel wiring remains `.scratch/carry-forward/issues/347-stop-does-not-cancel-bulk-screening.md` — open, updated with this finding                                  |
| A4    | Adversarial        | fixed       | shared `attemptEligibility` guard, behavior-preserving (`unmapped` keeps the loop's throw) — fork `164fce593`                                                                                                                 |
| A5    | Adversarial        | fixed       | `screen:`-prefixed cache namespace; round-2 reviewer verified bulk numbers cannot reach `readCachedSim`/replication                                                                                                           |
| A6    | Adversarial        | fixed       | unreadable localStorage → `undefined` → no bulk capability (fork `164fce593`)                                                                                                                                                 |
| A7/D3 | Adversarial+Domain | fixed       | `BulkScreenRequest.seed` added to the seam and threaded; no literal `'11'` remains; seed included in the bulk cache key                                                                                                       |
| D2    | Domain             | fixed       | comments corrected to the `shouldUseLegacyBulkSim` mechanism and measured 32/33 flip (fork `164fce593`)                                                                                                                       |
| D5    | Domain             | defer       | `.scratch/carry-forward/issues/349-bulk-batch-bound-not-coupled-to-iterations.md` — bound validated only at ≤5,000 iterations                                                                                                 |
| S1/D4 | Standards+Domain   | fixed       | "no bulk RPC" comment corrected (fork `164fce593`)                                                                                                                                                                            |
| S2    | Standards          | fixed       | `DEFAULT_ITERATIONS` why-comment citing the owner decision (fork `164fce593`)                                                                                                                                                 |
| S3    | Standards          | wontfix     | duplicated runner loop accepted: the drift-prone pieces (builder, mapper, guards) are already shared; a template base over two ~30-line loops buys little against the coupling it adds — revisit if a third transport appears |
| S4    | Standards          | fixed       | resolved by A5's `screen:` namespace — `bulkScreenCacheKey` now has a production caller                                                                                                                                       |
| S5    | Standards          | wontfix     | `composeForBulk` stays beside `composeFor` in `rank.ts`; it is exercised by the new interface test, and moving it would widen the diff for placement alone — revisit with S3 if the bulk surface grows                        |
| P5    | Spec               | defer       | `.scratch/carry-forward/issues/347-stop-does-not-cancel-bulk-screening.md` — chunk-failure degradation rides with the cancel-path rework (same code region); noted in the ticket                                              |
| R2-1  | Round-2            | fixed       | invariant documented, test extended with anti-vacuity guards, prescribed re-base empirically refuted (fork `7b736a0c2`, outer `e35fae9`)                                                                                      |
| R2-2  | Round-2            | defer       | `.scratch/carry-forward/issues/348-bulk-loop-multiplicative-scale-on-deep-downgrades.md` — ~1.6% slope on deep downgrades, re-measure at matched iterations first (may close into 346)                                        |

Related open tickets from execution (not review findings): 345
(equivalence condition (c) metric granularity), 346 (bulk 1.6× wall-clock
on WASM at unmatched accuracy).
