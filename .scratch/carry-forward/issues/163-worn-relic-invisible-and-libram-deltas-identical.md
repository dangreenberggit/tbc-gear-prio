Status: open
Type: bug
Origin: .scratch/handoffs/sme-rank-judgment-ret-p3-real-ranking.md (SME review of the real ret-p3 ranking, feat/ret-p3-data @ 2b3bf56)
Blocks: none
Blocked by: none

# Worn relic invisible in ranking; libram deltas identical

The real ret-p3 ranking (`.scratch/handoffs/wowsims-tab/ret-p3-ranking/`
on `feat/ret-p3-data`) does not see the character's equipped relic.

## Symptoms (verified against the artifacts)

- `test/fixtures/slamaltman.raw.json` contains item 27484 (Libram of
  Avengement) in the relic slot; the string `27484` appears nowhere in
  `slamaltman-p3.json`. The other 15 worn items all carry `owned: true`
  at delta 0.00. Re-run:

  ```bash
  python -c "import json;print('27484' in open('test/fixtures/slamaltman.raw.json').read(), '27484' in open('.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.json').read())"
  ```

- With the slot registering as empty, all four candidate librams score
  negative, three at an identical -13.81 (Souls Redeemed, Absolute
  Truth, Tome of the Lightbringer; Fervor -14.10). Three different
  proc effects cannot tie to the cent — hypothesis: libram effects are
  not applied by the sim, so deltas are stat-diff only.
- The report's own `plausibilityWarnings` fires (`dead-slot`/`ranged`/
  `unidentified-worn-item`) but attributes it to a stale saved report.

## Why it matters

A ret reading the page sees their whole relic slot in red and concludes
they should unequip their libram. This is the single blocker the SME
review named for plan §9.6's "would a ret trust this?" gate — distinct
from ticket 157 (157 = missing from the candidate *pool*; this = missing
from the *equipped set*, which turns a gap in choices into wrong
answers).

## Done when

The worn relic is recognized like the other 15 worn items (owned row at
0.00 or honest baseline membership), and either libram deltas become
distinct (sim-side effects) or the relic slot is explicitly marked
unmeasured instead of rendered as losses. A diagnosis of where 27484 is
dropped and whether libram effects exist in the pinned sim is the first
step; its findings should be appended here.
