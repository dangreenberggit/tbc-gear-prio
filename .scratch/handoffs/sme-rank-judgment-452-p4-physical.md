# SME rank judgment — ticket 452, phase 4, physical DPS group

Stage p45-dps-pass-452, plan step 6, group p4-physical. Audience: the
engineering team. Game-domain judgment of six live Upgrades-tab runs at
phase 4 (fork `13a980cf3`).

## Verdict

- feralcat p4: trust-with-caveats — the six rows above the cutoff are sensible and include both changes wowsims makes from its P3 to its P4 cat preset (Signet of Primal Wrath, Berserker's Call); Earthstrike and Jom Gabbar are shown at exactly zero value (F1).
- ret p4: trust — the four rows above the cutoff (Empty Mug of Direbrew, Berserker's Call, both Bulwark chests) are sensible for a P3-geared ret, and wowsims ships its own "P3 Bulwark" ret set; only known open defects show (The 2 Ring, ticket 641; reputation-ring steps, ticket 620).
- rogue p4: trust-with-caveats — the single upgrade (Signet of Primal Wrath +9.5) is right; the list offers 18 axes, which a TBC rogue cannot equip (F2, inert: all rank 666 or lower).
- hunter p4: trust-with-caveats — every change wowsims makes from its P3 to its P4 BM DW set shows as an upgrade, but 32 of the 41 rows above the cutoff are two-handed melee weapons (+13 to +192), which is only right because the page's default hunter rotation melee-weaves (see Caveats).
- enhancement p4: trust — every change wowsims makes from its P3 to its P4 enhancement set shows as a gain (Berserker's Call, Stonebreaker's Totem, Signet of Primal Wrath, Swiftstrike Shoulders, Deadly Cuffs) and the off-hand maces order by item level.
- warrior p4: trust-with-caveats — both changes wowsims makes from its P3 to its P4 Fury set (Signet of Primal Wrath, Ancient Amani Longbow) are above the cutoff; Earthstrike, Jom Gabbar, Bulwark of Kings and Cloudkeeper Legplates get no value from their on-use effects (F1).

## Findings

| ID | Run(s) | Exact row text | Game fact and source | Severity | matches ticket / new |
| --- | --- | --- | --- | --- | --- |
| F1 | feralcat p4, warrior p4 | feralcat: `125 \| Trinket 2 \| Earthstrike \| -50.4`, `135 \| Trinket 2 \| Jom Gabbar \| -50.4`, and `128 \| Trinket 2 \| Talisman of Ascendance \| -50.4` (a caster trinket, the zero line). warrior: `Trinket 1 \| Earthstrike \| -94.8`, `Trinket 1 \| Jom Gabbar \| -94.8`, `Trinket 1 \| Talisman of Ascendance \| -94.8`; `Chest \| Bulwark of Kings \| -34.3` against `2 \| Chest \| Bulwark of the Ancient Kings \| -1.2`. | Earthstrike's use effect gives +280 attack power for 20 s every 2 min. Jom Gabbar's use effect gives stacking attack power for 20 s. Both are worth something to any melee spec. Read with `python3 -I $TMPDIR/ann.py names Earthstrike "Jom Gabbar"`, which prints db.json `itemEffects` `use:Earthstrike [AP280]` and `use:Jom Gabbar (29602)`. Jom Gabbar's stacking amount is recalled, unverified. In the other four runs both items score above the zero line: Earthstrike ret -27.9 vs -61.7, rogue -60.3 vs -99.6, hunter -52.5 vs -93.9, enh -31.8 vs -64.6. Bulwark of Kings is the ilvl-127 version of the ilvl-146 Bulwark of the Ancient Kings, and both have the same +150 Strength use effect. A 33 DPS gap between them is too large to come from their stat difference alone. Engineering pointer: `ui/specs/warrior/dps/apls/fury.apl.json` and `ui/specs/druid/feralcat/apls/default.apl.json` have no `autocastOtherCooldowns` and list trinket item ids; 21180, 23570 and 28484 are not in either list (`grep -o '"itemId": *[0-9]*'` on each file). The warrior run also lists Cloudkeeper Legplates (14554, use +100 AP) at -138.1, which is not on that list either. | medium: the tab shows wrong numbers for real items in two specs. None of these items would reach the top rows today. | new |
| F2 | rogue p4 | 18 axe rows, e.g. `690 \| Main Hand \| Rising Tide \| -279.5`, `694 \| Main Hand \| Wicked Edge of the Planes \| -283`, `741 \| Off Hand \| Vengeful Gladiator's Chopper \| -373.8`, `743 \| Off Hand \| Fel Edged Battleaxe \| -385.9` | TBC rogues cannot equip axes; rogues got one-hand axes in Wrath of the Lich King (recalled, unverified). wowsims' class table allows rogue axes: `vendor/tbc-new-fork/sim/core/character_constants.go:52` (`ClassRogue: WeaponTypeAxe`). Rows listed with the weaponType-1 filter over `rogue-p4.json` joined to db.json. | low: these are wrong-equip rows on screen, but all rank 666 or lower and far below the cutoff | new |
| K1 | all six | `15 \| Ring 2 \| The 2 Ring \| -7.2` (feralcat); also ret -22.1, rogue -37.6, hunter -51.7, enh -18.1, warrior -31.6 | The 2 Ring came with patch 2.4 (ticket 641's source). db.json gives `id34837 p1`. | low | matches ticket 641 |
| K2 | all six | e.g. feralcat `1 \| Ring 2 \| Band of Eternity \| 2.9`, `2 \| Ring 2 \| Band of Eternity \| -0.7`, `10 \| Ring 2 \| Band of Eternity \| -5.8`, and 7 more rows with the same name | db.json holds 12 ids named Band of Eternity (Scale of the Sands reputation steps and roles): `python3 -I $TMPDIR/ann.py names "Band of Eternity"` | low | matches ticket 620 |

No meta-gem hit-cap problem was visible in these rows, so ticket 746 has no
new evidence from this group.

## Catch-up checks

- (i) Dual-wield off hand. db.json now gives Dragonmaw (28438), Dragonstrike (28439), Fool's Bane (28657) and The Decapitator (28767) `handType 2` (one-hand). The tab shows one row per item, at the item's best placement (ticket 309's design), so each item has only one row. **Enhancement** shows all three maces in the off hand: `73 | Off Hand | Dragonstrike | -16.4`, `155 | Off Hand | Dragonmaw | -27.2`, `658 | Off Hand | Fool's Bane | -87.2`. **Warrior (Fury)** shows `Off Hand | Fool's Bane | -149.2`. Its best placement for the two Dragon maces is the main hand (Dragonstrike -100.5, Dragonmaw -125.2), so their off-hand value was lower. **Rogue** shows all three at main hand (Dragonstrike -215.5, Dragonmaw -243.4, Fool's Bane -312.7). **Hunter** has none of the three, which is correct because hunters cannot use maces (wowsims table `character_constants.go`, ClassHunter has no Mace). The order is plausible in every run: Dragonstrike is the ilvl-136 version of Dragonmaw with the same haste proc, and Fool's Bane has no proc. **The Decapitator** is absent from all four runs because wowsims' own missing-effects list names it (`ui/sim/constants/missing_effects_auto_gen.ts:1599`), and the tab drops such items by design (ADR 0038). Result: the off hand offers them where the class can use them, and the order is plausible.
- (ii) The ids were looked up by name in the fork `assets/database/db.json`, and each name has exactly one id: Ring of Ghoulish Delight 281907, The Horseman's Signet Ring 281911, Witches Band 281915, The Horseman's Helm 281919, The Horseman's Blade 281923 (all `phase 3`). The three rings appear in all six runs (Ring of Ghoulish Delight -22.8 to -37.6; the two caster rings -45.7 to -79.5, near each spec's zero line, which is right for spell-power rings). The Horseman's Helm (plate) appears only for ret (`425 | Head | -57`) and warrior (`515 | Head | -92.2`), which is correct for leather and mail wearers. The Horseman's Blade appears in none of the six; it is on wowsims' missing-effects list (`missing_effects_auto_gen.ts:2698`). Rows carry no id, so "new id" rests on there being only one db entry per name.
- (iii) Enhancement: yes. `4 | Ranged | Stonebreaker's Totem | 7.8 | Source not recorded | ABOVE` (id 33507, phase 4). It is also the totem in wowsims' own P4 enhancement set. Elemental is not in this group.
- (iv) Feralcat: the direction cannot be read from this run. The Ferocious Bite change is fork commit `4564b6e8a`, which is already an ancestor of fork `119b9f676`, the fork the 2026-10-25 run used. That earlier run (`.scratch/agent-reports/2026-10-25-p45-runs/feralcat-p4.json`) has the same baseline, 2698.9, and the same DPS on all 720 rows. `git diff --stat 119b9f676 13a980cf3 -- assets sim` shows only one locale file changed. So no before/after pair exists here. Expected direction: a small DPS gain, because a Bite that misses, is dodged or is parried now costs only its base energy (recalled, unverified as to the live game's rule). The size should be tiny: the start set shows Melee Hit 9.09%, so Bite misses almost never, and only dodges are left. Bite is also a small share of the cat's damage. The 2698.9 baseline neither confirms nor contradicts the change.

## What was reviewed

- Six run files under `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/`: `feralcat-p4.json` (baseline 2698.9, 720 rows), `ret-p4.json` (2230.4, 999), `rogue-p4.json` (2591.9, 809), `hunter-p4.json` (3530.0, 931), `enhancement-p4.json` (2543.4, 1024), `warrior-p4.json` (2778.5, 1201). The start sets were the previous phase's presets, per `matrix.tsv`. Hunter took the first "DW - 6% hit" chip (Beast Mastery), and warrior took the first "BIS" chip (Fury).
- The row selection is the prompt's script, saved as `$TMPDIR/sel.py` and run with `python3 -I $TMPDIR/sel.py <json...>`. It selected feralcat 212, ret 233, rogue 361, hunter 350, enhancement 397 and warrior 474 rows.
- Each selected row was joined by name to `<fork>/assets/database/db.json` with `$TMPDIR/ann.py` and `$TMPDIR/view.py` (stats, phase, ilvl, hand and weapon type, use and proc effects). Whole-run checks were also made over every row, not only the selected ones:
  - no row has a db phase above 4;
  - every row name is in db.json;
  - armor types fit each class;
  - weapon types per slot, counted against `sim/core/character_constants.go`;
  - each trinket's value relative to the spec's zero line.
- I compared the start presets, and wowsims' own P4 presets, with the rows: `ui/specs/*/gear_sets/p3*` and `p4*`.

## Rows that look fine

- The top rows agree with wowsims' own P4 sets wherever wowsims has one. Every item that wowsims swaps in from its P3 set to its P4 set shows as a gain in the tab:
  - feral: Signet of Primal Wrath +23, Berserker's Call +13.7;
  - warrior: Signet +5.4, Ancient Amani Longbow +9.3;
  - enhancement: the five items in the Verdict;
  - hunter: Signet +6.5, Berserker's Call +6, Dagger of Bad Mojo +9.5, and Shadowmoon Destroyer's Drape at -0.5 (a near-tie).
- Feral idols: Everbloom Idol +40 and Idol of Terror +34.2 beat the worn Idol of the Raven Goddess. This is right for one player's own damage: Raven Goddess's value is mostly a party buff (recalled, unverified).
- Ret: the Bulwark chests sit above Midnight Chestguard, and wowsims ships a "p3Bulwark" ret set. All librams tie at -14.5 against the worn Libram of Avengement, which is believable when the rotation does not judge Seal of Command (recalled, unverified).
- Equip rules hold for hunter, enhancement, warrior, ret and feral:
  - no maces for hunter;
  - no swords or polearms for enhancement;
  - ret offers two-handers only;
  - plate only for warrior and ret;
  - idols for druids, librams for paladins, totems for shamans.
- Held-in-off-hand items and shields appear in the warrior and enhancement off-hand lists; both classes can equip them.
- Holiday-boss items (Empty Mug of Direbrew, the Hallow's End rings) show "Source not recorded". Ticket 640 closed that as wontfix, so it is not reported again.

## Gate

As a player who knows the game, I would trust what ret and enhancement show. I
would trust the feral, warrior, rogue and hunter lists for their top rows.
Before I would trust every number:

- F1 must be fixed or disclosed: an on-use trinket the feral or warrior
  rotation does not list gets no value from its use effect.
- F2 must be fixed if rogue lists are ever filtered or read further down.

## Notes for engineering

- F1: the feral and warrior rotation files use only listed trinkets, and Earthstrike, Jom Gabbar and Bulwark of Kings are not on either list.
- F2: rogue axes come from wowsims' class table.
- Hunter: the default APL sets "Melee weave" to true (`ui/specs/hunter/dps/apls/default.apl.json`, valueVariables). That is why slow two-handers rank +100 to +192, and why Singing Crystal Axe, which has no stats, ranks +26.1.

## Confidence and caveats

- The `rank` field restarts at 1 in each table the harness read. For example, warrior has two rows at rank 11: `Cataclysm's Edge -654.2` and `Mama's Insurance -5.8`. I judged order by `dps` within a slot, not by `rank`.
- The tab gives one row per item, at its best placement. For check (i), an off-hand value that is lower than the main-hand value cannot be seen.
- The hunter list depends on the page's default rotation, which melee-weaves. With weaving off, the two-handers would be stat sticks and most of those 32 rows would fall below the cutoff (recalled, unverified). The tab sims the page's own settings, so I do not count this as a defect.
- Feral polearms (6 rows, all -173 or lower) are in the tab pool because ADR 0038 drops the old no-polearm rule. I did not re-rule on it.
- I did not check the "v0.0.153" label. In this clone, `git -C <fork> tag -l 'v0.0.15*'` lists tags only up to v0.0.151.
- Facts marked "recalled, unverified" come from memory of the game, not from repo data. These are the rogue axe rule, the Raven Goddess party buff, the live Ferocious Bite rule, the weaving magnitude and Jom Gabbar's amount.
- The scripts named above are in this session's `$TMPDIR` (`/tmp/claude-1000/`), which is not kept. The prompt's selection script is reproduced verbatim in the stage prompt.
