Status: open
Type: task
Origin: .scratch/agent-reports/2026-11-06-general-task-452e-review-fixes.md (review fixes for docs/reviews/feat-452-spec-page-scans.md, finding A1)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 801

# The layout gate skips when one of a page's two fixtures fails to load

## What happens today

When any fixture is unmeasured and no check fails, `test-layout.mjs`
reports the outcome `unmeasured`, and `scripts/check_layout_gate.py`
(the skip branch near lines 776-785) prints `SKIPPED` and exits 0.
Since commit `891f03db`, check 23 fails when a spec page has no measured
fixture (`scripts/tab-harness/page-coverage.mjs`). A page with two
fixtures, where one loads and one does not, still passes check 23, so
the gate skips and the merge goes through with that fixture's case
never checked.

No page has two fixtures today (`data/tab-fixtures/README.md`), so this
cannot happen yet. It happens as soon as a second fixture is added for
any page.

## What to do

Make an unmeasured fixture on a full run block the gate, or say in
`check_layout_gate.py` why a skip is still right for that case.

## Done when

A full gate run with one fixture made unloadable on a page that has
another loaded fixture ends with `layout gate: FAILED`, or the skip is
kept with its reason written next to the skip branch.
