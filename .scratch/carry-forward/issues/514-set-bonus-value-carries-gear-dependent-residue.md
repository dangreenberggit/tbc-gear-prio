Status: open
Type: bug
Origin: .scratch/handoffs/511-512-set-credit-redesign/d1-measurements.md (round 2e-1 measurements, 2026-09-25)
Blocks: none
Blocked by: none
Related: 511, 512

# Set bonus value carries a gear-dependent residue

## Evidence

The engine measures a set bonus as the package sim minus the baseline,
minus each piece's single-swap delta, minus the 2pc value for a 4pc.
Round 2e-1 ran this on the fork sim through the tab, at 10000 iterations,
with the se rebuilt as an explicit sum over raw sims (`a1.diff` in the
handoff folder). Full tables and formulas:
`.scratch/handoffs/511-512-set-credit-redesign/d1-measurements.md`
(sections A3 and A4). Dumps are in the same folder under `measurements/`.

Two ret bonuses cannot add ret DPS. The Justicar 4pc changes only
Judgement of Command, which the default ret APL never casts. The
Crystalforge 4pc is a party heal. Their measured values:

| bonus | ret P2 gear, phase 3 (`ret-p3-p2-10000.json`) | ret pre-raid gear, phase 2 (`ret-p2-preraid-10000.json`) |
| --- | --- | --- |
| Justicar 4pc (626:4) | +17.82 ± 4.46 | −5.25 ± 4.15 |
| Crystalforge 4pc (629:4) | +17.32 ± 3.40 | +2.33 ± 3.17 |

On the P2 gear both read about +17 at 4 to 5 se. On the pre-raid gear both
read about 0. At 3000 iterations the P2 figures were +15.32 ± 8.21 and
+21.07 ± 6.20, so more iterations did not remove them.

The committed fixture `data/tab-fixtures/feral-p3-th-hands-legs.json`
gives Nordrassil 4pc −60.46 (−17.7 se) and Malorne 4pc −31.84 (−9.1 se).
A set bonus cannot cost DPS, so these are residue in the other direction.

So the "package minus singles" figure is not a clean measure of a bonus
on well-geared characters. Its error depends on the gear and on which
pieces are in the package. Cause: hypothesis, untested. A stat interaction
between the package pieces (for example hit or expertise crossing a cap)
that single swaps on the baseline do not see.

This also rules out the calibration rule in round 2e's revision 2
(`plan.md` in the handoff folder): a `B > 2·se` test on the P2 gear
admits both inert bonuses.

## What would close this

1. A measurement method, agreed with the owner, that reads the Justicar
   4pc and Crystalforge 4pc as about 0 on the ret P2 gear at phase 3, and
   still reads the known feral tier bonuses (Thunderheart, Nordrassil,
   Malorne) as positive. The handoff lists candidate methods.
2. The chosen method's result on the two gear sets above, recorded here
   with the command that produced it.

## Comments

2026-10-02 (stage-gate 511-512-set-credit, chunk K7): stays open. One
reading that item 2 asks for is missing.

- **Item 1, the method, is agreed.** The owner approved the same-gear
  measurement (stage decision log, "set measure" line: "The proposed
  method sims the same gear twice ". thats fine. its important to get
  these right. and the alternatives dont look good."). It sims the same
  gear twice, with the set's pieces as set-less and as set-kept copies, so
  the items' own stats are on both sides of the difference
  (`docs/adr/0035-set-rows-valued-by-simmed-gear.md`, "The measurement").
- **On the ret P2 gear at phase 3** (10,000 iterations, K1): Justicar 4pc
  +0.0000 and Crystalforge 4pc +1.5851 (se 1.725). The feral tier bonuses
  read positive: Thunderheart 2pc +75.91 and 4pc +75.61, Nordrassil 4pc
  +46.66, Malorne 4pc +23.04
  (`.scratch/stage-gate/511-512-set-credit/k1-measurements.md` lines
  88-111; gitignored).
- **Missing: the ret pre-raid gear at phase 2.** No same-gear Justicar 4pc
  or Crystalforge 4pc reading by this method exists on that gear. No step
  of the stage measured it, and the stage ruled that no new sims run for
  it (decision log, 2026-10-02). That reading is what closes this ticket.
- **The cause of the residue, measured.** On ret P2 gear it is real sim
  behaviour. The gear is 4.69 hit rating over the melee cap once Improved
  Faerie Fire is counted, and expertise counts only in whole points. The
  Justicar gap is +13.58 ± 0.68 at independent seeds
  (`.scratch/stage-gate/511-512-set-credit/diag/report.md`, `diag/h2.out`).
  On feral, the four Thunderheart pieces with their bonuses off are worth
  5.87 ± 0.46 DPS more worn together than one at a time
  (`k2-thunderheart-seeds.md` in the same folder). K1's single-seed 9.59
  is within the upper-bound noise of this figure.
- **Earlier break values.** The vacate method's Wastewalker figures
  (2pc 25.87-27.66, 4pc 21.41 ± 1.48) included the replacement items' own
  stats. The ladder gives 2pc 24.44 ± 1.04 and 4pc 21.14 ± 1.05 at 4 worn
  (k1-measurements.md line 114). The vacate sims were deleted in chunk K4.
- **The tab no longer uses "package minus singles" on its path.** Each set
  row's total is one sim of wearable gear, and a bonus counts only when its
  same-gear value clears the noise gate (ADR-0035).
