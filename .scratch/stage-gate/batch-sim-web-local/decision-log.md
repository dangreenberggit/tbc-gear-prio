# Decision log — batch-sim-web-local

- 2026-09-01 — Stage opened. Base SHA `d5d48a07ac3dc861d2134f2a9140bcbe383e0e2d`,
  branch `feat/upgrades-tab-batch-sim`, tree clean. Pipeline shape (from
  340 handoff): research fan-out (web + local) → planner per track →
  reviewer per plan → one reconciling reviewer across both → execute web
  then local.
- 2026-09-01 — Research (web) complete → `research-web.md`. Headline: live
  site runs bulk sim entirely in-browser via the TS tournament
  (`runConcurrentBulkSim`); WASM RPC stub is dead code on that path.
  Q4 contradiction resolved (1 → resized to min(4, cores/2), user-settable).
  Q5 export verified. New risk: Go-harness culling numbers do not
  automatically transfer to the TS tournament (separate implementation) —
  web planner must treat as unmeasured. 1 round, no respawn.
- 2026-09-01 — Research (local) complete → `research-local.md`. Three
  premise corrections: cull gate is 100 candidates (not 20) — all 13
  feral-p2 per-slot runs returned every candidate un-culled; per-slot
  costs ~9x one flat pass (but buys ~10x the rows — full price for the
  answers the tab needs, no fork edits required); adaptive-iterations
  saving is a WASH at matched accuracy (1.01x), the 2.4x-10x claim was a
  mismatched-accuracy artifact. Q6 concurrency: not configurable,
  verified with positive control. 1 round, no respawn.
- 2026-09-01 — Gate A (both plans): PASS. `plan-web.md` (direct
  `runConcurrentBulkSim` with own pool, per-slot requests, fallback =
  guarded `Sim.runBulkSim`) and `plan-local.md` (per-slot
  `bulkSimAsync` over HTTP, seam capability `runBulkSlot`). All template
  sections present, claims registers nonempty, tree clean at base SHA.
  Visible cross-plan tension for the reconciler: local extends the
  sim-runner seam with `runBulkSlot`/`supportsBulk`; web says implement
  the existing seam unchanged. 1 round each, no respawn.
- 2026-09-01 — Gate B round 1: LOOP BACK, both plans. Reviews at
  `plan-web-review.md` / `plan-local-review.md`, both "revise" with
  blocking findings that stand against the goal, not just the plan text:
  (shared) bulk absolute dpsMetrics cannot silently replace paired-seed
  deltaDps ranking; seam must stay protojson (engine proto-unaware);
  PROVENANCE cycle unacknowledged. (web) TS cull gate is 20 not 100 —
  C9/C14 refuted by code; seam cannot express batch as written. (local)
  transport detection breaks on the 5173 vite dev path; 10-min server
  eviction is silent truncation. Revision order changed to SEQUENTIAL
  (web then local) to close the C14/finding-8 cross-plan dependency.
  Orchestrator directives to planners: measured-equivalence gate with
  pre-registered win condition before wiring; measured beats modelled;
  consider native-bulk-as-screening + paired-seed final as a candidate
  shape; PROVENANCE steps into manifest/verify.
- 2026-09-01 — Revision round complete: `plan-web.md` v2 (bulk =
  screening pass only, `runBulkScreen` protojson seam capability,
  measured cull boundary → `MAX_CANDIDATES_PER_BULK_REQUEST`, PROVENANCE
  cycle in steps, four pre-registered equivalence thresholds) and
  `plan-local.md` v2 (transport adapter `BulkHttpSimRunner` behind web's
  seam, packaged-server-only constraint for the HTTP path, 204-eviction
  truncation guard, abort spec, no cross-plan conditionals). Both
  reviewers resumed (retained context) for round-2 disposition of their
  own findings.
- 2026-09-01 — Gate B round 2 (web): PROCEED. All 11 round-1 findings
  resolved; new material N1 (bulk branch must keep populating
  `winningRequests` + row metadata; fixture through `replicateTopItems`)
  folded into plan-web.md as a binding addendum, N2-N4 minor recorded
  there too. Awaiting local round-2 review.
- 2026-09-01 — Gate B round 2 (local): all 11 round-1 findings resolved;
  new blocking new-1 (`topResults` defaults to 5, truncates independent
  of culling — shared builder must set it to chunk candidate count, per
  the 340 harness's own precondition) plus material new-2 (Go's
  `shouldUseLegacyBulkSim` gate unstated; C3 escalation made two-sided)
  and minor new-3 (new-engine-file PROVENANCE decided: no row, checker
  is table-driven). Reviewer-specified fixes routed verbatim into both
  plans as binding addenda — no third planning round; no blocking
  finding stands. Next: reconciling reviewer across both plans.
- 2026-09-01 — Reconciliation gate: verdict "do not compose as written"
  → composed by routing the reviewer's prescribed fixes verbatim into
  both plans as binding addenda (`reconciliation.md`; R1 runner factory
  lives in project-owned `upgrades_tab.tsx`, added to both manifests
  with an ownership split + verify-recipe amendment; R2 web row-count
  guard vs the dpsMetrics filter; R3 mapping exported once; R4-R6,
  ledger handoff into web Step 11). Architecture, ordering, one-owner
  property and owner constraints all confirmed. Proceeding to
  execution: web track first.
- 2026-09-01 — Web execution round 1: BLOCKED, honest stop. Executor
  report + ledger at `execution-ledger-web.md`. Ledger disposition:
  fork spike commit 5ad56a5c9 + lock re-pin ACCEPTED (orchestrator ran
  the permission-blocked `pnpm sim-implemented-effects:generate`, then
  `pnpm verify` — fully green; committed as d044e54). STOP rows
  (Steps 2/3/10) ACCEPTED as a plan defect: `WorkerPool` cannot
  construct under Node (`window.Worker is not a constructor`, measured
  behind a shim), so all spike/equivalence measurements need a browser
  environment the plan never budgeted. New derived facts: culling flip
  is n=40 @3k and n=33 @5k iterations (stage selection is pure; more
  iterations moves the boundary DOWN, opposite the plan's model);
  boundary is derived-only until a real run confirms row completeness
  (dpsMetrics filter). Also: `npm --prefix run type-check` breaks on
  Windows (use `node <fork>/node_modules/typescript/bin/tsc --noEmit`);
  `fromJson` needs a cast from the seam type. → Loop back to web
  planner for a scoped measurement-environment amendment. Local track
  remains ON HOLD.
- 2026-09-01 — Amendment A1 (browser measurement env, cross-track bound
  rule min(measured, 25), replacement Steps 2/3/10) reviewed round 3:
  revise → A1-1 blocking, C16 REFUTED — vite rewrites sim_worker.js to
  local_worker.js (HTTP worker), so 5173 is the WRONG branch and fails
  silently. Fix routed as binding A1.1 corrections in
  plan-web-amendment-A1.md: measurement server = `wowsims-fork-prod`
  (http-server over dist/, port 4180), `isWasm() === true` asserted per
  arm and quoted; provenance fields in every readout line; 25-cap
  recorded as applied decision; n=33 arm asserts stageMetrics.length>1.
  Cross-track rule, derivation, and C11/C12/C13 all stand. Resuming web
  executor from its landed state (fork 5ad56a5c9, outer d044e54).
- 2026-09-01 — Web execution round 2 (A1.1 pass): environment PROVEN
  (isWasm precondition quoted, 4180 prod server), three request-shape
  defects found-by-running and fixed (simOptions re-attach, requestId,
  candidateIndex field — all now Step 6/local obligations), boundary
  settled by rule (applied constant 25, web capability 32 noted), cost
  priced (23.4s per 5,000-iter sim), tip green (fork 3b1af456c, outer
  c23129d, full PROVENANCE cycle). BLOCKED: runConcurrentBulkSim from
  our own pool HANGS (0 arms in ~11 min; fresh worker boots 433ms).
  Executor correctly did not build on it. → Dedicated diagnosis agent
  spawned (exploit the asymmetry: live site works with Sim's pool
  wiring). Steps 4-9 remain unstarted; local track still ON HOLD.
  Plan-attention items ledgered for Step 8: partition-level error
  handling (index.ts:121-122 vs candidateSkips), bulk baseline not
  pool-size-reproducible, maxBaselineSims=2 (C15 sharpened).
- 2026-09-01 — Executor flagged "unattributed" working-tree edits to
  bulk-spike.mts/upgrades_tab.tsx: RESOLVED — they are the diagnosis
  agent's authorized instrumentation (dispatched by the orchestrator
  after the executor's report; the two seats overlapped in the shared
  checkout). Executor's refusal to adopt unverified edits was correct
  conduct. Its guard note carried to the diagnoser: keep the probe's
  small-n guard separate from the arms' `< 33` guard.
- 2026-09-01 — HANG DIAGNOSED (diagnoser's union-database hypothesis,
  independently verified by the executor against
  `adapters/sim_database.ts`'s own doc comment): lib.wasm has no
  embedded item DB; candidate items absent from the request's
  SimDatabase kill environment construction before iteration 1. Fix =
  4th binding obligation on `buildBulkSimRequest`: union SimDatabase
  over all candidates (joins simOptions, requestId, candidateIndex).
  All three original suspects cleared — Step 7 may own its pool.
  Executor disposition adopted: take the union-db fix, revert the
  `< 33` → `< 2` guard relaxation for real arms. Steps 2/3/10 still
  unmeasured pending re-run.
- 2026-09-01 — Diagnoser final report: demonstrated the first successful
  `runConcurrentBulkSim` return from our pool (probe n=2, twice, all
  rows + baseline, isWasm true); panic surfaces only after queue drain
  (batch.ts:132-133), which mimicked a hang. Guard restored,
  instrumentation removed, no wowsims files touched. Operational notes:
  adaptive pass raised nominal 200 iters to 5,239 (budget arms); best
  slot has 29 candidates so n=32/33 arms need synthetic multi-slot
  candidate sets. Executor resumed for Steps 2→11 with the union-db
  obligation added to the Step-6 handoff.
- 2026-09-01 — Web execution round 3: Steps 1-9 COMPLETE and committed
  (fork 9f1fc7ef0 + ed88f07b5, outer f0f5883). Boundary fully measured:
  flip exactly 32→33 at 5,000 iters; n=33 silently truncates to 5 rows
  with dpsMetrics and NO error (A1-4 pre-registered expectation met) —
  the definitive case for the partitioner bound + row guard. Applied
  constant 25, measured 32 (A1-3 decision recorded). Executor
  self-flagged budget burned on poll-thrash → fresh finisher seat
  spawned for the 4-item finish list (arm 6 readout, Step 10 equivalence
  run + offline stats, Step 11 hook removal/verify/commits) with strict
  15-min-interval waiting discipline.
- 2026-09-01 — Original executor's final verification (after handoff):
  all six Step-2/3 arms complete and matching pre-registration (pool-1
  works serially — Off/1 refusal is policy, measured); BUT two late
  findings: (1) SHIPPED DEFECT — `rank.ts` `screenCandidates` passes the
  baseline-only SimDatabase (union obligation missed in the engine path;
  real ranking panics `No item with id: 28732`); (2) the `?bulkEquiv=1`
  dispatch is inert (isolated to the flag by controlled test; the
  worker-saturation theory was refuted and both calls ledgered).
  Finisher redirected: fix rank.ts union DB (PROVENANCE cycle) →
  fix/confirm equiv dispatch + end-to-end plain ranking → Step 10 →
  Step 11.
- 2026-09-01 — Seat overlap resolved: finisher fixed rank.ts
  (`composeForBulk`, union DB, CLI path byte-identical) and confirmed by
  live ranking; "inert dispatch" was a driving artifact (hidden Run
  button), no code change. The original executor then independently
  reviewed the fix and ran its PROVENANCE cycle (fork b8e7a566e, outer
  685c47d) while the equivalence run was live — stood down; finisher
  owns the tree, told to skip the redundant cycle and check for
  contention contamination of the run.
- 2026-09-01 — Step 10 run #3 LOST: the prior executor's
  fix-confirmation ranking navigated the shared browser tab away
  mid-equivalence-run (third loss: server death, re-navigation, tab
  takeover). No contaminated data — no data. Orchestrator granted the
  finisher exclusive machine+browser ownership until it reports: stop
  the stray ranking (its confirmation value already ledgered), re-run
  Step 10 start-to-finish. Process finding accepted for retro:
  hours-long browser runs need one named owner.
- 2026-09-01 — Step 10 COMPLETE (run #4, 124.9 min, owned machine, dump
  preserved): (a) PASS 220=220; (b) PASS ρ=0.999229; (d) PASS 0/8
  outside error bars; (c) MISS 88.89% vs 90% → dispositioned ACCEPTED
  by the orchestrator: at ranked-set size 9 the metric can only read
  88.89% or 100% (threshold unlandable), and all three disputed items
  agree between routes within combined 1σ — cutoff-boundary jitter
  below measurement error, not route disagreement. Two carry-forward
  tickets ordered: re-verify (c) with an expressible design +
  seed-jitter control; bulk 1.6x wall-clock at pool 4 (hypothesis:
  accuracy mismatch, 7,091 adaptive vs 5,000 flat — matched-accuracy
  measurement needed). Identical baselines to 16 digits across routes.
  Finisher proceeding to Step 11.
