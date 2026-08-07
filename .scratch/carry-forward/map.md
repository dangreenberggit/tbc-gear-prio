# Carry-forward

Tickets deferred from a feature-branch review so they survive the merge.
Convention: [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md).
List: `pnpm issues:open`. Gate: `pnpm merge-ready`.
Handing the open ones to workers: [`DELEGATION.md`](DELEGATION.md) — waves,
file contention, worker prompt. This file stays the chronological log.

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
- 38 — `slamaltman-offline.ts` and `report-events-offline.ts` build the same recordings and differ only in `route`, `confidence` and where talents come from. Filed 2026-08-06 from the `phase-2/resolution-and-fallback` review (standards, Duplicated Code). Not hypothetical: the two already disagreed once, the report-events builder hardcoding a ret talent split onto a protection capture, caught by the domain axis rather than a test
- 39 — `belowCutoff` (rank.ts, now also rewritten by paired replication) and `belowCutoffInView` (view.ts) derive the same fact by two paths, and nothing asserts they agree. Filed 2026-08-06 from the `phase-2/resolution-and-fallback` review. Latent while `CUTOFF` is constant; becomes live if ticket 36 resolves toward a relative cutoff
- 40 — fight resolution is not spec-aware: nothing calls `classifySpec` on the resolved fight, so a character who tanks or off-specs some nights can be simmed against the wrong preset and EP weights. Filed 2026-08-06 from `phase-2/resolution-and-fallback` (domain D1 fallout) plus user direction. Real, not hypothetical — ticket 04's first capture was slamaltman's protection night scored as ret. Needs a product decision on the no-matching-fight case; "assume their last fight is their spec" only works once the tool can sim that other spec
- 41 — the ranged slot offered two items and the worn one was not among them. Rewritten 2026-08-06 on `phase-2/feral` around the measurement it had only hypothesised, deleting two wrong causal claims. Cause was not "no db source records" (29 shipping ret rows have none either) but that `wowsims_curated_item_ids()` was read only to *label* rows already admitted, never to grant membership. Largely fixed on that branch — ranged slot 2→4 idols, worn-items-absent 24→14 across three characters — remainder open
- 42 — `map_db_source` emits `crafted.profession` as a raw proto enum number, so the shipped source reads `{"kind":"crafted","profession":"2"}` and reaches the UI as a literal `2`. Filed 2026-08-06 while collecting the feral Wowhead lists. Passes every gate because the union types the field as `string` and the build check only validates `kind`. Wowhead-sourced crafted rows are unaffected, so the same item can carry a good row and a numeric one depending on input
- 43 — random-suffix items ("of the Tiger") cannot be simmed: the pinned db stores only the base item, whose stat map is armour-only, so the three the feral P2 guide recommends will always score near-bottom. Filed 2026-08-06 while collecting the feral Wowhead lists. Per user steer, prefer surfacing "this slot cannot be simmed accurately" over synthesising stats; look at how wowsims models these first. `db.json` does ship a `randomSuffixes` array, so the data exists — untested whether upstream's approach transfers
- 44 — `poolEntryFromUniverse` takes `sources[0]`, which is whichever pipeline appended first (db, atlasloot, two-hop, sunmote, wowhead, curated), not the most actionable origin. Filed 2026-08-06 from the `phase-2/feral` review (adversarial A5). Pre-existing, but the new slashed-zone split makes an arbitrary pick between two equally true raids for multi-zone trash. Same root cause as 35, seen from the pool layer
- 45 — 87 of 627 collected Wowhead rows still parse to no source (zone-less quests, world drops, free-text zone drops), and `zoneKeyOf` renders a literal `unknown` bucket under `--group-by raid`. Filed 2026-08-06 from the `phase-2/feral` review. Much narrower than it was — that branch took feral p1-p2 from 18 unparsed to 7 and p3 from 20 to 2 — and no longer produces a *wrong* source, only an absent one, now that a test forbids a listed item shipping as `unknown`. A `{kind:"world"}` variant already exists and nothing emits it
