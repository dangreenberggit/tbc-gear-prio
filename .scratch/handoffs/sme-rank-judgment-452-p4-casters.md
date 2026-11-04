# SME rank judgment — ticket 452, stage p45-dps-pass-452, step 6, group p4-casters

Audience: engineering team. Game-domain judgment of five live Upgrades-tab
runs at phase 4. No player advice.

## Verdict

- balance p4: trust-with-caveats — the top rows match the swaps wowsims' own P4 balance preset makes (Brooch of Nature's Mercy, Hex Shrunken Head, Mana Attuned Band), but rank 1 tells the player to drop Idol of the Raven Goddess, whose value is mostly party-wide (F1), and Eye of the Dead sits above the cutoff at a value that looks too high (F2).
- mage p4: trust-with-caveats — all 8 rows above the cutoff are caster items with plausible gains over the worn piece; a second Ring of Ancient Knowledge is never offered (F3, ticket 309).
- shadow p4: trust — the 3 rows above the cutoff (Dark Iron Smoking Pipe, Hex Shrunken Head, Frozen Shadoweave Boots) are plausible; the caveats (F2, F4, F5) touch only rows below the cutoff.
- elemental p4: trust-with-caveats — the rows above the cutoff are plausible and the Hex Shrunken Head row (+0.4) agrees with wowsims' own P4 swap, but the one ring change wowsims' P4 elemental preset makes (a second Ring of Ancient Knowledge) cannot appear (F3, ticket 309).
- warlock p4: trust — the 4 rows above the cutoff are plausible, and the two swaps wowsims' own ZA preset makes show as rows: Hex Shrunken Head (+28.5, above the cutoff) and Carved Witch Doctor's Stick (-2, below it, within noise). The caveats touch only rows below the cutoff.

## Findings

| ID | Run(s) | Exact row text | Game fact and source | Severity | matches ticket / new |
| --- | --- | --- | --- | --- | --- |
| F1 | balance p4 | `1 \| Ranged \| Ivory Idol of the Moongoddess \| 29.4 \| The Shattered Halls (N) / Grand Warlock Nethekurse \| ABOVE` | The worn idol is Idol of the Raven Goddess 32387 (start preset `ui/specs/druid/balance/gear_sets/p3.gear.json` slot 16, decoded with `python3 -I` against `assets/database/db.json`). Its db effect is "Improved Party Auras (39926)". The sim improves the Moonkin Aura for the party when it is worn (`sim/druid/druid.go:166-168`). wowsims' own P4 balance preset keeps Raven Goddess: the p3→p4 preset diff changes slots 1, 11, 12 and 13 and leaves slot 16 alone. In the game most of this idol's value goes to the party; the player's own share is small (recalled, unverified). The tab prices only the player's own DPS, so rank 1 is the sim's honest answer, but a balance player who knows the game will read it as wrong. | low (informational; the number is right for what the tab measures) | new |
| F2 | all five; ABOVE the cutoff only in balance | balance `5 \| Trinket 1 \| Eye of the Dead \| 6.8 \| Naxxramas (N) / Sapphiron \| ABOVE`; shadow `2 \| Trinket 1 \| Eye of the Dead \| 0.8 \| … \| below`; warlock `2 \| Trinket 2 \| Eye of the Dead \| 1.4 \| … \| below`; mage `41 \| … \| -19.4`; elemental `28 \| … \| -13.4` | In the game, Eye of the Dead's on-use bonus shrinks with each spell cast, and it is a healer trinket (recalled, unverified). In the repo data the use effect is a flat buff: db.json 23047 `itemEffects` = `{"stats":{"4":450,"5":150}, "effectDurationMs":30000}`, with no charge or decay field. It is registered as `shared.NewSimpleStatActive(23047)` (`sim/common/tbc/stat_bonus_cds_auto_gen.go:179`). Its value, measured as the row DPS minus the DPS of a trinket with no caster effect in the same run, is balance 76.1, mage 88.6, shadow 52.6, elemental 69.3 and warlock 101.4. That is about the same as or above Icon of the Silver Crescent in every run (balance 71.1, mage 94.4, elemental 63.7). A caster who knows the game ranks Icon far above Eye. | medium (balance) / low (others) | new |
| F3 | balance p4, mage p4, elemental p4 | no row for `Ring of Ancient Knowledge` in any of the three runs (name grep over all rows) | Ring of Ancient Knowledge 32527 is not unique (db.json `unique` is None). The balance, mage and elemental start presets wear one copy, plus a unique Band of the Eternal Sage (29305, `unique` True). wowsims' own P4 elemental preset changes exactly that ring: slot 11 Band of the Eternal Sage → Ring of Ancient Knowledge (p3→p4 preset diff). Shadow and warlock wear two copies, so they are not affected. | medium (elemental: the only ring swap wowsims makes at P4 cannot be shown) / low (balance, mage) | matches ticket 309 |
| F4 | all five | e.g. balance `14 \| Ring 2 \| Band of Eternity \| -8.3`, `26 \| … \| -12.6`, `43 \| … \| -16.6` and more; many `Violet Signet` rows | These are the Friendly, Honored and Revered steps of reputation rings, each listed as its own upgrade with the same name. | low | matches ticket 620 |
| F5 | all five | `Mark of the Champion` twice (e.g. balance `310` and `311 \| Trinket 1 \| Mark of the Champion \| -69.3`); `Sergeant's Heavy Cape` twice; `Sergeant's Heavy Cloak` twice | These are different items with the same name: db.json 23206 and 23207 (effects "Champion of the Dawn" 29112 and 29113, a melee version and a caster version); 28378 and 28379 Sergeant's Heavy Cape (identical stats); 28377 and 28380 Sergeant's Heavy Cloak. None of them has a `factionRestriction` in db.json. The two capes are an Alliance and a Horde version (recalled, unverified). The player sees two rows with the same text and cannot tell them apart. Every one of these rows has a value of zero or close to it, so no ranking changes. | low | new |

## Catch-up checks

- (i) Not applicable to this group: none of the five specs dual-wields. No run has an `Off Hand` row. Dragonmaw, Dragonstrike, Fool's Bane and The Decapitator match no row in any of the five runs (name match in the selection script). Every start preset wears Zhar'doom, a two-handed staff (32374, handType 4), so the tab holds one-handers out of the run (owner ruling recorded in closed ticket 700).
- (ii) Present at phase 4 in all five runs, each name matching exactly one db.json id: Ring of Ghoulish Delight 281907 (Sta 43, AP 80; it sits with the rings that have no caster value in every run: balance -72, mage -94.1, shadow -44.2, elemental -66, warlock -97.4, which is correct for a physical ring); The Horseman's Signet Ring 281911 (Int 23, SD 47; balance -16.1, mage -28.4, shadow -12.2, elemental -21, warlock -30.2); Witches Band 281915 (healer ring, Heal 64 / SD 22 / MP5 9; -28.7 to -55.1). The Horseman's Helm 281919 has no row in any run, which is correct: it is plate (armorType 4), and none of these classes can wear plate. The Horseman's Blade 281923 has no row in any run.
- (iii) Elemental: Stonebreaker's Totem 33507 appears as `406 | Ranged | Stonebreaker's Totem | -72.5 | Source not recorded | below`. Its db effect is a 110 attack-power proc (Elemental Strength 43748), so for elemental the row should cost about the worn Totem of Ancestral Guidance's value, and it does: it is the lowest relic. Skycall Totem 33506 (a 100 spell-haste proc) is `22 | Ranged | Skycall Totem | -11.1`, which is plausible against the worn Totem of Ancestral Guidance.
- (iv) Not applicable to this group (no feralcat run).

## What was reviewed

The input was five live Upgrades-tab runs: backend mode, headless Chromium, `scripts/tab-harness/run-tab-cdp.mjs`, phase 4, fork `13a980cf3`, wowsims v0.0.153. The run facts come from the caller; I did not watch the runs. Run JSON:

- `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/balance-p4.json`: baseline 2173.9, eligible 737, 721 rows, 7 above the cutoff, start chip `Phase 3`.
- `…/mage-p4.json`: 2794.0, 516, 500 rows, 8 above, tab `Phase 3` / chip `Arcane - Staff`.
- `…/shadow-p4.json`: 1849.1, 553, 538 rows, 3 above, chip `P3 Preset`.
- `…/elemental-p4.json`: 2189.1, 867, 851 rows, 4 above, chip `Phase 3`.
- `…/warlock-p4.json`: 2801.8, 530, 515 rows, 4 above, chip `T6`.

Each JSON holds two tables. The ranks restart in the second, which is the below-cutoff list. The selection script sorts by numeric rank, so the two tables interleave in its output.

How the input was produced: the caller's selection script, saved to `$TMPDIR/sel.py`, run with `python3 -I $TMPDIR/sel.py <the five json paths>` (rc 0). It selected 218, 210, 217, 228 and 203 rows. I also ran these checks with `python3 -I` against `vendor/tbc-new-fork/assets/database/db.json`:

- Decoded the start presets: `ui/specs/druid/balance/gear_sets/p3.gear.json`, `mage/dps/gear_sets/p3ArcaneStaff.gear.json`, `priest/dps/gear_sets/p3.gear.json`, `shaman/elemental/gear_sets/p3.gear.json` and `warlock/dps/gear_sets/t6.gear.json`.
- Diffed each start preset against wowsims' next preset (balance `p4`, elemental `p4`, warlock `za`) and looked up each changed item in the rows.
- Checked every row (not only the selection) against phase ≤ 4, max armor type, `classAllowlist`, and the class weapon and ranged types in `ui/sim/player/classes/capabilities_auto_gen.ts`. The result was no violation in any run. I first wrote shaman's list without staves; that flagged staves for elemental, and shamans can use staves, so those flags were my error.
- Read hand types: every `Main Hand` row in all five runs is a two-hander, and no run has an `Off Hand` row.

Baseline gear: every preset wears Zhar'doom and The Skull of Gul'dan. The other trinket is Ashtongue Talisman of Equilibrium (balance), Serpent-Coil Braid (mage), Icon of the Silver Crescent (shadow, warlock) or The Lightning Capacitor (elemental). The relic is Idol of the Raven Goddess (balance), Eredar Wand of Obliteration (mage), Wand of Prismatic Focus (shadow), Totem of Ancestral Guidance (elemental) or Wand of the Forgotten Star (warlock).

## Rows that look fine

- Gear the character already wears never shows as a row (for example, warlock's Wand of the Forgotten Star and mage's Band of the Eternal Sage).
- No item from after phase 4 appears. There are no Sunwell, Magisters' Terrace or Brutal Gladiator items.
- The ZA items that matter for casters are present and near the top: Hex Shrunken Head, Brooch of Nature's Mercy, Loop of Cursed Bones and Carved Witch Doctor's Stick.
- Items with no caster value (physical trinkets and rings, feral idols, feral staves, axes, polearms) each form one block at the same DPS in each run. That value is the cost of removing the worn piece in that slot, which is the right reading.
- Ashtongue Talisman of Shadows is in the warlock zero-value block (-100). That is correct for the default Destruction build: `ui/specs/warlock/dps/spec.ts:71` uses TalentsDestruction, and `apls/destruction.apl.json` has no Corruption, while the talisman procs only from Corruption (`sim/warlock/items.go:308-322`).
- Brooch of Nature's Mercy beats The Sun King's Talisman in all five runs (+7.3 to +21.1). wowsims makes the same swap in its own P4 balance and elemental presets.
- Hammer of Righteous Might (Sta 55, Int 37, SD 168) sits well above the zero-value block, which is right for a caster mace.

## Gate

Would a caster who knows TBC trust this at phase 4? Yes for shadow and warlock. Yes with caveats for balance, mage and elemental. Before a plain yes:

- Balance: an engineer decides whether F1 needs a note. The number itself is correct for the player's own DPS.
- F2: someone confirms or rejects the recalled game fact that Eye of the Dead's bonus decays. If it does decay, the balance row above the cutoff is wrong.
- Elemental (and balance, mage): ticket 309 is outside this stage.

## Notes for engineering

- F2: the tab prices Eye of the Dead at about Icon of the Silver Crescent's value in every caster run.
- F3: elemental cannot see a second Ring of Ancient Knowledge, the one ring change wowsims' own P4 preset makes.
- F5: some rows have text identical to another row.

## Confidence caveats

- F1 (the party-wide value of the Raven Goddess idol), F2 (Eye of the Dead's bonus decays per cast), F5 (the two Sergeant's capes are faction twins) and the arena-season dating are **recalled, unverified**. The repo holds no tooltip text for spell 28780.
- `sample` in each JSON is cut off after "Showing", so I could not read the tab's notice lines. That includes the "one-handed weapons were not ranked" line that closed ticket 700 describes. I did not check that the line is on screen.
- Ticket 746 (meta-gem repair counts hit past the cap for every spec except ret and feral) applies to all five specs. No row I read shows a gem-swap effect I could tell apart, so I report no finding against it. Any such finding would be `matches ticket 746`.
- Idol of the Unseen Moon 33510 has no row. It is in `data/universes/balance-p4.report.json` under `excludedUnimplementedEffect`, and its sim code is only a commented stub (`sim/common/tbc/stat_bonus_procs_auto_gen.go` near line 5380). Totem of the Void 28248 has no row; db.json gives it only a heroic source (difficulty 2). Heroic items are left out on purpose. I treat both absences as deliberate.
- Druid polearm rows (Halberd of Desolation and others) follow wowsims' own class table (`capabilities_auto_gen.ts:31`). I am not sure whether druids could use polearms in TBC, so I report nothing. All of those rows are in the zero-value block in any case.
- Arena (PvP) items are present in every run. The earlier SME ruling (handoff `sme-rank-judgment-upgrades-all-dps-specs.md` F3) and ADR-0028 cover that policy, so I treat it as outside this judgment.
- I ran no git commands, ran no sims, and edited only this file.
