# Archive — July 2026

**Historical record. Not current guidance. Do not act on anything in here
without re-checking it against the tree.**

These are investigation write-ups and review verdicts from Phase 0/1 work,
moved out of `.scratch/handoffs/` on 2026-08-04 so they stop mingling with
live handoffs. Every file is dated in its own header. Several describe
pipelines, pools or scripts that have since been **deleted or redesigned** —
a file here describing how something works is evidence of how it worked *that
week*, not a spec.

Kept because the measurements and domain verdicts cost real sim time to
produce and are cited elsewhere. Where a claim here matters, the current
source of truth is `PLAN.md`, `docs/verification-log.md`,
`docs/phase0-findings.md`, or `docs/plans/`.

## What's in here

| Group | Files | What it is |
| --- | --- | --- |
| Upstream comparison | `wowsims-cli-vs-ui-sim-path.md` | 2026-07-28. How our `wowsimcli` path differs from wowsims' own UI sim path. Substantially superseded by [`docs/plans/wowsims-reuse/`](../../../docs/plans/wowsims-reuse/README.md) and [`docs/plans/compute-topology.md`](../../../docs/plans/compute-topology.md) |
| Pool redesign | `pool-redesign/` (8 files) | Options A/B, math and SME reviews, a manager-stall postmortem, and `ep-vs-sim-measurement.md` — the ρ measurement behind the EP work. See [`docs/plans/ep-weights-from-sim.md`](../../../docs/plans/ep-weights-from-sim.md) |
| SME rank verdicts | `sme-rank-judgment-p3*.md`, `sme-loop-*-review*.md` | Domain judgments on real rank output across four loops |
| Diagnoses | `belt-delta-investigation.md`, `same-item-delta-diagnosis.md`, `sim-settings-gap-dig.md` | Specific bug hunts, with method and conclusion |
| Pool/universe audits | `pool-composition-audit.md`, `candidates-origin*.md`, `phase1-gate-wowsims-comparison.md`, `raid-scoped-pool-*.md`, `pool-redesign-external-brief.md` | How the candidate pool was composed and checked |

## Superseded / known-stale

- **`ep-vs-sim-measurement.md`** — measured against a pool pipeline that was
  later deleted. The correlation figure is not a current fact about the tree.
- **Anything describing `generate_pool.py` or a single curated pool** —
  replaced by per-tier universes (`scripts/assemble_universe.py`,
  `data/universes/`).
- **`sme-loop-*` fix plans** were deliberately *not* archived; the fixes
  landed and the plans are noise.
