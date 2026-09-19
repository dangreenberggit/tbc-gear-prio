Status: open
Type: bug
Origin: tab-438-impl execution (Unit 447 gate-visual a11y scan), 2026-09-19
Blocks: none
Blocked by: none
Related: 447 (the Sources popup that surfaced it), base_modal.tsx, data/wowsims-fork-a11y-baseline.json, the visual+a11y reviewer (open-modal blind spot)

# Sources modal has no accessible name (aria-dialog-name, serious)

The 447 "Sources…" popup (a `BaseModal` with cssClass `filters-menu`) fires axe
`aria-dialog-name` (impact: serious) when OPEN — the dialog has no accessible name.
Surfaced by the tab-438-impl `gate-visual` a11y scan in the modal-open state
(447-c/447-e `a11y.json`). Not blocking 447: 447 is a presentation swap whose
acceptance sentence does not require a modal name, and the gating layout-gate a11y
ratchet passed (see the two points below).

## Two things this exposes

1. **A real a11y defect on a shipped control.** An open dialog with no name is a
   serious WCAG issue for screen-reader users. The fix likely belongs in
   `BaseModal` itself (set an `aria-label`/`aria-labelledby` from the modal title),
   which would also clear it for the gear picker's own `FiltersMenu` and every other
   BaseModal — a borrow-native fix, not a tab-local patch.

2. **A known blind spot in the a11y ratchet.** The layout-gate a11y scan
   (`test-layout.mjs`) only scans the CLOSED pre-run state, so a violation that only
   exists while a modal/overlay is open is invisible to the merge gate. The
   per-unit `tab-review` scan (which can open the modal) caught it, but that runs
   only inside stage-gate execution, not at merge. Consider teaching the layout
   gate to open the tab's overlays before scanning, or documenting the boundary.

## What would close this

- The Sources modal (and, if fixed in BaseModal, every BaseModal) has an accessible
  name; axe `aria-dialog-name` no longer fires when it is open. Verify with
  `pnpm tab-review` on a manifest whose 447 entry opens the modal and asserts the
  a11y.json for that state has no `aria-dialog-name` violation.
- Separately (or as its own ticket): decide whether the layout-gate a11y ratchet
  should cover open-overlay states, so this class is caught at merge.

## Where

`vendor/tbc-new-fork/ui/core/components/base_modal.tsx` (the likely fix site);
`vendor/tbc-new-fork/test-layout.mjs` (the ratchet blind spot).
