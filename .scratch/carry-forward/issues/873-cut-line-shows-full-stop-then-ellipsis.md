Status: open
Type: bug
Origin: live check of ticket 863 on dev 5413e971 (fork 74b9c3bc1), 2026-11-10, `.scratch/agent-reports/2026-11-10-live-863-865/` in the main checkout (gitignored)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 863, 868, 311, 874

# A cut notes line reads "failed.… (full text in the browser console)"

## What happens today

The notes list ("Items left out and other notes") shows each line's
first line and, when there is more, appends "… (full text in the
browser console)" (`substitutionText` in the fork's
`ui/features/upgrades/utils/format.ts`). Every engine line ends its
first line with a full stop, so the page shows a full stop followed
directly by an ellipsis: "The Justicar Battlegear 2-piece set bonus was
not measured, because its sim failed.… (full text in the browser
console)" (screenshot `14-863-run4-notes-list.png` in the live-check
folder).

Also, `substitutionFirstLine` (`model/assumptions.ts`) counted a line
followed by an empty error ("…failed.\n") as cut, so the page pointed
to the console for text that was not there.

## Done when

No cut line shows ".…", an empty error adds no console note, and a fork
test covers a short, a long, a multi-line and an empty error.

## Closing note

Fixed 2026-11-10 on branch `fix/867-870-tab-errors`, fork commit
`e67eb2fd3` 'Put the console note inside a cut line's period'. Paths
under the fork's `ui/features/upgrades/`:

- The locale string `substitution_truncated_suffix`
  (`assets/locales/en/upgrades.json`) is now " (full text in the browser
  console)", with no "…".
- `substitutionText` puts the note before a line's final full stop:
  "The Justicar Battlegear 2-piece set bonus was not measured, because
  its sim failed (full text in the browser console)." A line with no
  final full stop, such as the status line of ticket 868, gets the note
  at its end: "Ranking failed: sim error (ErrorOutcome): runtime error:
  index out of range (full text in the browser console)".
- `substitutionFirstLine` counts a line as cut only when the text after
  it holds more than white space, so an empty error shows the sentence
  alone and writes no console line.

States checked by the test "puts the console note inside a cut
sentence's full stop, in every state of the error after it": a one-line
error, a 2000-character error, a multi-line stack trace, breaks written
out as backslash-n, an empty error, a white-space error, and no error.

Verified by: in the pair's fork (`vendor/tbc-new-fork`),
`npx vitest run ui/features/upgrades/utils/format.test.ts ui/features/upgrades/model/assumptions.test.ts ui/features/upgrades/components/SubstitutionsList`.
Before the fix 8 tests failed (the new ones and the changed text); after
it `npx vitest run ui/features/upgrades` passed 814 of 814. Not checked
on screen.

## Reopened 2026-11-11

Owner, 2026-11-11, on the error text under each notes line: "idk wtf the "notes list" is. if one sim fail ends the entire wowsims bulk sim, then we don't necessarily need to copy that and we can do something more graceful than multiple dialogs opening. but generaly we should match what wowsims has and not try to reinvent new things, especially when our reinventions are most likely dumb AI slop."

The " (full text in the browser console)" suffix is the tab's own display, not a wowsims one.

Done when: the tab shows this error the way wowsims shows a sim error, each on-screen piece citing a wowsims file:line, per the design the owner approves.
