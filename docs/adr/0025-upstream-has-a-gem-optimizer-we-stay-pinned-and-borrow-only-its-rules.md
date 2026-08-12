# ADR-0025 — Upstream has a gem optimizer; we stay pinned and borrow only its rules

**Status:** accepted
**Date:** 2026-08-12
**Relates to:** PLAN.md §9 (gem and enchant policy), §8 (upstream pin)
**Tickets:** [issue #1](https://github.com/dangreenberggit/tbc-gear-prio/issues/1) (canonical record);
`.scratch/handoffs/issue-1-upstream-gem-cleanup/` (snapshots and worker handoffs)
**Origin:** Phase 2's gem repair was built on the belief "there is no upstream
optimizer to borrow" (PLAN.md §9, now corrected)

## Context

Phase 2 built its own meta-gem repair because we believed upstream wowsims had
no gem optimizer. That belief was false twice over:

1. The optimizer exists, named `suggest_reforges` — TBC has no reforging; the
   component name is inherited from a later-expansion codebase.
2. Its active development lives on the `feature/backend-reforge` branch, not on
   the tag we pin. Checking only the pinned tree — and, worse, checking a
   worktree whose gitignored `vendor/` was simply empty — made "the source
   isn't here" read as "the feature doesn't exist".

Comparing our shipped code against upstream's (branch head `d09edaaf8`, fetched
2026-08-12, clean fast-forward from the pinned tag) found real bugs in ours,
one in theirs, and a trap for the next re-pin. All facts below are as of
`wowsims/tbc-new` @ v0.0.101 (`8aa378b3`) unless stamped otherwise.

## Decision

1. **Stay pinned to tag `v0.0.101` for building.** The branch is reference
   material only. Re-pin when upstream tags a release (checklist:
   `.scratch/handoffs/issue-1-upstream-gem-cleanup/impact-comment.md`, bottom).
2. **Keep our repair pass ours** (repair, not re-optimize — PLAN.md §9
   acceptance unchanged). Upstream's `socketBonusActive`
   (`sim/core/reforge_optimizer/gear.go`) is an oracle to compare predicates
   against, not a dependency.
3. **Adopt upstream's socket-bonus rule where ours was wrong:** an unfilled
   meta socket does not break an item's socket bonus; only coloured sockets
   gate it. Fixed in `socketsMatch` (`meta-repair.ts`) and `allSocketsMatched`
   (`candidate-gems.ts`), with tests. One deliberate divergence from
   upstream's unconditional skip: an item whose sockets are meta-only (11 in
   db.json) requires that socket filled, else the bonus is credited vacuously
   (round-4 review, D1). Blast-radius check: re-running
   `npx tsx packages/core/src/cli.ts --region US --realm dreamscythe --character <slamaltman|shredzepelin|nexess> --offline --spec <ret|feral> --show-below-cutoff`
   before and after the predicate change produced byte-identical rankings on
   all three committed fixtures — a **null result**: every worn meta there was
   already active and none of the three wears a meta-only-socket item, so this
   exercises neither changed branch. No committed fixture currently does.
4. **Keep our prismatic rule where upstream is wrong:** prismatic gems count
   toward all three meta colours (game rule); upstream counts them as nothing.
   Pinned by comment and tests at the prismatic mapping in `meta.ts`. Low
   impact either way — both prismatic gems are resistance-only (zero EP), so
   the solver never picks them.
5. **Guard the connection to upstream** so this class of wrong belief fails
   loudly next time: `sync_wowsims.py` refuses an empty `vendor/` (exit 2) and
   gained `--ref`/`--watch-ref`; `feature/backend-reforge` is a watched ref in
   `data/wowsims.lock.json`; `build_feral_skeleton.py` rejects APL fields
   unknown to the pinned protos, because the pinned binary silently discards
   them (`DiscardUnknown: true`) — upstream's new feral rotation uses
   `timeToNextEnergyTick`, which our pin does not have, and without the gate a
   regen would produce plausible wrong numbers with no signal. Both gates run
   in `pnpm verify`.

## Consequences

- PLAN.md §9's opening keeps its true half (the Go sim does not enforce meta
  activation) and drops the false half (no upstream optimizer to borrow).
- Rot-prone upstream claims in durable artifacts carry an
  "as of `wowsims/tbc-new` @ v0.0.101 (`8aa378b3`)" stamp; drift on the
  watched branch surfaces in `python scripts/sync_wowsims.py --check` instead
  of in someone's memory.
- The regem-minimization pass, error split (infeasible vs step-budget), and
  quality-cap chokepoint shipped alongside this correction are implementation
  fixes recorded in the issue-1 handoffs, not decisions of this ADR.
- Optionally file the prismatic bug upstream; nothing here depends on it.
