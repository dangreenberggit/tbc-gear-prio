Status: closed
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 447 (the Sources modal), 449 (its a11y name), base_modal.tsx
Resolution: Fixed in fork commit af421fa53 chain (parent change in 85f0a545e /
  re-pin 80fc19f9, first attempted in 7cc65f572). The sources modal is parented
  to simUI.rootElem (.sim-ui), the parent the Batch tab uses, not #upgrades-tab.
  Live measurement showed #upgrades-tab is a .tab-pane fade whose opacity
  establishes a stacking context, trapping the dialog's z-index 1055 below the
  sticky header (100); .sim-ui is not a stacking context. Verified live at 1280:
  elementFromPoint at the header nav returns the modal, and every header-y overlap
  point is inside the dialog — the header no longer paints over it (live-verify 5b).

# Sources modal is too high, overlaps the navbar, and z-fights with navbar items

Owner report, 2026-09-20. The Sources modal sits too high on the page: it
overlaps the top navbar, and its z-index overlaps with the navbar items (they
show through / fight for stacking order).

## What would close this

- The open modal clears the navbar — positioned below it (or the backdrop/dialog
  stacks above the navbar cleanly), with no z-index fight against navbar items.
- Likely a positioning/z-index interaction between the tab-parented BaseModal
  (`.upgrades-sources-modal`) and the site navbar. The modal is parented inside
  the settings card (449 context) — check whether that parenting is what pulls it
  up under the navbar, and whether the fix belongs on the modal's own
  positioning/z-index rather than the shared BaseModal.
- Verify live on the Go backend: open the modal at desktop width, confirm no
  navbar overlap and correct stacking.
