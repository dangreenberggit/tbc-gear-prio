Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: task
Origin: .scratch/stage-gate/tab-view-filter/execution-report.md (K0+K1 notes; stage-gate run, no review file)
Blocks: none
Blocked by: none
Related: 590

# The lazy-load guard test times out in a full run of the tab's tests

The fork test `ui/features/upgrades/lazy_load.test.ts`, case "is imported
statically by no production file outside its folder", has failed twice
with vitest's 5 s test timeout during a full run of the tab's tests, and
has passed every time it was run alone:

- 2026-10-12, fork `9b9b052cb` (branch `feat/tab-view-filter`): timed out
  at 22475 ms in the full run; passed 10/10 alone and on the next full run.
- 2026-10-15, fork `0c127a767` (same branch): timed out at 20101 ms in the
  full run (1 failed, 488 passed); passed alone (10 tests, 443 ms).

Re-run, from the main repo root with Node 22 on PATH:

    corepack pnpm -C vendor/tbc-new-fork exec vitest run ui/features/upgrades
    corepack pnpm -C vendor/tbc-new-fork exec vitest run ui/features/upgrades/lazy_load.test.ts

The case reads every `.ts`/`.tsx` file under `ui/` synchronously
(`sourceFiles`, `readFileSync`). That the run is slow only because the
other test files compete for the disk and CPU at the same time is a
hypothesis, untested. Ticket 590 (closed) fixed other timeouts in these
tests, not this one.

Done when: the full command above passes five times in a row on this
machine, with the guard still failing on a planted static import from
outside the feature folder.

## Comments
