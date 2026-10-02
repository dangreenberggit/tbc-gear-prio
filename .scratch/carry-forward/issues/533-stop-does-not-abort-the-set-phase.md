Status: open
Type: defect
Origin: pre-merge review round 10 of feat/tab-signoff-followups, finding A4 (`docs/reviews/feat-tab-signoff-followups.md`), 2026-10-02
Blocks: none
Blocked by: none
Related: 511, 512, 526, 347

# Stop does nothing while the set phase runs

## What was found

The Upgrades tab's Stop button only calls `abortController.abort()`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
about lines 1485-1487, at fork `f09d218e`). In the fork engine's
`upgrades/engine/rank.ts`, `signal` is read before `buildSetBonuses`
(about line 1636) and not after it. None of the set-phase sims that
tickets 511 and 512 added checks it: the worn-set ladder, the set screen,
the same-gear gates, the crossing gates, the step-gear sims and the
bonus-off sims.

So a Stop pressed during the set phase waits for that phase to finish
and then gets a complete ranking. How long the wait is on a real run is a
hypothesis, untested. The set phase runs many sims per set, and a full
feral run takes about nine minutes.

Found by reading the code (review finding A4). Nobody ran the tab to
file this.

## What would close this

1. Every set-phase sim loop in `rank.ts`, `set-screen.ts` and
   `set-less-copies.ts` checks `signal` (or passes it to the sim seam), and
   an aborted set phase returns the same aborted result as an aborted
   candidate loop.
2. A test in `packages/core/test/fork-set-net.test.ts` aborts during the
   set phase and asserts that no further set sims are dispatched.
   Command: `npx vitest run packages/core/test/fork-set-net.test.ts; echo rc=$?`
   (the suite is fork-gated, so CI skips it).
3. The engine change follows the PROVENANCE cycle in
   `docs/agents/known-traps.md` § Before editing a ported engine file.
