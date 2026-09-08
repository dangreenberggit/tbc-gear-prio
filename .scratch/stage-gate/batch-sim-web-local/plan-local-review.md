# Round 2 (v2 plan): VERDICT — revise → RESOLVED by binding addenda

All 11 round-1 findings dispositioned **resolved**. New issues: **new-1 blocking** — `topResults` defaults to 5 (`index.ts:84`, `constants.ts:1`; Go `bulk_sim.go:86-88,12`) and truncates every chunk response independent of culling; the 340 harness sets `topResults = candidateCount` on every run (`harness/main.go:106-107,133`), which is the only reason the 212/212 measurement exists — the shared `buildBulkSimRequest` must set it. **new-2 material** — Go's second gate (`shouldUseLegacyBulkSim`, `estimate.go:7-18`) was unstated in C2, and C3's escalation rule was one-sided. **new-3 minor** — new-`engine/`-file PROVENANCE question deferred by both plans. Verified line-parallel Go/TS stage selection (`bulk_sim.go:130-135` = `index.ts:116-117`), so the shared-bound reasoning is sound; cross-plan name contract checks out. Disposition by the orchestrator: reviewer-specified fixes routed verbatim into plan-web.md (§ Round-2 conditions L-new-1, L-new-3) and plan-local.md (§ Round-2 conditions) as binding executor conditions; no further planning round.

---

# Round 1 (v1 plan), retained for the record

VERDICT: revise

## Summary

The plan is well-researched and its central engineering insight is real: the cull gate is 100, not 20, so per-slot bulk runs return every candidate — I re-read `stage.go` via the research citations and the harness table supports it. C1, C2, C4, C7, C9 and C12 all stand on re-check. But the plan fails on three independent grounds, any one of which would sink the executor.

First, the plan has **misread what `rankUpgrades` actually computes**. Its candidate list (`rank.ts:820-870`) is a flat EP-ordered pool with a `candidateCap` and a forced-include set of equipped items — it is *not* slot-partitioned, and slot is a per-candidate attribute (`BestSwap.slotIndex`), not a partition key. More seriously, the engine does not rank on absolute DPS at all: it computes `deltaDps` against a baseline and runs **paired-seed replication** over `DEFAULT_SEEDS = [11,22,33,44,55]` for the top N (`rank.ts:360, 832-834, 1071-1108`). The native bulk engine returns absolute `dpsMetrics` from a single internal seed schedule with its own per-slot baseline probe, and exposes no seed control. Steps 4 and 5 say "map `topResults[]` rows to the engine's `SimObservation` shape" as if this were a data reshape. It is not — it silently discards paired replication and substitutes 13 different baselines for one. No step in the plan acknowledges this, and C11 (ordering agreement) is *untested* and would not detect it, because the harness diff compares bulk-against-bulk, never bulk-against-`rankUpgrades`.

Second, **C8's mechanism is right but the plan's Step 4 design is unsound for the reason C8 does not cover**. I refuted the framing of the question rather than the claim: `isWasm()` needs no HTTP handler and cannot hang — it resolves from the worker's `ready` message (`worker_pool.ts:315`, `worker_interface.ts:65-67`), and the HTTP worker calls `.ready(false)` at `worker_http.ts:74`, so it resolves `false` deterministically. C8 stands. But *which script the worker loads* is decided by a **server-side URL rewrite**, not by the client: `SIM_WORKER_URL` is hardcoded to `/tbc/sim_worker.js` (`worker_pool.ts:32`) and `main.go:401-405` rewrites it to `net_worker.js`. On the vite dev server on 5173 — the documented dev path in `known-traps.md` — that rewrite never happens, so `isWasm()` returns **true** and the tab silently takes the WASM branch while a Go server sits on 3333. The plan's entire acceptance criterion for Step 4 is a live browser observation, and it will be run on exactly the configuration where detection gives the wrong answer.

Third, **the seam change in Step 2 breaks a deliberate decoupling**. `engine/seams/sim-runner.ts:12-21` states in a load-bearing comment that `RaidSimRequest` is `Readonly<Record<string, unknown>>` *specifically* so the engine does not depend on the fork's typed protos — the adapter bridges. Step 2 proposes `runBulkSlot?(req: BulkSimRequest, ...)` with the typed proto in the seam signature, which drags `ui/core/proto/api.ts` into the engine's module graph and inverts that decision. Separately, both `engine/rank.ts` and `engine/seams/sim-runner.ts` are listed in `engine/PROVENANCE.md`, so every edit in Steps 2 and 5 arms the five-step ported-engine-file cycle in `known-traps.md` — which the plan never mentions, and which `pnpm verify` will fail on.

Two further gaps worth the executor's time: the 10-minute server-side progress eviction is a **silent data-loss path**, not a timeout error, and no step plumbs an AbortSignal or accounts for what the user sees during ~1.26M sequential iterations.

## Findings

**1 — blocking — Steps 4, 5; C11 — Bulk `dpsMetrics` cannot substitute for the engine's paired-seed delta measurement.**
`rank.ts:360` defines `DEFAULT_SEEDS = [11,22,33,44,55]`; `rank.ts:832-834` budgets `replicaSims` and `rank.ts:1071-1108` runs paired replication over the top `PAIRED_REPLICATE_TOP_N` candidates, re-simming each under every seed. The ranking output is `BestSwap.deltaDps` against a baseline, not absolute DPS. `BulkSimResult.topResults[].dpsMetrics` (`api.ts:1916`) carries absolute distribution metrics from the Go engine's own internal iteration schedule, with a *separate baseline probe per slot* (research-local §Q1b explicitly counts 13 baseline probes, ~70,575 iterations). Steps 4 and 5 describe this as a shape mapping and provide no step to reconcile seeds or baselines. The plan therefore solves a nearby easier problem — "get per-slot DPS numbers from the bulk engine" — rather than the brief's problem, "the upgrades tab's batch simming uses the native bulk path." Reason blocking: the approach's core substitution is unestablished, and the two acceptance criteria that could catch it (Step 1a, Step 7) both compare bulk to bulk.

**2 — blocking — Step 4; C8 — Transport detection is decided server-side and gives the wrong answer on the dev server.**
`worker_pool.ts:32`: `const SIM_WORKER_URL = '/${REPO_NAME}/sim_worker.js';` — the client always requests the same path. `main.go:401-405`: the Go server substitutes `net_worker.js`. Vite serving 5173 does no such rewrite, so `new WorkerPool(1).isWasm()` resolves `true` there regardless of a Go server on 3333. `known-traps.md` § "Before starting the dev servers" documents 5173+3333 as the normal dev configuration. Step 1(b) and Step 4's acceptance ("observe network panel") are both specified against a running local server without saying *which* server serves the page, so the gate can pass or fail for reasons unrelated to the code. Reason blocking: the plan's single branch predicate is environment-dependent in a way the plan does not model, and its verification is run in the failing environment.

**3 — blocking — Step 2 — The proposed seam signature inverts a recorded design decision and there is no step to re-decide it.**
`engine/seams/sim-runner.ts:12-21` (load-bearing comment): `RaidSimRequest` is left as `Readonly<Record<string, unknown>>` rather than the fork's typed proto *specifically* so the engine does not depend on the fork's typed protos — the adapter bridges. Step 2 specifies `runBulkSlot?(req: BulkSimRequest, opts): Promise<BulkSlotObservation>`, placing the typed proto in the seam. On this repo's three-seams rule the *optional-method* form is fine — it adds no fourth port, and I do not fault it on that axis. What fails is the type: it makes the engine proto-aware, which the adapter exists to prevent. Reason blocking: it contradicts a decision recorded in the file being edited, and the plan neither cites nor overturns it.

**4 — material — Steps 2, 5; Paths manifest — The PROVENANCE cycle is unacknowledged.**
`engine/PROVENANCE.md` lists both `rank.ts` and `seams/sim-runner.ts` among its ported-file rows with sha256 hashes. `docs/agents/known-traps.md` § "Before editing a ported engine file" applies to this subtree **including comment-only edits**, and prescribes the five-step cycle. The plan's Verify recipe will fail with "engine/PROVENANCE.md is stale". Step 4 additionally mandates a load-bearing comment in an adapter file — check whether `adapters/wasm_sim_runner.ts` is also provenance-tracked before assuming only engine files are affected. Reason material: the executor will hit a hard gate failure with no instruction for it.

**5 — material — Step 4; C13 — The 10-minute server-side eviction truncates silently rather than erroring.**
`main.go:216-224`: the progress goroutine's `select` has `case <-time.After(time.Minute * 10):` which deletes the async progress entry and returns. `/asyncProgress` then returns `204` (`main.go:309-312`). Client-side, `worker_http.ts:40-42` treats 204 as "no new data available, stop querying" and `break`s, returning the last `outputData` with **no error**. `worker_pool.ts:231-241` then either resolves a stale progress or throws — the branch depends on timing. Given ~1.26M iterations across 13 sequential runs, a slow slot approaching that window is plausible. C13 as written tests the wrong failure mode: sequential requests do not collide (fresh UUID at `main.go:212`), but they can be silently evicted. Reason material: Step 7 would report success on a truncated run.

**6 — material — Steps 4, 7 — No AbortSignal plumbing and no progress/cancellation accounting.**
The existing runner registers signals (`wasm_sim_runner.ts:116`) and `rankUpgrades` implements cooperative pre-dispatch abort (`rank.ts:840-870`). `WorkerPool.bulkSimAsync` accepts `signals: SimSignals` (abort wired at `worker_pool.ts:214-216`), so the capability exists — but Step 4 does not say where signals come from or how a user cancel reaches an in-flight slot. With 13 sequential runs, an abort must both stop the current slot and skip the remaining 12. Reason material: a step the executor will have to design from scratch, presented as already specified.

**7 — material — Step 1(a) — The ordering-diff acceptance criterion is not decidable as written.**
The flat pass returns **20 rows**, the per-slot union returns **212**. For 11 of 13 slots, most candidates have no flat counterpart, so "ordering per slot" is undefined for them. The criterion also does not state the error-bar formula or the inversion threshold. Reason material: a gate that blocks Step 4 cannot be evaluated as specified.

**8 — material — Steps 3, 4, 5; C14 — Three steps are conditioned on a plan that does not exist yet.**
Step 3 "reuse the web plan's modules verbatim"; Step 4 "or a sibling if the web plan split the file"; Step 5 "if the web plan already did it, skip." C14 is `hypothesis, untested` and load-bearing for all three; the Paths manifest inherits the ambiguity. Reason material: the executor cannot determine its own file set, and the manifest's one-owner property is unverifiable.

**9 — minor — Approach; C6 — C6 is cited to justify a decision it does not bear on.**
C6 (adaptive-vs-flat wash) is a genuine measurement, but the owner's standing decisions 1 and 4 are what rule out a bespoke screening pass, not C6. Also single-slot, single-universe. Reason minor: does not change the chosen approach.

**10 — minor — C5, C10 — Register imprecision.**
C5's flat-pass figure (141,672) is arithmetic extrapolation (the flat-212 arm's result file is 0 bytes), not measured — the register does not carry that caveat. C10's `rank.ts:848-870` is the dispatch block; `rankUpgrades` begins at 387. Reason minor: label provenance, no material misleading.

**11 — minor — Step 6 — Fixture recording underspecified.**
Recorded-adapter tests live outside the subtree (`packages/core/test/*.test.ts`) while fixtures go under `engine/fixtures/`; `RecordedSimRunner` keys on `simCacheKey(req, version, opts)` (`sim-runner.ts:41-47`), which has no bulk equivalent. Step 6 does not say what the bulk cache key is. Reason minor: solvable, but underspecified.

## Claims checked

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | stands | `worker_http.ts:64,12-16,33-49` |
| C2 | stands | research-local §Q1a re-derivation of `stage.go:29-59`; harness 212/212 |
| C3 | stands | research-local §Q1a table |
| C4 | stands | grep `$F/proto/` no survivor knob; `api.ts:993` |
| C5 | stands (with caveat) | flat-212 arm extrapolated, not measured (Finding 10) |
| C6 | stands | research-local §Q5 table; single-slot, single-universe |
| C7 | stands | research-local §Q6 five-site table + positive control |
| C8 | stands (mechanism differs) | `worker_pool.ts:183-189,315,390-394`; `worker_http.ts:74`; `worker_interface.ts:65-67` — resolves deterministically, no HTTP handler. But worker script choice is server-decided (`main.go:401-405` vs `worker_pool.ts:32`) — Finding 2 |
| C9 | stands | `sim.ts:164-171` |
| C10 | stands (imprecise) | `rank.ts:359` confirmed; 848-870 is the dispatch block |
| C11 | refuted as sufficient | Step 1(a) cannot decide it (Finding 7) and would not detect the seed/baseline substitution (Finding 1) |
| C12 | stands | `api.ts:993,1874,1887,1916`; `worker_pool.ts:139-157` |
| C13 | refuted | No collision (fresh UUID `main.go:212`, `progMut` guarded), but silent 10-minute eviction → 204 → client `break` (Finding 5) |
| C14 | untestable | The web plan did not exist at review time; load-bearing for Steps 3–5 (Finding 8) |

## What would make this sound

Findings 1, 2 and 3 each need a decision before code, not a step:

- **Finding 1** is the one that matters most. Either establish that bulk `dpsMetrics` can reproduce `rankUpgrades`' paired-seed delta ranking (a real measurement: run `rankUpgrades` both ways on feral-p2 and compare final orderings), or narrow the plan's goal to what bulk can actually deliver and say so in the brief's terms.
- **Finding 2** wants an explicit statement of which server serves the page in each acceptance check, and a detection predicate that does not depend on a server-side URL rewrite — or an accepted, documented constraint that the bulk path only engages under the packaged `wowsimtbc`.
- **Finding 3** wants the seam signature re-expressed in the engine's own vocabulary (plain protojson-shaped objects, adapter bridges to the typed proto), matching `sim-runner.ts:12-21`.

Findings 4–8 are step-level and fixable in place. Finding 4 in particular should be added to the Verify recipe before the executor starts, since it is a certain gate failure.

Files read for this review: `worker_pool.ts`, `worker_http.ts`, `worker_interface.ts`, `sim/web/main.go`, `upgrades/engine/seams/sim-runner.ts`, `upgrades/engine/rank.ts`, `upgrades/adapters/wasm_sim_runner.ts`, `upgrades/engine/PROVENANCE.md`, `docs/agents/known-traps.md` (all under the repo / `vendor/tbc-new-fork`).
