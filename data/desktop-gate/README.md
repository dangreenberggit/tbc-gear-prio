# Desktop gate goldens

`golden-<spec>-p<phase>-cap<N>.json` is the recorded ranking output of one run
of the upgrades tab on the desktop (HTTP) transport, one file per gated spec.
The run passed checks (a)-(f); the file does not say its ranking is right (see
"Known defects of a golden" below). Check (h) of `scripts/check_desktop_tab.py`
compares each spec's run against its file.

## Which runs are gated: four specs at phase 4, cap 40

`pnpm desktop-gate:check` runs every spec in the table, one after the other, on
one build and one server; `--spec <id>` runs one. The spec ids are the fork's
(`model/engine/types.ts` `SpecId`). Every number here is pinned in
`scripts/check_desktop_tab.py` (`START_PRESET`, `SPEC_PAGE`,
`EXPECTED_ELIGIBLE`, `POOL_CAP`, `CAPPED_ROWS`), whose comments give the
derivations, and `pnpm desktop-gate:unit:check` fails when a gated spec lacks
a pin or a golden, or a golden on disk belongs to no gated spec.

| Spec id | Page                        | Start preset (`--preset-tab` / `--preset`) | `EXPECTED_ELIGIBLE` | `POOL_CAP` | `CAPPED_ROWS` at 40 | Wall time of one run |
| ------- | --------------------------- | ------------------------------------------ | ------------------- | ---------- | ------------------- | -------------------- |
| ret     | `/tbc/paladin/retribution/` | `Phase 3` / `P3`                           | 1014                | 1175       | 40                  | 18 s                 |
| mage    | `/tbc/mage/dps/`            | `Phase 3` / `Arcane - Staff`               | 516                 | 640        | 38                  | 15 s                 |
| rogue   | `/tbc/rogue/dps/`           | none (no phase tabs) / `P3 Swords`         | 826                 | 867        | 33                  | 33 s                 |
| enh     | `/tbc/shaman/enhancement/`  | none (no phase tabs) / `P3 Preset`         | 1039                | 1092       | 40                  | 24 s                 |

The wall times are the gate's own per-spec lines (harness start to verdict) on
2026-11-06, fork `b603564ee`, 20 cores. The whole command, build included, took
90-91 s. Those runs were in an agent's sandbox, where the harness failed with
`cdp timeout` until `PLAYWRIGHT_BROWSERS_PATH` pointed at a headless-shell
copy of Chrome,
`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/pwshim`
(gitignored, on that machine only).

- **Why these specs.** Ret was the only gated spec until ticket 800. Mage is the
  caster: spell hit cap, and its start preset wears a staff, so the tab holds
  out off-hand items and one-handers for a caster (ticket 700). Rogue is a
  physical melee spec that dual-wields, on a page with no phase tabs.
  Enhancement is the hybrid: a spec whose weights value both spell damage and
  physical stats, and it dual-wields. The weights are the ones the tab reads,
  `enh-fallback.ep-weights.json` (fork `ui/features/upgrades/model/data/data.ts:18,48`):
  spell damage 0.56, nature damage 0.4 and intellect 0.08 beside attack power
  1.0.
  Ret also values spell damage, but wears a two-hander. Ticket 800 has the
  evidence.
- **The rule.** A live run starts from the gear preset of the phase *before*
  the phase it ranks (owner rule, ticket 560 brief). Starting from the ranked
  phase's own best-in-slot gear would leave almost nothing to upgrade. The
  new specs use the presets the 2026-11-03 phase-4 pass chose by this rule
  (`docs/live-runs/2026-11-03-p45-dps-pass.md`).
- **Why phase 4, not phase 5.** Until ticket 560 the gate ranked phase 5 with
  no preset (`golden-ret-p5-cap40.json`). Retribution has no phase-4 preset
  (`vendor/tbc-new-fork/ui/specs/paladin/retribution/presets.ts`: `P1`, `P2`,
  `P3`, `Bulwark`, `Pre-raid`), so phase 5 has no previous-phase start gear.
  The gate moved to phase 4, whose previous phase has `P3` (session ruling
  Q-560-desktop-phase). The phase-5 golden was removed; phase 5 is not gated.
- **Pinned counts.** Since ticket 505 the tab builds each pool at run time
  from the wowsims db (`<fork>/ui/features/upgrades/model/pool_source.ts`,
  ADR-0038). `POOL_CAP` is the pool with every source ticked, and the
  eligible count starts from the pool with the Sources dialog's "Heroic
  dungeon" entry unticked, which is the tab's default. Both sizes are pinned
  in the fork's `model/pool_source.cells.fixture.json` (for ret, `"ret-p4"`:
  include 1175, exclude 1118), which `pool_source.test.ts` checks against
  db.json. The eligible count then applies the worn-gear hand rule: while the
  main hand is a two-hander, it leaves out the off-hand-only items and the
  one-handed weapons (fork commits 213fc11db and 5ec8def25). Ret's `P3`
  preset wears a two-hander, so `EXPECTED_ELIGIBLE["ret"][4]` is 1014: 1118
  less 30 off-hand-only items and 74 one-handers. Mage's staff gives 516: 610
  less 31 and 63. Rogue and enhancement wear two one-handers, so theirs are
  their exclude sizes, 826 and 1039. Ret's sizes were 1178 and
  1121 until the 2026-10-25 wowsims catch-up to `cec2a7b68` changed the
  Hallow's End items in db.json. Before ticket 505 both of ret's constants
  were 917, the entry count of the bundled ret-p4 universe file, which no
  longer exists.
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
  The other specs' counts were measured on the desktop binary on 2026-11-06
  (fork `b603564ee`, ticket 800): mage 38, rogue 33 and enhancement 40, so 2,
  7 and 0 of their worn items fall inside the first 40. Enhancement's first 40
  are all weapons, most of them two-handers, and every row is a loss (ticket
  820). All 40 are main-hand rows, so the enhancement golden does not check
  how a dual-wielder's off-hand items are priced; rogue's golden holds
  off-hand rows.
- **Where the run's values are explained.** The phase-4 golden's rows and
  `baselineDps`, against the old phase-5 golden, are explained in the commit
  that writes the golden and in the ticket-560 stage's `desktop-gate.md`. The
  mage, rogue and enhancement goldens are first recordings: the commit that
  adds them names what each covers.

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

## Known defects of a golden

A golden records what the tab output, defects included. A spec not listed
here has no known defect recorded.

- **`enh`:** the capped run prices only main-hand weapons, and every row is a
  loss. The EP order that picks the first 40 ignores weapon damage (ticket
  821) and prices a two-hander against the main hand alone (ticket 820).

## Recording a run

Paste each spec's `(h)` line, which names its golden, and the command's final
`desktop-gate:` line, which gives each spec's verdict: five lines when four
specs are gated. They go in the stage's `desktop-gate.md` when the work has a stage, and
in the commit body when it has none.

## Regenerating a golden

**Regenerating is a deliberate act.** It is legitimate only when a change is
*meant* to alter that spec's output — a fork re-pin, a pool rule change, an
intended ranking change. For each such spec:

1. Run `pnpm desktop-gate:check --spec <id> --update-golden`, where `<id>` is
   the spec id in the table above, and read the diff it prints.
2. Commit the new file with the reason the output changed in the commit
   body.
3. Re-run the whole command, `pnpm desktop-gate:check`, and record that
   green run's lines as "Recording a run" says.

The write is gated on checks (a)-(f) passing ((g) removed), which stops a
*broken* run (timeout, panic, wrong worker, wrong row count) from becoming a
golden. It does **not** stop a ranking regression: that preserves shape and
passes (a)-(f). The
only thing standing between a regression and a committed golden is you reading
the printed diff.
