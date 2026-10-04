# Ticket 542 run 1: remaining-time estimator decision

Run 1: feral (`/tbc/druid/feralcat/`), phase 3, preset "Phase 2 / BiS 6%",
3000 iterations, uncapped, cold headless profile, through vite :5174 and the
:3333 backend, fork commit `9b11bf2143aaeb563c1a49fe90bef999e247f88e` (clean).
`hardwareConcurrency` 20, `deviceMemory` 8, N = 4. The 60 s load gate passed
on the first attempt; no discards. Recorded 2026-10-03.

Replay output (`node replay.mjs trace-run1.json`, rc=0):

```
load: clean
load detail: 46 samples in the run, 11 D3 windows, 34 D2 intervals
ms per candidate in each D3 window (information): 366 186 313 454 537 377 382 758 500 494 558
T 401  B_obs 365  B_calc 365  (seeds 5, topN 8)
first simming d 1
t1 0.58s  t_B 166.10s  t_rank 189.29s  d_last 401  t_lastRep 210.38s  endT 210.70s
G 23.19s  r_c 454.7 ms  r_rep 585.8 ms  N 4  kappa 0.3221  psi 50.9930
linear e25 -0.4908 (information)  at d 101, est 91.46s, actual 179.63s
linear e50 -0.4504 (out-of-sample)  at d 201, est 74.52s, actual 135.59s
linear e75 -0.4608 (information)  at d 301, est 43.28s, actual 80.28s
phased e25 -0.3867 (information)  at d 101, est 110.17s, actual 179.63s
phased e50 -0.2817 (in-sample)  at d 201, est 97.39s, actual 135.59s
phased e75 -0.1300 (information)  at d 301, est 69.84s, actual 80.28s
estimator: phased
constants: kappa 0.3221  psi 50.9930  (fitted on this run; in-sample)
stability: limit 21.07s (10% of wall time)  d* 243  raw 0.6060  showFromFraction 0.45  (in-sample)
minCandidatesDone 10
FLAG: raw show fraction 0.6060 > 0.45; capped
```

## Decision

Linear's e50 is -0.45 (out of sample), outside the plan's bound of 0.25, so
the **phased** estimator ships, with **kappa = 0.3221** and **psi = 50.9930**
fitted on this run. **showFromFraction = 0.45** (the raw stability fraction
was 0.606, above the 0.45 cap; see the FLAG line) and
**minCandidatesDone = 10**. The boundary check holds: B_calc = B_obs = 365.
Replication ran to d_last = T = 401.

Risk for run 2, stated before it runs: phased misses the bound even in
sample (e50 -0.28). Time per candidate rises through the candidate phase
(the "ms per candidate in each D3 window" line: 186-454 ms in the first four
windows, 377-758 ms in the rest), so a rate observed at 50% done
underestimates the remaining candidates. Whether run 2 passes is untested.

## Round 4: slowdown estimator (2026-10-03)

Replay output (`node replay.mjs trace-run1.json --windows --alternatives`, rc=0):

```
load: clean
load detail: 46 samples in the run, 11 D3 windows, 34 D2 intervals
ms per candidate in each D3 window (information): 366 186 313 454 537 377 382 758 500 494 558
T 401  B_obs 365  B_calc 365  (seeds 5, topN 8)
first simming d 1
t1 0.58s  t_B 166.10s  t_rank 189.29s  d_last 401  t_lastRep 210.38s  endT 210.70s
G 23.19s  r_c 454.7 ms  r_rep 585.8 ms  N 4  kappa 0.3221  psi 50.9930
linear e25 -0.4908 (information)  at d 101, est 91.46s, actual 179.63s
linear e50 -0.4504 (out-of-sample)  at d 201, est 74.52s, actual 135.59s
linear e75 -0.4608 (information)  at d 301, est 43.28s, actual 80.28s
phased e25 -0.3867 (information)  at d 101, est 110.17s, actual 179.63s
phased e50 -0.2817 (in-sample)  at d 201, est 97.39s, actual 135.59s
phased e75 -0.1300 (information)  at d 301, est 69.84s, actual 80.28s
estimator: phased
constants: kappa 0.3221  psi 50.9930  (fitted on this run; in-sample)
stability: limit 21.07s (10% of wall time)  d* 243  raw 0.6060  showFromFraction 0.45  (in-sample)
minCandidatesDone 10
FLAG: raw show fraction 0.6060 > 0.45; capped
replication count: T - B (base-mode trace has no row flags)
slowdown beta 0.00306428 (halves rule; fitted on this run; in-sample)
slowdown e25 -0.1124 (information)  at d 101, est 159.45s, actual 179.63s
slowdown e50 -0.0382 (in-sample)  at d 201, est 130.42s, actual 135.59s
slowdown e75 0.0370 (information)  at d 301, est 83.24s, actual 80.28s
round 4: shipped estimator slowdown
stability: limit 21.07s (10% of wall time)  d* 131  raw 0.3267  showFromFraction 0.35  (in-sample)
window d 9-38: 366 ms/candidate  sim-server 5.54 CPU-s/candidate  cores busy 15.1  machine load 100,93
window d 39-68: 186 ms/candidate  sim-server 2.85 CPU-s/candidate  cores busy 15.3  machine load 100
window d 69-98: 313 ms/candidate  sim-server 4.53 CPU-s/candidate  cores busy 14.4  machine load 85,100
window d 99-128: 454 ms/candidate  sim-server 6.91 CPU-s/candidate  cores busy 15.2  machine load 96,93,100
window d 129-158: 537 ms/candidate  sim-server 7.80 CPU-s/candidate  cores busy 14.5  machine load 99,99,100,91
window d 159-188: 377 ms/candidate  sim-server 5.52 CPU-s/candidate  cores busy 14.6  machine load 100,99
window d 189-218: 382 ms/candidate  sim-server 5.42 CPU-s/candidate  cores busy 14.2  machine load 100,94,87
window d 219-248: 758 ms/candidate  sim-server 10.12 CPU-s/candidate  cores busy 13.4  machine load 100,94,99,74,91
window d 249-278: 500 ms/candidate  sim-server 5.83 CPU-s/candidate  cores busy 11.6  machine load 90,81,79
window d 279-308: 494 ms/candidate  sim-server 5.13 CPU-s/candidate  cores busy 10.4  machine load 79,69,79
window d 309-338: 558 ms/candidate  sim-server 5.31 CPU-s/candidate  cores busy 9.5  machine load 77,81,77,80
long tasks: none in this trace
client floor m 1.95863 ms (bisection on [0, 10] ms, 60 steps; fitted on this run; in-sample)
alternative slowdown beta x0.5: e25 -0.2397  e50 -0.1437  e75 -0.0308  d* 142  raw 0.3541
alternative slowdown beta x1.5: e25 -0.0010  e50 0.0451  e75 0.0863  d* 165  raw 0.4115
alternative client floor m x0.75: e25 -0.2590  e50 -0.1974  e75 -0.0737  d* 231  raw 0.5761
alternative client floor m x1: e25 -0.0853  e50 -0.0047  e75 0.0908  d* 131  raw 0.3267
alternative client floor m x1.25: e25 0.1108  e50 0.2073  e75 0.2553  d* 299  raw 0.7456
alternative recent window: e25 -0.3505  e50 -0.1816  e75 -0.0083  d* 231  raw 0.5761
alternative online slowdown: e25 -0.3867  e50 0.0963  e75 0.0240  d* 260  raw 0.6484
```

Time per candidate rises through run 1's candidate phase in two stretches.
Up to about the 218th candidate, the sim server stays saturated (14.2-15.3
cores busy, the `--windows` lines) while wall time per 30-candidate window
varies. Hypothesis, untested: the windows differ in how many sims their
candidates need, since rings and trinkets sim two slots and candidates are
dispatched by EP gain; no per-window sim count was taken, and the `window`
lines report sim-server CPU-s per candidate, not sims. From about the
219th candidate, busy cores fall to 9.5 and machine load to 69-81% while
the sim server's CPU per candidate does not rise with them (5.13-5.83 from
d 249 on, inside the 2.85-7.80 of the windows before d 219; the d 219-248
window reads 10.12), so the server waits for work. That the cause is the
tab rebuilding the whole running table twice per finished candidate is a
hypothesis: no
render time was measured, and this trace has no long-task data. The
shipped estimator is therefore the phased estimator with a per-candidate
slowdown term, with kappa 0.3221, psi 50.993, slowdown 0.003064 (halves
rule), showFromFraction 0.35 and minCandidatesDone 10, all fitted on this
run and so in sample (slowdown e50 -0.0382). Run 2 is the out-of-sample
test, with the unchanged bound |e50| <= 0.25. Known limits: one run on one
setup (feral, 364 candidates, one machine, fresh profile); the slowdown
measures the tab's table-rebuild cost relative to sim speed, so if that
rebuild changes the estimate reads high until slowdown, kappa and psi are
refitted; many saved gear sets may slow the rebuild, so the estimate may
read low there (hypothesis, untested); the WASM-worker path is
unmeasured; and on pools much longer than 364 candidates the estimate will read low late (hypothesis).
