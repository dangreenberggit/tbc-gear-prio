# Wowsims tab — handoff to the next orchestrator

You are taking over an in-flight detour: a shopping-list "Upgrades" tab inside
a personal fork of the wowsims TBC sim.

Written 2026-08-14 by the outgoing orchestrator seat. Every claim here was
verified by running the command shown, not recalled.

## Do this first

**Dispatch slice 4 (UI completion) to a Sonnet workhorse**, with §3's fnm recipe
and serving recipe pasted into its prompt. Plan §9.4 is the spec and plan §4
lists the behaviours; *done when* every one works **without triggering a sim**
and a gear change marks results stale. Staleness listeners already exist in
`upgrades_tab.tsx`.

In parallel, slice 6's `sme-rank-review` can go to an **Opus** review-lane agent
— different repo, different files, no conflict.

Then read [`PROCESS.md`](PROCESS.md) for per-slice state, and
[`plan.md`](../../../docs/plans/wowsims-tab/plan.md) §9 for the slices
themselves. The plan was amended twice this session — E-W3's home and E-W1's
result — both marked inline. `AGENTS.md` binds you: **"Durable claims"**,
**"Types from JSON"**, and **"The loop"** step 5.

---

## 1. Where the code is

| What | Where | Branch | Tip |
| --- | --- | --- | --- |
| This repo | `C:\Users\dgree\Code\lulz\tbc-gear-prio` | `feat/shopping-list-wowsims-tab` | `7c058d8` |
| The fork (nested, gitignored, own git) | `vendor/tbc-new-fork` | `feat/upgrades-tab` | `f7146dd69` |
| Ret p3 data worktree | `..\tbc-gear-prio-wt-ret-p3-data` | `feat/ret-p3-data` | `9004654` |

Other worktrees in `git worktree list` (`salvage-docs`, `.claude/worktrees/*`,
`wt-fan-out-retro`) are **unrelated to this detour** — leave them alone.

`data/wowsims-fork.lock.json` pins the fork commit and carries `"pushed": false`.

---

## 2. Standing constraints

Each is a state to preserve, and each has held so far.

- **The fork stays local.** Plan §1 puts every push behind a separate explicit
  ask. `pushed: false` in `data/wowsims-fork.lock.json` records that; flipping
  it is a deliberate act with the user's word behind it.
- **`dev` receives a merge only after a separate ask.** AGENTS.md loop step 5:
  `pre-merge-review` writes `docs/reviews/<branch>.md`, then you **stop**. A
  combined "review and merge" request still means stop after the review.
- **The fork stays dependency-free.** A user decision — it keeps a future
  upstream PR free of test-infra churn. Anything the fork seems to need from a
  library, solve in this repo instead, where vitest already lives.
- **`packages/core/src/` stays untouched.** Plan §3: this detour requires no
  changes there. It is clean today; keep it that way and say so if you find a
  reason it cannot be.
- **Review lanes run Opus at effort medium** (`docs/agents/model-policy.md`);
  workers run Sonnet. If a review job cannot get Opus, stop and say so rather
  than substituting.

---

## 3. Two environment traps that will cost you an hour each

### The fnm trap

Every shell whose cwd is inside `vendor/tbc-new-fork` fails **before your
command runs**:

```
error: We can't find the necessary environment variables to replace the Node version.
```

Two independent causes; fixing one is not enough. Start every fork shell with:

```bash
eval "$(fnm env --shell bash)"
export PATH="/c/Program Files/Go/bin:/c/Users/dgree/go/bin:$PATH"
```

**Every fork-worker prompt must carry this**, or the worker will read a
shell-setup error as a build failure and debug the wrong thing.

### Serving the site

Three steps no committed file captures, because the Makefile paths that do them
need `air` (installed by piping a remote script to `sh` — deliberately not run):

```bash
cp -r assets dist/tbc/
sed -e 's/@@CLASS@@/paladin/g' -e 's/@@SPEC@@/retribution/g' \
    ui/index_template.html > ui/paladin/retribution/index.html
npx tsx vite.build-workers.mts       # needs `go` on PATH — copies wasm_exec.js from GOROOT
npx vite serve --port 5173           # → http://localhost:5173/tbc/paladin/retribution/
```

Skip the `sed` step and **vite serves the landing page for the spec URL** —
looks like a routing bug, isn't one. Skip the workers build and `sim_worker.js`
404s while `wasm_exec.js` returns vite's HTML fallback as `text/html`.

`.claude/launch.json` has a `wowsims-fork` entry for the dev server.

---

## 4. Done: slices 1, 2, 3 (except E-W2), and 6 (except review)

Per-slice detail, and what to check when reviewing each, is in
[`PROCESS.md`](PROCESS.md) — it is the single source of truth for slice state.
One result is repeated here because everything downstream rests on it.

### E-W1 passed

The gate on every number the tab shows, unrun since compute-topology was
written:

```
WASM   2042.3926145882178
native 2042.3926145882197   → delta 1.8e-12 DPS (gate: 3.4 DPS)
```

Smaller than native's own 20-vs-4-thread spread (`6.8e-13`), so it is
float-ordering noise, not disagreement. Reproduced independently with a
separately written harness. Plan §10's risk row is closed.

Two gotchas if you re-run it: the WASM build has **no `with_db` embedding**
(inject a `SimDatabase` per player) and **`wasmready` must exist as a global
before `go.run`** or `sim/wasm/main.go:40` panics.

---

## 5. Outstanding work

**Slice 4 — UI completion.** The critical path; briefed at the top of this file.
Its gate is one **Opus-medium review over slices 3+4 combined**, before the fork
integration merge (orchestration.md §"Review points").

**Slice 6's remaining gates.** The data work is done and verified; the review is
not.

1. `sme-rank-review` (**Opus**, review lane) on the refreshed ret-p3 ranking.
2. `pre-merge-review` on `feat/ret-p3-data` → `docs/reviews/feat-ret-p3-data.md`.
3. **Then stop.** Merge is a separate ask from the user.

**Slice 5 — WCL gear-only importer.** Plan §6, gated by E-W4 (ship vs shelve on
a proto diff). Needs only slice 1, so it can run alongside slice 4 — in **its own
`git worktree` of the nested clone**, since one tree holds one writer
(orchestration.md risk 1).

### Open tickets filed this session

| # | What | Why it matters |
| --- | --- | --- |
| [154](../../carry-forward/issues/154-feral-p2-universe-stale-against-generator.md) | `feral-p2.json` does not reproduce from its own generator | Pre-existing drift; needs a feral-owning session |
| [155](../../carry-forward/issues/155-ew3-parity-test-covers-one-narrow-path.md) | E-W3 covers one candidate at one seed | Paired replication, meta repair, set bonuses, `applyView` unverified |
| [156](../../carry-forward/issues/156-ew2-browser-wasm-throughput-unexplained.md) | E-W2 unmeasured, browser WASM inexplicably slow | **Blocks slice 3's done-when and D7's iteration default** |

[121](../../carry-forward/issues/121-no-upstream-ret-p3-curated-gear-set-to-pin.md)
was resolved this session; [153](../../carry-forward/issues/153-p3-curated-list-pinned-to-p2-set.md)
is root-cause-fixed with its display-side points still open.

### Stale doc found, left alone

**PLAN.md §16 item 3** still lists `PseudoStatMainHandDps` as outstanding; it
was fixed 2026-08-02 by `2fdad02`. Verified but not corrected — it sits outside
this detour's files.

---

## 6. Ticket 156 is the interesting one

E-W2 is blocked and **nobody knows why**. What is measured:

| | |
| --- | --- |
| `lib.wasm`, 5,000 iterations, direct Node | **14.7 s** |
| Upstream's own Simulate button, in-pane, after fixing worker bundles | **93 s, did not finish** |
| Busy-loop 1 s, main thread vs Worker | 5,493,974 vs 5,087,158 (**1.1×**) |
| `WebAssembly.compile`, 20 MB module | **22 ms** |

Slice 3 blamed Worker throttling from `document.hidden === true`. **The 1.1×
ratio refutes that** — Workers are not throttled here. Compilation and core
count are ruled out too. The engine is not slow; something in the browser
delivery path is.

Best untested candidate: the **vite dev server** serving unbundled ES modules.
Try a production build (`vite build` / `make host`) before assuming the harness
is at fault. If a production build is fast, that changes how every future
in-browser measurement must be taken.

---

## 7. The green baseline

All four pass today. Run them before and after any change so you know which side
a failure came from.

```bash
pnpm verify                                              # exit 0; 760 tests
pnpm engine-port-drift:check                             # 30/30 ported files
npx vitest run packages/core/test/wowsims-fork-parity.test.ts   # E-W3
```

In the fork, after §3's fnm recipe: `npx tsc --noEmit` → exit 0.

**Editing any ported file under `upgrades/engine/` costs three steps, in order:**
re-run E-W3, confirm it still passes, then update that file's hash in
`engine/PROVENANCE.md`. The drift gate fails until the hash matches, and it
tells you so by filename. Keep that order — a hash proves bytes match, never
that behaviour does, so updating it first converts a caught regression into a
silent one.

---

## 8. How the outgoing seat worked, and why

Offered as a method, not a rule. Two habits earned their keep:

**Verify worker claims by re-deriving them, not by reading reports.** Every
slice this session reported success; three had something materially wrong that
only re-running caught. Slice 6 named the wrong upstream commit (would have
made a pin bump a no-op). Slice 6b's feral arithmetic attributed pre-existing
drift to its own fix. Slice 3 named a cause for E-W2 that measurement refutes.
None was carelessness — the workers were careful and honest, and each flagged
its own uncertainty. The errors were in the parts they were most confident about.

**Mutation-test a gate before trusting it.** "E-W3 passes" only proves the test
runs. Breaking the fork's engine on purpose showed it catches a `cutoff.ts`
change but is blind to `se.ts` — because the test uses one seed and paired
replication needs two. That turned a suspected limitation into ticket 155, and
confirmed the drift gate covers exactly the case the parity test misses.

Workers did genuinely good work — the per-file pin override that respects D2,
the phase-guard bug found while regenerating, the refusal to fabricate a BiS
list or E-W2 timings. Trust their judgment; verify their numbers.
