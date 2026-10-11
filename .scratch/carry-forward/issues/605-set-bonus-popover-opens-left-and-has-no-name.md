Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b
Type: bug
Origin: Chunk 3b step 7 regression check (commit c5741e2c), findings F2 and F3
Blocks: none
Blocked by: none
Related: 495 (closed; owner ruling on where the popover opens), 571 (tab accessibility, contrast only)

# The set-bonus popover opens over its own row below 1280 px, and has no accessible name

Both items are in one component, `SetBonusPopover`
(`vendor/tbc-new-fork/ui/features/upgrades/components/SetBonusPopover/SetBonusPopover.tsx`,
fork `316326a95`). The evidence is the Chunk 3b capture set in the main
checkout (gitignored): `.scratch/tab-scope-refresh/review/`, files
`facts.json`, `a11y.json` and the `313-*`, `315-*`, `330-*` PNGs. Rebuild it
with `pnpm tab-review` and that folder's `manifest.json`.

## 1. Below 1280 px it opens to the left, over the row's own cells

The owner's ruling, recorded in ticket 495's closing comment (2026-09-25):
"open the hover to the right of the figure when it fits, and above it
otherwise." The pre-React tab did that (tippy `placement: 'right'`, flip
fallback `top`; at 768 it opened above).

The React component asks for `side="right"` (`SetBonusPopover.tsx:24`) and
sets no fallback. The ui-kit `Popover` it wraps exposes `side`, `align` and
`sideOffset` but no fallback side (`ui/ui-kit/Popover/Popover.tsx:27-29`).
When the right side does not fit, the popover lands on the left. Measured
on the fixture `feral-p3-th-hands-legs`, row 31042 (the figure "+100.4"):

| Width | Popover x (`facts.json` `313-tip` `tipRect`) | Where the figure is |
| ----- | -------------------------------------------- | ------------------- |
| 768   | 223–499                                      | starts near x 507 (`313-row-post-run-768-0.png`, row starts at x 7) |
| 653   | 108–384                                      | starts near x 382 (`313-row-post-run-653-0.png`) |
| 375   | 29–305                                       | past the panel edge at x 368 until scrolled (ticket 606) |
| 1280  | 817–1093                                     | ends near x 800 (`313-row-post-run-1280-0.png`, row starts at x 310), so the popover is to its right, as ruled |

At 768 the popover spans y 405–494 and the row y 430–471
(`313-row` `rowRect`), so it covers the row's item name and slot cells.
The 315 and 330 tip captures show the same pattern.

## 2. The popover has no accessible name

axe reports `aria-dialog-name` (impact serious) on every tip capture, 12 of
12: `313-tip`, `315-tip` and `330-tip` at 375, 653, 768 and 1280
(`a11y.json`). The popup is a dialog with no label, so a screen reader
announces an unnamed dialog. The capture script records it as a warning,
so no gate fails on it.

## Constraint on the fix

`ui/ui-kit/Popover/Popover.tsx` is an upstream wowsims file (it is on
`upstream/master`), so a fix that changes it needs the owner's OK for that
exact edit. A fix inside `SetBonusPopover.tsx` (tab code) is preferred, for
example a heading or label inside the popup content. Whether Base UI's
positioner can fall back to `top` without a ui-kit change is untested.

## What would close this

- At 375, 653 and 768 the popover opens above the figure (or to its
  right where it fits), never over the row's own Item or Slot cells; at
  1280 it still opens to the right.
- axe reports no `aria-dialog-name` on any tip capture.
- A `pnpm tab-review` run with the 313/315/330 tip entries at the four
  widths, judged against the two sentences above.
