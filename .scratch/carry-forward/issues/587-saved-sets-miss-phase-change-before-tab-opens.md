Status: closed
Type: task
Origin: docs/reviews/feat-tab-settings-persist.md
Blocks: none
Blocked by: none
Related: 564, 586

# Saved set selection misses a phase change made before the tab opens

## What is wrong

Since fork `56c87e6ed` the Upgrades tab's store starts from the saved entry,
`defaultsFor` (the `spec:phase` the default sets were applied for) included.
The store, and its phase subscription `followPhase`
(`ui/features/upgrades/model/follow_phase.ts`), is made only when the tab
first opens (`hooks/useUpgradesStore.ts` `upgradesStoreFor`; the tab body is
lazy, `ui/app/tabs/UpgradesTabBody.tsx`). Before this change a fresh store
applied the defaults on every page load.

Trigger (Adversarial A1): the saved entry holds
`{ defaultsFor: 'feral:3', selectedSetKeys: [] }` because the user cleared the
default sets. Reload, change the phase 3 to 4 and back to 3 on another tab,
then open Upgrades. `applyDefaults` returns early because the key matches
(`model/settings_reducer.ts`, `if (state.defaultsFor === action.key)`), so
the tab shows no sets. Ticket 564 (review K2-1) says a phase change resets the
tab to that phase's defaults "whether or not the tab is on screen". A single
phase change (3 to 4) is handled, because the key differs.

## Related, same cause

- **A3, hypothesis, untested:** if the tab is opened before
  `sim.waitForInit()` then `loadSettings()` finishes
  (`ui/app/individual_sim_ui.tsx`, near line 135) and the saved phase differs
  from the starting one, `followPhase` sees that load as a phase change,
  dispatches `scopeChanged`, clears the restored sets and `defaultsFor`, and
  saves the cleared state.
- **D2:** if a pool-data update removes a source while the scope still
  matches, the stale source key stays saved. The pool ignores it, but the
  Sources summary counts it ("1 of m sources excluded",
  `components/SourcesDialog/SourcesButton.tsx`).
- **A4:** no test reloads after a phase change, and none checks that
  `scopeChanged` is saved.

## Done when

The saved selection agrees with ticket 564's rule for a phase change made
before the tab opens (for example, the store follows the phase from page
start, or the saved entry records the phase it was saved under and a
mismatch on open goes back to defaults), A3 is tested or ruled out, stale
source keys are dropped on open, and a test covers a reload after a phase
change.

## Closing note (2026-10-09, feat/tab-settings-persist, review fix round)

Fork `b2f9293a2`, pinned by this commit's `data/wowsims-fork.lock.json`.

A1: `model/phase_changes.ts` records the page's phase changes, started at
page start by the eager `ui/app/tabs/UpgradesTabBody.tsx`. `followPhase`
replays the changes made before the store existed, in order. A phase change
while the tab is closed also imports the store, so the reset is saved even if
the tab never opens on that page. `UpgradesTabBody.test.tsx` "selects the
phase's default sets for a phase change made before the tab opens, even one
back to the saved phase" and "saves that reset for the next page load when
the tab is never opened" both failed before the change and pass after.
`lazy_load.test.ts` now allows `model/phase_changes.ts` as the one static
import from outside the feature and checks that it imports nothing else from
the feature.

A3: the test came first. `useUpgradesStore.test.ts` "keeps the restored sets
when the tab opens before the page has loaded its saved phase (A3)" opens the
store before `waitForInit` resolves, with the page's load queued on that
promise first as `app/individual_sim_ui.tsx` queues it. Against the
`c7f739d06` code it failed: the sets came back `[]` and `defaultsFor`
undefined. So the fault is real for that order. The record now starts after
`waitForInit`, and the test passes. Whether a user can open the tab before
`waitForInit` resolves is untested.

A4: `useUpgradesStore.test.ts` "saves a phase change, so a reload at the new
phase starts from that phase's defaults (A4)". It passed when written; it
covers the gap.

D2: after the page loads, `followPhase` drops an exclusion that the current
phase's pool no longer offers (`dropUnofferedSources` in
`settings_reducer.ts`). `useUpgradesStore.test.ts` "drops a saved exclusion
the page's pool no longer offers once the page has loaded (D2)" failed before
the change and passes after.

Live check on :5173 (ret page): with the tab never opened, a phase change
3 to 4 to 3 in the item picker saved the reset at once; after a reload the
tab showed phase 3's default set, not the saved one. A plain reload kept the
saved sets. Log: `.scratch/tab-settings-persist/r2-live-reload.log`
(gitignored), steps 3 and 9.
