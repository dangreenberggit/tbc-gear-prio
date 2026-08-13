# Fan-in brief — issue-1 upstream gem cleanup

Delegator session brief. Survives compaction; a merger can work from this alone plus worker handoffs.

## Base

- Feature branch: `feat/set-bonus-value`
- Base SHA (all workers must assert): `3f5e21bbeb498a7f87259d0ba2b52e3e5f77672f`
- Spawned: 2026-08-12

## Partition and path ownership

| Slice | Branch (expected) | pathsAllowed | pathsForbidden |
| --- | --- | --- | --- |
| A gem-fixes (README steps 1–5, 7) | `wt/issue1-gem-fixes` | `packages/core/src/meta-repair.ts`, `packages/core/src/candidate-gems.ts`, `packages/core/src/rank.ts`, `packages/core/src/meta.ts`, `packages/core/src/gems.ts`, `packages/core/test/**` (except cutoff tests) | `cutoff.ts`, `scripts/**`, `data/**`, `package.json`, lockfiles, `packages/*/src/index.ts` |
| B guard-rails (README step 8) | `wt/issue1-guard-rails` | `scripts/sync_wowsims.py`, `scripts/build_feral_skeleton.py`, `data/wowsims.lock.json`, tests for those scripts | `packages/**`, `package.json`, lockfiles |
| C feral-noise-floor (README step 0) | `wt/issue1-feral-noise` | `scripts/five_seed_spread.py`, `docs/five-seed-spread*`, `packages/core/src/cutoff.ts` + cutoff tests | all other `packages/**`, `data/**`, `package.json`, lockfiles |

Delegator holds: step 6 spike note, step 9 doc corrections + ADR-0025 (after merge), ticket triage, pre-merge-review.

Barrel `packages/core/src/index.ts`: owned by delegator; workers state needed export lines verbatim in handoff.

## Conflict policy

- Merge order: A, then B, then C (A largest; C's cutoff change is isolated).
- Any same-file conflict: delegator resolves (editorial fan-in — claims must be checked against README acceptance).
- Acceptance for gem work: PLAN.md §9 — repair not re-optimize, socket-bonus cost priced inside the cost function, every adjustment disclosed as a substitution.

## Claims to re-check at fan-in

- A: socket-match fix measured on ≥2 real characters before/after (command in handoff, re-runnable).
- A: both `rank.ts` abort sites fixed (baseline + per-candidate).
- A: ticket 114 closed with type guard test.
- B: sync script fails loudly on empty vendor/; unknown-APL-field gate rejects `timeToNextEnergyTick` under pinned schema.
- C: feral cutoff derived from an actual five-seed run (artifact committed), not extrapolated from ret.

## Worker status

- C **done** (2026-08-12): branch `wt/issue1-feral-noise`, commits `8eeb40c` + `53aa0e3`. Feral cutoff derived: 3.6 dps / 0.15% (ret 3.4 unchanged; feral mean SE 1.774 vs ret 1.678, `docs/five-seed-spread-feral.json`, rerun via `python scripts/five_seed_spread.py --spec feral` (was `five_seed_spread_feral.py`, folded into `--spec` by ticket 136 item 4) after `pnpm fetch:wowsimcli` + `python scripts/compose_feral_raid_sim.py`). Fan-in obligations: apply barrel line `export { CUTOFF_FERAL, cutoffForSpec } from "./cutoff.js";` to `packages/core/src/index.ts`; wire `cutoffForSpec` into `rank.ts`/`view.ts`/`cli.ts` AFTER merging A (or ticket it) — nothing calls it yet, so feral still ranks at 3.4 until wired.
- B **done** (2026-08-12): branch `wt/issue1-guard-rails`, commits `4869a87` + `8ef48cc`. `--ref`/`--watch-ref` modes + empty-vendor refusal (exit 2) in `sync_wowsims.py`; `watchedRefs["feature/backend-reforge"]` seeded `d09edaaf8` (as given, not re-verified live — rerun `python scripts/sync_wowsims.py --check`); `apl_schema.py` gate in `build_feral_skeleton.py` rejects `timeToNextEnergyTick`, accepts real ret APL. Fan-in obligations: wire `scripts/check_sync_wowsims.py` and `scripts/check_build_feral_skeleton.py` into `package.json` verify chain (delegator owns the manifest).
- A: in flight.

## After fan-in

Teardown worktrees → `pnpm verify` on integrated tip → delegator does steps 6, 9 → triage tickets 111,107,103,29,20,06,04 (recheck 103 after regem-minimization) → `pre-merge-review` → ask user before `pnpm land`.
