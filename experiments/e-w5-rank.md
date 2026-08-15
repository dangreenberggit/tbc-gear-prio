# E-W5 §3.2 — screening rank vs full rank

Command: `node scripts/ew5_rank.mjs`
Seed: 42. Cutoff used for the go/no-go: `{"absDps":3.4,"pct":0.15}` (F10).
feral's own cutoffForSpec() value is {absDps:3.6, pct:0.15} (packages/core/src/cutoff.ts:27), different from the fixed {3.4,0.15} used here for both specs per the task instructions (F10) — reported for transparency, not applied

Universe notes:

- ret: ret-p2.json has 240 entries; ret-p5.json filtered to phase<=2 has 246 (this script uses ret-p5.json, per the task's corrected counts) — 6-row gap, unreconciled
- feral: feral-p2.json filtered to phase<=2 has 246 entries, feral-p3.json filtered to phase<=2 has 251 — this script uses feral-p2.json (matches its own maxPhase 2 pin)

## ret (eligible pool: 246)

| iterations | Spearman rho vs 5000 | K*  | above-cutoff rows | cost(point)/cost(5000) |
| ---------- | -------------------- | --- | ----------------- | ---------------------- |
| 100        | 0.9721               | 18  | 13                | 0.609                  |
| 300        | 0.9882               | 15  | 13                | 0.650                  |
| 1000       | 0.9946               | 15  | 13                | 0.695                  |
| 3000       | 0.9995               | 13  | 13                | 0.847                  |
| 5000       | 1.0000               | 13  | 13                | 1.000                  |

## feral (eligible pool: 246)

| iterations | Spearman rho vs 5000 | K*  | above-cutoff rows | cost(point)/cost(5000) |
| ---------- | -------------------- | --- | ----------------- | ---------------------- |
| 100        | 0.9699               | 25  | 16                | 0.462                  |
| 300        | 0.9905               | 16  | 16                | 0.483                  |
| 1000       | 0.9964               | 18  | 16                | 0.565                  |
| 3000       | 0.9992               | 16  | 16                | 0.768                  |
| 5000       | 1.0000               | 16  | 16                | 1.000                  |

## Go/no-go: **no-go**

Plan §3.2's rule (applied literally): go requires **both** some point with
`cost(point)/cost(5000) < 0.25` on the tuning fixture (ret) **and**
`max K* over the roster <= 60`.

- K\* condition: **passes**. Max K\* across both specs and all points is 25
  (feral at 100 iterations), well under 60.
- Cost condition: **fails**. Ret's cost ratios are 0.609 / 0.650 / 0.695 /
  0.847 at 100/300/1000/3000 iterations — every point, not just the cheapest,
  sits well above 0.25. Feral's cheapest point (100 iterations, 0.462) is
  lower but still more than 1.8x the threshold, and feral is not the tuning
  fixture the go rule reads from in any case.

Both halves must hold; one failing is enough. **No-go.** `screenIterations`
and `promoteTopK` are not set — the gate did not pass, so there is no
screening default to report.

### Why the cost ratio is so flat

This is the finding that matters most here, and the plan did not anticipate
it. From §3.1's fit (`experiments/e-w5-overhead.md`): `t_fixed` = 373.2 ms,
`t_iter` = 0.0637 ms/iteration. At 300 iterations the variable part is
`0.0637 × 300 ≈ 19 ms` against `373.2 ms` of fixed setup — the fixed cost is
about 95% of the request's wall-clock even at the second-cheapest sweep
point. Screening at fewer iterations only ever discounts that ~5% variable
slice; it cannot discount the ~373 ms every request pays regardless of
iteration count. That is why the ret cost ratios barely move across two
orders of magnitude of iteration count (100 to 3000): 0.609 to 0.847, not
the sharp drop a "cheap screen, promote by rank" strategy needs to pay for
itself.

**Scope of this conclusion:** measured on the **Node/CLI** path only
(`vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe`, one process
spawn per request). The browser/WASM path (F5, ticket 156) has a different
fixed-cost structure — no process spawn, a different environment-setup cost,
4-way iteration-splitting across workers — and E-W5 does not measure it. Do
not generalize this no-go to the browser path without a separate
measurement there.

### Consequence for M1 and M1.5

Because screening does not pay for itself on this path, **M1's candidate
cap and concurrency are the levers that actually reduce wall-clock here**,
not racing. That makes **M1.5's EP-ordering-recall measurement more
decision-relevant, not less**: a pre-M2 candidate cap's safety now rests
entirely on whether EP ordering reliably keeps above-cutoff rows inside the
cap (M1.5's question), since there is no screening pass to fall back on as a
second, cheaper filter.
