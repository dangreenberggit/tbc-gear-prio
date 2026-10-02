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

## Comments

2026-10-02 (stage-gate 511-512-set-credit, chunk K7): item 1 has a
reading. The ticket stays open; the stage plan asks only for a comment.

- **The sim's value on the ret pre-raid gear at phase 2** (10,000
  iterations, K1): +6.5966 (se 1.556) by set-less copies (base minus the
  gear with both pieces as set-less copies), and +6.5966 by the gear with
  and without Blacksmithing. Both are the same sim result, 1833.6491
  (`.scratch/stage-gate/511-512-set-credit/k1-measurements.md` lines
  108-113; gitignored).
- **The 0.34 reading** came from the vacate method, whose figures included
  the replacement items' own stats (stage plan claim C27, read from fork
  `063600a3` `rank.ts` lines 2351-2420). The vacate sims were deleted in
  chunk K4, so no tab figure uses that method now.
- **The profession check is real.** Seven sets need a profession, Burning
  Rage 566 among them
  (`grep -rn "RequiredProfession:" vendor/tbc-new-fork/sim --include=*.go`),
  and the tab's request sends `profession2: Blacksmithing`.
- **On the ret P2 gear at phase 3,** the re-recorded fixture
  `data/tab-fixtures/ret-p3-p2.json` reads Burning Rage's screen pair as
  exactly 0, so the set screen drops it ("exact-zero"). Hypothesis: that
  gear is over the melee hit cap in the sim (4.69 hit rating over once
  Improved Faerie Fire is counted;
  `.scratch/stage-gate/511-512-set-credit/diag/report.md`), so +20 hit adds
  nothing. Ticket 521 records that the tab's hit readout omits debuff and
  enchant hit. The SME seat's judgment of this is in ticket 511 ("F1").
