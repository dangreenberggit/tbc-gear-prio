Status: open
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: candidate cap (rank.ts:1194, referenced in 424's cap note)

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
