Status: open
Type: bug
Origin: pre-merge review feat/tab-wowsims-items, round 2 R2-1
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on

# `fork-tests:check` skips the tab's load-failure test

`scripts/check_fork_tests.py` `TEST_PATHS` (lines 46-50) runs
`ui/features/upgrades` and two fork-added tab-body tests, and its docstring
(line 13) says "the two tab-body tests the fork adds". The fork adds a third,
`ui/app/tabs/UpgradesTabBody.load.test.tsx`
(`git -C vendor/tbc-new-fork diff --name-status e804c29e8 527c0d798 -- ui/app/tabs/`).
A break in the tab's "code failed to load" handling therefore passes
`pnpm verify`. The test passes when run alone (round 2 check). No gate ran it
before this branch either.

## Done means

`TEST_PATHS` includes the load test (or every fork-added
`ui/app/tabs/*.test.tsx`), the docstring count is right, and
`pnpm fork-tests:check` passes.
