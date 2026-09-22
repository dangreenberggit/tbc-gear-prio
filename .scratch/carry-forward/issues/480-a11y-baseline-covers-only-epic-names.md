Status: open
Type: task
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 473

# a11y baseline covers only epic-quality item names (hypothesis)

Finding S6. The 473 baseline entry is scoped to
`.upgrades-item-name.text-epic` only; rare/uncommon/legendary quality
colours on the zebra rows are not baselined. A run whose captured rows
include a rare-quality name may red the layout gate. Not measured.

## What would close this

Measure the other `text-*` quality classes' contrast on `#222328` /
`#18191e` / `#343a40`; baseline the failing ones with `match: css` and
this ticket, or wontfix with the measurement recorded.
