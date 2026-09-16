Status: closed
Type: gap
Origin: post-chunk2-five-workstreams handoff, workstream A
Blocks: none
Blocked by: none

# CI never restores vendor/tbc-new-fork, so a full local run and a fork-blind CI run reported the same green tick

## What

`.github/workflows/verify.yml` restores `vendor/wowsims` and `vendor/atlasloot`
before running `pnpm verify`, but never clones `vendor/tbc-new-fork`
(`grep -c tbc-new-fork .github/workflows/verify.yml` -> 0). The fork is
gitignored and main-checkout-only, so CI has never had it.

Seven of verify's python steps skip cleanly (exit 0, print a
`"... skipped -- <reason>"` line) when the fork is absent:
`sim-implemented-effects:check`, `engine-port-drift:check`,
`equip-eligibility:check`, `fork-lint:check`, `ep-presets:check`,
`meta-conditions:check`, `fork-universes:check`. Seven vitest test files skip
under three different predicates: `bulk-boundary.test.ts`,
`bulk-partition.test.ts`, `bulk-screen-branch.test.ts`,
`bulk-screen-fallback.test.ts`, `bulk-screen-http-fixture.test.ts`,
`bulk-screen-driver.test.ts` (a `forkPresent`/local `existsSync` check each)
and `wowsims-fork-parity.test.ts` (`forkPresent && forkProtosGenerated`) --
the last is the only behavioural proof the ported engine matches this repo's
engine, and the bulk-screen files are the only coverage of the bulk path.

Consequence: a CI run that exercised none of the ported engine, none of the
bulk path and none of the Upgrades tab emitted the identical green tick as a
full local run with the fork present. Nothing counted the difference.

## Resolution

Closed by `pnpm verify`'s new tail summary (`scripts/run_verify.mjs` +
`scripts/verify_summary.mjs`, committed on `feat/desktop-transport-gate`
2026-09-15). It runs the verify chain directly (`verify:steps` in
`package.json` holds the step list; `verify` is now
`preflight:node && node scripts/run_verify.mjs`), captures each step's
output, and prints `gates: N ran, M skipped` with one line naming every
skip's reason -- both the seven fork-gated python scripts (matched on the
shared `"skipped -- <reason>"` substring, not a fixed prefix --
`check_equip_eligibility.py` reads "...Fork diff skipped -- ..." with prose
ahead of the word) and vitest's own per-assertion skips (read from
`--reporter=json`, using each skipped assertion's `fullName` as the reason,
per the `wowsims-fork-parity.test.ts` `describe.skipIf`/`runIf` pairing
already used as the model).

Verified both states by hand (2026-09-15, `feat/desktop-transport-gate`
tip after `df246b38`):

- Fork present (this checkout's real state -- protos not generated):
  `pnpm verify` -> rc 0, `gates: 1330 ran, 1 skipped` (the
  `wowsims-fork-parity.test.ts` paired counterpart -- see the note below).
- Fork renamed to `vendor/tbc-new-fork.DISABLED` and restored after:
  `pnpm verify` -> rc 0, `gates: 1295 ran, 37 skipped` (7 python + 30
  vitest-test-level skips, every one of the seven scripts and seven files
  named with its own reason).

**One correction to this ticket's own premise, found while closing it:**
`wowsims-fork-parity.test.ts` cannot reach 0 skipped even with the fork fully
present and protos generated. `describe.runIf(canRunForkSide)` and
`describe.skipIf(canRunForkSide)` (:864, :998) are a complementary pair --
exactly one runs and vitest reports the other as skipped, by construction,
regardless of fork state. So "0 skipped" in a summary means "0 skipped due to
fork absence", not literally zero; the floor is 1 from this file alone. This
does not weaken the check -- the real behavioural test (`the ported fork
engine reproduces this repo's ranked deltas`) does run and pass when
`canRunForkSide` is true, which is what the summary actually verifies.
