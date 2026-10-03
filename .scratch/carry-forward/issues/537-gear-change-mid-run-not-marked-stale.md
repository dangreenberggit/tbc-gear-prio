Status: closed
Type: defect
Origin: independent review of ticket 536 on feat/tab-signoff-followups, finding F4 (relayed by the orchestrator), 2026-10-03
Blocks: none
Blocked by: none
Related: 536, 465

# A gear change during a run may leave the result marked fresh

## What was found

The Upgrades tab marks a shown result stale when the page gear, talents
or other run inputs change. Its gear and talents listener, `markStale`,
acts only when the state is `done`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
lines 1566-1569 at fork `cdb423505`). The `settingsChangedEmitter`
listener has the same `done` check (about line 1605). A run that
completes always writes `stale: false` (line 2024).

The engine reads the page gear once, at the start of a run
(`PlayerGearSource.readGear`, called at `upgrades/engine/rank.ts:807`).
So, hypothesis, untested: if the gear changes while the state is
`running`, no listener records it, and the finished result shows as
fresh although it was measured on the old gear. The Simulate button may
then stay disabled until another change (ticket 465 re-enables it only
through staleness); that part is also untested.

Found by reading the code. Nobody ran the tab to file this.

## What would close this

1. First, show the defect: a red test, or a live repro on `:5173` that
   changes an item while a run is in progress and records that the
   finished result has no stale banner. If neither shows it, close this
   ticket as explained, with the evidence.
2. If it reproduces: a change to gear, talents or run settings during a
   run makes the finished result show as stale, and the test or repro
   from item 1 now passes.

## Closed 2026-10-03

Reproduced live before the fix
(`.scratch/stage-gate/537-stale-mid-run/notes.md`, gitignored) and fixed.
An independent reviewer passed the work with no fixes (reported by the
reviewer, relayed by the orchestrator; the review is not committed).

Fork commit (`dangreenberggit/tbc-new`, branch `feat/upgrades-tab`, not
pushed): `72bc102f2`. The new `upgrades/run_staleness.ts` holds
`RunStaleness`. The tab's four stale setters now all call one helper,
`markInputsChanged`. A change while the state is `running` sets a flag
that `run()` clears at start and writes as the finished state's `stale`.
Main commit: `3c7c700d` (re-pin to `72bc102f2`, and the test
`packages/core/test/fork-run-staleness.test.ts`).

Evidence:

- Red/green: `npx vitest run packages/core/test/fork-run-staleness.test.ts`
  failed 2 of 6 against an unchanged extraction of the old logic (the
  mid-run change and the stopped result) and passed 6 of 6 after the fix.
  The four tests that pass on both were shown to fail under two deliberate
  breaks: no reset in `runStarted`, and `staleAtFinish` always `true`.
- The reviewer killed 7 mutants (reported by the reviewer; the mutant list
  is not committed).
- Fork-gated suites (`npx vitest run` over the eleven files
  `grep -l forkPresent packages/core/test/*.test.ts` lists): 154 passed,
  1 skipped, rc=0. `pnpm verify` rc=0.
- Live, 4 cases on `:5173` (feral, Upgrades phase 2, "Sim only selected set
  items", 20000 iterations): a waist change mid-run leaves the stale line
  shown and Simulate enabled after the run; no change shows no stale line
  and leaves Simulate disabled; the same pair with Stop shows the stale line
  on the stopped result only after the mid-run change.
- The reviewer's 6 live cases also passed, including the cached replay and
  the Stop cases (reported by the reviewer; the case details are not
  committed).

Scope extension: a stopped result now also goes stale after a later
change, the same as `done`. Before this, a stopped result never showed the
stale line.

Known limits:

- The tests cover only the `RunStaleness` tracker, not the tab's wiring.
  The live checks cover the wiring.
- The Sources picker and the set chips call `markInputsChanged` twice, once
  through `settingsChangedEmitter` and once directly. The second call costs
  one extra render. It is harmless and not a regression: the old code made
  the same two calls.

Open question: the first live attempt was lost when the page navigated to
`http://localhost:5173/tbc/` mid-run, after an Escape key press closed the
item picker. The reviewer found no Escape path that navigates, and its live
test did not reproduce the jump. The cause is unknown.
