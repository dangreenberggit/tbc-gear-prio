Status: open
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2, Gate C (executor flag, 2026-09-24)
Blocks: none
Blocked by: none
Related: 467, 478

# At worn Thunderheart 1 there is no 4pc future line and ON equals OFF

At worn Thunderheart 1 (hands only), the Thunderheart rows show "activates 2pc
(included in this number)" and a full-set end state, but no 4pc future line.
Their ON figure equals OFF (Thunderheart Pauldrons +112.3 in both). At worn 0
the same rows show a 4pc future of +93.8, so a 4pc near zero at worn 1 is
suspicious.

**Hypothesis, untested:** the 4pc net is at or below the noise floor (about
5.09 DPS for feral) because of the 2pc self-confound. At worn 1 the 2pc
package needs one piece and is `unmeasurable-at-this-worn-count`, so no raw
2pc is subtracted from the 4pc, and each single in the 4pc package already
includes the 2pc. That may push the raw 4pc toward B4 − 2·B2 and under the
floor. This has not been checked against the engine's output.

## Evidence

- Captures (gitignored) in `.scratch/stage-gate/upgrades-tab-closeout/round-2/`:
  `feral-worn1-tip-Thunderheart-{off,on}.png`, `feral-worn1-table-{off,on}.png`,
  rows in `feral-worn1.json`. Compare `feral-worn0-tip-Thunderheart-on.png`
  (2pc +92.9, 4pc +93.8).
- Visual handoff `.scratch/handoffs/visual-review-467-round-2.md`, section
  "Per-capture verdicts" (worn 1 row).
- Fork `371da7dce972ea8bf6267daadf9f20627f7e58bb`, feralcat, 3000 iterations,
  baseline 2501.5 DPS. Gear: Thunderheart hands; shoulders Shoulderpads of the
  Stranger; chest Bloodsea Brigand's Vest; legs Leggings of Murderous Intent.
- The engine sets `selfConfound` in `rank.ts` `buildSetBonuses` for exactly
  this case. How `applySetContext` and the tab treat it was not read.

## What would close this

1. A fixture in `packages/core/test/fork-set-net.test.ts` (controlled model,
   worn 1 of a 2/4 set), or a recorded measurement of `setBonuses` 676:4
   (`bonusDps`, `bonusDpsNet`, `selfConfound`) on the worn-1 state, that
   settles whether the missing 4pc line is correct.
2. If it is wrong: the fix, re-pin, `pnpm verify` rc=0. If it is right: a
   comment here with the numbers, then close.
