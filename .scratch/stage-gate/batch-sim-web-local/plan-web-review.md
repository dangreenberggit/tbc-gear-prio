# Round 2 (v2 plan): VERDICT — proceed, with N1 (material) folded into Step 8 and N4 into Step 2

All 11 round-1 findings dispositioned **resolved** (finding 8 "resolved with a gap" → N1). New issues: N1 material — Step 8 must keep composing per-candidate `RaidSimRequest`s and populating `winningRequests` (`rank.ts:618,820,969,1084`) plus row metadata (`:740-768`); only the DPS observation comes from bulk; acceptance adds a fixture test through `replicateTopItems` with no `RankError`. N2 minor — `check_engine_port_drift.py:202-209` is table-driven; new untracked `engine/bulk/partition.ts` will not fail verify and deliberately carries no row. N3 minor — C15's probe bound is a lower bound, not upper. N4 minor — the two n=19 arms must agree (both below `BULK_SIM_MIN_COMBINATIONS`), else stop and diagnose. New citations verified: `$F/package.json:24` type-check real and runnable; `tools/README.md:11` confirms adapters carry no PROVENANCE row; paired replication verified to overwrite `deltaDps`/`se` (`rank.ts:1066-1105`), so screening-only bulk does not change the estimand. Conditions are recorded as a binding addendum in plan-web.md; no further planning round needed.

---

# Round 1 (v1 plan), retained for the record

VERDICT: revise

## Summary

The plan is well-researched and its citations are, with two exceptions, real and accurate — I re-ran every one. But it fails on two independent grounds, either of which is enough to stop it.

First, **C14 is refuted by the code, not merely untested.** `runConcurrentBulkSim` applies `topResults` to `latestResults` — the survivors of the *last stage that ran* — not to the original candidate list (`index.ts:125,141,166`). `topResults` is a display cap applied after culling; it cannot un-cull anything. For slots under 20 candidates the plan does get a row per candidate, but by a mechanism the plan never identifies: `shouldUseLegacyBulkSim` returns `true` unconditionally at `candidateCount < 20` (`estimate.ts:10-12`), which skips Low and Medium entirely (`index.ts:116`). The plan's whole per-slot rationale rests on a cull gate of **100** carried from Go (C8); the real TS gate for the tab's slot sizes is **20**, and the plan's own cited slot range is 11–29 — so slots at 20–29 candidates take the staged, *culling* path and silently lose rows. Step 2 as written would not catch this: it measures 11–29 and >100, straddling the boundary that actually matters.

Second, **the seam the plan says it will implement cannot express a batch call.** `engine/seams/sim-runner.ts:35-38` is `run(req, opts): Promise<SimObservation>` — one request, one DPS observation. `rank.ts` calls it from five sites (`:605,:727,:1126,:1290`) interleaved with per-request cache reads/writes, gem repair, set-bonus package sims and skip bookkeeping, dispatched through `promisePool` at `:858`. Step 3's "new adapter implementing the existing seam" is not implementable as described: a per-slot bulk runner has no way to answer the one-request-at-a-time questions `rank.ts` asks it. Step 3 would compile only by lying about the interface, and this is exactly the class of runtime failure the predecessor's missing `sim.RegisterAll()` was.

Two further problems compound these: `runConcurrentBulkSim` requires a `SimSignals` from `SimSignalManager` and a `BulkSimRequest` containing a full typed `baseRequest` (`index.ts:47-52` validates it), whereas the seam trades in untyped protojson (`sim-runner.ts:21`) — a conversion the plan never budgets. And `engine/rank.ts` carries a PROVENANCE row, so Step 5's one-line constant change arms the five-step PROVENANCE cycle the plan does not mention at all.

## Findings

**1 — `blocking` — C14 is false as stated; `topResults` cannot recover culled candidates.**
`index.ts:166` reads `topBulkSimResults(latestResults, topResults)`. `latestResults` is assigned `stageResult.results` inside the stage loop (`:125`), and after a capped stage `candidates` is replaced by `selectBulkSimSurvivors(...)` (`:141`) so the next stage sims only survivors. A candidate culled at Low or Medium is absent from `latestResults` before `topBulkSimResults` is ever called. `topBulkSimResults` (`statistics.ts:104-111`) additionally drops any result without `dpsMetrics`. Setting `topResults` high does nothing for either. The plan calls this "hypothesis, untested"; it is refutable by reading, and it is refuted.

**2 — `blocking` — the real TS gate is 20, not 100, and it cuts through the plan's own slot range.**
The plan's per-slot design exists to keep each request "under the cull gate", citing Go's 100 (C8) and asserting C9 that TS matches. TS does have a 100 `maxSurvivors` on the Low stage (`stage.ts:27`), but the gate that actually decides whether culling stages run at all is `BULK_SIM_MIN_COMBINATIONS = 20` (`constants.ts:3`) via `shouldUseLegacyBulkSim` (`estimate.ts:10-12`) → `index.ts:116`. Below 20, only High runs and every candidate survives. At 20 and above, `shouldUseLegacyBulkSim` falls through to a cost estimate (`estimate.ts:14-32`) whose outcome depends on `highStageIterations` — which Step 5 changes from 3,000 to 5,000, moving the boundary. The plan's cited slot sizes are 11–29. Slots at 20–29 are on the wrong side, and whether they cull depends on an iteration constant the plan is simultaneously changing. C9 is refuted: the TS gate does not match Go's in the way the plan needs.

**3 — `blocking` — Step 3 is not implementable against the named seam.**
`sim-runner.ts:35-38` defines `run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation>` — singular in, singular out, no candidate list, no batch concept. `rank.ts` calls `deps.sim.run` at `:605` (baseline), `:727` (per-candidate, inside the per-slot loop, with per-call cache read at `:724` and write at `:738`), `:1126`, and `:1290` (set-bonus package sims), all dispatched via `promisePool(tasks, concurrency)` at `:858`. A per-slot `BulkSimRequest` runner cannot satisfy those calls. Step 3's acceptance ("fork-side typecheck passes") would pass on a class that implements the signature while doing something structurally different, so the acceptance criterion cannot detect the failure. Either the seam changes (which the plan's own seam flag forbids: "neither may change its signature unilaterally") or `rank.ts` is restructured — a far larger change than any step admits.

**4 — `material` — `SimSignals` and typed-`baseRequest` obligations are unbudgeted.**
`runConcurrentBulkSim(request, workerPool, onProgress, signals, …)` (`index.ts:58-64`) requires a `SimSignals`, which `WasmSimRunner` obtains via `signalManager.registerRunning(RequestTypes.RaidSim)` (`wasm_sim_runner.ts:116`) — there is no `RequestTypes.BulkSim` named anywhere in the plan, and the correct request type is unverified. `validateBulkSimRequest` (`index.ts:45-54`) hard-requires `baseRequest.raid.parties[0].players[0]` with `class` and `equipment` populated. The seam hands over `Readonly<Record<string, unknown>>` protojson (`sim-runner.ts:21`); `wasm_sim_runner.ts:112` converts with `RaidSimRequest.fromJson`. No step budgets the equivalent conversion plus `EquipmentSpec` construction per candidate. Step 1's "build a minimal `BulkSimRequest`" hides the entire cost.

**5 — `material` — Step 5 arms the PROVENANCE cycle, unmentioned.**
`docs/agents/known-traps.md` § "Before editing a ported engine file" covers everything under `upgrades/engine/` **including comment-only edits**, and `engine/PROVENANCE.md:153` carries a hashed `rank.ts` row. Step 5 edits `engine/rank.ts:359`. The required cycle is: parity test green → update the PROVENANCE sha256 → fork commit → re-pin `data/wowsims-fork.lock.json` and run `pnpm sim-implemented-effects:generate` → `pnpm verify`. The plan's Step 5 says only "change the constant"; its Step 8 says `pnpm verify`, which is where this fails, not where it is prevented. The Paths manifest also omits `PROVENANCE.md` and `data/wowsims-fork.lock.json`.

**6 — `material` — the rejection of `Sim.runBulkSim` rests on a real but differently-shaped hazard, and the fallback inherits every blocking finding.**
C6 checks out: `shouldUseWasmConcurrency()` requires `getWasmConcurrency() >= 2 && workerPool.getNumWorkers() >= 2` (`sim.ts:241`), and the else branch at `:589` calls `workerPool.bulkSimAsync`, a stub under WASM. So the Off/1 hazard is genuine. But the rejection reasoning is incomplete in a way that matters: `runConcurrentBulkSim` is not a stable public API — `sim.ts:58` imports it from `'./wasm'`, a barrel, and it sits inside `ui/core/wasm/bulk_sim/` alongside eight sibling modules with a documented import cycle (research §Q5). Calling it directly couples our adapter to upstream's internal staging implementation, whose stage configs, cull constants and legacy-path gate (all of which findings 1–2 show we depend on) can change in any upstream sync with no API-break signal. That is a *worse* upgrade-fragility exposure than `Sim.runBulkSim`, whose signature is stable and whose hazard is one guardable boolean. The plan's designated fallback ("`Sim.runBulkSim` guarded on `wasmConcurrency >= 2`") does not rescue anything either: it routes to the identical `runConcurrentBulkSim` at `sim.ts:565` and so inherits findings 1, 2 and 3 unchanged. There is no fallback in this plan that survives its own blocking findings.

**7 — `material` — Step 7's acceptance criterion cannot fail informatively.**
"Orderings agree within per-candidate error, or the disagreement is quantified and flagged" is satisfied by any outcome. Given findings 1–2, the bulk path may legitimately return fewer rows than the loop, in which case "orderings" are not comparable at all and the step has no defined result. A pre-registered win condition is needed: identical row *count* first, then rank correlation above a stated threshold.

**8 — `material` — no test obligation is stated, against explicit repo rules.**
`AGENTS.md` § Testing requires the primary test at the `rankUpgrades` interface through recorded adapters. `RecordedSimRunner` (`sim-runner.ts:66-84`) keys recordings by `simCacheKey(req, version, seed, iterations)` — a per-request key that a batch runner does not produce. Changing the runner shape therefore breaks the recorded-adapter story, and no step addresses it. Step 5 also changes `DEFAULT_ITERATIONS`, which changes every cache key and so invalidates existing fixtures; the plan mentions only "existing tests updated if they pin 3000".

**9 — `minor` — C15's verify recipe is partly unknowable at plan time.**
`upgrades/tools/` contains `headless.mts`, `hooks.mjs`, `register.mjs`, `README.md`, `export_equip_eligibility.mts` — no typecheck or test entry point among them. The Verify recipe defers to "the fork-side typecheck/test command from C15 once discovered", so the recipe cannot be run as written. Step 3's acceptance depends on that same undiscovered command.

**10 — `minor` — C7's "hardcodes 4" is imprecise and Step 4's fallback silently overrides the user.**
`wasm_sim_runner.ts:35` is a default parameter, not a hardcode (`:88`), and `:90` further folds in `memoryCapFromDeviceMemory()`. Step 4 clamps to `[1, hardwareConcurrency]` with "fallback 4" — but `wasmConcurrency` Off is the value `0` (`sim.ts:175`, picker `settings_menu.tsx:187-190`), a deliberate user choice meaning "no concurrency". Clamping 0 up to 1, or falling back to 4, converts an explicit user setting into its opposite. Step 4 also drops the memory cap the existing runner applies.

**11 — `minor` — decision-rule inversion risk in the Approach.**
C10 (measured, Go-side) is used to argue adaptive iterations cost nothing, and C11's ~9x figure is labelled "ratio expected but untested on web". The Approach then treats the per-slot shape as settled. If the web ratio is measured and disagrees, no step says the measured web number wins over the carried Go modelling. Given the brief's explicit warning about the predecessor's three mismatched comparisons, this should be stated.

## Claims checked

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | confirmed | `rank.ts:359` `const DEFAULT_ITERATIONS = 3000;`, used at `:461` |
| C2 | confirmed (not re-run) | research-web.md §Q3 live observation; browser re-run out of scope for this seat |
| C3 | confirmed | `sim.ts:101` `private readonly workerPool: WorkerPool;`, no getter in the grep of all `workerPool` references; `runBulkSim` at `:373` |
| C4 | confirmed | `bulk_sim/index.ts:58-64` — `export const runConcurrentBulkSim = async (request, workerPool: WorkerPool, onProgress, signals, …)` |
| C5 | unverifiable as scoped, and moot | callability is plausible, but findings 3–4 show the call cannot satisfy the seam regardless of whether it executes |
| C6 | confirmed | `sim.ts:241` guard; `:565` concurrent branch vs `:589` `workerPool.bulkSimAsync` |
| C7 | confirmed with correction | `sim.ts:164,168-169,173-179,1067` all as cited; "hardcodes 4" is a default param (`wasm_sim_runner.ts:35,88`) further capped at `:90` — see finding 10 |
| C8 | confirmed for Go, not transferable | TS Low stage `maxSurvivors: 100` at `stage.ts:27`, but the governing gate for tab-sized slots is `BULK_SIM_MIN_COMBINATIONS = 20` (`constants.ts:3`) — finding 2 |
| C9 | **refuted** | `estimate.ts:10-12` + `index.ts:116` — TS short-circuits to High-only below 20 candidates; above 20 it runs a cost estimate sensitive to `highStageIterations`. Not a match for Go's shape |
| C10 | confirmed (not re-measured) | research-local.md §Q5; local seat's measurement, accepted as cited |
| C11 | confirmed as labelled | correctly marked untested on web; see finding 11 |
| C12 | confirmed | `statistics.ts:6` exported; `statistics.ts:3` imports `./stage`, `stage.ts:18` imports back — cycle real |
| C13 | confirmed | `BulkSimRequest` fields and `BulkGearResult.candidateIndex`/`dpsMetrics` as cited in `proto/api.ts` |
| C14 | **refuted** | `index.ts:166` applies `topResults` to `latestResults` (post-cull, `:125`,`:141`); `statistics.ts:104-111` also filters on `dpsMetrics` |
| C15 | **refuted** | `ls upgrades/tools/` returns `headless.mts`, `hooks.mjs`, `register.mjs`, `README.md`, `export_equip_eligibility.mts` — no typecheck/test entry point |

## What the revision needs to settle

Before re-planning, three questions have to be answered from the code rather than assumed. **What is the seam?** — either `SimRunner` grows a batch method and `rank.ts`'s five call sites are restructured (a much larger scope than this plan), or the bulk path is used only for a bounded sub-problem that fits one-in/one-out. **What is the real cull boundary for the tab's actual slot sizes?** — measure at 19, 20, 25 and 30 candidates, at both 3,000 and 5,000 `highStageIterations`, since Step 5 moves the estimate that decides it. **Does the plan still buy anything once the answer to the first two is known?** — if every slot must stay under 20 candidates to return complete rows, the per-slot bulk path is a High-stage-only run, which is close to what the existing loop already does, and the case for the whole change needs re-argued against C10's "cost is a wash" finding.

Files referenced: `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\ui\core\wasm\bulk_sim\index.ts`, `...\stage.ts`, `...\statistics.ts`, `...\constants.ts`, `...\estimate.ts`, `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\ui\core\sim.ts`, `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\ui\core\components\individual_sim_ui\upgrades\engine\seams\sim-runner.ts`, `...\engine\rank.ts`, `...\engine\PROVENANCE.md`, `...\adapters\wasm_sim_runner.ts`, `C:\Users\dgree\Code\lulz\tbc-gear-prio\docs\agents\known-traps.md`.
