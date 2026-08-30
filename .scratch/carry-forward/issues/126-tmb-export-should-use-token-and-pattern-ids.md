Status: resolved
Type: feature
Origin: owner request, 2026-08-12
Blocks: none
Blocked by: none

# TMB export should use token and pattern ids, not gear ids

The report's JSON export exists specifically for thatsmybis.com (TMB) loot
lists. TMB tracks what actually drops in the raid. For most items that is
the item itself, but two groups differ:

1. **Tier pieces.** A tier item (e.g. Thunderheart Pauldrons) does not drop
   in the raid — a class token drops (e.g. Pauldrons of the Forgotten
   Conqueror from Mother Shahraz), and the player buys the gear with it. The
   export currently emits the gear item's id; for TMB it should emit the
   token's id.
2. **Craftable items** (probably — same logic, niche case). If a craftable
   is on the list, the thing that drops is the *pattern*, so the export
   should emit the pattern's id. Confirm TMB actually tracks patterns this
   way before building; if it doesn't, note that in this ticket and skip.

## What is needed

- A mapping from tier item id → token item id (and which boss drops it,
  if cheap). Check whether `vendor/wowsims/db.json` carries token/vendor
  relationships; if not, this may be a small vendored data addition under
  the data-pipeline-work rules. Same question for pattern ids on craftables.
- The export keeps its current shape (`{"items":[{"id":…}]}`) and display
  order; only the ids change for the two groups above. Keep the plain
  gear-id export available too (either a second button or a toggle) so the
  wowsims-shaped use isn't lost.
- The export panel's caption must say which flavour it is emitting.

Nothing here changes ranking or sims — export-layer only.

## 2026-08-29 — measured; the data exists but the fix crosses the tab boundary (FLAGGED)

Ran the measure-first gate (stage-gate F2). Findings, each with a re-runnable
command:

**The mapping data exists** (C15's "no usable token data" is refuted):

- Tier piece → token item id: `data/two-hop/<spec>-tokens.json` (11 specs), each
  `{spec, kind:"token-map", entries:[{pieceId, pieceName, tokenId, tokenName, zone, boss}]}`.
  e.g. `ret-tokens.json` maps pieceId 30990 (Lightbringer Breastplate) → tokenId
  31089. Verify: `python -c "import json;print(json.load(open('data/two-hop/ret-tokens.json'))['entries'][0])"`.
- Craftable → pattern item id: `data/two-hop/raid-recipes.json`
  (`kind:"raid-recipe-map"`, entries `{productId, recipeId, ...}` where `recipeId`
  IS the pattern item id). So the pattern-id half of the ticket is buildable — TMB
  tracking of patterns still needs owner confirmation per the ticket, but the id
  is available if wanted.

**db.json does NOT carry these relations** (the ticket's first guess): its item
`sources` vocabulary is exactly `crafted {profession, spellId}` / `drop {npcId,
zoneId}` / `rep`. Zero `token`/`tier` keys; tier pieces have empty `sources`.
Verify: `grep -c "Forgotten Conqueror" vendor/wowsims/db.json` → 0.

**Neither tokenId nor recipeId is threaded into the universe/pool today.**
`scripts/assemble_universe.py` reads the token map (line ~2447) but keeps only
`tokenName` (dropping `tokenId`); it reads the recipe map (~2274) but keeps only
`zone`/`boss` (dropping `recipeId`). The `ItemSource` type (`pool.ts:34,48`) has
no tokenId/recipeId field. So the ids reach neither the report nor the tab today.

**Why this is flagged, not done in Execution A:**

- The **report half** (CLI/Node) CAN be done export-layer-only: `wowsimsItemIdsJson`
  (`rank-report-rules.ts:452`) has `meta.spec` available and could `loadJson` the
  token/recipe maps and remap itemId→tokenId / craftable→recipeId. That stays
  inside the export builder — no universe regen.
- The **tab half** (browser) CANNOT: `updateExport` (`upgrades_tab.tsx:1990`) reads
  ids off the rendered DOM, cannot fs-read `data/`, and neither tokenId nor recipeId
  (nor even the token name) is in the chip attributes or the bundled `.universe.json`.
  Emitting token/pattern ids from the tab **requires** adding `tokenId`/`recipeId`
  at assemble time (`assemble_universe.py`) and **regenerating all universe files**
  plus the fork's bundled copies — a data-pipeline change across the executor's
  Paths manifest, and it collides with the pre-existing fork-universes formatting
  drift (see the execution report).

The ticket wants BOTH exports to emit the same ids; a report-only fix would make
the two diverge (report=tokens, tab=gear ids), which is worse for the primary
product (ADR-0027: the tab is primary). The clean fix is the assemble-time route
(both sides read the id from the regenerated universe). That crosses the manifest
boundary and was NOT executed here — per the stage-gate F2 amendment, do not
hand-build a partial. **126 stays open** for a data-pipeline pass that: adds
`tokenId` (and optionally `recipeId`, pending TMB-pattern confirmation) to the
token/recipe sources in `assemble_universe.py`, regenerates universes + fork
bundled copies, threads the id through `ItemSource`/the export on both sides,
keeps the plain gear-id flavour, and captions which flavour is shown.

## 2026-08-29 — RESOLVED (stage-gate wowsims-tab-tickets, Execution C)

The data-pipeline pass above was executed. What shipped, tier-token half in
full, pattern half deliberately deferred:

**Tier tokens — done both paths.**
- `assemble_universe.py` now carries each tier piece's `tokenId` (from
  `data/two-hop/<spec>-tokens.json`) onto its `token` `ItemSource`. `tokenId`
  added to the `token` variant in `packages/core/src/pool.ts`. All committed
  universes regenerated: 635 `tokenId` fields added, no membership/other
  content change (`git diff --ignore-cr-at-eol` over `data/` shows only
  `+"tokenId"` lines). Generator deterministic (two runs cmp-identical).
- **Report path:** `wowsimsTmbItemIdsJson` (+ `tokenIdForExport`) in
  `packages/core/src/rank-report-rules.ts` emits the token id for tier rows,
  gear id otherwise; the gear-id `wowsimsItemIdsJson` stays. Pure unit test
  with a **whole-tier-set** assertion (all 18 ret pieces → their token ids,
  read from the data file) in `packages/core/test/rank-report.test.ts`.
- **Tab path:** `updateExport` in `upgrades_tab.tsx` gained a token/gear
  flavour toggle (default token), reading `tokenId` off the row's own source
  via `exportIdForRow` (local re-impl of the core function — import across the
  port boundary is impossible); a caption names the active flavour; keys in
  `assets/locales/en/translation.json`. The bundled universes carry the id
  (re-synced in the same pass — see ticket 211).
- **Verified on both paths (G3):**
  - Report: pure unit test green (whole ret set).
  - Tab-read: a deterministic check ran the exact `exportIdForRow` logic over
    the **fork's bundled** `ret-p3.universe.json` — all 15 ret tier pieces
    present map to their token ids, a non-tier row keeps its gear id.
  - Tab live (CDP, `window.innerWidth` asserted): a real ret run surfaced
    Crystalforge War-Helm (30131) and Crystalforge Breastplate (30129); the
    token-flavour export emitted 30242 and 30236 (their tokens) in displayed
    order with the gear ids absent; flipping the toggle emitted the gear ids
    and dropped the tokens; the caption tracked each flavour.

**Craftable patterns — note-and-skip (per the ticket's own fall-through).**
Whether thatsmybis.com tracks profession *patterns* as lootable was not
cheaply confirmable (no prior confirmation in-repo; would need live TMB
inspection). Per this ticket ("Confirm TMB actually tracks patterns this way
before building; if it doesn't, note that in this ticket and skip"),
craftables keep their gear id in both flavours. The plumbing is ready if it is
ever confirmed: `raid-recipes.json` carries `recipeId`, and a single
`s.kind === "crafted"` branch in `tokenIdForExport` / `exportIdForRow`
completes it with no new data work.

`pnpm verify` fully green, including `fork-universes:check`, at branch tip.
