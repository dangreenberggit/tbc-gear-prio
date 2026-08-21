Status: open
Type: misleading abstraction (behaviour is currently correct)
Origin: pre-merge review of `feat/candidate-pool`, Carmack axis R10, 2026-08-15
Blocks: none
Blocked by: none

# `memoryCapFromDeviceMemory` returns 4 on every browser it will ever run in

The fork adapter
(`ui/core/components/individual_sim_ui/upgrades/adapters/wasm_sim_runner.ts`)
sets `concurrency = min(workers, memoryCapFromDeviceMemory())`, deriving the
cap from three numbers, none measured on the path it governs:

1. `MEASURED_MB_PER_SIM_PROCESS = 183.8` — measured for a **native
   `wowsimcli` OS process**, applied to a **WASM worker in a tab**. Different
   allocator, different GC, different growth policy: a WASM linear memory
   only grows, while a Go process's RSS includes the runtime and binary image.
2. `navigator.deviceMemory` — spec-capped at 8 and rounded to a power of two,
   so a 64 GB workstation and a 16 GB laptop both report `8`.
3. A `/2` reserve factor with no stated justification.

Work the cases: `8 → 4096/183.8 = 22`, `4 → 11`, `2 → 5`. Every one is then
`min(numWorkers = 4, cap)` → **4**. On Firefox and Safari `deviceMemory` is
`undefined` and the fallback returns **4**. The function is a constant
expressed as arithmetic over three unmeasured inputs.

**The behaviour is correct today** — 4 is the right answer — and the
docblock does flag the figure as a hypothesis rather than a measured browser
number, which satisfies the durable-claims rule. The problem is that a future
reader will trust the calculation and tune the wrong knob.

## What to do — pick one

- **Measure it.** Sample `WebAssembly.Memory.buffer.byteLength` or
  `performance.measureUserAgentSpecificMemory()` for one worker in the
  browser and derive the cap from a real number. ~30 lines, and it makes the
  arithmetic mean something.
- **Or drop the cap.** `concurrency = numWorkers` with a comment saying no
  in-browser memory measurement exists, so no cap is derived. One line, and
  it stops implying precision that is not there.

Ticket 156's browser measurement is the natural place to get the real number.

## Acceptance criteria

- [ ] Either the cap derives from an in-browser measurement, or it is gone
      and the comment says why.
- [ ] No committed claim implies a measured browser figure that does not
      exist.

## 2026-08-15 — the missing measurement now exists

Ticket 203 measured WASM linear memory directly:
**402.7 MB** for one fresh instance after a 5,000-iteration call
(`instance.exports.mem.buffer.byteLength`, sampled in a pass separate from the
timing sweep). Command and provenance in `experiments/e-w5-overhead-wasm.md`.

That is the browser-runtime number this ticket said was missing — it replaces
the 183.8 MB native-CLI RSS proxy currently hardcoded as
`MEASURED_MB_PER_SIM_PROCESS` in `wasm_sim_runner.ts`. Note it is **more than
double** the CLI figure, so the current constant under-estimates per-worker
memory by ~2.2×: WASM linear memory only grows (no native `free`), so the
number is shaped by the allocator rather than the sim's working set.

This does not by itself close the ticket. The objection was that the function
is a constant wearing a calculation — with 402.7 MB and a `navigator.deviceMemory`
that is spec-capped at 8 and power-of-two rounded, `4096/402.7 = 10` still
clamps to `min(numWorkers = 4, 10) = 4` on every realistic machine, so the cap
still never binds. Whoever takes this should decide between the two options
above with the real number in hand, and should fold in M2's screening pass
(§3.4.1), which changes how many concurrent sims are in flight.

Status: **open** (input measured; the design decision remains).
