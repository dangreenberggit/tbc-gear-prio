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

### 2026-08-15 (candidate-pool orchestrator) — recipe rewritten around the Candidates cap

The remaining work above ("run the actual 20-candidate batch") had no
supported way to run it: the engine simmed **every** eligible candidate, with
no cap and no way to stop a run once started (candidate-pool.md F1, F3). A
20-candidate batch was not a setting anyone could choose. That is now fixed,
so this recipe replaces the earlier one.

**What changed in the product**

- **Candidates control**, beside Iterations: caps how many candidates are
  simmed, defaulting to all eligible. Owned items are exempt from the cap.
- **Stop button**: aborts a run, returning a partial ranking rather than
  discarding the work. Sims that already finished are kept and cached, so a
  re-run resumes cheaply.
- **Candidate-level concurrency**: several candidates now sim at once, where
  before each request was split across workers and candidates ran one at a
  time. This changes what the wall-clock per candidate even means — see the
  caveat below.

**The measurement to run**

Production build only (the dev server is already confirmed to distort this —
see the 2026-08-14 comment). Serve `dist/tbc/bundle/` statically, then for
each cell: set **Candidates = 20**, set Iterations, run, record wall-clock.

| Iterations | Candidates | Wall-clock | Workers | Notes |
| ---------- | ---------- | ---------- | ------- | ----- |
| 3000       | 20         |            |         |       |
| 5000       | 20         |            |         |       |

Record the page's worker count (`#simui-concurrent-workers-picker`) and the
machine. Run each cell **three times** and report all three: the earlier
attempt saw a 5.3 s → 12.1 s spread on identical settings, and that variance
is itself unexplained (item 3 below).

**Two traps the last attempt hit — do not re-hit them**

1. The Claude Code Browser pane is **backgrounded by default** and cannot
   composite frames, so it cannot rule out visibility throttling of the main
   thread. The recorded 1.1× busy-loop ratio ruled that out for *Worker* code
   only. **Use a real foregrounded browser tab**, or state plainly that the
   numbers came from a non-displayed pane.
2. Confirm the sim actually ran before trusting a number — vary the seed and
   check the DPS changes, or watch the access log for real `lib.wasm` /
   `sim_worker.js` fetches. A fast "result" that never recomputed is the
   failure mode here.

**Caveat that did not exist before**

Per-candidate wall-clock is no longer a single number: with candidate-level
concurrency, throughput depends on how many candidates run at once. Record
the concurrency the adapter chose alongside each cell, or the table cannot be
compared against the CLI figures in candidate-pool.md §3.3.

**What this measurement is still for**

D7's 3,000-iteration default remains unjustified in either direction until
this table exists. Note that the CLI-side numbers are now known
(candidate-pool.md §3.3: `t_fixed` 373.2 ms, `t_iter` 0.0637 ms/iteration,
peak RSS 183.8 MB per process) and they are what killed M2 racing — but they
are **CLI figures and do not transfer to the browser**, whose fixed-cost
structure is different and unmeasured. That is precisely the gap this ticket
still owns.

**Acceptance, restated**

- [ ] The table above, filled, three runs per cell, with worker count,
      concurrency and machine.
- [ ] Foregrounded-tab status stated explicitly either way.
- [ ] The run-to-run variance explained, or recorded as unexplained with the
      spread quoted.

### 2026-08-16 (candidate-pool session) - blocker re-confirmed, table not attempted

Re-checked whether this environment can satisfy the ticket's own acceptance
criterion of a foregrounded, compositing tab. It cannot; the 2026-08-14
finding reproduces exactly.

Commands run in the Claude Code Browser pane (fresh pane, `https://example.com`,
no repo assets involved - this probes the harness, not the app):

| Probe | Result |
| --- | --- |
| `computer{action:"screenshot"}` | fails: "the Browser pane is not displayed, so the page is not compositing frames" |
| `document.hidden` | `true` |
| `document.visibilityState` | `"hidden"` |
| `navigator.hardwareConcurrency` | 20 (same machine as prior comments) |

**The 20-candidate table was deliberately not attempted.** This ticket already
records that a non-displayed pane cannot rule out visibility throttling of the
*main* thread, and that the leading untested explanation for the unexplained
5.3s -> 12.1s variance is harness scheduling. Producing the table from this
pane would yield numbers requiring the same caveat that left the previous
attempt's numbers untrusted, while appearing to close a "Done when" box. The
acceptance criteria ask for foregrounded status stated explicitly: **it is
hidden, so the criteria cannot be met from this harness.**

Unchanged conclusion: this ticket needs a human running a real browser on a
visible desktop, or a harness that can foreground and composite the pane. No
amount of agent budget in this environment substitutes for that.

### 2026-08-16 (later) - a compositing surface EXISTS: Claude in Chrome on Brave

Correcting the comment above: it tested only the Claude Code Browser pane and
concluded the environment had no usable surface. That was too narrow. The
**Claude in Chrome extension, running on Brave**, is a second surface and it
does not have the pane's limitation.

| Probe | Browser pane | Claude in Chrome (Brave) |
| --- | --- | --- |
| `computer{action:"screenshot"}` | fails, not compositing | **succeeds** (1512x803 jpeg) |
| `document.visibilityState` | `"hidden"`, cannot be changed | **`"visible"`** |
| `document.hasFocus()` | n/a | `false` (visible but not focused) |
| `navigator.hardwareConcurrency` | 20 | **6** |

**This unblocks the ticket's foregrounded-tab criterion.** A real, compositing,
`visible` tab is reachable from this harness after all.

**Caveat that changes comparability:** `hardwareConcurrency` is **6** here
against **20** on the machine behind every earlier number in this ticket
(2026-08-14 comments). Wall-clock from this surface is NOT comparable to the
5.3s/12.1s figures above, and the worker count the page picks will differ.
Re-baseline on this machine before comparing anything.

**A third cold-start trap, caught.** The first `requestAnimationFrame` probe
after the tab became visible reported **1 frame in a loop that took 15.8
seconds** - a ~16x throttle signature. It does not reproduce. Three immediate
re-runs gave 34, 64, 62 frames/s completing in ~1.01s each, and a
three-path comparison (rAF 241, `setTimeout(0)` 414, `MessageChannel` 62428
callbacks in 2s) is normal for a visible, unfocused tab. The 15.8s reading was
a **one-off warm-up artifact of the visibility transition**, not throttling.

Note the pattern: this ticket has now produced three misleading numbers from
cold starts (the "iterations complete" label, the live-converging DPS value,
and now this). **Discard the first measurement after any state change and
re-run before believing a number** - especially one that confirms the
hypothesis you already hold. The 2026-08-14 busy-loop ratio of 1.1x was
measured on the *unthrottled* path, so it never ruled anything in or out for
frame-driven code; that gap is still open, but the probe above gives no
evidence of a problem.

**Still not done:** the 20-candidate table. This comment establishes the
surface works and re-baselines the machine; the measurement itself is the
next step, and now has no known blocker beyond needing the production build
served. Status stays open.

### 2026-08-16 (later still) - first real-browser run attempted; blocked on the WASM engine never loading

With the compositing surface established above, the production build was
rebuilt and served and a real run was attempted. **The 20-candidate table is
still not obtained**, but the blocker is now a different and more specific one
than "no foregrounded tab".

**Setup that worked (all verified, re-runnable):**

```bash
export PATH="/c/Program Files/Go/bin:$PATH"
cd vendor/tbc-new-fork && npx tsx vite.build-workers.mts && npx vite build
npx http-server vendor/tbc-new-fork/dist -p 8123 -c-1
```

- The **Aug-15 bundle on disk was stale**: `candidateCap` was present in
  `ui/.../upgrades_tab.tsx` but absent from `dist/tbc/bundle/`. Anyone
  measuring against a pre-existing bundle is measuring the pre-cap UI. Rebuild
  first and grep the bundle for `upgrades-candidates` to confirm.
- After rebuild the tab exposes **Iterations, Candidates, Run, Stop** as
  specified. Worker picker read **4**.

**What happened:** with Candidates=20, Iterations=3000, the run progressed
through real per-row events ("Simming 38/71... (15 rows landed)") and then
failed at 102 s:

```
Ranking failed: no recorded request for ranked item 30102
(Krakken-Heart Breastplate)
```

**`lib.wasm` was never fetched.** `performance.getEntriesByType('resource')`
shows `sim_worker.js` fetched 8 times and **zero** `.wasm` entries; the
`http-server` access log agrees. The workers spawned but never loaded the
engine, so the Upgrades tab ran on its **recorded adapter** and died on the
first candidate with no recording. **No timing from this run is a sim
measurement** and none is quoted here.

Note "Simming n/71" against a cap of 20 - consistent with racing (screening
runs plus paired-slot retries), but unverified while the engine is absent.

**Second confirmation that harness polling distorts this page.** While a
`javascript_exec` call held the main thread in a poll loop, progress advanced
3 sims in 54 s (30.4 s -> 84.2 s); the call itself died on a 45 s CDP timeout
("the renderer may be frozen"). Before and after that loop, status updates
arrived milliseconds apart. **Do not poll from the harness while timing this
page** - start the run, wait outside the browser, then read state in one
short call. This is the same effect the 2026-08-14 comment hypothesised, now
observed directly.

**Next step is narrow:** find why `lib.wasm` is not requested on this served
build (worker path/MIME, a `wasm_exec.js` gate, or an adapter selecting
recordings over the live engine). Until it loads, the browser cannot produce
throughput numbers regardless of tab visibility.

#### Operational detail for the next attempt

Everything below was executed this session. Reuse it rather than rediscovering
it; the selectors and the two workarounds cost most of the attempt's budget.

**Surface.** Claude in Chrome extension on **Brave** (not the Claude Code
Browser pane, which never composites). `list_connected_browsers` returned
empty on the first call and populated on a retry moments later - **an empty
list is not proof the extension is absent, retry before concluding.**

Machine seen from that surface: `hardwareConcurrency` **6**, UA
`Chrome/15...` on `Windows NT 10.0; Win64; x64`. Page's own worker picker
(`#simui-concurrent-workers-picker`) read **4**.

**Serving.** `http-server` must be pointed at `dist`, and the app lives under
`/tbc/`; the per-spec page is a directory URL:

```
http://localhost:8123/tbc/paladin/retribution/
```

Asset check before driving anything (all three returned 200; `lib.wasm` is
20,293,865 bytes):

```bash
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://localhost:8123/tbc/lib.wasm
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8123/tbc/sim_worker.js
```

**Serving 200s on `lib.wasm` did not mean it was loaded.** The page never
requested it. Check the request side, not the server side - see the detector
below.

**Selectors (post-rebuild bundle).** The Upgrades tab nav item is a
`<button class="nav-link">` inside `li.upgrades-tab.nav-item`, **not an
`<a>`** - an `a`-only selector silently does nothing and the pane stays
`offsetParent === null`:

```js
document.querySelector('.upgrades-tab.nav-item button.nav-link').click();
```

| Thing | Selector |
| --- | --- |
| Pane | `#upgrades-tab` |
| Iterations | `.upgrades-iterations-input` (default `3000`) |
| Candidates | `.upgrades-candidates-input` (default empty = all) |
| Run | `.upgrades-run-button` |
| Status line | `.upgrades-status` |
| Results | `.upgrades-results` |

**Setting the inputs.** They are framework-controlled; assigning `.value`
directly does not register. Use the native setter plus both events:

```js
function setVal(el, v) {
  Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
```

**Completion detector that works.** Ignore the DPS value and the
"N iterations complete" label (both are traps recorded in the 2026-08-14
comment). The Upgrades tab exposes a cleaner signal: `.upgrades-run-button`
is `disabled` for exactly the duration of the run. Attach a `MutationObserver`
to the pane **before** clicking Run, and timestamp each mutation:

```js
window.__m = { samples: [], t0: performance.now() };
new MutationObserver(() => window.__m.samples.push({
  t: Math.round(performance.now() - window.__m.t0),
  s: document.querySelector('.upgrades-status').innerText.trim(),
})).observe(document.querySelector('#upgrades-tab'), {subtree:true, childList:true, characterData:true});
document.querySelector('.upgrades-run-button').click();
```

Then **leave the browser alone** (wait in the shell, not in the page) and read
`window.__m` in one short call afterwards. Status strings look like
`Starting...` -> `Reading your gear...` -> `Building the candidate pool...` ->
`Simming n/N... (r rows landed)` -> `Ranking results...`.

**Engine-loaded assertion - run this before trusting any number:**

```js
performance.getEntriesByType('resource').filter(r => /\.wasm$/.test(r.name)).length
```

This session it returned **0** while `sim_worker.js` appeared 8 times. A run
with 0 wasm entries is running on recordings, not the engine, and its
wall-clock is meaningless.

**Observed timings from the failed run** (recorded adapter, NOT the engine -
do not use these as sim figures): `Starting...` at 33 ms, pool built by 57 ms,
sim 35/71 at 30.4 s, sim 38/71 at 84.2 s (during harness interference),
failure at 102.2 s.

**Cosmetic bug spotted in passing:** the Candidates input's placeholder renders
the raw i18n template `{{count}} / {{count}}`. Unrelated to this ticket;
worth its own issue.

#### Acceptance checklist, restated for the next attempt

- [ ] `lib.wasm` fetch count > 0 before any timing is recorded.
- [ ] Rebuild first; grep `dist/tbc/bundle/` for `upgrades-candidates`.
- [ ] Candidates=20 at 3000 and 5000 iterations, three runs each.
- [ ] Record worker count, candidate concurrency, and
      `hardwareConcurrency` (6 on this machine, 20 on the original).
- [ ] No harness polling during a timed run.
- [ ] State foregrounded status explicitly (this surface: `visible`).
