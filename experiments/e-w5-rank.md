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
