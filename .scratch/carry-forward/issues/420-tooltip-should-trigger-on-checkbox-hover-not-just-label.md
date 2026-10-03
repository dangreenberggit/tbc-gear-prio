Status: closed
Closed: f546dc0b3
Type: bug
Origin: owner report, 2026-09-18 (viewing the running tab)
Blocks: none
Blocked by: none
Related: 328 (native control styling; the tooltip idiom)

# Set-potential tooltip only shows on the label, not the checkbox

Owner report on the Upgrades tab. The explanatory tooltip on the "Set potential"
control only appears when hovering the **label text**, not when hovering the
**checkbox** itself. Hovering the checkbox — the thing a user actually points at —
shows nothing.

## What the owner wants

The tooltip should trigger on hover over the whole control, checkbox included.
Owner's suggested approach: make the **containing div** the hover/tooltip target
so both the checkbox and its label share one hover region.

## What would close this

- Hovering anywhere over the set-potential control (checkbox or label) shows the
  tooltip. Verify by hovering the checkbox specifically and seeing the tooltip
  appear.
- Applies to the other view toggles with tooltips too (BiS only, etc.) if they
  share the same pattern — check and fix consistently.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the `labelTooltip` / tippy attachment, ~`:759`; the `ViewToggle` control
wrapper). The tippy target is currently the label; move it to the containing
element so the whole control is the trigger. Match the site's native tooltip
idiom (tippy is already a dependency).

## Notes

New from the owner's sign-off pass, 2026-09-18. Ties to 328's control-styling
family; the tooltip wording itself is unchanged here — this is purely the hover
target.

## Closed

Fork commit 7ad068cd2 (re-pinned at f546dc0b3, Unit A). `ViewToggle` no
longer passes `labelTooltip` into its `BooleanPicker` (which `Input` would
attach to the `<label>` alone, input.tsx:91-93); instead it calls
`tippy(this.picker.rootElem, { content })` after construction, so the whole
`.form-check` wrapper (checkbox + label) is one hover region. Tooltip text
unchanged.

Verified-by: `grep -n 'labelTooltip' upgrades_tab.tsx` shows it only inside
`ViewToggle`'s config type and where the tippy is attached to `rootElem`, not
passed to the picker. The set-potential control is the one live user (its
`labelTooltip` string). Owner to eyeball the hover over the checkbox itself at
sign-off.
