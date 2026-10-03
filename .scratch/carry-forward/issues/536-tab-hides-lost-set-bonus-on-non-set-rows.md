Status: closed
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

## Closed 2026-10-03

Plan: `.scratch/stage-gate/536-non-set-breaks/plan.md`, with its ledger in
`progress.md` beside it (both gitignored, so a fresh checkout does not have
them). An independent reviewer passed the work with no inline fixes before
this close.

Fork commit (`dangreenberggit/tbc-new`, branch `feat/upgrades-tab`, not
pushed):

- `cdb423505` Show set breaks on rows with no set context (536).
  `engine/view.ts` gains `singleSwapBreaks`: the worn bonuses one row's own
  swap breaks, from `set-value.ts`'s `brokenSetBonuses` over the gear the
  run read, counting a lost count only when the ranking's `brokenSetValues`
  has it, and valued from there. `PlayerGearSource` keeps the ids it gave
  the engine (`lastItemIds`); the tab keeps them in its `done` state (a
  fixture load reads the page gear the fixture set), and a row with no
  `setContext` shows the receipt set rows use. The `view.ts` PROVENANCE row
  moves. `rank.ts` and the ranking output do not change.

Main commits: `ab6725e2` Re-pin fork to cdb423505 for ticket 536 (the lock,
`data/sim-implemented-effects.json` `forkCommit` only, the tests and the
derivations), and `51439369` Add ticket 536 visual review.

Tests:

- `packages/core/test/fork-set-net.test.ts`, 536-A to 536-K, on
  `singleSwapBreaks` directly. Each of A, B, C, D, E and J was run red for
  its stated reason before its code existed; F, G, H, I and K passed on
  their first run, because earlier slices' code already covered them.
  Command: `npx vitest run packages/core/test/fork-set-net.test.ts -t "536"`,
  rc=0, 11 passed.
- `packages/core/test/fork-set-fixtures.test.ts`, 536-X: on every row of the
  five committed fixtures, the rule gives each set row's own `singleBreaks`
  and each non-set row's `setBonusNote` breaks. Command:
  `npx vitest run packages/core/test/fork-set-fixtures.test.ts -t "536"`,
  rc=0. Derivations: `docs/set-bonus-fixture-derivations.md` § "Ticket 536".

Checks, Node v22.17.1: `npx vitest run packages/core/test/wowsims-fork-parity.test.ts`
rc=0 (E-W3) before the hash moved; the fork-gated suites (the ten files
`grep -l forkPresent packages/core/test/*.test.ts` lists) rc=0, 147 passed,
1 skipped; `python scripts/check_engine_port_drift.py` rc=0;
`python scripts/check_fork_lint.py` rc=0; `pnpm verify` rc=0;
`pnpm merge-to-dev --check-only` rc=0.

**Visual.** `pnpm tab-review` on `feral-p2-malorne4` at `cdb423505`
(`forkDirty` false), judged by a gate-visual seat: **pass**
(`.scratch/handoffs/visual-review-536-non-set-breaks.md`). Row 29995 reads
"Item stats +37.9", "Breaks Malorne Harness 4pc -22.9", "Total +15.0" with
Set potential off and on; row 30055 "+12.9", "-22.9", "-10.0"; set row
30222 is unchanged at "+5.5", "-22.9", "-17.4". So close items 1 to 3 hold.

**Live.** Feral page at phase 2, "Phase 1" preset "Alt 6%", tab defaults,
on `:5173` with the `:3333` backend (run 132 s). Row 29995 showed "+16.2"
with "set detail", and its popover "Item stats +38.9", "Breaks Malorne
Harness 4pc -22.7", "Total +16.2". After the neck was changed and the
stale banner showed, the same row showed the same three lines.

**The independent review's evidence** (as relayed by the orchestrator,
2026-10-03):

- Mutation check: removing each guard in `singleSwapBreaks` makes a test
  fail, except the `completingSetId` argument, which has no effect on a
  non-set row.
- 536-X compares real break rows, not zero: 61, 29, 32 and 39 break rows
  on the four feral fixtures.
- R5 holds: a set row's popover path is unchanged apart from putting the
  full-`SetContext` calls behind `row.setContext`.
- The visual pass is sound on the popover captures and facts. The row
  clips show the tab's nav bar instead of the row, a capture-script fault
  (`docs/agents/known-traps.md`), so the DPS cell rests on the DOM facts.

**Ticket 534.** The owner's ruling, verbatim: "534: no change". The Breaks
line here therefore shows the bonus's value on current gear, as set rows
do.
