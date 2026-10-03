Status: closed
Type: task
Origin: owner walkthrough, Upgrades-tab UI pass, 2026-09-20
Blocks: none
Blocked by: none

# "View options" checkbox grouping unclear

Root cause: the "View options" heading was a flex sibling separated from its
controls by a `--spacer-2` gap, which is narrower than the `--spacer-3` gap
used between controls themselves — so the heading read as closer to the
previous group than to its own controls. The heading also never got bold
weight, because the `.content-block-header` idiom puts bold on a nested
`.content-block-title` element that this markup omits.

Owner chose to keep the heading inline and add spacing rather than restructure
the markup. Fix: `.upgrades-view-controls-title` gets `font-weight: bold`,
`padding-right: --spacer-3`, and a `border-right` divider; the divider drops
below the md breakpoint (767px) where the row wraps.

Verified the gap flip (heading gap 22px, wider than the 14px control-to-control
gap), bold weight 700, and the divider suppressed on wrap, both from live
worker numbers and an isolated render.

Fork commit `204193631`. Main-repo pin commit `29f3add5`. `pnpm verify` green.
This is residual polish on ticket 312's "View options" group; 312 stays closed.

## Comments

2026-09-21: filed retroactively; number was used in the re-pin commit before the file existed.
