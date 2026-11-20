# Ticket 886: the set screen's rule scored again, and the stored recordings

These scripts and their printed output are the evidence for ticket 886's
close (`.scratch/carry-forward/issues/886-set-screen-may-count-a-sets-own-bonus-two-or-three-times.md`).
Each `.out` file is what its script printed on 2026-11-20.

- `rescore_886.py` scores the set screen's rule family again, as K5E did,
  with the set's own bonus at w + 1 taken out of the estimate once per added
  piece. It loads K5E's scorer and data, which are gitignored and live only
  in the main checkout:

  ```sh
  python3 -I .scratch/set-bonus-value/886-rescore/rescore_886.py /home/daniel/Code/lulz/tbc-gear-prio/.scratch/stage-gate/511-512-set-credit/k5e/score_screen.py
  ```

  It takes the w + 1 bonus from K5E's recorded ladder (rung w + 1 minus rung
  w, at N = 1000) for every set worn at 1 or more. The engine subtracts only
  when a crossing check ran, that is when w + 1 has a bonus; where it has
  none, the recorded difference is 0.0, so the two agree on these 11
  characters. Result (`rescore_886.out`): the tab's rule keeps the same sets
  on every character, and C203's four checks give the same numbers. The
  count of passing rules in the family goes from 117 to 116, and `choose`
  now picks the tab's rule (it picked M2 N=10 K=1 c=3 before); the tab's
  rule came from ruling C205, not from `choose`.
- `fixtures_886.py` lists, in each stored tab recording, the on-mode screen
  sets worn at 1 or more and their crossing check:
  `python3 -I .scratch/set-bonus-value/886-rescore/fixtures_886.py packages/core/test/fixtures/tab-recordings`.
- `ret629_886.py` recomputes ret-p3-p2's Crystalforge (set 629) screen
  reading from the stored rows, checks it against the stored `bestStats`, and
  applies the fix:
  `python3 -I .scratch/set-bonus-value/886-rescore/ret629_886.py packages/core/test/fixtures/tab-recordings/ret-p3-p2.json 629`.
  The fixed measure is -18.9 and measure + 2 sigma is 0.71, so the set stays
  ranked and in the top 2. The recording itself still stores the old
  measure (-16.74); recordings are not re-recorded for this, and nothing
  reads that value back.
- `886-red.txt` is the output of tests 886-W1 and 886-W3 before the fix
  (both "expected 3 to be close to +0").
