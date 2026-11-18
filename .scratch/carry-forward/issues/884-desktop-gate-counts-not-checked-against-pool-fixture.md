Status: closed
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

## Closed (2026-11-17, branch `fix/884-854-desktop-gate-counts`)

`GatedRun` now pins the hand-rule counts as `hand_rule_off_hand_only` and
`hand_rule_one_handers` (ret 30 and 74, mage 31 and 63, rogue and enh 0).
`scripts/check_desktop_tab_verdict.py` `pool_count_problems`, which runs in
`pnpm verify` (`desktop-gate:unit:check`), reads the pinned fork's
`ui/features/upgrades/model/pool_source.cells.fixture.json` and fails when a
`pool_cap` is not its cell's include size or an `expected_eligible` is not
the exclude size less the two hand-rule counts. It also checks that it
reports a cell one off. With no fork clone it prints a `skipped --` line and
checks nothing, as the other fork gates do (`scripts/_fork_gate.py`), so
`pnpm verify` refuses that skip locally unless `TBC_VERIFY_WITHOUT_FORK=1`;
with a clone whose HEAD is not the lock's commit it fails
(`require_pinned_fork`).

Verified by: `pnpm desktop-gate:unit:check`. With enh's `expected_eligible`
set back to the stale 1039 it printed `FAIL: enh: expected_eligible 1039,
fixture enh-p4 exclude 1037 - 0 off-hand-only - 0 one-handers = 1037`, rc 1;
with ret's `pool_cap` at 1175 and mage's off-hand count at 32 it named both;
on the committed pins it passes. The hand-rule counts and every cell size
were re-measured at fork `1410a775e` with `dbPoolFor` (probe in the main
checkout, gitignored: `.scratch/desktop-gate/worn-in-pool-probe/`).
