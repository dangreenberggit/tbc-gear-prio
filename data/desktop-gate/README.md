# Desktop gate goldens

`golden-<spec>-p<phase>-cap<N>.json` is the recorded ranking output of one run
of the upgrades tab on the desktop (HTTP) transport, one file per gated spec.
The run passed checks (a)-(f); the file does not say its ranking is right (see
"Known defects of a golden" below). Check (h) of `scripts/check_desktop_tab.py`
compares each spec's run against its file.

## Which runs are gated: four specs at phase 4, cap 40

`pnpm desktop-gate:check` runs every spec in the table, one after the other, on
one build and one server; `--spec <id>` runs one. The spec ids are the fork's
(`model/engine/types.ts` `SpecId`). Each spec's page, start preset and pinned
counts, and how each count was derived or measured, are in `GATED` in
`scripts/check_desktop_tab.py` and the comments above its entries. `pnpm
desktop-gate:unit:check` fails when a gated spec lacks a golden, a golden on
disk belongs to no gated spec, or a golden's spec, phase, cap or row count
differs from its `GATED` entry.

| Spec id | Wall time of one run |
| ------- | -------------------- |
| ret     | 18 s                 |
| mage    | 15 s                 |
| rogue   | 33 s                 |
| enh     | 24 s                 |

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
- **Earlier values of ret's pins.** Before ticket 505 ret's eligible count
  and pool cap were both 917, the entry count of the bundled ret-p4 universe
  file, which no longer exists. Ret's pool sizes (include, exclude) were 1178
  and 1121 until the 2026-10-25 wowsims catch-up to `cec2a7b68` changed the
  Hallow's End items in db.json. Ret's capped row count at 40 was 39 (one
  worn item inside the first 40, measured 2026-10-07, ticket 560 stage
  `desktop-gate.md`) until the ret-p4 pool grew from 523 to 838: ten new
  candidates entered the first 40 by EP and pushed out nine old candidates
  and that worn item. The count was then measured on the desktop binary on
  2026-10-15 (fork `2d168e74f`, readback
  `.scratch/stage-gate/tab-item-lists/readback-ret-p4-cap40.json`,
  gitignored), on 2026-10-16 after the pool grew to 917 (fork `8cd8d1c80`,
  readback `.scratch/stage-gate/tab-blocking-finish/readback-ret-p4-cap40.json`,
  gitignored) and on 2026-10-18 on the run-time pool (fork `f06772929`,
  `eligibleCount` 1121), with no change. In the 2026-10-18 run's first 40,
  Kiss of the Spider (22954, a Naxxramas epic with a wowsims effect record)
  replaced Boots of Natural Grace (30041, still in the pool); every other row
  and `baselineDps` kept its value.
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
  821) and prices a two-hander against the main hand alone (ticket 820). So
  the enh golden does not check how a dual-wielder's off-hand items are
  priced; rogue's golden holds off-hand rows.

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
