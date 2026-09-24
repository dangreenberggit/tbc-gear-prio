Status: open
Type: bug
Origin: SME seat, stage-gate upgrades-tab-closeout round 2b Step 7 (finding C1, 2026-09-24)
Blocks: none
Blocked by: none
Related: 467, 490, 492

# Malorne and Nordrassil 4pc values vary with the worn Thunderheart count

The same 4pc bonus measures very differently depending on which
Thunderheart pieces are worn, although neither bonus depends on
Thunderheart (per `item_sets.go`, as the SME read it):

- Nordrassil 4pc (Shred +75): +44.8, +60.5, hidden, +63.0, +65.2 at worn
  Thunderheart 0 to 4.
- Malorne 4pc (+30 Strength in Cat Form): +9.5, +19.7, hidden, +69.5 at
  worn 0 to 3. +69.5 is too large for +30 Strength.

**Hypothesis, untested:** the worn-2 and worn-3 measurements still include
part of the Thunderheart 2pc loss (an inflation term the net correction
misses when the package breaks a worn set).

At worn Thunderheart 2 the ON figures do not depend on these values (the
SME checked the highest value measured), so this is minor there. It is
major in any state where a break is smaller than the true 4pc.

Evidence: SME handoff
`.scratch/handoffs/sme-rank-judgment-490-per-future-breaks.md`; captures in
`.scratch/stage-gate/upgrades-tab-closeout/round-2/` and `round-2b/`
(gitignored).

## What would close this

1. A controlled fixture in `packages/core/test/fork-set-net.test.ts` that
   reproduces the variation, or shows it is sim noise.
2. The engine fix if it is a bug, with the PROVENANCE cycle and re-pin.
