Status: closed
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2, Gate C (executor flag, 2026-09-24)
Blocks: none
Blocked by: none
Related: 477, 467

# "set bonus not counted" ignores an unmeasured commit break

Since 477 (fork `371da7dce972ea8bf6267daadf9f20627f7e58bb`), `view.ts`
`rankableSetPotential` returns 0 when any `commitBreaks` entry lacks `dps`.
The tab's sub-line does not follow. `upgrades_tab.tsx` `setBonusPresentation`
sets `creditUnmeasured` from futures only
(`futureBonuses.some(f => f.dps === undefined)`), so a row whose credit was
zeroed by an unmeasured commit break shows "hover for set detail"
(`upgrades_tab.set_bonus.hover_hint`) instead of "set bonus not counted"
(`upgrades_tab.set_bonus.not_counted`). With 477's branch (b), a commit break
is unmeasured only when its B could not be measured: no neutral candidate, a
sim failure, or `dependent-unmeasured`.

## Evidence

- Found by reading the code, not observed live:
  `grep -n creditUnmeasured vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
  and the commit-break check in `view.ts` `rankableSetPotential` (fixture
  477-P in `packages/core/test/fork-set-net.test.ts`).
- Visual handoff `.scratch/handoffs/visual-review-467-round-2.md`, section
  "Findings": no round-2 capture in
  `.scratch/stage-gate/upgrades-tab-closeout/round-2/` shows the `not_counted`
  line, so the live captures do not exercise it.
- 477's Comments (2026-09-24) record the gap.

## What would close this

1. `creditUnmeasured` is also true when any `commitBreaks` entry lacks `dps`
   in the ON view, matching `rankableSetPotential`.
2. A test or fixture with a commit break without `dps` that shows the
   `not_counted` line.
3. Fork commit, re-pin, `pnpm verify` rc=0, and a real layout gate run.

## Comments

- 2026-09-24 (round 2b, Step 8): **closed.** Fork
  `7b7f2da281dd9ddc00faa4c216ff539ca40b2fe6`, re-pinned in main
  `f72f1a6b` (tip pin `cf51f4f4`). `view.ts` exports
  `setCreditUnmeasured` (true when futures exist and any future value, any
  future path break or any commit break lacks a measured `dps`; false
  without futures) and `setBonusSubLine` (`null` / `"not_counted"` /
  `"hover_hint"`). `rankableSetPotential` zeroes on the first; the tab's
  `setBonusPresentation` renders the key the second returns. Fixtures 491-P
  (true/false/true/false, credit 0) and 491-L (not_counted / hover_hint /
  null / hover_hint) were red on 371da7dce (functions absent) and are
  green: `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts; echo rc=$?` → rc=0. `pnpm verify` rc=0; layout gate measured, failed 0,
  a11yFailed 0. The `not_counted` string is now "uncounted" (493's width
  rule), awaiting owner copy confirmation. **Stated gap for Gate C:** no
  test asserts the rendered `<small>` text; the fork has no DOM test runner
  (its `test:*` scripts are Node CDP scripts). The tab's text is the
  tested function's return value looked up in `translation.json`.
