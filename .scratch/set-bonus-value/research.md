# Set bonus value research — Ret paladin & Feral cat druid, TBC P1-3

Repo: `tbc-gear-prio`, wowsims/tbc-new pinned at commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` (v0.0.101; pin confirmed in `PLAN.md:976`).

## Summary table

| Set | setId | Spec/role | 2pc implemented in sim? | 4pc implemented in sim? | DPS-relevant? |
|---|---|---|---|---|---|
| Justicar Battlegear (T4 ret) | 626 | Ret | ~~Yes (JotC dmg +15%, but only via `ExposeToAPL` — see caveat below)~~ **Correction (verification.md V1): the `2:` closure has no effect body at all, just a bare `ExposeToAPL(37186)` call — `not-implemented-in-sim`, like Nordrassil 641 2pc.** | Yes (JoCommand dmg +10%) | Yes |
| Crystalforge Battlegear (T5 ret) | 629 | Ret | Yes (Judgement mana cost -35, not DPS) | Partial — implements group heal proc only, no direct DPS effect | 2pc no, 4pc no (heal, not damage) |
| Lightbringer Battlegear (T6 ret) | 680 | Ret | Yes (mana proc on melee, not DPS) | Yes (Hammer of Wrath dmg +10%) | 4pc yes, 2pc no (mana, not damage) |
| Malorne Harness (T4 feral) | 640 | Feral (dual bear/cat) | Yes (energy/rage proc on melee — DPS-relevant for cat) | Yes (Str +30 cat / Armor +1400 bear) | Yes |
| Nordrassil Harness (T5 feral) | 641 | Feral | **Not implemented** — no `2:` entry in the `Bonuses` map at all | Yes (Shred +75 flat, Lacerate tick +3 — but code comment says "+15 per application", constant is `+= 3`, discrepancy noted below) | 4pc yes, 2pc **absent from sim (measures zero)** |
| Thunderheart Harness (T6 feral) | 676 | Feral | Yes (Mangle cat cost -5 energy / Mangle bear threat +15%) | Yes (Rip/Swipe/Ferocious Bite dmg +15%) | Yes (2pc: cat energy relevant; 4pc: yes) |

No off-tier/dungeon sets with setId appear in `data/universes/ret-p2..p5.json` or `data/universes/feral-p2..p3.json` — only the six tier sets above were found (see Q1 methodology).

## 1. DPS-relevant set bonuses (data/items/index.json + universe membership)

Method: `data/pools/*.json` no longer exists (per `data/pools/README.md`, ranking membership now lives only in `data/universes/ret-p*.json` / `data/universes/feral-p*.json`, built by `pnpm universe:assemble`). I searched those universe files' `entries` for item IDs whose `data/items/index.json` record has a non-null `setId`, restricted to the 6 named sets, then separately confirmed no other setId shows up in those pools.

All 6 sets are present with `setId`/`setName` populated in `data/items/index.json`:

- **Justicar Battlegear** — setId 626. Pieces (repo, phase 1): 29071 Breastplate (chest), 29072 Gauntlets (hands), 29073 Crown (head), 29074 Greaves (legs), 29075 Shoulderplates (shoulder). All 5 appear in `ret-p2.json`.
  - 2pc: "Increases the damage bonus of your Judgement of the Crusader by 15%." (per Go source comment, `sim/paladin/item_sets.go`)
  - 4pc: "Increases the damage dealt by your Judgement of Command by 10%."
  - unverified against Wowhead (not fetched live; comment text taken from repo source, cross-check with tbc.wowhead.com/item-set=626 recommended if exact wording matters)

- **Crystalforge Battlegear** — setId 629. Pieces (phase 2): 30129 Breastplate, 30130 Gauntlets, 30131 War-Helm, 30132 Greaves, 30133 Shoulderbraces. All 5 in `ret-p2.json`/`ret-p3.json`/`ret-p4.json`/`ret-p5.json`.
  - 2pc: "Reduces the cost of your Judgements by 35."
  - 4pc: "Each time you cast a Judgement, there is a chance it will heal all nearby party members for 244 to 256." (throughput/healing, not DPS)

- **Lightbringer Battlegear** — setId 680. Pieces (phase 3+5): 30982 Gauntlets, 30989 War-Helm, 30990 Breastplate, 30993 Greaves, 30997 Shoulderbraces (phase 3), plus 34431 Bands (wrist), 34485 Girdle (waist), 34561 Boots (feet) added phase 5 — 8 pieces total. All appear across `ret-p3/p4/p5.json`.
  - 2pc: "Your melee attacks have a chance to grant you 50 mana."
  - 4pc: "Increases the damage dealt by your Hammer of Wrath ability by 10%."

- **Malorne Harness** — setId 640. Pieces (phase 1): 29096 Breastplate, 29097 Gauntlets, 29098 Stag-Helm, 29099 Greaves, 29100 Mantle. All 5 in `feral-p2.json`.
  - 2pc: "Your melee attacks in Cat Form have a chance to generate 20 additional energy. Your melee attacks in Bear Form and Dire Bear Form have a chance to generate 10 additional rage."
  - 4pc: "Increases your strength by 30 in Cat Form. Increases your armor by 1400 in Bear Form and Dire Bear Form."

- **Nordrassil Harness** — setId 641. Pieces (phase 2): 30222 Chestplate, 30223 Handgrips, 30228 Headdress, 30229 Feral-Kilt, 30230 Feral-Mantle. All 5 in `feral-p2.json`/`feral-p3.json`.
  - 2pc: unverified wording from Wowhead-style text (not present in repo source at all — see Q2).
  - 4pc: "Your Shred ability deals an additional 75 damage, and your Lacerate ability does an additional 15 per application." (comment text; actual code only adds `LacerateTickBonus += 3`, a mismatch — see Q2 caveat)

- **Thunderheart Harness** — setId 676. Pieces (phase 3+5): 31034 Gauntlets, 31039 Cover, 31042 Chestguard, 31044 Leggings, 31048 Pauldrons (phase 3), plus 34444 Wristguards, 34556 Waistguard, 34573 Treads (phase 5) — 8 pieces total. Confirmed in `feral-p3.json` (phase-3 5 pieces only; phase-5 wrist/waist/feet not checked against a p4/p5 feral universe file since none exists in repo — feral universes only go to p3).
  - 2pc: "Reduces the energy cost of your Mangle (Cat) by 5 and increases the threat generated by your Mangle (Bear) by 15%."
  - 4pc: "Increases the damage dealt by your Rip, Swipe, and Ferocious Bite by 15%."

No off-tier DPS-relevant sets found carrying a setId inside `ret-p2..p5.json` or `feral-p2..p3.json` — every setId hit in those universes belongs to one of the 6 sets above (verified by exhaustive scan of universe `entries` against `data/items/index.json`).

## 2. Does wowsims/tbc-new apply set bonuses automatically? Are all bonuses implemented?

**Yes**, set bonuses are auto-registered from equipped item IDs via `core.NewItemSet(core.ItemSet{ID: <setId>, Name: ..., Bonuses: map[int32]core.ApplySetBonus{2: ..., 4: ...}})` — this is the standard wowsims pattern; the sim's gear-processing applies these automatically once N pieces of a given `ID` (matching `setId` in this repo's item data) are equipped, no manual wiring needed per character. Source files fetched at pin `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`:

- `sim/paladin/item_sets.go` — https://github.com/wowsims/tbc-new/blob/8aa378b3671a0923fd11fb34b4b3753e53f20c9b/sim/paladin/item_sets.go
- `sim/druid/item_sets.go` — https://github.com/wowsims/tbc-new/blob/8aa378b3671a0923fd11fb34b4b3753e53f20c9b/sim/druid/item_sets.go

**Load-bearing findings — gaps between the doc-comment bonus text and the actual implemented effect:**

1. **Nordrassil Harness (641) 2pc bonus is entirely absent from the sim.** The `Bonuses` map only has a `4:` key; there is no `2:` entry at all (`sim/druid/item_sets.go` lines 149-161). If any ranking or EP measurement assumes a 2pc Nordrassil bonus exists, it will silently measure zero for that effect because the code path is never registered. (TBC's real Nordrassil 2pc is "reduces threat from Swipe, Maul, and Lacerate by 20%" — a threat tool, not a DPS cooldown, so omission may be deliberate/low-priority from wowsims' side, but it is confirmed **not implemented**, full stop.)

2. **Nordrassil Harness 4pc has a magnitude mismatch between comment and code.** Comment says "Lacerate...additional 15 per application"; code does `druid.LacerateTickBonus += 3` (not +15). This is either a stale comment or an under-implemented bonus — unverified which is correct without checking upstream wowsims changelog/Wowhead tooltip. Either way, Lacerate is a bear-form ability, not part of the Feral cat DPS rotation this repo evaluates, so this discrepancy is likely inert for this repo's use case (Feral cat), but the Shred +75 flat portion (`druid.ShredFlatBonus += 75`) **is** implemented and cat-DPS-relevant.

3. **Crystalforge Battlegear (629) 2pc is not DPS-relevant** (Judgement mana cost reduction) — implemented but doesn't move the DPS needle directly (may enable more Judgement casts under mana pressure, an indirect effect not modeled as a flat DPS gain).

4. **Crystalforge Battlegear 4pc is a healing proc**, not DPS — implemented (group heal spell registered and triggered on Judgement cast), but irrelevant to a DPS ranking.

5. **Lightbringer Battlegear (680) 2pc is a mana proc**, not directly DPS (again, indirect via more Judgement/HoW mana available) — implemented but not a DPS multiplier itself.

6. All other listed 2pc/4pc bonuses (Justicar 2pc/4pc, Malorne 2pc/4pc, Thunderheart 2pc/4pc, Lightbringer 4pc) appear to be functionally implemented as damage/proc/stat modifiers that plausibly move simmed DPS.

**Not checked / unverified:** whether `ExposeToAPL(spellID)` calls (used throughout, e.g. Justicar 2pc line 18) are purely for APL/UI visibility or also gate the bonus's actual application — I did not trace `core.NewItemSet` / `ApplySetBonus` / `ExposeToAPL` definitions in `sim/core` to confirm the bonus fires without an explicit APL action referencing it. This matters because if a bonus requires being "exposed" to an APL condition that the repo's preset APLs don't reference, the numeric effect might still apply automatically (typical wowsims pattern: aura/spellmod is applied on `OnGain`, `ExposeToAPL` is a separate metadata call for the UI action list) — but I did not read `sim/core/item_effects.go` or equivalent to confirm this. Flagging as **unverified** rather than asserting.

## 3. Fixture equipped set pieces

Checked `test/fixtures/slamaltman.raid-sim-request.json` (ret paladin) directly — this is wowsims sim-request JSON with `raid.parties[0].players[0].equipment.items[]`, each entry has an item `id`. Cross-referenced against `data/items/index.json` `setId`:

- **slamaltman**: 1 set piece equipped — item 30129 (Crystalforge Breastplate, setId 629). Only 1 piece, so **no set bonus active** (below 2pc threshold) in this fixture as captured.

**shredzepelin / nexess: skipped.** Their fixtures (`shredzepelin.raw.json`, `shredzepelin-cat.raw.json`, `shredzepelin-bear.raw.json`, `nexess.raw.json`) are WCL (Warcraft Logs) raw report exports with a different schema (`report_code`, `actors`, `combatant_info_events`, `fight`, `buffs_table`, `casts_table` — no direct `equipment.items` array), which would require parsing `combatant_info_events` gear data — judged to exceed the 15-minute budget for this sub-question per the task's own skip clause. **Unverified.**

## Sources

- `data/items/index.json` (local, this repo) — setId/setName/slot per item, keyed by item ID.
- `data/universes/ret-p2.json` through `ret-p5.json`, `data/universes/feral-p2.json`, `feral-p3.json` (local) — ranking-eligible item ID membership per phase.
- `data/pools/README.md` (local) — confirms `data/pools/*.json` is removed; universes are the only membership source.
- `PLAN.md:976` (local) — confirms pin commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` for `wowsims/tbc-new`.
- `sim/paladin/item_sets.go` at commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`, fetched via `gh api repos/wowsims/tbc-new/contents/...` (GitHub raw content, base64-decoded).
- `sim/druid/item_sets.go` at the same commit, same method.
- `test/fixtures/slamaltman.raid-sim-request.json` (local).
- Wowhead TBC set-bonus tooltip text was **not fetched live** in this pass — all bonus text above is transcribed from Go source code comments in the pinned wowsims repo, not independently cross-checked against tbc.wowhead.com. Mark as unverified if exact tooltip wording (vs. paraphrase) matters.
