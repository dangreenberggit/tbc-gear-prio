Status: open
Type: bug
Origin: ticket 621 check, 2026-11-10, reading the run-failure path in the fork
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 621, 311, 123, 437

# A run whose sim panics shows the whole Go stack trace in the status line

## What happens today

Read from the fork on branch `fix/621-863-865-tab` (from code; not seen
on screen). Paths under the fork's `ui/features/upgrades/` unless named:

- When a Go set bonus or item effect panics, `runSim`'s recover
  (`sim/core/sim.go:121`) returns the panic text, then "Stack Trace:"
  and the goroutine dump, as the sim's error message.
- The tab's runner throws `sim error (<type>): <message>`
  (`model/adapters/worker_pool_sim_runner.ts:205`). When the baseline sim
  fails, the run fails with that error.
- `describeRunError` (`utils/format.ts`) puts the whole message into
  "Ranking failed: {{message}}", and `components/StatusLine/StatusLine.tsx`
  renders it in the alert line, stack trace included.

The notes list already cuts each line to its first line
(`substitutionText` in `utils/format.ts`, using `substitutionFirstLine`
from `model/assumptions.ts`) and sends the full text to the browser
console (`substitutionConsoleLines` in `model/assumptions.ts`, logged by
`model/run_session.ts`). The status line does neither. Ticket 311 removed the stack trace from the old tab's notes; this is
the same text in the React tab's run-failure line.

One way a player reaches it: ticket 621 (4 pieces of another class's
Cryptstalker, Beast Lord or Bold Armor set).

## Done when

A failed run's status line shows the sim's own error up to its first line
break, the full text goes to the browser console, and a fork test covers
a message with a stack trace.
