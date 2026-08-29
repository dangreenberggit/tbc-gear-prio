Status: open
Type: refactor
Origin: Gate C (upgrades-css-controls-copy stage-gate) + round-6 pre-merge review (spec axis), 2026-08-29; feat/upgrades-dedup-wowsims
Blocks: none
Blocked by: none

# Adopt the native BooleanPicker idiom for the two Upgrades view checkboxes

Ticket 328 asked the "Set potential" and "BiS only" checkboxes to match native
wowsims styling. The css-controls plan (Step 2(2)) offered two paths: render them
via the native `BooleanPicker` component (`inline: true`, precedent
`log_runner.tsx:79-89`), OR remove the SCSS rule that inflated the native inputs
to 40px below md.

## What landed vs. what is deferred

The executor took the **low-risk path**: deleted the 40px inflation rule in
`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`,
so the checkboxes now render at the native 28×28 at all widths. This meets the
ticket's **visible** goal (28×28, no longer oversized) and was accepted at Gate C
and confirmed plan-sanctioned by the round-6 spec axis (not a silent drop).

The **idiom** goal is deferred: the checkboxes are still hand-rolled
`<label><input class="form-check-input">` in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(~609-626), not native `BooleanPicker` components. The full rewrite was judged to
cross the step boundary — it reworks imperative pane-driven visibility (4
`setVisible` sites), the `.checked` reads (4 sites), the qualifier `setText`, and
the `render()` wiring, with no test coverage over that view-state machine.

## What a fix would do

Render the two checkboxes as native `BooleanPicker(inline: true)` components,
preserving the existing `ToggleControl`/event wiring and the `bisOnlyText`
qualifier span, so they carry the native `.form-check` layout by construction
rather than by a hand-rolled label matching it. Verify the run-settings toggles'
pattern (the precedent) and re-check rendered sizing at 375/653/768/1280 stays
28×28. Fork-only, non-ported — no drift cycle; fork commit + re-pin.
