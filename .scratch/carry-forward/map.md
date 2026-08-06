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
- 33 — the hit-cap banner is blind to talent hit: the pinned ret preset takes 3/3 Precision (~47 rating), so the fixture character reads 72 of ~142 from gear but sits near 119, understating the shortfall ~2.5×. Filed 2026-08-05 from the `phase-2/disclosure-and-caps` review. `talentsString` is already in the composed request, so the talent half needs no new seam
- 34 — `pnpm verify` never typechecks the test suite (`packages/core/tsconfig.json` includes only `src/**`), which is how an invalid `Race` literal shipped green and asserted itself tautologically. Filed 2026-08-05 from the `phase-2/disclosure-and-caps` review; 18 pre-existing errors across 3 test files
- 35 — `groupBy: 'raid'` buckets a multi-zone item by whichever zone-bearing source comes first in the universe JSON, so the bucket depends on array order. Filed 2026-08-05 from the `phase-2/apply-view` review. Measured: 0 multi-zone entries in `ret-p2.json`, 5 in `ret-p3/p4/p5.json`, so it is unreachable at the current default tier; the fix needs a Phase 3 display decision (appear twice, or one stated rule)
- 36 — §12 says the cutoff applies "within the filtered view", but `CUTOFF` is absolute so the recomputation in `applyView` can never change a value. Filed 2026-08-05 from the `phase-2/apply-view` review (adversarial A3). Either §12 is amended to say absolute, or a relative cutoff is specified — reading 2 collides with §2's "no view changes a number", so the shipped behaviour is the conservative choice, not an oversight
- 37 — the tier-piece hardening test asserted token `zone` but never `boss`/`token`, and 45 hand-written `ItemSource` literals across the test suite are cross-checked against nothing. Filed 2026-08-05 from the `phase-2/apply-view` review, after a fixture paired the gloves token with Prince Malchezaar (he drops the *helm* token; gloves are The Curator). The curated data was never at fault — `data/two-hop/ret-tokens.json` is well sourced and the universes agree with it on zone, boss and token name. Guard half fixed on that branch; fixture hygiene open
