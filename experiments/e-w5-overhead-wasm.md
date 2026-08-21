# E-W5 §3.1 — per-request cost under the WASM runtime

Command: `npx tsx scripts/ew5_overhead_wasm.mjs`
WASM module: `vendor/tbc-new-fork/dist/tbc/lib.wasm` (20MB build artifact, gitignored — rebuild with
`cd vendor/tbc-new-fork && GOOS=js GOARCH=wasm go build -o dist/tbc/lib.wasm ./sim/wasm/`, needs a Go toolchain on PATH).
Toolchain provenance: `go version go1.25.4 windows/amd64`, GOROOT `C:\Program Files\Go`,
Go runtime shim `C:\Program Files\Go\lib\wasm\wasm_exec.js` (not vendored in the fork — read
directly from GOROOT).
Fixture: `test/fixtures/slamaltman.raid-sim-request.json`, seed 42, 5 repeats per point.

**Database note:** database (proto field 50) is a Player field, not a RaidSimRequest field (sim/core/proto/api.pb.go:172 vs :2024-2033) — corrects the ticket's field list. Built via SimDatabase.fromJson/.toJson round-trip over the full assets/database/db.json (not trimmed to fixture-referenced items — a full-DB inject the ticket calls acceptable) and attached to exactly one player, not all 25 raid slots: addToDatabase (sim/core/database.go:26) is a global first-write-wins registry, so one copy suffices, and attaching it to all 25 slots (24 of which are empty {} filler in this fixture) inflated the request to 56.6MB and made every call take ~24s regardless of iteration count — measurement noise from request size, not sim cost, that would have corrupted t_iter. One copy cut the 100-iteration call to ~1.35s with identical DPS.

## Sweep (median of 5 repeats)

| iterations | median wall-clock (ms) | median dps |
| ---------- | ---------------------- | ---------- |
| 100        | 1255.7                 | 2026.7     |
| 300        | 1855.2                 | 2039.3     |
| 1000       | 4064.2                 | 2040.9     |
| 3000       | 9577.9                 | 2042.8     |
| 5000       | 17488.0                | 2042.4     |

Raw per-repeat data is in `e-w5-overhead-wasm.json` (`raw` key); every run's
`iterationsDone` was checked to equal the requested iteration count before
being accepted (script throws otherwise).

## DPS sanity check

Median 5000-iteration DPS: **2042.3926**
(CLI reference ~2042.4; E-W1 showed WASM and native
agree to 1.8e-12 DPS on this fixture). The script throws before writing any
output if this check fails, so a published file means the check passed.

## Fit

`t_fixed` = 748.4 ms, `t_iter` = 3.2446 ms/iteration
(least-squares fit of wallMs ~ t_fixed + t_iter * iterations over the five
median points above; wall-clock per call includes fresh instance boot —
WebAssembly.instantiate + go.run + wasmready — plus the raidSimJson call
itself, matching what a worker pays on a cold module load).

## Screening-cost floor (the number that decides M2)

`cost(5000)` = t_fixed + t_iter × 5000 = **16971.4 ms**

`floor` = t_fixed / cost(5000) = **0.0441**

Below 0.25: **true**

## Per-worker memory

WASM linear memory after a 5000-iteration call (largest sweep point): **402.7 MB**
(`instance.exports.mem.buffer.byteLength` for one fresh instance, sampled in
a separate pass from the timing sweep — wallMs 17130.1).
This replaces the CLI's native-process RSS figure (183.8 MB,
candidate-pool.md §3.1) as the basis for ticket 201's `memoryCap` /
`MEASURED_MB_PER_SIM_PROCESS` — that constant was always flagged as a
cross-runtime proxy, not a measured browser number, and this is the
measured browser number.
