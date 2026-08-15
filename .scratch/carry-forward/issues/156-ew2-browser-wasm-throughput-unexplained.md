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
- [x] If a production build behaves differently from the dev server, record
      that — it changes how every future in-browser measurement is taken.

## Comments

### 2026-08-14 (worker A3, respawn)

Built `vendor/tbc-new-fork` at `adb0d135336a26eab613215fa85b1265d7ce2e5d`
(`npx tsx vite.build-workers.mts` then `npx vite build`, 2m36s, `dist/tbc/bundle/`
confirmed non-empty) and served the static output (`http-server`, not the vite
dev server) on `localhost:8123` in the Claude Code Browser pane, same machine
as the earlier dev-server attempt (Windows 11, 20 logical cores).

**Candidate 1 confirmed: the dev server is part of the problem.** Single
baseline candidate, 4 workers (page's own default, read from
`#simui-concurrent-workers-picker`), fixed-seed off:

| Iterations | Wall-clock |
| --- | --- |
| 5,000 (run 1) | 5.3 s |
| 3,000 (run 2) | 13.4 s |
| 5,000 (run 3) | 12.1 s |

Two to three orders of magnitude faster than the dev-server attempt (93 s, did
not finish 100 iterations) on the same page, same machine, same pane. But the
three runs are inconsistent with each other — 3,000 iterations outran 5,000
iterations, and 5,000 iterations itself varied 5.3 s → 12.1 s with nothing
changed between runs. **Hypothesis, untested:** the `javascript_exec` polling
used to detect completion (every 20-50ms) may be consuming scheduler time and
slowing the page itself; or the pane's non-displayed state degrades
differently run to run.

**Two measurement traps caught and discarded before trusting any number:**
`.results-sim`'s text contains the literal substring "N iterations complete"
as a static label from the moment the button is clicked (N climbs from 0); a
regex matching `/iterations complete/` alone fires immediately and
undercounts by ~5s. The DPS figure shown is a *live, converging* Monte-Carlo
estimate, not a completion flag — it is nonzero and already drifting within
the first ~50ms and keeps changing until the iteration counter reaches the
target. The valid detector polls the numeral in "`N / 5000iterations
complete`" until `N` equals the target, cross-checked against the DPS value
going flat and against DPS *varying* run to run (1908.14 / 1919.52 / 1901.33
across three same-settings runs), which rules out a cached/stale result.

**Harness limitation, not a repo finding:** `computer{action:"screenshot"}`
against this pane failed outright — *"the Browser pane is not displayed, so
the page is not compositing frames."* This pane is backgrounded by default in
this environment, not a genuinely foregrounded user tab. The numbers above
come from `javascript_exec` polling, which did execute against a live page
(confirmed via `http-server`'s access log showing real `lib.wasm`/
`sim_worker.js` fetches with this session's Electron/Chromium user agent, and
via the DPS variance above proving genuine recomputation). But a non-displayed
pane cannot rule out visibility-driven throttling of the *main* thread the
way the already-recorded 1.1x busy-loop ratio ruled it out for *Worker*
code — that ratio was measured for Workers only, not re-verified for the
page's own update loop under this harness.

**Not done:** the ticket's 20-candidate, baseline+batch wall-clock table at
3,000 and 5,000 iterations was not obtained — this session's budget went to
establishing that the production build changes the picture at all (itself a
"Done when" item) and to catching/discarding the two measurement traps above
before any number could be trusted. Leaving **Status: open**. Remaining work
for the next attempt: (1) get a real, compositor-visible foregrounded tab to
rule the pane's display state in or out as a factor, (2) run the actual
20-candidate batch at both iteration counts, (3) explain or reproduce the
5.3s-to-12.1s variance seen here on production-build single-candidate runs
before trusting any of these numbers for D7's default.
