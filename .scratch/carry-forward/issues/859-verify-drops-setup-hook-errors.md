Status: open
Type: bug
Origin: ticket 858 investigation, 2026-11-07 (branch `fix/858-flaky-spec-pages`)
Blocks: none
Blocked by: none
Related: 858

# pnpm verify prints no error when a describe-level setup hook fails

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

When a `describe`-level hook fails, `pnpm verify` prints the hook's error
text (for example `Hook timed out in 30000ms`) under the test file's
path. A test in `scripts/` checks this: it runs vitest on a fixture file
whose `describe`-level hook fails, the way `scripts/run_verify.mjs` runs
it, and asserts that the printed failure holds the error text. The
fixture stays out of the main suite (`exclude` in `vitest.config.ts`). A
test that feeds a hand-written JSON report does not count: the real
report has no error text to feed.
