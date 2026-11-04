# SME rank judgment — ticket 452, stage p45-dps-pass-452, step 6, group p5-casters

Audience: engineering team. Game-domain judgment of five live Upgrades-tab
runs at phase 5. No player advice.

## Verdict

- balance p5: trust-with-caveats — 9 of the 17 rows above the cutoff are swaps that wowsims' own P5 balance preset makes, but rank 4 tells the player to drop Idol of the Raven Goddess, which that preset keeps (F1). Also, the preset's new head, shoulder and hand items show as losses of 60 to 68 DPS, because each one breaks the worn 4-piece set bonus (F3, ticket 523).
- mage p5: trust-with-caveats — all 24 rows above the cutoff are caster items with plausible gains over the worn piece. A second Ring of Ancient Knowledge is never offered (F4, ticket 309). The other caveats touch only rows below the cutoff.
- shadow p5: trust — the 15 rows above the cutoff (Sunwell T6 wrist/waist/feet, Sunwell legs and cape, Hex Shrunken Head, Dark Iron Smoking Pipe, Timbal's Focusing Crystal and others) are plausible. The caveats (F2, F5, F6) touch only rows below the cutoff.
- elemental p5: trust-with-caveats — 8 of the 15 rows above the cutoff are swaps that wowsims' own P5 elemental preset makes. The preset's new head, chest and hand items show as losses of 36 to 56 DPS, because each one breaks the worn 4-piece set bonus (F3, ticket 523).
- warlock p5: trust-with-caveats — 9 of the 14 rows above the cutoff are swaps that wowsims' own Sunwell warlock preset makes, Sunfire Robe at rank 1 included. The preset's Leggings of Calamity, Dark Conjuror's Collar and Handguards of Defiled Worlds show as losses of 93 to 108 DPS, because each one breaks the worn 4-piece Malefic bonus (F3, ticket 523).

## Findings

| ID | Run(s) | Exact row text | Game fact and source | Severity | matches ticket / new |
| --- | --- | --- | --- | --- | --- |
| F1 | balance p5 | `4 \| Ranged \| Ivory Idol of the Moongoddess \| 30.3 \| The Shattered Halls (N) / Grand Warlock Nethekurse \| ABOVE` | The worn idol is Idol of the Raven Goddess 32387. db.json gives its effect as "Improved Party Auras (39926)" (`python3 -I` name lookup in `vendor/tbc-new-fork/assets/database/db.json`). wowsims' own P5 balance preset keeps it: the p4→p5 preset diff (`ui/specs/druid/balance/gear_sets/p4.gear.json` vs `p5.gear.json`, script `$TMPDIR/p5an.py`) changes slots 0–3, 5–11 and 13–15 and leaves slot 16 alone. In the game most of this idol's value goes to the party, and the player's own share is small (recalled, unverified). The feral idols (no balance value) sit at -16.1, so the tab prices Raven Goddess at 16.1 DPS for the player alone. The number is right for what the tab measures, but a balance player who knows the game reads rank 4 as wrong. (same as p4-casters F1) | low (informational) | new |
| F2 | all five; below the cutoff in every run | balance `52 \| Trinket 2 \| Eye of the Dead \| -18.1 \| Naxxramas (N) / Sapphiron \| below` vs `69 \| Trinket 2 \| Icon of the Silver Crescent \| -21.1`; shadow `5 \| Trinket 1 \| Eye of the Dead \| 0.8 \| … \| below` (Icon is worn); elemental `30 \| … \| Eye of the Dead \| -11` vs `64 \| … \| Icon of the Silver Crescent \| -19.9`; warlock `64 \| … \| -26.9` vs `70 \| … \| -28.8`; mage `61 \| … \| -19.4` vs `26 \| … \| -13.6` | In the game, Eye of the Dead is a healer trinket whose on-use bonus shrinks with each spell cast (recalled, unverified). db.json 23047: passive `{"4":70,"5":24}` (StatHealingPower 70, StatSpellDamage 24 per `proto/common.proto:177-178`) and a 30 s use effect, "The Eye of the Dead (28780)". Value over a trinket with no caster effect (the most common trinket DPS in each run): Eye / Icon = balance 75.6 / 72.6, mage 88.6 / 94.4, elemental 70.4 / 61.5, warlock 102.1 / 100.2. Shadow wears Icon, and Eye replaces it at +0.8. A caster who knows the game ranks Icon well above Eye (recalled, unverified). At phase 5 no Eye row is above the cutoff. (same as p4-casters F2) | low | new |
| F3 | balance p5, elemental p5, warlock p5 (shadow wears a 4-piece set too, but there is no wowsims priest P5 preset to compare) | warlock `16 \| Legs \| Leggings of Calamity \| -93.3`, `18 \| Head \| Dark Conjuror's Collar \| -108`, `17 \| Hands \| Handguards of Defiled Worlds \| -93.7`; balance `19 \| Head \| Cover of Ursoc the Mighty \| -66.9`, `18 \| Shoulders \| Spaulders of Devastation \| -60.4`, `20 \| Hands \| Tranquil Moonlight Wraps \| -68`; elemental `17 \| Head \| Cowl of Gul'dan \| -47.8`, `16 \| Chest \| Garments of Crashing Shores \| -35.6`, `18 \| Hands \| Gauntlets of the Ancient Shadowmoon \| -55.8` (all below the cutoff) | Each start preset wears exactly 4 pieces of its T6 set: warlock Malefic hood, mantle, gloves and leggings; balance Thunderheart head, shoulders, chest and hands; elemental Skyshatter head, shoulders, chest and hands (decoded from `za.gear.json`, `p4.gear.json`, `p4.gear.json` by `$TMPDIR/p5an.py`). wowsims' own P5 presets (`warlock/dps/gear_sets/swp.gear.json`, `druid/balance/gear_sets/p5.gear.json`, `shaman/elemental/gear_sets/p5.gear.json`) keep the 4-piece bonus with the Sunwell set wrist, waist and feet, and put the rows above into the freed slots. The tab values each row as one swap, so each one breaks the bonus. The Sunwell set pieces do show above the cutoff (for example warlock `4 \| Wrist \| Bracers of the Malefic \| 30.4`, `5 \| Waist \| Belt of the Malefic \| 29.6`), so the first step is visible. Leggings of Calamity shows the effect most plainly: it is `1 \| Legs \| … \| 47.5 \| ABOVE` for balance, whose legs are not a set piece, and -93.3 for warlock, whose legs are. | medium (this is how wowsims builds every P5 caster set it ships) | matches ticket 523 |
| F4 | balance p5, mage p5 | no row for `Ring of Ancient Knowledge` in any of the five runs (name grep over all rows, `$TMPDIR/p5an.py`) | Ring of Ancient Knowledge 32527 is not unique (db.json `unique` is None, per p4-casters F3). Balance wears one copy plus Mana Attuned Band. Mage wears one copy plus Band of the Eternal Sage. Shadow, elemental and warlock wear two copies, so they are not affected. At P5, wowsims' own presets move away from this ring (balance p5 preset: slot 10 → Ring of Omnipotence), so the missing row matters less than at P4. | low | matches ticket 309 |
| F5 | all five | e.g. balance `17 \| Ring 2 \| Band of Eternity \| -9.7`, `42 \| … \| -14.5`, `57 \| … \| -18.9`, and many `Violet Signet` rows | These are the Friendly, Honored and Revered steps of the reputation rings, each listed as its own upgrade under the same name. | low | matches ticket 620 |
| F6 | all five | `Mark of the Champion` twice (e.g. balance `529` and `530 \| Trinket 2 \| Mark of the Champion \| -93.7`); `Sergeant's Heavy Cape` twice (balance `165`/`166 \| Back \| … \| -37.4`); `Sergeant's Heavy Cloak` twice (balance `331`/`332 \| Back \| … \| -68.5`) | These are different items with the same name (db.json 23206/23207, 28378/28379, 28377/28380, per p4-casters F5). The two rows of each pair have the same DPS in every run, so no ranking changes, but the player sees two rows with the same text and cannot tell them apart. (same as p4-casters F5) | low | new |

## Catch-up checks

- (i) Not applicable to this group: none of the five specs dual-wields. No run has an `Off Hand` row, and every `Main Hand` row in all five runs is a two-hander (handType 4 in db.json). Dragonmaw, Dragonstrike, Fool's Bane and The Decapitator match no row in any of the five runs.
- (ii) Present at phase 5 in all five runs, each name matching exactly one db.json id: Ring of Ghoulish Delight 281907 (Sta 43, AP 80) sits with the rings that have no caster value (balance -73.6, mage -94.1, shadow -44.2, elemental -73, warlock -96.2), which is correct for a physical ring. The Horseman's Signet Ring 281911 (Int 23, healing 47, SD 47): balance -16.9, mage -28.4, shadow -12.2, elemental -28.3, warlock -27.4. Witches Band 281915 (a healer ring: healing 64, SD 22, MP5 9): -28.7 to -53.3. The Horseman's Helm 281919 has no row in any run, which is correct: it is plate (armorType 4), and none of these classes can wear plate. The Horseman's Blade 281923 has no row in any run.
- (iii) Elemental: Stonebreaker's Totem 33507 appears as `505 | Ranged | Stonebreaker's Totem | -73.9 | Source not recorded | below`. Its db effect is an attack-power proc (Elemental Strength 43748), so for elemental it is worth about nothing, and the row shows the cost of removing the worn Totem of Ancestral Guidance. Skycall Totem 33506 is `12 | Ranged | Skycall Totem | -7.2`, plausible against the worn totem.
- (iv) Not applicable to this group (no feralcat run).

## What was reviewed

Five live Upgrades-tab runs: backend mode, headless Chromium, `scripts/tab-harness/run-tab-cdp.mjs`, phase 5, fork `13a980cf3`, wowsims v0.0.153. The run facts come from the caller; I did not watch the runs. Each JSON records `phaseSet: "5"`, `done: true`, `panicHit: false`, `runTimedOut: false`, `runFailed: false`.

| Run | JSON | Baseline DPS | Eligible | Rows | Above cutoff | Start preset |
| --- | --- | --- | --- | --- | --- | --- |
| balance | `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/balance-p5.json` | 2202.8 | 907 | 891 | 17 | `Phase 4` (`druid/balance/gear_sets/p4.gear.json`) |
| mage | `…/mage-p5.json` | 2794.0 | 629 | 613 | 24 | `Phase 3` / `Arcane - Staff` (`p3ArcaneStaff.gear.json`), fallback p3 |
| shadow | `…/shadow-p5.json` | 1849.1 | 673 | 658 | 15 | `P3 Preset` (`priest/dps/gear_sets/p3.gear.json`), fallback p3 |
| elemental | `…/elemental-p5.json` | 2206.6 | 1070 | 1055 | 15 | `Phase 4` (`shaman/elemental/gear_sets/p4.gear.json`) |
| warlock | `…/warlock-p5.json` | 2799.6 | 647 | 632 | 14 | `Zul'Aman` (`warlock/dps/gear_sets/za.gear.json`) |

The mage and shadow baselines (2794.0, 1849.1) equal their phase-4 baselines, which is expected: both runs start from the same p3 preset.

How the input was produced:

- The caller's selection script, saved to `$TMPDIR/sel.py` (`$TMPDIR` = `/tmp/claude-1000`), run as `python3 -I $TMPDIR/sel.py balance-p5.json mage-p5.json shadow-p5.json elemental-p5.json warlock-p5.json` from the runs folder (rc 0). It selected 271, 263, 260, 277 and 255 rows. Each JSON holds two tables whose ranks restart, so the two tables interleave in the output.
- `$TMPDIR/p5an.py` (`python3 -I`, rc 0) decoded each start preset against `vendor/tbc-new-fork/assets/database/db.json`. It diffed balance, elemental and warlock against wowsims' own next preset (`p5`, `p5`, `swp`) and looked up each changed item in the rows. It computed the most common trinket DPS per run and the Eye of the Dead and Icon values, grepped the catch-up names, and checked every row (not only the selection) against phase ≤ 5 and the class's maximum armor type. It also listed worn items that show as rows and repeated names.
- A second `python3 -I` pass checked every row against db.json `classAllowlist` (class ids from `proto/common.proto:101-105`) and read the weapon and ranged types of every `Main Hand` and `Ranged` row. No violation in any run. The Main Hand rows are two-handed staves, maces and polearms for balance; staves only for mage, shadow and warlock; and staves, maces and axes for elemental. The Ranged rows are idols, wands and totems as each class needs.
- I compared the phase-4 JSONs for Magisters' Terrace and Sunwell sources: none at phase 4, so no phase-5 item leaks into phase 4.

## Rows that look fine

- wowsims' own P5 swaps show up above the cutoff. Balance: Tattered Cape of Antonidas, Thunderheart Cord / Bands / Footwraps, Breeches of Natural Aggression, Ring of Omnipotence, Loop of Forged Power, Shifting Naaru Sliver, Amulet of Unfettered Magics. Elemental: Chain Links of the Tumultuous Storm (rank 1), Skyshatter Treads / Bands / Cord, Tattered Cape, Ring of Omnipotence, Shifting Naaru Sliver, Amulet of Unfettered Magics. Warlock: Sunfire Robe (rank 1), Tattered Cape, Wand of the Demonsoul, Bracers / Belt / Boots of the Malefic, Ring of Omnipotence, Shifting Naaru Sliver, Amulet of Unfettered Magics.
- Grand Magister's Staff of Torrents (SD 266, hit 50, crit 49) ranks below the worn Zhar'doom (SD 259, crit 36, haste 55) in every run (-6.3 to -19.5). Each run's stats panel shows the main school at or near the hit cap (mage arcane 15.95%, shadow 21.02%, elemental nature 21.24%, warlock 16.55%, balance 18.38%), so the staff's hit adds nothing. That ordering is right.
- No worn item shows as a row. No item from after phase 5 appears. Magisters' Terrace heroic items (Timbal's Focusing Crystal, Shard of Contempt, Commendation of Kael'thas, Rod of the Blazing Light) appear at phase 5 and not at phase 4. The project admits Magisters' Terrace as its one heroic on purpose (`scripts/assemble_universe.py` `PHASE_HEROIC_DUNGEONS`). Timbal's Focusing Crystal is above the cutoff for shadow only (+3.0), the spec whose periodic damage it procs from. For the other four specs it is -38.8 to -62.3.
- Items with no caster value (physical trinkets and rings, feral idols, feral staves, maces and polearms) each form a block at one DPS per run, which is the cost of removing the worn piece in that slot.
- Leggings of Calamity is the top row for balance (+47.5) and second for elemental (+41), where the worn legs are not a set piece.

## Gate

Would a caster who knows TBC trust this at phase 5? Yes for shadow, and yes with caveats for balance, mage, elemental and warlock. Before a plain yes:

- F3 (ticket 523): the set-move swaps are the main way wowsims builds every P5 caster set. Until the tab can show the value of moving a set bonus, it shows the P5 head, chest, hand and leg items for balance, elemental and warlock as large losses.
- F1: an engineer decides whether the Raven Goddess row needs a note.
- F2: someone confirms or rejects the recalled game fact that Eye of the Dead's bonus decays. At phase 5 the question does not move any row above the cutoff.

## Notes for engineering

- F3: P5 caster set rows. Leggings of Calamity is +47.5 for balance and -93.3 for warlock.
- F1: the idol that buffs the party ranks as a self-DPS loss.
- F6: same-name rows, also seen at phase 4.

## Confidence caveats

- F1 (the party-wide value of the Raven Goddess idol), F2 (Eye of the Dead's bonus decays per cast) and the Malefic, Thunderheart and Skyshatter 4-piece bonuses being worth tens of DPS are **recalled, unverified**. I did not read the set-bonus code.
- wowsims' P5 balance, elemental and warlock presets all replace Zhar'doom with Sunflare and Heart of the Pit. Neither has a row in any run, because the tab holds one-handers out when a two-hander is worn (owner ruling recorded in closed ticket 700). I did not report this. I could not check that the "one-handed weapons were not ranked" notice is on screen: each JSON's `sample` is cut off at "Showing", and no field in any of the five JSONs contains the string "one-hand".
- Mage and shadow have a second, smaller block of no-value trinkets: Earthstrike, Slayer's Crest, Jom Gabbar, Bloodlust Brooch, Berserker's Call and Empty Mug of Direbrew. It is at -103 against -108 for mage, and at -55.3 against -51.8 for shadow. The gap is 3.5 to 5 DPS, all below the cutoff, and no ranking changes. I report no finding against it.
- Mage and shadow have no wowsims P5 preset, so for those two runs I had no upstream swap list to compare with.
- Ticket 746 (meta-gem repair counts hit past the cap for specs other than ret and feral) applies to all five specs. No row I read shows a gem-swap effect I could tell apart, so I report no finding against it. Any such finding would be `matches ticket 746`.
- The page heading in each `sample` reads "Phase 3 (2.2 - T6) - Alpha" while `phaseSet` is "5". The p4 runs show the same heading. I took it to be the site's release label, not the tab's phase, and did not check this further.
- Arena (PvP) items are present in every run. The earlier SME ruling (handoff `sme-rank-judgment-upgrades-all-dps-specs.md` F3) and ADR-0028 cover that policy.
- I ran no git commands and no sims, and I edited only this file.
