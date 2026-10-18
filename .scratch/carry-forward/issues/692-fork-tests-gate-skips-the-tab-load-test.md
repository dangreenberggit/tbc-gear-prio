Status: open
Type: bug
Origin: pre-merge review feat/tab-wowsims-items, round 2 R2-1 and R2-3
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on
Related: 683

# `fork-tests:check` skips the tab's load-failure test and can time out

## A test the gate does not run (R2-1)

`scripts/check_fork_tests.py` `TEST_PATHS` (lines 46-50) runs
`ui/features/upgrades` and two fork-added tab-body tests, and its docstring
(line 13) says "the two tab-body tests the fork adds". The fork adds a third,
`ui/app/tabs/UpgradesTabBody.load.test.tsx`
(`git -C vendor/tbc-new-fork diff --name-status e804c29e8 527c0d798 -- ui/app/tabs/`).
A break in the tab's "code failed to load" handling therefore passes
`pnpm verify`. The test passes when run alone (round 2 check). No gate ran it
before this branch either.

## A timeout under verify (R2-3)

On 2026-10-18 at main `7c35e76a` (fork `527c0d798`), one full
`pnpm verify` failed in this step: `ui/features/upgrades/lazy_load.test.ts`
"is imported statically by no production file outside its folder" took
13178 ms against vitest's 5000 ms default and timed out. The next
`pnpm verify` on the same tip passed (`gates: 1545 ran, 0 skipped`), and two
runs of `python scripts/check_fork_tests.py` alone passed. The gate was added
on this branch (review A2), so this intermittent red verify is new with it.

## Done means

- `TEST_PATHS` includes the load test (or every fork-added
  `ui/app/tabs/*.test.tsx`), and the docstring count is right.
- The step does not fail on a slow machine: for example the script passes a
  longer `--testTimeout`, with the reason in a comment, and three full
  `pnpm verify` runs in a row pass.
