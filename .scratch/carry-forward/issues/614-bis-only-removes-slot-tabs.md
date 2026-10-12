Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-blocking
Type: bug
Origin: code read of fork 316326a95, `ui/features/upgrades/model/results_view.ts` `slotTabs` / `bisOnlyView` (`bisOnlyView` added in fork `fac043c21`), 2026-10-11
Blocks: none
Blocked by: none
Related: 304 (item 10), 305

# BiS only removes slot tabs instead of showing them at (0)

## What the player sees

After a finished run, ticking "BiS only" removes the tab of every slot that
has no BiS-list item, such as Chest or Legs, so the slot strip gets shorter.
If that slot's tab was open, the pane falls back to the Upgrades list. The
fallback is read from fork `ui/features/upgrades/components/ResultsPanes/ResultsPanes.tsx:78-79`
and was not tried in a browser (untested).

The pre-React tab kept those tabs, dimmed, with a "(0)" badge, and the user
could still click them (ticket 304, item 10). Its comment, at fork
`cb561067:ui/core/components/individual_sim_ui/upgrades_tab.tsx:2703-2725`,
gives the rule: "a display filter must change which rows a pane shows, never
which panes exist".

## Evidence

On 2026-10-11 the session ran a throwaway vitest over the fork's
`RANKING_FIXTURE` (not committed; reported by the session, not re-run for
this ticket):

- BiS only off: tabs head, chest, legs, trinket1, mainhand.
- BiS only on: tabs head, trinket1, mainhand.

## Cause

In fork 316326a95, `ui/features/upgrades/model/results_view.ts`:

- `bisOnlyView` (`:105-109`) drops every row that is not on a BiS list from
  `view.rows`.
- `slotTabs` (`:35-45`) builds the tab list from `view.rows`, so a slot with
  no row left has no tab.

Tab existence must come from the unfiltered view, and the badge count from
the filtered one. The unit test for BiS only
(`results_view.test.ts:132-137`) checks rows and the below-cutoff count, but
never calls `slotTabs` under BiS only.

## Acceptance

- [ ] With BiS only ticked, every slot tab that is present with it unticked
      is still present.
- [ ] A slot with no BiS-list row shows a dimmed tab with a "0" badge and an
      empty pane.
- [ ] A unit test on the BiS-only view asserts both points above.
