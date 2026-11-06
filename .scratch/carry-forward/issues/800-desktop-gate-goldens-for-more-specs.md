Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slicing, 2026-11-06, slice C)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 746, 820, 821

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
meta-gem repair at the hit cap (ticket 746) and a caster's gear and pool
in the two-hander hold-out (closed ticket 700).

The owner's 2026-11-06 ruling on Q-452-golden and the answer to it are in
epic 452's Notes: the gate is a sim-output test, so the golden part of the
epic's bullet 2 stays open, with goldens for more specs.

## What to do

Add goldens for representative specs: at least one caster, one more melee
spec, and a "hybrid". The epic does not define hybrid. Choose the specs and
define hybrid yourself, with reasons in this ticket; this is not a question
for the owner. One proposal (hypothesis, untested): mage or balance for the
spell hit cap and the caster two-hander hold-out, rogue for dual wield and
a different melee hit cap, enhancement as the hybrid.

For each new spec:

- Start preset at phase 4: the p45 run table
  (`docs/live-runs/2026-11-03-p45-dps-pass.md:85-105`), which already
  follows the previous-phase rule.
- Cap: 40, as for ret.
- `EXPECTED_ELIGIBLE` and `POOL_CAP`: derive each from the fork's
  `ui/features/upgrades/model/pool_source.cells.fixture.json` and the
  rules the ret comment names (`check_desktop_tab.py:110-133`), and write
  the derivation in a comment as ret's does. Do not copy a value from the
  run being checked: that tests the code against itself.
- `CAPPED_ROWS`: measured on the desktop binary, as ret's was, then
  explained in a comment the way ret's is (`:143-155`).
- Pages with no phase tabs (balance, shadow, elemental, warlock, rogue,
  enhancement) take no `--preset-tab` (`scripts/tab-harness/run-tab-cdp.mjs:54-57`),
  but the gate always passes one (`check_desktop_tab.py:271-282`); change
  that for those specs.
- The golden: `pnpm desktop-gate:check --spec <spec> --update-golden`
  (`check_desktop_tab.py:41`), after reading the printed diff
  (`data/desktop-gate/README.md` § Regenerating a golden).

Make one command check every committed golden. Extend the verdict unit
tests (`scripts/check_desktop_tab_verdict.py`) to cover the multi-spec
tables. Update `data/desktop-gate/README.md` and the desktop-gate paragraph at
the end of `docs/agents/upstream-catch-up.md` § 5 (Re-pin the fork), which
named only the ret golden.

Fix this mismatch on the way. `data/desktop-gate/README.md:24-26` says
`EXPECTED_ELIGIBLE["ret"][4]` is 1118. The code has 1014
(`scripts/check_desktop_tab.py:132`), and its comment (`:121-127`) derives
1014 as 1118 minus 30 off-hand-only items and 74 one-handed weapons, which
the worn-gear hand rule leaves out while the P3 preset wears a two-hander
(fork commits 213fc11db and 5ec8def25). Reading of the two texts: the
README was not updated when the hand rule came in (hypothesis, untested).

Slice D (ticket 746) branches off this branch, so its golden diffs show
what 746 changes per spec.

## Cost to state in the merge account

The gate is not in `pnpm verify`. It runs by hand before a fork re-pin that
`dev` will receive (`scripts/check_desktop_tab.py:30`;
`docs/agents/upstream-catch-up.md:96` and the desktop-gate paragraph at the
end of § 5, Re-pin the fork). Each new golden adds
a run to that step. The ret cap-40 run took `elapsedS: 13` (golden file);
measure and report the wall time of each new golden.

## Done when

Goldens for at least one caster and one more melee spec are committed, and
hybrid is defined (with a golden, or with the reason none is needed). One
command checks every golden and passes twice in a row. The verdict unit
tests cover the multi-spec tables. The README states the same numbers as
the code. The branch's `pre-merge-review` file exists.

## Comments

2026-11-06, branch `feat/452-desktop-goldens`, fork `b603564ee` (the pin).

**Specs chosen.** Three new goldens: mage, rogue and enhancement (spec ids
`mage`, `rogue`, `enh`), beside ret. The evidence:

- **Caster: mage.** It has a spell hit cap (`cap-profile.ts` `mage`, 16%, with
  Arcane Focus as its hit talent) and no `repairCap`, so slice D (746) can
  change it. Its phase-4 start preset, "Arcane - Staff", wears 32374
  Zhar'doom, a two-hander, so the run holds out 31 off-hand-only items and 63
  one-handers: the caster two-hander case of ticket 700. Balance and warlock
  also wear that staff. Balance's eligible count shows a hold-out too, of a
  different size: 841 in its exclude pool (fixture `balance-p4`), 737
  eligible (`docs/live-runs/2026-11-03-p45-dps-pass.md:85`), so 104 held out
  against mage's 94.
  Mage's spell hit weight is higher than balance's in the weights the tab
  reads (fork `ui/features/upgrades/model/data/`, imported by `data.ts:16,21`):
  stat 12 is 2.36 in `mage-fallback.ep-weights.json` and 1.76 in
  `balance-fallback.ep-weights.json`, so a hit-cap change is likelier to move
  a mage row (hypothesis, untested). The gate starts mage from a phase tab, as ret does;
  rogue and enhancement cover pages without one.
- **Melee: rogue.** Physical only, dual-wields (`pool.ts` `DUAL_WIELD_SPECS`),
  and its page has no phase tabs, so it covers the gate's new no-`--preset-tab`
  path. It is a dual-wield spec with no `repairCap`, which slice D needs.
- **Hybrid: enhancement.** Hybrid here means a spec whose EP weights value
  both spell damage and physical stats, so items of both kinds compete in one
  ranking. By that reading of the weights the tab reads (fork
  `ui/features/upgrades/model/data/`, imported by `data.ts:16-26`) the
  hybrids are ret (spell damage 0.17 beside attack power 0.41,
  `ret-p2.ep-weights.json`) and enhancement (spell damage 0.56, nature damage
  0.4 and intellect 0.08 beside attack power 1.0, `enh-fallback.ep-weights.json`).
  Hunter's weights (`hunter-fallback.ep-weights.json`) give intellect 0.01
  and no spell damage, so it is not a hybrid by this reading. Ret already had a golden, but it wears a
  two-hander; enhancement adds the dual-wield hybrid. Its cap-40 golden turned
  out to hold main-hand weapons only (tickets 820 and 821), including
  spell-damage weapons, so it does not check how a dual-wielder's off-hand
  items are priced. Rogue's golden holds the off-hand rows (3 of its 33).

**Numbers** (derivations in the comments of `scripts/check_desktop_tab.py`):

| Spec | Start preset | `expected_eligible` | `pool_cap` | `capped_rows` at 40 |
| ---- | ------------ | ------------------- | ---------- | ------------------- |
| mage | Phase 3 / Arcane - Staff | 610 - 31 - 63 = 516 | 640 | 38 |
| rogue | (no tab) / P3 Swords | 826 | 867 | 33 |
| enh | (no tab) / P3 Preset | 1039 | 1092 | 40 |

The exclude and include sizes are the fixture's `mage-p4`, `rogue-p4` and
`enh-p4` cells. The hand-rule counts come from listing each exclude pool with
the fork's `testing/db_pool.ts` `dbPoolFor(spec, 4, "exclude")` and reading
each weapon's `handType` in db.json; the same count gives ret's 30 and 74.
The eligible counts were derived from the fixture and db.json before this
branch's gate runs, and matched them. They were not new numbers: the
2026-11-03 p45 table had already published 516, 826 and 1039 from that
pass's runs (`docs/live-runs/2026-11-03-p45-dps-pass.md:87,99,103`).
`capped_rows` is measured.

**Wall time** (`python3 scripts/check_desktop_tab.py`, the command
`pnpm desktop-gate:check` runs, one invocation, build included, 20 cores; the
agent's sandbox needed `PLAYWRIGHT_BROWSERS_PATH` set to the headless-shell
copy of Chrome at
`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/pwshim`,
or the harness failed with `cdp timeout`,
`.scratch/agent-reports/800-runs/measure-1.log`): 91 s and 90 s on two runs. Per spec, the gate's own lines: ret 18 s,
mage 15 s, rogue 32-33 s, enh 24 s. So the three new goldens add about 72 s to
the re-pin step.

**Done-when status.** Goldens for a caster and a second melee spec are
committed; hybrid is defined, with a golden. `pnpm desktop-gate:check` checks
every committed golden and passed twice in a row (rc 0 both times, every spec
PASS on (a)-(f) and (h)). `check_desktop_tab_verdict.py` covers the
multi-spec tables. The README points to the code's numbers (`GATED` in
`scripts/check_desktop_tab.py`) instead of copying them. That meets "The
README states the same numbers as the code": the README states none of the
current counts, so none
can differ. Left: the branch's
`pre-merge-review` file, which the session that runs the review writes.
