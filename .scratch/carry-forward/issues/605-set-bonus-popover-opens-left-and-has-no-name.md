Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b
Type: bug
Origin: Chunk 3b step 7 regression check (commit c5741e2c)
Blocks: none
Blocked by: none
Related: 495 (closed; owner ruling on where the popover opens), 571 (tab accessibility, contrast only)

# The set-bonus popover opens over its own row below 1280 px, and has no accessible name

Both items are in one component, `SetBonusPopover`
(`vendor/tbc-new-fork/ui/features/upgrades/components/SetBonusPopover/SetBonusPopover.tsx`,
fork `316326a95`). The evidence is the Chunk 3b capture set in the main
checkout (gitignored): `.scratch/tab-scope-refresh/review/`, files
`facts.json`, `a11y.json` and the `313-*`, `315-*`, `330-*` PNGs. That
folder's `manifest.json` is gitignored too, so a re-check from another
checkout needs a new `pnpm tab-review` manifest.

## 1. Below 1280 px it opens to the left, over the row's own cells

The owner's ruling, recorded in ticket 495's closing comment (2026-09-25):
"open the hover to the right of the figure when it fits, and above it
otherwise." The pre-React tab did that (tippy `placement: 'right'`, flip
fallback `top`; at 768 it opened above).

The React component asks for `side="right"` (`SetBonusPopover.tsx:24`) and
sets no fallback. The ui-kit `Popover` it wraps exposes `side`, `align` and
`sideOffset` but no fallback side (`ui/ui-kit/Popover/Popover.tsx:27-29`).
When the right side does not fit, the popover opens on the left. Measured
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
- The React layout gate (`scripts/tab-harness/test-layout.mjs`) asserts
  where the popover opens at 768, 653 and 375, as the pre-React gate's
  assertion (15) did ("opened top as expected", ticket 495). Today it has
  no popover assertion: `grep -n -i 'placement\|popover'
  scripts/tab-harness/test-layout.mjs` finds none. Added 2026-10-11 by the
  pre-merge review of `feat/tab-scope-refresh` (finding A3), so the
  placement cannot regress again unseen.

## Comments

**2026-10-15 — closed (stage `tab-small-fixes`, plan steps 11–17).**

The first close condition changed. After ticket 606 moved the DPS column
before Slot, a popover to the right of the figure covers the row's own Slot
cell at every width. The session asked the owner (Q-606-popover-side,
2026-10-12). The owner's answer, verbatim from
`.scratch/stage-gate/tab-small-fixes/decision-log.md`: "i dont care. it's
going to cover something and i dont know why this one in particular is a
problem unless theres a better option youre not identifying." The session
read it as: keep the ticket-495 ruling (right of the figure when it fits,
above otherwise), and accept that the popover covers the hovered row's own
Slot cell. The clause "never over the row's own Item or Slot cells" is
dropped. The condition judged was: "At 375, 653 and 768 the popover opens
above the figure; at 1280 it opens to the right of the figure and may cover
the row's own Slot cell; axe reports no aria-dialog-name."

- Fork commit `57cc809e4`: `SetBonusPopover` opens `right` when the window
  has room for the widest popup (30rem plus a 10 px gap), else `top`. A
  visually hidden title, "Set-bonus breakdown", names the dialog.
- Layout gate check 17 (`scripts/tab-harness/test-layout.mjs`, main
  `9253a183`) asserts the side at all four widths. On 2026-10-15 at fork
  `899d8c267` it printed `PASS (17)` at 375, 653 and 768 (`top`) and at
  1280 (`right`), with 0 FAIL. Run on fork `a16e4cd34` (before the fix), it
  failed at 375, 653 and 768 (commit `9253a183` body).
- `pnpm tab-review` capture (pair, gitignored:
  `.scratch/stage-gate/tab-small-fixes/visual/605-606b/`, fork `899d8c267`,
  clean). There are 28 captures and 0 errors. The 313/315/330 pairs moved
  to fixtures `feral-p3-p2bis` (31042), `feral-p2-malorne4` (29995) and
  `feral-p3-nordrassil4` (31034), because the re-recorded
  `feral-p3-th-hands-legs` renders no set-bonus row near the top of the
  table. `a11y.json` has no `aria-dialog-name` in any of the 24 popover
  states.
- gate-visual verdict: **pass**, with four advisory findings and none
  blocking. One advisory: at 375 and 653, when the item name wraps to two
  lines, the popover's bottom edge covers about 6 px of the top of that
  row's item name. That is allowed under the ruling above. Handoff:
  `.scratch/handoffs/visual-review-tab-small-fixes-K5.md`.
- Fork re-pinned at `899d8c267` (`tbc-gear-prio@976a3d51`); `pnpm verify`
  rc=0.

Verified by: `tbc-new-fork@57cc809e4`; `node scripts/tab-harness/test-layout.mjs` prints `PASS (17)` at 375, 653, 768 and 1280; `.scratch/handoffs/visual-review-tab-small-fixes-K5.md` (gate-visual pass).
