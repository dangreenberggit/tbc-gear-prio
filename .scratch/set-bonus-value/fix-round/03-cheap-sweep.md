# Worker log — cheap sweep (tickets 120, 123, 115)

Branch: `feat/set-bonus-value`. Date: 2026-08-11. Verify green before each
commit (Node 22 via Git Bash; the PowerShell Node 20.18 lacks `node:sqlite`
and fails the store suites regardless of the change).

## Ticket 120 — warn on implausibly negative set bonuses (commit `61dbe4f`)

The plausibility check on set-bonus sizes skipped every figure at or below
zero, so a strongly negative measurement — exactly what the known
measurement problems produce — passed silently. `setBonusMagnitudeWarnings`
(`packages/core/src/plausibility.ts`) now applies the same 7.5%-of-baseline
band on both sides of zero. The negative side gets its own wording ("This
bonus is implausibly negative; suspect a measurement problem…"), never the
positive side's "not a bonus this large".

Tests (`packages/core/test/plausibility.test.ts`), red first:

- "flags a strongly negative bonus, worded as negative rather than large"
  (−262 on a 2000 baseline; message contains "implausibly negative", not
  "large")
- "does not flag a noise-sized negative bonus" (the ret artifact's −9.92)
- "uses the same band on both sides of zero" (±149 quiet, ±151 fires)

The old "does not flag a large negative bonus" test asserted the gap and was
replaced by the tests above. Ticket marked resolved.

## Ticket 123 — Substitutions drawer trims to the first error line (commit `b8d033e`)

The HTML report dumped a sim crash's full 2.4KB Go stack trace into the
drawer. New `firstLineOf` in `packages/core/src/rank-report.ts` cuts each
substitution's detail at the first line break — counting both real newlines
and the written-out backslash-n pairs the stringified sim error carries
(checked against the actual ret artifact: its detail has zero real newlines,
all breaks are backslash-n pairs) — and appends "… (full text in the JSON
report)" when it trimmed anything. The JSON artifact is untouched.

Tests (`packages/core/test/rank-report.test.ts`, describe "substitutions
drawer (ticket 123)"), red first:

- "shows only the first line of a crash trace, with a pointer to the full
  text" (Go-crash fixture with backslash-n breaks; asserts no "goroutine 54")
- "also trims on real newlines"
- "leaves a one-line detail exactly as it was" (no pointer suffix)

Ticket marked resolved.

## Ticket 115 — package marker emit guard (closed on verification, this commit)

The ticket's complaint — the marker's show/hide decision was a number
comparison (`packageSetPotentialDps(i) !== i.deltaDps`) instead of the fact
it stood for — was already fixed by ticket 118's commit `ee2a4e4`: `chipHtml`
now emits from `i.setContext?.packages`, the membership fact. Verified both
named edge cases against current code:

- **Package figure equals the row's own delta**: marker now shows. Added the
  pin "keeps the package marker when the package figure equals the row's own
  delta" (`packages/core/test/rank-report.test.ts`) — the fixture ties both
  at +64.07, which the old comparison would have hidden.
- **NaN**: the emit decision reads no number anymore, so no value can switch
  it on; the existing no-package test pins the off side. No new test — the
  failure mode is gone by construction, not handled by a branch.

One deliberate difference from the ticket's original "iff positive" ask,
recorded in the ticket: per the owner's ticket-118 decision the marker shows
every measured figure, negative included; only the sort ignores non-positive
packages. Ticket marked resolved with the full reasoning.
