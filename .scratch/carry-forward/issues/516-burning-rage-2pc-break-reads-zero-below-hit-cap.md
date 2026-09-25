Status: open
Type: bug
Origin: .scratch/handoffs/511-512-set-credit-redesign/d1-measurements.md (round 2e-1 measurements, 2026-09-25)
Blocks: none
Blocked by: none
Related: 512, 514

# Burning Rage 2pc break reads about 0 below the hit cap

## Evidence

From `.scratch/handoffs/511-512-set-credit-redesign/d1-measurements.md`
("Break value table" and "Burning Rage anomaly"):

- The ret pre-raid preset wears Burning Rage 2/2 (33173, 23522). Round
  2e-1 measured its break on that gear at phase 2, 10000 iterations
  (`measurements/ret-p2-preraid-10000.json` in the same folder). The vacate
  sim replaced the two pieces with 30740 and 28485, which belong to no set.
  The break value is 0.34 ± 2.23.
- The bonus is +20 melee hit rating and needs Blacksmithing
  (fork `sim/common/tbc/items_sets.go` lines 115–124). The request sends
  `profession2: Blacksmithing`.
- That gear is 69.6 hit rating below the cap (`caps.hit.gap` in the dump).
  The ret EP weight for hit is 2.15 against 1.0 for strength, which
  suggests tens of DPS for this bonus.
- On the ret P2 gear at phase 3, the Burning Rage 2pc package figure is
  7.87 ± 2.37 (`ret-p3-p2-10000.json`).

**Hypothesis to check, untested.** One of these is not what the engine
assumes: the bonus itself, the profession check, or the vacate sim (for
example, the replacement items' own stats offsetting the lost hit). The
residue in ticket 514 may also be involved.

## What would close this

1. Find what the sim gives for the Burning Rage 2pc on the ret pre-raid
   gear, by a method that does not depend on the vacate replacements (for
   example, the gear with and without Blacksmithing), and record it here
   with the command.
2. Either explain the 0.34 reading, or file the defect it points to.
