Status: open
Type: chore
Origin: pre-merge review round 4, Adversarial axis finding A2, 2026-08-27
Blocks: none
Blocked by: none

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
