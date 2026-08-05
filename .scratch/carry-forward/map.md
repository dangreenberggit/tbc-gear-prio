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
- 2026-07-29 — Pre-merge review of phase-1/five-seed-spread (4 axes, Opus, fresh
  context). Fixed in review: silent candidate-sim swallow now disclosed as
  Substitution rows; Google Fonts removed from the "self-contained" HTML report;
  two durable-claim comments given re-runnable commands. Filed 19 (second
  adapter for GearSource/Store — PLAN §5 two-adapter rule unmet), 20 (meta gems
  ranked by EP but their stats are effect-blind), 21 (world-boss zone strings not
  canonicalised, wrong boss on 30730), 22 (rank.test.ts duplicates production and
  skips fillOptsForSwap), 23 (spec drift: fullPool, Deps shape, per-tier
  universes, setBonusNote), 24 (standards smells). Appended a blocker to 18
  (CASTER_ONLY_STATS includes SpellDamage, which ret EP prices at 0.17).
  PLAN §14 box 8 amended from "at 1 and at 2" to "two maxPhase values".
- 28 — p5 BiS items outside raid zones (Shard of Contempt et al); mechanism half-built, nothing emits a heroic source
- 29 — a `meta-unsolvable` throw strands its job row `running`; CLOSED 2026-08-04, one catch around the whole post-create body
- 30 — the §14 ViewOptions gate box; re-filed 2026-08-04 `Blocks: phase-2` (it is a Phase 2 box, and `applyView` is unimplemented — not a missing test)
- 31 — `SqliteStore` job ids from `SELECT COUNT(*)` race two writers and reuse ids after a delete; `kv` omits §11's `created_at`. Filed 2026-08-05 from the `phase-2/caches` review, `Blocks: phase-4` — ticket 01 scoped the adapter without deployment, and `MemoryStore` is still the only adapter with a production call site
- 32 — nothing reads `rateLimitData`, so §14 Phase 4's "point budget survives expected concurrency" box has no instrument behind it. Filed 2026-08-05 from the `phase-2/caches` review; blocked in practice on the WCL adapter existing (§5.1)
