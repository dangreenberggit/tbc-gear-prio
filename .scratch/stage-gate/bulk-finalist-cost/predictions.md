# Pre-registration and measurements — bulk-finalist-cost (Track C)

Written at Step S1, **before any measurement was taken**. Everything under
"Measured, ..." is filled in afterwards by the step that measured it.

## SHAs at pre-registration

| Repo | SHA |
| --- | --- |
| core (`C:\Users\dgree\Code\lulz\tbc-gear-prio`, branch `feat/desktop-transport-gate`) | `bc6a6eb7b8d4a8e635dc6eac5a91d8a5dbb4bf2f` |
| fork (`vendor\tbc-new-fork`, branch `feat/upgrades-tab`) | `e94d927af0ff7c31f071c961d1d7789980c8b8c9` |

Both trees clean at pre-registration (`git status --porcelain` empty in each).
Fork HEAD equals `data/wowsims-fork.lock.json` `commit`, and that file's
`pushed` is `true`.

## The "fix is wrong" list, verbatim from plan.md Q3

> **Comparisons** — Step C3. The "fix is wrong" results: any row shortfall
> (`rowCount` != 40); any `bulkSimAsync` request on the post-fix desktop run;
> rows differing from the pre-fix loop twin; or T1/T2/T4 failing against the
> pre-fix screened run.

Any one of those is a stop-and-report, not something to tune away.

## Predicted, cap 40

| Quantity | Pre-fix screened | Pre-fix loop twin | Post-fix desktop |
| --- | --- | --- | --- |
| `rowCount` | 40 | 40 | 40 |
| `runner` | `BulkHttpSimRunner` | `WasmSimRunner` | `WasmSimRunner` |
| `requests.bulkSimAsync` | 3 | 0 | 0 |
| `requests.raidSimAsync` | (not asserted) | >= 1 | >= 1 |
| `aboveCutoff` | about 14, must be >= 9 | about 14 | about 14 |
| `elapsedS` | about 257 s (reported) | 17-22 s (reported) | **15-25 s, reported not asserted** |

`elapsedS` is **reported, not asserted**: wall clock on this machine varied 1.5x
between identical cap-20 runs (plan C13), so no step passes or fails on it.

## Predicted, cap 150 (Step S3)

`rowCount` about 134; any value 100-150 passes. `runner` `WasmSimRunner`,
`bulkSimAsync` 0, `raidSimAsync` >= 1, all rows populated. The two runs must
agree exactly on `rows`, `aboveCutoffItems` and `baselineDps` — that exact
agreement is what licenses the golden readback's exact-equality comparison in
Step C4, so a disagreement is a stop.

Full-pool cost stays a **hypothesis, untested** throughout: point about 136 s,
band **80-195 s** (plan C37). Constraint 5 forbids measuring it.

## Binary hashes

| Build | sha256 of `vendor\tbc-new-fork\wowsimtbc.exe` |
| --- | --- |
| binary, pre-fix | `3b46da4dc62cc951e338d80817b51a57293e0ddaf99cb43193c8bc15b219be49` |
| binary, post-fix | _(filled in at C2)_ |

Both built with `make -C vendor\tbc-new-fork wowsimtbc` under Node 22.17.1.

## Measured, pre-fix

Cap 40, one server start, stderr at `server-prefix.log.err`.

| Quantity | `prefix-cap40-screened.json` | `prefix-cap40-loop.json` |
| --- | --- | --- |
| `done` / `runTimedOut` / `panicHit` | true / false / false | true / false / false |
| `rowCount`, rows with `dps` | 40, 40 | 40, 40 |
| `runner` | `BulkHttpSimRunner` | `WasmSimRunner` |
| `requests.bulkSimAsync` | 3 | 0 |
| `requests.raidSimAsync` | 46 | 87 |
| `screeningFallbackWarnings` | 0 | 0 |
| `aboveCutoff` | **14** | 13 |
| `baselineDps` | 2231.5 | 2231.5 |
| `elapsedS` (reported, not asserted) | **263** | **19** |

`aboveCutoff` 14 is >= 9, so cap 40 does produce the un-replicated above-cutoff
row class and no cap raise was needed.

**Finalist stage.** `grep -c "Stage: finalist - Started" server-prefix.log.err`
= **2** (the plan accepts 1 to 3; C27 says a chunk may skip the stage, and the
third chunk did). The two stage `Duration:` lines are **87.27 s** and
**87.22 s**, so the finalist stage accounts for 174.5 s of the run's 263 s —
**66%**, consistent with the 60-63% measured at cap 20 (C13).

**Baseline pair is sound.** `python scripts/check_desktop_tab.py --compare
prefix-cap40-screened.json prefix-cap40-loop.json` exits **0**:

```
T1 key sets identical: pass
T2 rows 9..N |d|<=12.0: pass (max=8.1 over 32 rows)
T3 top-8 |d|<=0.3:      pass (max=0.0 over 8 rows)
T4 |median|<=3.4:       pass (median=0.0 over all rows)
recorded: maxPerRowDiff=8.1 aboveCutoffSymDiff=1 baselineDpsDiff=0.0
```

Every one of those reproduces C28's recorded values exactly.

**Observed max shift against the C25 bound.** The largest per-row screened-minus-
loop difference is **8.1 DPS** over 32 rows. C25's Track A assertion was <= 6.0
DPS and 3 sigma was 3.4. The observed 8.1 exceeds both — recorded here as the
note the plan's Q3 asked for. It is **not a Track C failure**: C25 was derived as
a Track A acceptance criterion (where screening values shift by sampling noise),
and the plan states explicitly that "Track C does not need it" because Track C's
acceptance is exact byte-equality against the loop twin, not a noise bound. T2's
own limit for this comparison is 12.0 and 8.1 passes it. See execution-report.md, § "Deviation ledger".

## Measured, cap 150

Same server, same pre-fix binary, `--force-fallback` both times.

| Quantity | `prefix-cap150-loop.json` | `prefix-cap150-loop-2.json` |
| --- | --- | --- |
| `done` / `runTimedOut` / `panicHit` | true / false / false | true / false / false |
| `rowCount`, rows with `dps` | 134, 134 | 134, 134 |
| `runner` | `WasmSimRunner` | `WasmSimRunner` |
| `requests.bulkSimAsync` / `raidSimAsync` | 0 / 201 | 0 / 201 |
| `aboveCutoff` | 25 | 25 |
| `baselineDps` | 2231.5 | 2231.5 |
| `elapsedS` | **40** | **40** |

**Determinism — the load-bearing result.** The G2 acceptance one-liner prints:

```
True True True 40 40 134 201
```

`rows`, `aboveCutoffItems` and `baselineDps` are **exactly equal** across the two
runs, over all 134 rows. **Run-to-run variance on the loop path is 0** on the
`elapsedS` figures measured here (40 s and 40 s, ratio 1.000) — the first
loop-variance figure this project has. That exact equality is what licenses Step
C4's exact-equality golden comparison; had any of the three printed `False` the
plan required a stop.

**C37 refit over three measured points** — (20, 13 s), (40, 19 s), (134, 40 s):

- slope **0.2326 s/row**, fixed cost **8.96 s**
- fitted values 13.6 / 18.3 / 40.1 s against measured 13 / 19 / 40 — within 0.6 s
  at every point, so the linear shape holds across a 6.7x range of N
- full pool at 601 rows: point **149 s**, band **86-211 s** (+/-42%, C13's only
  measured variance figure)

The full-pool figure remains **hypothesis, untested** — constraint 5 forbids the
measurement, and 601 is still 4.5x beyond the largest measured point, so
`poolSize` 20 saturation could bend the slope. The refit moves the plan's
predicted point from 136 s to 149 s and its band from 80-195 s to 86-211 s; both
sit against today's **measured 3419 s** for the screened full pool.

The previously-withdrawn cap-150 figure (134 rows, 37 s, 201 `raidSimAsync`) is
now reproduced with an artifact on disk: 134 rows and 201 `raidSimAsync` are
exact matches, `elapsedS` 40 against the reported 37.

## Measured, post-fix

Post-fix binary sha256
`6f5f6911c1f3034dab399d462650d353ae2d34a944cf47eb266359f76b3d9441`
(122,313,216 bytes, built 2026-09-16 07:34).

| Quantity | `c-cap40-desktop.json` | `c-cap40-wasm.json` |
| --- | --- | --- |
| `done` / `panicHit` | true / false | true / false |
| `rowCount`, rows with `dps` | 40, 40 | 40, 40 |
| `runner` | `WasmSimRunner` | `WasmSimRunner` |
| `requests.bulkSimAsync` / `raidSimAsync` | 0 / 87 | 0 / 0 |
| `screeningFallbackWarnings` / `Texts` | 0 / `[]` | 0 / `[]` |
| `aboveCutoff` | 13 | 15 |
| `baselineDps` | 2231.5 | 2072.2 |
| `elapsedS` (reported) | **19** | 448 |

### C3 outcome table

| Line | Check | Result |
| --- | --- | --- |
| 1 | post-fix desktop `rows` and `aboveCutoffItems` == pre-fix loop twin | **`True True`, 19 s vs 19 s** — pass |
| 2 | `--compare` post-fix desktop vs pre-fix screened | **exit 0** — T1 pass, T2 max 8.1/32 rows, T3 max 0.0/8, T4 median 0.0, `aboveCutoffSymDiff` **1** |
| 3 | `--compare` post-fix desktop vs post-fix WASM `--cross-transport` | **exit 1** — T2 max 14.5 (limit 12.0), `aboveCutoffSymDiff` 2, `baselineDpsDiff` 159.3. **Pre-existing, not caused by this change** — see below |
| 4 | `grep -c "Bulk Sim" server-c.log.err` | **0** — pass |

Line 1 is the central Track C claim and it holds exactly: routing the desktop
transport through the loop produces **byte-identical rows** to the
`--force-fallback` twin taken on the pre-fix binary. Line 2's
`aboveCutoffSymDiff` of 1 is the pre-existing screened-vs-loop difference C28
recorded; 0 or 1 pass.

### Line 3: the cross-transport comparison fails, and it failed before this change

C3 line 3 predicted exit 0. It exits 1. The failure is **not** attributable to
Track C, and three measurements establish that:

1. **The same comparison against the pre-fix desktop side fails identically.**
   `--compare prefix-cap40-loop.json c-cap40-wasm.json --cross-transport` exits
   **1** with the same numbers — T2 max **14.5**, `aboveCutoffSymDiff` **2**,
   `baselineDpsDiff` **159.3**. Since line 1 proved the post-fix desktop rows are
   byte-equal to that loop twin, these are arithmetically the same comparison.
2. **The cause is an engine-level baseline difference, not a runner choice.** The
   two runs disagree by 159.3 DPS on the *unmodified current gear set*: 2231.5
   native vs 2072.2 in-browser WASM. `c-cap40-wasm.json` has `raidSimAsync` 0 and
   `servedWorker.wasmRefs` 6, so it genuinely ran in-browser; the desktop run has
   `wasmRefs` 0. Different engines, same gear, different answer.
3. **The gap is pre-existing and already on disk.** The committed readbacks from
   the earlier desktop-transport-gate work carry the identical pair:
   `.scratch/stage-gate/desktop-transport-gate/readback-3333-tip.json`
   `baselineDps` **2231.5**, `readback-wasm-tip.json` **2072.2** — the same 159.3,
   recorded before this plan started.

What line 3 tests at cap 40 is therefore whether two different sim engines agree
within 12.0 DPS per row on rows 9..N, and they do not — the T4 median offset of
-2.25 is the signature of a uniform baseline shift, not a ranking fault. Note that
pre-fix **screened** vs WASM does pass T2 (max 9.3), which is why the gate's
existing cross-transport step was green before: the screened path's finalist-stage
refinement happened to pull rows 9..N closer to the WASM values. Removing that
refinement is exactly what this plan intends, and the plan states the precision
consequence for rows 9..N up front (C32).

**This is a plan gate and it is flagged, not adapted.** No constant was changed,
no threshold loosened, no comparison relaxed. See execution-report.md, § "Deviation ledger".

## Gate

The four pre-registered C4 exit codes, in order:

| Run | Expected | Actual |
| --- | --- | --- |
| (i) `--candidates 40`, no golden present | 2 | **2** |
| (ii) `--candidates 40 --no-build --update-golden` | 0 | **0** |
| (iii) `--candidates 40 --no-build` | 0 | **0** |
| (iv) tamper `rows[9].dps` += 0.1, re-run (iii) | 1 | **1** |

**2, 0, 0, 1 — the pre-registered sequence, in order.**

(i) printed `(h) FAIL: no golden at data/desktop-gate/golden-ret-p5-cap40.json`
and named `--update-golden` and the README, with (a)-(g) all passing under the
inverted (b)/(c):

```
(a) pass: served worker wasmRefs=0 readyFalse=1 (S3)
(b) pass: runner=WasmSimRunner (S1)
(c) pass: bulkSimAsync 200s=0 raidSimAsync 200s=87 workerSessionsAttached=5 poolSize=20
(d) pass: done=True runTimedOut=False
(e) pass: rowCount=40 expected=40 eligibleCount=617
(f) pass: panicHit=False
(g) pass: screeningFallbackWarnings=0
```

(ii) wrote the golden; the verification one-liner prints
**`_note True True True`**, and the file's keys are in the specified order with
`forkCommit e94d927af0ff...`, `cpuCount 20`, `rowCount 40`, `baselineDps 2231.5`.
The file is **0 CR / 350 LF** — the `newline="\n"` guard from known-traps held,
so `fork-universes`-style CRLF drift cannot start here.

(iii) exits 0 with `(h) pass`. Worth noting this is a *fresh* cap-40 run matching
the golden exactly — a third independent confirmation of the loop determinism S3
measured.

(iv) is the meaningful part. Adding 0.1 DPS to `rows[9]` ("Clutch of Demise",
17.3 -> 17.4) produces exit **1**:

```
(h) FAIL: run differs from data/desktop-gate/golden-ret-p5-cap40.json on rows.
  T1 pass; T2 pass (max=0.1 over 32 rows); T3 pass (max=0.0); T4 pass (median=0.0)
  rank 10 Clutch of Demise [Neck] golden 17.4 -> run 17.3 belowCutoff=False
  golden forkCommit=e94d927af... cpuCount=20 vs current forkCommit=e94d927af... cpuCount=20
```

**T1-T4 all pass on that tamper** — a 0.1 DPS shift is far inside T2's 12.0
limit. So the golden catches a value change that the tolerance-based comparison
it replaced would have waved through, which is exactly the coverage G1 said was
missing. Restoring via `--update-golden` printed the full diff before
overwriting, and (iii) re-run exits 0 with the file back to 0 CR / 350 LF.
