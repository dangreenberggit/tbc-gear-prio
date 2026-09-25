# D3: set-bonus table from the sim, and 3pc support

Investigator notes, 2026-09-25. Read-only; nothing run beyond greps and a Python parse of Go source.

## 1. How the fork sim registers item sets

`vendor/tbc-new-fork/sim/core/item_sets.go`:

- `type ItemSet struct { ID int32; Name string; AlternativeName string; ...; Bonuses map[int32]ApplySetBonus }`. Map keys are piece-count thresholds (2, 3, 4, 6, 8 all occur).
- `NewItemSet` (line 58) scans the item db: `foundID = item.SetID == set.ID` (skipped when `ID == 0`), `foundName = item.SetName == set.Name`. With `WITH_DB` it panics if either is missing. So a set is tied to items by **name**, and by **ID when the Go literal sets one**. Line 43: runtime equip counting matches `item.SetName == set.Name || AlternativeName`.
- Wastewalker, Burning Rage, Doomplate, Deathmantle, Slayer's, warrior sets and others carry **no ID** in Go. Their IDs come only from the item db: `data/items/index.json` (`setId`, `setName` per item) gives Wastewalker Armor = 659, Burning Rage = 566, Primal Intent = 619, Doomplate = 661. The name -> id join is therefore needed and is available on disk.

Parse (Python, brace-matched each `NewItemSet(core.ItemSet{...})` and each `N: func(...) {...}` closure; "EMPTY" = body empty after stripping `//` comments). Command is reproduced at the end.

| file (sim/) | set | Go ID | thresholds (EMPTY = no statements) |
|---|---|---|---|
| common/tbc/items_sets.go | Doomplate Battlegear | - (db 661) | 2,4 |
| common/tbc/items_sets.go | Wastewalker Armor | - (db 659) | 2,4 |
| common/tbc/items_sets.go | Mana-Etched Regalia | 658 | 2,4 |
| common/tbc/items_sets.go | Burning Rage | - (db 566) | 2 |
| common/tbc/items_sets.go | Khorium Ward | 565 | 3 |
| common/tbc/items_sets.go | Netherstrike Armor | 617 | 3 |
| common/tbc/items_sets.go | Netherscale Armor | 616 | 3 |
| common/tbc/items_sets.go | Windhawk Armor | 618 | 3 |
| common/tbc/items_sets.go | Primal Intent | 619 | 3 |
| common/tbc/items_sets.go | Felscale Armor | 611 | 2,4 |
| common/tbc/items_sets.go | Thick Draenic Armor | 613 | 2,4 |
| common/tbc/items_sets.go | Fel Skin | 573 | 3 |
| common/tbc/items_sets.go | Strength of the Clefthoof | 574 | 3 |
| common/tbc/items_sets.go | Battlecast Garb | 572 | 2 |
| common/tbc/items_sets.go | Spellstrike Infusion | 559 | 2 |
| common/tbc/items_sets.go | Wrath of Spellfire | 552 | 3 |
| common/tbc/items_sets.go | Whitemend Wisdom | 571 | 2 |
| common/tbc/items_sets.go | Shadow's Embrace | 618 (same ID as Windhawk; suspicious) | 3 EMPTY |
| common/tbc/items_sets.go | Soulcloth Embrace | 557 | 3 |
| common/tbc/items_sets.go | Primal Mooncloth | 554 | 3 |
| common/tbc/items_sets.go | Imbued Netherweave | 556 | 3 |
| common/tbc/items_sets.go | Netherweave Vestments | 555 | 2,4 |
| common/tbc/items_sets.go | Arcanoweave Vestments | 558 | 3 |
| common/tbc/items_weapons.go | The Twin Blades of Azzinoth | - | 2 |
| druid/item_sets.go | Gladiator's Sanctuary / Refuge / Wildhide | 584/685/585 | via `pvpResilience2PBonus(...)` helper, not a map literal |
| druid/item_sets.go | Oathbound's Kodohide/Dragonhide/Wyrmhide | 2027/2025/2026 | helper, not parsed |
| druid/item_sets.go | Moonglade Raiment | 637 | 2 EMPTY, 4 |
| druid/item_sets.go | Malorne Harness | 640 | 2,4 |
| druid/item_sets.go | Malorne Regalia | 639 | 2,4 |
| druid/item_sets.go | Nordrassil Harness | 641 | 4 only |
| druid/item_sets.go | Nordrassil Regalia | 643 | 2 EMPTY, 4 |
| druid/item_sets.go | Thunderheart Harness | 676 | 2,4 |
| druid/item_sets.go | Thunderheart Regalia | 677 | 2,4 |
| hunter/item_sets.go | Cryptstalker Armor | 530 | 2,4,6,8 |
| hunter/item_sets.go | Beast Lord Armor | 650 | 2 EMPTY, 4 |
| hunter/item_sets.go | Demon Stalker Armor | 651 | 2 EMPTY, 4 |
| hunter/item_sets.go | Rift Stalker Armor | 652 | 2,4 |
| hunter/item_sets.go | Gronnstalker's Armor | 669 | 2,4 |
| mage/items.go | Aldor Regalia | 648 | 4 |
| mage/items.go | Tirisfal Regalia | 649 | 2,4 |
| mage/items.go | Tempest Regalia | 671 | 2,4 |
| paladin/item_sets.go | Justicar Battlegear | 626 | 2 (ExposeToAPL only), 4 |
| paladin/item_sets.go | Crystalforge Battlegear | 629 | 2,4 |
| paladin/item_sets.go | Lightbringer Battlegear | 680 | 2,4 |
| paladin/item_sets.go | Justicar / Crystalforge / Lightbringer Armor | 625/628/679 | 2,4 |
| priest/items.go | Incarnate / Avatar / Absolution Regalia | 664/666/674 | 2,4 |
| rogue/items.go | Gladiator's Vestments | 577 | 2,4 |
| rogue/items.go | Assassination Armor | 620 | 2 EMPTY, 4 |
| rogue/items.go | Netherblade | 621 | 2,4 |
| rogue/items.go | Deathmantle / Slayer's Armor | - | 2,4 |
| shaman/item_sets.go | Tidefury Raiment | 630 | 2 EMPTY, 4 EMPTY |
| shaman/item_sets.go | Cyclone Regalia / Cataclysm Regalia | 632/635 | 2 EMPTY, 4 |
| shaman/item_sets.go | Skyshatter Regalia | 684 | 2,4 |
| shaman/item_sets.go | Cyclone Harness | 633 | 2 EMPTY, 4 |
| shaman/item_sets.go | Cataclysm Harness | 636 | 2 EMPTY, 4 EMPTY |
| shaman/item_sets.go | Skyshatter Harness | 682 | 2,4 |
| warlock/items.go | Oblivion / Voidheart / Corruptor / Malefic Raiment | 644/645/646/670 | 2,4 |
| warrior/items.go | Bold, Warbringer (x2), Destroyer (x2), Onslaught (x2) | - | 2,4 |
| warrior/items.go | Oathbound's Savage Plate / Gladiator's Battlegear | 2014/567 | helper, not parsed |

Class-specific = everything under `sim/<class>/`; common = `sim/common/tbc/`.

**"Empty" is not a syntactic property.** Justicar 2pc's closure is `setBonusAura.ExposeToAPL(37186)` — non-empty text, but the actual effect lives in `sim/paladin/seals.go` behind a set-bonus check (the existing table's comment, set-value.ts:40-47, marks it `false` on judgment: effect is real but the default APL uses JoC only prepull; hypothesis, not measured). The reverse also happens: an EMPTY closure can still be read elsewhere via `HasSetBonus`/`ExposeToAPL` lookups. So a generator can report "registered with a non-empty closure" mechanically, but "counts for ranking" stays a hand override for cases like Justicar 2pc.

## 2. Existing generator

- `package.json`: `sim-implemented-effects:generate` = `python scripts/generate_sim_implemented_effects.py`; `sim-implemented-effects:check` = `python scripts/check_sim_implemented_effects.py`, which **is in `verify:steps`**.
- Output `data/sim-implemented-effects.json`: `{generatedBy, forkRepo, forkCommit, _comment, implementedEffectItemIdsCount, implementedEffectItemIds[], stubOnlyItemIds...}`. It scans the fork's Go tree for literal item ids in `core.NewItemEffect` / `shared.NewSimpleStatActive` / `LibramMap` / `HasItemEquipped`. `_comment` says `implementedEffectItemIds` is informational; `stubOnlyItemIds` drives universe exclusion in `assemble_universe.py`.
- Lock guard: `lockfile_pin()` reads `data/wowsims-fork.lock.json`; `main()` exits 2 when `git -C vendor/tbc-new-fork rev-parse HEAD` differs from the pin (script lines 194-221). Absence of the clone is tolerated by the check.
- It does **not** look at `NewItemSet`. A sibling scan fits the same script cleanly: the regex/brace walk above (~30 lines), emitting `implementedSetBonuses: { "<setId>": [thresholds] }`, joining Go `Name` -> `setId` through `data/items/index.json` (or the fork's `assets/database/db.json`, which `fork-set-net.test.ts` A3-R already reads) when the Go literal has no `ID`. The same forkCommit stamp and the same `:check` gate would then cover it on every pin move.

## 3. Sites that assume thresholds are 2 | 4

There are **two copies** of the engine: `packages/core/src/set-value.ts` and `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/set-value.ts` (fork copy has `IMPLEMENTED_SET_IDS`, `lostThresholds`). Both declare `type SetThreshold = 2 | 4` and `SET_THRESHOLDS = [2, 4]`.

Type/iteration sites (generic once the type widens): core set-value.ts 12,14,51,68,120-121,160,235,286,355; core dead-slots.ts 19-20,112,167-168; core index.ts 206,218; core plausibility.ts 22,88; core rank.ts 84,89,329,370,382,1224,1522,1565; core rank-report-rules.ts 15; fork engine set-value.ts 18,20,38,60,98-99,141,209,222-223,335; fork dead-slots.ts 11-12,43,63-64; fork plausibility.ts 16,32; fork rank.ts 120,123,309-372 (types),1407,1660,1708,2312,2354,2532.

**Semantic 2-and-4 assumptions** (need real thought, not just a wider type):
- `rank-report-rules.ts:643` `SET_POTENTIAL_WEIGHTS: Record<SetThreshold, number>` — needs a weight for 3.
- `rank-report-rules.ts:282` `b.threshold === 2 && ...`.
- core rank.ts 1612, 1725-1737 and fork rank.ts 1747, 1847-1856, 1894, 2047-2051: the "two-piece bonus confounds the four-piece" logic (`twoPieceBonus`, `selfConfound = { threshold: 2 }`) hard-codes the pair (2 below 4). A 3pc-only set has no lower threshold so it is probably inert there, but the code should be written as "next lower implemented threshold", not literal 2/4. Cryptstalker (2,4,6,8) would break the pair assumption too, but it is a Naxx set, out of TBC pools.

Tests hard-coding 2/4 or set ids: `set-value.test.ts:56-62` (sorted check, fine); `rank-package-artifacts.test.ts:54,84,151` and `rank-package-thresholds.test.ts:69` (`toEqual([2, 4])`); `rank.test.ts` 2688-3298 (626/629 by threshold); `rank-report.test.ts` 1052-1104 (`threshold === 4` selfConfound); `fork-set-net.test.ts` 383-515, 996 (640/676); `pool-hardening.test.ts:160` `RET_TIER_SET_IDS = [626, 629, 680]`; `fork-set-net.test.ts:955` A3-R reads `IMPLEMENTED_SET_IDS` from the fork engine and asserts no member is a ring or trinket — **widening the table means A3-R must be re-run against the new id list**; untested whether any newly listed set has a ring/trinket member.

Count: ~17 files; ~7 semantic sites (the rest are type annotations/loops that follow the type).

## 4. Pre-raid -> phase-1 preset membership

Joined with `data/items/index.json` (slot = index in the gear.json `items` array):

| preset | slot | item | set |
|---|---|---|---|
| feralcat `pre_raid.gear.json` | 2 shoulder | 27797 Wastewalker Shoulderpads | 659 Wastewalker |
| | 4 chest | 28264 Wastewalker Tunic | 659 |
| | 6 hands | 27531 Wastewalker Gloves | 659 |
| | 8 legs | 27837 Wastewalker Leggings | 659 |
| ret `preraid.gear.json` | 2 shoulder | 33173 Ragesteel Shoulders | 566 Burning Rage |
| | 4 chest | 23522 Ragesteel Breastplate | 566 |

No Primal Intent piece in the feralcat pre-raid preset (Primal Intent appears in neither pre-raid preset; feralbear pre-raid has Assassination 620 shoulders + Clefthoof 574 chest). Feral wears Wastewalker **4/4**; ret wears Burning Rage **2/2**.

Phase-1 displacers:
- Feral: Malorne Harness 640 shoulders 29100 and chest 29096 (all p1_bis/realistic presets), hands 29097 / legs 29099 in p1_alt presets. Every one of these sits in a Wastewalker slot. First Malorne shoulder or chest drops Wastewalker 4 -> 3, newly charging the **4pc** break; a second drops 3 -> 2 (nothing more lost); a third 2 -> 1 charges the **2pc**. Non-tier P1 upgrades in shoulder/chest/hands/legs are also charged.
- Ret: Justicar 626 shoulders 29075 and chest 29071 sit exactly on both Ragesteel slots. Any shoulder or chest upgrade drops Burning Rage 2 -> 1 and would be charged the **2pc**.

Magnitude: 140 files under `.scratch/` and `docs/` mention these sets (the ripgrep tool missed them because `.scratch` is gitignored; plain `grep -rl` finds them). None has a measurement. The mentions are rendered report text such as "Burning Rage 2pc (0 worn) — not implemented in the pinned sim" and "Burning Rage 2/4pc | — | unmeasured", plus earlier planning prose. The reports also print "Primal Intent 2pc / 4pc", although the sim's only Primal Intent bonus is 3pc, which shows the 2|4 assumption reaching the report text. **Hypothesis, untested:** Wastewalker 2pc is +35 hit rating (Go comment line 52), 4pc is a 2% proc (items_sets.go:68-69); Burning Rage 2pc is a stat buff (items_sets.go:119+). Direction: pre-raid tier-slot rows for feral shoulder/chest/hands/legs and ret shoulder/chest get lower DPS deltas than today; size unknown until simmed.

## 5. Designs

**(A) Generate the table from the sim.** Extend `scripts/generate_sim_implemented_effects.py` (or a sibling) to emit `setId -> implemented thresholds` into a committed data file, stamped with `forkCommit`; `:check` in `pnpm verify` already catches a stale artifact after a pin move. Consumers: core `set-value.ts` and the fork engine `set-value.ts` (the fork copy cannot import from `data/` at runtime unless bundled; likely needs emitted TS in both places). Per the repo rule, do **not** type `SetThreshold` from the JSON; if a literal type is wanted, route through `scripts/generate_json_literal_types.py` (gated by `codegen:json-types:check`), or keep `SetThreshold = number`-backed values with `SET_THRESHOLDS` as a plain array. Stays hand-judged: an overrides list (Justicar 2pc false; closures that only `ExposeToAPL`; empty closures whose effect lives elsewhere; non-DPS bonuses are still "implemented" per the existing comment, so no filter needed). Files: script + check script, new data file (+ generated TS), both set-value.ts, 2|4 semantic sites if 3pc included, tests listed in §3. Risk: parser drift (helper-based sets like `pvpResilience2PBonus` are invisible to a literal parse; Go-ID collision Shadow's Embrace/Windhawk 618 must be resolved by name->db join, not trusted); much wider table changes rankings for every spec and needs A3-R and SME review.

**(B) Extend the hand table.** Add 659 {2,4}, 566 {2}, 619 {3} etc. by hand in both set-value.ts copies. Files: two set-value.ts, 2|4 sites for 619, tests. Stays hand-judged: everything. Pin move is caught by nothing (no gate compares the table to Go). Risk: exactly the ticket-301 re-mirror pattern the owner rejected.

**Recommendation: A**, with a small committed override list for judgment cases (Justicar 2pc). Reason: the generator, lock guard and verify gate already exist for the same fork tree, so drift detection comes nearly free, and it follows the "borrow upstream, don't re-mirror" rule. Split 3pc support into its own slice: 2/4 sets (Wastewalker, Burning Rage) need only the table; 3pc needs the ~7 semantic sites.

## Commands

```
python - <<'EOF'   # NewItemSet parse (run from repo root)
import re,glob
F='vendor/tbc-new-fork/sim'
for p in sorted(glob.glob(F+'/**/*.go',recursive=True)):
    if p.endswith('_test.go'): continue
    s=open(p,encoding='utf8').read()
    for m in re.finditer(r'NewItemSet\(core\.ItemSet\{|NewItemSet\(ItemSet\{',s):
        i=m.end(); d=1; j=i
        while d:
            c=s[j]; d+= c=='{'; d-= c=='}'; j+=1
        body=s[i:j]
        name=re.search(r'Name:\s*"([^"]+)"',body); idm=re.search(r'\bID:\s*(\d+)',body)
        res=[]
        for bm in re.finditer(r'\n\s*(\d+):\s*func\([^)]*\)\s*\{',body):
            k=bm.end(); dd=1; kk=k
            while dd:
                c=body[kk]; dd+= c=='{'; dd-= c=='}'; kk+=1
            inner=re.sub(r'//.*','',body[k:kk-1]).strip()
            res.append(f"{bm.group(1)}{'' if inner else '(EMPTY)'}")
        print(f"{p[len(F)+1:]}|{name.group(1) if name else '?'}|{idm.group(1) if idm else '-'}|{','.join(res)}")
EOF
```
Preset membership: load `data/items/index.json`, for each `vendor/tbc-new-fork/ui/**/{pre_raid,preraid,p1*}.gear.json` print items with `setId`.
