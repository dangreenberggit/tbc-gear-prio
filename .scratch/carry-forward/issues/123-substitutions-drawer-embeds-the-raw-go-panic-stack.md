Status: resolved
Type: cleanup
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/04-surfaces.md` check 8, finding 2)

# Substitutions drawer embeds the raw Go panic stack

On the ret artifact (re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`)
the Substitutions drawer's entry for dropped candidate 30892 embeds the full
**2,383-char Go panic** ("RetributionPaladin is not hunter.HunterAgent …
Stack Trace: goroutine 54 …") raw in the `<li>`, with literal `\n\t`
sequences. It is HTML-escaped (no injection) and collapsed by default, so
this is cosmetic — but expanding the drawer dumps ~2.4KB of goroutine frames
on the reader when the first error line carries all the information.

Fix: trim the rendered message to the first line of the sim error (or put
the full text behind a nested disclosure). Keep the full text in the JSON —
it is the diagnostic record; only the HTML rendering should trim.

Filed separately from ticket 122 (which owns why the item was in the pool at
all) because this applies to every future substitution regardless of cause.

## Acceptance criteria

- [x] The drawer shows the first error line per substitution; the full text
      remains reachable (JSON, or nested disclosure).
- [x] Pinned by a renderer test with a multi-line error fixture.
- [x] `pnpm verify` green.

## Comments

Resolved 2026-08-11. The HTML renderer (`firstLineOf` in
`packages/core/src/rank-report.ts`) now cuts each substitution's detail at
the first line break — counting both real newlines and the written-out
backslash-n pairs the stringified sim error carries — and appends "… (full
text in the JSON report)" when it trimmed anything. One-line details render
unchanged. The JSON artifact is untouched; it keeps the full trace as the
diagnostic record. Pinned in `packages/core/test/rank-report.test.ts`
(describe "substitutions drawer (ticket 123)") with a Go-crash fixture, a
real-newline fixture, and a one-line fixture.
