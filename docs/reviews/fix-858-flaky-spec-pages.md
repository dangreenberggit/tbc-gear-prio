# Pre-merge review — fix/858-flaky-spec-pages

Reviewed range: `e905cb5f3b6fc1dea6fc359f13f49f3af22dfe12..4a9ffce829df06c2e7d633f45333959b14bffc69`

Reviewed range: `4a9ffce829df06c2e7d633f45333959b14bffc69..bc79d746fe3be8502896e1a15177e6d731f08e77`

Dispatch note (round 1): `python scripts/check_merge_ready.py --product-files`
printed three product files: `vitest.config.ts`,
`packages/core/test/fork-run-staleness.test.ts` and
`packages/core/test/fork-sim-database.test.ts`. The axes read those files
only. The other changed files are tickets 858 and 859 and `NEXT` under
`.scratch/carry-forward/issues/` (in `TOOLING_PATHS`); they got
`instruction-review`, recorded below, and the reviewer also read the two
tickets as the spec. Small-change lane: over the product files,
`git diff --shortstat dev...HEAD` gave `3 files changed, 7 insertions(+),
8 deletions(-)`, and `git diff --name-only` listed the three files above,
none under `data/`, `vendor/` or `packages/core/src/` and none with
`.generated.` in its name. So one fresh reviewer (`general-task`, Opus;
`codex` is not on `PATH`) covered the adversarial brief and applied the
`code-review` skill's Standards and Spec checks itself. No domain brief:
the diff holds no TBC, WCL or wowsims facts, only a test-runner timeout
and test hooks. The branch never moves the fork pin
(`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0).

## Adversarial

No defect that makes a check pass when it should fail. The reviewer checked:

- Only the root `vitest.config.ts` has a `test` block, and it has no
  `projects` or workspace, so every test file gets `hookTimeout: 30_000`.
  A probe `beforeAll` that waits 11 s passed under the root config.
- In `@vitest/runner` 3.2.7 (`chunk-hooks.js:2117-2241`) `hookTimeout` is
  the default for every before and after hook, so a hung teardown hook now
  fails after 30 s instead of 10 s; it still fails. The `240_000` at
  `fork-run-progress.test.ts:854` still overrides it.
- The failing run's report (`/tmp/claude-1000/tbc-verify-8rCZUl/vitest-report.json`)
  still exists and matches a forced hook failure (`message: ''`,
  `startTime == endTime`, both tests skipped). The three fork-loading files
  passed 15 of 15 (`node v22.23.2`).

- **A1 (low).** `vitest.config.ts:50`: the 30 s budget makes the failure
  rarer, not impossible. With two full runs at once the hook took up to
  23.2 s (`.scratch/agent-reports/858-evidence/conc.txt` in the pair), so
  three or more runs at once could pass 30 s (hypothesis, untested). Ticket
  858 did not record this limit.

## Domain

Skipped: no domain content (dispatch note).

## Standards + Spec

- **S1.** `vitest.config.ts:49`: "passed 10 s" in a test config reads as
  "the hook succeeded"; it meant "took longer than 10 s".
- **S2.** `vitest.config.ts:46`: "for setup hooks" is too narrow; the
  setting covers `afterEach` and `afterAll` too.
- **P1.** Ticket 858, "Cause:" line: states the hook timeout as fact for
  the original run, whose error text was not kept.
- **P2.** Ticket 858: "the other three fork-loading hooks already had a
  30 s argument each" is wrong; `fork-run-progress.test.ts:854` has 240 s.
- **P3.** Ticket 859's title, "a test file's setup hook", is broader than
  the body's "`beforeAll` inside a `describe`". A file-level hook's error
  reaches the file's `message` (reviewer's reading of `runSuite`; not run).
- **P4.** Ticket 859 "Done when": the example `Hook timed out in 10000ms`
  is out of date after this branch, and "feeds a failed hook through the
  verify path" does not say whether a hand-written JSON report counts.
- **P5.** Ticket 858 "Verified by": the JSON report is one line, so
  `grep -c` prints 0 or 1 and never names the failed file.

## Instruction review (tooling files)

Path: full for ticket 859 (a new open ticket a future worker acts on).
Ticket 858 is closed and `NEXT` is a number; the reviewer read 858 as the
spec (P1, P2, P5).

**Check 1 (cold reader).** One fresh `general-task` (Opus), told it was
the agent handed ticket 859, did a dry run. It would make verify capture
suite-level errors (a custom reporter or a second reporter), print them,
and add a test under `scripts/`; it would leave `hookTimeout` and vitest
alone. That matches the ticket's intent. It found:

- **IR1.** "feeds a failed hook through the verify path" does not say
  that a test feeding a made-up report cannot prove the fix (same as P4).
- **IR2.** "`Hook timed out in 10000ms`" is out of date (same as P4).
- **IR3.** "and the file and line": whether vitest's hook error carries a
  line number is not checked.

**Check 2 (clashes).** Files the ticket names: `scripts/run_verify.mjs`
(lines 145-152 run vitest with only the JSON reporter),
`scripts/verify_summary.mjs` (`formatVitestFailures`),
`node_modules/vitest/dist/chunks/index.VByaPkjc.js:1743`. Both the reviewer
and the cold reader found every claim agrees; the cold reader ran the
repro and got `"message":""`.

**Check 3 (trial run).** Not run: a ticket is a work item and sets no
standing rule for agents, so there is no old and new behaviour to compare.

## Code quality

| ID  | Where                 | Row                                                    |
| --- | --------------------- | ------------------------------------------------------ |
| S1  | `vitest.config.ts:49` | "passed 10 s" reads as success; say "took longer than" |
| S2  | `vitest.config.ts:46` | "for setup hooks" omits teardown hooks                 |

One `glm-flash-task` made both edits in one pass, comment text only:
`96ff770a` "Say the hook budget covers teardown hooks too".

## Focused check (round 2)

Range `4a9ffce8..bc79d746` (`96ff770a`, the code-quality pass for S1 and
S2; `bc79d746`, ticket wording for A1, P1-P5 and IR1-IR3). No fork range:
the branch never moves the fork pin. One fresh `general-task` (Opus) ran
the four checks:

1. **Pass.** `96ff770a` changes only comment lines in
   `vitest.config.ts:46-49` and names S1 and S2; `bc79d746` names its rows
   and edits only tickets 858 and 859 and `map.md`
   (`git log -p 4a9ffce8..bc79d746`).
2. **Pass.** Each edit matches its row. Ticket 858's new facts hold:
   `fork-run-progress.test.ts:854` is 240 s, the two 30 s arguments were on
   `dev`, and the largest value in `858-evidence/conc.txt` is 23228 ms.
3. **Pass.** No new tests. Ticket 858's new `node -e` command, run on
   `858-evidence/short-hook.json`, lists `fork-spec-pages.test.ts`.
4. **Pass.** `vitest run` of `fork-spec-pages`, `fork-run-staleness` and
   `fork-sim-database` on node v22.23.2: rc=0, 15 of 15 tests.

Findings, both wording in ticket 859 (bookkeeping):

- **R2-1.** The rewritten "Done when" asked to keep the fixture out of the
  suite through `exclude` in `vitest.config.ts` and also to run it the way
  `scripts/run_verify.mjs` does, with that config. A probe showed vitest
  then finds no test file, even with the path on the command line.
- **R2-2.** The title, "What happens" and "Done when" named three
  different scopes of failing hook.

Fixed by shortening the text, not adding to it, in `8803b237` "Make ticket
859 name one kind of failing hook": "Done when" no longer says how the
fixture is kept out of the suite, and the title, "Done when" and the map
line all say "a `beforeAll` inside a `describe`". A bookkeeping fix starts
no round.

## Summary

Round 1 (small-change lane, one reviewer) found no defect in the fix:
`hookTimeout: 30_000` in the root `vitest.config.ts` reaches every test
file, and the three fork-loading files pass. Its findings were two unclear
lines in the new config comment (fixed in the code-quality pass) and
wording in tickets 858 and 859 (fixed). A1, the 30 s margin under three or
more concurrent full runs, is `wontfix`: it is the same budget the repo
gives tests, and ticket 858 now records the limit as a hypothesis. Round 2
passed all four checks and found two more wording problems in ticket 859,
fixed in `8803b237`.

Nothing blocks the merge. Open ticket from this branch: 859 (`pnpm verify`
prints no error text when a `beforeAll` inside a `describe` fails).

Tickets: filed 2, closed 1 (`git diff --name-status dev...HEAD` over the
ticket path shows 858 and 859 added; the `Status: closed` count is 1).
Filed is higher than closed because 859 is a new open bug found while
fixing 858.

## Disposition

| ID  | Axis               | Disposition | Ticket / note                                                                                                                                                                               |
| --- | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial        | wontfix     | 30 s is the budget the repo already gives tests under load (`testTimeout` comment in `vitest.config.ts`); a hang still fails. Ticket 858 now records the limit as a hypothesis (`bc79d746`) |
| S1  | Standards          | fixed       | comment says "took longer than 10 s" (`96ff770a`)                                                                                                                                           |
| S2  | Standards          | fixed       | comment says "every hook, setup and teardown" (`96ff770a`)                                                                                                                                  |
| P1  | Spec               | fixed       | ticket 858 says "Cause, most likely" and why (`bc79d746`)                                                                                                                                   |
| P2  | Spec               | fixed       | ticket 858 names the two 30 s hooks and the 240 s one (`bc79d746`)                                                                                                                          |
| P3  | Spec               | fixed       | ticket 859 title says "describe-level setup hook" (`bc79d746`)                                                                                                                              |
| P4  | Spec               | fixed       | ticket 859 "Done when" rewritten: 30000ms example, a real fixture run, a hand-written report does not count (`bc79d746`)                                                                    |
| P5  | Spec               | fixed       | ticket 858's verify command prints each report's failed files with `node -e` (`bc79d746`)                                                                                                   |
| IR1 | Instruction review | fixed       | as P4 (`bc79d746`)                                                                                                                                                                          |
| IR2 | Instruction review | fixed       | as P4 (`bc79d746`)                                                                                                                                                                          |
| IR3 | Instruction review | fixed       | "Done when" now asks for the error text under the file's path, not a line number (`bc79d746`)                                                                                               |

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                        |
| ---- | ------------- | ----------- | ------------------------------------------------------------------------------------ |
| R2-1 | Focused check | fixed       | ticket 859 "Done when" no longer names a way to keep the fixture out (`8803b237`)    |
| R2-2 | Focused check | fixed       | title, "Done when" and map line say "a `beforeAll` inside a `describe`" (`8803b237`) |

## Fix for ticket 859

Ticket 859 is fixed on this branch after the review above, and is not
covered by it; a separate reviewer checks it.

- `fbd7d4ef` Print describe-level hook errors in pnpm verify: adds
  `scripts/vitest_json_reporter.mjs` (vitest's JSON reporter, plus the
  error of a failed `describe` in the file's `message`), uses it in
  `scripts/run_verify.mjs`, and adds `scripts/vitest_json_reporter.test.mjs`.
- `c949adc2` Close ticket 859.
