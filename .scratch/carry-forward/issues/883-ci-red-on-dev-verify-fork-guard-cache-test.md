Status: open
Type: task
Origin: docs/reviews/feat-instruction-pointer-check.md
Blocks: none
Blocked by: none

# CI is red on `dev`: the verify cache test expects "could not compute" and gets "this is CI"

**Problem.** Every GitHub CI run of `pnpm verify` on `dev` since
`feat/876-verify-cache` merged fails at one test:
`scripts/verify_fork_guard.test.mjs` "run_verify.mjs consults the pass
cache, and runs in full when it has no key" (line 196). It expects stdout
to contain `verify: cache off -- could not compute the inputs key`. On CI
it gets `verify: cache off -- this is CI; running in full.`, because
`cachePolicy()` in `scripts/verify_cache.mjs` (line 441) turns the cache
off when `GITHUB_ACTIONS` or `CI` is set, before the driver tries to
compute a key. Locally neither is set, so the test passes there.

Seen in CI run 43525425570 (branch `feat/instruction-pointer-check`):
`gh run view 43525425570 --log-failed` prints
`AssertionError: expected 'verify: cache off -- this is CI; runn…' to contain 'verify: cache off -- could not comput…'`
at `scripts/verify_fork_guard.test.mjs:198`. The review file names run
43494768611 on `dev` as the same failure (not rechecked here).

**What it hides.** Verify stops at that step, so every later step never
runs on CI. In particular `pointers:selftest` (the instruction-pointer
check's self-test, merged in `45851f62`) has never run on CI, and whether
the runner's Python can run it is unverified.

**Source.** `docs/reviews/feat-instruction-pointer-check.md` § CI without
`~/.claude`; `.scratch/agent-reports/2026-11-13-general-task-pointer-check-pre-merge-review.md`
§ Not done or not checked (gitignored, main checkout).

**Fix.** Make the test independent of the CI environment: run the
driver with `GITHUB_ACTIONS` and `CI` removed from its env, so it tests
the no-key path it names. Optionally add a second case that sets
`CI=1` and expects `this is CI`. Done when a CI run on `dev` gets past
`scripts/verify_fork_guard.test.mjs` and runs `pointers:selftest`.
