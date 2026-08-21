# E-W5 §3.1 — per-request cost under Node

Command: `node scripts/ew5_overhead.mjs (spawns vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe sim --infile ... --outfile ... against test/fixtures/slamaltman.raid-sim-request.json, seed 42, 5 repeats per sweep point; RSS measured in a separate single run at 5000 iterations to avoid polling overhead corrupting the timing sweep)`
Binary: `vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe` (pinned tag v0.0.101, matches `data/wowsims.lock.json`)
Fixture: `test/fixtures/slamaltman.raid-sim-request.json`, seed 42, 5 repeats per point.

## Sweep (median of 5 repeats)

| iterations | median wall-clock (ms) | median dps |
| ---------- | ---------------------- | ---------- |
| 100        | 377.0                  | 2026.7     |
| 300        | 391.0                  | 2039.3     |
| 1000       | 435.8                  | 2040.9     |
| 3000       | 575.5                  | 2042.8     |
| 5000       | 685.2                  | 2042.4     |

Raw per-repeat data is in `e-w5-overhead.json` (`raw` key); every run's
`iterationsDone` was checked to equal the requested iteration count before
being accepted (script throws otherwise).

## Fit

`t_fixed` = 373.2 ms, `t_iter` = 0.0637 ms/iteration
(least-squares fit of wallMs ~ t_fixed + t_iter * iterations over the five
median points above).

## Presim status (F8)

no presim round executes for this fixture: runPresims (sim/core/presim.go:34) only loops when remainingAgents>0 or EndFightAtHealth>0; remainingAgents comes from Presimmer.GetPresimOptions, implemented only by Character (health.go:272), which returns nil unless HealingModel.Hps==0 && HealingModel.CadenceSeconds!=0. The fixture's player has healingModel:{} (Hps=0, CadenceSeconds=0), so GetPresimOptions returns nil; the fixture's encounter has a fixed duration (no EndFightAtHealth field), so doOne is also false. runPresims's for-loop body never executes and it returns immediately.

Verified by:

- read vendor/tbc-new-fork/sim/core/sim.go:114-188 (runSim always calls sim.runPresims(rsr) on the CLI path — sim/lib/library.go:40 calls core.RunSim(input, nil, signals), which sets skipPresim=false)
- read vendor/tbc-new-fork/sim/core/presim.go:34-122 (loop guard: `for doOne || remainingAgents > 0`)
- read vendor/tbc-new-fork/sim/core/health.go:272-291 (the only Presimmer implementation in the fork; condition quoted above)
- python -c "import json; d=json.load(open('test/fixtures/slamaltman.raid-sim-request.json')); print(d['raid']['parties'][0]['players'][0].get('healingModel')); print('endFightAtHealth' in d['encounter'])" -> {} and False

**Separability:** Not separable on the CLI --outfile path: RaidSimResult (proto/api.proto:384-398) carries no PresimRunning or presim-duration field, only the streaming ProgressMetrics channel does (which --outfile does not use). Reported as one t_fixed number for that reason (F8), but since the presim loop body provably never executes for this fixture (see claim above), t_fixed here is pure setup cost with zero presim rounds mixed in — not an unresolved mix, a resolved zero.

## Per-worker memory

Peak RSS at 5000 iterations (largest sweep point, longest-lived process): **183.8 MB**
(sampled every 100ms via `Get-Process -Id <pid> | .WorkingSet64`
while one sim process was in flight, run **separately** from the timing sweep — measured in isolation, not concurrently with the timing sweep above — the 50ms-interval poll used in a first attempt of this script inflated wall-clock times by 2-40x (100 iters went from ~450ms to up to 1.5s; 300 iters up to 19s) from CPU/IO contention between the poller and the sim process, so timing and RSS are never sampled in the same run here).
