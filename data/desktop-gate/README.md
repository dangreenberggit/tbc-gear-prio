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
- **Pinned counts.** `EXPECTED_ELIGIBLE["ret"][4]` and `UNIVERSE_CAP["ret"][4]`
  in `scripts/check_desktop_tab.py` are 523, the entry count of the ret-p4
  universe, measured before any run with
  `node -e "console.log(require('<fork>/ui/features/upgrades/model/data/ret-p4.universe.json').entries.length)"`.
  Neither the phase filter nor the Kael exclusion removes a ret-p4 entry, so a
  run with the tab's default settings should report `eligibleCount` 523.
  `FULL_ROWS` has no phase-4 entry: the gate runs capped, and a capped run
  never reads it.
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
to alter the output — a fork re-pin, a universe regen, an intended ranking
change. Run `pnpm desktop-gate:check --update-golden`, read the diff it prints,
and commit the new file with the reason the output changed in the commit body.
The write is gated on checks (a)-(g) passing, which stops a *broken* run
(timeout, panic, wrong worker, wrong row count) from becoming a golden. It does
**not** stop a ranking regression: that preserves shape and passes (a)-(g). The
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
