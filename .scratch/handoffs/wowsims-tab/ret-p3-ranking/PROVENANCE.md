# Ret p3 ranking — provenance

Real run, native `wowsimcli` sim runner, no fabricated numbers. Produced on
`feat/ret-p3-data` after tickets 158 and 159 landed (commits `dade219` and
`23153d2` in this worktree).

## Command

```
npx tsx packages/core/src/cli.ts \
  --region US --realm dreamscythe --character slamaltman \
  --offline --max-phase 3 \
  --report .scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.html
```

`--offline` selects the recorded WCL gear-fetch adapter (live WCL fetching is
not wired into this CLI yet — `cli.ts:266-269` refuses without it). The sim
runner itself is always the native `wowsimcli` binary via `CliSimRunner`
(`packages/core/src/seams/cli-sim-runner.ts`) regardless of `--offline` —
`--offline` only concerns the `GearSource` seam, not `SimRunner`.

Invocation is the one documented at `docs/verification-log.md:696` (the 2026-
07-28 "Fresh P3 ranking" entry), re-run here to get p3-max-phase numbers
produced after ticket 159's fix, not before it.

## Wowsimcli binary

Fetched fresh into this worktree for this run — it was not already present:

```
python scripts/fetch_wowsimcli.py --platform win32-x64
```

Wrote `vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe`, matching
the tag pinned in `data/wowsims.lock.json` (`v0.0.101`,
`8aa378b3671a0923fd11fb34b4b3753e53f20c9b`). `vendor/` is gitignored, so a
fresh worktree/clone needs the same fetch command before running this.

## Gear source

Recorded WCL fixture for slamaltman (`packages/core/src/fixtures/slamaltman-offline.js`,
sourced from `test/fixtures/slamaltman.raw.json`), read through the
`RecordedGearSource` seam adapter — not a live WCL API call, and no WCL
credentials were used or needed for this run. Gear read from Hydross the
Unstable (report `VGjFb3mtX9xHgyav`, fight 8, "ranked" route), spec
confidence 100%.

## Sim parameters

- Iterations: 3000 per candidate (`DEFAULT_ITERATIONS` in `packages/core/src/rank.ts:423`)
- Seeds: `[11, 22, 33, 44, 55]` (`DEFAULT_SEEDS`, `rank.ts:436`), primary seed 11
- Candidate/pool count: 394 (ret-p3 universe), 431 sim invocations run
  (`simming 431/431` in the run log — includes the baseline character plus
  each candidate swap; 1 candidate substitution failed and was dropped, see
  below), 393 items scored, 44 above the ret cutoff (`{absDps: 3.4, pct: 0.15}`)
- Wall clock: 6m27.752s on this machine (`real 6m27.752s` from the run log)

## EP weights used

Resolved via `resolveEpWeightsPath` (ticket 159, `packages/core/src/ep-weights.ts`)
against `data/presets/ep-weights-by-phase.json`:

```
{"fallback": "data/presets/ret/p2.ep-weights.json",
 "byPhase": {"3": "data/presets/ret/p3.ep-weights.json"}}
```

At `--max-phase 3`, the highest byPhase key <= 3 is 3, so this run used
**`data/presets/ret/p3.ep-weights.json`** — confirming the fix in ticket 159
took effect: before it, this same command would have prefiltered and
gem-filled on p2 weights regardless of `--max-phase`.

## One dropped candidate

`candidate 30892` (Beast-tamer's Shoulders, shoulder slot) was dropped from
the ranking: the sim panicked on that swap with a hunter-class type
assertion inside upstream's own item-set code (a hunter tier-set item
effect triggering on a paladin equip check) — logged in the run's
`substitutions` block, not a bug introduced by this branch's changes.

## Headline numbers

- Baseline: **2003.51 DPS** (± 118.93 stdev, `metaAdjusted=false`)
- Pool: 394 candidates, 393 scored, 44 above cutoff
- Top 3 upgrades:
  1. Belt of One-Hundred Deaths (waist) — Δ47.75 DPS (+2.38%)
  2. Torch of the Damned (weapon) — Δ43.61 DPS (+2.18%)
  3. Cataclysm's Edge (weapon) — Δ26.22 DPS (+1.31%)

## Artifacts

- `slamaltman-p3.html` — full rank report
- `slamaltman-p3.json` — machine-readable ranking (`meta` + `ranking`)
- This file

No WCL credentials, API keys, or other secrets are present in either
artifact or in this note.
