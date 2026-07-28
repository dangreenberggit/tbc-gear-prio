# Carry-forward

Tickets deferred from a feature-branch review so they survive the merge.
Convention: [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md).
List: `pnpm issues:open`. Gate: `pnpm merge-ready`.

## Decisions-so-far

- 2026-07-26 — Created from `docs/reviews/phase-0-close-gates.md`. Cheap fixes
  landed on `phase-0/close-gates`; the rest `Blocks: phase-1`.
- 2026-07-26 — Landing is `pnpm land` only. Open `Blocks: phase-N` tickets
  require `--ack-open-blockers` (or close/re-block), not path-in-review theater.
- 2026-07-28 — From `docs/reviews/phase-1-five-seed-spread.md`: filed 06
  (candidate ungemmed swaps), 07 (se vs stdev), 08 (sources[0] raid view),
  09 (CLI maxPhase from lock), 10 (stage-order test), 11 (retire EP generate
  path / BiS / crafts).
- 2026-07-28 — Resolved 06–09 after stash salvage gem fill + follow-up
  fixes (independent SE, multi-source raid filter, lock-file maxPhase).
