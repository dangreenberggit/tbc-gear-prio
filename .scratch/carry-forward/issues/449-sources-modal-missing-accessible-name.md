Status: closed
Type: bug
Severity: blocking (a11y defect on shipped UI; RECLASSIFIED from non-blocking 2026-09-19 by owner)
Resolution: fixed in fork commit 27363b925 (2026-09-19), re-pinned in
  data/wowsims-fork.lock.json. BaseModal now gives a titled modal an
  aria-labelledby pointing at the title h5, clearing aria-dialog-name for every
  titled BaseModal. Proven by `pnpm tab-review` on the 447 manifest: the
  modal-open captures (447-c/447-e) no longer report aria-dialog-name. Review
  round 5 in docs/reviews/feat-tab-signoff-followups.md.
Origin: tab-438-impl execution (Unit 447 gate-visual a11y scan), 2026-09-19
Blocks: merge of feat/tab-signoff-followups
Blocked by: none
Related: 447 (the Sources popup that surfaced it), base_modal.tsx, data/wowsims-fork-a11y-baseline.json, 450 (the ratchet open-modal blind spot that let it merge-green)

> RECLASSIFICATION (2026-09-19): originally filed non-blocking. The owner
> corrected this: an a11y review that finds a serious axe violation
> (`aria-dialog-name`) on UI this branch ships is exactly what should block the
> merge — the "gate can't see closed modals" framing explains why the automated
> ratchet missed it (that is ticket 450), it does NOT make the shipped defect
> acceptable. This finding BLOCKS the merge of feat/tab-signoff-followups. Not
> being fixed this session by owner instruction ("fix nothing; reclassify and
> list"); it must be fixed (and re-tested through gate-visual) before the branch
> merges.


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
