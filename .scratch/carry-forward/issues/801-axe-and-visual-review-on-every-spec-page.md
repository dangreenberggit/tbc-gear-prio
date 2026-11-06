Status: closed
Verified by: `python scripts/check_layout_gate.py` on tbc-gear-prio@eee6cb82 (all 11 fixtures measured, `PASS (23)`, `layout gate: PASSED`); review `docs/reviews/feat-452-spec-page-scans.md` § Merge account
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
the five specs that have none, so the layout checks reach every page
too. Today a fixture stands for "one UI difference we expect between
specs" (`make-mock-fixtures.ts:4-5`, `data/tab-fixtures/README.md:5-7`);
fixtures per page change that design, so update both texts. Then run
`pnpm tab-review` once with a manifest that names a fixture on each of
the 11 pages, and link the captures in the merge account.

Use made-up fixtures only: owner ruling 2026-10-24, "tab page checks use
made-up results and no sim recordings" (epic 452 Notes).

A real a11y violation on a new page becomes an entry in the a11y baseline
(`TBC_A11Y_BASELINE`) that names a new ticket. Do not fix it in this
slice. A baseline entry matches on rule and selector, not page, so it
accepts that violation on every page; say so in the ticket.

`pnpm merge-to-dev` runs the layout gate whenever the tab layout source
changed since its last green run (`scripts/check_layout_gate.py`,
`run()`), so each extra page adds wall time to those merges. The gate
skips on an unchanged tree, so time one full run after the change and
report the time per fixture page from its output, and the total.

## Done when

The after-run axe scan and the layout checks run on each of the 11 spec
pages, and one `tab-review` run captured each of them. Each new violation
has a baseline entry that names a ticket. The gate's wall time is in the
merge account, and the branch's `pre-merge-review` file exists.
