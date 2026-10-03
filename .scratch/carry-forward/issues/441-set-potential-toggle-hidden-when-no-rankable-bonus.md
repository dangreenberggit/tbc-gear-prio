Status: closed
Type: bug
Origin: owner viewing session, 2026-09-19
Blocks: none
Blocked by: none
Related: 419 (the set-potential feature), the view-controls visibility logic

# "Set potential" view toggle disappears when a run has no rankable set bonus

Owner report, 2026-09-19: after a run, the only View option shown was "BiS only"
— the "Set potential" toggle was gone entirely.

NOT a regression from the tab-ui-refinements batch. The toggle is hidden by
pre-existing logic: `upgrades_tab.tsx:1700`
`setPotentialControl.setVisible(items.some(i => hasRankableSetPotential(i, noiseFloorDps)))`
— introduced by fork commit `44c73690b` (the original set-potential feature),
which is OUTSIDE this batch's range. If no displayed row has a non-confounded
rankable set bonus, the toggle hides. The owner's run had no such row, so only
"BiS only" remained.

The UX problem: a control that silently vanishes based on results is confusing —
the user can't tell "off" from "not available", and expects it to be present.

## What would close this (owner to confirm the desired behavior)

Options, owner picks:
- Keep the toggle always visible but DISABLED (greyed) with a tooltip when no
  row has a rankable set bonus ("no set-bonus upgrades in these results").
- Or keep it always visible and enabled (toggling it just shows no change when
  nothing qualifies).
- Or keep the current hide behavior but confirm that's intended.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(~1691/1700, the `setPotentialControl.setVisible(...)` gating).

## Notes

New from the owner's 2026-09-19 viewing session. Pre-existing behavior, surfaced
now; a UX decision, not a broken-code fix. Next tab stage.

## Closed

Fixed in fork commits `e4e1c28b8` (original) + `6c08a6a56` (tooltip reword),
re-pinned at repo commit `aaa0e892` (fork tip `6c08a6a56`). After a run with no
rankable set bonus the Set-potential toggle stays visible but disabled (native
`Input.update()` disabled state via `enableWhen`, with the tippy content swapped
to a reason), instead of vanishing. Disabling forces the value off so a stale
"on" cannot hide rows. On owner feedback the disabled tooltip was reworded in
user terms; final string is owner-pick (placeholder shipped: "No upgrades here
gain a set bonus."). Desktop gate golden unchanged; verify rc=0.
