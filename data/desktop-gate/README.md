# Desktop gate goldens

`golden-<spec>-p<phase>-cap<N>.json` is a recorded ranking output from a
known-good run of the upgrades tab on the desktop (HTTP) transport. Check (h) of
`scripts/check_desktop_tab.py` compares every run against it.

## Which run is gated: ret, phase 4, from the P3 preset

The gate ranks **retribution at phase 4**, starting from the **`P3` gear
preset** (`--preset-tab "Phase 3" --preset P3`), capped at 40 candidates. The
golden is `golden-ret-p4-cap40.json`.

- **The rule.** A live run starts from the gear preset of the phase *before*
  the phase it ranks (owner rule, ticket 560 brief). Starting from the ranked
  phase's own best-in-slot gear would leave almost nothing to upgrade.
- **Why phase 4, not phase 5.** Until ticket 560 the gate ranked phase 5 with
  no preset (`golden-ret-p5-cap40.json`). Retribution has no phase-4 preset
  (`vendor/tbc-new-fork/ui/specs/paladin/retribution/presets.ts`: `P1`, `P2`,
  `P3`, `Bulwark`, `Pre-raid`), so phase 5 has no previous-phase start gear.
  The gate moved to phase 4, whose previous phase has `P3` (session ruling
  Q-560-desktop-phase). The phase-5 golden was removed; phase 5 is not gated.
- **Pinned counts.** Since ticket 505 the tab builds the ret-p4 pool at run
  time from the wowsims db (`<fork>/ui/features/upgrades/model/pool_source.ts`,
  ADR-0038). `POOL_CAP["ret"][4]` in `scripts/check_desktop_tab.py` is 1178,
  the pool with every source ticked, and `EXPECTED_ELIGIBLE["ret"][4]` is
  1121, the pool with the Sources dialog's "Heroic dungeon" entry unticked,
  which is the tab's default. Both sizes are pinned in the fork's
  `model/pool_source.cells.fixture.json` (`"ret-p4"`: include 1178, exclude
  1121), which `pool_source.test.ts` checks against db.json. Before ticket 505
  both constants were 917, the entry count of the bundled ret-p4 universe
  file, which no longer exists.
  `FULL_ROWS` has no phase-4 entry: the gate runs capped, and a capped run
  never reads it.
- **Pinned row count.** `CAPPED_ROWS["ret"][4][40]` is 40. The cap sims the
  first 40 candidates in EP order plus every worn item, and the Upgrades list
  pane leaves worn (owned) rows out, so the pane shows 40 minus the worn items
  inside the first 40. On this run none of the 16 worn items is inside the
  first 40. Measured on the desktop binary on 2026-10-15 (fork `2d168e74f`,
  readback `.scratch/stage-gate/tab-item-lists/readback-ret-p4-cap40.json`,
  gitignored). It was 39 (one worn item inside the first 40, measured
  2026-10-07, ticket 560 stage `desktop-gate.md`) until the ret-p4 pool grew
  from 523 to 838: ten new candidates entered the first 40 by EP and pushed
  out nine old candidates and that worn item. Re-measured 2026-10-16 after the
  pool grew to 917 (fork `8cd8d1c80`, readback
  `.scratch/stage-gate/tab-blocking-finish/readback-ret-p4-cap40.json`,
  gitignored): still 40. Re-measured 2026-10-18 on the run-time pool (fork
  `f06772929`, `eligibleCount` 1121): still 40. In the first 40, Kiss of the
  Spider (22954, a Naxxramas epic with a wowsims effect record) replaced Boots
  of Natural Grace (30041, still in the pool); every other row and
  `baselineDps` kept its value.
- **Where the run's values are explained.** The phase-4 golden's rows and
  `baselineDps`, against the old phase-5 golden, are explained in the commit
  that writes the golden and in the ticket-560 stage's `desktop-gate.md`.

## What check (h) compares

**Three fields are compared, exactly, with no tolerance:** `rows` (including
order), `aboveCutoffItems` (including order) and `baselineDps`. Everything else
in the file is provenance and is ignored by the comparison — the check is a
whitelist in code, so a field not named here is ignored whether or not this list
mentions it. Exact equality is safe because the per-candidate loop is
deterministic on one machine at fixed seeds; two cap-150 runs agreed on all 134
rows when the gate was written.

**A red gate is a finding, not a prompt to regenerate.** It means the tab's
output changed. Find out why before you touch this file.

**Regenerating is a deliberate act.** It is legitimate when a change is *meant*
to alter the output — a fork re-pin, a pool rule change, an intended ranking
change. Run `pnpm desktop-gate:check --update-golden`, read the diff it prints,
and commit the new file with the reason the output changed in the commit body.
The write is gated on checks (a)-(f) passing ((g) removed), which stops a
*broken* run (timeout, panic, wrong worker, wrong row count) from becoming a
golden. It does **not** stop a ranking regression: that preserves shape and
passes (a)-(f). The
only thing standing between a regression and a committed golden is you reading
the printed diff.

**Without a golden the gate exits 2** ("could not run") and names the missing
path. It never passes silently and never writes one on its own. `--full` skips
(h) — an uncapped golden would cost a full-pool run per regeneration.

**`forkCommit` and `cpuCount` are recorded so a mismatch is explainable.** The
native server splits each sim over `runtime.NumCPU()`, so a different core count
moves results in the last digits; the tab's renderer rounds displayed DPS to 0.1
(`formatDps` in `vendor/tbc-new-fork/ui/features/upgrades/utils/format.ts`), so the golden is portable across machines except at a
rounding boundary. A mismatch right after a re-pin or on a different machine
should be checked against these two fields first.

The gate is never run by CI, by `pnpm verify`, or by either git hook — its only
entry point is `pnpm desktop-gate:check`. A mismatch can only surface on a
developer's own machine, on demand, with the diagnostic in front of them.
