Status: open
Type: plan defect
Origin: ticket 156 setup (2026-08-15) — read against the fork engine at 3e64016dd
Blocks: none
Blocked by: none

# The tab's candidate pool is the whole universe, not an EP-prefiltered ~80

Plan §5 (`docs/plans/wowsims-tab/plan.md:252-254`) budgets a run as "baseline
+ ~80 candidates after the prefilter" and §2.5/§5 describe EP weights as
gating "the prefilter and gem fill". The fork engine does not prefilter.
`engine/rank.ts` applies only `phase <= maxPhase` and one hardcoded legendary
exclusion (`engine/rank.ts:379-381`, `engine/pool.ts:133-137`); `epWeights`
feeds `gemContext` and `repairAndMinimize` (gem palette, gem fill, meta
repair) and the cache key — grep `epWeights` in `engine/rank.ts` finds no
selection use. So a ret run sims the entire phase-eligible universe: ret-p2
240 rows through ret-p5 534, plus ~36 replication sims from five seeds.

Consequences:

- Every "candidate count" and wall-clock budget in plan §5 and D7's
  iteration default is off by 3-7x. Ticket 156's "20-candidate batch" cannot
  be run as written — the Upgrades tab has no candidate cap (three controls:
  Run, Iterations, Import; verified against the live DOM 2026-08-15).
- Explanations that say EP weights "gate the prefilter" (plan §2.5, §5;
  ticket 162; several chat summaries) overstate EP's role. EP affects gem
  fill and within-slot ordering, never which items are simmed.
- If a prefilter is wanted, it is a design change (PLAN.md §5 seam rules:
  discussed here first, applied to both engine copies), not a fix.

Ticket 156's 2026-08-15 "READY TO MEASURE" comment carries the DOM-level
evidence (the tab's three controls, selectors, universe sizes, replication
arithmetic) and the two measurement routes; read it before touching this.

## Plan

`docs/plans/wowsims-tab/candidate-pool.md` (2026-08-15) carries the design,
test plan, orchestration and review plan for this ticket. Summary: M0 fix
the docs; E-W5 measure per-request overhead; M1 candidate cap + parallel
candidates + EP ordering; M2 sim-based racing as the gate (`fullPool` goes
live with it, closing ADR-0018's deferral); M3 EP prefilter only as a
fallback. Ticket 156's recipe is rewritten once M1 gives the tab a cap.

## Done when

Plan §5 and §2.5 are corrected to describe what the engine does; ticket 156's
recipe is rewritten around an achievable run (full universe at the lowest
phase, normalized per candidate — or upstream's Batch tab, which CAN be capped
at 20, noting it is a different code path); and a decision is recorded on
whether a candidate cap/prefilter should exist at all.
