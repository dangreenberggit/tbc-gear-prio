Status: closed
Type: task
Origin: docs/fork-tab-native-bulk-sim-finding.md (investigation 2026-08-31)
Blocks: none
Blocked by: 341 (set-bonus-vs-tournament question must be answered first)

# Use wowsims' native bulk sim (tournament) for the BiS-prune mode

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

This is the one real "actually use wowsims' bulk sim" opportunity the
investigation found. For the tab's **BiS-prune mode** (a small curated
best-in-slot pool, ~16-27 items), wowsims' native bulk sim (the "tournament")
**fits** — unlike the full rank-everything view.

Verified (`docs/fork-tab-native-bulk-sim-finding.md`, sourced there):

- For a pool that small the tournament **does not cull** — pools under 20 take a
  single-stage path (`sim/core/bulk/estimate.go:7-18`); culling stages only
  trigger above survivor caps of 100 then 25 (`stage.go:24-59`). Set the
  `top_results` knob (`bulk_sim.go:86-89`; hardcoded 5 at `ui/core/sim.ts:552`,
  overridable in our adapter) to the pool size → every item returns with its
  number.
- Inputs/outputs line up: request takes current gear as baseline and sims it;
  each result carries candidate DPS + baseline DPS (`proto/api.proto:758-771`), so
  **item gain = candidate DPS − baseline DPS** by subtraction, per item.
  Candidates can be "current gear, one slot swapped" — our exact unit.
- Bonus: in this mode the tournament brings adaptive iterations + paired variance
  reduction for free — possibly MORE efficient than our flat pass.

## The caveat (shared with our own pass)

The tournament sims candidates **as handed to it** — it will not repair gems/meta
on a swap. We repair candidates *before* feeding, which our own pass already does.
(Re-optimizing gems is the separate reforge question — ticket 343.)

## Why blocked by 341

Whether the tab can show **set bonuses** while routing a mode through the
tournament is the open question (ticket 341). Set-bonus math within a single
candidate works (each candidate is a full gear set), but cross-candidate set
context may not survive. Settle 341 before designing how far 340 goes.

## Approach

- Confirm the small-pool no-cull behavior holds on our actual BiS universes
  (~16-27 items) — count tagged entries per spec, check against the stage
  thresholds.
- Design an adapter that builds one-swap `EquipmentSpec` candidates, sets
  `top_results >= pool size`, calls the in-browser tournament, and maps its
  result back to our per-item gain rows. Fork code only; no shared edits.
- Decide: does BiS mode route through the tournament (gaining its efficiency), or
  stay on our flat pass? Measure both.

## Acceptance

Decision report: `.scratch/stage-gate/340-tournament-route/report.md` (gitignored).

- [x] 341 answered.
- [x] Small-pool no-cull behavior confirmed on our real BiS pools, with numbers.
      All 44 universes take the single-stage no-cull path; the 10 at/above the
      20 floor are caught by the cost-estimate branch, not the floor, so
      `use_legacy_bulk_sim` is never needed. Report section Q1.
- [x] A measured comparison: tournament vs our flat pass for BiS mode (accuracy,
      speed, and whether every needed row/number is present). Accuracy 100%
      agreement within 3 combined SEs on three universes; every row returned at
      BiS sizes; iterations 1.7x-7.2x MORE expensive than the flat pass.
      Report section Q2 (three-baseline table + agreement table).
- [x] A decision recorded with reasoning. Verdict: direction 1 answered NO -
      do not route through the bulk sim; move to ticket 339. Report section Verdict.

## Resolution

The ticket's own verdict stands: do not route BiS-prune through the flat
tournament. Cost is a wash at matched accuracy, and the tournament culls to
20 rows for the 212-candidate pool tried, erasing whole slots (head,
shoulder, hands, and trinket1 returned zero rows); `MinSurvivors` has no
proto/request knob to widen it.

What got built instead, on `feat/upgrades-tab-batch-sim`: chunked screening
at 25 candidates per request through the native bulk engine, kept below
both engines' measured 32/33 no-cull-to-cull flip at 5,000 iterations. This
ships **default ON** for the local Go server (9.35s per 25-candidate
chunk over HTTP) and **default OFF** on web/WASM (332s per chunk, no row
streaming before the chunk completes — the loop runner is used there
instead; ticket 346 is the revisit trigger for the WASM path). See
`docs/reviews/feat-upgrades-tab-batch-sim.md` and
`.scratch/stage-gate/batch-sim-web-local/decision-log.md`.
