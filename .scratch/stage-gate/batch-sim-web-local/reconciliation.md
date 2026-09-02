VERDICT: **do not compose** — as written. Two blocking gaps must be closed first; both are small, mechanical edits to the plans, not re-planning. With them closed, the composition is sound.

(Orchestrator disposition: the prescribed fixes R1–R6 + ledger handoff were routed verbatim into both plans as a binding "Reconciliation conditions" addendum on 2026-09-01; see decision-log.md. With that, the verdict's own terms are met and execution proceeds.)

## Plain-English summary

The two plans fit together well on the dimension that was hardest to get right: **the architecture**. Web decides everything (bulk is the screening pass only, the seam speaks protojson, partitioner and request-builder are shared modules, `rank.ts` branches on an optional capability), and local is genuinely nothing but a second transport behind that same seam. The estimand is untouched on both sides, the ordering (web first) is correct, and I found no double-build: every shared name has exactly one producer step in web and one consumer step in local. The round-2 addenda did the cross-plan work they were meant to — `topResults = candidates.length` is correctly made web's obligation (L-new-1) and correctly consumed as a precondition by local's Step 1(a) preflight.

What breaks is narrower and neither per-plan reviewer could have seen it, because each attacked one plan and this lives in the space between them.

**The runner is constructed in a file that appears in neither Paths manifest, and both plans' verify recipes would fail on touching it.** `deps.sim` is wired at `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:446` (`private readonly sim = new WasmSimRunner();`), passed to `rankUpgrades` at `:1175`. That file sits at `individual_sim_ui/`, one level **above** the `upgrades/` subtree. Web Step 7 must swap in `BulkWasmSimRunner` there and local Step 3 must select `BulkHttpSimRunner` there — but web's manifest doesn't list it at all, local's names only "the tab's runner-construction site (executor locates it)", and **both** plans declare "vendor files outside `upgrades/` are read-only" while asserting in their verify recipes that `git -C $F status --porcelain` shows *only* `upgrades/` paths. Executing either plan as written produces a red gate on a file the plan required editing. The good news: `upgrades_tab.tsx` is this project's own file (its git history is entirely project ticket work — `Rework set-bonus lines`, `Add a token/gear-id flavour to the tab export (126)`), so the brief's "don't edit wowsims' code" constraint is *not* violated. It is a manifest and verify-recipe bug, not an approach failure. But it also means the file is now co-owned by both plans — the one place the one-owner property actually breaks.

**Web has no row-count guard, and it needs one for a reason stronger than symmetry.** Local Step 2 converts a short response into a hard error; web has nothing equivalent, and the round-2 addendum L-new-1 only obliges web to *set* `topResults`. Setting `topResults` is not sufficient. `statistics.ts:107` filters `results.filter(result => result.dpsMetrics)` before slicing — a candidate whose `dpsMetrics` is unset is silently dropped even when `topResults` is generous and nothing was culled. `index.ts:121-122` catches only results with an `error` field set; a result with neither `error` nor `dpsMetrics` passes that check and vanishes at the filter. Web's row completeness is currently guaranteed by argument ("the partitioner bound guarantees no culling"), which is true about *culling* and silent about *this* filter. Since web's Step 8 feeds screening deltas straight into `rank.ts`, a dropped row becomes a missing candidate in the ranking rather than an error.

A third thing worth the executor's attention but not blocking: **the baseline is a separate field, not a row**, on both paths — `result.baseline` at `index.ts:165` versus `result.topResults` at `:166`, and Go identically. Both plans' mapping prose says "map `baseline` + `topResults[]`", which is consistent with this, so the obligations *are* stated identically. I checked this specifically because the phrase "one row per candidate plus a baseline" in web Step 3's acceptance could be misread as expecting n+1 rows in one array. Worth one clarifying word.

The recorded-fixture story does stay transport-blind as claimed. `RecordedSimRunner` keys on `simCacheKey(req, simVersion, opts)` (`sim-runner.ts:41-47`) with no transport component, and web Step 4's `bulkScreenCacheKey` follows the same shape using the same file-private `stableStringify` (`:49`). Local Step 4 recording Go-engine observations under that key is coherent. One caveat below on `simVersion`.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| R1 | blocking | web Step 7 + Paths manifest; local Step 3 + Paths manifest; **both** verify recipes | The only runner-construction site is `upgrades_tab.tsx:446`, outside the `upgrades/` subtree. Neither manifest lists it; both plans declare files outside `upgrades/` read-only; both verify recipes assert `git -C $F status --porcelain` shows only `upgrades/` paths. Each plan must edit it, so each plan's own gate goes red on work the plan mandates. It is also the single file co-owned by both manifests once added — the one-owner violation. | `grep WasmSimRunner` → `upgrades_tab.tsx:21,446`; `rankUpgrades(` at `:1171`, `sim: this.sim` at `:1175`; no `new .*SimRunner` anywhere under `$U`. Read-only declarations: plan-web.md:43,66; plan-local.md:40,76. Gate assertions: plan-web.md:62; plan-local.md:67 |
| R2 | blocking | web Step 7 mapping + Step 3 acceptance | Web has no row-count guard. `topResults = candidates.length` (L-new-1) bounds the slice but does not guarantee row count: `statistics.ts:107` drops any result lacking `dpsMetrics`, and `index.ts:121-122` only catches results with `error` set. A row can vanish with no culling and no error, and web feeds screening deltas directly into `rank.ts`. Local guards this (Step 2); web does not, so the two transports are held to different integrity bars in the module web owns. | `statistics.ts:104-111` (`.filter(result => result.dpsMetrics)` then `.slice(0, limit)`); `index.ts:121-122`, `:166-168` |
| R3 | material | web Step 7 / local Step 2 mapping obligation | Local Step 2 says "import the mapping from `bulk_wasm_sim_runner.ts` if web exported it; else write it here". Web's Step 7 never commits to exporting the mapping. Left as-is this is decided by the local executor after the fact — the one place the shared-name contract is optional rather than binding, and the branch where it is duplicated is a genuine double-build of the semantics both plans must keep identical. | plan-local.md:50; plan-web.md:58 (Step 7 names the mapping but declares no export) |
| R4 | material | web Step 3 acceptance wording | "Returns a `BulkSimResult` with one `topResults` row per candidate plus a baseline" reads as n+1 rows in one array. The baseline is a distinct field. If the spike asserts the wrong shape it fails for a wrong reason, or passes while asserting nothing. | `index.ts:165` `result.baseline = ...` vs `:166` `result.topResults = ...`; Go identical per `bulk_sim.go` baseline/TopResults split |
| R5 | material | local Step 4 fixture vs `simVersion` | Fixture keys embed `simVersion` (`sim-runner.ts:46`), and `WasmSimRunner.version()` (`wasm_sim_runner.ts:93`) sources it from the running engine. A Go-served recording and a WASM-served recording may carry different `simVersion` values, so the "same key scheme" does not by itself make one fixture replay under both. Transport-blind is true of the *key shape*, not automatically of the *key value*. Local Step 4 should state which version value it records under and confirm the test selects it. | `sim-runner.ts:41-47`; `wasm_sim_runner.ts:93,130` |
| R6 | minor | local C9 / Step 3 contingency | C9's contingency is written for "the construction site turns out to be a PROVENANCE-tracked engine file". It is not: `upgrades_tab.tsx` is outside `engine/` and carries no PROVENANCE row (the tracked list is `engine/` files only). The contingency is dead as written; the real exposure is R1's manifest/gate problem, which it does not cover. | PROVENANCE.md tracked list contains `engine/` files only; `tools/README.md:11` confirms the rule |
| R7 | minor | web Step 2 / local C3 | Web measures the bound with `topResults` set per L-new-1; local's new-2 already makes C3's escalation two-sided on exactly this. Consistent — recorded as verified, not a defect. No action. | plan-web.md:125; plan-local.md:105 |

## Contract table

| Shared name | Producer step (web) | Consumer step (local) | Match? |
| --- | --- | --- | --- |
| `runBulkScreen?` on `SimRunner` | Step 4 (optional method, protojson) | Step 2 (implements it) | yes |
| `BulkScreenRequest` / `BulkScreenResult` | Step 4 | Step 2, Step 4 | yes |
| `BulkScreenCandidate` | Step 4 | Step 2 (via request type) | yes |
| `bulkScreenCacheKey` | Step 4 (uses file-private `stableStringify`) | Step 4 (fixture key) | yes — key *shape*; see R5 on the version value |
| `RecordedSimRunner.runBulkScreen` | Step 4 | Step 4 (replay) | yes |
| `partitionForBulkScreen` | Step 5 (`engine/bulk/partition.ts`) | Step 2 | yes |
| `MAX_CANDIDATES_PER_BULK_REQUEST` | Step 5 (value from Step 2 measurement) | Step 2; Step 1(a) asserts ≤ 25 | yes — two-sided escalation per local new-2 |
| `buildBulkSimRequest` | Step 6 (`adapters/bulk_request_builder.ts`) | Step 2 | yes |
| `topResults = candidates.length` inside the builder | Step 6 (binding, L-new-1) | Step 1(a) greps for it, escalates if absent | yes |
| `rank.ts` bulk branch | Step 8 | inherited, read-only | yes |
| `DEFAULT_ITERATIONS = 5000` | Step 8 | inherited, explicitly not touched | yes |
| Working `RequestTypes` member (`SimSignals`) | Step 3 (discovers, ledgers) | C13 / Step 2 (reads from web's ledger) | yes — ledger handoff, must be written down |
| `BulkSimResult` → `BulkScreenResult` mapping | Step 7 (no export committed) | Step 2 (import "if web exported it; else write it here") | **no** — R3 |
| Runner-construction site | Step 7 (factory; file unlisted) | Step 3 (selection; file unlisted) | **no** — R1, co-owned |
| Row-count guard | absent | Step 2 (hard error) | **no** — R2, asymmetric |

## Constraint compliance

All four owner constraints hold, and neither addendum broke them. No wowsims-owned file is edited — `upgrades_tab.tsx` is this project's own file despite living outside `upgrades/`, so R1 is a manifest bug and not a constraint breach. The new batch system is preferred throughout, with web's High-only entry justified in writing as the new system's own decision for small runs rather than a legacy-path selection. 5,000 is set once (web Step 8) and inherited, not re-set. The screening-then-accurate shape is exactly what both plans implement, and paired-seed replication is untouched on both sides.

## Recommended handoff (once R1–R3 are closed)

Close the three before dispatching the web executor; R4–R6 can be folded into the executors' prompts as conditions.

1. **R1 — add `ui/core/components/individual_sim_ui/upgrades_tab.tsx` to both Paths manifests**, note in each that it is a project-owned file outside `upgrades/` (with the git-history evidence, so no executor re-litigates the constraint), and **fix both verify recipes**: the `git status --porcelain` assertion must permit `upgrades/` paths *plus* `upgrades_tab.tsx`, not `upgrades/` alone. State the ownership split explicitly: **web** introduces the runner factory in that file; **local** extends only the factory's branch condition. That keeps one owner per concern in a file both must touch.
2. **R2 — give web the same row-count guard local has.** Add to web Step 7's mapping: after each chunk resolves, assert `topResults.length` equals the chunk's candidate count and every row carries `dpsMetrics`; on shortfall, throw. Add to Step 3's acceptance that the spike asserts the count per chunk. Cite `statistics.ts:107` as the reason so it is not mistaken for redundancy with the partitioner bound.
3. **R3 — make the export binding in web, not optional in local.** Web Step 7 exports the `BulkSimResult` → `BulkScreenResult` mapping as a named function; local Step 2 imports it, full stop. Delete local's "else write it here" branch.
4. **R4** — reword web Step 3's acceptance to "a `BulkSimResult` whose `baseline` field is populated and whose `topResults` array has one row per candidate."
5. **R5** — local Step 4 states the `simVersion` its fixture is recorded under and confirms the recorded test resolves that value.
6. **R6** — replace local C9's dead PROVENANCE contingency with R1's actual manifest/gate condition.
7. **Ledger handoff is load-bearing between executors.** Web's ledger must carry, in a form local's executor can grep: the measured `MAX_CANDIDATES_PER_BULK_REQUEST`, the working `RequestTypes` member, and the exported mapping's name. Local Step 1(a) already reads these; web has no step that obliges writing them in one findable place. Add that to web Step 11.

Ordering (web then local) is correct and needs no change. Nothing in local requires anything web does not produce, once R3 is made binding.
