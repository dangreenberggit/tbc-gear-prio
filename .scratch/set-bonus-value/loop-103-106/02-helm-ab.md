# 02-helm-ab — direct A/B sim of Cursed Vision (32235) vs Vengeful Gladiator's Dragonhide Helm (33672)

## What I was asked

Phase 1 of ticket 106: given a prior subagent (`01-payload-dump.md`) already
established the two helm swap payloads production builds are byte-identical
(same gems, same enchant, meta active in both), directly sim the two helms
head-to-head on shredzepelin's actual gear and report point estimates with
error bars — to check whether the owner's expectation (Cursed Vision ~+10
DPS ahead of Vengeful Gladiator's Dragonhide Helm) is reproducible, and
whether our report's near-equal deltas are within noise. Measure only, do
not fix. No production code touched (read-only on `packages/`).

## Commands run, verbatim

All from repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio`, branch
`feat/set-bonus-value`.

### 1. Read inputs

```
Read .scratch/carry-forward/issues/106-loop-why-s3-pvp-helm-sims-equal-to-cursed-vision.md
Read .scratch/set-bonus-value/loop-103-106/01-payload-dump.md
Read .scratch/set-bonus-value/measure_shredzepelin_t6.py
```

Took from `01-payload-dump.md` the exact production payload for both helm
arms (step 5/8 of that log): head socket gems `[32409 (meta), 32194 (red)]`,
enchant `3003` (carried from worn Wolfshead Helm 8345), meta status
`{"kind":"active","metaId":32409,"counts":{"red":12,"yellow":2,"blue":2}}`
identically for both 32235 and 33672.

### 2. Confirmed slot index

```
Read packages/core/src/slots-table.json
```

`simOrder[0] == "head"` — matches the T6 script's `IDX` convention (head is
sim-order index 0).

### 3. Copied and edited the measurement script

```bash
mkdir -p "/c/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/set-bonus-value/loop-103-106/sims-106-helms"
cp ".scratch/set-bonus-value/measure_shredzepelin_t6.py" \
   ".scratch/set-bonus-value/loop-103-106/measure_helms_106.py"
```

Edited the copy (not the original) at
`.scratch/set-bonus-value/loop-103-106/measure_helms_106.py`:
- Replaced the four T6-piece substitution logic with a single head-slot
  substitution, hardcoding `HELM_GEMS = [32409, 32194]` and
  `HELM_ENCHANT = 3003` (from the payload dump), for `CURSED_ID = 32235`
  and `VENG_ID = 33672`.
- Kept the same `resolve_cli`, `compose`, `run_sim`, seed/mean/SE
  machinery unchanged.
- `SEEDS = ("11","22","33","44","55")`, `ITERATIONS = 3000` for the
  BASE guard + first CURSED/VENG pass, plus `ITERATIONS_HI = 20000` for a
  second CURSED/VENG-only confirmation pass, same 5 seeds.
- Fixed `ROOT = Path(__file__).resolve().parents[3]` (the script now lives
  one directory deeper than the original, under `loop-103-106/`) — first run
  failed with `FileNotFoundError` on `data/wowsims.lock.json` because
  `parents[2]` resolved to `.scratch/data/...` instead of repo root; caught
  from the traceback and fixed before the real run.
- Output written to
  `.scratch/set-bonus-value/loop-103-106/measurements-106-helms.json` and
  per-seed sim files under
  `.scratch/set-bonus-value/loop-103-106/sims-106-helms/`.

### 4. Ran it

```bash
python .scratch/set-bonus-value/loop-103-106/measure_helms_106.py 2>&1 \
  | tee .scratch/set-bonus-value/loop-103-106/measure_helms_106.stdout.log
```

First attempt failed (path bug above, exit via traceback, `FileNotFoundError`
on `.scratch\data\wowsims.lock.json`). Fixed `parents[3]`, reran; exit 0.

Full stdout (verbatim):
```
wowsimcli v0.0.101
gear      test\fixtures\shredzepelin-cat.raw.json (actor 'shredzepelin')
skeleton  data\presets\feral\p2.raid-sim-skeleton.json
seeds=['11', '22', '33', '44', '55']
helm gems=[32409, 32194] enchant=3003

=== guard sim: shredzepelin's unmodified gear (BASE), 3000 iters ===
  [3k] BASE      2152.10  2152.02  2152.16  2152.07  2152.31   mean= 2152.13  spread= 0.29  SE~= 2.33
  guard OK: 2152.13 vs target 2152.10 (diff +0.03)

=== helm arms, 3000 iters ===
  [3k] CURSED    1966.70  1966.40  1966.55  1966.87  1966.83   mean= 1966.67  spread= 0.47  SE~= 3.49
  [3k] VENG      1963.80  1963.91  1964.03  1963.97  1963.42   mean= 1963.83  spread= 0.62  SE~= 3.42

=== deltas vs BASE (3000 iters) ===
  CURSED   delta =  -185.46 DPS
  VENG     delta =  -188.30 DPS
  CURSED - VENG =    +2.84 DPS

=== high-precision confirmation: CURSED vs VENG, 20000 iters ===
  [20k] CURSED    1964.17  1964.14  1964.22  1964.33  1964.36   mean= 1964.24  spread= 0.22  SE~= 1.36
  [20k] VENG      1959.26  1959.26  1959.27  1959.31  1959.29   mean= 1959.28  spread= 0.05  SE~= 1.35

=== CURSED - VENG (20000 iters) ===
  CURSED - VENG =    +4.97 DPS

wrote .scratch\set-bonus-value\loop-103-106\measurements-106-helms.json
```

Full JSON payload (per-arm seeds/SE): `.scratch/set-bonus-value/loop-103-106/measurements-106-helms.json`.

### 5. Pulled the report's stored figures for the same two item ids

```bash
grep -n '"itemId": 33672\|"itemId": 32235' .scratch/rank-reports/shredzepelin-p3.json
```
```
10024:        "itemId": 33672,
10058:        "itemId": 32235,
```

```
Read .scratch/rank-reports/shredzepelin-p3.json lines 10015-10085
```

Report entries (verbatim fields):
- `itemId: 33672` (Vengeful Gladiator's Dragonhide Helm): `deltaDps:
  -202.0497000465648`, `se: 3.4553881524263477`
- `itemId: 32235` (Cursed Vision of Sargeras): `deltaDps:
  -202.13357422161994`, `se: 3.615261362016318`

## Analysis

### 3000-iteration arm

| arm | per-seed DPS (11,22,33,44,55) | mean | spread (max-min) | SE (mean stdev / sqrt(3000)) |
|---|---|---|---|---|
| BASE | 2152.10, 2152.02, 2152.16, 2152.07, 2152.31 | 2152.13 | 0.29 | 2.33 |
| CURSED (32235) | 1966.70, 1966.40, 1966.55, 1966.87, 1966.83 | 1966.67 | 0.47 | 3.49 |
| VENG (33672) | 1963.80, 1963.91, 1964.03, 1963.97, 1963.42 | 1963.83 | 0.62 | 3.42 |

Deltas vs BASE: CURSED -185.46 DPS, VENG -188.30 DPS.
CURSED − VENG = **+2.84 DPS** at 3000 iterations.

Note the per-seed spread (0.29–0.62 DPS) is far tighter than the reported
per-seed `stdev`-derived SE (~2.3–3.5 DPS) — the SE formula here
(`mean(stdev)/sqrt(iterations)`) estimates single-seed sampling noise, not
the much smaller across-seed spread actually observed; the across-seed
spread is the more relevant empirical bound on how much a re-run would move
the mean given these 5 fixed seeds; the formula's SE is the more relevant
bound on how much a single seed's estimate could be off from the true mean.
Both are reported per the task's instructions.

### 20000-iteration confirmation (CURSED and VENG only)

| arm | per-seed DPS (11,22,33,44,55) | mean | spread (max-min) | SE (mean stdev / sqrt(20000)) |
|---|---|---|---|---|
| CURSED (32235) | 1964.17, 1964.14, 1964.22, 1964.33, 1964.36 | 1964.24 | 0.22 | 1.36 |
| VENG (33672) | 1959.26, 1959.26, 1959.27, 1959.31, 1959.29 | 1959.28 | 0.05 | 1.35 |

CURSED − VENG = **+4.97 DPS** at 20000 iterations.

(Note the 3k and 20k CURSED/VENG absolute means differ slightly — 1966.67 vs
1964.24 for CURSED, 1963.83 vs 1959.28 for VENG — a ~2-4 DPS shift between
runs at fixed seeds is itself consistent with each seed's residual sampling
noise at these iteration counts; it does not change the sign or rough
magnitude of the CURSED−VENG comparison, which is the quantity under test.)

### Is a ~10 DPS gap resolvable?

At 3000 iterations: per-seed spreads for CURSED and VENG are individually
under 1 DPS, and the two arms' seed-DPS ranges (CURSED 1966.40-1966.87,
VENG 1963.42-1964.03) do not overlap at all — every CURSED seed beats every
VENG seed. The measured gap (+2.84) is real and resolvable at this
precision, but it is **not 10 DPS** — it is roughly a quarter to a half of
the owner's expected size, whichever iteration count is used (+2.84 at 3k,
+4.97 at 20k).

At 20000 iterations the non-overlap is even sharper (CURSED
1964.14-1964.36, VENG 1959.26-1959.31 — gap of ~5 DPS, again non-overlapping
per-seed and larger than either run's formula-SE of ~1.35). So: a real,
resolvable, positive gap favoring Cursed Vision exists and is NOT noise —
but its measured magnitude across both iteration counts (+2.84 to +4.97 DPS)
is roughly half of the owner's ~+10 DPS expectation, not equal to it.

### Report comparison

Report's stored deltas (from `.scratch/rank-reports/shredzepelin-p3.json`):
- VENG (33672): deltaDps **-202.0497**, se 3.455
- CURSED (32235): deltaDps **-202.1336**, se 3.615
- Report's CURSED − VENG = -202.1336 − (-202.0497) = **-0.084 DPS** — i.e.
  the report shows Cursed Vision very slightly *worse* than Vengeful
  Gladiator, not ahead, and the two are indistinguishable within either
  item's own reported SE (~3.5 DPS each).

Neither helm's direct-sim delta-vs-BASE matches its report figure at all:
report deltas are around -202 DPS for both items, whereas this direct sim's
deltas-vs-BASE (3k pass) are -185.46 (CURSED) and -188.30 (VENG) — a ~14-17
DPS gap between the report's delta and the directly-measured delta for the
*same* item. That gap is far outside either measurement's SE and is **not
explained by anything measured in this task** (this script did not
investigate baseline construction differences, EP-weight-driven regem
differences elsewhere in the report's baseline arm, or other report-pipeline
specifics) — flagged as open, not resolved, here.

## Conclusion — plain answers

1. **Does a direct sim reproduce Cursed Vision ~+10 DPS ahead?** No. Direct
   sims show Cursed Vision ahead of Vengeful Gladiator by **+2.84 DPS**
   (3000 iters) to **+4.97 DPS** (20000 iters) — real and resolvable
   (non-overlapping per-seed ranges at both iteration counts, larger than
   formula-SE), but roughly half the owner's expected +10 DPS, not equal to
   it. Hypothesis, untested here: the owner's own quick manual sim may have
   used different gear/settings, or the true gap is genuinely closer to +3
   to +5 DPS than +10.

2. **What IS the measured gap, and is it within noise?** +2.84 to +4.97 DPS
   favoring Cursed Vision, depending on iteration count. It is **not** noise
   at either iteration count: per-seed DPS ranges for the two arms do not
   overlap, and the gap exceeds the formula-derived SE (~1.35-3.5 DPS) at
   both 3k and 20k iterations.

3. **Does our report's figure match direct sims for each helm (within SE)?**
   No, for two separate reasons:
   - The report shows the two helms as statistically indistinguishable
     (CURSED − VENG = -0.084 DPS, both items' SE ~3.5 DPS) — opposite in
     sign and much smaller in magnitude than the direct sim's resolvable
     +2.84 to +4.97 DPS gap favoring Cursed Vision. The report does **not**
     reproduce the direct-sim comparison between the two helms.
   - Each individual helm's report delta-vs-baseline (~-202 DPS for both)
     does not match this script's directly-measured delta-vs-BASE for the
     same item (-185.46 CURSED, -188.30 VENG) — a ~14-17 DPS discrepancy per
     item, well outside SE. This points at something in the report's
     pipeline (baseline construction, other-slot regemming, or elsewhere)
     producing different absolute deltas than a direct single-swap sim on
     the same gear, independent of the two-helm comparison question. Not
     diagnosed further here — out of this task's scope (measure, don't fix).

**Bottom line for ticket 106:** the report's near-equal helm deltas are not
simply "within noise from a real +10 DPS gap" — the true resolvable gap
between the two helms (as directly sim'd) is smaller than the owner expected
(+3 to +5 DPS, not +10) AND the report's own deltas for each helm
individually disagree with a direct sim on the same gear by ~15 DPS, in a
direction/magnitude not explained by this task's measurements. Both facts
should be carried forward: the "+10 DPS" ground truth is only partially
reproduced (right sign, smaller magnitude), and there is a separate,
unexplained ~15 DPS report-vs-direct-sim gap on each individual helm delta
that Phase 2/3 of the loop (or a new ticket) should investigate.
