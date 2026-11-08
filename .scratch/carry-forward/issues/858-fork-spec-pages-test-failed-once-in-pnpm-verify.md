Status: open
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
