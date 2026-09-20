Status: closed
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: candidate cap (rank.ts:1194, referenced in 424's cap note)
Resolution: Hidden from the user surface, kept harness-scriptable, in fork commit
  8bc15cad9 (re-pin 09caef2b). The cap is a pre-sim cut of the EP order that
  silently drops real upgrades the sim exists to find and the user cannot audit,
  so the Candidates row is d-none unless the page URL carries ?upgrades-dev; the
  input, its .upgrades-candidates-picker class and the NumberPicker id are
  unchanged so the desktop-gate harness still sets it by selector on a hidden
  element, and the default cap stays 0 (no cap). Verified live: the row is
  display:none and its input still exists in the DOM (tab-review candidatesDisplay /
  candidatesInputExists facts).

# The "Candidates" field is unclear — what does picking fewer candidates do?

Owner report, 2026-09-20. The "Candidates" input is unclear: it's not obvious
what happens if someone picks a smaller number. This may be a labeling issue, or
the field may be a feature that isn't actually useful to expose.

## What would close this

- Decide whether the candidate cap should stay a user-facing control at all:
  - If it stays: make it clear what a smaller number does (fewer candidate items
    fed to the sim → faster but may drop lower-EP upgrades outside the top-N).
    Either a clearer label + short helper text, or a better control.
  - If it's not useful to expose: remove it and pick a sensible fixed default.
- Owner decision needed on keep-vs-remove before wording. Look at how the cap
  feeds `effectivePool` / the top-N selection (the same cap 424's caption warns
  about) to describe it accurately.

## Notes

Not purely a labeling ticket — the owner is questioning whether the control earns
its place. Treat "should this field exist" as the first question.
