Status: open
Type: measurement blocked (unexplained performance)
Origin: slice 3 + orchestrator follow-up, 2026-08-14
(`.scratch/handoffs/wowsims-tab/slice-3/HANDOFF.md`, E-W2 sections)
Blocks: plan §9.3 (slice 3 done-when), decision D7's iteration default
Blocked by: none

# E-W2 unmeasured: browser WASM sim is inexplicably slow

Plan §8's E-W2 asks for wall-clock per candidate at 3,000 and 5,000 iterations
in-browser. **Not obtained.** Sims that finish in seconds outside the browser do
not finish in minutes inside it, and the cause is not identified.

## What is measured

| Observation | Value |
| --- | --- |
| `lib.wasm`, 5,000 iterations, direct Node harness | **14.7 s** |
| Upstream's own Simulate button, same page, after fixing worker bundles | **93 s, did not finish** |
| Busy-loop 1 s: main thread vs Worker | 5,493,974 vs 5,087,158 (**1.1×**) |
| `WebAssembly.compile` of the 20 MB module | **22 ms** |
| `navigator.hardwareConcurrency` | 20 |

The engine is not slow: the same binary does 5,000 iterations in 14.7 s under
Node on this machine. Something in the browser delivery path is.

## Ruled out

- **Worker-thread throttling.** Slice 3 proposed this, citing
  `document.hidden === true`. The busy-loop ratio of **1.1×** refutes it —
  Workers run at essentially full speed in this pane. `document.hidden` is true
  but is not the mechanism.
- **WASM compilation** — 22 ms.
- **Core starvation** — 20 cores, main thread unaffected.
- **This detour's code** — upstream's own Simulate button reproduces it with
  none of the tab's adapters involved.
- **Missing worker bundles** — this *was* a real bug (see below) and fixing it
  did **not** fix the slowness.

## Fixed along the way (real bug, unrelated to the slowness)

`dist/tbc/` contained no JavaScript: `vite.build-workers.mts` had never been
run. `sim_worker.js` 404'd; `wasm_exec.js` returned vite's `index.html`
fallback as `text/html`. Fix — note it needs `go` on `PATH`:

```bash
eval "$(fnm env --shell bash)"
export PATH="/c/Program Files/Go/bin:$PATH"
npx tsx vite.build-workers.mts
```

This belongs in the serving recipe next to the asset copy and the per-spec
`index.html` generation.

## Untested candidates

- The **vite dev server** serving unbundled ES modules to the worker. A
  production build (`make host` / `vite build`) may behave differently.
  **Untested hypothesis.**
- A first-run WASM warm-up or DB-marshalling path that dominates at low
  iteration counts.
- Something specific to the automation harness that a busy-loop cannot detect —
  e.g. how the pane schedules `postMessage` traffic between worker and page.

## Why it matters

D7 sets the in-browser default at 3,000 iterations "raise only after E-W2
measures the budget". Until E-W2 has real numbers, that default is unjustified
in either direction, and plan §5's candidate-count budget is guesswork.

## Acceptance criteria

- [ ] Wall-clock for baseline + 20 candidates at 3,000 and 5,000 iterations,
      with worker count and machine, written into plan §5.
- [ ] Either the slowness is explained, or it is shown absent in a real
      foregrounded browser (in which case say so, with the numbers).
- [ ] If a production build behaves differently from the dev server, record
      that — it changes how every future in-browser measurement is taken.
