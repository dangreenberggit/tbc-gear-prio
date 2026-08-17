Status: resolved (vitest excludes **/vendor/**)
Type: gate gap
Origin: standards axis, pre-merge review of `feat/sweep-tab-tickets`, 2026-08-14
(`docs/reviews/feat-sweep-tab-tickets.md`, finding S1)
Blocks: none
Blocked by: none

# Fork tests report "1 passed" while asserting nothing

`vendor/` is gitignored but is **not** excluded in `vitest.config.ts`, which
excludes only `node_modules`, `dist`, `.scratch`, and `.claude/worktrees`. So
vitest collects
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/ep-weights-v1.test.ts`,
finds no vitest-registered tests in it (the file uses `node:test`, since the
fork ships no test runner), and reports:

```
✓ vendor/.../ep-weights-v1.test.ts (0 test)
Test Files  1 passed (1)     Tests  no tests
```

## Reproduce

Break the assertion — e.g. change `assert.equal(source.file, …)` to expect
`"DELIBERATELY-BROKEN"` — then:

```bash
pnpm verify
```

It still reports the file as passing. Verified by the standards reviewer, who
restored the file afterwards.

## Why it matters

Ticket 162's only test is the one in that file. It is not gated by anything: it
passes `pnpm verify` in every state, including broken. The green tick is worse
than no tick, because a reader reasonably concludes the fork-side behaviour is
covered. `AGENTS.md` § Testing assumes tests are gate-backed.

The file's TAP output also leaks into `npx vitest list`.

## Done when

Either:

- `vendor/**` is excluded in `vitest.config.ts`, so the gate stops claiming a
  pass it did not earn (honest, and the smaller change); **or**
- the fork test is actually run by `pnpm verify` via its documented `node --test`
  command, so the coverage becomes real.

Pick one and record why. The current state — collected, uncounted, reported
green — is the worst of the three.

## Related

Ticket 162 is the slice whose test this is. Ticket 165 covers a different and
independent gap in E-W3's coverage.

## Resolution, 2026-08-17

`vitest.config.ts` now excludes `**/vendor/**`. The ticket's named file
(`ep-weights-v1.test.ts`) is no longer in the working tree, so the condition
was reconstructed to prove the fix rather than assume it.

Probe: a `node:test` file in the fork's engine directory with a deliberately
failing assertion (`assert.equal("DELIBERATELY-BROKEN", "never-equal")`).

Without the exclusion — the ticket's symptom, exactly:

```
✓ vendor/.../zz-ticket166-probe.test.ts (0 test)
Test Files  47 passed (47)
```

A failing assertion reported as a passing file. With the exclusion: 46 files
collected, the probe absent. Probe deleted; fork clone clean afterwards.

Note the green tick appeared *because* vitest found no vitest-registered
tests in the file — `passWithNoTests: true` then counts the file as passing.
Excluding the directory is the fix rather than turning that flag off, since
the flag is wanted for genuinely empty suites elsewhere.
