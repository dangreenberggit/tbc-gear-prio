# Upgrades-tab test harness

Test scripts that drive the Upgrades tab in the fork clone at
`vendor/tbc-new-fork`. They used to live in the fork; they moved here so the
fork carries only the tab. Each script finds the fork through `FORK_ROOT` in
`test-tab-harness.mjs` and runs fork commands with that folder as the working
directory.

- `test-tab-harness.mjs`: shared CDP plumbing (Chromium, build, serve, fixture
  loading, axe-core).
- `test-layout.mjs`, `test-review.mjs`, `test-stop.mjs`: the layout gate, the
  per-ticket visual capture and the Stop check. `scripts/check_layout_gate.py`
  and `scripts/check_tab_review.py` run the first two.
- `tab_fixtures.mjs` and `vite.config.mjs`: the dev server's fixture index and
  autoload, added to upstream's Vite config without editing it.
- `run-tab-cdp.mjs`: the desktop-transport gate's driver, below.
- `rows.mjs`: how the scripts read result rows, below.

## Reading result rows (`rows.mjs`)

The tab renders only the result rows in or near the page's view (ticket 565),
so a count of `upgrades-result-row` elements is the rows on screen, not the
ranking. The scripts read rows two ways. A count comes from each table's
`<tbody data-testid="upgrades-result-rows">`, whose `data-row-count` is that
table's ranked row count; a pane's count is the sum over its tables. Content
comes from `collectRows(table, readRow)`, which scrolls the page's scroll box
(`div[data-testid="sim-ui"]`, not the window) top to bottom and calls
`readRow` once on each row, by `data-index`, while it is rendered. It reads one
table at a time because `data-index` starts at 0 in each table. Both are
page-side source text (`ROW_HELPERS`) that a script puts inside its in-page
expression, because the scripts drive the page with expression strings over
CDP. `rows.mjs` is in the layout gate's hashed file list
(`ROOT_GATE_FILES` in `scripts/check_layout_gate.py`, ticket 580), so an edit
to it marks the layout baseline stale and `pnpm layout-gate:check` re-measures.

## `run-tab-cdp.mjs`

The durable CDP harness for the desktop-transport gate, promoted from Chunk 1's
throwaway `ret-p5-run.mjs`. It drives a full or capped ret upgrades run against
**any origin the caller already serves** — the WASM page under `http-server`, or
the packaged desktop binary on `:3333` — and writes a readback JSON recording
what the tab actually did, not what the origin implies. `scripts/check_desktop_tab.py` (`pnpm desktop-gate:check`) drives it and judges
the transport signals; the harness only measures.

The three signals in the JSON:

- **S1 `runner`** — the runner class the tab chose, from the `data-runner`
  attribute the tab writes on `[data-testid="upgrades-tab-root"]` after a live
  run. The React tab always runs `WorkerPoolSimRunner`.
- **S2 `requests`** — counts of completed 200 sim responses per endpoint,
  summed over the page session **and every auto-attached worker session**. Every
  `/bulkSimAsync` and `/raidSimAsync` fetch is issued inside a dedicated Web
  Worker, which is its own CDP target, so the harness arms
  `Target.setAutoAttach` and enables `Network` on each worker session — a
  page-session `Network.enable` alone sees none of the sim traffic.
- **S3 `servedWorker`** — a plain `fetch` of `sim_worker.js`, recording
  `wasmRefs` and `readyFalse` (the embedded server rewrites it to
  `net_worker.js`).

S4, a count of page-console messages starting `[upgrades] screening fell back`,
is removed: nothing prints that message since the bulk screening pass was
deleted (ticket 567).

Run it from the repo root (Node 22+, no npm deps):

```sh
node scripts/tab-harness/run-tab-cdp.mjs --origin http://localhost:3333 --candidates 40 --out out.json
```

The harness finds every element by its `data-testid` (the React tab, ticket
560): the tab button, the phase selector (`phase-selector`, inside the settings
column, opened through `upgrades-run-settings-summary` below `xl`), the
candidates and iterations pickers (`upgrades-candidates-picker`, always in the
DOM inside a wrapper hidden unless `?upgrades-dev`; `upgrades-iterations-picker`),
the eligible count (`upgrades-eligible-count`, its `data-count`), the run button,
the status line (`upgrades-status`) and the rows of the Upgrades list pane
(`#upgrades-pane-shopping-list`, below-cutoff group opened first). Each picker
value is read back after it is set and the run stops with "did not stick" when
it differs.

Flags: `--origin <url>` (required), `--page` (default
`/tbc/paladin/retribution/`), `--phase` (default 3, the page's default phase),
`--candidates N` (0 = uncapped), `--iterations N` (0 = leave the picker at its
default 3000), `--timeout-ms` (default 2 700 000), `--out <json>` (stdout if
omitted), `--trace-tail`, which samples the progress dialog's message and counter and the
landed row count every 500 ms from the Run click to the end of the run; with it,
`--out` names a directory that gets `result.json` and `tail.jsonl`,
`--force-fallback`, which installs a one-shot `window.Worker` throw so the tab's
transport probe fails and it falls back to the WASM runner over HTTP — the
gate's screen-check twin and its forced-fallback negative. `--iterations` exists
for ticket 411's wall-clock measurement; the shipped default is 3000 iterations.

Two timing fields are recorded on every run: **`firstRowS`** — Run click to the
first `[data-testid="upgrades-result-row"]` (via a
`MutationObserver` installed before the click; `null` if no row lands) — and
**`clickToDoneS`** — click to the `Took` status. **`iterationsRequested`** echoes
the `--iterations` flag.

Ticket 522's cold-worker check adds opt-in flags. Without them the run is
unchanged:

- `--preset-tab <name> --preset <chip>` loads a Gear Sets preset before the
  Upgrades tab opens (the picker is in the Gear tab, hidden once another tab is
  active). `--preset "?"` lists that phase tab's chips, or every tab's with
  `--preset-tab "?"`, and exits 1 before any sim.
- `--wasm-concurrency N` sets `__tbc_new_wasmconcurrency` before navigation; at
  1 the page does not split its sim, so its DPS is comparable bit for bit.
- `--capture-requests <dir>` wraps `WorkerPool.prototype.raidSimAsync` before
  the Run click and records each request and its exact `raidMetrics.dps.avg`.
  The first tab call is the baseline. It writes `<dir>/tab-baseline.json`.
- `--page-sim` (needs `--capture-requests`) then runs the page's Simulate at
  seed 11 and the tab's iterations, writes `<dir>/page.json`, and replays that
  request once on the tab's pool with `debugFirstIteration: false` and the
  tab's player name (`<dir>/replay.json`). It sets `#simui-fixed-rng-seed`,
  which upstream renders in the settings dialog; whether that input is in the
  DOM while the dialog is closed is untested on the React page.

New readback fields: `presetTab`, `preset`, `wasmConcurrency`, `captureError`,
`tabSimCalls`, `pageSimCalls`, `calls`, `tabBaseline`,
`tabBaselineMatchesDisplay`, `tabBaselineRequest`, `pageRequest`, `pageDps`,
`pagePlayerDps`, `pageSeed`, `pageIterations`, `pageError`, `dpsDiff`,
`dpsEqual`, `replayDps`, `replayEqual`, `replay`, `exact`, `requestCheck`
(consumable and spell-effect ids per side, `effectIdsCovered`,
`tabCallsWithPageRows`, `otherDiffPaths`, `otherDiffCount`), and
`pageSimError` / `replayError` when a step fails.
