Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slicing, 2026-11-06, slice C)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 746

# The desktop gate checks the ranking output of ret only

## What happens today

`pnpm desktop-gate:check` (`scripts/check_desktop_tab.py`) runs the tab on
the packaged desktop binary and, in check (h), compares the run's `rows`,
`aboveCutoffItems` and `baselineDps` exactly against a committed golden.
The docstring calls (h) "the only automatic check on DPS values, row order
and the above-cutoff set". The one golden is
`data/desktop-gate/golden-ret-p4-cap40.json`, and every per-spec table in
the script holds only ret: `START_PRESET` (`:108`), `EXPECTED_ELIGIBLE`
(`:132`), `POOL_CAP` (`:133`), `CAPPED_ROWS` (`:155`). The script already
takes `--spec` (`:670`).

So a change that moves another spec's DPS values or row order passes the
gate. Spec-specific paths that a ret golden cannot reach include the
meta-gem repair at the hit cap (ticket 746) and the two-hander hold-out on
caster tabs (closed ticket 700).

The owner's 2026-11-06 ruling on Q-452-golden and the answer to it are in
epic 452's Notes: the gate is a sim-output test, so the golden part of the
epic's bullet 2 stays open, with goldens for more specs.

## What to do

Add goldens for representative specs: at least one caster, one more melee
spec, and a "hybrid". The epic does not define hybrid. Choose the specs and
define hybrid yourself, with reasons in the ticket; this is not a question
for the owner. One proposal (hypothesis, untested): mage or balance for the
spell hit cap and the caster two-hander hold-out, rogue for dual wield and
a different melee hit cap, enhancement as the hybrid.

Start presets per spec at phase 4 are in the p45 run table
(`docs/live-runs/2026-11-03-p45-dps-pass.md:85-105`). Pool sizes per spec
are pinned in the fork's `ui/features/upgrades/model/pool_source.cells.fixture.json`.

Make one command check every committed golden. Extend the verdict unit
tests (`scripts/check_desktop_tab_verdict.py`) to cover the multi-spec
tables. Update `data/desktop-gate/README.md`.

Fix this mismatch on the way. `data/desktop-gate/README.md:24-26` says
`EXPECTED_ELIGIBLE["ret"][4]` is 1118. The code has 1014
(`scripts/check_desktop_tab.py:132`), and its comment (`:121-127`) derives
1014 as 1118 minus 30 off-hand-only items and 74 one-handed weapons, which
the worn-gear hand rule leaves out while the P3 preset wears a two-hander
(fork commits 213fc11db and 5ec8def25). Reading of the two texts: the
README was not updated when the hand rule came in (hypothesis, untested).

## Cost to state in the merge account

The gate is not in `pnpm verify`. It runs by hand before a fork re-pin that
`dev` will receive (`scripts/check_desktop_tab.py:30`;
`docs/agents/upstream-catch-up.md:96` and `:446-455`). Each new golden adds a run to
that step. The ret cap-40 run took `elapsedS: 13` (golden file); measure
and report the wall time of each new golden.

## Done when

Goldens for at least one caster and one more melee spec are committed, and
hybrid is defined (with a golden, or with the reason none is needed). The
gate passes on every golden from one command, and a second run matches.
The verdict unit tests cover the multi-spec tables. The README states the
same numbers as the code. The branch's review file exists.
