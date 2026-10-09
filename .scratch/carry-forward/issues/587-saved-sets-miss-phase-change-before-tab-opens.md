Status: open
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
