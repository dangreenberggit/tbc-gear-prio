# Review: fix/883-ci-verify-cache-test

Range: `dev` 02f696ef to the branch tip. One file:
`scripts/verify_fork_guard.test.mjs`. It answers ticket 883 (CI red on
`dev`). The owner approved "Fix the red CI on dev" on 2026-11-20.

## Verdict on 883: the test was wrong, not the code

`cachePolicy()` in `scripts/verify_cache.mjs:441` turns the pass cache off
when `GITHUB_ACTIONS` is `true` or `CI` is set. That is on purpose: the
GitHub Actions verify is the backstop with no bypass (`docs/workflow.md`
§ Gates), and a cache that skipped steps there would undo it. The test
helper `runDriver` already deleted `GITHUB_ACTIONS` from the driver's env
but not `CI`, and GitHub's runner sets both. So on CI the "no key" case
reached the CI branch first and printed "this is CI".

The fix deletes `CI` too, then applies the case's own env, so a case can
set `CI` on purpose. A new case checks that with `CI=true` the driver
prints `verify: cache off -- this is CI; running in full.` and runs the
step. That branch had no test before.

## Review

One fresh reviewer (Opus `general-task`), read-only, 2026-11-20. No
findings. It checked that the `forkGuard` and `skipGuard` unit cases build
their own env and are untouched, that the `OPT_OUT` handling is unchanged,
and that no existing case passes `CI` or `GITHUB_ACTIONS`.

## Checks

Red before the fix (in the pair, file unchanged from `dev`):

```
CI=true pnpm exec vitest run scripts/verify_fork_guard.test.mjs
AssertionError: expected 'verify: cache off -- this is CI; runn…' to contain 'verify: cache off -- could not comput…'
Tests  1 failed | 15 passed (16)   rc=1
```

The reviewer saw the same failure on `dev` with
`GITHUB_ACTIONS=true CI=true`.

Green after (node v22.23.2):

```
pnpm exec vitest run scripts/verify_fork_guard.test.mjs                        Tests 17 passed (17)  rc=0
CI=true pnpm exec vitest run scripts/verify_fork_guard.test.mjs                Tests 17 passed (17)  rc=0
GITHUB_ACTIONS=true CI=true pnpm exec vitest run scripts/verify_fork_guard.test.mjs  Tests 17 passed (17)  rc=0
```

The reviewer also ran `scripts/verify_cache.test.mjs` and
`scripts/vitest_json_reporter.test.mjs` under `GITHUB_ACTIONS=true CI=true`:
78 passed, rc=0.

## Notes

- Ticket 883 is done only when a CI run on `dev` gets past this file and
  runs `pointers:selftest`. That needs a real CI run after the merge; the
  ticket is closed on `dev` with that run's id.
- A local run cannot stand in for CI: the pair has the fork and CI does not.

## Disposition

| ID  | Axis | Disposition | Ticket / note |
| --- | ---- | ----------- | ------------- |
