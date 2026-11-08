Status: open
Type: bug
Origin: ticket 858 investigation, 2026-11-07 (branch `fix/858-flaky-spec-pages`)
Blocks: none
Blocked by: none
Related: 858

# pnpm verify prints no error when a test file's setup hook fails

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

A failed suite-level hook in `pnpm verify` prints the hook's error (for
example `Hook timed out in 10000ms` and the file and line), checked by a
test in `scripts/` that feeds a failed hook through the verify path.
