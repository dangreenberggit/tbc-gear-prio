Status: open
Type: bug
Origin: owner viewing session, 2026-09-19 (screenshot)
Blocks: none
Blocked by: none
Related: 314/422/328 (the JSON export box and its native CopyButton)

# JSON export box looks too wide and the Copy JSON button is flung to the far right

Owner report + screenshot from the 2026-09-19 viewing session. In the "JSON
export" block: the textarea looks much too wide for its short content, and the
"Copy JSON" button sits off to the far right, detached from the box.

## Cause (diagnosed)

`.upgrades-export` is a full-panel-width `.content-block`. Inside it:

- `.upgrades-export-area` (the textarea) is capped at `max-width: 36rem` with
  `width: 100%`, so it renders 36rem wide, LEFT-aligned in a much wider block.
  On a wide panel the block's own width is what reads as "too wide" — the box
  looks stranded in a large empty content-block.
- `.upgrades-export-actions` is `display: flex; justify-content: space-between`
  spanning the FULL block width, so the count (left) and the CopyButton host
  (right) are pushed to the block's extremes — the button ends up far to the
  right of the 36rem textarea above it.

See `_upgrades_tab.scss:216-247` and the markup at `upgrades_tab.tsx:865-892`.

## What would close this

- The export box reads as one coherent unit: the textarea, the count, and the
  Copy JSON button share the same width bound, so the button sits under/aligned
  with the textarea rather than at the far edge of a full-width block.
- Likely fix: cap the export block's inner column (or at least the actions row)
  to the same width as the textarea (the 36rem bound), so `space-between` acts
  within the box's real width, not the whole panel. Match the native wowsims
  block idiom; do not invent a bespoke look.
- Verify live post-run on the Go backend (:3333), at desktop AND mobile widths:
  the button is adjacent to the box, no stranded whitespace.

## Where

`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`
(`.upgrades-export*`), markup at
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:865`.

## Notes

CSS/layout only; no logic change. Cosmetic but owner-visible on every run with a
shortlist. A natural fit for the same tab stage as 438/439/440/441 and exactly
the kind of off-brand control the approved automated visual review should catch.
