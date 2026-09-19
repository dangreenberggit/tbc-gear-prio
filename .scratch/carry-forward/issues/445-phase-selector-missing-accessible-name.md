Status: open
Type: bug
Origin: a11y baseline seed run, 2026-09-19 (stage visual-a11y-reviewer)
Blocks: none
Blocked by: none
Related: data/wowsims-fork-a11y-baseline.json

# Phase selector `<select>` has no accessible name (select-name, critical)

axe rule `select-name` (impact **critical**, WCAG 4.1.2) fires on the phase
selector in the Upgrades tab's run settings. The seed run at fork `9b407a5f3`
reported it once, at 1280.

- **rule:** select-name -- https://dequeuniversity.com/rules/axe/4.13/select-name
- **impact:** critical
- **selector:** `#phase-selector`
- **failureSummary:** "Element does not have an implicit (wrapped) <label>;
  ... an explicit <label>; aria-label attribute does not exist or is empty;
  aria-labelledby ..." -- a screen reader reads the control with no name.

Note on ownership: the `<select id="phase-selector">` is built by the **upstream**
`makePhaseSelector` (vendor/tbc-new-fork/ui/core/components/inputs/other_inputs.ts),
mounted by the tab at upgrades_tab.tsx:1035 into `phaseSelectorRef`. It is not
the tab's own markup, so the "borrow native, don't re-mirror" rule applies: the
tab should not fork the upstream widget. This is filed (not wontfixed) because
the plan seeds a ticket for every non-contrast violation and the defect is real
on the tab; the engineering team decides the disposition.

## What would close this

Add an accessible name at the tab's mount site without forking the upstream
component -- e.g. an `aria-label` on the mounted `<select>` after
`makePhaseSelector(...)` (upgrades_tab.tsx:1035), or a visible `<label
for="phase-selector">`. If upstream is later fixed, close this instead. Re-seed
the a11y baseline and remove the `#phase-selector` entry.
