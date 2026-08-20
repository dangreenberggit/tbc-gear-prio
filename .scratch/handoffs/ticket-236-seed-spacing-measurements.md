# Ticket 232 — seed spacing measurements (2026-08-19)

All runs: `python scripts/seed_overlap_probe.py .scratch/seed-probe 3000 <seeds>`,
pinned `vendor/wowsimcli-v0.0.101-win32-x64/`, fixture
`test/fixtures/slamaltman.raid-sim-request.json`, 3000 iterations.

`vendor/` is gitignored and **absent from a fresh worktree**. Before re-running
any row below: `pnpm fetch:wowsimcli` (the probe exits 2 with that hint if the
binary is missing) and, for the Go citations, `pnpm sync:wowsims:restore`.

`sampleSd/SE` compares the spread across seeds to the sim's own reported SE.

## Baseline — reproduces the ticket exactly

| seeds | sampleSd | meanReportedSE | ratio |
| --- | --- | --- | --- |
| 11, 22, 33, 44, 55 (shipped) | 0.1880 | 2.1726 | **0.087** |
| 11, 3011, 6011, 9011, 12011 | 1.1140 | 2.1410 | 0.520 |

## Five-seed arms at various spacings — the ratio does NOT climb with spacing

| spacing | seeds | ratio |
| --- | --- | --- |
| 1x (3000) | 11 + k*3000 | 0.520 |
| 1x (3000) | 7 + k*3000 | 0.520 |
| 1x (3000) | 101 + k*3000 | 0.708 |
| 1x (3000) | 5003 + k*3000 | 0.623 |
| 3x (9000) | 11 + k*9000 | 1.063 |
| 10x (30000) | 11 + k*30000 | 0.854 |
| 100x (300000) | 11 + k*300000 | 0.472 |
| scattered A | 11, 917383, 2340719, 5118293, 8443397 | 1.185 |
| scattered B | 104729, 1299709, 3267001, 6700417, 9999991 | 0.602 |
| scattered C | 31337, 2718281, 4826809, 7370029, 11184811 | 0.533 |

100x spacing scores *worse* than 3x, and scattered sets range 0.53-1.19. If
residual overlap were driving the ratio, wider spacing would improve it
monotonically. It does not.

## Why: a 5-point sd is a noisy statistic

For normal data at n=5, `E[s]/sigma = c4 = 0.940` and the relative sd of `s`
is **34.1 %**, so a truly independent set yields observed ratios roughly in
0.60..1.28 at +-1sd. The nine spaced arms above average **0.729** and all fall
in or near that band. The scatter is sampling noise in the estimator, not
physics.

```
python -c "import math;n=5;c4=math.sqrt(2/(n-1))*math.gamma(n/2)/math.gamma((n-1)/2);print(c4, math.sqrt(1-c4*c4))"
```

## 20-seed arms — sd well enough determined to conclude

At n=20 the relative sd of `s` falls to ~16 %.

| arm | sampleSd | meanReportedSE | ratio |
| --- | --- | --- | --- |
| 1x spacing, 11 + k*3000, k=0..19 | 1.9181 | 2.1422 | **0.895** |
| 20 scattered seeds (`random.seed(20260819)`, range 1..1e7) | 2.2973 | 2.1382 | **1.074** |

Both are consistent with independence. The two arms agree, so **the spacing
rule is what matters, not the spacing style** — spacing by `iterations` is
sufficient, and scattering buys nothing beyond it.

## Conclusion

- The shipped 0.087 is far outside anything sampling noise explains: the
  defect is real and gross.
- Spacing seeds by at least `iterations` removes it (0.087 -> ~0.9).
- Do not read a single 5-seed ratio as a measurement of independence; at n=5
  the estimator is too noisy to distinguish 0.5 from 1.0.
