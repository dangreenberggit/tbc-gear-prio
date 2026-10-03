# SME rank judgment: per-future breaks (ticket 490), feral cat at worn Thunderheart 2

Round: `upgrades-tab-closeout/round-2b`, Step 7. Ticket: 490 (with 467, 479, 492).
Rule judged: **best-stop** (provisional; the owner has not chosen).
This file is new. It replaces the verdict of
`.scratch/handoffs/sme-rank-judgment-467-net-set-bonus.md` for this build only.

## Verdict

- **"Set potential" ON: trust-with-caveats.**
- **"Set potential" OFF: trust.**

The round-2 defect is gone. No Malorne or Nordrassil head, shoulder or chest
row is charged the Thunderheart 2pc. Every ON figure at worn 2 and at worn 1
equals OFF plus what the best-stop rule gives from the lines in its own
tooltip. The tooltip now tells a single-piece break ("breaks ...", already
in OFF) apart from a path break ("to reach 4pc: breaks ...").

The caveats do not change any ON figure in this state. They are listed under
"Game problems": the hidden 4pc values of Malorne and Nordrassil at worn 2 do
not agree with the same bonuses measured in the other worn states (C1), and
set credit goes to a piece whose set bonus the player can reach without it
(C2).

**contested:** ticket 490's summary says the Thunderheart 2pc break "happens
only on the way to the Malorne or Nordrassil 4pc, whose net is at or below the
noise floor". That is what the tool measured at worn 2. It is not a game fact.
The same Nordrassil 4pc (Shred +75) measures +44.8, +60.5, +63.0 and +65.2 at
worn 0, 1, 3 and 4 (evidence in C1). The ON figures at worn 2 do not depend on
this claim (see "Robustness" below), so the contest does not block the verdict.

## What was reviewed

- Character: feral cat, `/tbc/druid/feralcat/`, phase 3, 3000 iterations.
  Fork `f6355d529742cb13575e7329d0f3b9e86bdaef7a` (`forkHead` in both JSON
  files). The current fork tip is `5e00931759b3ff1b30495f705a81e77381fb95f3`
  (`git -C vendor/tbc-new-fork rev-parse HEAD`). I did not re-run the tab on
  the tip. The executor states that the tip only widens the tooltip box.
- Worn-2 state (from `gearWorn`): Wolfshead Helm, Shoulderpads of the
  Stranger, Bloodsea Brigand's Vest, **Thunderheart Gauntlets**,
  **Thunderheart Leggings** (Thunderheart 2pc active), the rest as in round 2.
  Baseline 2603.6 DPS.
- Worn-1 state: same, but legs are Leggings of Murderous Intent (Thunderheart
  worn 1). Baseline 2501.5 DPS.
- Inputs, all under `.scratch/stage-gate/upgrades-tab-closeout/round-2b/`:
  `sme-feral-worn2-off.json`, `sme-feral-worn2-on.json` (rows and tooltips),
  `feral-worn1.json` (rows under `off`/`on`), and the PNGs
  `feral-worn2-tip-BreastplateofMalorne-on.png` and
  `feral-worn2-tip-NordrassilChestplate-on.png` (I looked at these two; their
  text matches the JSON). The executor captured all of these from the live
  tab. I read them as given.
- For comparison: `.scratch/stage-gate/upgrades-tab-closeout/round-2/feral-worn{0,1,2,3,4}.json`.
- Tables in this file were computed with a python script that joins ON and
  OFF rows by `itemId` and prints `dpsCell` and `tooltip`, for example:
  `python -c "import json; on=json.load(open('sme-feral-worn2-on.json')); ..."`
  run in the round-2b folder.
- Set bonuses read from the fork sim:
  `grep -n -A14 'Name: "Malorne Harness"' vendor/tbc-new-fork/sim/druid/item_sets.go`
  (and the same for Nordrassil Harness and Thunderheart Harness):
  - Malorne 2pc: 4% chance on a landed melee hit for 20 energy in Cat Form.
    Malorne 4pc: +30 Strength in Cat Form.
  - Nordrassil: no 2pc. 4pc: Shred +75 damage.
  - Thunderheart 2pc: Mangle (Cat) costs 5 less energy. 4pc: Rip, Swipe and
    Ferocious Bite deal 15% more damage.
- Slots and set ids read from `data/items/index.json` (python lookup by id):
  Malorne (640) 29096 chest, 29097 hands, 29098 head, 29099 legs,
  29100 shoulder. Nordrassil (641) 30222 chest, 30223 hands, 30228 head,
  30229 legs, 30230 shoulder. Thunderheart (676) 31034 hands, 31039 head,
  31042 chest, 31044 legs, 31048 shoulder.

## Check 1: is any Malorne or Nordrassil head, shoulder or chest row charged the Thunderheart 2pc?

No.

| Row | Slot | OFF | ON | ON − OFF | Expected |
|---|---|---|---|---|---|
| Breastplate of Malorne | chest | +8.6 | +70.9 | +62.3 | OFF + 62.3 |
| Mantle of Malorne | shoulder | −14.7 | +47.6 | +62.3 | OFF + 62.3 |
| Stag-Helm of Malorne | head | −123.8 | −61.5 | +62.3 | OFF + 62.3 |
| Nordrassil Chestplate | chest | +15.1 | +15.1 | 0 | ON = OFF |
| Nordrassil Feral-Mantle | shoulder | −4.0 | −4.0 | 0 | ON = OFF |
| Nordrassil Headdress | head | −124.9 | −124.9 | 0 | ON = OFF |

Breastplate of Malorne moves from OFF rank 9 to ON rank 3. Nordrassil
Chestplate stays at ON rank 8 (OFF rank 5; the two Thunderheart pieces and
Malorne pieces moved above it). This is what the game says: the Malorne 2pc
fits in head, shoulder and chest with the Thunderheart 2pc kept, and a set
whose only bonus is not worth its cost adds nothing.

## Check 2: do the hands and legs rows carry the Thunderheart 2pc loss only inside OFF?

Yes.

| Row | Slot | OFF (includes −108.6) | ON | ON − OFF |
|---|---|---|---|---|
| Gauntlets of Malorne | hands | −140.8 | −78.5 | +62.3 |
| Greaves of Malorne | legs | −136.6 | −74.3 | +62.3 |
| Nordrassil Handgrips | hands | −131.9 | −131.9 | 0 |
| Nordrassil Feral-Kilt | legs | −118.9 | −118.9 | 0 |
| Vengeful Gladiator's Dragonhide Legguards | legs | −110.4 | −110.4 | 0 |
| Fel Leather Gloves | hands | −144.8 | −144.8 | 0 |

Their tooltips show the single-piece form "breaks Thunderheart Harness 2pc:
-108.6" with no "to reach" line. The later path pieces (for example the
other of hands or legs) would break the same 2pc again, and the tool does not
charge it a second time. That is correct: a bonus can be lost only once.

## Check 3: does every ON figure follow the rule from what its tooltip shows?

Yes, on every set row at worn 2 and worn 1. Non-set rows are identical in OFF
and ON. The only row in one list and not the other is Necklace of Trophies
(OFF below-cutoff rank 30, −11.4). The ON list is one row shorter at the
cutoff; this is a row-count edge, not a ranking change.

Worn 2 (best-stop walk; "hidden" means no value line, so the future is at or
below the 5.09 floor and counts as 0):

| Set rows | Futures shown | Walk | Credit |
|---|---|---|---|
| Thunderheart chest/shoulder/head | 4pc (2/4) +78.0, no break | 78.0 | +78.0 (28.0→106.0, 2.1→80.1, −109.4→−31.4) |
| Malorne head/shoulder/chest | 2pc (0/2) +62.3; 4pc hidden, "to reach 4pc: breaks … −108.6" | 62.3 → 62.3 + 0 − 108.6 = −46.3 | +62.3 |
| Malorne hands/legs | 2pc +62.3; 4pc hidden; own break in OFF, no path break | 62.3 → 62.3 | +62.3 |
| Nordrassil head/shoulder/chest | 4pc hidden, "to reach 4pc: breaks … −108.6" | 0 − 108.6 | 0 |
| Nordrassil hands/legs | 4pc hidden; own break in OFF | 0 | 0 |

Worn 1 (from `feral-worn1.json`):

| Row | OFF | Futures | ON shown | OFF + credit |
|---|---|---|---|---|
| Thunderheart Pauldrons | +112.3 (activates 2pc) | 4pc (1/4) +108.1 | +220.3 | 220.4 (rounding) |
| Thunderheart Chestguard | +111.0 | 4pc +108.1 | +219.1 | 219.1 |
| Thunderheart Leggings | +100.6 | 4pc +108.1 | +208.7 | 208.7 |
| Thunderheart Cover | −3.4 | 4pc +108.1 | +104.7 | 104.7 |
| Mantle / Breastplate of Malorne | −9.7 / −9.7 | 2pc +87.6, 4pc +19.7 | +97.6 / +97.5 | 97.6 / 97.6 |
| Gauntlets / Greaves of Malorne | −30.5 / −34.5 | same | +76.8 / +72.8 | 76.8 / 72.8 |
| Stag-Helm of Malorne | −220.6 | same | −113.3 | −113.3 |
| Nordrassil Feral-Mantle / Chestplate | +1.1 / −3.8 | 4pc (0/4) +60.5 | +61.6 / +56.7 | 61.6 / 56.7 |
| Nordrassil Feral-Kilt / Handgrips | −19.3 / −22.3 | same | +41.2 / +38.2 | 41.2 / 38.2 |
| Nordrassil Headdress | −221.8 | same | −161.3 | −161.3 |

At worn 1 no break line appears on any row. That is correct: one Thunderheart
piece activates nothing, so replacing Thunderheart Gauntlets loses no bonus.

The "(n/k)" counts follow the ticket-479 decision (pieces worn before the
swap): Thunderheart (2/4) at worn 2 and (1/4) at worn 1; Malorne (0/2) and
(0/4); Nordrassil (0/4).

### Robustness of the worn-2 ON figures

The worn-2 ON figures do not depend on the hidden 4pc values. If the hidden
Malorne 4pc were as large as its highest measurement in any state (+69.5 at
round-2 worn 3), the walk would be 62.3 → 62.3 + 69.5 − 108.6 = 23.2, and the
credit would still be 62.3. If the hidden Nordrassil 4pc were +65.2 (round-2
worn 4), the walk would be 65.2 − 108.6 < 0, and the credit would still be 0.
Under the alternative full-path rule, the Malorne rows would be charged
−108.6 for the 4pc path against a hidden 4pc, which is the round-2 defect.
Best-stop is the rule that matches the game here.

## Check 4: is the worn-1 Thunderheart 4pc of +108.1 plausible?

Yes, plausible, on the high side of the measurements.

- It is nowhere near 2 × 92.9 + 93.8 = 279.6, and it is not the old
  B4 − 2·B2 value (negative).
- Thunderheart 4pc as measured across states, as a share of baseline:
  worn 0 +93.8 (3.8% of 2483.4), worn 1 +108.1 (4.3% of 2501.5), worn 2
  +78.0 (3.0% of 2603.6), worn 4 loss −76.9 (2.9% of 2679.4). Sources:
  round-2 `feral-worn0.json`, round-2b `feral-worn1.json`,
  `sme-feral-worn2-on.json`, round-2 `feral-worn4.json`.
- It agrees with the row's own "Full set end state: +207.7". The three
  singles (Pauldrons 112.3, Chestguard 111.0, Leggings 100.6) each include
  the 2pc once, so end state = 323.9 − 2·B2 + B4. With B4 = 108.1 this
  gives B2 ≈ 112, close to the 108.6 Thunderheart 2pc that worn 2 measures.
  With B2 = 92.9 (the worn-0 value) it would give B4 ≈ 69.5. So the 4pc sits
  between about 70 and 108 depending on which 2pc value is right. The
  Thunderheart 2pc itself measures 92.9 in one state and 108.6 in another,
  a 15.7 DPS spread, so a similar spread in the 4pc is expected at 3000
  iterations across different gear.
- **Recalled, unverified:** Rip plus Ferocious Bite are about a fifth of a
  cat's single-target damage, so +15% to them is about 3%. 4.3% is above that
  but not absurd.

## Game problems

| # | Finding | Severity | Evidence |
|---|---|---|---|
| C1 | The hidden 4pc values at worn 2 disagree with the same bonuses in every other state. Nordrassil 4pc (Shred +75) measures +44.8, +60.5, +63.0, +65.2 at worn 0, 1, 3, 4 and is hidden (at or below 5.09) at worn 2. Malorne 4pc (+30 Strength in Cat Form) measures +9.5, +19.7, +69.5 at worn 0, 1, 3 and is hidden at worn 2. By the game, neither bonus depends on which Thunderheart pieces are worn, so it should be about the same size in all five states. The worn-2 tooltip tells a reader the Nordrassil 4pc is worth nothing. The Malorne 4pc at +69.5 is also too large for +30 Strength (**recalled, unverified:** 30 Strength is worth about 10–20 DPS to a cat at this gear). **Hypothesis, untested:** the worn-2 and worn-3 measurements include part of the Thunderheart 2pc loss. | minor for this verdict (no ON figure at worn 2 changes; see "Robustness"); **major** for any state where a break is smaller than the true 4pc | round-2 `feral-worn{0,1,3,4}.json` tooltips; round-2b `sme-feral-worn2-on.json` (no 4pc line on any Malorne or Nordrassil row) |
| C2 | Set credit goes to a piece the set bonus does not need. At worn 1, Thunderheart Cover shows ON +104.7 (rank 4, above every Malorne piece). Its own figure is about the Wolfshead Helm loss plus the Thunderheart 2pc; ON adds the 4pc. A cat reaches the Thunderheart 4pc with chest, shoulders, hands and legs and keeps Wolfshead, so Cover does not unlock either bonus. **Recalled, unverified:** Wolfshead Helm is kept by cats through most of TBC for its energy on shifting. This comes from the "Set potential" design (every package piece gets the credit), not from 490. | minor, design note for the owner | `feral-worn1.json` Thunderheart Cover row: OFF −3.4, ON +104.7; OFF head candidates at worn 2 all lose 109–125 DPS |
| C3 | The Nordrassil head/shoulder/chest tooltip at worn 2 shows only "to reach 4pc: breaks Thunderheart Harness 2pc: -108.6" and an end state. It does not say why ON equals OFF. A reader who knows the rule can work it out (the 4pc is below the floor, so the walk never goes positive). A reader who does not may think the break was forgotten. | cosmetic | `feral-worn2-tip-NordrassilChestplate-on.png` |
| C4 | One run at 3000 iterations. Deltas under about 5 DPS are noise. This worn-2 and worn-1 check does not exercise a break shared by two futures (the "charged once" clause of the rule). | note | row lists; no row has two futures with the same break line |

## Rows that look fine

- Thunderheart Chestguard and Pauldrons first and second in ON at worn 2:
  either one is a step to the Thunderheart 4pc with no bonus lost.
- Breastplate and Mantle of Malorne rise to ON ranks 3 and 4 at worn 2: the
  Malorne 2pc fits in the free chest, shoulder and head slots.
- Malorne 2pc at +62.3 (2.4%) at worn 2 and +87.6 (3.5%) at worn 1:
  plausible for a 4% chance of 20 energy on every melee hit.
- Every non-set row is unchanged between OFF and ON, and ranked the same.
- Everbloom Idol, Vengeful Gladiator's Dragonhide Tunic and Idol of the White
  Stag at the top of the non-set rows: same as round 2, no change.

## Gate

As a feral who knows the game, I trust the ON view at worn Thunderheart 2 and
worn 1 for ranking. The best-stop rule gives the answer the game gives in this
state. Before a plain "trust":

- The 4pc value of a set must not depend on which pieces of another set are
  worn, beyond noise (C1). The Nordrassil 4pc shown or hidden at 5 of 5 worn
  states, at about 45–65 DPS, would satisfy this.
- The owner chooses the stopping rule. The full-path alternative would bring
  back the round-2 defect for Malorne head/shoulder/chest at worn 2.

## Notes for engineering

- Nordrassil 4pc: +44.8 / +60.5 / hidden / +63.0 / +65.2 at worn 0/1/2/3/4.
- Malorne 4pc: +9.5 / +19.7 / hidden / +69.5 at worn 0/1/2/3. +69.5 is too
  large for +30 Strength.
- Thunderheart Cover at worn 1 ON: +104.7, credited a 4pc it does not unlock.

## Confidence and caveats

- Checks 1–3 are exact arithmetic on the captured JSON. High confidence.
- Check 4 compares measurements from different gear states and one run each;
  the plausibility range is a judgment. Medium confidence.
- C1's game claim (the bonuses do not depend on other worn sets) comes from
  the sim's set definitions in `item_sets.go`. High confidence. Its cause is
  a hypothesis only.
- DPS sizes marked "recalled, unverified" are from memory of TBC feral play,
  not from repo data.
- The captures are from fork `f6355d529`, not the tip `5e0093175`. I did not
  confirm the tip renders the same text.
