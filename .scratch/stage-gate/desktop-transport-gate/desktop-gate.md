# Desktop transport gate — evidence

Stage `desktop-transport-gate`, executor run 2026-09-14. Fork tip
`2781486d6` (pre-commit); core branch `feat/desktop-transport-gate` off
`654a53b6`. Packaged binary `wowsimtbc.exe` sha256
`f0582d53b335bea9019f778ba4ce4a6928f7161a1169b16b05dd171e1d017876`.

## Served worker (S3; step 2)

Packaged binary on `http://localhost:3333` (no `--usefs`), started from cwd
`<fork>`. On `/tbc/paladin/retribution/`:

Served-asset evidence for `/tbc/sim_worker.js`:

```
{ bytes: 21496, wasmRefs: 0, asyncProgressRefs: 2, readyFalse: 1,
  firstLine: '//#region node_modules/@protobuf-ts/runtime/build/es2015/binary-format-contract.js' }
```

- `/tbc/lib.wasm` → **404** (embedded server does not serve the wasm blob).
- `/tbc/paladin/retribution/` → **200**.

So `sim/web/main.go`'s rewrite (C2, lines 427-431) to `net_worker.js` is live:
zero `WebAssembly` references, one `ready(false)`, and `asyncProgress` polling
— the HTTP transport, from the served body itself, independent of the browser.

The served body itself was **not retained**; re-fetch with
`curl -s http://localhost:3333/tbc/sim_worker.js` (F11). (`served-sim_worker.js`
under this stage dir is gitignored per `<stage>/.gitignore`.)

## Full runs, both transports (step 5)

Both uncapped, ret phase 5, fork 2781486d6. Readbacks committed:
`readback-3333-tip.json`, `readback-wasm-tip.json`.

| | 3333 (embedded, screened) | WASM page (loop) |
| --- | --- | --- |
| runner | BulkHttpSimRunner | WasmSimRunner |
| done / timedOut / panic | true / false / false | true / false / false |
| rowCount | 601 | 601 |
| aboveCutoff | 33 | 36 |
| eligibleCount | 617 | 617 |
| baselineDps | 2231.5 | 2072.2 |
| requests.bulkSimAsync | 29 | 0 |
| requests.raidSimAsync | 50 | 0 |
| workerSessionsAttached | 11 | 9 |
| servedWorker.wasmRefs | 0 | 6 |
| screeningFallbackWarnings | 0 | 0 |
| elapsedS | 3419 | 1668 |

The WASM run's `bulkSimAsync 0 / raidSimAsync 0` with `workerSessionsAttached 9`
is the F2 result: the observer was attached to every worker session and saw zero
HTTP sim traffic, so the zero is a real measurement, not a deaf observer.

## Q1 (run-level; step 5)

`eligibleCount(3333) == eligibleCount(WASM) == 617` and both `<= 617` (the
committed ret-p5 universe size, C31): the embedded bundle declares the same
candidate pool as the WASM page, so the universe/EP data survived the embed. The
byte-level Q1 is § "Q1 by bytes" below.

**C14 ruled FALSE (D4):** uncapped, `rowCount 601` != `eligibleCount 617` on both
origins -- 16 screened-out candidates do not land as rows. The gate's (e) uses a
measured `FULL_ROWS = 601` for the uncapped branch, not eligibleCount.

## Q2 (desktop run time and the screening factor; step 5)

Candidates were written before measuring (plan step 5): (a) desktop `elapsedS` <=
1/3 WASM -> screening engages as designed; (b) desktop within 1.5x WASM ->
screening not engaging; (c) between -> engaged but the final pass dominates.

**Measured: desktop 3419s vs WASM 1668s -> desktop is 2.05x SLOWER.** This is
worse than all three written candidates anticipated. Screening **is** engaging
(bulkSimAsync 29 completed bulk chunks over the ~25 chunks of a 617-candidate
pool at MAX_CANDIDATES_PER_BULK_REQUEST 25), but the per-chunk refinement the
Go bulk sim runs plus the 8x5 replication makes the whole desktop
pipeline ~2x slower than the WASM page's per-candidate loop. (Mechanism
corrected 2026-09-15: the driver is the **finalist** stage at 72.9% of wall
clock, not the culling pipeline, which is skipped at 25 candidates. See ticket
397; fix is ticket 403.) This refutes the
brief's/plan's Q2 hypothesis that bulk screening would make the desktop run
faster. **Finding for Gate C** (candidate: an engine-side bulk-sim performance
question, or the desktop path is simply not a speed win for a full pool). No
ticket filed by the executor pending the orchestrator's call; the gate itself
runs capped (cap 40), so this does not affect the gate's runtime.

## Cross-transport T1/T2/T4 (step 5, stage evidence -- see D3)

`check_desktop_tab.py --cross-transport --compare readback-3333-tip
readback-wasm-tip` (T3 reported, not asserted, per the plan):

- T1 FAIL: key sets differ (same items, different slot/membership at the cutoff
  boundary). onlyA: Band of Ruinous Delight @ Finger 1. onlyB: same ring @
  Finger 2 + Abacus/Harness/Steely Naaru Sliver.
- T2 FAIL: max 19.1 DPS > K 12.0 over 32 rows.
- T3: 0 shared top-8 keys (membership differs), not asserted.
- T4 pass: median -0.35 (within 3.4).
- baselineDpsDiff 159.3, aboveCutoffSymDiff 5.

**This is a cross-compilation artifact, not a screening defect (D3).** The 159.3
DPS baseline gap is on the loop route with no screening; the Go-native binary and
the WASM build are numerically distinct engines, so per-row deltas differ by that
gap (hence T2 19.1 > 12) and top-8 membership shifts (hence T1). T4 within 3.4
shows no uniform screening offset. The load-bearing screened-path check is the
**same-transport** screen check in § "Screen check" below (step 7), where both
runs use the same engine.

## Q1 by bytes (step 6)

`check_desktop_tab.py --bytes-only --origin http://localhost:3333` -> rc 0,
**309 files compared, 0 mismatches**. Candidate (a) won: every file under
`dist/tbc` (minus the C4 strip list, `assets/db_inputs/**`, and make's
`.dirstamp` markers -- D5) is served byte-identical by the embedded binary, and
`sim_worker.js` is served with the bytes of `net_worker.js` (rewrite confirmed,
differs from dist `sim_worker.js`). The embedded bundle is intact.

> **Superseded in part, 2026-09-16 (ticket 403).** Everything below is the
> record of the runs as they were taken, and it stands as that. But the gate has
> since changed shape: the tab now takes the per-candidate loop on **both**
> transports, so (b) asserts `WasmSimRunner`, (c) asserts `bulkSimAsync == 0 and
> raidSimAsync >= 1`, and the N2 negative is retired (a forced fallback is no
> longer distinguishable from the normal path, because they are the same path).
> Check (h) is no longer a screened-vs-loop twin comparison: it compares the run
> against the committed golden readback
> `data/desktop-gate/golden-ret-p5-cap40.json` on `rows`, `aboveCutoffItems` and
> `baselineDps`, exactly. The `--force-fallback` and `--no-screen-check` flags
> are gone and `--update-golden` is new. See `data/desktop-gate/README.md` and
> `.scratch/stage-gate/bulk-finalist-cost/predictions.md`. N1 (a vite-served page)
> still fails, on (a) and (c).

## Screen check + gate on the tip (step 7)

`pnpm desktop-gate:check` (here `check_desktop_tab.py --no-build`, binary current
from step 3; the pnpm form defaults to --build which is a no-op re-run) -> **rc 0,
all of (a)-(h) pass**. Cap 40, same-transport screened-vs-loop twin.

```
(a) pass: served worker wasmRefs=0 readyFalse=1 (S3)
(b) pass: runner=BulkHttpSimRunner (S1)
(c) pass: bulkSimAsync 200s=3 workerSessionsAttached=11 poolSize=20 (S2)
(d) pass: done=True runTimedOut=False
(e) pass: rowCount=40 expected=40 eligibleCount=617 EXPECTED_ELIGIBLE=617 (uncapped uses FULL_ROWS=601, C14 false)
(f) pass: panicHit=False
(g) pass: screeningFallbackWarnings=0 (S4; meaningful only because (d) passed)
(h) screen check:
    T1 key sets identical: pass
    T2 rows 9..N |d|<=12.0: pass (max=8.1 over 32 rows)
    T3 top-8 |d|<=0.3: pass (max=0 over 8 rows; server determinism)
    T4 |median|<=3.4: pass (median=0.0 over all rows)
    recorded: maxPerRowDiff=8.1 aboveCutoffSymDiff=1 baselineDpsDiff=0.0
    twin wall clock: 21.7s
```

This is the **load-bearing screened-path validation** (F3): screened vs forced-
loop on the **one 3333 binary**, so `baselineDpsDiff=0.0` (same engine,
deterministic) and T3 agrees to 0 DPS over the 8 top-8 rows. T2's 32 rows now
include the below-cutoff rows (D6 fix), max 8.1 < K=12, so no screening error
above the noise bar; T4 median 0.0 shows no uniform offset (C33's bug class
absent). The screened path prices rows correctly.

Twin wall clock 21.7s vs C32's <= 4.2 min (252s) bound: **ratio 0.086** -- the
forced-loop twin over 40 candidates is far under the bound (it is a
per-candidate loop at cap 40, not the full pool). The measured cost of (h) is
21.7s per gate invocation.

## Negative runs (step 7)

Both recorded verbatim; both correctly refused (rc 1).

**N1** `check_desktop_tab.py --no-build --serve-args "--usefs=true --wasm=true"`
-> real WASM served from `./dist` (C2). rc 1.

```
byte check: 1 mismatch -- sim_worker.js served body equals dist (rewrite did not happen)
(a) FAIL: served worker wasmRefs=6 readyFalse=0 (S3)
(b) FAIL: runner=WasmSimRunner (S1)
(c) FAIL: bulkSimAsync 200s=0 workerSessionsAttached=9 (S2)
(d) pass; (e) pass; (f) pass; (g) pass
(h) skipped -- (a)-(g) did not all pass
```

**N2** `check_desktop_tab.py --no-build --force-fallback` -> the real embedded
server, runner fallback forced once (C26, C27). rc 1. **This is the brief's
false-pass scenario:** the run **completed** over HTTP (raidSimAsync 87) with the
WASM runner, and the gate still refused it on the two signals the tab does not
control.

```
byte check: 0 mismatches (genuine embedded server)
(a) pass: served worker wasmRefs=0 readyFalse=1 (S3 -- embedded server)
(b) FAIL: runner=WasmSimRunner (S1 -- forced fallback)
(c) FAIL: bulkSimAsync 200s=0 (S2)
(d) pass: done=True runTimedOut=False  (the run COMPLETED)
(e) pass; (f) pass; (g) pass
(h) skipped -- (a)-(g) did not all pass
```

N2 is the proof that "the tab said HTTP" or "the run finished" alone cannot pass
the gate: (a) and (d) pass (embedded server, completed run), yet (b) and (c) fail
because the tab actually used the WASM runner and issued zero bulk traffic.

## Old-vs-tip comparison (step 9)

Fork rebuilt at pre-Chunk-1 `5e9013b78` (detached), old-sha full readback with
the copied tip harness (`run-tab-cdp.tip.mjs`), then restored to
`feat/upgrades-tab` (eb040855c) and rebuilt. `readback-3333-old.json`:

- done true, panicHit false, rowCount 601, aboveCutoff 33, eligibleCount 617.
- **runner null** (the old sha has no `data-runner` attribute) -- expected,
  recorded, not a step-9 failure; the harness rc 1 is only its `runner!=null`
  exit gate.
- **servedWorker.wasmRefs 0, bulkSimAsync 29** -- embedded mode worked on 3333
  pre-Chunk-1 too, so any regression would be Chunk 1's (none found).
- baselineDps **2229.7**; elapsedS 3551 (~59 min).

`compare_readbacks(old, tip)`:

- **baselineDpsDiff 1.8** (old 2229.7 vs tip 2231.5). ADR-0033 Consequence 5
  predicts about -0.67 DPS for a two-handed ret main hand across the master
  re-pin (what ret P5 sims); 1.8 DPS is within that plus single-baseline seed
  noise (well under the 3.4 cutoff bar). **Explained by ADR-0033, no ticket.**
- **aboveCutoffSymDiff 0** -- the above-cutoff row set is identical old vs tip.
- **T2 max 5.5 <= 12** over 33 rows; **T4 median -0.7 <= 3.4** -- per-row deltas
  agree tightly, no systematic shift.
- T1 "FAIL" is the same below-cutoff-parsing artifact as D6, here amplified by a
  harness-version mismatch: the old readback used the copied tip harness (WITH
  the D6 `<details>` expand), so its below-cutoff rows parse with real item/slot;
  the tip readback (`readback-3333-tip.json`) was produced in step 5 BEFORE the
  D6 fix, so its below-cutoff rows are `('','','')`. The `onlyA`/`onlyB` split is
  entirely that parser-version difference, not a row-set change (the above-cutoff
  set matches exactly, T2/T4 agree). No Chunk-1 regression.

`fork-universes:check` after restore: still 29/63 drifted (the pre-existing D7
CRLF drift), unchanged by the checkout -- the restore added no new drift.

## Q3 -- release artifact on Windows (step 10)

`which zip` -> rc 1 (absent); `go`/`make`/`protoc` present (C8 confirmed).

Candidate (a) `make release`: **fails at the first zip line**, verbatim:

```
zip wowsimtbc-windows.exe.zip wowsimtbc-windows.exe
process_begin: CreateProcess(NULL, zip wowsimtbc-windows.exe.zip wowsimtbc-windows.exe, ...) failed.
make (e=2): The system cannot find the file specified.
make: *** [makefile:191: release] Error 2
```

Candidate (b) **won**: every platform binary was produced before the zip step --
all seven `go build` lines (makefile:176-190) ran clean:

- wowsimtbc-windows.exe (107038720 bytes), sha256
  `cc503ca23fa163f8e4bb9378dede8656da40a652ecc92d15317f85dab4f0bb37`
- wowsimcli-windows.exe (22545408)
- wowsimtbc-amd64-darwin (107009312), wowsimtbc-arm64-darwin (106895506),
  wowsimcli-arm64-darwin (21818610), wowsimtbc-amd64-linux (106598584),
  wowsimcli-amd64-linux (22114488) -- all built, then deleted per the plan.

**One-line fix** (candidate (c), recorded not applied -- installing `zip` is a
machine change, out of scope): install `zip` on PATH (e.g. the ezwinports `zip`
package), or replace makefile:191-198's `zip` lines with PowerShell
`Compress-Archive`. The gate rests on `make wowsimtbc`, not `make release`, so
this does not block it.

Smoke of the release `wowsimtbc-windows.exe` on 3333 (smoke-release-cap20.json):
runner=BulkHttpSimRunner, done true, rowCount 20, bulkSimAsync 2, wasmRefs 0,
panicHit false, elapsedS 173. The release-built windows binary serves the
embedded HTTP transport exactly like `make wowsimtbc`'s `wowsimtbc.exe`. Windows
release binaries cleaned afterwards.
