# Meta gem research: does the recommended meta gem change per spec/phase/condition?

Date: 2026-08-12
Scope: TBC Classic (2007-era rules) DPS specs, cross-checked against wowsims tbc/tbc-new upstream and community guides (Icy Veins, Warcraft Tavern, LootXPHub, Wowhead).

## Method note

I could not get full raw HTML for several target pages (icy-veins fetched fine via WebFetch; warcrafttavern and lootxphub 403'd WebFetch and had to be triangulated via WebSearch snippets instead, which are lower-fidelity than reading the page directly). Where a claim rests only on a WebSearch snippet rather than a directly fetched page, it is marked accordingly. I did not get filesystem-level access to `wowsims/tbc` or `wowsims/tbc-new` `ui/<class>/<spec>/presets.ts` file contents (GitHub tree/blob fetch returned only directory listings, not file bodies, within tool limits) — so the "does the upstream preset socket a different meta per phase gear set" question was **UNVERIFIED** for all specs below at the time of the online pass. **Closed 2026-08-12** for the only two specs that matter here — see "Local verification pass" below, which reads the vendored presets directly. It remains unverified for the eight non-detectable specs, which is harmless because they cannot reach this code.

## Table: recommended meta gem by spec

| Spec | Meta gem | Item ID | Phase notes | Source |
|---|---|---|---|---|
| Retribution Paladin | Relentless Earthstorm Diamond | 32409 | "consistent across all phases of TBC Classic" per guide synthesis | [Wowhead item](https://www.wowhead.com/tbc/item=32409/relentless-earthstorm-diamond), [Warcraft Tavern Ret guide](https://www.warcrafttavern.com/tbc/guides/pve-retribution-paladin-gems-enchants-consumables/) (via search snippet) |
| Fury Warrior | Relentless Earthstorm Diamond | 32409 | "optimal ... in Phase 1 and beyond" | [Icy Veins Fury guide](https://www.icy-veins.com/tbc-classic/fury-warrior-dps-pve-enchants-consumables) (via search snippet) |
| Combat Rogue | Relentless Earthstorm Diamond | 32409 | "already out from the start" (i.e. available and BiS from Phase 1) | [Warcraft Tavern Rogue gems](https://www.warcrafttavern.com/tbc/guides/rogue-gems-for-tbc/) (via search snippet) |
| BM Hunter | Relentless Earthstorm Diamond | 32409 | no phase caveat found | [Icy Veins BM guide](https://www.icy-veins.com/tbc-classic/beast-mastery-hunter-dps-pve-enchants-consumables) (via search snippet) |
| Enhancement Shaman | Relentless Earthstorm Diamond | 32409 | no phase caveat found | [Icy Veins Enh guide](https://www.icy-veins.com/tbc-classic/enhancement-shaman-dps-pve-enchants-consumables) (via search snippet) |
| Feral Cat Druid | Relentless Earthstorm Diamond (when a meta-slot head is used at all) | 32409 | Guides note feral often **skips the meta slot entirely** because Wolfshead Helm (a non-gemmed head enchant/item) out-values any meta-slotted head in many phases; when a meta head is used, Swift Windfire Diamond is called out as a **budget/preraid alternative**, not the BiS pick | [Icy Veins Feral guide](https://www.icy-veins.com/tbc-classic/feral-druid-dps-pve-enchants-consumables) (via search snippet) — UNVERIFIED which specific phases favor Wolfshead vs a meta head; only that the tradeoff exists |
| Fire/Arcane Mage | Chaotic Skyfire Diamond | 34220 | "by far, the best Meta gem for Mages" per Icy Veins, no phase caveat surfaced by that guide; guide tells reader to re-check via sim tool for their own gear | [Icy Veins Fire](https://www.icy-veins.com/tbc-classic/fire-mage-dps-pve-enchants-consumables), [Icy Veins Arcane](https://www.icy-veins.com/tbc-classic/arcane-mage-dps-pve-enchants-consumables) (WebFetch'd directly) |
| Destruction/Affliction Warlock | Chaotic Skyfire Diamond | 34220 | one source (search snippet only, page 403'd on direct fetch) claimed "these gems become available in Phase 3 of TBC" — **this conflicts** with the item's own drop source (see Contested claim below) and is likely wrong for TBC Classic specifically, or conflates original 2007 TBC patch 2.3 timing with TBC Classic's phase schedule | [Warcraft Tavern Destro guide](https://www.warcrafttavern.com/tbc/guides/pve-destruction-warlock-gems-enchants-consumables/) (403, search snippet only) |
| Elemental Shaman | Chaotic Skyfire Diamond | 34220 | "best overall meta gem for Elemental Shamans"; Insightful Earthstorm Diamond called out as better for **healers**, not relevant to Ele DPS | [Icy Veins Ele guide](https://www.icy-veins.com/tbc-classic/elemental-shaman-dps-pve-enchants-consumables) (via search snippet) |
| Shadow Priest | Chaotic Skyfire Diamond (default) / Mystical Skyfire Diamond (situational, skill-gated) | 34220 / 25893 | See conditional section below — this is the clearest conditional-switch finding | Search-snippet synthesis referencing an Icy Veins-style guide; original page could not be directly fetched (LootXPHub 403'd) — **UNVERIFIED at the primary-source level**, treat as a lead to re-check, not a confirmed fact |
| Balance Druid | Chaotic Skyfire Diamond | 34220 | "consistently recommended across multiple TBC Classic guides" | [Icy Veins Balance guide](https://www.icy-veins.com/tbc-classic/balance-druid-dps-pve-enchants-consumables) (via search snippet) |

## Conditional / phase-dependent switches found

### 1. Shadow Priest: Chaotic Skyfire Diamond vs. Mystical Skyfire Diamond — skill/playstyle-conditional, not phase-conditional

A search-snippet synthesis of what appears to be a Shadow Priest gems guide states:

> "Mystical Skyfire Diamond offers the highest potential for damage among all meta options, though it requires the most skill to manage. Its brief duration means a poorly timed Mind Flay could consume half the proc. Additionally, it increases the likelihood of accidentally clipping DoTs due to established muscle memory, and it may trigger during high-movement phases when you cannot cast."

This reads as a **player-skill / fight-mechanics** condition ("if you can play around a short proc window, use Mystical; otherwise use Chaotic"), not a strict phase gate. **UNVERIFIED**: I was not able to load the source page directly (403 on both attempts), so I cannot confirm the exact wording, confirm this is TBC-Classic-specific (vs. original 2007 TBC) guidance, or rule out that it's phrased as phase-conditional in the original. Flagging this as the single most concrete "spec has more than one context-dependent best meta" lead found in this pass, but it needs a direct-source re-check before being treated as fact.

### 2. Feral Cat Druid: meta slot competes with Wolfshead Helm, not a meta-vs-meta switch

Multiple guides note Feral often doesn't use a meta-socketed head at all because Wolfshead Helm's flat stats/proc outweigh the meta socket + gem combo. When a socketed head *is* used, Swift Windfire Diamond is flagged as a cheaper/earlier alternative to Relentless Earthstorm Diamond — framed as a "budget vs. BiS" choice (i.e., an itemization/affordability condition), not a stat-threshold or phase-locked switch. **UNVERIFIED** whether this budget-vs-BiS framing is phase-bound (e.g. "P1 only, once you have X you upgrade") — no source gave an explicit phase boundary.

### 3. Chaotic Skyfire Diamond availability — contested claim, not confirmed as a phase gate

One warlock guide snippet claimed Chaotic Skyfire Diamond "become[s] available in Phase 3 of TBC." Against that: Wowhead/wiki sources confirm the **Design: Chaotic Skyfire Diamond** recipe drops from **Coilskar Siren**, a level 68-69 NPC in **Shadowmoon Valley** — a zone available from TBC's initial content, not raid-tier-gated. In original 2007 retail TBC the recipe was added in patch 2.3, several months after launch; TBC Classic's phase schedule does not necessarily reproduce that timing 1:1. **I could not confirm which TBC Classic phase Coilskar Siren's drop was actually made available in** (i.e., whether TBC Classic added it at Phase 1 launch or gated it to a later phase to mirror original patch order). This is the one claim in this research pass most worth a direct follow-up (check a TBC Classic Anniversary/Classic-specific patch-phase timeline source, not original-TBC wowhead pages) before hardcoding anything that assumes Chaotic Skyfire is available from Phase 1.

### 4. No stat-threshold ("if crit < N%, use Y") language found

Despite specifically searching for "before X% crit/hit use Y" style guide language (the pattern the task description called out), no source surfaced that framing for any spec. All "swap" language found was either (a) budget-vs-BiS (feral) or (b) skill/mechanics-based (shadow priest), not a crit/hit-rating breakpoint.

## Local verification pass (2026-08-12, round-5 executor)

The two gaps the online pass left open are closed here against **our own
committed data**, which outranks the web sources above for anything the
pipeline actually consumes.

### Gap (a) — Chaotic Skyfire Diamond's phase: finding 3's "phase 3" claim is wrong for our data

```
python -c "import json; db=json.load(open('vendor/wowsims/db.json')); \
print([{k:v for k,v in g.items() if k in ('id','name','phase','quality','color')} \
for g in db['gems'] if g['id'] in (32409,34220)])"
```

yields `Relentless Earthstorm Diamond` 32409 → `phase 1, quality 3` and
`Chaotic Skyfire Diamond` 34220 → `phase 1, quality 3`. The same values appear
in the generated `data/gems/palette.json`. **All 18 meta gems (colour 1) in
db.json are `phase: 1`** — and `phase` is not a constant default in this data
(non-meta palette entries carry phases 1, 2 and 3), so this is a real recorded
value rather than an unset field. The warlock-guide snippet claiming Chaotic
Skyfire "becomes available in Phase 3" does **not** describe the phase model
our pipeline filters on. No pre-P3 caster row needs special handling.

### Gap (b) — do upstream presets carry one static meta per spec? Yes, and feral carries none

The vendored subset (`vendor/wowsims/`, at the pin) contains gear presets for
exactly the two specs this pipeline can detect. Reading every one of them:

| Preset | Head | Meta gem socketed |
|---|---|---|
| `ret_preraid.gear.json` | 32087 | **32409** |
| `ret_p1.gear.json` | 29073 | **32409** |
| `ret_p2.gear.json` | 32461 | **32409** |
| `feral_preraid.gear.json` | 8345 Wolfshead Helm | **none — head has no `gems` array at all** |
| `feral_p2_6p` / `feral_p2_9p` / `feral_p3_6p` / `feral_p3_9p` | 8345 Wolfshead Helm | **none** |

Re-runnable check:

```
cat vendor/wowsims/ret_*.gear.json vendor/wowsims/feral_*.gear.json
```

Two findings:

1. **Ret is static across all three phases** — 32409, no other meta appears.
   This is the same evidence already cited in `candidate-gems.ts`, now
   re-confirmed at the current pin.
2. **Feral has no upstream meta preference to read.** All five feral presets
   wear Wolfshead Helm (8345), which carries no sockets — independently
   confirming the online pass's "feral often skips the meta slot entirely"
   claim from committed data rather than guide snippets. There is no preset
   meta to copy, so feral must take the fail-loud "no meta preference
   recorded" path, **not** an inherited 32409.

### Scope correction to the table above

The online table covers ten specs. This pipeline's `DetectedSpecId`
(`packages/core/src/types.ts`) is `"ret" | "feral" | "feral-tank"` — the eight
other specs in that table are not detectable, cannot reach the meta-selection
code, and therefore must not become table rows. They are recorded above as
research context only.

## Verdict

**Mostly static per-spec table is sufficient, with two caveats to disclose rather than model as full per-phase table rows:**

- All eight melee/physical DPS specs checked (Ret Pal, Fury Warr, Combat Rogue, BM Hunter, Enh Shaman, Feral Cat) consistently point to **Relentless Earthstorm Diamond (32409)** as the static best pick across phases, with Feral being a soft exception because it frequently skips a meta-socketed head entirely in favor of Wolfshead Helm — this is an item-choice question upstream of "which meta," not a meta-vs-meta switch, so it doesn't require a new table row, but a one-line caveat ("feral may not socket a meta head at all") is worth carrying.
- All caster DPS specs checked (Fire/Arcane Mage, Destro/Affli Warlock, Elemental Shaman, Balance Druid) consistently point to **Chaotic Skyfire Diamond (34220)** as the static best pick, EXCEPT that (a) its exact TBC-Classic phase-of-availability is contested/unconfirmed (see finding 3) and needs a direct check before assuming it's usable from Phase 1, and (b) Shadow Priest has an unverified secondary lead suggesting a skill-gated alternative (Mystical Skyfire Diamond) that is not phase-driven and probably shouldn't be modeled as a table row even if confirmed — it's a playstyle preference, not a "correct" upgrade.

**Both provisos below were discharged by the local verification pass** (see
that section): (1) Chaotic Skyfire is `phase: 1` in our own data, so the
pre-raid/P1 worry does not apply; (2) the upstream presets *were* inspected
directly, confirming one static meta for ret and none at all for feral.

No spec surfaced a genuine phase-to-phase static-best-changes (e.g. "P1-P2 use meta X, P3+ switch to meta Y") pattern, and no crit/hit-rating breakpoint language was found anywhere. A static per-spec table (one meta gem per spec) is therefore defensible, **provided**: (1) the table's caster-meta entries carry a note that Chaotic Skyfire Diamond's actual TBC-Classic-phase availability is unconfirmed by this research pass and should be re-checked against a TBC Classic-specific (not original-2007) patch/phase timeline before the table is treated as valid for pre-raid/P1 content, and (2) I was unable to inspect wowsims `presets.ts` file contents directly, so upstream sim-tool confirmation of "one static meta per spec across all gear-set presets" remains UNVERIFIED rather than confirmed — someone with direct repo access should grep `ui/<class>/<spec>/presets.ts` (or wherever gear_sets live in `wowsims/tbc-new`) for meta gem IDs across preraid/p1/p2+ preset objects to close this gap definitively.
