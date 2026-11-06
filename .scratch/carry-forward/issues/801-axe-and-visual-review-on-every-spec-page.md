Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slicing, 2026-11-06, slice E)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 450

# The a11y scan reaches two spec pages, and three spec pages have no fixture page

## What happens today

- The layout gate's axe scan (the a11y ratchet) runs before a run at each
  width on `H.PAGE_PATH`, the ret page (`scripts/tab-harness/test-layout.mjs:6-12`,
  `:600`, `:608`), and after a run on one fixture only,
  `AXE_FIXTURE = "mock-set-bonus.json"` (a warrior fixture), at width
  `POST_RUN_AXE_WIDTH` (`:81`, `:103`, `:563-571`, `:619`).
- The layout checks themselves run on each fixture's own spec page
  (`test-layout.mjs:13-16`).
- The visual-review capture's before-run state opens only the ret page
  (`scripts/tab-harness/test-review.mjs:13`, `:252`); its after-run states
  open each fixture's own spec page (`:240-249`).
- `PAGE_PATH_BY_SPEC` (`scripts/tab-harness/test-tab-harness.mjs:396-405`)
  maps ret, feral, warlock, enh, rogue, hunter, mage and warrior. It has no
  balance, shadow or elemental page.
- The made-up fixtures (`data/tab-fixtures/mock-*.json`, from
  `pnpm tab-fixtures:mock`) cover ret, mage, feral, rogue, hunter and
  warrior (`docs/live-runs/2026-11-03-p45-dps-pass.md:243-245`).

So an a11y violation on any spec page other than ret and warrior is
invisible to every gate, and balance, shadow, elemental, warlock and
enhancement pages get no layout check or capture at all. This is the
epic's bullet 2 (harness part) and bullet 3 (the a11y ratchet on each
in-scope spec's tab). Both edit `test-layout.mjs`, so they are one slice.

## What to do

Run the after-run axe scan, at `POST_RUN_AXE_WIDTH`, on each of the 11
spec pages that serve the 13 in-scope specs (Survival and Arms use the
hunter and warrior pages; 452 Notes, 2026-11-06). The before-run scan may
stay on ret. Add page paths for balance, shadow and elemental, and add
fixtures in `packages/core/test/tab-fixtures/make-mock-fixtures.ts` for
the five specs that have none, so the layout checks and the after-run
capture reach every page too.

Use made-up fixtures only: owner ruling 2026-10-24, "tab page checks use
made-up results and no sim recordings" (epic 452 Notes).

A real a11y violation on a new page becomes an entry in the a11y baseline
(`TBC_A11Y_BASELINE`) that names a new ticket. Do not fix it in this
slice.

`pnpm merge-to-dev` runs the layout gate whenever the tab layout source
changed since its last green run (`scripts/check_layout_gate.py`,
`run()`), so each extra page adds wall time to those merges. Time
`pnpm layout-gate:check` once before and once after the change, and
report both.

## Done when

The after-run axe scan runs on each of the 11 spec pages, and the layout
checks and the after-run capture reach each of them. Each new violation
has a baseline entry that names a ticket. Both wall times are in the merge
account, and the branch's `pre-merge-review` file exists.
