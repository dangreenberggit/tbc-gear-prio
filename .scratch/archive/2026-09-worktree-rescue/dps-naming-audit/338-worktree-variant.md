# 338 — Mirror the dps→metric rename to the fork engine copy (or resolve the copy relationship)

Status: open
Origin: pre-merge review of `claude/dps-naming-audit-d26eb7` (F1); stage-gate `dps-naming-neutralize`
Blocks: —

## What

The branch `claude/dps-naming-audit-d26eb7` neutralized DPS-baked names to `metric`
vocabulary in the canonical engine `packages/core/src` (`SimObservation.dps`→`value`,
`deltaDps`→`deltaMetric`, `DpsSample`→`MetricSample`, `Cutoff.absDps`→`absValue`,
`setBonusNoiseFloorDps`→`setBonusNoiseFloorMetric`, the set-bonus trio, etc.).

The engine exists **twice**: the canonical `packages/core/src` and a copy inside the
fork at `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/`
(gitignored; absent from the `dps-naming-audit` worktree). The rename landed in the
canonical copy only. The fork copy now **diverges** in vocabulary.

Because `vendor/` is absent from that worktree, the vendor-gated `*:check` scripts and
`packages/core/test/wowsims-fork-parity.test.ts` could NOT run there — the divergence
is currently unverified against the parity gate.

## Resolve by EITHER

1. **Mirror the rename** — apply the same `metric`-vocabulary rename to the fork engine
   copy in the **main checkout** (where `vendor/tbc-new-fork` exists), update
   `engine/PROVENANCE.md` hashes, and re-run the fork-parity test
   (`wowsims-fork-parity.test.ts`, "E-W3") + the vendor-gated `engine-port-drift:check`
   / `fork-universes:check` to green. This pays the rename twice, as the audit warned.

2. **Resolve the copy relationship** (preferred long-term) — make the fork consume
   `@tbc-gear-prio/core` as a package instead of copying the engine, per ADR-0027 and
   `docs/plans/all-wowsims-specs/foundation.md` §5. Then the rename is single-source and
   this whole class of divergence disappears.

## Before merging `claude/dps-naming-audit-d26eb7` to anything the fork builds on

Run the fork-parity test and vendor-gated checks from the **main checkout** (they skip
cleanly when `vendor/` is absent, so they are green-by-skip in the audit worktree — that
is not proof). Confirm the parity gate passes there, or that the branch does not yet
need the fork copy in sync.

## Source

- Review: `docs/reviews/claude-dps-naming-audit-d26eb7.md` (Summary → carry-forward caveat)
- Execution report: `.scratch/stage-gate/dps-naming-neutralize/execution-report.md` (F1)
- Audit two-copy note: `docs/plans/all-wowsims-specs/dps-naming-audit.md` §1, §5;
  `foundation.md` §5
