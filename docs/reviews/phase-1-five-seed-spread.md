# Pre-merge review — phase-1/five-seed-spread

Diffed against: `dev...phase-1/five-seed-spread` (`e50996f`)

**Dispatch:** Cursor sharp lane = Grok high-fast (`cursor-grok-4.5-high-fast`);
no `codex` on PATH. Axes: adversarial ([retry](e059b255-0af6-45a1-8877-c0171bede63e)),
domain ([Domain](2a1ed3cf-bbfa-464f-ad6b-65ffa7fe5926)),
standards ([Standards](2af54b45-de15-45fd-a247-b6e0c379f082)),
spec ([Spec](dcd4c2c0-5520-4f77-a543-4e1451ee972f)). Fresh subagents; first adversarial
spawn stalled and was retried.

## Adversarial

1. **`rank.ts` baseline meta-repair vs candidate `gems: []`** — Baseline runs
   `repairMeta`; `swapItemAt` hardcodes empty gems and never re-repairs. Socketed
   / meta-relevant swaps produce confidently wrong ΔDPS with no error (PLAN §9
   worst case). Seam tests encode the empty-gems path.
2. **`poolFromUniverse` → `sources[0]`** — `--raid` misses alternate zones on
   multi-source rows (e.g. Crystalforge `30129`, dual-zone trash).
3. **`RankedItem.se = stdev` with `seMethod: "independent"`** — ~50× scale mismatch
   vs true SE of the mean.
4. **Wowhead typo zone** `Maghteridon's Lair` ingested on girdle `28779` (low blast
   after `sources[0]` discard; proves unvalidated zone strings).

## Domain

1. **Same as adversarial (1)** — candidates ungembed / without meta repair;
   contradicts PLAN §9 “applied identically to baseline and every candidate.”
2. **CLI `maxPhase: 2` literal** — does not read `data/wowsims.lock.json`
   `currentPhase` / `defaultMaxPhase` (verification-log / lock comment).
3. **Aligned:** R17 slot map, enchant vs temporaryEnchant omit, race assumption,
   talent-tree spec (not WCL name), offline actor-name match.
4. **Unverified (soft):** `FightSummary.route` / `confidence`;
   `data/phase_raids.json` phase table not in phase0-findings; disclosure wording
   “temporaryEnchant (effect id)” vs consumables namespace.

## Standards + Spec

### Standards

- **Hard:** `rank.test.ts` asserts full `Progress` stage sequence — banned stage
  internals (`AGENTS.md` Testing).
- **Judgement:** WHAT-ish JSDocs; duplicated `map_source` / slot maps across Python
  scripts; intentional D7 vs plate-only eligibility fork; unused `store`/`clock`
  deps; thin `filterPoolByZone` alias.

### Spec

- **Rank path matches** “EP ≠ membership / sim is authority”: no `prefilterPool`,
  universes 224/347, report-time `--raid`, `curationHint` unused at rank.
- **Missing / partial:** raid-recipe crafts two-hop; BiS tag _population_;
  `generate_pool.py` still EP top-N / plate-only alongside universes (S4 “no EP
  membership anywhere”); `sources[]` collapsed; crafted `recipeZone` type missing.
- **Documented deferrals (not silent fails):** `30257`, 12/36 wowsims curated IDs
  as `it.todo`.

## Summary

Raid-scoped pool formation and rank wiring landed on this tip and `pnpm verify`
is green. The branch is **not** safe to treat as a correct upgrade ranker yet:
candidate sims strip gems (silent wrong ΔDPS), `se` is mis-scaled, and `--raid`
can hide multi-zone items. Several redesign follow-ons (retire EP generator, BiS
tags, raid-recipe crafts) remain open by design.

## Disposition

| ID      | Axis                 | Disposition | Ticket / note                                                        |
| ------- | -------------------- | ----------- | -------------------------------------------------------------------- |
| A1 / D1 | Adversarial / Domain | fixed       | Salvaged gem fill + post-swap repair; ticket 06 resolved             |
| A2      | Adversarial          | fixed       | Multi-source zone filter; ticket 08 resolved                         |
| A3      | Adversarial          | fixed       | `se = stdev/√n`; ticket 07 resolved                                  |
| A4      | Adversarial          | fixed       | Seam asserts gem fill; ticket 06 resolved                            |
| A5      | Adversarial          | wontfix     | Typo zone low blast; fix opportunistically with Wowhead list refresh |
| D2      | Domain               | fixed       | CLI default from lock; ticket 09 resolved                            |
| D3–D5   | Domain               | wontfix     | Soft unverified / wording; not land blockers                         |
| St1     | Standards            | defer       | `.scratch/carry-forward/issues/10-rank-test-stage-order.md`          |
| St2–St6 | Standards            | wontfix     | Comment/smell judgement calls; D7 fork intentional until 11          |
| Sp1–Sp3 | Spec                 | defer       | `.scratch/carry-forward/issues/11-retire-ep-generate-pool.md`        |
| Sp4     | Spec                 | fixed       | Same as A2; ticket 08 resolved                                       |
| Sp5     | Spec                 | defer       | `.scratch/carry-forward/issues/11-retire-ep-generate-pool.md`        |
| Sp6     | Spec                 | wontfix     | Documented `it.todo` source gaps (30257 / 12-of-36)                  |
