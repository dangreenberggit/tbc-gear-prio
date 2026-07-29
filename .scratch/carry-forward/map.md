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
- 2026-07-28 — Resolved 10–11 (stage-order test; EP path demoted). Split
  bisTags → 12, raid-recipe crafts → 13. Land blocker scan limited to
  `.scratch/carry-forward/issues/` (no nested worktree copies).
- 2026-07-28 — Resolved 05: CI run 30409397254 showed Linux vs Windows
  empty-JSDoc trailing-space drift; normalize after `buf generate`.
- 2026-07-28 — Filed 14 (carry missing enchant on candidate swap) from
  user review of post gem-preserve P3 rank.
- 2026-07-28 — Candidate swaps migrate worn gems (UI-style) then EP-fill
  only empty sockets. Filed 15 (enchantAppliesToItem parity).
- 2026-07-28 — Resolved 16: race defaults from raid-sim skeleton (ret P2
  Blood Elf), not hardcoded Human. Dig: sim-settings-gap-dig.md.
- 2026-07-28 — Planner review of raid-scoped impl: deleted legacy EP pool
  files/scripts (defects 1–2; finishes 11). Filed 17 (phase-2+ no-source
  gap) and 18 (universe recall / junk-filter measurement).
