Status: open
Type: defect
Origin: investigation on feat/tab-signoff-followups, 2026-10-02 (no review round); first noticed as plan-review finding F6 in `.scratch/stage-gate/upgrades-tab-closeout/round-2/plan-review.md:12`
Blocks: none
Blocked by: none
Related: 534, 523, 467

# The Upgrades tab hides a lost set bonus on non-set rows

## What is wrong

A non-set item that replaces a worn set piece breaks that set's bonus. The
row's DPS figure already includes the loss: the engine sims the candidate
on the player's gear and subtracts the baseline
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts:1397`,
`const deltaDps = candObs.dps - candBaselineDps;`). The tab shows no
popover and no note for the break, so the player sees a low or negative
figure with no reason.

## Why the tab shows nothing

- `applySetContext` (`rank.ts:3337`) skips items with no set id, so a
  non-set row never gets a `setContext`.
- The tab's set line returns nothing when `setContext` is missing
  (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:3389-3390`,
  `if (!ctx) return { line: null, tip: null };`).
- The engine does write a note for these rows, `setBonusNote`, for example
  "breaks 2-piece Malorne Harness (below 2)" (`rank.ts:1398`, `rank.ts:1426`,
  `rank.ts:1491`). The CLI prints it (`packages/core/src/cli.ts:424-425`)
  and the HTML report prints it (`packages/core/src/rank-report.ts:390-391`).
  The tab has never read it:
  `git -C vendor/tbc-new-fork log -S setBonusNote -- ui/core/components/individual_sim_ui/upgrades_tab.tsx`
  finds no commit.

## Evidence

- `data/tab-fixtures/feral-p3-p2bis.json`: 29 of 29 non-set shoulder and
  chest rows have no `setContext` and all carry a `setBonusNote`. Examples:
  30055 Shoulderpads of the Stranger at −87.97 and 30905 Midnight Chestguard
  at −96.60, both "breaks 2-piece Malorne Harness (below 2)". All of them
  are below the cutoff in that fixture.
- Every committed feral tab fixture has the same pattern: 39/39 in
  `feral-p2-malorne4.json`, 61/61 in `feral-p3-nordrassil4.json`, 29/29 in
  `feral-p3-p2bis.json`, 32/32 in `feral-p3-th-hands-legs.json`.
- A row above the cutoff is affected: in `data/tab-fixtures/feral-p2-malorne4.json`,
  29995 Leggings of Murderous Intent is rank 4 at +14.98, with
  `setBonusNote` "breaks 4-piece Malorne Harness (below 4)" and no
  `setContext`. That fixture's `ranking.brokenSetValues` prices the
  Malorne 4pc at 22.86 DPS. The tab shows nothing about the break.
- Hypothesis, untested: the stat-only part of 30055 is about +8.3 and of
  30905 about −0.3. This is inferred; the fixture has no stat-only sim.

## Not a deliberate choice

No ADR or ticket rules that non-set rows should hide a break. The gap was
noticed once, as plan-review finding F6
(`.scratch/stage-gate/upgrades-tab-closeout/round-2/plan-review.md:12`),
and no ticket was filed. Ticket 523 lines 86-89 say non-set rows "can
still show a fixed 'breaks 4-piece ...' note". That is true for the CLI and
the HTML report, not for the tab.

## What would close this

1. A non-set row that breaks a worn bonus shows a "Breaks <set> <n>pc"
   line in the tab, with the value of that bonus on current gear. The line
   matches the break line that set rows show for their own break.
2. The row's DPS figure does not change.
3. Verified on a recorded fixture render that includes the 29995 Leggings
   of Murderous Intent row from `feral-p2-malorne4.json`, with a
   gate-visual judgement.

The line shows what the bonus is worth when it is lost on current gear,
the same as a set row's own Breaks line.
