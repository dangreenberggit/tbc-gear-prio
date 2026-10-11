Status: closed
Type: bug
Origin: .scratch/handoffs/visual-review-round-2c.md, hover-capture note
Blocks: none
Blocked by: none
Related: 495, 504

# tab-review loses hover tooltips in its captures

## Evidence

`.scratch/handoffs/visual-review-round-2c.md`:

> Ignored as instructed: `495-post-run-{1280,768}-{0,2}.png` and their
> `index.json` errors ("capture selector missing or zero-size:
> [data-tippy-root]"). The scratch hover captures `495-hover-*` replace
> them.

`pnpm tab-review`'s manifest-driven hover captures (`495-post-run-*`, taken
via `vendor/tbc-new-fork/test-review.mjs`) come back with no tooltip: axe
and the clip both target `[data-tippy-root]`, which is absent because the
tooltip has already closed by the time the clip is taken.

`vendor/tbc-new-fork/test-review.mjs`'s `captureClip` helper
(around line 119-147) calls `el.scrollIntoView` and waits a beat before
taking the clip, on every capture including ones after a hover interaction
has already opened a tooltip — the comment there explains the scroll is
needed to force a paint before an unpainted pane can be clipped. A
`scrollIntoView` after the hover has landed moves the page under the
pointer, which tippy treats as the mouse leaving the hovered element, and
the tooltip closes before the clip fires.

Round 2c worked around this with a scratch script that does a real mouse
hover *after* navigation, fixture load and settle, with no further
scrolling between the hover and the capture:
`.scratch/stage-gate/upgrades-tab-closeout/round-2c/tools/capture495.mjs`.
It hovers via CDP `Input.dispatchMouseEvent` at the target cell's centre,
waits for the tooltip, then reads the tooltip's box and takes the clip
directly from the already-visible geometry, with no `scrollIntoView` call
between hover and capture.

## What would close this

1. `vendor/tbc-new-fork/test-review.mjs` captures a hovered tooltip
   correctly: either skip or reorder the `scrollIntoView` step for a
   `pane: false` hover capture so the pointer stays over the hovered
   element until after the clip is taken, or scroll first and hover only
   once no further scroll is needed (matching `capture495.mjs`'s ordering).
2. Prove it with a manifest entry on a fixture: a `pnpm tab-review` run
   against a recorded fixture (e.g. `feral-p3-p2bis` or `ret-p3-p2`) with a
   `hover:` interaction in its manifest produces a capture that actually
   shows `[data-tippy-root]` content, not a zero-size-selector error in
   `index.json`. Record the command and its exit code.

## 2026-10-11 — closed: tippy is gone and the harness clips in place after a hover

Closed by Chunk 3b step 3 of `.scratch/plans/upgrades-tab-finish-line.md`,
checked at fork `316326a95` (= the fork lock) on 2026-10-11 by reading
code; no gate or capture was run for this close.

- `grep -rln -i tippy vendor/tbc-new-fork/ui/features/upgrades` and
  `grep -n -i tippy scripts/tab-harness/*.mjs` print nothing.
- `scripts/tab-harness/test-review.mjs:189-190`: the first capture after a
  hover is clipped where the target already is, "because a scroll moves the
  page under the pointer and closes the popup".

Still open elsewhere: later captures after a hover in a `pane: false` entry
clip the nav bar (`docs/agents/known-traps.md`, "Before writing a `pnpm
tab-review` manifest").
