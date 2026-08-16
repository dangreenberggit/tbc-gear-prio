# Plan: close ticket 156 (browser WASM throughput, E-W2)

Ticket: `.scratch/carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md`
Parent plan: `docs/plans/wowsims-tab/candidate-pool.md` (§3.4.1, §5.3, §6.4, D7)
Written 2026-08-16 on `feat/candidate-pool`. Status of this plan: **proposed, not started.**

## 0. Why this is the remaining job

candidate-pool.md left three things hanging on one number — the wall-clock a
user sees in a real browser:

- **D7's 3,000-iteration default** is unjustified in either direction (§3.4.1).
- **§6.4** shows racing at 3,000 is a 14% *loss* and at 5,000 a win; which one
  ships depends on what 3,000 vs 5,000 costs in the browser.
- **§5.3 done-when** "ticket 156's recipe rewritten … user re-runs it" — the
  re-run has failed four times.

Every CLI and Node-WASM figure exists (§3.3). Only the browser number is
missing, and it is the one that decides the shipped defaults.

## 1. What the last attempt got wrong (re-read of the evidence)

The 2026-08-16 "later still" comment concluded the engine never loaded and
the tab "ran on its recorded adapter". Both parts are unsupported; this plan
does not inherit them.

| Claim in ticket | Check | Finding |
| --- | --- | --- |
| "ran on its recorded adapter" | `grep -n SimRunner vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` | The tab constructs `new WasmSimRunner()` unconditionally (line 97). There is no recorded adapter on this surface. |
| `lib.wasm` never fetched (page `performance` entries = 0) | `vendor/tbc-new-fork/ui/worker/sim_worker.ts:45` | The worker fetches `lib.wasm` itself. Worker fetches do not appear in the **page's** `performance.getEntriesByType('resource')`. That probe is blind to the engine load and proves nothing. |
| Error text means "recording missing" | `packages/core/src/rank.ts:1574-1582`, fork copy `engine/rank.ts:1201` | `no recorded request for ranked item` is thrown by `replicateTopItems` when a **ranked row has no entry in `winningRequests`**. It is an engine invariant failure, not an adapter message. |

Rows landing at all ("15 rows landed") means sims returned results, which the
pool cannot do without a live worker. So the run **was** on the engine, and
the run died in the ranking stage after ~38 sims. **Hypothesis, untested:**
screened-but-not-promoted rows are pushed into `ranked` (`rank.ts:1389`) with
`belowCutoff` unset and no `winningRequests` entry; `replicateTopItems` picks
`ranked.filter(!belowCutoff).slice(0, 8)`, so whenever fewer than 8 promoted
rows meet the cutoff, a screened row reaches replication and throws.
Krakken-Heart Breastplate is a plausible screened row. Racing is on by
default in the fork (`input.fullPool !== true`, fork `rank.ts:512`) and
`DEFAULT_SEEDS` has 5 seeds, so replication runs in the tab.

## 2. Slices, in order

Each slice ends on a checkable criterion. Slice A gates B; B gates C.

### A. Reproduce and fix the ranking failure (core + fork, TDD)

1. **Red:** in `packages/core/test/rank.test.ts`, a `rankUpgrades` test through
   the recorded/derived runner with racing on, 5 seeds, and a fixture where the
   promoted rows meeting cutoff number fewer than `PAIRED_REPLICATE_TOP_N` (8)
   — e.g. `candidateCap: 3`. Expect: no throw, replication touches only rows
   with `screened === undefined`, screened rows keep `seMethod: 'independent'`.
   Test placement per `AGENTS.md` § Testing (interface, not stage internals).
2. **Green:** `replicateTopItems` selects from
   `ranked.filter(r => !r.belowCutoff && r.screened === undefined && r.simmed !== false)`.
   Keep the throw — a promoted row without a request is still our bug.
3. Port the same change to the fork copy
   (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`)
   per candidate-pool.md §9.1a fork isolation; commit in the nested clone
   first, then the pointer.
4. If the red test does **not** reproduce the throw, the hypothesis is wrong:
   stop, write what the test showed into the ticket, and take the next
   candidate (a candidate dropped as `sim`/`repair` failure that still
   reached `ranked`).

Done when: `pnpm verify` green in both repos, and the ticket comment names the
test that went red and the commit that greened it.

### B. Rebuild, serve, and prove the engine loaded — without a page-side probe

Reuse the recipe in the ticket's "Operational detail" (rebuild first, grep the
bundle for `upgrades-candidates`, `http-server dist -p 8123 -c-1`, Claude in
Chrome on Brave). Replace the engine-loaded assertion:

- **Server side:** `http-server` access log shows a `GET /tbc/lib.wasm` after
  the tab was opened (`-c-1` means the browser re-requests it every load).
- **Pool side:** the page's `WorkerPool` logs `Ready, isWasm: true`
  (`ui/core/worker_pool.ts:237`) — read it from the console, once, before Run.

Done when: both signals are recorded in the ticket for the session that
produced the numbers. A run with either missing is not a measurement.

### C. The table

Two cells × three runs, Candidates = 20, using the `MutationObserver` +
`.upgrades-run-button.disabled` detector already in the ticket, **no harness
polling during a run** (wait in the shell; read `window.__m` once after).

| Iterations | Candidates | Run 1 | Run 2 | Run 3 | Workers | Concurrency | `hardwareConcurrency` |
| ---------- | ---------- | ----- | ----- | ----- | ------- | ----------- | ------------------- |
| 3000       | 20         |       |       |       |         |             |                     |
| 5000       | 20         |       |       |       |         |             |                     |

Also record per run: number of screening sims and full sims issued (the
`Simming n/N` final N and the promoted count from the results panel), because
racing is on and the CLI comparison in §6.4 needs both.

Discard the first run after any state change (ticket's cold-start rule) —
run four, report three.

Done when: the table sits in candidate-pool.md **§5** (plan §8 E-W2's home)
with machine, foregrounded status (`document.visibilityState`, expected
`visible`), and the run-to-run spread stated. Ticket 156's three restated
acceptance boxes tick.

### D. Decide D7 (design lane, one paragraph)

With C's numbers, apply §6.4's break-even rule: racing pays at 3,000 only if
the promoted ratio < 0.571, at 5,000 if < 0.735. Write the outcome as an ADR
amendment or a §6.4 addendum: **one** of

- keep 3,000 and turn racing off by default on the browser path (as on CLI);
- raise the default to 5,000 and keep racing;
- keep both as shipped and record the measured loss as accepted.

Done when: D7's line in `docs/plans/wowsims-tab/plan.md` says which and cites
the §5 table.

## 3. Lanes and budget

- A: workhorse (Sonnet), TDD, both repos. Half a session.
- B + C: workhorse driving Claude in Chrome; the ticket's selector/setter
  snippets are already written — spend budget on running, not rediscovering.
  Six timed runs at ≤ 5 min each plus rebuild (~3 min): one session.
- D: design lane (Fable), one paragraph after C.

Nothing here fans out; A → B → C → D is strictly serial.

## 4. Out of scope, noted for tickets

- Candidates placeholder renders `{{count}} / {{count}}` (ticket's cosmetic
  note) — file separately.
- The 5.3 s → 12.1 s single-candidate variance from 2026-08-14 was measured
  in the non-compositing pane; C's spread on the visible surface supersedes
  it. Explain it only if C shows the same spread.
