# SME rank judgment: 511 set credit, K7 follow-up (after K6B)

Seat: gate-sme (Opus 5.5). Audience: the engineering team. Recorded runs only. I ran no sim, started no server and ran no git command.

This follow-up answers two questions. Everything else in the first verdict (`.scratch/handoffs/sme-rank-judgment-511-set-credit-k7.md`) still applies: F2 to F6 are unchanged, and the K6B split moves no row's figure or rank (`k7/compare-feral.out`, `RESULT PASS`, 353 rows, largest ON figure difference 0).

## Verdict

**trust-with-caveats.**

- **(a)** The split break lines read right for the lost Malorne 2pc on that gear. They are −59.17 on the Gauntlets and Leggings rows and −57.46 on the Cover row, against 96.26 on the current gear. The drop from 96.26 to about 59 is a real interaction between two energy bonuses, and the fixture measures it twice, in opposite directions, with the same size. The caveats are about how a player reads the lines, not about the values.
- **(b)** **F1 stands, narrowed.**
  - The evidence I gave for F1 is withdrawn. "58.6 hit rating below the cap" is the tab's readout. That readout leaves out Improved Faerie Fire and the head enchant (ticket 521). The sim puts the base gear 4.7 hit rating over the cap (`diag/report.md`).
  - But the screen's pair is not measured on the base gear. It is measured on the Burning Rage package gear: Ragesteel Breastplate and Ragesteel Shoulders in place of the worn chest and shoulders.
  - From the repo's item rows, that package gear is about 9.3 hit rating below the sim's cap before any gems are counted. At that level, +20 hit should read about +17 DPS, not exactly 0.
  - An exact 0 is explained only if the package's gems add at least 9.3 hit. The fixture does not record those gems, so F1 is neither confirmed nor refuted.

**contested:** ticket 521 and the orchestrator's note (decision-log, partial Gate C on the paused K7) say that "a hit bonus reading 0 is consistent with the sim" because the base gear is over the cap. That is right for the base gear. The pair is measured on different gear, which loses 14 hit rating net.

## What was judged, and how it was produced

| Input | Producer | Provenance |
| --- | --- | --- |
| `data/tab-fixtures/feral-p3-p2bis.json` | `pnpm tab-fixtures:record --spec feral --phase 3 --name p2bis --preset-tab "Phase 2" --preset "BiS 6%" ...` (per the first verdict and the task prompt) | `forkSha` f09d218ed4e9…, `forkDirty` false, 3000 iterations, recorded 2026-10-02T19:34:49Z, baseline 2451.06. `setBonusOffSims` {gears 2, simmed 2, fromStore 0, failedGears 0, skippedSteps 0, beforeInStore 2} |
| `.scratch/stage-gate/511-512-set-credit/visual/k7/facts.json` | K7 visual capture | Rendered popover text for the Gauntlets, Pauldrons, Cover and two dropped Gladiator's Sanctuary rows, at widths 653 and 1280 |
| `.scratch/stage-gate/511-512-set-credit/k7/compare-feral.out` | K7 comparison against the 4f19a468 recording | `RESULT PASS`. X/Y table: Gauntlets and Leggings X 109.8677 / Y 59.1672, Cover X 113.2343 / Y 57.4646, B 96.2603 |
| `execution-report.md` lines 1072-1088 | K6B, FX-A at 10,000 iterations | Y 61.6263 (Gauntlets, Leggings) and 58.4722 (Cover); B 93.1580 |
| `data/tab-fixtures/ret-p3-p2.json` | Recorded at main 4f19a468 (not re-recorded) | `setScreen` entry 566; `caps.hit`; Ragesteel rows |
| `diag/report.md`, tickets 516 and 521 | Diagnosis and tickets | As named in the task |

Commands (Python `json.load` from the repo root in Git Bash):

- Thunderheart rows: print `ranking.items[i].setContext` for item ids 31034, 31044, 31039, 31042 and 31048, plus `ranking.wornSetLadder`.
- Burning Rage: print `ranking.setScreen.sets` where `setId == 566`, `ranking.caps`, the Ragesteel rows, and each worn item's `stats[20]` (melee hit; the stat enum is `vendor/tbc-new-fork/proto/common.proto:196`) from `data/items/index.json`. Cross-check with `vendor/wowsims/db.json` `items[*].scalingOptions["0"].stats`.
- Gems: `vendor/wowsims/db.json` `gems[*]` for ids 24027, 24051, 28363 and 30584.

## (a) The split break lines on feral-p3-p2bis

### How the fixture values rebuild

Y = (gear before the step) − (the same gear with the replaced Malorne pieces as set-less copies). Both terms come from the 4pc entry of `futureBonuses`:

| Row | Gear before the 4pc step | Before (Δ vs baseline) | `bonusOffDps` | Y | Rendered break line | X (pieces line) | Rendered |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Thunderheart Gauntlets 31034 | Gauntlets + Leggings | 66.2568 | 7.0896 | **59.1672** | −59.1 | 109.8677 | +109.9 |
| Thunderheart Leggings 31044 | Leggings + Gauntlets | 66.2568 | 7.0896 | **59.1672** | (same gear as the Gauntlets row) | 109.8677 | — |
| Thunderheart Cover 31039 | Cover + Gauntlets | −20.3582 | −77.8227 | **57.4646** | −57.4 | 113.2343 | +113.2 |

X − Y equals the old combined step: 50.7005 for the Gauntlets and Leggings rows and 55.7697 for the Cover row (`compare-feral.out`). The totals are unchanged at +117.0 and +35.4 (`facts.json`).

### Why the values read right

1. **The two Malorne pieces carry no item effect of their own.**
   - Breastplate of Malorne 29096 and Mantle of Malorne 29100 have only stats, sockets and set id 640 in `vendor/wowsims/db.json`. Their key lists in `data/items/index.json` are the same as any plain item's.
   - So the method's known limit (Y also contains any item-id effect of the replaced pieces) adds nothing here. Y is the Malorne 2pc alone, plus noise.
2. **The value repeats on a second character.** FX-A at 10,000 iterations gives 61.63 and 58.47. The fixture gives 59.17 and 57.46. The differences are 2.5 and 1.0, which is the size of one 3000-iteration sim's error (`stepGearSe` about 2.07, `bonusOffSe` about 2.02 and 2.09).
3. **The drop from B to Y matches a mirror measurement in the same fixture.** If two bonuses interact, the value one bonus loses when the other is present must equal the value the other gains when the first is absent. The fixture measures both directions:

   | Direction | With the other bonus | Without it | Difference |
   | --- | --- | --- | --- |
   | Malorne 2pc, with and without Thunderheart 2pc | Y = 59.17 (Gauntlets + Leggings gear) | B = 96.26 (current gear, `wornSetLadder`) | −37.1 |
   | Thunderheart 2pc, with and without Malorne 2pc | `sameGearDps` 75.29 (se 2.04), measured with Malorne 2pc worn | ≈ 111.2 on the Chestguard + Pauldrons gear: step gear 47.75 − (singles −78.10 − 81.57 + one Malorne break 96.26) | −35.9 |

   Both directions give about −36. The two cases sit on slightly different gear, and the second figure includes any stat overlap between the two pieces, so the agreement is approximate. These are separate sims, and they agree to about one standard error, so Y is not an artefact of the new set-less-copy sim.
4. **Game reading.** Both bonuses add energy:
   - Malorne 2pc: a 4% chance per landed melee hit in Cat Form to gain 20 energy (`vendor/tbc-new-fork/sim/druid/item_sets.go:77-101`).
   - Thunderheart 2pc: Mangle (Cat) costs 5 less energy (`:222-240`).

   Energy is worth less to a cat that already has more of it: it wastes more at the energy cap, and it has fewer energy-starved gaps to fill. So a lower Malorne value once Thunderheart 2pc is worn is the expected direction (recalled, unverified). This is the same interaction my first verdict proposed for F3 (hypothesis, untested).

### Caveats on (a)

- The size of the interaction is a sim result. On the arithmetic alone, a 5-energy discount on one Mangle per debuff refresh looks too small to remove 38% of the Malorne bonus. But a cat rotation's energy use is lumpy, so arithmetic like that is unreliable (hypothesis, untested). I cannot confirm the size against game data. It is replicated and self-consistent, and that is the claim I make.
- The Cover row's Y (57.46) is close to the Gauntlets row's Y (59.17), although the Cover row's gear has no Wolfshead and so less energy. A simple energy-scarcity reading would predict a larger Y there, not a smaller one. The gap (−1.7 here, −3.2 on FX-A) is within noise. It does not contradict the values.

## (b) F1 re-judged: Burning Rage 2pc reads exactly 0 on ret-p3-p2

**F1 stands, narrowed.**

### What changes

My first verdict gave "58.6 hit rating below the cap" as the reason an exact 0 was suspicious. That figure is `ranking.caps.hit.gap`. Ticket 521 shows that the readout counts 83.31 rating (36 from items plus 47.31 from Precision) and leaves out:

- Improved Faerie Fire (3%, 47.3 rating);
- the head enchant's 16 hit (enchant 3003, on the worn Furious Gizmatic Goggles 32461).

The diagnosis puts the base gear 4.69 hit rating over the sim's melee cap (`diag/report.md` H5: 6.2976% melee hit plus 3% Improved Faerie Fire, against 8% + 1% miss). It also shows that hit added above the cap gives bit-identical DPS (H5: legs +23 and shoulders +16 alone equal base at every seed). So the reason I gave is wrong, and I withdraw it.

### Why F1 still stands

The screen's pair compares the **package gear** with set-kept and set-less copies of the set's pieces (`plan.md:356-359`). For Burning Rage the package is `packageItemIds` [33173, 23522] (`setScreen.sets` 566). Hit on that gear, from the item rows (both sources agree):

| Change | Item | Melee hit rating |
| --- | --- | --- |
| Removed | Crystalforge Breastplate 30129 | −23 |
| Removed | Shoulderpads of the Stranger 30055 | 0 |
| Added | Ragesteel Breastplate 23522 | 0 |
| Added | Ragesteel Shoulders 33173 | +9 |
| **Net** | | **−14** |

- The base gear's hit from items and enchants is 52 rating: 36 from items (`data/items/index.json` `stats[20]` summed over the worn gear) plus 16 from enchant 3003. That matches the diagnosis's 6.2976% − 3% Precision = 3.30% × 15.77 = 52.0. So the worn gems add no hit.
- The gear needs 47.31 rating to reach the cap (9% − 3% Precision − 3% Improved Faerie Fire).
- Package gear before its gems: 52 − 14 = 38, which is **about 9.3 rating below the cap**. With the +20 bonus it would be 10.7 over. The bonus should therefore recover about 9.3 rating, which is 0.59% hit. At the diagnosis's fitted 29.9 DPS per 1% hit below the cap (`diag/h5.py`), that is about **+17.6 DPS**, which cannot read as 0.0000.

An exact 0 fits only if the package's gems add at least 9.3 hit, or the bonus is not active on the set-kept side. What the repo shows:

- New sockets are filled with hit weighted at zero (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/candidate-gems.ts:335-343`, `gemFillWeights`). So the Ragesteel Shoulders' own two yellow sockets get no hit gems from the fill.
- Meta repair keeps full weights, and on this gear it does add hit. The Ragesteel Breastplate row records `gemSubstitutions` that turn belt 30106's two Bold Living Ruby 24027 into Rigid Dawnstone 24051 (+8 hit each, `vendor/wowsims/db.json` gems). That is +16, enough to put the package gear about 6.7 over the cap, if the same repair happens in the package.
- The fixture does not record the screen package's gems, so I cannot tell which case applies.
- The bonus itself works in the sim when the gear is below the cap. Phase 1's BR2 control read non-zero at every N on ret pre-raid gear (`phase1/results.md:89`, +5.8 at N = 3000), and K1 read 6.60 by both copies and by removing the profession (`execution-report.md:42`).

### What closes F1

Read the hit rating of the screen's Burning Rage package request on ret-p3-p2. One `/computeStats` call or a dump of the composed request is enough; no DPS sim is needed. Then:

- If the gear's hit from items, gems and enchants is at least 47.31, the exact 0 is right, because the bonus is worth nothing on that gear. Dropping the set is then correct for the game. Close F1, and change only the label's wording: "exact-zero" here means "a bonus in reach that this gear cannot use", not "no bonus in reach".
- If it is below 47.31, the set-kept side is not getting the bonus. F1 becomes a defect.

The ranking does not change either way: rule 2 drops the set (−74.04 plus at most about 18 is still below 0).

## Findings

| # | Finding | Severity | Evidence |
| --- | --- | --- | --- |
| A1 | The split break values (Y 59.17 for the Gauntlets and Leggings rows, 57.46 for the Cover row) are the Malorne 2pc's value on the gear just before the 4pc step. They read right: they repeat on FX-A (61.63, 58.47), and the drop from B (−37.1) matches the opposite measurement of Thunderheart 2pc with and without Malorne 2pc (−35.9). | none (pass) | Fixture 4pc entries: `stepGearDps` of the step before, minus `bonusOffDps` (66.2568 − 7.0896; −20.3582 − (−77.8227)). `wornSetLadder` 640:2 = 96.2603. TH 2pc `sameGearDps` 75.2949. Chestguard and Pauldrons rows: step 47.7494, singles −78.0955 and −81.5698. `compare-feral.out` X/Y table. `execution-report.md:1076-1078`. |
| A2 | The method's limit (the item-id effect of the replaced pieces) does not apply here. Neither Malorne piece carries an effect. | info | `vendor/wowsims/db.json` items 29096 and 29100 have only stats, sockets and setId 640. `data/items/index.json` keys for both. |
| A3 | The same lost bonus shows −96.3 on the Pauldrons and Vengeful Gladiator's Dragonhide Tunic rows and −59.1 on the Gauntlets row. Both figures are right for their order (worn gear versus gear that already has Thunderheart 2pc). Nothing in the popover says which gear the loss is measured on, so a player comparing rows may read it as an inconsistency. | low | `facts.json` lines for `p2bis-31048-pauldrons`, `p2bis-33675-dropped-584-tunic` and `p2bis-31034-gauntlets`. |
| A4 | The rendered break lines are 0.1 off their measured values: −59.1 for 59.167 and −57.4 for 57.465. The break line appears to take the rounding remainder so that the rounded lines add up to the rounded total. The size is harmless. | info | `facts.json` Gauntlets: 3.7 + 62.5 − 59.1 + 109.9 = 117.0. Cover: −194.6 + 174.2 − 57.4 + 113.2 = 35.4. Measured Y from the fixture as in A1. |
| A5 | The Cover row's Y (57.46) is not larger than the Gauntlets row's Y (59.17), although that gear has no Wolfshead. The gap is within noise, and it has the same sign on FX-A. | info | As in A1. FX-A 58.47 against 61.63. |
| F1 (re-judged) | **contested** (ticket 521 and the orchestrator note: "a hit bonus reading 0 is consistent with the sim"). **F1 stands, narrowed.** The "58.6 below the cap" evidence is withdrawn. The Burning Rage pair is measured on package gear that loses 14 hit rating net, which is about 9.3 below the sim's cap before gems. There, +20 hit should read about +17.6, not 0.0000. An exact 0 is right only if the package's gems add at least 9.3 hit; the fixture does not record them. No row changes. | medium (engineering), none for this ranking | Item hit, `data/items/index.json` `stats[20]` (agreeing with db.json `scalingOptions`): 30129 = 23, 30055 = 0, 23522 = 0, 33173 = 9; base gear items 36 + enchant 3003 16 = 52. Cap rule: `diag/report.md` H5. Pair `{dps: 0, pairedSe: 0}`: `ret-p3-p2.json` `setScreen.sets` 566. Gem fill zeroes hit: `candidate-gems.ts:335-343`. Repair adds Rigid Dawnstone on this gear: the Ragesteel Breastplate row's `gemSubstitutions`. The bonus works below the cap: `phase1/results.md:89`, `execution-report.md:42`. |

## Rows that look fine

- Gauntlets, Leggings and Cover popovers: each split pair of lines adds up to the old step exactly, and every total is unchanged (+117.0, +117.0, +35.4).
- Pauldrons and Chestguard rows: the row's own break is shown once, at −96.3, before the steps, and is not split. That is right: their own swap removes a Malorne piece from the current gear.
- The dropped Gladiator's Sanctuary Tunic shows "Breaks Malorne Harness 2pc −96.3". That is right, because it takes the chest slot.

## Gate

Would I trust the split popovers as a feral player who knows the game? **Yes.** The break lines show what the lost Malorne 2pc is worth on the gear where the loss happens. The values agree with a second measurement in the opposite direction.

F1 does not block this ranking. Before "trust" extends to sets the screen drops as exact-zero while a stat bonus is in reach, engineering must confirm that the package gear for such a set is at or over the relevant cap (see "What closes F1").

## Notes for engineering

- The same broken bonus has two sizes on two rows (A3). Consider saying which gear the loss is measured on.
- The break line absorbs the rounding remainder (A4).
- F1: read the hit rating of the Burning Rage package request on ret-p3-p2; it is one stats call and no sim.

## Confidence caveats

- All feral figures come from one 3000-iteration recording plus the FX-A 10,000-iteration run that the executor reported. I ran no sim.
- The size of the interaction between the two energy bonuses is the sim's result. That energy is worth less when the cat already has more of it is **recalled, unverified**.
- The F1 hit arithmetic uses the diagnosis's cap rule and its fitted 29.9 DPS per 1% hit. That fit was made on Justicar singles on this gear, so the +17.6 figure is an estimate. The conclusion "not exactly 0" does not depend on its size.
- I did not determine the screen package's actual gems. I read the fill and repair rules only far enough to see that both outcomes are possible. That is why F1 stays open and not closed.
- Every set-bonus effect and item stat stated as fact was read from fork code or repo data, with the file named above.
