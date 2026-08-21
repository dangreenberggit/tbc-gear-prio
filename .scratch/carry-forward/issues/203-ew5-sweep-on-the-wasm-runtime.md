Status: closed
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

## 2026-08-15 — done

Harness `scripts/ew5_overhead_wasm.mjs`, outputs
`experiments/e-w5-overhead-wasm.{json,md}`, WASM table in candidate-pool §3.3,
decision in **§3.4.1**.

| quantity                | value                |
| ----------------------- | -------------------- |
| `t_fixed`               | 748.4 ms             |
| `t_iter`                | 3.2446 ms/iteration  |
| `cost(5000)`            | 16,971.4 ms          |
| **floor**               | **0.0441**           |
| per-worker WASM memory  | 402.7 MB             |

**Floor is below 0.25 by more than 5×**, so with §3.2's `max K* = 25 ≤ 60`
both legs of the gate pass and **M2 resumes at slice E**.

Verified by the orchestrator rather than accepted from the handoff: the
least-squares fit reproduces exactly from the committed medians (748.3672 /
3.244603), and the 5,000-iteration median DPS is **2042.3926145882178**,
matching E-W1's recorded WASM figure digit for digit, so the sim genuinely
ran rather than erroring into a plausible-looking number.

Two corrections the harness surfaced, both worth keeping:

1. `SimDatabase` attaches to **`Player`**, not `RaidSimRequest` — this
   ticket's own field list said field 50 on the request root, and the Go side
   rejected it with `protojson`'s unknown-field error.
2. Attaching the database to all 25 raid slots (24 of them empty filler)
   inflated the request to 56.6 MB and added ~24 s of parse overhead **per
   call regardless of iteration count** — which would have silently corrupted
   `t_iter`. Caught by noticing near-identical wall-clock across very
   different iteration counts. `addToDatabase` is a first-write-wins global
   registry, so one copy on the real player is correct and sufficient.

Also supersedes ticket 201's input: `memoryCap` now has a measured browser
number (402.7 MB) instead of the 183.8 MB native-CLI proxy.

Status: **closed**.
