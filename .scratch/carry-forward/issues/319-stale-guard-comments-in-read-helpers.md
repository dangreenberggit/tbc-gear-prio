Status: closed
Type: chore
Origin: pre-merge review round 4, Adversarial axis finding A2, 2026-08-27
Blocks: none
Blocked by: none
Resolution: Already fixed on the fork tip (commit ea65fbfc2). Both stale comments
are corrected and both unreachable guards are gone. `readIterations`
(upgrades_tab.tsx:1057-1069): the comment now says "The field is a plain `number`
written by the `NumberPicker`; the picker coerces user input in `getInputValue()`
(`parseInt(value || '') || 0`), so this only ever sees `0` or a positive integer,
never `NaN`/`Infinity`" — naming exactly where coercion happens — and the body is
`parsed > 0 ? Math.floor(parsed) : DEFAULT_ITERATIONS`, with the old
`Number.isFinite && > 0` guard replaced by the honest `> 0` check.
`readCandidateCap` (:1107-1120) mirrors it: comment says "a plain `number` coerced
by the `NumberPicker` (see `readIterations`), so it is only ever `0` or a positive
integer", body `parsed > 0 ? Math.floor(parsed) : undefined`. No `NaN`/`Infinity`
guard survives to be misread as load-bearing. Verified `npm run type-check`
(EXIT=0). No new code change needed; closing as resolved-upstream-of-this-pass.

# Read-helper guards and comments describe an input that no longer exists

`readIterations` (`upgrades_tab.tsx:943-945`) and `readCandidateCap` (`:1004-1006`)
still test `Number.isFinite(parsed) && parsed > 0`. Since slice 2b those fields
are plain `number`s written by a `NumberPicker`, not strings parsed from an
input element. `NumberPicker.getInputValue()` (`number_picker.ts:86`) is
`parseInt(value || '') || 0`, so the field can only be `0` or an integer — never
`NaN`, never `Infinity`.

**Behaviour is correct** either way: `0` falls back to `DEFAULT_ITERATIONS` and
`undefined` respectively. This is defensive code that no longer defends
anything, which on its own would not be worth a ticket.

## The actual problem is the comments

The doc comments above both helpers still describe reading and parsing an input
element ("the field itself is a plain number input", "an empty field"). That
description is now false. A reader trusting it would believe the guards are
load-bearing and that user input is validated here, when validation now rests
entirely on `NumberPicker`'s coercion. The Spec axis reached the same place from
the other direction (its C1).

Fix: correct the comments to say where coercion actually happens, and either
drop the unreachable guards or keep them with a line saying they are belt-and-
braces against a picker change.
