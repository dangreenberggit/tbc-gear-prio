# Ret p3 ranking — provenance

Real run, native `wowsimcli` sim runner, no fabricated numbers. Produced on
`feat/ret-p3-data` after tickets 158 and 159 landed (commits `dade219` and
`23153d2` in this worktree), and re-run after the ticket 163 / ticket 124 fix
(commit `2e6b257`, this worktree) that gives worn-but-unpooled items a
`worn-unrankable` classification instead of silence. Both runs used the
identical command, seeds and gear fixture and produced bit-identical
`items`/`baseline` figures — the only change in the second run's JSON is the
new `plausibilityWarnings` entry below.

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
- Wall clock: 6m27.752s on this machine (`real 6m27.752s` from the run log).
  The ticket 163 re-run took `real 7m3.366s` — the classifier change adds no
  sim work, so the difference is machine noise, not new cost.

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

## Relic slot caveat (ticket 163, ticket 124)

The character's worn relic, Libram of Avengement (27484), is excluded from
`data/universes/ret-p3.json` by `assemble_universe.py`'s no-resolved-source
rule and so still does not appear as a row — that exclusion is ticket 157's
separate scope and this run does not touch it. What changed is that the
ranking now says so instead of staying silent. `plausibilityWarnings` in
`slamaltman-p3.json` carries one entry:

```json
{
  "kind": "dead-slot",
  "slot": "ranged",
  "cause": "worn-unrankable",
  "wornItemName": "Libram of Avengement",
  "message": "ranged is unmeasured: the worn Libram of Avengement is not in the candidate pool for this slot, so every row shown for ranged was scored against an empty slot, not against Libram of Avengement. Do not read any of them as an upgrade or a loss — this slot needs the worn item added to the pool before it can be ranked."
}
```

The four libram rows are still present in `items` (Souls Redeemed, Absolute
Truth and Tome of the Lightbringer all at −13.81, Fervor at −14.10 — verify
with
`python -c "import json;[print(i['itemId'],i['name'],i['deltaDps']) for i in json.load(open('.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.json'))['ranking']['items'] if i['slot']=='ranged']"`),
but the warning panel renders open by default above them in the HTML report
and tells a reader not to act on those numbers. This closes the SME review's
blocker for plan §9.6 (`.scratch/handoffs/sme-rank-judgment-ret-p3-real-ranking.md`)
via the "or" branch it named: honest unmeasured-slot marking, not distinct
libram deltas — the three libram procs remain unimplemented in the pinned
sim (`sim/common/tbc/stat_bonus_procs_auto_gen.go` TODO stubs), which is
untouched, upstream-only work.

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
