Status: open
Type: bug (test-infrastructure flakiness, not a ranking-logic defect)
Origin: docs/reviews/fix-ticket-257-feral-meta-preference.md — surfaced by a
  `pnpm verify` run during pre-merge review, unrelated to the branch's diff
Blocks: none
Blocked by: none

# `feral-p3` full-sweep tests time out at the default 5000ms, not a code regression

`pnpm verify` on `fix/ticket-257-feral-meta-preference` failed with three
timeouts, all on the `feral-p3` universe (the largest of the three synthetic
rosters — 366 candidate entries, vs. 228 for `feral-p2` and 240-520 for the
`ret-*` universes; counted directly from `data/universes/*.json` during this
review):

- `packages/core/test/synthetic-fixtures.test.ts` — "synthetic roster
  fixture: feral-p3 > replays the recorded full-sweep ranking and clears the
  >=10 above-cutoff floor" — timed out at 5000ms (took 6013ms).
- `packages/core/test/full-sweep-recall.test.ts` — "full-sweep recall —
  'feral-p3' > reproduces the recorded above-cutoff set" and "> ranks every
  above-cutoff row" — each timed out at 5000ms (took 9287ms / 9966ms).

**Confirmed unrelated to this branch's diff:** neither test file appears in
`git diff dev...HEAD --name-only` — this branch only touches
`packages/core/src/candidate-gems.ts` and its own tests. `git log --oneline`
on both files shows their last change was commit `28b00f9` ("Remove racing;
full-sweep every eligible candidate"), well before this branch existed.

**Confirmed to be a timeout, not a real failure:** re-running just the
`feral-p3` cases with a longer timeout, on the same checkout, passes cleanly:

```
pnpm -C packages/core exec vitest run full-sweep-recall.test.ts synthetic-fixtures.test.ts -t "feral-p3" --testTimeout=60000
```

All 6 (2 skipped-elsewhere-counted, 6 feral-p3-specific) pass; individual
sub-tests took 3.7s-7.3s — close to, and on this run above, the 5000ms
default `testTimeout` (no override is set anywhere in `vitest.config.ts` or
the test files themselves). This reads as ordinary machine-speed variance on
the largest of the three synthetic universes, not a logic defect: the same
run on `ret` and `feral` (smaller universes) passed comfortably inside 5000ms.

## Why this matters for the gate

`pnpm verify` is the enforced pre-push/pre-merge gate (`AGENTS.md` § Gates).
A flaky timeout on an unrelated, larger universe can fail an otherwise-green
branch's gate on a slower machine or a busier CI runner, with no code change
responsible. This will recur on any branch until it's fixed, independent of
what that branch touches.

## Options (not decided here)

1. Raise `testTimeout` for these two describe blocks (or globally) to a value
   with headroom above the observed 3.7-9.9s range.
2. Investigate whether `feral-p3`'s full-sweep is doing more work than
   necessary (366 candidates run to completion within one test) and whether
   the sweep can be scoped or the offline sim mocked/faster for this test's
   purpose specifically.
3. Leave as-is if this is a one-off measured only on this machine — but that
   needs a second data point (e.g. a real CI run) before being ruled
   negligible; this review did not have access to CI history to check.

## Acceptance criteria

- [ ] Root cause identified (machine variance vs. a genuine performance
      regression in the full-sweep path).
- [ ] Fix applied (timeout raised, and/or performance addressed) so
      `pnpm verify` is stably green for `feral-p3` on a normal developer
      machine.
- [ ] `pnpm verify` green, confirmed on at least two consecutive runs.
