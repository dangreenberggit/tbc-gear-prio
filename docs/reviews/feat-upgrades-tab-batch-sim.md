# Pre-merge review — feat/upgrades-tab-batch-sim

Reviewed range: `15541f8895409c6d898dc8e9bc539ac3fae6fcde..cf83e95decdcd683fbf82b68b09b27ad24375695`
Reviewed range: `cf83e95decdcd683fbf82b68b09b27ad24375695..21d48b5` (fix round; fork `52679533f548..164fce593`)
Reviewed range: `21d48b5..2e2430d2c9c25fa1d2fa64464a94717b273687d1` (round-2 fix + tickets; fork `164fce593..7b736a0c2`)
Reviewed range: `2e2430d2c9c25fa1d2fa64464a94717b273687d1..e546443` (layout-gate red → measured diagnosis + default flip; fork `7b736a0c2..20dbb6f5d`)

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

## Round 4 (layout gate)

`pnpm merge-to-dev --check-only` went red at the layout gate's run check
(0 rows in 120s; all layout assertions passing). A diagnosis seat
distinguished latency from crash by measurement: a headless run with
console/exception capture showed zero errors and live progress
("Simming 1/325…") for 200s — the bulk branch cannot stream a row before
the whole screening pass completes, and a 25-candidate WASM chunk costs
332s against the loop's ~40s first row (HTTP: 9.35s — a ~35x transport
gap). Fix: `makeSimRunner` defaults bulk screening to the HTTP transport
only; WASM keeps the streaming per-candidate loop, `BulkWasmSimRunner`
stays constructible, and load-bearing comments cite the measured numbers
with ticket 346 as the revisit trigger (the smaller-chunks alternative is
recorded there as estimate, untested — per-chunk baseline probes make it
costlier). This is the written justification owner constraint 3 requires
for the WASM default. Layout gate re-run green (37 assertions);
`merge-to-dev --check-only` ok; `pnpm verify` green. Fork `20dbb6f5d`,
outer `ecaa3f3` + `e546443`. No engine files touched (no PROVENANCE
cycle needed); the interface tests assert runners directly and were
unaffected.

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
engine-file edits. Deferred work was fully ticketed: 345, 346, 347, 348, 349. **347 and 349 have since been closed on this branch** (fork
`80395e68c`) — Stop now aborts the in-flight screening chunk on both
transports, a chunk failure degrades to the per-candidate loop, and every
built chunk is checked against upstream's own estimator for the
single-stage path. The rows below are updated accordingly. **345 and 348
have since been closed as well** — 345 by the WASM route-equivalence
campaign (30/30 overlap, 0 flips, against a seed control at 79% with 8
flips) and 348 into 346 as an accuracy-mismatch artifact (route slope
0.99919 ± 0.00019 against a null of 0.94170 ± 0.00935). **346 is measured
and answered**, and stays open only for the owner's decision on whether
to flip the WASM bulk default.

## Disposition

| ID    | Axis               | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1/D1 | Adversarial+Domain | fixed       | screened deltas differenced against their own run's baseline (fork `164fce593`); offset later shown to be a seed artifact, fix correct either way                                                                                                                                                                                                                                                             |
| A2/P1 | Adversarial+Spec   | fixed       | real `rankUpgrades` bulk/loop same-fixture test, red under the A1 bug (outer `21d48b5`); set-bonus assertions added in `e35fae9`                                                                                                                                                                                                                                                                              |
| A3/P4 | Adversarial+Spec   | fixed       | dead check removed, comment corrected (fork `164fce593`); superseded in this round — the cancel wiring landed (ticket 347 closed by this branch, fork `80395e68c`): the caller's `AbortSignal` now reaches both runners through the shared chunk driver                                                                                                                                                       |
| A4    | Adversarial        | fixed       | shared `attemptEligibility` guard, behavior-preserving (`unmapped` keeps the loop's throw) — fork `164fce593`                                                                                                                                                                                                                                                                                                 |
| A5    | Adversarial        | fixed       | `screen:`-prefixed cache namespace; round-2 reviewer verified bulk numbers cannot reach `readCachedSim`/replication                                                                                                                                                                                                                                                                                           |
| A6    | Adversarial        | fixed       | unreadable localStorage → `undefined` → no bulk capability (fork `164fce593`)                                                                                                                                                                                                                                                                                                                                 |
| A7/D3 | Adversarial+Domain | fixed       | `BulkScreenRequest.seed` added to the seam and threaded; no literal `'11'` remains; seed included in the bulk cache key                                                                                                                                                                                                                                                                                       |
| D2    | Domain             | fixed       | comments corrected to the `shouldUseLegacyBulkSim` mechanism and measured 32/33 flip (fork `164fce593`)                                                                                                                                                                                                                                                                                                       |
| D5    | Domain             | fixed       | superseded in this round: ticket 349 closed by this branch (fork `80395e68c`). The bound is now validated at every iteration count up to 1,000,000 — 25 and 26 are single-stage at all of them — and `assertSingleStageChunk` checks each built chunk against upstream's own estimator                                                                                                                        |
| S1/D4 | Standards+Domain   | fixed       | "no bulk RPC" comment corrected (fork `164fce593`)                                                                                                                                                                                                                                                                                                                                                            |
| S2    | Standards          | fixed       | `DEFAULT_ITERATIONS` why-comment citing the owner decision (fork `164fce593`)                                                                                                                                                                                                                                                                                                                                 |
| S3    | Standards          | fixed       | superseded by the shared driver (`adapters/bulk_screen_driver.ts`, fork `80395e68c`). The cancel rework changed the calculus the `wontfix` rested on: cancel and chunk-failure handling are behaviour the two transports must not differ on, so the loop moved rather than being duplicated a second time                                                                                                     |
| S4    | Standards          | fixed       | resolved by A5's `screen:` namespace — `bulkScreenCacheKey` now has a production caller                                                                                                                                                                                                                                                                                                                       |
| S5    | Standards          | wontfix     | `composeForBulk` stays beside `composeFor` in `rank.ts`; it is exercised by the new interface test, and moving it would widen the diff for placement alone — revisit with S3 if the bulk surface grows                                                                                                                                                                                                        |
| P5    | Spec               | fixed       | superseded in this round: ticket 347 closed by this branch (fork `80395e68c`). A chunk that fails for an engine or transport reason degrades to per-candidate simming and is disclosed as `Ranking.screeningFallbacks`; the two integrity checks are exempt and surface as `BulkScreenIntegrityError`                                                                                                         |
| R2-1  | Round-2            | fixed       | invariant documented, test extended with anti-vacuity guards, prescribed re-base empirically refuted (fork `7b736a0c2`, outer `e35fae9`)                                                                                                                                                                                                                                                                      |
| R2-2  | Round-2            | fixed       | Superseded in the batch-sim-followups Track B campaign: ticket 348 measured at matched iterations (8,000 pinned, verified per sim) and the slope did NOT reproduce — route slope 1.00022 ± 0.00011 on WASM and 1.00000 on HTTP, against null slopes of 0.94281 and 0.99955 that show the test resolves a real seed effect. Closed into 346 as an accuracy-mismatch artifact, exactly as this row anticipated. |

Related open tickets from execution (not review findings): 345
(equivalence condition (c) metric granularity), 346 (bulk 1.6× wall-clock
on WASM at unmatched accuracy).

## Round 5 (follow-up tickets 345–349)

Reviewed range: `4d5bcbcc0a75067f01887304716e20bb8b0a58d5..abfb37c60a9de5c80a97b226086497f1f897565c` (fork `20dbb6f5d..6d0edd69d`)

Dispatch: three fresh Opus axes (adversarial, domain, standards+spec)
over the follow-up range — Track A (tickets 347/349: shared
`bulk_screen_driver.ts`, `assertSingleStageChunk`, seam additions,
`screeningFallbacks`) and Track B (the measurement campaign for
345/346/348: `tools/equiv-campaign.mts`, evidence, closures). The round
ran against `bede3e4`; the fix commits (`abfb37c` outer, `6d0edd69d`
fork) were verified by the fix seat's mutation checks (reverting the
guard's error class fails both new assertions).

Adversarial: driver and tests sound (per-chunk signals + `userAborted`
flag close every ordering traced; no listener/unregister leak; none of
the three new suites can pass with the feature disabled). A5-1
(material): `assertSingleStageChunk` threw a bare `Error`, so `rank.ts`
degraded a guard failure to the loop instead of surfacing it. A5-2
(minor): a synchronous pre-dispatch window where an abort could not
reach the engine. Domain: no blocking/material — the 25-bound was
re-derived on both engines, engine determinism is consistent with
per-iteration reseeding, cancel/degrade semantics have no TBC
consequence; three comment-level minors. Standards: commit bodies over
72 chars in most of the range's commits and 10 subjects over 50; one
stale Summary sentence. Spec: nothing missing beyond 346 (then in
flight), no scope creep.

Measured outcomes recorded on this range: 345 closed (WASM overlap
30/30 with 0 boundary flips against a seed control at 79% with 8
flips; (c') 202/202); 348 closed into 346 (route slope 0.99919 ±
0.00019 vs null 0.94170 ± 0.00935); 346 answered — at matched accuracy
bulk screening on WASM is 3.8× cheaper in total work (R_wall_s 0.262,
worst-case 0.282; R_iter_s 1.020 so the iteration wash holds) but the
first row lands at 3,399 s against the 120 s gate and end-to-end is
within 9%. 346 stays open only on the owner's default-flip decision.
Withdrawn finding on record: an early "routes numerically identical on
Go" claim was retracted when the harness was found to run every arm at
seed 11; fixed with a guard, re-run, and the claim replaced by the
measured control above.

| ID   | Axis        | Disposition | Ticket / note                                                                                                                                                                |
| ---- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A5-1 | Adversarial | fixed       | guard throws `BulkScreenIntegrityError`; boundary test asserts the type; `rankUpgrades` case trips the real guard and requires rejection (fork `6d0edd69d`, outer `abfb37c`) |
| A5-2 | Adversarial | fixed       | `userAborted` re-checked after signals register; window shown synchronous (comment) — fork `6d0edd69d`                                                                       |
| D5-1 | Domain      | fixed       | blast-radius comment in `bulk_wasm_sim_runner.ts` (fork `6d0edd69d`)                                                                                                         |
| D5-2 | Domain      | fixed       | `rank.ts` "first successful chunk's probe" (fork `6d0edd69d`)                                                                                                                |
| D5-3 | Domain      | wontfix     | pre-existing mixed-baseline `deltaPct` (~0.03 pp at the measured gap, two orders below the cutoff); noted so it is not rediscovered                                          |
| S5-1 | Standards   | wontfix     | commit-message wrapping/length on landed history: ledgers and tickets cite those SHAs, rewriting would break the evidence chain; complied with from the fix commits on       |
| S5-2 | Standards   | fixed       | Summary sentence corrected (outer `abfb37c`)                                                                                                                                 |
| P5-1 | Spec        | fixed       | superseded in round 5: 346 closed by owner decision (keep loop default)                                                                                                      |
