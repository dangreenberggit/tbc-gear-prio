# SME judgment — ticket 467, live feral sweep at worn Thunderheart 0–4

Seat: gate-sme (Opus 5.5), stage `tab-set-bonus`, plan Step 7. Date 2026-10-15.
Audience: engineering team. Scope: the PRINTED lines only — the OFF figure and
the ON popover lines of the Thunderheart (676), Malorne (640) and Nordrassil
(641) rows. The set-screen rule verdict is handled elsewhere.

## Verdict

| k (worn Thunderheart) | Verdict | Main caveat |
|---|---|---|
| 0 | **trust-with-caveats** | Rows whose only set content is a future have no OFF popover (336, pending). Thunderheart 2pc step sizes include a large Wolfshead interaction (F2). Nordrassil rows show no Set potential (screen). |
| 1 | **trust-with-caveats** | Same as k=0. |
| 2 | **trust-with-caveats** | Breaks lines are right; 2pc/4pc split across rows moves with a hit-rating interaction (F3). |
| 3 | **trust-with-caveats** | No Breaks lines, correctly; Cover's +4pc line is a near-tie with Wolfshead (F2). |
| 4 | **trust-with-caveats** | The constructed gear has an empty socket on the worn Thunderheart Pauldrons, so the two shoulder rows' "Item stats" lines read about 10 DPS better than a fully gemmed wearer would see (F1). |

No printed line at any k gives a figure a feral player would be misled by on
the gear that k describes. Every Breaks line is on the right rows, breaks the
right bonus, and has a size that matches the bonus measured independently on
the add side. Every ON total agrees with the other rows that reach the same
final gear, and the k=0..3 ON totals predict the measured k=4 gear within
about 6 DPS once F1 is allowed for.

## What was reviewed

- Character: feral cat, page phase 3, 3000 iterations, Go backend, fork
  `176268e7c1acb552c3c9cba9337eb29b181f080e`, `forkDirty false`, recorded
  2026-10-15 with `pnpm tab-fixtures:record`.
- Gear: one constructed base (Wolfshead Helm, Choker of Endless Nightmares,
  Shoulderpads of the Stranger, Thalassian Wildercloak, Bloodsea Brigand's
  Vest, Vindicator's Dragonhide Bracers, Gloves of the Searing Grip, Belt of
  One-Hundred Deaths, Leggings of Murderous Intent, Shadowmaster's Boots, two
  rings, Tsunami Talisman, Bloodlust Brooch, Vengeful Gladiator's Staff, Idol
  of the Raven Goddess); worn Malorne 0; worn Thunderheart k = 0..4 added in
  the order hands, legs, chest, shoulders. This is a constructed state, not
  the previous-phase preset.
- Inputs judged:
  - `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\tab-set-bonus\runs\feral-p3-worn{0..4}.json`
    (full recorded `Ranking` objects).
  - `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\tab-set-bonus\497-read.txt`,
    produced by `python -I .scratch/stage-gate/tab-set-bonus/497-read.py`
    run from `C:\Users\dgree\Code\lulz\tbc-gear-prio`. It prints the OFF
    figure and the exact OFF/ON popover text from the fork's own
    `setBonusTipLines` + `setBonusTipText`, and a C5 re-computation of the ON
    step lines (0 mismatches over all five runs).
  - `runs\took.json`: Took 190.6, 200.6, 222.3, 224.4, 200.4 s for k=0..4.
  - Step 3 result as reported by the executor (not re-run by me):
    `corepack pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t 497`
    passes (commit 60cf6f4c, comment 2449eaf1).
- Set bonus definitions read from the fork,
  `vendor/tbc-new-fork/sim/druid/item_sets.go`: Malorne Harness 2pc = 4%
  chance on landed melee hit for +20 energy in Cat Form; 4pc = +30 Strength in
  Cat Form. Nordrassil Harness: only a 4pc is implemented (Shred +75 damage).
  Thunderheart Harness 2pc = Mangle (Cat) costs 5 less energy; 4pc = Rip,
  Swipe and Ferocious Bite deal 15% more damage.

## Findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| F1 | At k=4 the worn Thunderheart Pauldrons have an empty second socket (`gems [32194, 0]`; 32194 = Delicate Crimson Spinel, +10 Agility; the Pauldrons' socket bonus +3 Strength is then also off). The k=4 baseline is 9.8 DPS below "k=3 baseline + Pauldrons row" (2687.0 vs 2619.4 + 77.4 = 2696.8), while the other three steps of the chain agree within 2.6 DPS. Effect on printed lines: the two shoulder rows' "Item stats" at k=4 read about 10 DPS better than their k=3 values imply (Nordrassil Feral-Mantle +4.1 vs about −6.3; Mantle of Malorne −6.3 vs about −16.7). The lines are honest for this exact gear (an ungemmed socket is a real loss); they are not what a fully gemmed wearer would see. Input caveat, not a code fault. | minor | gear print: `python -I -c "import json;[print(k,[(i.get('id'),i.get('gems')) for i in json.load(open(f'runs/feral-p3-worn{k}.json'))['gear']['items'] if i]) for k in range(5)]"` run in the `tab-set-bonus` stage folder; baselines and rows in `497-read.txt` lines 2/80/158/237/317 and 239–241; sockets `[4, 3]` and socket bonus +3 Str for 31048 in both `data/items/index.json` and `vendor/tbc-new-fork/assets/database/db.json` |
| F2 | Large Wolfshead × Thunderheart interaction. Thunderheart Cover alone (it replaces Wolfshead) is −198.3 at k=0, −88.5 at k=2, −68.0 at k=4. The Thunderheart 2pc implied by the add steps is about 95–120 DPS with Wolfshead worn (k=0 rows: Pauldrons + Gauntlets 2pc steps; k=1 OFF lines +97.9/+95.2/+85.0 minus each piece's own stats) and about 204 DPS on the Cover row, where Wolfshead is gone (k=0 Cover row "Thunderheart Gauntlets (2pc): +211.6"; k=1 Cover OFF +4.8). The same shape shows for Malorne 2pc on Stag-Helm (about 106 vs about 80). The figure is consistent across four independent measurements, so the printed lines report the sim faithfully. Whether a Mangle cost cut is worth 4–8% DPS in game I cannot confirm: **recalled, unverified**. Combat modelling is upstream's, so this is a caveat, not a tab defect. | caveat | `497-read.txt` lines 5–16, 53–56, 83–97, 192–195, 255–257, 335 |
| F3 | The split between the 2pc line and the 4pc line depends on which pieces each step adds. At k=0 the Chestguard and Leggings rows print "…(4pc): +75.6" while the Gauntlets and Pauldrons rows print "+89.0 / +89.1", although all four rows reach the same four pieces and their Totals agree (+195.0 to +196.2). The cause visible in the item rows is melee hit rating: Thunderheart Leggings and Bloodsea Brigand's Vest each carry 27 hit, Leggings of Murderous Intent none, so with Thunderheart Leggings worn a chest swap away from the Vest is worth about 16–18 DPS more (Chestguard +10.4 at k=0 vs +26.4 at k=2; Breastplate of Malorne −11.1 at k=1 vs +6.8 at k=2; Nordrassil Chestplate −5.0 vs +13.3). Each line names the pieces it adds, so it is honest; a reader comparing "the 4pc" across rows sees different numbers for one bonus. | info | `497-read.txt` lines 7, 11, 15, 27, 106, 110, 160–170; stats `data/items/index.json` keys 31044/30101/29995 (index 20 = 27 / 27 / 0) and the same in `db.json` `scalingOptions` |
| F4 | Worn pieces' own rows (k=1 Gauntlets; k=2 Gauntlets, Leggings; k=3 Gauntlets, Chestguard, Leggings; k=4 all four) print +0.0 and no popover. That is correct in game: the item is already on, it adds no piece and crosses no threshold. `497-read.txt` marks these rows `FAIL` and the k=1..3 screen verdict `TICKET` because Step 4's rule wants every row of a kept set to carry future bonuses. See **Contested**. | info | `497-read.txt` lines 98–101, 152–153, 172–179, 230–232, 243–254, 309–312 |
| F5 | Rows of a dropped set show no Set potential: Nordrassil at k=0..3 (outside-band), Malorne and Nordrassil at k=4 (below-zero). Game check that hiding misleads nobody at these states: the Nordrassil 4pc pair is worth 36.9 DPS (`pair.dps`), and the four non-head Nordrassil pieces at k=0 sum to −33.9 DPS of own value, so that path is about break-even (rough, singles do not add exactly); from k=2 any four-piece Nordrassil path also breaks the Thunderheart 2pc. At k=4 every Malorne 2pc path replaces at least one Thunderheart piece and breaks the 4pc (−78.8) for a bonus worth about 62. The rows still print honest single-swap figures (item stats, plus Breaks where a worn bonus is lost). | info | `497-read.txt` lines 17–24, 41–44, 61–68, 339–388 |
| F6 | Pending display gap, not a figure error: at k=0, 2 and 3 a row whose only set content is a future bonus has no popover in the OFF state (for example all k=0 Thunderheart and Malorne rows). This is ticket 336, fixed later in this plan (Steps 8–13). | info | `497-read.txt` lines 6, 10, 30, 162, 269; plan C1 |

## Rows that look fine

- **Breaks lines, k=2.** "Breaks Thunderheart Harness 2pc: −96.6" appears on
  exactly the four rows that replace worn Thunderheart hands or legs
  (Nordrassil Feral-Kilt and Handgrips, Greaves and Gauntlets of Malorne), and
  on no head, shoulder or chest row. The round-2 do-not-trust fault (Malorne
  and Nordrassil head/shoulder/chest charged the 2pc) is gone. Size 96.6 sits
  inside the 95–120 range the add side measures for the same bonus with
  Wolfshead worn.
- **Breaks lines, k=4.** "Breaks Thunderheart Harness 4pc: −78.8" on every row
  that replaces a worn Thunderheart shoulder, chest, hands or legs; only the
  4pc is broken (4→3 keeps the 2pc), which is the game rule. No Breaks on
  Stag-Helm of Malorne or Nordrassil Headdress, which replace Wolfshead.
  78.8 matches the 4pc measured on the add side at k=2 and k=3 (about 78: k=2
  Chestguard row "Thunderheart Pauldrons (4pc): +77.0" with Pauldrons own
  −0.8; k=2 Pauldrons row +104.2 minus Chestguard own +26.4; k=3 Pauldrons OFF
  +77.4 with own about −0.8).
- **No Breaks at k=1 and k=3.** At k=1 replacing the one worn piece loses no
  active bonus; at k=3 replacing one of three keeps the 2pc. Both runs print
  no Breaks line. Correct.
- **Item stats next to Breaks.** Owner rule: the Breaks price is the bonus's
  value on the gear worn when it is lost. The Item stats lines beside the
  Breaks lines match each piece's own value from the neighbouring k: at k=2
  within 1.6–2.7 DPS (Kilt −9.5 vs −7.3; Handgrips −21.7 vs −19.4; Greaves
  −27.3 vs −24.6; Gauntlets of Malorne −28.5 vs −26.9, from the k=0 rows); at
  k=4 within 0.4–2.5 DPS of the k=3 rows (Breastplate −20.0 vs −19.6, Kilt
  −21.0 vs −20.0, Handgrips −22.9 vs −22.1, Gauntlets −30.6 vs −29.8, Greaves
  −61.1 vs −63.6, Nordrassil Chestplate −13.8 vs −13.2), shoulders aside (F1).
  So no part of a bonus loss is moved into the item line or vice versa beyond
  sim noise (noise floor 4.243).
- **Malorne 2pc sizes.** About 80 DPS when the Thunderheart 2pc is off (k=0,
  k=1, and the k=2 Gauntlets of Malorne row, which breaks it) and about 62
  when it is on (k=2 and k=3 rows that keep it). `sameGearDps` agrees: 80.1 at
  k=0, 62.4 at k=2 and k=3. Two energy bonuses worth less together than apart
  is the expected direction (**recalled, unverified** as to size).
- **Malorne 4pc (ticket 497's concern).** Never printed, correctly: on every
  Malorne row the 4pc step totals less than the 2pc stop (k=0 Breastplate row:
  4pc step gear +14.8 vs 2pc +57.7). The recorded same-gear value is 23.3 /
  23.3 / 21.7 / 23.3 DPS at k=0..3; it does not move with worn Thunderheart.
  +30 Strength in Cat Form at about 23 DPS is a plausible size (**recalled,
  unverified**: 30 Str → about 60–75 AP after multipliers). Ticket 497's
  earlier +69.5 is not reproduced.
- **Nordrassil 4pc.** Not printed (screen), but its `pair.dps` is 36.86 at
  k=0..1 and 36.92 at k=2..4 — flat across worn Thunderheart. Shred +75 at
  that size is plausible (**recalled, unverified**).
- **Thunderheart 4pc sizes.** About 78 DPS with Wolfshead and the 2pc on
  (k=2, k=3, k=4 Breaks), about 85–100 on Cover paths. Rip, Swipe and
  Ferocious Bite +15% at 3–4% of total DPS is plausible (**recalled,
  unverified**).
- **ON totals agree and predict the real gear.** Rows reaching the same final
  gear print the same Total: k=0 Thunderheart rows +195.0 / +195.8 / +196.2 /
  +196.2; k=0 and k=1 Breastplate/Mantle +57.7 and +52.7 on both rows; k=2
  Chestguard/Pauldrons +103.4 both; k=2 and k=3 Breastplate/Mantle +51.6 and
  +25.2 both. Measured against the next run's baseline: k=0 predicts +195–196
  for four Thunderheart pieces, the k=4 run measures +191.9 (+9.8 for F1 =
  +201.7); k=1 +187.9–189.4 vs 181.5 (+9.8 = 191.3); k=2 +103.4 vs 94.0 (+9.8 =
  103.8); k=3 +77.4 vs 67.6 (+9.8 = 77.4).
- **Choice of completing piece.** Gauntlets of Malorne at k=2 completes the
  2pc with Breastplate (+90.9) while Greaves at k=2 uses Mantle (+66.4). That
  matches the hit-rating effect in F3: with Thunderheart Leggings still worn
  the Breastplate swap is worth more; once Greaves replace them it is not
  (k=1, no Thunderheart legs: Breastplate −11.1, Mantle −11.9).
- **Rows with no popover that should have none.** Thunderheart Cover at k=4
  (fifth piece, no 5pc bonus exists); worn pieces' own rows (F4); head rows at
  k=4 that touch no worn set.

## Gate

Would a feral who knows the game trust these printed lines? Yes, with the
caveats above, at every k from 0 to 4. What must be true before a plain
"trust": the OFF state discloses future-only set content (336), and someone
with a primary source confirms the size of the Thunderheart 2pc and its
interaction with Wolfshead (F2), which is an upstream combat-model question.

## Contested

- **contested:** plan Step 4's "not as designed" condition "a kept set whose
  rows have no `futureBonuses`", as `497-read.py` applies it. The only rows it
  fires on at k=1..3 are worn Thunderheart pieces' own rows (+0.0, count
  unchanged), which in game have nothing to add. The resulting `screen
  verdict: TICKET` for k=1, 2 and 3 (`497-read.txt` lines 152–153, 230–232,
  309–312, 392) does not show a screen fault in the game sense. The screen
  verdict itself is handled elsewhere; this is the game reading of those rows.
- Not contested: plan C5 ("at worn 1 no Thunderheart row has a 2pc step and at
  worn 3 none has a 4pc step") matches the k=1 and k=3 lines, where the
  crossed bonus is folded into "Item stats + Thunderheart Harness Npc". Plan C8
  and C9 match the live screen values (k=2 Nordrassil 43.54 under floor
  95.54).

## Notes for engineering

- The k=4 constructed gear has an empty socket on the worn Thunderheart
  Pauldrons; re-record with it filled if the k=4 shoulder rows are ever used
  as a reference.
- Worn pieces' own rows should not count as "kept set rows without futures"
  in the screen check.

## Confidence caveats

- Game sizes (2pc/4pc DPS values, gem worth, hit-rating effect) are judged
  from this repo's data plus **recalled, unverified** game knowledge; no
  external guide was read.
- The Step 3 test result is taken from the executor's report; I did not run
  it.
- Cross-run comparisons use each run's own baseline; differences of up to
  about 4 DPS (the noise floor 4.243) are treated as noise.
- Rows' own values used as references come from neighbouring runs (different
  sims), so "matches within 0.4–2.7 DPS" carries that noise.
