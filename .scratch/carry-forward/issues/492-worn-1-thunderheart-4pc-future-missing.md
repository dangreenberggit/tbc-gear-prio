Status: closed
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

## Comments

- 2026-09-24 (round 2b, Step 7): live worn-1 check (feralcat, phase 3,
  constructed: Thunderheart Gauntlets only, 3000 iterations, baseline
  2501.5 DPS, "Took 171s", fork f6355d529): the 1→2 Thunderheart rows now
  show "4pc (1/4): +108.1" and ON = OFF + 108.1 (Pauldrons +112.3 →
  +220.3). Before the fix the line was hidden. The SME judged +108.1
  plausible (high side) against round 2's worn-0 4pc of +93.8, and far from
  the confounded 2·92.9 + 93.8 = 279.6. One run at 3000 iterations.
- 2026-09-24 (round 2b, Step 8): **closed.** It was a bug, not a correct
  absence: at worn 1 the 2pc package is one piece and never measured, and
  every single of the 4pc package crosses the 2pc, so raw4 = B4 − (n−1)·B2.
  Fixture 492-F (worn Thunderheart hands; model B2 50, B4 80) read
  `bonusDps` −20, `selfConfound {threshold 2}` without `dps`, credit 0 and
  6 sims on 371da7dce. Fix (fork `7b7f2da281dd9ddc00faa4c216ff539ca40b2fe6`,
  re-pinned in main `f72f1a6b`, tip pin `cf51f4f4`): the first two
  break-free added pieces in slot order (head 31039 + chest 31042) are simmed
  together, B2 = Σ singles − pair delta = 300 − 250 = 50, the 4pc gains
  (n−1)·B2 = 100 → 80, `selfConfound.dps` = 50, full 80, split 20, 7 sims
  (one extra). Parity: the E-W3 pool never reaches a measured 4pc at worn 1.
  `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts; echo rc=$?` → rc=0; `pnpm verify` rc=0; layout gate measured, failed 0,
  a11yFailed 0. Live worn-1 value +108.1 (Step 7 comment above).
