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

## Closing note

Fixed 2026-11-10 on branch `fix/867-870-tab-errors`, fork commit
`277fb1855` 'Show only a failed run's first error line'. Paths under the
fork's `ui/features/upgrades/`:

- `describeRunError` (`utils/format.ts`) now passes the error through
  `substitutionText`, the cut the notes list already uses. The status
  line reads "Ranking failed: <the error up to its first line break>…
  (full text in the browser console)". A one-line error shows as before,
  with no suffix. Ticket 873 (fork `e67eb2fd3`) later dropped the "…":
  the line now reads "Ranking failed: <first line> (full text in the
  browser console)", with a final full stop moved after the note.
- `model/run_session.ts` logs the whole error with
  `console.error('[upgrades] the run failed', error)` when the current
  run fails, so the suffix is true.

Verified by: in the pair's fork (`vendor/tbc-new-fork`),
`npx vitest run ui/features/upgrades/utils/format.test.ts ui/features/upgrades/model/run_session.test.ts`.
The new tests "shows a failure up to its first line break and says the
rest is in the console (ticket 868)" and "sends a failed run's whole
error to the console, as the status line shows only its first line
(ticket 868)" failed before the fix (2 failed, 48 passed) and pass with
it. Not checked on screen: no live tab run for this ticket.

## Reopened 2026-11-11

Owner, 2026-11-11, on the error text under each notes line: "idk wtf the "notes list" is. if one sim fail ends the entire wowsims bulk sim, then we don't necessarily need to copy that and we can do something more graceful than multiple dialogs opening. but generaly we should match what wowsims has and not try to reinvent new things, especially when our reinventions are most likely dumb AI slop."

The console half stays (the whole error goes to the console). The status-line half is reopened: "Ranking failed: <first line> (full text in the browser console)" is the tab's own display, not a wowsims one.

Done when: the tab shows this error the way wowsims shows a sim error, each on-screen piece citing a wowsims file:line, per the design the owner approves.
