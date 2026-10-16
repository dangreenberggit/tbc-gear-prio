# SME rank judgment — ticket 613 (with 611), stage tab-item-lists, chunk K4

## Verdict

**trust-with-caveats.**

The top rows of all six fixtures and the ret phase-4 golden are sound for the
game. No row breaks a class equip rule, no row is from a later phase than its
list, and no arena item remains. The new rows that the stage added are real
items, and their numbers agree with their stat lines. The caveats are about
labelling and availability, not about the numbers:

1. The new #1–#5 trinket in almost every fixture, Empty Mug of Direbrew, is a
   holiday-boss drop (Brewfest), and the row shows no source.
2. The 2 Ring is offered at phase 2 and 3, but the game added it in patch 2.4.
3. The reason recorded for decision N6 is only partly true for TBC arena
   gear (see the `contested:` line under Game problems).

## What was reviewed

Pair: `C:\Users\dgree\Code\lulz\tbc-wt\tab-item-lists`, branch
`feat/tab-item-lists`, HEAD `e1f7909f`. Fixtures recorded 2026-10-15 at fork
`2d168e74f`, 3000 iterations, cutoff 3 DPS.

| Fixture | Spec, phase | Start gear | Baseline DPS | List size |
|---|---|---|---|---|
| `data/tab-fixtures/ret-p3-p2.json` | ret, 3 | Phase 2 "P2" | 2082.7 | 715 |
| `data/tab-fixtures/feral-p3-p2bis.json` | feral, 3 | Phase 2 "BiS 6%" (wears Merciless Gladiator's Maul) | 2449.3 | 569 |
| `data/tab-fixtures/feral-p3-nordrassil4.json` | feral, 3 | Phase 2 "Alt 6%" (wears Merciless Gladiator's Maul) | — | 569 |
| `data/tab-fixtures/feral-p3-th-hands-legs.json` | feral, 3 | gear link with Thunderheart Gauntlets + Leggings | — | 569 |
| `data/tab-fixtures/feral-p2-malorne4.json` | feral, 2 | Phase 1 "Alt 6%" (wears Terestian's Stranglestaff) | 2305.4 | 391 |
| `data/tab-fixtures/feral-p5-th4pc.json` (new) | feral, 5 | Phase 4 "BiS 6%" (Thunderheart 4pc, wears Vengeful Gladiator's Staff) | 2735.3 | 814 |
| `data/desktop-gate/golden-ret-p4-cap40.json` | ret, 4 | P3 preset, first 40 by EP | 2230.4 | 40 |

How the input was read (all read-only; scripts in my scratchpad):

- Above-cutoff rows, compared with the previous record:
  `git -C <pair> show e1f7909f~1:data/tab-fixtures/<name>.json`, matched by
  `itemId`. Golden compared with `git -C <pair> show 6a4a49ae~1:data/desktop-gate/golden-ret-p4-cap40.json`.
- Per-slot rows: `ranking.items` filtered by `slot`, with `slotChoice`.
- Stat lines: `vendor/wowsims/db.json` `items[]` (`scalingOptions["0"]`,
  `itemEffects`, `sources`, `phase`, `classAllowlist`) and
  `data/items/index.json` (same values where both exist). Stat numbers are the
  fork's `Stat` enum, `vendor/tbc-new-fork/proto/common.proto:169-219`
  (17 = attack power, 23 = armor penetration, 30 = resilience).
- Equip and phase check over every row of every fixture: class allowlist,
  armor type, weapon type, db phase ≤ list phase, arena name prefixes. Result:
  no class violations, no row above its list's phase, no Gladiator rows.
- wowsims' own feral gear sets:
  `vendor/tbc-new-fork/ui/specs/druid/feralcat/gear_sets/p3_6p, p4_6p, p5.gear.json`.

## Answers to the stage's questions

### Q1. Are the re-recorded top rows sound?

Yes. Every above-cutoff row that existed before has the same delta as in the
previous record (for example ret Torch of the Damned 44.4, feral Everbloom Idol
43.5, Shadowmaster's Boots 13.1). The new above-cutoff rows are:

- ret-p3-p2: Empty Mug of Direbrew +20.6, Swiftstrike Bracers +8.5
  (leatherworking, Black Temple pattern; Agi 20, AP 50, haste 27 — slightly
  above Swiftsteel Bracers +7.7, which is reasonable for ret).
- feral-p3 (all three): Empty Mug of Direbrew +16.6 to +17.3.
- feral-p3-th-hands-legs: also Ring of the Recalcitrant +5.7, The 2 Ring +4.7,
  Vindicator's Band of Triumph +3.6 (Q2).
- feral-p5-th4pc (new): Stanchion of Primal Instinct +137.3 is the top row,
  which matches wowsims' own P5 set (`p5.gear.json` wears 34198). Shard of
  Contempt +22.8, Cloak of Unforgivable Sin +15.0, Band of Ruinous Delight
  +11.0, Angelista's Revenge +11.5 and Thunderheart Wristguards +11.1 are all
  in that same wowsims P5 set.

### Q2. The new db-phase items

**Empty Mug of Direbrew (281739).** Real, and correctly a candidate, with the
caveats in finding F1.

- What it is: a Brewfest drop from Coren Direbrew, in Blackrock Depths during
  the two-week Brewfest event; added in patch 2.4.3
  ([warcraft.wiki.gg](https://warcraft.wiki.gg/wiki/Empty_Mug_of_Direbrew)).
  Wowhead's TBC Classic database has a page for id 281739 with this name
  (wowhead.com/tbc/item=281739). Upstream wowsims registers 281739 as an
  on-use item and its default feral APL casts it
  (`data/presets/feral/upstream-item-id-renames.json`, `source` line; the
  owner's own capture referenced the older id 38287).
- The row in db.json: ilvl 141, unique trinket, 98 AP passive, use 376 AP
  for 20 s, 2 min cooldown, shared on-use category 1141.
- Bloodlust Brooch (29383) in db.json: ilvl 110, 72 AP passive, use 278 AP
  for 20 s, 2 min cooldown, same category 1141. The Mug is a Brooch with about
  35% larger numbers.
- The figures agree with that. The Mug replaces the Brooch in each fixture
  (`slotChoice`). The difference is +26 AP all the time, plus +98 AP during
  the 20 s use. That is about 45 AP on average, which is worth roughly 17–22
  DPS for a cat or a ret at these gear levels (my estimate from the stat
  line, not a sim). The deltas are: ret-p3 +20.6, feral-p3 +16.6 to +17.3,
  ret-p4 golden +22. In feral-p5 the Mug is +4.3 against Berserker's Call
  while the Brooch is −13.8 against the same item, a gap of 18.1. That is
  consistent across all fixtures.
- Unverified: the wiki lists only the original ilvl-110 version, with the
  same numbers as the Brooch. The ilvl-141 numbers come from upstream's
  db.json for the re-issued id. If the live Anniversary item were the
  ilvl-110 version, the Mug would be worth about 0 against a worn Brooch, not
  +17 to +22.

**The Frost Lord's War Cloak (278819).** Real, and correctly a candidate.

- What it is: a Midsummer (Ahune) holiday drop. A real raider's log wore it,
  and the owner said the neck and back were Ahune items (ticket 108,
  `.scratch/carry-forward/issues/108-shredzepelin-fixture-carries-out-of-range-item-ids.md`,
  "Owner context, 2026-08-10"). Wowhead TBC Classic has a page for id 278819.
- Its stats are ilvl 128, Agi 25, Sta 24, AP 56.
- Its figures agree with that. Against the worn Thalassian Wildercloak
  (Agi 28, Sta 28, AP 68) it is 3 Agi and 12 AP lower, and it ranks −6.4
  (feral-p3-p2bis) and −8.6 (feral-p5). It is below the cutoff everywhere,
  which is right.

**Other new above-cutoff `unknown` rows.** All are real items that a player
could have at that phase, except The 2 Ring.

| Item | Stat line (db.json) | Game source | At this phase? | Figure |
|---|---|---|---|---|
| 33509 Idol of Terror | ilvl 128, Mangle proc +65 Agi (Primal Instinct) | Badge of Justice vendor — **recalled, unverified** | Yes (db phase 4; list phase 5) | +33.1 vs worn Raven Goddess. A frequent agility proc on a cat's main ability; plausible next to Everbloom +39.7 |
| 34887 Angelista's Revenge | ilvl 141, Agi 29, Sta 28, AP 58, ignores 126 armor | Patch 2.4 — **recalled, unverified**; it is in wowsims' own P5 set (`p5.gear.json`) | Yes (phase 5) | +11.5, replacing Band of the Eternal Champion (same Agi, loses the 160 AP proc, gains 126 armor ignored). Plausible |
| 35167 Guardian's Dragonhide Bracers | ilvl 154, Str 25, Agi 25, Crit 24, resilience 17, socket | Season 4 honor gear, no rating requirement — **recalled, unverified** | Yes (phase 5) | +9.8 vs worn Vindicator's Dragonhide Bracers (+3 Str, +3 Agi, +3 Crit). Plausible |
| 34898 Staff of the Forest Lord | ilvl 146, Str 50, Agi 52, feral AP 1110 | Badge of Justice vendor, patch 2.4 — **recalled, unverified** | Yes (phase 5) | +8.3 vs worn Vengeful Gladiator's Staff (gains 52 Agi; loses 22 hit and 46 crit). Plausible |
| 28791 Ring of the Recalcitrant | ilvl 125, Agi 24, Sta 27, AP 54 | Quest reward for Magtheridon's Head, one of four ring choices ([warcraft.wiki.gg, The Fall of Magtheridon](https://warcraft.wiki.gg/wiki/The_Fall_of_Magtheridon)) | Yes (phase 1 raid) | +5.7. Plausible |
| 34837 The 2 Ring | ilvl 135, +22 Str/Agi/Sta/Int/Spi | Very rare drop from Old Man Barlo's fishing-daily bag; **added in patch 2.4.0** ([warcraft.wiki.gg](https://warcraft.wiki.gg/wiki/The_2_Ring)) | **No** — db says phase 1, but the game added it in 2.4 (finding F2) | +4.7; the stat line explains it |
| 33919 Vindicator's Band of Triumph | ilvl 141, Sta 34, AP 44, Crit 26, ignores 56 armor, resilience 22 | Season 3 honor ring — **recalled, unverified** | Yes (phase 3) | +3.6. Plausible |

### Q3. Absence of the arena weapons (N6)

It leaves no fixture's top rows misleading. Slot by slot:

- **ret-p3-p2.** Vengeful Gladiator's Greatsword was +10.0, below Torch of the
  Damned +44.4 and Cataclysm's Edge +26.4, which are still the top weapon
  rows. Nothing moved up into its place.
- **feral-p3, all three fixtures.** The start gear wears Merciless Gladiator's
  Maul. The Vengeful Staff (+45 to +48) is gone, and no weapon row is above the
  cutoff. The best non-arena weapon, Pillar of Ferocity (Hyjal), is −22.7 /
  −5.1 against the worn maul. That is honest: the tab does not present a
  weaker weapon as an upgrade.
- **feral-p3-th-hands-legs.** Vengeful Gladiator's Dragonhide Tunic (+30.0) is
  gone, so Thunderheart Chestguard (+26.3) is now the top chest. That is the
  chest that wowsims' own P3 set wears (`p3_6p.gear.json`, 31042), so it is a
  correct top chest.
- **feral-p2-malorne4.** Merciless Gladiator's Maul (+52.8) is gone, and no
  weapon row is above the cutoff against the worn Terestian's Stranglestaff.
  That is honest for a player who does not do arena.
- **feral-p5-th4pc.** The start gear wears Vengeful Gladiator's Staff. The top
  weapon, Stanchion +137.3, is correct.

What the team should know about the product: wowsims' own feral sets for
phases 3 and 4 wear Vengeful Gladiator's Staff (`p3_6p.gear.json`,
`p4_6p.gear.json`). Under N6, a cat at phases 2–4 never sees the weapon that
those lists treat as best in slot. A cat who is not already wearing an arena
weapon sees the best raid weapon instead. That is a scope choice, not a wrong
number.

### Q4. Things the executor noticed

- **Other druid sets' tier and PvP pieces in feral lists.** Examples are
  Thunderheart Bands/Bracers (caster and healer), Kodohide and Wyrmhide
  bracers, Vindicator's Kodohide Belt, and Wushoolay's Charm of Nature.
  feral-p5 has 83 such rows, all at about −54 to −65. Druids can wear all of
  them, and they rank far below the cutoff, which is correct for a cat. They
  are noise, not an error.
- **Thunderheart Waistguard −24.7, Wristguards +11.1, Treads +3.3
  (feral-p5).** This is right for the game.
  - The start gear already has Thunderheart 4pc (shoulders, chest, hands,
    legs). The set has bonuses only at 2 and 4 pieces
    (`vendor/tbc-new-fork/sim/druid/item_sets.go:224-250`), so a fifth piece
    adds no bonus.
  - Against Belt of One-Hundred Deaths (Agi 29, AP 74, expertise 25, two
    sockets), the Waistguard (Str 38, Agi 40, hit 23, Int 20, one socket)
    loses about 50 AP and 25 expertise once the lost gem is counted. A loss
    of this size is expected.
  - wowsims' P5 set does wear the Waistguard, Wristguards and Treads
    (`p5.gear.json`). It uses them as the four set pieces so that chest,
    hands and legs can take non-set Sunwell items (Bladed Chaos Tunic,
    Gloves of Immortal Dusk, Leggings of the Immortal Night). A swap of one
    item at a time cannot show that trade (finding F5).
- **Battlemaster's Determination and Bloodthirster's Wargreaves in the ret-p4
  golden.**
  - Battlemaster's Determination is a PvP honor trinket (80 AP, use +1750
    health; db.json). It is at −30.4.
  - Bloodthirster's Wargreaves are plate legs (Str 46, hit 38, three sockets;
    db.json) from the Badge of Justice vendor (**recalled, unverified**).
    They are at −38.3.
  - Both are real and ret can wear them. They sit low in a list cut by EP,
    so they do no harm.
  - The golden's other new rows (Nyn'jah's Tabi Boots, Shallow-grave
    Trousers, Pauldrons of Gruesome Fate, Swiftsteel Shoulders, Boots of
    Utter/Natural Grace, Amulet of Bitter Hatred) are real items that ret
    can wear, all below the cutoff.

## Game problems (findings)

| # | Finding | Severity | Evidence |
|---|---|---|---|
| F1 | Empty Mug of Direbrew is a holiday-boss drop (Brewfest, Coren Direbrew, about two weeks a year). It is rank 1–5 in five fixtures and rank 1 in the ret-p4 golden, but the row shows no source ("unknown" / "Source not recorded"). A player reading the top row cannot tell that it is a once-a-year event drop. The same applies to the other holiday rows: The Frost Lord's War Cloak and Amulet of Bitter Hatred (Midsummer, Ahune), and Ring of Ghoulish Delight, Witches Band and The Horseman's Signet Ring (Hallow's End, Headless Horseman — **recalled, unverified**). Unverified: the ilvl-141 numbers of id 281739 come from upstream's db; the wiki lists only the original ilvl-110 version. | medium | Fixture rows `source: {kind: "unknown"}`; golden row 1 `"source": "Source not recorded"`; db.json 281739 and 29383 stat lines; [warcraft.wiki.gg Empty Mug of Direbrew](https://warcraft.wiki.gg/wiki/Empty_Mug_of_Direbrew); ticket 108 owner context |
| F2 | The 2 Ring (34837) is offered in the phase-2 and phase-3 lists. The game added it in patch 2.4.0, as a very rare reward from Old Man Barlo's fishing-daily bag. db.json says phase 1. It is above the cutoff (+4.7) in feral-p3-th-hands-legs. | medium-low | db.json 34837 `phase: 1`; [warcraft.wiki.gg The 2 Ring](https://warcraft.wiki.gg/wiki/The_2_Ring) ("Patch 2.4.0 … Added"); feral-p3-th-hands-legs row 21 |
| F3 | `contested:` decision log row N6 says the arena exclusion rests on "rating-gated currency". In TBC Classic, only the current season's **shoulders (2000) and weapons (1850)** needed a personal rating. All other arena gear needed only arena points, and "the previous season's Arena gear can be purchased without the requirement of a specific rating" ([warcrafttavern, TBC Classic Arena Season 1](https://www.warcrafttavern.com/tbc/news/tbc-classic-arena-season-1-starts-today/)). That article is about TBC Classic 2021; that the same rules apply on Anniversary realms is **unverified**. So the Vengeful weapons at phase 3 are rating-gated. Merciless Gladiator's Maul at phase 3+ and Vengeful Gladiator's Dragonhide Tunic were not. The exclusion is still a fair product choice (arena points come only from rated arena games). It does not make any fixture misleading (Q3). The recorded reason, however, is wrong for most of the excluded items, including the code comment "the rating-gated ones" (`scripts/assemble_universe.py:325`). | low (on the output); the premise is contested | decision-log.md row N6; `assemble_universe.py:320-351`; source above |
| F4 | Several real vendor and honor items show no source while similar items do. Everbloom Idol shows "badge", but Idol of Terror, Staff of the Forest Lord, Angelista's Revenge, Bloodthirster's Wargreaves and Nyn'jah's Tabi Boots show "unknown" (**recalled, unverified**: all Badge of Justice vendor items). The Vindicator's Dragonhide Bracers show "pvp", but Vindicator's Band of Triumph and Guardian's Dragonhide Bracers show "unknown". Three of these are above the cutoff in feral-p5. | low | feral-p5-th4pc rows 3, 7, 10, 11; golden rows 20, 23, 34, 35 |
| F5 | The Sunwell Thunderheart pieces (Waistguard, Wristguards, Treads) count toward the Thunderheart Harness set. A swap of one item at a time cannot show their real value: letting a player take set pieces out of chest, hands and legs and still keep 4pc. This is why the Waistguard is −24.7 while wowsims' P5 set wears it. The row is right for the gear worn; it is not a full answer. | low (known limit, not a wrong number) | `p5.gear.json`; db.json `setName` on 34556/34444/34573; `item_sets.go:224-250` |
| F6 | feral-p5-th4pc `ranking.setBonuses` lists Thunderheart Harness with `"threshold": 5`. The set has no 5-piece bonus. If any screen shows that entry, it names a bonus that does not exist. | low | fixture `ranking.setBonuses[0]`; `item_sets.go:224-250` (bonuses keyed 2 and 4 only) |

## Rows that look fine

- ret-p3-p2: Torch of the Damned, Cataclysm's Edge, Cursed Vision of
  Sargeras, Shadowmaster's Boots, the BT rings and legs. All unchanged from the
  previous record.
- feral-p3 (three fixtures): Everbloom Idol over the worn Idol of the Raven
  Goddess. This is unchanged, and it is right for personal DPS: most of the
  Raven Goddess's value goes to the party (**recalled, unverified**). Idol of
  the White Stag, Shadowmaster's Boots, Vindicator's Dragonhide Bracers and
  the Hyjal reputation rings also look fine.
- feral-p2-malorne4: Belt of One-Hundred Deaths +37.4 at the top, plus Kael'thas
  legs and the SSC/TK rings and trinkets. Unchanged.
- feral-p5-th4pc: the Sunwell weapon, cloak, rings and trinkets, which match
  wowsims' P5 set. Shard of Contempt is from heroic Magisters' Terrace, which
  is in phase at 5.
- Every list: no class or armor-type violation, no item from a later phase
  than its list (by db phase), and no Gladiator-line item.

## Gate

As a player who knows the game, I would trust these top rows. Each row is
real, the class can wear it, and its number agrees with its stat line. Before
I would say a plain "trust", two things must be true:

1. Holiday-event items say that they are holiday drops (F1). Today the most
   common new top trinket has no source.
2. Items the game added in patch 2.4 do not appear in earlier phases (F2).

## Notes for engineering

Each line below is a proposed ticket.

- **F1.** Give holiday-boss items a source the player can read, for example
  "World event: Brewfest — Coren Direbrew" or "World event: Midsummer —
  Ahune". Separately, confirm the live stats of 281739 (ilvl 141, 98/376 AP)
  against the game. A Wowhead tooltip or an in-game check would do.
- **F2.** Correct the phase of 34837 The 2 Ring to the 2.4 content phase.
  Check whether other sourceless items flagged phase 1 were added later. In
  the feral-p3-p2bis list, the 34xxx ids with db phase 1 are 34837, 34073,
  34074 and 34075.
- **F3.** Correct the N6 reason and the `assemble_universe.py:325` comment, so
  that the next reader does not build on "all Gladiator gear is
  rating-gated". Whether to keep excluding previous-season arena gear is the
  owner's call.
- **F4.** Give Badge of Justice vendor and honor items a source label
  consistently.
- **F6.** Do not show a set threshold that the set does not have.

## Confidence caveats

- I ran no sims. "Plausible" means that the delta agrees with a stat-line
  estimate (AP and agility worth, hit/expertise, armor ignored), not that I
  re-measured it.
- I assume both start gears are near the melee hit cap, because rings with hit
  rank no better than rings without it. I did not verify that.
- Recalled facts are marked **recalled, unverified**. Web facts are linked
  above. The arena-rule source describes TBC Classic 2021; that Anniversary
  uses the same rules is unverified.
- The holiday availability window comes from the game's calendar, not from the
  content phase. I did not judge whether db phases 2 (Ahune) and 3 (Direbrew)
  match when the Anniversary realms first offered these items.
