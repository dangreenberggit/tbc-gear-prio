# SME rank judgment: 511 set credit, K7 (plan step 38)

Seat: gate-sme (Opus 5.5). Audience: the engineering team. Recorded runs only; no sim was run for this review.

## Verdict

**trust-with-caveats.**

The two re-recorded rankings look right for the game where the set credit is concerned:

- Ret gets no set credit at all, which is right for this gear.
- The feral Thunderheart rows are valued by the sim of the four pieces worn together, with the worn Malorne 2pc break inside that sim.
- Every screened-out set is one that a player of the spec would not collect on this gear.

The caveats do not change any row on these two gears:

- **F1, contested.** The screen labels Burning Rage "exact-zero", but its 2pc is a real DPS bonus for this character.
- **F2.** Some displayed credits are within noise (Greaves of Malorne +0.06).
- **F3.** The Thunderheart Cover row's first step is large. A game reason is available, but it is untested.

## What was reviewed

| Fixture | Character | Gear | Baseline | Iterations |
| --- | --- | --- | --- | --- |
| `data/tab-fixtures/ret-p3-p2.json` | Ret paladin, Blood Elf, Engineering + Blacksmithing | "Phase 2 / P2" preset at page phase 3 | 2084.16 | 3000 |
| `data/tab-fixtures/feral-p3-p2bis.json` | Feral cat, Night Elf, Engineering + Enchanting | "Phase 2 / BiS 6%" preset at page phase 3 | 2451.06 | 3000 |

Both were recorded at fork `04de6a46ba84dee680e2aca87b251f94058ba403` (`forkDirty: false`), main commit 4f19a468. The tab defaults were: set screen "on", partner rule "close-calls", popover "steps that add up".

How they were produced (from the task prompt and `data/tab-fixtures/README.md`):

- `pnpm tab-fixtures:record --spec ret --phase 3 --name p2 --preset-tab "Phase 2" --preset "P2" --expect-gear-file ui/paladin/retribution/gear_sets/p2.gear.json`
- `pnpm tab-fixtures:record --spec feral --phase 3 --name p2bis --preset-tab "Phase 2" --preset "BiS 6%" --expect-gear-file ui/druid/feralcat/gear_sets/p2_6p.gear.json`

What I read:

- The executor's summaries: `.scratch/stage-gate/511-512-set-credit/k7/ana-ret.out`, `ana-feral.out`, and `cw-old-*.out` / `cw-new-*.out`.
- Every figure I rely on, re-derived from the JSON with Python: `ranking.setScreen.sets`, `ranking.setBonuses`, `ranking.wornSetLadder`, `ranking.crossingGates`, `ranking.caps`, `ranking.contentHash` (professions), and `ranking.items[*].setContext` (`futureBonuses[*].pieces / breaks / stepGearDps / sameGearDps / sameGearSe`, `singleBreaks`, `singleDeltaDps`).
- I rebuilt each row's popover steps from `futureBonuses`, using the walk in `vendor/tbc-new-fork/.../upgrades/engine/view.ts:430-460` (credit) and `:555-590` (steps; the step break list starts from `singleBreaks`).

Baseline gear, from `gear.items`:

- **Ret.** Crystalforge Breastplate 30129 is worn (1 Crystalforge piece). No Justicar or Lightbringer pieces are worn. Hit is 58.6 rating below the cap (`ranking.caps.hit.gap`).
- **Feral.** Wolfshead Helm 8345 is on the head. Breastplate of Malorne 29096 and Mantle of Malorne 29100 are worn, so the Malorne 2pc is active.

Set bonus effects, read from fork code:

- `vendor/tbc-new-fork/sim/paladin/item_sets.go:10-107`: Justicar 2pc is `ExposeToAPL` only, with no effect. Justicar 4pc is Judgement of Command +10%. Crystalforge 2pc is −35 mana on Judgements. Crystalforge 4pc is a 6% chance party heal. Lightbringer 2pc is a 50-mana proc. Lightbringer 4pc is Hammer of Wrath +10%.
- `sim/druid/item_sets.go`:
  - Malorne 2pc: 4% chance per landed melee hit to gain 20 energy. Malorne 4pc: +30 Strength in cat form.
  - Nordrassil: only a 4pc is defined, Shred +75.
  - Thunderheart 2pc: Mangle (Cat) costs 5 less energy. Thunderheart 4pc: Rip, Swipe and Ferocious Bite +15%.
  - Gladiator's Sanctuary: a 2pc of +35 resilience only (`:11-15`, `:48-54`).
- `sim/common/tbc/items_sets.go`:
  - Burning Rage: 2pc +20 melee hit rating, `RequiredProfession: Blacksmithing` (`:116-125`).
  - Fel Skin: 3pc +20 dodge rating, `RequiredProfession: Leatherworking` (`:230-242`).
- Gladiator's Vindication 583 has no definition in the fork sim: `grep -rn "Gladiator's Vindication\|ID: *583" vendor/tbc-new-fork/sim --include=*.go` returns nothing.

## Answers

### Q1. Do the ret credits include only bonuses that can raise ret DPS (C1, C47)?

**Yes. No ret row gets any credit.**

- `cw-new-ret-p3-p2.out` line 5 reads "rows with credit != 0: 0". `ana-ret.out` lines 48-50 show no credited rows for sets 626, 629 or 680.
- The ON top 16 equals the OFF top 16, figure for figure.
- C1 and C47 hold on the new fixture.

**Justicar 4pc: no credit. The screen dropped the whole set.**

- `setScreen.sets` entry 626: reason `below-zero`, measure M2 −56.92, pair −0.494 (paired se 0.309), best stats −56.42.
- `setBonuses` has only the entry `626 threshold 2: unmeasured "screened-out"`.
- Game check: the 4pc changes only Judgement of Command. Ticket 511 records that the default ret rotation never casts it (it judges only under Seal of Blood). The 2pc does nothing in this sim.
- On P2 gear the four Justicar singles are −25.8 to −46.7. Nothing about this set could make it a gain.
- K1's same-gear figure (+0.0000, M1.1/M3.1) agrees.

**Crystalforge 4pc: no credit. Its gate failed.**

- `setBonuses` 629 threshold 4: `sameGearDps 0.2038, sameGearSe 3.164, belowGate true`. The gate is max(4.81, 2 × se) = 6.33.
- This is the same value as K1 M3.2 (+0.2038, se 3.164 at 3000 iterations).
- Game check: the 4pc is a party heal (fork `paladin/item_sets.go:44-73`) and cannot add DPS.
- The screen kept the set (`top-k`, measure −19.53), but that costs only sims and moves no row.

Other ret bonuses:

- **Crystalforge 2pc.** Measured by the crossing gate at 2.60 (se 3.16), not cleared. It saves mana and is not expected to matter.
- **Lightbringer 2pc.** −2.63 (se 3.18), below the gate.
- **Lightbringer 4pc.** Exactly 0, because the sim's rotation never casts Hammer of Wrath. See finding F5.
- **Crystalforge 3pc and 5pc, Lightbringer 3pc and 5pc.** Exactly 0, because those counts have no bonus.

### Q2. Do the break charges look right?

**Yes.**

**The worn Malorne 2pc.**

- `wornSetLadder` 640 count 2 reads 96.26 (se 2.06, 3000 iterations), against K1 M5.5's 93.16 (se 1.12, 10000 iterations).
- The difference is 3.1 against a combined se of about 2.3, which is within noise.
- Game check: in this fork the bonus is a 4% chance per landed hit to gain 20 energy (`druid/item_sets.go`, Malorne 2pc). Energy is the cat's limiting resource, so about 4% of DPS is a believable size for it. This size is recalled, unverified.

**Each row's own break lines**, from `setContext.singleBreaks` and `futureBonuses[*].breaks`, with the step filtering from `view.ts:569-590`:

- **Thunderheart Chestguard, Thunderheart Pauldrons, Nordrassil Chestplate, Nordrassil Feral-Mantle.** `singleBreaks` lists the Malorne 2pc. These pieces replace the worn Malorne chest or shoulder, so the row's own swap breaks the bonus. The popover lists that break above the steps, and no step names it again.
  - For example, the Chestguard row reads: item −78.10, then "Thunderheart Pauldrons (2pc)" +125.84, then "Thunderheart Gauntlets, Thunderheart Leggings (4pc)" +69.21. The total is +116.96.
  - That is right in game terms: once the chest is off, adding the Pauldrons breaks nothing more.
- **Thunderheart Gauntlets, Thunderheart Leggings, Thunderheart Cover.** The break appears only on the 4pc step, "Thunderheart Pauldrons, Thunderheart Chestguard (4pc, breaks Malorne Harness 2pc)". That is the step where the Malorne chest and shoulder come off, so this is right.
- **Nordrassil Handgrips and Nordrassil Feral-Kilt.** The break is on the 4pc step, which is right. These rows have no credit (c = −40.45 and −35.51).
- **Greaves, Gauntlets and Stag-Helm of Malorne.** No break, which is right: they add Malorne pieces in slots that hold no set piece.
- **Vengeful Gladiator's Dragonhide Tunic and Spaulders, Primalstrike Vest.** `singleBreaks` lists the Malorne 2pc. That is right: these pieces take the chest or shoulder slot.

**The break is not charged twice.**

- Each step figure is one sim with all pieces worn, so the break's 96.26 never enters a row's number. It is used only for the label and the partner choice.
- Example: the Pauldrons row's credit is 116.96 − (−81.57) = 198.53. That is the sim total minus the single swap, with no separate break term.

**Crossing gates are right.**

- Feral Malorne count 3 reads 0, and Malorne has no 3pc.
- Ret Crystalforge count 2 is not cleared (Q1).

### Q3. Is each named partner set realistic, and does each total read right for a buyer?

**Yes for every credited row. The Cover row's split between steps needs a check (F3).**

| Row (single) | Popover, rebuilt from `futureBonuses` | Total (ON) | Game read |
| --- | --- | --- | --- |
| Thunderheart Gauntlets (+3.73) | Leggings (2pc) +62.53; Pauldrons, Chestguard (4pc, breaks Malorne 2pc) +50.70 | +116.96 | This is the common feral pattern: keep Wolfshead and wear Thunderheart shoulders, chest, hands and legs (recalled, unverified). K1's sims at 10000 iterations give +6.4 / +63.6 / +49.3 = +119.3, so this row agrees. |
| Thunderheart Leggings (−11.61) | Gauntlets (2pc) +77.87; Pauldrons, Chestguard (4pc, breaks) +50.70 | +116.96 | Same four-piece gear, so the same total. Right. |
| Thunderheart Chestguard (−78.10, breaks Malorne 2pc) | Pauldrons (2pc) +125.84; Gauntlets, Leggings (4pc) +69.21 | +116.96 | The Chestguard's 2pc partner is the Pauldrons: once the Malorne bonus is gone, replace both Malorne slots. That is how a player would buy. Right. |
| Thunderheart Pauldrons (−81.57, breaks Malorne 2pc) | Chestguard (2pc) +129.32; Gauntlets, Leggings (4pc) +69.21 | +116.96 | Mirror of the Chestguard row. Right. |
| Thunderheart Cover (−194.56) | Gauntlets (2pc) +174.20; Pauldrons, Chestguard (4pc, breaks) +55.77 | +35.41 | The partners are realistic. The Cover takes the head slot from Wolfshead, so Leggings are the piece left out. The row ranks well below the other four Thunderheart rows, which matches the known preference for Wolfshead over the Thunderheart helm (recalled, unverified). Step 1's +174 is large; see F3. |
| Nordrassil Feral-Mantle (−86.74) | Chestplate, Handgrips, Feral-Kilt (4pc) +31.45 | −55.29 | A P2 BiS cat does not move to T5 over Malorne 2pc and its other P2 pieces. The total stays negative, so the row stays low (around rank 184). Right. |
| Nordrassil Chestplate (−90.60) | Mantle, Handgrips, Feral-Kilt (4pc) +35.31 | −55.29 | As above. |
| Greaves of Malorne (−36.49) | Gauntlets of Malorne (4pc) +0.06 | −36.43 | The partner is right: Gauntlets of Malorne are the best remaining Malorne single (−21.26, against −36.49 for the legs and −202.13 for the head). The credit is noise; see F2. |
| Stag-Helm of Malorne (−202.13) | Gauntlets of Malorne (4pc) +8.48 | −193.65 | Same partner, which is right. The loss is Wolfshead's effect. Wolfshead's stat line is only +10 Spirit and 109 armor (`data/items/index.json` 8345); its value is the energy on shifting. The row stays near the bottom. Right. |

**Rows with no credit are also right.**

- Gauntlets of Malorne: c = −15.17.
- Nordrassil Handgrips, Feral-Kilt and Headdress: c = −40.45, −35.51 and −48.03.
- In each case the best four-piece total is worse than the single swap, so no step beats 0.

**Old and new walks.** The only rows whose figure changed are the two that were outside the tab's groups:

| Row | Old (sum-of-singles estimate) | New (measured step gear) |
| --- | --- | --- |
| Thunderheart Cover | ON −92.21 (credit 102.35) | ON +35.41 (credit 229.97) |
| Stag-Helm of Malorne | credit 0.06, reusing the Greaves' package | credit 8.48 |

Sources: `cw-old-feral-p3-p2bis.out:13-14`, `cw-new-feral-p3-p2bis.out:10,14`. This is the change `display-options.md` §5 predicts for the Cover.

### Q4. Would a player of this spec collect any screened-out set on this gear?

**No.**

| Set | Spec | Pieces in reach (singles) | Bonus in this sim | Screen reading | Collected on this gear? |
| --- | --- | --- | --- | --- | --- |
| 566 Burning Rage | ret | Ragesteel Breastplate −42.94, Ragesteel Shoulders −31.09 | 2pc +20 melee hit, needs Blacksmithing | exact-zero, M2 −74.04 | No. These are pre-raid crafted pieces, two tiers below P2. The best case is −74.04 plus the 2pc, and the 2pc is worth about 6.6 to 7.9 by the repo's own figures (K1 M7.1; ticket 516 for this gear), far short of 74. **But the label "exact-zero" is wrong in game terms: see F1.** |
| 583 Gladiator's Vindication | ret | Vengeful Gladiator's Scaled Chestpiece −14.62, Merciless Gladiator's Scaled Helm −27.31 | None. The set is not defined in the fork sim. In game it is +35 resilience and a Hammer of Justice cooldown (recalled, unverified). | exact-zero, M2 −41.93 | No. It is an arena set whose bonuses add no PvE DPS. Its pieces can still rank on their own stats. |
| 626 Justicar | ret | 5 pieces, −25.8 to −46.7 | 2pc no effect; 4pc Judgement of Command only | below-zero, M2 −56.92 (pair −0.494, se 0.309) | No. This is T4 on a T5-era character, and the rotation never casts Judgement of Command. |
| 573 Fel Skin | feral | Fel Leather Gloves −26.84, Fel Leather Boots −23.71 | 3pc only, +20 dodge, needs Leatherworking. Only 2 pieces are in reach, and this character is not a leatherworker. | exact-zero, M2 −50.55 | No. These are pre-raid pieces, and no 2pc exists. "Exact-zero" is correct here because no bonus is in reach. |
| 584 Gladiator's Sanctuary | feral | Legguards −10.66, Tunic −71.32, Spaulders −80.44, Helm −181.35 | 2pc +35 resilience only | exact-zero, M2 −66.17 | No. It is an arena set with no PvE DPS bonus, and the Helm also costs Wolfshead. |

## Findings

| # | Finding | Severity | Evidence |
| --- | --- | --- | --- |
| F1 | **contested:** set-screening-plan §3.3 and rule 1 treat an exact 0.0000 pair as "no bonus in reach". On ret-p3-p2, Burning Rage reads exactly 0.0000 although a real DPS bonus is in reach. Its 2pc is +20 melee hit, the player profile has Blacksmithing, the character is 58.6 hit rating below the cap, and both pieces are set 566 in `vendor/wowsims/db.json`. A hit change alters attack outcomes, so it cannot give a bit-identical result; an exact 0 suggests the bonus was not active on the "set on" side (hypothesis, untested). No row changes here, because rule 2 drops the set anyway (−74 plus a single-digit bonus is below 0). On gear where Burning Rage is close, for example a fresh 70 ret without Ragesteel, the exact-zero test could drop a set that is worth collecting. | medium (engineering), none for these two rankings | `setScreen.sets` 566: pair `{dps: 0, pairedSe: 0}`. Hit gap: `ranking.caps.hit.gap` = 58.6. Professions: `ranking.contentHash` contains `"profession1":"Engineering","profession2":"Blacksmithing"`. Bonus: fork `sim/common/tbc/items_sets.go:116-125`. Set ids: db.json items 23522 and 33173 have `setId` 566. Non-zero readings of this bonus elsewhere: K1 M7.1/M7.2 +6.60 (ret pre-raid); ticket 516, 7.87 ± 2.37 package figure on this gear (older method). |
| F2 | Greaves of Malorne shows a Set potential step of +0.06, against a step-gear se of 2.11. The rule makes a step the stop whenever c > 0, so a noise-level gain gets a popover line. It is harmless to the ranking, but it reads as a real figure to a player. Stag-Helm's +8.48 is above noise and changes nothing, since the row stays at −193.65. | low | Greaves `futureBonuses[0]`: `stepGearDps −36.4312`, `stepGearSe 2.1128`, against `singleDeltaDps −36.4909`. |
| F3 | On the Thunderheart Cover row, step 1 ("Thunderheart Gauntlets (2pc)") is +174.20. On the Leggings row the same 2pc step is +77.87. With Wolfshead worn, the Gauntlets alone are +3.73 and the 2pc is about 75. A game reason fits (hypothesis, untested): the 2pc is an energy-cost cut, so it is worth more when the cat is short of energy, and removing Wolfshead removes the largest energy source. The rows that lose the Malorne 2pc support this; their Thunderheart 2pc step is about 36 above the additive figure (+125.84 and +129.32, against about 90). The Cover's ON figure (+35.41) is one direct sim of the four pieces worn, and the row's ordering below the other Thunderheart rows is right in game terms. A re-sim of that one gear at 10000 iterations would settle the size. | low | Cover `futureBonuses`: t2 `stepGearDps −20.358`, t4 `35.412`; single −194.563. Leggings t2 `66.257`, single −11.608. Chestguard and Pauldrons t2 `47.749`. |
| F4 | The sim gives Justicar Battlegear 2pc no effect (`ExposeToAPL` only). In game it raises Judgement of the Crusader's bonus by 15% (the fork's own comment, line 11). The effect is small and would not rescue the set on this gear (M2 −56.92). | low | `vendor/tbc-new-fork/sim/paladin/item_sets.go:11,17-19` |
| F5 | Lightbringer 4pc reads exactly 0 because the sim's ret rotation never casts Hammer of Wrath. Real rets may use it in execute (recalled, unverified). The bonus would be worth a few DPS at most, below the 4.81 floor, so no row changes. | low | `setBonuses` 680 threshold 4: `sameGearDps 0`; K1 M8.2 +0.0000; fork `paladin/item_sets.go:99-105` |
| F6 | The executor's `cw-old-*.out` and `cw-new-*.out` show identical single-swap figures for every row, old and new. That fits deterministic seeds on an unchanged engine, but I did not check which file "old" was taken from. It does not affect the verdict. | info | `cw-old-feral-p3-p2bis.out` vs `cw-new-feral-p3-p2bis.out`, lines 33-55 |

## Rows that look fine

- **Ret.** The ON top 16 is unchanged from OFF (no credits). It is outside this change's scope.
- **Feral.** The four Thunderheart rows at +116.96 are ranks 1 to 4, above Vengeful Gladiator's Staff (+47.74, an arena weapon) and Everbloom Idol (+43.33). A big Thunderheart 4pc lead at phase 3 for a P2 BiS cat matches tier expectations (recalled, unverified).
- **Worn pieces.** Breastplate and Mantle of Malorne show 0, not an upgrade or a loss.
- The plausibility warning that the Thunderheart 4pc is worth 210.37 comes from the older bonus figure (`bonusDps`). The step figures do not use it.

## Gate

As someone who knows the game, would I trust this output? **Yes, for ret and feral on these two gears.**

- Ret gets no credit from bonuses that cannot add DPS.
- Feral set rows show what wearing the named pieces together actually gives, and each break is named once, at the right step.

Before F1 is closed, "trust" should not extend to sets that the screen drops as exact-zero while a profession-gated or stat bonus is in reach. Engineering should confirm why the Burning Rage pair is bit-identical for a blacksmith ret below the hit cap.

## Notes for engineering

- Burning Rage reads exact-zero on a blacksmith ret below the hit cap (F1).
- A +0.06 Set potential line is shown on Greaves of Malorne (F2).
- The Cover's 2pc step is +174 against +78 on the Leggings row (F3). It is probably real, but a 10000-iteration re-sim is cheap.

## Confidence caveats

- All figures are from one recorded run per gear at 3000 iterations (setScreen at 300), read from the committed JSON. I ran no sim.
- Facts labelled "recalled, unverified" are from memory of TBC, not from repo data:
  - the common Wolfshead plus Thunderheart 4pc pattern;
  - Gladiator's Vindication's in-game bonuses;
  - whether rets cast Hammer of Wrath;
  - the size of the Malorne 2pc and the Thunderheart lead.
- Every set-bonus effect stated as fact was read from fork code, with the line ranges cited above.
- I did not check whether Burning Rage's Blacksmithing requirement exists in game. The fork sets it, and the profile has Blacksmithing, so F1 holds either way.
- The F3 explanation is a hypothesis. I did not inspect the gems the engine put in the Cover's meta and blue sockets.
- Commands used to re-derive figures: Python `json.load` over `data/tab-fixtures/{ret-p3-p2,feral-p3-p2bis}.json`, printing `ranking.setScreen`, `ranking.setBonuses`, `ranking.wornSetLadder`, `ranking.caps`, and each set row's `setContext`; the step walk was rebuilt per `view.ts:430-460, 555-590`. Item stat lines and set ids came from `data/items/index.json` and `vendor/wowsims/db.json` (`items[*].setId`).
