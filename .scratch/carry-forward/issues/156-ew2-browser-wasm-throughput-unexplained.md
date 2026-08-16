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

### 2026-08-16 (planning) - plan written; last comment's diagnosis retracted

Plan: `.scratch/carry-forward/plans/ticket-156/plan.md`. Two corrections to
the comment above, both re-checkable:

- The tab has no recorded adapter (`upgrades_tab.tsx:97` constructs
  `WasmSimRunner` unconditionally). "Ran on its recorded adapter" is wrong.
- `lib.wasm` is fetched **by the worker** (`ui/worker/sim_worker.ts:45`), so
  the page's `performance.getEntriesByType('resource')` cannot see it. That
  probe is blind; the plan replaces it with the server access log and the
  pool's `Ready, isWasm: true` console line.

The failure is `replicateTopItems` finding a ranked row with no
`winningRequests` entry (`packages/core/src/rank.ts:1574`). **Hypothesis,
untested:** a screened, unpromoted row reaches paired replication when fewer
than 8 promoted rows meet the cutoff. Plan slice A tests it first.

### 2026-08-16 (slice A) - hypothesis confirmed and fixed

The hypothesis above is no longer a hypothesis. The red test reproduced the
production error verbatim before any fix:

```
RankError: no recorded request for ranked item 900003 (neck-2);
paired replication cannot re-sim it
  at replicateTopItems packages/core/src/rank.ts:1580
```

Re-runnable: `npx vitest run packages/core/test/rank.test.ts -t "does not
spend replication on screened-out rows"` at commit `aec062b^` fails, and at
`aec062b` passes.

**Mechanism, now read off the source rather than guessed.** Screened rows are
pushed into `ranked` at `rank.ts:1389` carrying an explicit `belowCutoff:
false` (`rank.ts:1248`), and they have no `winningRequests` entry because they
were never simmed at full iterations. `replicateTopItems` selected its top N
on `!item.belowCutoff` alone, so as soon as the promoted set held fewer than
`PAIRED_REPLICATE_TOP_N` (8) rows, `slice(0, 8)` reached past the promoted
rows into the screened ones and threw. Unsimmed rows (`simmed === false`, from
an aborted run) sit in `ranked` the same way and are excluded by the same fix.

- Red/green test: `does not spend replication on screened-out rows`,
  `packages/core/test/rank.test.ts`.
- Fix: `aec062b` (this repo), `151f5905d` (fork,
  branch `feat/upgrades-tab`). The throw is kept — a *promoted* row without a
  request is still a real bug.
- E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`) was re-run against
  the edited fork engine and passed before `engine/PROVENANCE.md`'s hash for
  `rank.ts` was updated to `c42a1751...`.
- `pnpm verify` exits 0 in this repo; `npm run type-check` exits 0 in the
  fork (its engine directory is eslint-ignored, so typecheck is the gate).

**What this does and does not settle.** It removes the crash that ended the
last four measurement attempts after ~38 sims. It says nothing about the
throughput question the ticket is actually open for — no timing was taken.
Slices B and C still have to run.

**Retire acceptance box "`lib.wasm` fetch count > 0"** (line 450 above). That
probe is page-side and the fetch is worker-side, so it can only ever read 0.
Replaced by the two signals in plan §2 slice B: an `http-server` access-log
`GET /tbc/lib.wasm`, and the pool's `Ready, isWasm: true` console line
(`ui/core/worker_pool.ts:237`).

### 2026-08-16 (slice B) - the engine loads; the old diagnosis is dead

**The engine was loading all along.** With `http-server` logging every
request, opening the tab produced **five** `GET /tbc/lib.wasm` fetches from
Chrome (20,293,865 bytes each) and six `GET /tbc/sim_worker.js`. The
"0 wasm entries -> running on recordings" conclusion from the earlier comment
was an artifact of a page-side probe that cannot observe worker fetches,
exactly as the planning comment predicted. **No recorded adapter was ever
involved.**

Re-runnable, from `vendor/tbc-new-fork`:

```bash
npx http-server dist -p 8123 -c-1 > /tmp/http.log 2>&1 &
# open http://127.0.0.1:8123/tbc/paladin/retribution/index.html, then:
grep lib.wasm /tmp/http.log
```

**The plan's second signal does not exist on this surface.** `Ready, isWasm:
true` goes through `WorkerPool.log()` (`ui/core/worker_pool.ts:349`), which is
gated on `isDevMode()` -> `import.meta.env.DEV`. That is false in a production
build, so the line is never emitted no matter how healthy the pool is. Do not
treat its absence as a failed load, and do not rebuild in dev mode to obtain
it -- that changes the delivery path under measurement. The server-side fetch
log is the better signal anyway: it observes the bytes being served rather
than the app's opinion about them.

**Build recipe used** (no `make` on this machine; these are the three commands
the Makefile's `bundle/.dirstamp` target runs):

```bash
export PATH="/c/Program Files/Go/bin:$PATH"
npx tsc --noEmit && npx tsx vite.build-workers.mts && npx vite build
```

`lib.wasm` was not rebuilt -- the slice A fix is TypeScript-only and the
committed binary already exists.

**The slice A fix is in the served bundle**, verified in the minified output
rather than inferred from a successful build:

```
s=e.filter(e=>!e.belowCutoff&&void 0===e.screened&&!1!==e.simmed).slice(0,8)
```

in `dist/tbc/bundle/ui/paladin/retribution/index.html-CNx0kpnM.entry.js`,
which is the entry the served `index.html` actually references. Note `vite
build` warns `outDir ... will not be emptied`: stale entry chunks from earlier
builds remain in `dist/` and are unreferenced. Grep the served `index.html`
for the current entry name rather than globbing `bundle/`.

**Machine for this session differs from the original.**
`navigator.hardwareConcurrency` is **3** here, against 20 on the machine that
produced the 14.7 s Node figure. Timings below are a valid measurement of this
machine and are **not** comparable to the historical Node/CLI numbers.

**New lead, untested:** `self.crossOriginIsolated` is **false** on this
surface, so `SharedArrayBuffer` is unavailable. That is a plausible
contributor to the browser-vs-Node gap and is cheap to test by serving with
COOP/COEP headers. Not pursued in this session.

### 2026-08-16 (slice C attempt) - E-W2 still unmeasured: screening silently fails in-browser

**No timing was recorded, and none should be until the defect below is fixed.**
Every browser run this session completed "successfully" while doing almost no
work. This is the real reason E-W2 has never been obtained, and it is not the
crash fixed in slice A.

**Runs attempted** (Candidates empty = no cap, `visibilityState: 'visible'`
throughout, `hardwareConcurrency: 3`):

| Pool | Iterations | Wall-clock | Result |
| --- | --- | --- | --- |
| Phase 2 (240) | 3000 | 5.21 s | "No upgrades found above the cutoff" |
| Phase 3 (394) | 3000 | 14.31 s | 509 rows, 220 Black Temple/Hyjal, **all `~0.0 (screened)`** |

**Why these are not measurements.** From this repo's own WASM cost model
(`experiments/e-w5-overhead-wasm.md:36`: `t_fixed` 748.4 ms, `t_iter` 3.2446
ms/iter), one 1000-iteration screening sim costs ~3,993 ms. 394 screens at
concurrency 4 predicts **~393 s**. Observed: 14.31 s — about 14 sims' worth.
The sims did not happen.

**Root cause, confirmed by reading code.** `screenCandidate` swallows every
sim failure:

```ts
// packages/core/src/rank.ts:973-977 (fork engine/rank.ts:686-690, identical)
try {
  candObs = await deps.sim.run(candReq, screenOpts);
} catch {
  continue;
}
```

A bare `catch { continue }` per slot attempt. When every attempt throws, the
loop returns `Number.NEGATIVE_INFINITY` (`rank.ts:983`), and the run then
looks healthy all the way out:

1. Every `ScreeningResult.deltaDps` is `-Infinity`.
2. `promotionRule` skips non-finite screens for the per-slot floor
   (`promotion.ts:111`), so no row is promoted on merit.
3. The screened-row builder clamps the sentinel to exactly `0`
   (`rank.ts:1235-1238`) — this is the `~0.0` on all 509 rows.
4. Nothing clears the 3.4 DPS cutoff, so the UI says "No upgrades found above
   the cutoff" and exits green.

**The asymmetry that hid it for four sessions.** The full-iteration path
*does* disclose sim failures — `runCandidate` records a `candidateSkips` row
(`rank.ts:1045`, `:1072`) that surfaces in the substitutions drawer. The
screening path has no equivalent: no skip row, no counter, no progress event
(`onProgress` fires only after screening completes, `rank.ts:1269`). **394
consecutive engine failures are indistinguishable from "nothing is an
upgrade".**

**The engine and the P3 data are fine — this is browser-only.** Re-runnable:

```bash
npx tsx packages/core/src/cli.ts --region US --realm dreamscythe \
  --character slamaltman --offline --spec ret --max-phase 3
```

Exit 0, 427 sims, baseline 2003.51, real deltas: `#1 Belt of One-Hundred
Deaths Δ47.75 (2.38%)`, `#2 Torch of the Damned Δ43.61`, and `#16 Shadowmoon
Destroyer's Drape Δ13.67` — item 32323, a `phase: 3` Black Temple drop. So
phase-3 items compose, gem-fill, sim and rank correctly outside the browser.

Note the CLI **cannot** reach this path: `cli.ts:309` hardcodes `fullPool:
true`, so `pnpm rank` never calls `screenCandidate`. Racing is browser-only,
which is why no CLI run has ever caught this.

**Why the underlying screening sims throw — hypothesis, untested.** Two
candidates, both cheap to check:

- Worker-pool exhaustion under `WasmSimRunner`: `hardwareConcurrency` is 3 on
  this machine but `DEFAULT_WORKER_COUNT` is 4
  (`wasm_sim_runner.ts:43`), and `run()` throws on `result.error` or a missing
  `raidMetrics.dps` (`:136-141`) — either lands in the swallowed catch.
- `self.crossOriginIsolated === false` (recorded in the slice B comment above),
  so no `SharedArrayBuffer`.

**Cheapest next experiment:** in the browser console, call `WasmSimRunner.run()`
once directly with a 1000-iteration screening request and let the exception
surface instead of letting `screenCandidate` eat it. That turns the hypothesis
into the actual error string in one call.

**Blocking E-W2.** Fix the disclosure defect first (a screening run that loses
N/394 candidates must say so, not report a green run), then find why the sims
throw, then measure. Timing a run that dispatches ~14 sims instead of ~400
would put a meaningless number in §5.

**Corrections to earlier comments in this ticket.**

- The `{{count}} / {{count}}` placeholder bug (line ~445) is real but
  mis-described: the field renders the raw template on a **fresh page load**
  and only interpolates **after a run completes** — and then it shows the pool
  size of the run that just finished. It is a lagging indicator, so it must not
  be used to confirm which pool a run is *about* to use.
- The phase picker is **not** limited to Phase 1-2. It offers Phase 1-5
  (`Phase 3 (2.2 - T6)` etc.), is built from the whole `Phase` enum
  (`ui/core/utils.ts:416-419` via `other_inputs.ts:81`), and is mounted inside
  the gear-slot item modal — not the Settings tab, which is why an earlier
  comment concluded it was absent. It has nothing to do with which gear sets a
  spec ships.
- Phase is persisted in `localStorage`
  (`__tbc_new_retribution_paladin__currentSettings__`, `settings.phase`), so a
  Phase 3 selection survives a reload. Clicking Run, however, was observed to
  revert an unsaved phase change to `CURRENT_PHASE` (2) via `sim.ts:777` —
  set the phase through the modal selector and confirm it stuck before timing.
- The fork bundles its own universe copy
  (`.../upgrades/data/ret-p3.universe.json`, 394 entries) which differs from
  this repo's `data/universes/ret-p3.json` (390 entries). Unexplained 4-entry
  gap; probably benign for this defect but it means the browser pool indicator
  is not evidence about this repo's data.

### 2026-08-16 (plan v2 slice A) - screening failures are now disclosed; still no timing

The blocker in the comment above is fixed in both repos. **No measurement was
taken and none should be read into this comment** - slice A makes failure
*visible*, slice B is what makes it *stop*.

- Core: `e6a77a4` (this repo). Fork: `b603534c5` + `4c7386914`
  (`feat/upgrades-tab`).
- Four red tests drove it, at the `rankUpgrades` interface with racing on
  (`packages/core/test/rank.test.ts`, describe "screening sim failures are
  disclosed (ticket 156)"). The first failed with `promise resolved
  "{ ...(10) }" instead of rejecting` - the production symptom reproduced:
  every screening sim throws and the run still returns a `Ranking`.

**What changed.** A failed screening slot attempt records a skip row and
surfaces through the **same** `candidate <id> (<slot>)` field and "dropped
from the ranking" wording the full-iteration path already used - one rule, so
a reader never has to reason about which iteration count the engine panicked
at. A run where nothing screened at all now throws
`RankError('sim-failed')` naming the count and first message. A new
`screening` progress event carries a running `failed` count, so the tab's
status line moves during the pass instead of after it.

**Two further defects found while building it, both fixed in the same
commits** (each is inside slice A's subject: without them the disclosure is
wrong):

1. `promotionRule` filtered non-finite screens out of the per-slot floor but
   **not out of `topK`**. `slice(0, K)` at the shipped K=150 takes every row
   of any pool under 150, so a candidate whose every screen panicked was
   promoted anyway and spent a full-iteration sim re-running a swap already
   known to crash. Both pre-existing tests for this intent passed
   `promoteTopK: 0`, which sidestepped the gap - re-runnable as the new
   `does not promote a failed screen through topK` in `promotion.test.ts`.
2. `screenCandidate` skipped an infeasible meta repair silently, so such a
   candidate vanished from the racing path with no substitution row.

**The fork's assumptions drawer never rendered `substitutions` at all.** The
engine has always recorded dropped candidates there; the page showed only the
run's settings. That is now rendered - without it, slice A's disclosure would
exist in the data and still be invisible on the surface slice B has to read.

**Nine tests broke and none was fixture noise.** Eight rank tests plus the
E-W3 parity harness pinned recordings at their full iteration count only and
passed **solely because screening failures were invisible** - this repo's own
suite was exhibiting the bug. They are about ranking behaviour, not racing,
so they now pass `fullPool: true`, as the sim-result-cache block already did.

**Gate status, stated plainly.** All 832 tests pass; `pnpm verify` does *not*
reach the end - it stops at `sim-implemented-effects:check`, which fails
**identically at `HEAD` without these changes** (fork checkout is at
`151f5905d`, `data/sim-implemented-effects.json` records `138fa77f5`). That
is a pre-existing data-pipeline bookkeeping gap, untouched here. Fork
`npm run type-check` exits 0; E-W3 was re-run green against the edited fork
engine *before* `PROVENANCE.md`'s hashes were updated, and
`scripts/check_engine_port_drift.py` now reports ok on 33 files.

**Correction to the last comment's item 4.** The fork/core universe gap is
**not** "4 extra entries, probably benign". It is a 16-item symmetric
difference - 10 fork-only, 6 core-only - concentrated in trinkets and
librams. `Darkmoon Card: Crusade`, `Hourglass of the Unraveller` and
`Abacus of Violent Odds` are absent from the browser pool entirely;
`Ashtongue Talisman of Zeal` is absent from this repo's. The two surfaces
rank from different candidate sets, and neither is a superset. Ticket 211.

Slice E is done: tickets **208** (`candidateCap` order), **209** (drawer says
racing was not shipped), **210** (placeholder), **211** (universe divergence).

**Next is slice B, unchanged in shape:** rebuild, serve, one Phase 3 run with
Candidates empty, and read the exception text off the page - the per-row
disclosure above is now the primary route, no console handle and no dev-mode
rebuild (plan v2 §B as amended by `12878ec`). Status stays **open**.

### 2026-08-16 (slice E follow-up) - three of the four filed defects are fixed

Amends the comment above, which said slice E was "file and move on". Writing
each ticket up honestly meant verifying it, and verifying cost about what
fixing cost, so three are closed. Two of them change what slice B will see.

- **208 is not a defect.** `candidateCap` slicing committed EP order within
  the promoted set is deliberate: `docs/plans/wowsims-tab/candidate-pool.md`
  §11 accepts Dean Q2 ("cap must apply after screening") and Beck Q2
  ("ordering stays committed EP") as *separate* points. Screening decides
  membership, EP decides rank among survivors. The ticket is kept as the
  citation so this is not re-filed a third time.
- **209 fixed** (fork `fc8980a1a`): the assumptions drawer no longer tells
  users racing "was not shipped".
- **210 fixed** (same commit): the Candidates placeholder no longer renders a
  raw `{{count}}` on load, and no longer lags a run behind the selection. It
  is now safe to read as "the pool the next run will use" - the trap recorded
  in §4 of the handoff is gone.
- **211 data fixed** (fork `5e26fa0d8`), mechanism still open.

**211 matters for the measurement and was badly mis-scoped when filed.** It
was recorded as a benign 4-entry gap on ret-p3. In fact **all six** bundled
universes had drifted, ret-p3 had 300 of 384 shared entries differing in
content (`curationHint` rescored upstream), and the membership differences
were deliberate decisions the stale copy was reverting:

- six SME-flagged ret librams and trinkets (`c718d38`) - including Darkmoon
  Card: Crusade, Hourglass of the Unraveller and Abacus of Violent Odds -
  were **absent from the browser pool entirely**;
- stub-only-effect items that ticket 171's user ruling excludes by design
  (`1fcfcaf`) were **still present** in it.

So every earlier browser run screened a different candidate set from the CLI,
in both directions. That does not explain the throughput question this ticket
owns, but it does mean **no pre-2026-08-16 browser pool count is comparable
to a CLI figure**, and the ret-p3 pool is now 390 rather than 394.

Copies refreshed from `data/universes/` at `60e05571`; nothing yet prevents
the drift recurring, which is all 211 still owns.

Slice B is unchanged and still next.

### 2026-08-16 (slice B) - the exception, and the cause: compose() never updates player.database

**Slice B is answered.** The screening sims throw a Go panic, and the cause is
in this project's own `compose()`, not in worker counts, `SharedArrayBuffer`,
or anything environmental. None of plan v2 §B's four candidates was right.

**The exception, verbatim** (read off the page from the per-row disclosure
slice A added; item id varies per candidate, always the candidate's own id):

```
Ragesteel Breastplate was dropped from the ranking: the sim failed on this
swap - sim error (0): No item with id: 23522 Stack Trace: goroutine 350
[running]: ... github.com/wowsims/tbc/sim/core.NewItem(...)
vendor/tbc-new-fork/sim/core/database.go:419 ...
github.com/wowsims/tbc/sim/core.NewEquipmentSet(...) database.go:471
github.com/wowsims/tbc/sim/core.ProtoToEquipment(...) database.go:479
[through NewParty raid.go:34, NewRaid raid.go:178, Environment.construct
environment.go:77, NewEnvironment environment.go:58, NewSim sim.go:191,
runSim sim.go:146, RunSim]
```

**Every screen failed: 455 of 455 dropped**, status line mid-run read
`Screening 119/390... (119 failed) (0 rows landed)`. Engine confirmed loaded:
16 `GET /tbc/lib.wasm` in the server access log.

**Root cause, traced through source rather than inferred.** The WASM build is
compiled **without** the `with_db` tag, so `database_load.go`'s embedded
`db.bin` never registers. `ItemsByID` is therefore populated *only* per
request, from the `player.Database` proto the caller attaches
(`sim/core/character.go:95` -> `addToDatabase`).

Upstream's own Simulate button rebuilds that proto for every sim, next to the
equipment it describes:

```ts
// ui/core/sim.ts:346-347
player.database = gear.toDatabase(this.db);
player.equipment = gear.asSpec();
```

Our `compose()` sets only the equipment:

```ts
// upgrades/engine/compose.ts (and packages/core/src/compose.ts, same shape)
slot.equipment = { items: player.equipment.map(toProtoItem) };
// slot.database is never touched
```

`currentPageSkeleton()` captures the skeleton **once**, from the character's
*currently equipped* gear, so `slot.database` only ever carries `SimItem`
entries for items already worn. Swap in any candidate that is not already on
the character and the request references an id its own database lacks ->
`NewItem` panics -> `screenCandidate` catches it (and, before slice A,
swallowed it).

`db.json` is **not** the problem: 23522, 29072, 29074 and 30129 are all
present in `assets/database/db.json`, so the browser's `Database` singleton
has them. The gap is purely that `compose()` never copies them into the
request.

**Why every screen failed rather than some.** Screening only ever sims
*candidate* swaps, and a candidate is by definition an item the character is
not wearing. So the failure rate is 100% by construction - which is exactly
why the swallowed-exception bug looked like "no upgrades found".

**Why the CLI never hit it.** `cli.ts` hardcodes `fullPool: true` so it never
screens - but note the full-iteration path composes requests the *same* way.
The CLI works because `wowsimcli` is a different binary built **with** the
`with_db` tag, so its `ItemsByID` is compiled in and complete. The browser is
the only surface where the per-request database is the sole source.

**Fix, not yet made:** `compose()` must populate `slot.database` for the
composed equipment, the way `sim.ts:346` does. That is a real code change with
a test, and it belongs to slice B's "Done when", so it is the next step rather
than something to fold into a measurement run.

**Corrections to plan v2 §B's candidate table.** Candidate 1 (an id the fork's
bundled DB lacks) is closest but wrong in mechanism - the id is in `db.json`;
it is missing from the *request*. Candidates 2, 3 and 4 (`raidMetrics.dps`
shape, concurrency vs `hardwareConcurrency`, an iteration minimum) are all
ruled out: the panic happens during environment construction, before a single
iteration runs.

**Two observations that contradict this ticket's earlier notes.** Both from
the Claude-in-Chrome/Brave surface this session:

- `document.visibilityState` read **`hidden`** throughout, not `visible` as
  the 2026-08-16 "compositing surface EXISTS" comment recorded. Screenshots
  and JS still worked and the run completed. Whatever the earlier comment
  measured, `visible` is not reliably reproducible, and slice C must state the
  observed value rather than assuming this surface delivers a foregrounded tab.
- The page header kept displaying "Phase 2 (2.1 - T5)" while the gear-modal
  dropdown and `localStorage` both read Phase 3. The header is **not** a
  reliable phase indicator; confirm through the modal or storage.
