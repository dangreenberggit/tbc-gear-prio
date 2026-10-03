Status: open
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
