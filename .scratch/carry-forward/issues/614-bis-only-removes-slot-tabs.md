Status: closed
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

- [x] With BiS only ticked, every slot tab that is present with it unticked
      is still present.
- [x] A slot with no BiS-list row shows a dimmed tab with a "0" badge and an
      empty pane.
- [x] A unit test on the BiS-only view asserts both points above.

## 2026-10-11 — closed

Verified by: tbc-new-fork@22e7a8e71 ("Keep every slot tab under BiS only
(614)"), inside fork `176268e7c`, which `data/wowsims-fork.lock.json` names
on `feat/bis-rows`; review `docs/reviews/feat-bis-rows.md`. The tests are
"with BiS only, keeps every slot tab and counts only the BiS-list rows above
the cutoff" in `ui/features/upgrades/model/results_view.test.ts` and "under
BiS only keeps every slot tab, and dims a slot with no BiS-list row at (0)
over an empty pane" in
`ui/features/upgrades/components/ResultsPanes/ResultsPanes.test.tsx`.

Re-run from the pair's fork folder, `vendor/tbc-new-fork`:
`node node_modules/vitest/vitest.mjs run ui/features/upgrades/model/results_view.test.ts ui/features/upgrades/components/ResultsPanes/ResultsPanes.test.tsx`
(2 files, 39 tests passed on 2026-10-11 at fork `176268e7c`). The root
`pnpm verify` does not run these tests: `vitest.config.ts` excludes
`vendor/`.
