Status: open
Type: task
Origin: docs/reviews/fix-desktop-gate-twin-counts.md (Notes, N1)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 753, 854

# The desktop gate's pinned pool counts are not checked against the pool fixture

**Problem.** `GATED` in `scripts/check_desktop_tab.py` pins each spec's
`expected_eligible` and `pool_cap` by hand from the fork's
`ui/features/upgrades/model/pool_source.cells.fixture.json`. Nothing in
`pnpm verify` compares them: `pnpm desktop-gate:unit:check`
(`scripts/check_desktop_tab_verdict.py:93-101`) never reads the fixture. So
when fork `690fcdeb5` (ticket 753) dropped two items from every cell, the
gate kept the old sizes and the drift showed only when the owner ran the
gate by hand on 2026-11-17: (e) failed on all four specs with the right 40
rows (fixed on `fix/desktop-gate-twin-counts`).

**Done when.** `pnpm verify` fails when a `GATED` entry's `pool_cap` differs
from the fixture's include size for its cell, or its `expected_eligible`
differs from the exclude size minus the hand-rule counts named in its
comment. Show it failing first by changing one pinned number.
