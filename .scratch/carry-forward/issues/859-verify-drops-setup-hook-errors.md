Status: closed
Type: bug
Origin: ticket 858 investigation, 2026-11-07 (branch `fix/858-flaky-spec-pages`)
Blocks: none
Blocked by: none
Related: 858

# pnpm verify prints no error when a beforeAll inside a describe fails

## What happens

When a `beforeAll` inside a `describe` fails, `pnpm verify` prints only
`FAIL <file>` with an empty line under it, and the kept JSON report holds
no error text either. Ticket 858 was a hook timeout that showed this way,
so the first report said "failed with no error message".

Reason: `scripts/run_verify.mjs` runs vitest with only the JSON reporter.
vitest 3.2.7's JSON reporter takes a file's `message` from the file's own
errors (`file.result?.errors?.[0]?.message`,
`node_modules/vitest/dist/chunks/index.VByaPkjc.js`, near line 1743). A
failed `describe`-level hook puts its error on the suite, not the file, and
marks the tests skipped, so neither `message` nor any `failureMessages`
holds it. `formatVitestFailures` in `scripts/verify_summary.mjs` can only
print what the report has.

Repro: give the hook a tiny budget and look at the report.

```sh
pnpm exec vitest run packages/core/test/fork-spec-pages.test.ts --hookTimeout=50 --reporter=json --outputFile=$TMPDIR/h.json; grep -o '"message":"[^"]*"' $TMPDIR/h.json
```

It prints `"message":""`.

## Done when

When a `beforeAll` inside a `describe` fails, `pnpm verify` prints the
hook's error text (for example `Hook timed out in 30000ms`) under the test
file's path. A test in `scripts/` checks this by running vitest on a
fixture whose `describe`-level `beforeAll` fails, with the fixture kept out
of the main suite. A test that feeds a hand-written JSON report does not
count: the real report has no error text to feed.

## Closed 2026-11-08

`scripts/run_verify.mjs` now runs vitest with
`scripts/vitest_json_reporter.mjs`, a subclass of vitest's JSON reporter.
When a file's `message` is empty, it fills it with the message of the
file's first failed `describe`, read from vitest's task tree; a thrown
non-Error has no message, so the file keeps the stock `""`.
`formatVitestFailures` in `scripts/verify_summary.mjs` prints a failed
file's non-empty `message` under `FAIL <file>`, also when other tests in
the file failed. So `pnpm verify` prints the hook's error under
`FAIL <file>`, and the kept JSON report holds it too. Passing runs print
the same as before.

`scripts/vitest_json_reporter.test.mjs` runs the real `run_verify.mjs`
and vitest in a temp checkout, on three fixtures:

- a `describe`-level `beforeAll` that times out after 50 ms: stderr shows
  `FAIL hook.test.mjs` with `Hook timed out in 50ms.` under it. With the
  stock `--reporter=json` this case fails: the line under the path is
  empty.
- one `describe` whose `beforeAll` throws and another whose test fails:
  stderr shows both the failed test and the hook's error.
- a `beforeAll` that throws `{ code: 42 }`: the report's `message` is
  `""`.

The focused check of the first commit
(`.scratch/agent-reports/2026-11-08-general-task-859-focused-check.md`)
found the last two cases broken (F1: the hook error was hidden when
another test in the file failed; F2: the `message` key was dropped).
Both were fixed in `d38911c9`; each of their test cases failed before it.
Commits: `fbd7d4ef`, `d38911c9`.

Verified by:

```sh
pnpm exec vitest run scripts/vitest_json_reporter.test.mjs
```

(The ticket's repro with the new reporter,
`pnpm exec vitest run packages/core/test/fork-spec-pages.test.ts --hookTimeout=50 --reporter=./scripts/vitest_json_reporter.mjs --outputFile=$TMPDIR/h.json; grep -o '"message":"[^"]*"' $TMPDIR/h.json`,
prints `"message":"Hook timed out in 50ms.\nIf this is a long-running hook, ...`.)
