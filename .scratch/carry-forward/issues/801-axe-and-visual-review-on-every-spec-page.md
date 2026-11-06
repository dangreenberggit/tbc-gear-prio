Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slicing, 2026-11-06, slice E)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 450

# The a11y scan and the visual-review capture see only one or two spec pages

## What happens today

- The layout gate's axe scan (the a11y ratchet) runs once on one fixture
  page after a run, `AXE_FIXTURE = "mock-set-bonus.json"` (a warrior
  fixture) (`scripts/tab-harness/test-layout.mjs:103`, `:563-571`,
  `:619`), plus a scan before a run at each width on `H.PAGE_PATH`, the
  ret page (`:6-12`, `:600`, `:608`).
- The visual-review capture opens only `H.PAGE_PATH`, the ret page
  (`scripts/tab-harness/test-review.mjs:252`).
- `PAGE_PATH_BY_SPEC` (`scripts/tab-harness/test-tab-harness.mjs:396-405`)
  maps ret, feral, warlock, enh, rogue, hunter, mage and warrior. It has no
  balance, shadow or elemental page.
- The made-up fixtures (`data/tab-fixtures/mock-*.json`, from
  `pnpm tab-fixtures:mock`) cover ret, mage, feral, rogue, hunter and
  warrior (`docs/live-runs/2026-11-03-p45-dps-pass.md:249-252`).

So an a11y violation or a visual defect on a caster's tab, or on any spec
page other than ret and warrior, is invisible to every gate. This is the
epic's bullet 2 (harness part) and bullet 3 (the a11y ratchet on each
in-scope spec's tab). Both edit `test-layout.mjs`, so they are one slice.

## What to do

Run the axe scan on each of the 11 spec pages that serve the 13 in-scope
specs (Survival and Arms use the hunter and warrior pages; owner ruling
2026-11-06 in epic 452's Notes). Run the visual-review capture on more
spec pages than ret; say which pages and why.

Use made-up fixtures only: owner ruling 2026-10-24, "tab page checks use
made-up results and no sim recordings" (epic 452 Notes). Add fixtures in
`packages/core/test/tab-fixtures/make-mock-fixtures.ts` for the pages that
have none.

A real a11y violation on a new page becomes a ticket, or an a11y baseline
entry that names a ticket. Do not fix it in this slice.

`pnpm merge-to-dev` runs the layout gate (`docs/workflow.md` § The loop),
so each extra page adds wall time to every merge. Measure the layout
gate's wall time before and after, and report both.

## Done when

The axe scan runs on each of the 11 spec pages. The visual-review capture
runs on more than the ret page. Each new violation has a ticket or a
baseline entry that names a ticket. The layout gate's wall time before and
after is in the branch's review file, and that review file exists.
