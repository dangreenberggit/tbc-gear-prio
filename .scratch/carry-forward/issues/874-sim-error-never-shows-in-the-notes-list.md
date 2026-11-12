Status: closed
Type: bug
Origin: live check of ticket 863 on dev 5413e971 (fork 74b9c3bc1), 2026-11-10, `.scratch/agent-reports/2026-11-10-live-863-865/` in the main checkout (gitignored)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 863, 868, 873, 311, 852

# A failed sim's own error never shows in the notes list

## What happens today

Seen on screen in the live check (run 4, screenshot
`14-863-run4-notes-list.png`): a proxy answered some set-phase sims with
HTTP 500. Each notes line shows only the tab's sentence, such as "The
Justicar Battlegear 2-piece set bonus was not measured, because its sim
failed.… (full text in the browser console)". The sim's error, "HTTP 500
from /raidSimAsync: injected failure for the 863 live check", is only in
the console copy (`console.log` in the same folder, 15 of 15 lines).

Why, read from the fork at `e67eb2fd3`, paths under
`ui/features/upgrades/`:

- Every failure line puts the tab's sentence on its first line and the
  sim's error after a line break. A failed candidate sim does the same:
  "This item was not ranked in this slot, because its sim failed." then
  `item <id>, slot <slot>: <error>` (`model/engine/rank.ts:4641-4650`,
  `candidateSkipSubstitution`).
- The list shows each line's first line only
  (`components/SubstitutionsList/SubstitutionsList.tsx:24`,
  `substitutionText` in `utils/format.ts:180`), and the run logs the full
  text to the console (`model/run_session.ts:63`,
  `substitutionConsoleLines` in `model/assumptions.ts:63`). Ticket 311
  set this up to keep Go stack traces off the page.
- The status line of a failed run (ticket 868) uses the same cut, but
  there the error is the first line, so its first line does show:
  "Ranking failed: <error's first line> (full text in the browser
  console)".

So one rule already runs everywhere (first line on screen, the rest in
the console), and in the notes list it hides the error. The owner,
2026-11-06, in ticket 852: "i dont know why we need to invent to new
error, rather than just normally bubbling up whatever error we got from
existing sim code".

## The choice (owner's)

What each option shows for the live check's line, a Go panic, and a
failed candidate. The status line reads the same in every option.

1. **Keep today's display** (with ticket 873's punctuation): "The
   Justicar Battlegear 2-piece set bonus was not measured, because its
   sim failed (full text in the browser console)." A candidate: "This
   item was not ranked in this slot, because its sim failed (full text
   in the browser console)." The error stays in the console only.
2. **The error's first line after the sentence, on one line:** "The
   Justicar Battlegear 2-piece set bonus was not measured, because its
   sim failed: HTTP 500 from /raidSimAsync: injected failure for the 863
   live check". A Go panic: "... because its sim failed: sim error
   (ErrorOutcome): runtime error: index out of range (full text in the
   browser console)". A candidate: "This item was not ranked in this
   slot, because its sim failed: <error's first line>"; the item id and
   slot move to the console only (the label already names the item and
   slot).
3. **The error's first line as a second line in the same cell:** line 1
   "The Justicar Battlegear 2-piece set bonus was not measured, because
   its sim failed." and line 2 "HTTP 500 from /raidSimAsync: injected
   failure for the 863 live check" (a Go panic: "sim error
   (ErrorOutcome): runtime error: index out of range (full text in the
   browser console)"). The tab's sentence stays one plain sentence; the
   cell grows by one line, so the layout gate baseline moves.

Options 2 and 3 apply to every failure line: candidate sims, set-phase
sims, and the 867 and 869 lines (a bonus-list read or a request build
error).

## Done when

The owner picks an option; the notes list shows it for every failure
line, a fork test checks each kind of line, and, for options 2 and 3, a
live or fixture render shows the error on screen.

## Closing note

Ruling, 2026-11-10, from the orchestrating session (not an owner quote):
apply option 3, because only it meets both owner rules at once (the
sim's own error shows; the tab's string is one plain sentence), and it
is the rule the 868 status line already uses.

Fixed on branch `fix/867-870-tab-errors`, fork commit `038876c98` 'Show a
failed call's error under its line'. Paths under the fork's
`ui/features/upgrades/`:

- `Substitution` (`model/engine/disclosure.ts`) has an `error` field.
  Every failure line in `model/engine/rank.ts` puts the tab's one
  sentence in `detail` and the call's error in `error`
  (`SkipReason`, `withError`; candidate, set bonus, set bonuses, break
  split, set screen and worn-set lines). A candidate line's error ends
  with "item <id>, slot <slot>" on its own line, for the console only.
- `SubstitutionsList` shows the sentence, then, when the error is not
  blank, the error's first line on a second line in the same cell
  (`substitutionErrorText`, `utils/format.ts`). A cut error ends with
  " (full text in the browser console)"; the run logs the whole line and
  error to the console (`substitutionConsoleLines`).
- The main repo's mock fixture `data/tab-fixtures/mock-dropped-list.json`
  (from `packages/core/test/tab-fixtures/make-mock-fixtures.ts`) writes
  its item lines the same way, so the layout gate renders the second
  line.

What a cell shows, by the state of the error (the live check's line as
the example):

- one-line error: "The Justicar Battlegear 2-piece set bonus was not
  measured, because its sim failed." and under it "HTTP 500 from
  /raidSimAsync: injected failure for the 863 live check". No console
  note: the whole error is on screen.
- long one-line error: the same, the error whole.
- multi-line error (a Go panic): the sentence, and under it "sim error
  (ErrorOutcome): runtime error: index out of range (full text in the
  browser console)".
- empty, blank or missing error: the sentence only, with no second line
  and no note.
- a failed candidate: "This item was not ranked in this slot, because its
  sim failed." and under it "<error's first line> (full text in the
  browser console)"; the console copy adds the item id and slot.

Ticket 873's note is still true in each state: it shows only when text is
cut, and the console then holds that text. It is needed only for a
multi-line error and for candidate lines (the item id).

Verified by: in the pair's fork (`vendor/tbc-new-fork`),
`npx vitest run ui/features/upgrades/components/SubstitutionsList ui/features/upgrades/model/assumptions.test.ts`.
With the fix's files put aside, 6 tests failed, among them the new
"shows a failed call's error on a second line, in every state of the
error"; with the fix, `npx vitest run ui/features/upgrades` passes 815
of 815. In the main repo, `pnpm exec vitest run packages/core/test/fork-set-net.test.ts packages/core/test/fork-meta-repair.test.ts`
and the other fork suites pass (234 tests). Not checked on screen in a
live run; the layout gate result is in the branch's agent report.

## Reopened 2026-11-11

Owner, 2026-11-11, on the error text under each notes line: "idk wtf the "notes list" is. if one sim fail ends the entire wowsims bulk sim, then we don't necessarily need to copy that and we can do something more graceful than multiple dialogs opening. but generaly we should match what wowsims has and not try to reinvent new things, especially when our reinventions are most likely dumb AI slop."

The second line under each notes line (the error's first line) is the tab's own display; no wowsims screen puts a sim error in a table or list (session handoff `.scratch/agent-reports/2026-11-11-session-tab-errors-handoff.md` in the main checkout, § How wowsims shows a sim error).

Done when: the tab shows this error the way wowsims shows a sim error, each on-screen piece citing a wowsims file:line, per the design the owner approves.

## Closing note (2026-11-11)

Fixed on branch `fix/867-870-tab-errors` per the design the owner approved
(owner, 2026-11-11: "tab eerror display: keep going"; design
`.scratch/agent-reports/2026-11-11-session-tab-error-display-design.md` in
the main checkout). Every piece on screen copies wowsims' bulk sim
(`ui/features/bulk/model/run.ts:301-310` at `24606be6`): `console.error`,
then one `toastManager.add({ variant: 'error', body: errorMessage })` with
the error's own message, skipped when the user cancelled. The run still goes
on past a failed sim, which the owner allowed ("we don't necessarily need to
copy that"). Fork commits, paths under `ui/features/upgrades/`:

- `7698520f4` 'Show only the tab's sentence in the notes list': each line in
  the section headed "Items left out and other notes (N)" shows the tab's
  one sentence only; the error line under it (fork `038876c98`) is gone.
  Every failed call's whole error goes to the console
  (`substitutionConsoleLines`, `model/assumptions.ts`).
- `a95e5e10a` 'Keep only a failed call's own error in a line':
  `Substitution.error` holds only a failed sim's, read's or request build's
  own error, word for word. A candidate line's item id and slot, and a gem
  repair that finds no swap (no failed call), follow the sentence in
  `detail`, for the console (`candidateSkipSubstitution`, `metaOff` in
  `model/engine/rank.ts`).
- `ef091a1fc` 'Show the first failed sim's error in one toast': when a run
  ends with failed calls, `model/run_session.ts` shows one error toast whose
  body is the `error` of the first such line in the notes list's order
  (`result.substitutions`, which the list renders as is). Never one toast per
  failure; none for a superseded run, after Stop, or for a loaded fixture.

What the player sees for the live check's line: the notes list reads "The
Justicar Battlegear 2-piece set bonus was not measured, because its sim
failed."; one error toast at the bottom right reads "HTTP 500 from
/raidSimAsync: injected failure for the 863 live check" (the first failure's
message); the console has every failure's whole error.

Verified by: in the pair's fork (`vendor/tbc-new-fork`),
`npx vitest run ui/features/upgrades/model/run_session.test.ts` (before
`ef091a1fc`: 1 failed, 15 passed, "shows one error toast with the first
failed call's own message, in the notes list's order"; after: all pass);
`npx vitest run ui/features/upgrades/components/SubstitutionsList ui/features/upgrades/utils/format.test.ts ui/features/upgrades/model/assumptions.test.ts`
(before `7698520f4`: 8 failed, 45 passed; after: all pass); in the main
repo, `pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts`
(before `a95e5e10a`: 5 failed, 169 passed of the first two; after: 175 of
175 with the parity test). `npx vitest run ui/features/upgrades` passes 817
of 817 at `ef091a1fc`. Not checked on screen in a live run.
