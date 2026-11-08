Status: closed
Type: bug
Origin: review agent on 2026-11-07 (branch `fix/821-weapon-damage-order`)
Blocks: none
Blocked by: none
Related: 628, 821

# fork-spec-pages test failed once in pnpm verify with no error message

## What happened

During `pnpm merge-to-dev --check-only` on branch
`fix/821-weapon-damage-order` at `fb88eb3d` (fork `68b2afacf`),
`packages/core/test/fork-spec-pages.test.ts` failed with no error message.
Both of its tests were marked skipped, and the command returned rc=1.

The same file passed 2/2 when run alone. A second full
`merge-to-dev --check-only` passed (rc=0, `gates: 1596 ran, 0 skipped`).

The logs from the failing run were in `/tmp/claude-1000/r2/mtd.log` and
`/tmp/claude-1000/tbc-verify-8rCZUl/vitest-report.json`. They are temp
files and may be gone.

Cause unknown. Same shape as ticket 628: a flaky gate, not tab behaviour.

## Done when

The cause is found and fixed, or the test has passed in 20 consecutive
full `pnpm verify` runs with the cause recorded as unreproducible.

## Comments

### 2026-11-07: cause found and fixed (branch `fix/858-flaky-spec-pages`)

Cause: the suite's `beforeAll` timed out. It loads the fork engine (db.json
and `model/run.ts`'s module graph) and had vitest's default 10 s
`hookTimeout`. It took about 2.7 s alone, 5.6-7.4 s in a full vitest run
(8 runs), and 11-23 s in every run made while a second full vitest run was
going (6 runs). Unchanged `dev` code failed in 4 of 4 runs made two at a
time, with exactly this ticket's report: file `failed`, `message: ""`,
both tests `skipped`. vitest's own reporter shows the hidden error:
`Error: Hook timed out in 10000ms` at `fork-spec-pages.test.ts:24`. The
other three fork-loading hooks already had a 30 s argument each; this one,
added on 2026-11-06, did not.

Fix: `hookTimeout: 30_000` in `vitest.config.ts`, the same budget as
`testTimeout` and for the same reason, and the two per-hook `30_000`
arguments it replaces removed. With it, 4 of 4 runs made two at a time
passed.

Why the report had no message: ticket 859.

Verified by:

```sh
P=<checkout>; for j in a b; do pnpm -C $P exec vitest run --reporter=json --outputFile=$TMPDIR/v858-$j.json >/dev/null 2>&1 & done; wait; grep -c '"status":"failed"' $TMPDIR/v858-*.json
```

(Each count is 0 with the fix; on `dev` before it, each report lists
`fork-spec-pages.test.ts` as failed.)
