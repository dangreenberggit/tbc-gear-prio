# SME rank judgment — ticket 452, phase 5, physical DPS group

Stage p45-dps-pass-452, plan step 6, group p5-physical. Audience: the
engineering team. This is a game-domain judgment of six live Upgrades-tab runs
at phase 5. The runs used fork `13a980cf3` in backend mode, driven by
`scripts/tab-harness/run-tab-cdp.mjs`.

## Verdict

- feralcat p5: trust-with-caveats — the top row is Stanchion of Primal Instinct (+137.8), and 8 of the 14 items that wowsims changes from its P4 to its P5 cat set are gains above the cutoff. The other 6 are losses: three replace a worn Thunderheart piece and break the 4-piece bonus (Bladed Chaos Tunic -3.7, Gloves of Immortal Dusk -17.3, Leggings of the Immortal Night -12.9; ticket 523), and three replace a worn item outside the set (Cursed Vision of Sargeras -60.8, Thunderheart Waistguard -24.9, Clutch of Demise -10.1); Earthstrike and Jom Gabbar still score exactly on the caster-trinket zero line (F1).
- ret p5: trust — the 35 rows above the cutoff are sensible for a ret wearing the P3 preset: Lightbringer boots, bands and girdle at the top, then Sunwell weapons, trinkets, neck and cloak. The leather and mail rows agree with wowsims' own ret P3 set, which wears leather and mail. Only known open defects show (tickets 641, 620).
- rogue p5: trust-with-caveats — the 15 rows above the cutoff (Blackened Naaru Sliver, Cloak of Unforgivable Sin, Slayer's Boots and Bracers, Sunwell rings and bows) are right for a rogue holding both Warglaives; the list still offers 22 axes, which a TBC rogue cannot equip (recalled, unverified; F2, inert: rank 807 or lower).
- hunter p5: trust-with-caveats — Thori'dal (+175.8), the Gronnstalker's Sunwell pieces and the Sunwell trinket and neck rows are right, but 38 of the 61 rows above the cutoff are two-handed melee weapons (+11.3 to +252.3), which is only right because the page's default hunter rotation melee-weaves (see Caveats).
- enhancement p5: trust-with-caveats — 12 of the 15 items that wowsims changes from its P4 to its P5 enhancement set are above the cutoff, and the Dragon maces order correctly in the off hand; wowsims' own P5 weapons (Hand of the Deceiver -18.3, Mounting Vengeance -33.1) score as losses against the worn pair of Syphon of the Nathrezim, which I can neither confirm nor rule out as a game error (Caveats).
- warrior p5: trust-with-caveats — all 14 items that wowsims changes from its P4 to its P5 Fury set are above the cutoff; Earthstrike and Jom Gabbar still score exactly on the zero line, and Bulwark of Kings still trails Bulwark of the Ancient Kings by far more than their stats explain (F1).

## Findings

| ID | Run(s) | Exact row text | Game fact and source | Severity | matches ticket / new |
| --- | --- | --- | --- | --- | --- |
| F1 | feralcat p5, warrior p5 | feralcat: `232 \| Trinket 2 \| Earthstrike \| -64.6`, `242 \| Trinket 2 \| Jom Gabbar \| -64.6`, and the zero line `235 \| Trinket 2 \| Talisman of Ascendance \| -64.6` (a healer trinket). warrior: `648 \| Trinket 1 \| Earthstrike \| -98.5`, `657 \| Trinket 1 \| Jom Gabbar \| -98.5`, zero line `651 \| Trinket 1 \| Talisman of Ascendance \| -98.5`; `204 \| Chest \| Bulwark of Kings \| -36.8` against `7 \| Chest \| Bulwark of the Ancient Kings \| -1.3`; `1005 \| Legs \| Cloudkeeper Legplates \| -147`. | Earthstrike's use effect gives +280 attack power for 20 s. Jom Gabbar's use effect gives stacking attack power. Both are worth something to any melee spec. Source: `python3 -I $TMPDIR/p5phys/ann.py names Earthstrike "Jom Gabbar"` prints db.json `use:Earthstrike (25891)[AP280,RAP280]` and `use:Jom Gabbar (29602)[]`. Jom Gabbar's stacking amount is recalled, unverified. In the other four runs both items score above the zero line: ret Earthstrike -27.9 against Talisman -54.9, rogue -60.3 against -100.7, hunter -59.6 against -102, enhancement -49.8 against -88.3 (`python3 -I $TMPDIR/p5phys/chk.py`, "watch" lines). Bulwark of Kings (ilvl 127) and Bulwark of the Ancient Kings (ilvl 146) have the same use effect, `use:Valor (34511)[Str150,...]`. In the ret run the gap between them is 7.6 (3.9 against 11.5). In the warrior run it is 35.5, which their stat difference cannot explain. The phase-4 seat traced this to the feral and Fury rotation files, which list trinket item ids and do not include these items. That engineering pointer is not re-checked here. | medium: the tab shows wrong numbers for real items in two specs. None of these items would reach the top rows today. | new (same as p4-physical F1) |
| F2 | rogue p5 | 22 axe rows, e.g. `807 \| Main Hand \| Brutal Gladiator's Cleaver \| -234.2`, `809 \| Off Hand \| Brutal Gladiator's Hacker \| -234.3`, `911 \| Off Hand \| Vengeful Gladiator's Chopper \| -373.8`, `913 \| Off Hand \| Fel Edged Battleaxe \| -385.9` | TBC rogues cannot equip axes; rogues got one-hand axes in Wrath of the Lich King (recalled, unverified). The wowsims class table allows rogue axes: `vendor/tbc-new-fork/sim/core/character_constants.go:52` (`proto.WeaponType_WeaponTypeAxe: {}` under `ClassRogue`). Count from the inline script in "What was reviewed" (weaponType 1 joined by name to db.json): `rogue axe rows 22 best ('807', 'Main Hand', "Brutal Gladiator's Cleaver", -234.2)`. | low: wrong-equip rows are on screen, but all of them are far below the cutoff | new (same as p4-physical F2) |
| K1 | all six | `47 \| Ring 1 \| The 2 Ring \| -20` (feralcat); ret -22.1, rogue -37.6, hunter -56.9, enhancement -26.8, warrior -35.1 | The 2 Ring came with patch 2.4 (ticket 641's source); db.json gives `id34837 p1`. The ring also has one row in every caster run, so it is on all 11 tabs (report § Known defects seen again). Whether phase 5 is its real phase is for 641 to settle. | low | matches ticket 641 |
| K2 | all six | 12 rows named Band of Eternity in every run, e.g. feralcat `11 \| Ring 1 \| Band of Eternity \| -9.7` | db.json holds 12 ids named Band of Eternity (Scale of the Sands reputation steps and roles). | low | matches ticket 620 |

These rows show no meta-gem hit-cap problem. The run JSON has no
per-row notes, so ticket 746 gets no new evidence from this group. It does not
gain evidence against itself either.

## Catch-up checks

- (i) Dual-wield off hand. Rows show one placement per item, at the item's best slot (ticket 309's design). **Enhancement** offers all three Dragon-family maces and Fool's Bane in the off hand: `101 | Off Hand | Dragonstrike | -21.6`, `188 | Off Hand | Dragonmaw | -32.3`, `237 | Off Hand | Drakefist Hammer | -43.7`, `710 | Off Hand | Fool's Bane | -83.1`. **Warrior (Fury)** shows `1008 | Off Hand | Fool's Bane | -148.8`. Its Dragon maces place best in the main hand: Dragonstrike -106.4, Dragonmaw -131.3. **Rogue** shows all three in the main hand: Dragonstrike -215.5, Dragonmaw -243.4, Fool's Bane -312.7. These are the same values as at phase 4, because the start set and the sim are the same. **Hunter** has none of them, which is correct: hunters cannot use maces (`character_constants.go`, ClassHunter has no Mace). The order is plausible in every run. Dragonstrike (ilvl 136) beats Dragonmaw (ilvl 123), which beats Drakefist Hammer (ilvl 107); the three share the same haste proc, and Fool's Bane has no proc. **The Decapitator** (28767, one-hand axe) is a row in none of the six runs, because `ui/sim/constants/missing_effects_auto_gen.ts:1599` lists it. Result: the off hand offers them where the class can use them, and the order is plausible.
- (ii) Ids looked up by name in `<fork>/assets/database/db.json` (`python3 -I $TMPDIR/p5phys/ann.py names ...`); each name has exactly one id: Ring of Ghoulish Delight 281907, The Horseman's Signet Ring 281911, Witches Band 281915, The Horseman's Helm 281919, The Horseman's Blade 281923 (all `phase 3`). The three rings appear in all six runs. Ring of Ghoulish Delight is the physical ring and scores -27.3 to -44.1. The two caster rings score -51 to -86.2, at or near each spec's zero line, which is right for spell-power rings. The Horseman's Helm (plate) appears only for ret (`515 | Head | -57`) and warrior (`578 | Head | -92.9`), which is correct, since the other classes cannot wear plate. The Horseman's Blade appears in none of the six runs; `missing_effects_auto_gen.ts:2698` lists it. Rows have no id, so "under the new id" rests on there being only one db entry per name.
- (iii) Enhancement: Stonebreaker's Totem (33507, phase 4) is not a row because the start set wears it. The P4 Preset's totem slot is Stonebreaker's Totem (`ui/specs/shaman/enhancement/gear_sets/p4.gear.json`, read by `chk.py`, whose "worn:" line lists it). The tab lists no row for an item the player already wears; no worn item appears as a row in any of the six runs. The other totems sit at -22.7 (Skycall Totem, Totem of Ancestral Guidance), below the worn totem, which fits the worn totem's attack-power proc. Elemental is not in this group.
- (iv) Feralcat: the direction cannot be read from these runs. The Ferocious Bite change is fork commit `4564b6e8a` ("Keep excess Energy when Ferocious Bite misses, is dodged or parried"). `git merge-base --is-ancestor` shows it is an ancestor of both `119b9f676` and `13a980cf3`. So no before/after pair exists in this pass. The phase-5 run (baseline 2735.3) also starts from a different set than the phase-4 run (2698.9): Phase 4 BiS 6% against Phase 3. Expected direction: a small DPS gain, because a missed, dodged or parried Bite then costs only its base energy (recalled, unverified as to the live game's rule). The size should be tiny: the start set shows Melee Hit 9.09%, so Bite almost never misses, and Bite is a small share of cat damage. The baseline neither confirms nor contradicts the change.

## What was reviewed

- Six run files under `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/`:

  | Run | Baseline | Rows | Above cutoff | Start set (worn) |
  | --- | --- | --- | --- | --- |
  | `feralcat-p5.json` | 2735.3 | 890 | 15 | wowsims `feralcat/p4_6p` |
  | `ret-p5.json` | 2230.4 | 1243 | 35 | `retribution/p3` |
  | `rogue-p5.json` | 2591.9 | 1009 | 15 | `rogue/dps/p3`, Warglaives |
  | `hunter-p5.json` | 3572.7 | 1165 | 61 | `phase_4/bm/dw_6p` |
  | `enhancement-p5.json` | 2583.6 | 1276 | 27 | `enhancement/p4` |
  | `warrior-p5.json` | 2819.8 | 1503 | 38 | `p4_fury`, Warglaives |

  All six have `done: true`, `panicHit: false` and `runTimedOut: false`, and every run's `phaseSet` is `"5"`. The ret and rogue baselines equal their phase-4 baselines, which fits the same P3 start set.
- The row selection is the prompt's script, saved as `$TMPDIR/p5phys/sel.py` and run with `python3 -I sel.py <6 json>`. It selected feralcat 265, ret 298, rogue 456, hunter 441, enhancement 508 and warrior 608 rows.
- Each selected row was joined by name to `<fork>/assets/database/db.json` by `$TMPDIR/p5phys/ann.py`. The join adds ids, phase, ilvl, armor and weapon type, stats, use and proc effects, and the class allow-list. Whole-run checks over every row were made by `$TMPDIR/p5phys/chk.py`:
  - every row name is in db.json, and the highest phase is 5;
  - no worn item appears as a row;
  - equip rules, counted against `sim/core/character_constants.go`: weapon type, two-hand use, ranged type, armor type and class allow-list. The only hits are PvP medallions and General's/Marshal's Dragonhide Boots. Those flags come from my check reading only the first of several same-name ids, and a matching id exists for the class;
  - wowsims' own P5 sets (feral `p5`, enhancement `p5`, Fury `p5_fury`) were compared with the start set, and each changed item's row was read;
  - the watched items for F1 and the catch-up checks.
- The rogue axe count used an inline `python3 -I` script: rows whose db entry has `weaponType 1`.

## Rows that look fine

- Every item wowsims changes from its P4 to its P5 Fury set is above the cutoff in the tab: Bladed Chaos Tunic +72.5, Onslaught Belt +62.1, Blackened Naaru Sliver +61.9, Onslaught Bracers +58.8, Thalassian Ranger Gauntlets +55.5, Onslaught Treads +47.4, Coif of Alleria +41.9, Cloak of Unforgivable Sin +37, Band of Ruinous Delight +31.4, Hard Khorium Choker +28.8, Leggings of the Immortal Night +25.7, Demontooth Shoulderpads +25.2, Golden Bow of Quel'Thalas +25.1, Angelista's Revenge +4.6.
- Enhancement: the top rows are wowsims' P5 changes. Leggings of the Immortal Night +54.7, Skyshatter Greaves +42.7, Thalassian Ranger Gauntlets +41.8, Bladed Chaos Tunic +38.1, Blackened Naaru Sliver +31.1, Skyshatter Wristguards +29.3, Shard of Contempt +23.7, Cloak +23.1, Coif +20.3, Skyshatter Girdle +17.4, Band of Ruinous Delight +13.4, Hard Khorium Choker +9.2. The one other armor loss, Skyshatter Pauldrons -9.9, is a single swap against Swiftstrike Shoulders and is believable outside the full set.
- Feral: Stanchion of Primal Instinct +137.8 is far ahead of every other staff, and the Sunwell trinkets, rings, cloak and Thunderheart bracers and boots are gains. The P5 changes that show as losses each have a plain game reason:
  - Bladed Chaos Tunic -3.7, Gloves of Immortal Dusk -17.3 and Leggings of the Immortal Night -12.9 replace worn Thunderheart pieces (chest, hands, legs) and break the 4-piece bonus.
  - Thunderheart Waistguard -24.9 replaces Belt of One-Hundred Deaths and loses its 25 expertise rating and 74 attack power.
  - Cursed Vision of Sargeras -60.8 replaces Wolfshead Helm.
  - Clutch of Demise -10.1 replaces Choker of Endless Nightmares.
  - The idol order (Everbloom +40, Terror +34.1, White Stag +16.5 over the worn Raven Goddess) is unchanged from phase 4.
- Ret: Lightbringer Boots +61.9, Felfury Legplates +46.2, Lightbringer Bands +43, Lightbringer Girdle +40.1, then Shard of Contempt, Apolyon, Blackened Naaru Sliver, Shivering Felspine. Apolyon above the polearm, and both Bulwarks as small gains, all make sense. All librams tie at -14.5 against the worn Libram of Avengement, as at phase 4.
- Rogue: Slayer's Boots +29.7 and Slayer's Bracers +20.3 are gains; Slayer's Belt is a near-tie at -4.5. The Sunwell rings and neck are gains. No weapon is above the cutoff while both Warglaives of Azzinoth are worn, which is right: the pair has its own set bonus (db.json `setName` "The Twin Blades of Azzinoth" on 32837 and 32838).
- Hunter: Thori'dal +175.8 is the top ranged row by a wide margin, and the three Gronnstalker's Sunwell pieces (+17.5 to +26.9) are gains.
- Equip rules: there are no maces for the hunter, no swords or polearms for the shaman, and the ret gets two-handers only. Plate shows only for the warrior and the ret. Each class gets only its own relic: idols for the druid, librams for the paladin, totems for the shaman.

## Gate

As a player who knows the game, I would trust what the ret page shows, and the
top rows of the other five. Before I would trust every number:

- F1 must be fixed or disclosed. On the feral and warrior pages, an on-use trinket or chest that the rotation does not list gets no value from its use effect.
- F2 must be fixed if anyone filters or reads rogue lists further down.

## Notes for engineering

- F1: same items and same two specs as at phase 4. The phase-4 handoff's pointer (rotation files listing trinket ids) is the place to start; it was not re-checked here.
- F2: the rogue axes come from wowsims' class table.
- Hunter: the default rotation sets "Melee weave" to true (`ui/specs/hunter/dps/apls/default.apl.json`, `valueVariables`). That is why slow two-handers rank +100 to +252, and why Singing Crystal Axe, which has no stats, ranks +11.3.

## Confidence and caveats

- Enhancement weapons, open question, not a defect claim: wowsims' P5 enhancement set wields Hand of the Deceiver and Mounting Vengeance, but the tab scores them -18.3 (main hand) and -33.1 (off hand) against the worn pair of Syphon of the Nathrezim. Both swaps are believable for an enhancement shaman:
  - Hand of the Deceiver has the higher weapon DPS and stats, but it is 2.6 s against Syphon's 2.8 s, and slower main hands favour Windfury (recalled, unverified).
  - Each swap also loses one Syphon proc.
  - The set in wowsims' P5 file changes every other slot too.
  - I am not confident enough to call this wrong. A paired check would settle it: sim wowsims' P5 enhancement set with each Syphon swapped back.
- Rogue Shard of Contempt (-26.7) against Blackened Naaru Sliver (+41.8) is the reverse of the feral, ret and enhancement order. The rogue start set is already near the expertise cap (Expertise 64 rating, 5.25%, from the stats panel in `sample`), so much of Shard's expertise is wasted. That makes the order believable; not flagged.
- The `rank` field restarts at 1 in each table the harness read, so ranks repeat. I judged order by `dps` within a slot.
- The tab gives one row per item, at its best placement. For check (i), an off-hand value that is lower than the main-hand value cannot be seen.
- The hunter list depends on the page's default rotation, which melee-weaves. With weaving off, most of the 38 two-hander rows would fall below the cutoff (recalled, unverified). The tab sims the page's own settings, so I do not count this as a defect.
- Feral polearms are in the pool because ADR 0038 drops the old no-polearm rule. I did not re-rule on it.
- Ret, warrior and enhancement show many leather and mail rows above the cutoff. Paladins and warriors can wear them (`character_constants.go:13-14`), and wowsims' own ret P3 and Fury P4 sets wear leather and mail. Not flagged.
- I did not check the "v0.0.153" label. In this clone, `git -C <fork> tag -l 'v0.0.15*'` lists tags only up to v0.0.151. The judgment does not depend on the label.
- Facts marked "recalled, unverified" come from memory of the game, not from repo data. They are: the rogue axe rule, the Jom Gabbar amount, the live Ferocious Bite rule, the effect of weaving, and the Windfury speed preference.
- The scripts named above are in `$TMPDIR/p5phys/` (`/tmp/claude-1000/p5phys/`), which is not kept. The selection script is reproduced verbatim in the stage prompt.
