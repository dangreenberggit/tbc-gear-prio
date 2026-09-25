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
