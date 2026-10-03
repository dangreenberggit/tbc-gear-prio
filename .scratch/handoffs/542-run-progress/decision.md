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
