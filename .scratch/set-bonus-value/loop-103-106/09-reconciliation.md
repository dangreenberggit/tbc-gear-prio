# 09 — reconciliation arithmetic (director, no subagent)

## Asked

Reconcile the engine's figures against the owner's wowsims web results
(`owner-web-results-2026-08-11.md`): is the package gap (ours +102.99 vs owner
+98.17) within combined noise, and likewise the helm A/B (+8.61 vs +10.69)?
State the arithmetic; close what closes; name what does not, without inventing a
story for it.

## Method

Owner's runs report a **per-iteration stdev** (±73, ±75, ±78, ±77), so the
standard error of an arm mean is `stdev / sqrt(iterations)`, and the SE of a
delta between two independent arms is the hypotenuse of the two arm SEs.

Our runs are 5 seeds × 3000 iterations. Each seed's mean is itself an average
over 3000 iterations, so the effective sample is 15000 iterations and the arm SE
is `stdev / sqrt(15000)` using the sim's own reported per-iteration stdev. The
seed-to-seed spread (0.187–0.231 DPS) is far smaller than this and is a measure
of seed reproducibility, **not** of sampling error — using it as the error bar
would understate uncertainty by roughly an order of magnitude, which is the trap
worth naming here.

## Commands and raw output

```
python -c "
import math
base_m, base_sd, base_n = 2245.60, 73.0, 12500
pkg_m,  pkg_sd,  pkg_n  = 2343.77, 75.0, 12500
se_base = base_sd/math.sqrt(base_n); se_pkg = pkg_sd/math.sqrt(pkg_n)
d_owner = pkg_m-base_m; se_owner = math.hypot(se_base, se_pkg)
print(d_owner, se_base, se_pkg, se_owner)"
```

→ `owner package delta 98.17  SE(base) 0.653  SE(pkg) 0.671  SE(delta) 0.936`,
95% CI **96.34 … 100.00**.

Our per-seed means from
`.scratch/set-bonus-value/loop-103-106/sims-08/simplerot/per-seed.json`:

```
OWNER2_BASE      mean 2219.82   seed spread 0.187
PKG_UIMIGRATE    mean 2322.81   seed spread 0.231
delta                 102.99
```

Reported per-iteration stdev **126.4** (read from
`sims-08/.../OWNER2_BASE-11.json`, `raidMetrics.dps.stdev`), so at 15000
effective iterations: SE per arm **1.032**, SE(delta) **1.459**.

## Results

| comparison | ours | owner | gap | combined SE | z | verdict |
|---|---|---|---|---|---|---|
| package delta | 102.99 | 98.17 | **4.82** | 1.734 | **2.8** | does **not** close |
| helm A/B | 8.61 | 10.69 | 2.08 | 1.616 | **1.3** | **closes** |

95% CI on the package gap: **1.43 … 8.22** — excludes zero.

Owner's helm A/B: +10.69, SE 0.693, 95% CI 9.33 … 12.05.

## Absolute baseline offset

Web 2245.60 vs engine 2219.82 on identical v2 gear: gap **25.78**, combined SE
1.221, **z = 21.1**. Real, not noise.

Tested whether it explains the package gap, rather than assuming it cancels:

```
owner package as % of baseline:   4.372%
engine package as % of baseline:  4.640%
engine delta scaled to owner baseline: 104.19  (vs owner 98.17, residual 6.02)
```

A **proportional** offset makes the package residual *worse* (6.02 vs 4.82). A
**constant** offset cancels in deltas entirely. Either way the baseline offset
does not account for the package gap: the two are **distinct** discrepancies.

## Conclusion

- **106's residue is closed.** The helm A/B reconciles at z = 1.3, and the arms
  were not even like-for-like (the owner's carry 24067 body gems from "suggest
  gems"; ours do not), so the true agreement is at least this good.
- **103's package residue is 4.82 ± 1.73 DPS and stays open.** It does not close
  at 3000×5 vs 12500 iterations, and no story is attached to it here.
- The **25.78 DPS absolute baseline offset** is a separate, strongly significant
  quantity, handed to iteration 10 for attribution.

## CORRECTION — my per-iteration stdev was wrong

Iteration 10 caught this and I verified it directly:

```
python -c "
import json
r=json.load(open('.scratch/set-bonus-value/loop-103-106/sims-08/simplerot/OWNER2_BASE-11.json'))
print(r['raidMetrics']['dps']['stdev'])"
```

→ **74.7748**, not the 126.4 used above. The 126.4 was picked up from a
different arm's file by a loop that stopped at the first `stdev` it found, and
it is wrong for these runs. Corrected arithmetic:

| quantity | corrected SE | corrected z | was |
|---|---|---|---|
| engine SE per arm | 0.611 | — | 1.032 |
| engine SE(delta) | 0.863 | — | 1.459 |
| package gap 4.82 | 1.274 | **3.8** | 2.8 |
| baseline offset 25.78 | 0.894 | **28.8** | 21.1 |
| helm gap 2.08 | 1.107 | **1.9** | 1.3 |

Every qualitative verdict below **stands and hardens**: the package gap now
excludes zero more strongly (95% CI **2.32 … 7.32**), and the helm A/B still
reconciles at z = 1.9. Tightening the error bars cuts against the package
residue rather than for it, which is the honest direction to report.

**Also superseded by iteration 10**: the conclusion below that the baseline
offset and the package gap are "distinct" discrepancies is **wrong**. Iteration
10 showed the offset is +25.78 on the baseline arm but +20.96 on the package
arm — the difference between those two *is* the 4.82. They are one
arm-dependent offset sampled twice, not two independent quantities, and the
offset therefore does **not** cleanly cancel in deltas (~80% cancels, ~20% does
not).

One caveat on the package comparison that bounds how hard to push on the 4.82:
the owner's package arm was produced by equipping four items in the UI, while
ours is built by four sequential `equipmentForCandidateSwap` calls. Their
exported payload is recorded in `owner-web-results-2026-08-11.md`, so a
leaf-level diff of that payload against ours is the cheapest remaining test and
is the natural next step if the 4.82 is ever worth closing.
