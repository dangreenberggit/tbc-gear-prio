Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b
Type: bug
Origin: pre-merge review of `feat/tab-scope-refresh` (finding A7), from ticket 510's closing note
Blocks: none
Blocked by: none
Related: 510 (closed; named this defect as "still open elsewhere"), 536 (closed; where it was first seen)

# `pnpm tab-review`: captures after the first in a hovered `pane: false` entry show the nav bar

In a `pnpm tab-review` manifest entry with `pane: false` and a hover, every
clip after `capture[0]` shows the tab's nav bar instead of its target, and
`index.json` reports no error. So the capture is wrong and nothing says so.
`docs/agents/known-traps.md`, "Before writing a `pnpm tab-review` manifest",
records it from ticket 536's row clips (`*-1.png`).

The trap entry blames the scroll branch of `captureClip`, which offset the
clip by `window.scrollY`. That code is gone: `grep -n 'captureClip\|scrollY'
scripts/tab-harness/test-review.mjs` prints nothing, and today's `clip()`
(`test-review.mjs:181-222`) scrolls the target to the centre of the app's
own scroller and clips in viewport coordinates. Whether the defect still
happens with this code: untested. So the trap entry may be stale.

Ticket 510 closed on 2026-10-11 and left this defect with no open ticket
(`grep -l -i 'nav bar' .scratch/carry-forward/issues/*.md` listed only
closed tickets). The trap entry's workaround is to make each element
`capture[0]` of its own entry.

## What would close this

- A `pnpm tab-review` run of a `pane: false` entry with a hover and two
  captures, with the command and its exit code recorded here. If the
  second PNG shows its target, the defect is gone: close this and remove
  or rewrite the known-traps entry. If it shows the nav bar, fix `clip()`
  or make the harness report an error in `index.json` when a clip does not
  contain its target, and re-run.
