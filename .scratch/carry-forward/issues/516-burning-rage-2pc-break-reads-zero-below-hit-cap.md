Status: closed
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

2026-10-02 (F1 hit-cap check): the hypothesis in the last bullet above is
confirmed for the screen's pair on the ret P2 gear at phase 3. The figures
and commands are in ticket 511's comment of the same date.

- The set screen sims Burning Rage on the package gear: Ragesteel
  Breastplate and Ragesteel Shoulders, with two Rigid Dawnstone in the
  Shoulders. `/computeStats` reads that gear at 54 melee hit rating and
  6.4244% melee hit before the bonus. The sim's cap is 6.0% once Improved
  Faerie Fire is counted, so the gear is 6.69 rating over the cap.
- On the set-kept side the bonus is active ("Burning Rage (2pc)" in
  `/computeStats` `sets`; the request sends Blacksmithing), and the hit is
  74 rating. The two pair sims are identical (2024.1456, seed 11, 300
  iterations).
- So on this gear the 2pc is worth nothing because of the hit cap. The
  profession gate and the copies work. This says nothing about the ret
  pre-raid gear. There, K1's +6.5966 (above) shows the bonus is worth DPS
  below the cap. The ticket's title, "below the hit cap", fits that gear
  and not the P2 gear.

## Closed 2026-10-02: explained, no defect

Pre-raid: +6.60 ± 1.56 (K1 M7,
`.scratch/stage-gate/511-512-set-credit/k1-measurements.md:108-109`) is
expected. Once Improved Faerie Fire, Glyph of Ferocity and the Vengeance
Wrap socket bonus are counted, only about 4.3 of the 20 rating is below
the cap (measured below). The "tens of DPS" premise came from the tab
readout, which omits debuff and enchant hit (ticket 521). P2 package
gear: the exact 0 comes from meta repair's dead Rigid Dawnstones. Ticket
535 owns it, and its fix carries the test
(`.scratch/stage-gate/535-meta-repair-hit/measurement.md`). The title's
"below the hit cap" is true of neither gear.

### The measurement

`/computeStats` on the managed `wowsims-backend` (:3333, fork
`b1eb1de85`), for the two K1 requests
`.scratch/stage-gate/511-512-set-credit/probe/requests/ret-p2-preraid/sent/base.json`
and `noBS.json`. The two differ only in `profession2: Blacksmithing`.

| Request | Melee hit rating (final) | Melee hit % (final) |
| --- | --- | --- |
| base (Blacksmithing) | 63 | 6.9951 |
| noBS (no profession2) | 43 | 5.7268 |

The sim's cap is 6.0% with Improved Faerie Fire counted. 20 rating is
1.2683%, so 15.77 rating per 1%. Without the bonus the gear is 0.2732%
below the cap, which is 4.31 rating. The other 15.69 rating of the bonus
is over the cap.

Command, from the repo root with Node 22 on PATH:

```
node_modules/.bin/tsx .scratch/stage-gate/511-512-set-credit/f1/stats516.mts --warm
```

`stats516.mts` is a copy of `f1/stats.mts` with `REQS` pointed at the two
files above. Output: `f1/stats516-warm.log` and `f1/stats516-warm.json`
(all under `.scratch/stage-gate/`, gitignored).

Both requests report `sets: ["Burning Rage (2pc)"]`, including noBS.
`GetActiveSetBonusNames` (fork `sim/core/item_sets.go:258`) lists bonuses
by piece count only. The profession check skips the bonus's effect
(`item_sets.go:210-213`) and does not remove its name. The 20-rating gap
between the two requests shows the check works.

## Comment 2026-10-03: the set 566 reading after ticket 535

Ticket 535 closed on 2026-10-03 (fork `890e8e643` and `3613d654f`, main
`c8e5a8be` and `6535ad92`). Each version of a set gear now gets the repair
chosen for its own hit. On the ret-p3-p2 recording
(`corepack pnpm tab-fixtures:record --spec ret --phase 3 --name p2 ...`,
before at fork `72bc102f2`, after at `890e8e643`), set 566's screen pair
went from 0 (reason `exact-zero`) to +7.36 (reason `below-zero`). The set is
still not kept. Ticket 535's close has the full comparison.
