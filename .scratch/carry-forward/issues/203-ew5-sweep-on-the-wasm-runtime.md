Status: open
Type: measurement (decides M2)
Origin: plan author's judgment on `feat/candidate-pool` execution, 2026-08-15 (`docs/plans/wowsims-tab/candidate-pool.md` §3.4)
Blocks: candidate-pool M2 (racing) resumption or M3 design pass
Blocked by: none

# Run the E-W5 §3.1 iteration sweep on the WASM runtime, not the CLI binary

E-W5 §3.1 measured `t_fixed` = 373 ms and `t_iter` = 0.064 ms against the
native `wowsimcli` binary, one OS process per request. That gave a cost floor
of 0.54 for any screening pass and killed M2 on the CLI path. But M2 exists
for the browser path, where the WASM module is resident in a worker and the
per-request cost is `NewEnvironment` alone, while per-iteration cost is ~46x
higher (E-W1: 5,000 iterations ≈ 14.7 s under Node-WASM). The verdict does
not transfer; §3.3's scope note already says so.

## Do

Re-run `scripts/ew5_overhead.mjs`'s sweep {100, 300, 1000, 3000, 5000},
five repeats, median, on **`lib.wasm` under Node** using E-W1's harness shape
(`docs/plans/wowsims-tab/plan.md:473` records both gotchas: inject a
`SimDatabase` per player because the WASM build has no `with_db`; define
`wasmready` as a global before `go.run`). Same fixture request, seed 42.
Report `t_fixed`, `t_iter`, and `t_fixed / cost(5000)` into candidate-pool
§3.3 as a second table labelled WASM. Also sample per-worker WASM memory so
ticket 201's `memoryCap` has a real number.

## Done when

- The WASM `t_fixed / cost(5000)` floor is a number in §3.3 with the command
  that produced it.
- Decision recorded in §3.4: floor `< 0.25` → M2 resumes at slice E on
  `feat/candidate-pool` (the §3.2 rank result already holds: K* ≤ 25 on both
  fixtures); otherwise M2 is dead on both paths and M3 gets a design pass.
