Status: open
Type: latent defect
Origin: pre-merge review of `feat/upgrades-ui-pass`, adversarial F1 + domain note, 2026-08-23
Blocks: none
Blocked by: none

# Toggle visibility proxy is not a visibility test

Two related latent couplings in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(fork tip `a52fdf83`), found by the pre-merge review. Neither is exploitable
today; both fail silently if a future change breaks the assumption they lean
on.

## 1. `ToggleControl.visible` reads its own label's class only

`get visible()` returns `!label.classList.contains('d-none')`, but the whole
tab pane is hidden by an *ancestor*: `SimTab` adds `tab-pane fade` without
`active show` (`ui/core/components/sim_tab.ts:24-26`), and `addUpgradesTab()`
runs last (`individual_sim_ui.tsx:356`), so the pane is never `active` at
construction. While the tab is deselected, the label's own classList is
untouched and `visible` returns `true` for an off-screen control.

Not currently exploitable: `run()` has exactly two callers and a
`display:none` button cannot be clicked, so no invisible prune can apply. But
the doc comment sells `pruneEffective()` as a safety equivalent to the old
force-off, and it is weaker than advertised: any future programmatic `run()`
(hotkey, URL param, test harness) breaks it silently — a wrong candidate pool
with no error.

## 2. The ungated view reads rely on an unasserted invariant

`bisOnlyToggle.checked` (`applyBisFilter`) and `setPotentialToggle.checked`
(view options) deliberately read the checkbox without a visibility gate
(review-round-2 ruling G3: gating them would move the done-state sort key).
That is safe only because those controls are visible exactly when
`state.kind === 'done'` — enforced by the visibility refresh today, asserted
nowhere. If a future state gains a results view, the reasoning silently
lapses.

## Done when

Either `visible` composes ancestor visibility (e.g. `offsetParent !== null`
or an explicit pane-active check) or the doc comment stops claiming
equivalence with the force-off and states the two-caller assumption; and the
visible-iff-done invariant for the two view toggles is asserted (a dev-mode
assertion in the visibility refresh, or a comment at both read sites naming
the invariant and where it is enforced). Re-check:
`grep -n "classList.contains('d-none')" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`.
