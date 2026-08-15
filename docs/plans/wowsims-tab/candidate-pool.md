# Candidate pool: bound the run without letting EP pick the answer

Ticket: `.scratch/carry-forward/issues/199-tab-candidate-pool-is-not-prefiltered.md`
Parent plan: [`plan.md`](plan.md) §5, §2.5, §12 · Engine seam rules: `PLAN.md` §5 · Prior decision: [ADR-0018](../../adr/0018-no-rank-time-ep-prefilter-so-no-fullpool-flag.md)
Date: 2026-08-15 · Status: **rev 2 — plan review done (§8), ready for the execution orchestrator (§9)** · Author seat: Fable (design lane)

## 0. Read this first

This plan replaces the "~80 candidates after the prefilter" story in `plan.md` §5 with a design that (a) fixes the documents to match the engine, (b) measures the numbers every cost estimate rests on, and (c) bounds an in-browser run by letting the **sim** screen candidates, with EP demoted to _ordering_ — a stricter reading of `PLAN.md` §8.3.3's own line "EP is never the answer, only the filter".

**Budget honesty (rev 2).** No move here reaches "tens of seconds" in-browser at the per-sim costs in F5. The goal is stated as: a default ret run at `maxPhase 2` finishes in **single-digit minutes** on a 4-worker machine, every partial state is honest and resumable, and each move's speed-up is a **measured ratio** written into this file. Whether that is good enough is the user's call after §3.3 has numbers.

Words used throughout, fixed once:

- **universe** — the committed `data/universes/<spec>-p<N>.json` rows.
- **eligible** — universe rows after `phase <= maxPhase` and the Kael temp-legendary exclusion. Today this is the whole simmed set.
- **screen** — a cheap, low-iteration sim of an eligible candidate at the shared seed.
- **promote** — carry a screened candidate into the full-iteration pass.
- **racing** — screen everything, promote by rank, sim survivors fully (successive halving).
- **owned** — an eligible item the player already wears (`equippedIds`); kept in the ranking, never dropped (`PLAN.md` §8.3.3).
- **complete / partial** — a `Ranking` where every eligible candidate was simmed or screened, vs one cut short by Stop or a crash. Only complete rankings are cached as rankings.

## 1. Facts this plan stands on

Every line below was read from code on 2026-08-15 at fork `3e64016dd`, this repo `8c1e49e`. Re-run the cited command before relying on any of them.

| #   | Fact                                                                                                                                                                                                                                                                                                                                                                       | Where                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| F1  | Both engine copies select candidates with exactly two filters: phase and Kael legendary. No EP-based selection, cap, or sort-then-truncate. `grep -n "epWeights" packages/core/src/rank.ts` shows only gem context, repair, hash and disclosure uses.                                                                                                                      | `packages/core/src/rank.ts:576-582`; fork `engine/rank.ts:379-381`           |
| F2  | Ret eligible counts by `maxPhase` (add a row per spec as the roster §7.a grows), from `ret-p5.json`: p1 **155**, p2 **246**, p3 **390**, p4 **437**, p5 **518**. Count: `node -e "const u=require('./data/universes/ret-p5.json');for(const p of [1,2,3,4,5])console.log(p,u.filter(r=>r.phase<=p).length)"` (adjust if the file is wrapped in an object).                 | `data/universes/ret-p5.json`                                                 |
| F3  | Sims per run = 1 baseline + one per candidate per applicable slot (paired slots cost two) + `(seeds-1) × (1 + min(8, candidates))` replication + set-completion sims (cost _target_ ~4, not enforced). No cap, no early stop; `meetsCutoff` classifies after a sim, never prevents one. The candidate loop is serial: `for (const entry of candidates)` awaiting each sim. | `rank.ts:456,286,723,1120,1126-1129`, `engine/se.ts:6`                       |
| F4  | An EP top-~80 prefilter was built in `10952d9` and removed in `a20f654`. ADR-0018 defers it "until the web path needs a ranking in tens of seconds".                                                                                                                                                                                                                       | `git show 10952d9 a20f654 --stat`                                            |
| F5  | The only in-browser timing that survives ticket 156's traps: one 3,000-iteration sim ≈ **5–13 s** with 4 workers, production build; three runs, 2.6× spread. Upstream splits _iterations_ across workers, so candidates run one at a time. **Treat as an order of magnitude, not a measurement**; E-W5 replaces it.                                                        | ticket 156; fork `ui/core/sim_concurrent.ts:161-194`                         |
| F6  | Per-sim cache key includes iterations, so screening sims and full sims never collide and both dedupe across runs.                                                                                                                                                                                                                                                          | `packages/core/src/rank.ts:1589-1595`                                        |
| F7  | In the fork, iterations are read from global sim settings by `makeRaidSimRequest`; the proto field `SimOptions.iterations` exists.                                                                                                                                                                                                                                         | fork `ui/core/sim.ts:246-263`                                                |
| F8  | Each `RaidSimRequest` rebuilds the environment (`NewEnvironment`) and may run **presims** (100 iterations per round, agent/config-dependent) before the measured iterations. So per-request fixed cost = setup + 0-or-more presim rounds. Whether ret runs presims is **unknown** and must be recorded by E-W5.                                                            | fork `sim/core/sim.go:114,148-156,190-191`; `sim/core/presim.go:35,42-57,78` |
| F9  | Upstream ships `player.computeItemEP(item, slot)`: cached, phase-aware, socket/gem-aware, blind to set bonuses, procs, on-use and weapon speed.                                                                                                                                                                                                                            | fork `ui/core/player.tsx:1132-1185`                                          |
| F10 | `PLAN.md` §10: five-seed max−min of baseline means was **0.099 DPS** at 5,000 iterations; **reported independent SE 1.678 DPS** at 5,000; cutoff `{absDps: 3.4, pct: 0.15}`. Only independent SE is observable per sim; paired-delta variance is not returned by the sim.                                                                                                  | `docs/five-seed-spread.json`, `packages/core/src/se.ts:1-12`                 |
| F11 | The fork ships no TypeScript test runner; E-W3 parity runs from this repo.                                                                                                                                                                                                                                                                                                 | `packages/core/test/wowsims-fork-parity.test.ts:36-42`                       |
| F12 | The core test suite already has a `CountingSimRunner` and a function-shaped `respondingSim()` runner for tests that vary gear/iterations on purpose.                                                                                                                                                                                                                       | `packages/core/test/rank.test.ts:1066,1104-1114`                             |

### 1.1 Cost model (one formula, terms filled by measurement)

```
wall ≈ t_baseline
     + ceil(n_screened / P) · (t_fixed + t_iter · I_screen)      # M2 only
     + ceil(n_full / P)     · (t_fixed + t_iter · I_full)
     + replication (36 sims at 5 seeds) + set packages
```

`n_screened` = eligible (F2); `n_full` = eligible today, promoted after M2, ≤ `candidateCap`; `P` = concurrent candidates (M1, ≥1); `t_fixed`, `t_iter` from E-W5 §3.1; `I_full` = 3,000 default. Today: `P = 1`, no screen, so ret p2 ≈ 290 sims × F5 ≈ **25–65 min**; p5 ≈ 560 sims ≈ 1.9×. F5's 5–13 s is a 4-way _split_ of one sim; under M1 each request is single-split and ~4× longer but 4 run at once — similar throughput, better amortisation of `t_fixed`.

## 2. Decision

| Move                                     | What                                                                                                     | Gate                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **M0** Docs                              | Make `plan.md` and tickets say what the engine does.                                                     | none — do first                                    |
| **E-W5** Measure                         | Per-request overhead + presim status; screening-rank correlation vs full sweep.                          | none — agent-run                                   |
| **M1** Controls + parallelism + ordering | Candidates cap; candidate-level concurrency; EP ordering; Stop with a partial type; row-landed progress. | none                                               |
| **M1.5** Measure                         | EP-ordering recall on committed full-sweep fixtures — no code.                                           | after M1 ordering exists                           |
| **M2** Racing                            | Screen all, promote by rank, sim survivors fully. `fullPool` goes live.                                  | go/no-go from E-W5 §3.2 + M1.5                     |
| **M3** EP prefilter                      | §8.3.3 with set/proc exemptions, behind `fullPool`.                                                      | only if M1+M2 ratios still miss; fresh design pass |

Invariants: `PLAN.md` §2 "no view changes a number"; hidden never deleted; three seams, no fourth port; the two engine copies are byte-parity **at the branch tip before any merge ask** (they are knowingly out of step between rounds, §9.2); EP weights stay committed per-spec (`plan.md` §12).

## 3. E-W5 — measurements

### 3.1 Per-request cost under Node (agent-run)

Sweep iterations `{100, 300, 1000, 3000, 5000}`, same fixture gear and seed, five repeats, report **median** (the ratio in §6 uses median). First record whether presims run for the ret fixture (progress reports `PresimRunning`, or instrument the Go side); if they do, run the sweep with and without them and report `t_fixed` as two components. Output `experiments/e-w5-overhead.{json,md}` with the raw table and fitted `t_fixed`, `t_iter`.

Also record per-worker memory: RSS of one `SimWorker` with an in-flight request, so §5.1.2's `memoryCap` is a number.

Done when: `t_fixed`, `t_iter`, presim status and per-worker RSS are in §3.3 with the command that produced them.

### 3.2 Screening rank vs full rank (agent-run, the number that decides M2)

On **every fixture in the roster (§7.a)** run the full eligible set at the fixture's `maxPhase` at each sweep point of 3.1 and at 5,000. For each fixture and point report: Spearman rank correlation of screening delta vs 5,000-iteration delta; and **K\*** = the smallest global top-K by screening rank that contains every 5,000-iteration above-cutoff row. Output `experiments/e-w5-rank.{json,md}`, one table per spec.

M2 **go** if some point has `cost(point)/cost(5000) < 0.25` on the tuning fixture **and** `max K* over the roster ≤ 60`; that point is `screenIterations`, `promoteTopK = max K* + 10` (one default for all specs; a per-spec default is a later refinement only if one spec's K\* dominates). Otherwise **no-go**: M2 is not shipped, this file says so, and M3 goes to a design pass.

### 3.3 Results

Measured 2026-08-15 by slice B, branch `slice-b-ew5` at base
`9ae92a324be891367398c8657b78b506903928ad`. Every number below has the
command that produced it in `experiments/e-w5-overhead.{json,md}` and
`experiments/e-w5-rank.{json,md}`, both committed alongside this file.

#### §3.1 — per-request cost (`experiments/e-w5-overhead.{json,md}`)

`node scripts/ew5_overhead.mjs` — five-repeat median sweep against the pinned
CLI binary (`vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe`, tag
v0.0.101), fixture `test/fixtures/slamaltman.raid-sim-request.json`, seed 42.

| iterations | median wall-clock (ms) | median dps |
| ---------- | ---------------------- | ---------- |
| 100        | 377.0                  | 2026.7     |
| 300        | 391.0                  | 2039.3     |
| 1000       | 435.8                  | 2040.9     |
| 3000       | 575.5                  | 2042.8     |
| 5000       | 685.2                  | 2042.4     |

Fit: `t_fixed` = **373.2 ms**, `t_iter` = **0.0637 ms/iteration**.

**Presim status (F8):** no presim round executes for the ret fixture. Read
from code, not inferred from timing: `runPresims`
(`vendor/tbc-new-fork/sim/core/presim.go:34`) only loops its body when
`remainingAgents > 0` or `EndFightAtHealth > 0`. `remainingAgents` comes from
`Presimmer.GetPresimOptions`, implemented only by `Character`
(`vendor/tbc-new-fork/sim/core/health.go:272`), which returns `nil` unless
`HealingModel.Hps == 0 && HealingModel.CadenceSeconds != 0`. The fixture's
player has `healingModel: {}` (both zero), so `GetPresimOptions` returns
`nil`; the fixture's encounter has a fixed duration (no `EndFightAtHealth`
field), so `doOne` is also `false`. The loop body never runs — this is a
resolved zero, not an unseparated mix. **Not separable on the CLI
`--outfile` path in general**: `RaidSimResult`
(`vendor/tbc-new-fork/proto/api.proto:384-398`) carries no presim field —
only the streaming `ProgressMetrics` channel does, which `--outfile` does
not use — but that limitation does not bite here since the presim count is
provably zero for this fixture. `t_fixed` above is therefore pure setup
cost.

**Per-worker memory:** peak RSS **183.8 MB**, one sim process, 5000
iterations, sampled every 100ms via `Get-Process -Id <pid> |
.WorkingSet64` in an isolated pass (not concurrent with the timing sweep —
see below).

**Deviation, recorded per the task's instructions:** a first version of the
harness polled RSS every 50ms _during_ the timing sweep. That polling
inflated wall-clock by 2-40x from CPU/IO contention between the poller and
the sim process (100 iterations went from ~450ms to up to 1.5s; 300
iterations up to 19s) — numbers that looked plausible but were pure
measurement noise. Fixed by measuring RSS in a separate, single run with no
concurrent timing claim; the sweep table above is from the corrected script.

#### §3.2 — screening rank vs full rank (`experiments/e-w5-rank.{json,md}`)

`node scripts/ew5_rank.mjs` — full eligible pool through the real
`rankUpgrades` seam (`packages/core/src/rank.ts`) against the live CLI
binary via `CliSimRunner`, `seeds: [42]` (disables paired replication),
both roster fixtures, every §3.1 sweep point plus 5,000.

**ret** (tuning fixture, eligible pool 246, `data/universes/ret-p5.json`
filtered to `phase<=2`):

| iterations | Spearman rho vs 5000 | K\* | above-cutoff rows | cost(point)/cost(5000) |
| ---------- | -------------------- | --- | ----------------- | ---------------------- |
| 100        | 0.9721               | 18  | 13                | 0.609                  |
| 300        | 0.9882               | 15  | 13                | 0.650                  |
| 1000       | 0.9946               | 15  | 13                | 0.695                  |
| 3000       | 0.9995               | 13  | 13                | 0.847                  |
| 5000       | 1.0000               | 13  | 13                | 1.000                  |

**feral** (eligible pool 246, `data/universes/feral-p2.json` filtered to
`phase<=2`):

| iterations | Spearman rho vs 5000 | K\* | above-cutoff rows | cost(point)/cost(5000) |
| ---------- | -------------------- | --- | ----------------- | ---------------------- |
| 100        | 0.9699               | 25  | 16                | 0.462                  |
| 300        | 0.9905               | 16  | 16                | 0.483                  |
| 1000       | 0.9964               | 18  | 16                | 0.565                  |
| 3000       | 0.9992               | 16  | 16                | 0.768                  |
| 5000       | 1.0000               | 16  | 16                | 1.000                  |

Cutoff used for K\*: `{absDps: 3.4, pct: 0.15}` (F10), fixed for both specs
per this plan's go/no-go rule — feral's own `cutoffForSpec()` value is
`{absDps: 3.6, pct: 0.15}` (`packages/core/src/cutoff.ts:27`), different
from what was used here; noted for transparency, not applied.

#### Go/no-go: **no-go**

The go rule needs _both_: some point with `cost(point)/cost(5000) < 0.25`
on ret, **and** `max K* over the roster ≤ 60`. The K\* condition holds easily
(max K\* = 25, well under 60), but the cost condition fails outright: the
_cheapest_ ret sweep point (100 iterations) still costs **0.609** of a
5,000-iteration run, more than double the 0.25 threshold, and cost only
rises from there as iterations increase. No sweep point on either fixture
gets close to 0.25.

The reason is visible in the §3.1 fit: `t_fixed` (373 ms) dominates
wall-clock at every sweep point tried — even 100 iterations only adds
`0.0637 × 100 ≈ 6 ms` of iteration-proportional cost, so wall-clock at 100
iterations (377 ms) is barely different from wall-clock at 5,000 (685 ms).
Screening buys almost nothing here because the _fixed_ per-request cost
(process spawn, `NewEnvironment` setup) — not the iteration count — is what
a low-iteration screen fails to avoid. Racing (M2) cannot pay for itself
under this cost model without also amortizing or eliminating the per-request
fixed cost (e.g. batching multiple candidates into fewer process spawns,
which is a different mechanism than screening iterations down).

**M2 is not shipped.** Per §2's gate, M3 (EP prefilter) goes to a fresh
design pass rather than proceeding past M2. `screenIterations` and
`promoteTopK` are not set.

## 4. M0 — documents match the engine

- `plan.md` §5 step 2: replace "player-aware EP prefilter" with "no prefilter; every eligible candidate is simmed (F1)"; replace "~80 candidates after the prefilter" with F2's counts and §1.1's model; point here.
- `plan.md` §2.5, §7 ret-p3 note, §12 "Role is prefilter and gem fill only": role is **gem fill and, after M1, sim ordering**. Never selection.
- Ticket 162: one-line correction comment.
- ADR-0018: "See also" line to this plan; "Superseded-in-part" when M2 ships.

Done when: `grep -n "prefilter" docs/plans/wowsims-tab/plan.md` returns only lines that say the prefilter does not exist or point here.

## 5. M1 — controls, parallelism, ordering, Stop

### 5.1 Behaviour

1. **Candidates control** beside Iterations: integer, default _all eligible_ (shows "246 / 246"), `min=1`. `RankInput.candidateCap?: number`, hashed; `undefined` and `= eligible.length` must hash identically (test 7.4). Before M2 the cap keeps the first N of the EP ordering **plus every owned row regardless of N**, and the assumptions drawer says "top N by EP order — a preselection, not a ranking". After M2 the cap is applied **after screening**, to the promoted set, so the sim — not EP — picks what the cap keeps.
2. **Concurrency across candidates.** The candidate loop in `rank.ts` (F3, both copies) becomes a bounded pool over candidate tasks, using a small pure `promisePool(tasks, n)` module in `packages/core` (unit-tested here; the fork adapter is a call site — F11). Pool size is a plain scalar `Deps.concurrency` (CLI: 1; fork: `min(workers, memoryCap)` from §3.1). The `SimRunner` port keeps its single-request shape — no batch method. Progress `done` is a monotonic completion counter; results are keyed by request, never by arrival order. When `candidates < concurrency` the fork adapter may fall back to upstream iteration-splitting for the remainder (records the crossover in HANDOFF); otherwise each request is single-split. Per-sim cache write happens before the next dispatch, so a crash loses at most the in-flight batch.
3. **EP ordering.** Eligible candidates sort by committed-EP delta vs the owned item in that slot, computed **pre-gem** (raw item stats × `epWeights`, no repair) so it exists before any sim and never fails; ties by item id. Owned items sort at 0 but are exempt from the cap (5.1.1). Ordering changes _when_ a row fills and what a pre-M2 cap keeps; it changes no displayed number.
4. **Stop.** `Deps.signal?: AbortSignal`. On abort the run finishes in-flight sims and returns `Ranking & {complete: false}` (a `PartialRanking` type); rows not simmed carry `simmed: false` and are excluded from cutoff classification and tie groups. The ranking cache write accepts only `complete: true` — enforced by type, not by convention. Per-sim rows are written as usual, so re-running resumes cheaply (F6).
5. **Row-landed progress.** `Progress` gains a `{kind: 'row', row}` event so the UI fills a skeleton as each sim lands; tested at the interface (7.11).

### 5.2 Where it lives

| Piece                                                 | `packages/core`                                               | fork                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| cap, ordering, `signal`, `complete`, row events, hash | `rank.ts` loop restructure, types, hash; `promisePool` module | ported `engine/` copy, PROVENANCE bump                                        |
| `Deps.concurrency` value, memoryCap                   | CLI: 1                                                        | adapter: `min(workers, memoryCap)`; optional split fallback                   |
| Controls                                              | —                                                             | `upgrades/` UI: Candidates, Stop; progress text `Screening a/n · Simming b/k` |

Seam check: no new port. `promisePool` is a helper, not a seam. `concurrency` and `signal` are `Deps` scalars.

### 5.3 Done when

- Cap = 20 at `maxPhase 2` sims baseline + 20 candidates + owned (+ replication) — progress total matches.
- `concurrency` 1 vs 4 → byte-identical complete `Ranking` (7.3, in core).
- Ticket 156's recipe rewritten around the cap; user re-runs it.

## 5a. M1.5 — does EP ordering lose real upgrades? (measurement, no code)

For every roster fixture (§7.a): rank eligible rows by 5.1.3's ordering; report the ordering rank of every above-cutoff row and of the top 5. Output `experiments/m1-5-ep-recall.md`. This decides two things: whether a pre-M2 cap default below "all" is ever safe (it is not unless the worst above-cutoff rank is small on every fixture), and how much M2 is worth (if EP recall is already good, M2's justification is weak; if an above-cutoff item ranks 200th, M2 is justified with a number).

## 6. M2 — racing

### 6.1 Rule (pure function, unit-tested)

Inputs: screening `deltaDps` per candidate at `screenIterations`; `promoteTopK`; slot; set-package membership; owned. **No SE, no intervals** — F10 shows the only observable SE is independent (~6.8 DPS at 300 iterations), which would promote everything.

Promote _c_ if any of: _c_ is in the global top-`promoteTopK` by screening delta; _c_ is best-in-slot at screening (floor: no empty slot); _c_ is in a set-completion package; _c_ is owned. Everything else is **screened out**: keeps screening `deltaDps`, flagged `screened: {iterations, promoted: false}`, is a **third view state** (not below-cutoff: unknown, not known-small), is ranked only among other screened rows, never interleaved with full-iteration deltas, and renders behind its own expand. Hidden, never deleted.

`screenIterations`, `promoteTopK`, `fullPool` join `RankInput` and `contentHash`. Changing a default invalidates cached rankings; accepted, per-sim rows survive (F6). `fullPool: true` skips screening and sims everything — ADR-0018's flag goes live with the thing it escapes.

Per-slot top-_j_ is **not** built now; it is added only when the recall test names a starved slot (see §8.1 Dean Q1 for the recorded disagreement).

### 6.2 Flow

baseline (full) → screen all eligible (pool) → rule → cap → full sims for promoted → replication + set packages as today → ranking.

### 6.3 Where it lives

`packages/core` first (TDD, §7 order), then port. The fork needs a per-request iterations override — an **optional `iterations` parameter on `makeRaidSimRequest`** (F7), not a parallel builder, to keep the upstream diff minimal.

### 6.4 Done when

- Recall (7.2) passes on the **held-out** fixture across K noise draws; top-5 never screened out.
- Ratio recorded here: full-iteration sims issued at defaults ÷ eligible, on ret `maxPhase 2`, tuning fixture, Node, `concurrency 1` — command in §3.3. Target ≤ 0.4.
- `fullPool: true` reproduces the pre-M2 fixture `Ranking` byte-for-byte.

## 7. Test plan

Rules: `AGENTS.md` § Testing — primary tests at `rankUpgrades` through recorded/derived adapters; pure functions unit-tested directly; nothing asserts on stage internals. Every test red before the code that greens it (`tdd`). **Order below is the order they go red.** Each row says what it forces.

Test runners: recorded full-iteration observations stay as they are. Screening observations come from a **derived runner** — recorded full-iteration truth plus deterministic seeded noise scaled by `1/sqrt(iterations)` (F12's `respondingSim` shape) — so `screenIterations` can change without re-recording, and recall can be run over many draws. One real screening recording, pinned, as a smoke test only.

### 7.a Fixture roster — one synthetic character per DPS spec

Fixtures are **synthetic characters, not WCL imports**: upstream's committed preset gear set for the spec (`ui/<class>/<spec>/presets*.ts` in the fork) worn with the sim's default settings, talents and consumes for that spec. No log dependency, deterministic, and the preset gear is itself in the universe so the owned path is exercised. Non-DPS specs are out of scope (the engine ranks DPS deltas).

- **Roster** = every DPS spec that has a committed universe and EP weights (`plan.md` §2.5). Today: ret, feral. Adding a spec later = universe + EP weights + one roster row; no plan change.
- **Gear point:** choose the preset phase and `maxPhase` so the full-sweep shortlist has **≥ 10 above-cutoff rows** — a character in the phase-N BiS set at `maxPhase N` has nothing to be upgraded to and cannot test recall. Default: pre-raid or p1 preset at `maxPhase 2`. Record the triple (spec, preset phase, `maxPhase`) per row.
- **Fixture split:** the tuning fixture is ret; **every other roster fixture gates** recall (7.2). The tuning fixture never gates. `packages/core/src/fixtures/feral-offline.ts` is the existing feral fixture; if it is WCL-derived, replace it with the synthetic one so both rows follow the same rule.
- Recording: full-iteration observations recorded once per roster row with the pinned toolchain (`data-pipeline-work`); screening observations derived (above).

| #    | Test                                                                                                                                                                                                            | Level                               | Forces                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| 7.0  | Racing does less work: at defaults on the held-out fixture, `CountingSimRunner` sees strictly fewer full-iteration sims than eligible, and ≥1 row is `screened.promoted: false`                                 | interface                           | two passes exist at all                        |
| 7.5  | Promotion rule: top-K, best-in-slot, set-package, owned branches; fewer than K candidates; all-equal deltas                                                                                                     | unit                                | the rule as a pure function, defaults injected |
| 7.2  | Recall: on the held-out fixture, across K seeded noise draws, every above-cutoff row is promoted and no top-5 row is ever screened out. A miss fails the build; the fix is the rule or defaults, never the test | interface                           | racing is safe on data it was not tuned on     |
| 7.4a | Hash: `candidateCap` (incl. `undefined` ≡ eligible.length), `screenIterations`, `promoteTopK`, `fullPool`, `concurrency` (must **not** change hash)                                                             | unit, beside `content-hash.test.ts` | cache identity is deliberate                   |
| 7.1  | Cap: `candidateCap: 20` → 20 + owned rows; `candidateCap: 1` still returns every owned row; post-M2 the 20 are chosen from the promoted set                                                                     | interface                           | cap semantics incl. owned exemption            |
| 7.3  | Determinism: `concurrency` 1 vs 4 identical complete `Ranking`; racing repeat identical; `fullPool` identical to pre-M2 fixture; the **same** error surfaces regardless of pool size                            | interface                           | order independence, escape hatch               |
| 7.6  | Ordering is a total order (ties by id), pre-gem, never throws                                                                                                                                                   | unit                                | ordering exists before sims                    |
| 7.7  | applyView: screened rows are a third state, appear in `rows`, never in `shortlist`, ranked among themselves, survive filters; extends `view.test.ts` properties named at `view.ts:40-80`                        | unit                                | hidden never deleted, no interleaving          |
| 7.8  | Stop: abort mid-run via `signal` → `complete: false`, unsimmed rows `simmed: false` and absent from tie groups/cutoff, no `ranking:` row written, per-sim rows written                                          | interface                           | Stop is honest and resumable                   |
| 7.9  | `promisePool`: at most n in flight; rejection propagates; results keyed by input                                                                                                                                | unit (core)                         | pool is a tested helper, not fork magic        |
| 7.10 | Port parity (E-W3 style): same fixture → same bytes from core and fork, `fullPool` and racing, **at the branch tip**                                                                                            | this-repo test over the fork copy   | two copies together before merge ask           |
| 7.11 | Row-landed progress: `onProgress` receives a `row` event per candidate before the promise resolves                                                                                                              | interface                           | anytime rendering has a seam                   |
| 7.12 | E-W5 / M1.5 harnesses                                                                                                                                                                                           | scripts                             | not tests — record numbers                     |

## 8. Plan review — done 2026-08-15

Three Opus (review lane, effort high) reviewers, one persona each — Fowler, Dean, Beck — each read its reference under `~/.claude/skills/review/references/` first, then this file at rev 1 and the F-table's cited code. All findings and the author's responses are in §8.1. Rev 2 is the result. Unresolved disagreements are named there and carried into §10's report.

### 8.1 Findings and responses

| Persona · sev    | Finding (short)                                                                                                                        | Response                                                                                                                                                                                                                                                                             | Edit                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Fowler · blocker | Concurrency cannot live in the adapter — `rank.ts:723` awaits each candidate serially; the port is single-request                      | **Accept.** Loop restructure in both copies via a core `promisePool`; port shape unchanged; `concurrency` is a `Deps` scalar                                                                                                                                                         | §5.1.2, §5.2, F3, 7.9 |
| Fowler · blocker | Stop breaks "no view changes a number" unless partial output is a distinct type                                                        | **Accept.** `PartialRanking` / `complete: false`; ranking cache accepts only complete                                                                                                                                                                                                | §5.1.4, 7.8           |
| Fowler · major   | M2 before M3 inverts effort vs evidence — neither reaches "tens of seconds"                                                            | **Accept in substance.** Goal restated honestly (§0); each move ships a measured ratio; M3 remains last because it reintroduces the F9 blind spot                                                                                                                                    | §0, §2                |
| Fowler · major   | Racing is premature vs cap + EP ordering; measure EP-ordering recall first                                                             | **Accept.** New M1.5 measurement; M2 go/no-go also reads it                                                                                                                                                                                                                          | §5a, §2               |
| Fowler · major   | Knobs in `contentHash` bake tuning into cache identity                                                                                 | **Accept, disclosed.** Invalidation accepted; per-sim rows survive                                                                                                                                                                                                                   | §6.1                  |
| Fowler · major   | Ordering by `repairAndMinimize` value needs repair hoisted; repair can fail                                                            | **Accept.** Ordering is pre-gem raw EP, never throws                                                                                                                                                                                                                                 | §5.1.3, 7.6           |
| Fowler · minor   | C and E both own `rank.ts`; D ports a `rank.ts` E is rewriting                                                                         | **Accept.** Sequenced; invariant restated as "parity at tip before merge ask"; 7.10 gates the tip                                                                                                                                                                                    | §2, §9.2              |
| Fowler · minor   | Parallel request builder drifts from upstream                                                                                          | **Accept.** Optional `iterations` param on `makeRaidSimRequest`                                                                                                                                                                                                                      | §6.3                  |
| Fowler · minor   | Screened rows must not interleave with full deltas                                                                                     | **Accept.** Ranked among themselves                                                                                                                                                                                                                                                  | §6.1, 7.7             |
| Fowler · nits    | set-sim "≤4" is a target; median vs min; `undefined` cap hash                                                                          | **Accept** all three                                                                                                                                                                                                                                                                 | F3, §3.1, 7.4a        |
| Dean · blocker   | Promotion rule uses independent SE (~6.8 DPS at 300 iters) — promotes everything; SE criterion for `screenIterations` can never be met | **Accept.** Rank-based promotion; SE criterion deleted; new §3.2 rank-correlation measurement with K\* sets defaults and go/no-go                                                                                                                                                    | §6.1, §3.2            |
| Dean · major     | E-W5 intercept conflates setup with presims                                                                                            | **Accept.** Presim status recorded first; `t_fixed` reported in two components                                                                                                                                                                                                       | F8, §3.1              |
| Dean · major     | Cost arithmetic loose; two incompatible cost models                                                                                    | **Accept.** One formula §1.1; p5 = 1.9×; split-vs-single-split stated                                                                                                                                                                                                                | §1.1                  |
| Dean · major     | Pool size = `workers` risks tab OOM; crash recoverability                                                                              | **Accept.** `min(workers, memoryCap)`, RSS measured in E-W5; cache write before next dispatch                                                                                                                                                                                        | §5.1.2, §3.1          |
| Dean · major     | Single-split loses tail and first-result latency                                                                                       | **Accept, adapter-scoped.** Split fallback when `candidates < concurrency`; crossover recorded by slice D                                                                                                                                                                            | §5.1.2                |
| Dean · minor     | Ratio has no denominator; F5 too weak; cache growth; error identity nondeterministic; E should be gated on B                           | **Accept** all: denominator pinned (§6.4); F5 relabelled and replaced by E-W5; screening rows for a session `MemoryStore` are bounded by the session — IndexedDB is out of scope (`plan.md` §2.5) so no retention policy yet; same-error assertion in 7.3; E gated on §3.2 go        | §6.4, F5, 7.3, §9.2   |
| Dean · Q1        | Use per-slot top-_j_ (j=3) ∪ global K; one-per-slot floor is not enough                                                                | **Reject for now — recorded disagreement.** Fowler and Beck both argue the opposite (add _j_ only when a recall failure names a slot). Global-K + floor + 7.2's held-out recall is the instrument that would surface starvation; if it does, per-slot _j_ is the fix. Carried to §10 |
| Dean · Q2        | After M2, cap must apply after screening or it is M3 by another name                                                                   | **Accept** — the sharpest point in the review. Cap applies to the promoted set post-M2; pre-M2 cap is disclosed as an EP preselection and M1.5 says whether a sub-"all" default is ever safe                                                                                         | §5.1.1                |
| Dean · Q3        | Stop is necessary infrastructure; exclude unsimmed rows from tie groups/cutoff                                                         | **Accept**                                                                                                                                                                                                                                                                           | §5.1.4, 7.8           |
| Beck · blocker   | 7.2 tunes and gates on the same fixture                                                                                                | **Accept.** Tune on ret/slamaltman; gate on feral; tuning fixture never gates                                                                                                                                                                                                        | §7 preamble           |
| Beck · blocker   | Nothing tests that racing does less work                                                                                               | **Accept.** 7.0 with `CountingSimRunner`, first to go red                                                                                                                                                                                                                            | 7.0                   |
| Beck · blocker   | Recorded screening fixtures couple the suite to `screenIterations`                                                                     | **Accept.** Derived-noise runner; one pinned real smoke recording                                                                                                                                                                                                                    | §7 preamble           |
| Beck · major     | "Zero misses" on one draw; top-5 severity                                                                                              | **Accept.** K noise draws; top-5 never screened out                                                                                                                                                                                                                                  | 7.2                   |
| Beck · major     | Stop untestable at the interface                                                                                                       | **Accept.** `Deps.signal: AbortSignal`; 7.8                                                                                                                                                                                                                                          | §5.1.4, 7.8           |
| Beck · major     | Anytime rendering has no seam                                                                                                          | **Accept.** Row-landed `Progress` event; 7.11                                                                                                                                                                                                                                        | §5.1.5, 7.11          |
| Beck · major     | 7.9 "fork unit" cannot run (F11)                                                                                                       | **Accept.** `promisePool` in core; fork is a call site                                                                                                                                                                                                                               | §5.1.2, 7.9           |
| Beck · major     | Test order unspecified; E blocked on numbers it does not need                                                                          | **Accept.** §7 ordered by red-first; defaults injected; E's code can start before §3.2 lands, but E's _merge_ waits for go                                                                                                                                                           | §7, §9.2              |
| Beck · minor     | 7.4 bundles two levels; 7.3 workers-1-vs-4 not runnable in core; 7.7 must name state; owned rows cut by cap                            | **Accept** all: 7.4a split (stop-cache moved to 7.8); pool injectable so 7.3 runs in core; screened = third state; owned exempt from cap + test                                                                                                                                      | 7.1, 7.3, 7.4a, 7.7   |
| Beck · Q1/Q2/Q3  | No per-slot _j_ yet; keep committed EP ordering; Stop honesty as assertions                                                            | **Accept** (Q2 note: ordering stays committed EP; Dean's cap-after-screening point is separate and accepted)                                                                                                                                                                         | —                     |

**Open disagreement carried forward:** per-slot promotion (Dean vs Fowler/Beck). Rule as shipped: global top-K + best-in-slot floor. Trigger to revisit: any 7.2 or M1.5 result naming a starved slot.

## 9. Orchestration

Lanes per `docs/agents/model-policy.md`: workhorse = Sonnet, review = Opus, design = Fable (this file only). The **execution orchestrator is an Opus session started by the human with this plan** — the top-level agent of its own session (`AGENTS.md` § Parallel agents); it names the model on every spawn and never backgrounds workers without a disk handoff. Handoffs under `.scratch/handoffs/wowsims-tab/candidate-pool/<slice>/HANDOFF.md`; in-flight state in `.../PROCESS.md`. Use the `parallel-phase` skill for the fan-outs; its disjointness rule is verified by listing files, not eyeballing.

### 9.1 Slices

| Slice | Content                                                                                                                                      | Lane         | Isolation                                                                                                                         | Depends on                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A     | M0 doc fixes + ticket 162 comment + ADR-0018 see-also                                                                                        | Sonnet       | this repo, worktree, branch `feat/candidate-pool`                                                                                 | —                                                          |
| B     | E-W5 §3.1 + §3.2 harnesses; numbers into §3.3; go/no-go line                                                                                 | Sonnet       | this repo, own worktree; owns `experiments/e-w5-*` and §3.3 of this file only                                                     | —                                                          |
| C     | M1 in `packages/core`: loop → `promisePool`, cap, ordering, `signal`/`complete`, row events, hash; tests 7.1, 7.3, 7.4a, 7.6, 7.8, 7.9, 7.11 | Sonnet       | this repo, own worktree; owns `packages/core/src/{rank,pool,hash,types,view}*`, `packages/core/test/*`, `package.json` if touched | —                                                          |
| B′    | M1.5 measurement (`experiments/m1-5-ep-recall.md`)                                                                                           | Sonnet       | this repo, own worktree; needs C's ordering function                                                                              | C merged                                                   |
| D     | M1 port to fork + adapter (`concurrency`, memoryCap, split fallback) + controls; `makeRaidSimRequest` iterations param                       | Sonnet       | fork clone, branch off its integration branch                                                                                     | C merged                                                   |
| E     | M2 in `packages/core`: rule, flow, `fullPool`, derived runner, held-out recall; tests 7.0, 7.5, 7.2, 7.7 ext                                 | Sonnet       | this repo, own worktree (same file set as C — **sequenced after C**)                                                              | C merged; code may start before B; **merge** needs §3.2 go |
| F     | M2 port to fork; 7.10 parity at tip                                                                                                          | Sonnet       | fork clone                                                                                                                        | D, E merged                                                |
| G     | Ticket 156 recipe rewrite + user measurement ask                                                                                             | orchestrator | ticket file                                                                                                                       | D merged                                                   |

Disjointness at partition: A → `plan.md`, tickets, ADR. B → `experiments/`, this file §3.3. C → `packages/core`. No file in two Round-1 slices. B′ and E both follow C and touch different files (`experiments/` vs `packages/core`). C and E share `packages/core` and are sequenced.

### 9.2 Sequencing

```
Round 1:  A ∥ B ∥ C
          └ orchestrator merges onto feat/candidate-pool; pnpm verify
Round 2:  D ∥ E(code) ∥ B′
          └ B′ + B §3.2 → go/no-go recorded in §3.3
          └ go: merge E; Opus review of D (port fidelity) inside the fork
          └ no-go: E is dropped, §6 marked not shipped, M3 → design pass; skip F's M2 half
Round 3:  F, then G
          └ pnpm verify; 7.10 parity green at tip; pre-merge-review skill on feat/candidate-pool
Gate:     execution review (§10) → REPORT.md → user decides on merge-to-dev
```

Budget each round at the boundary (~100k–240k tokens per worker).

### 9.3 Worker prompt contents

Base SHA from `git rev-parse HEAD`; slice goal; `pathsAllowed`/`pathsForbidden`; the F-table rows the slice depends on; the §7 rows it must turn red then green, in §7's order; the durable-claims rule from `AGENTS.md`; the handoff template from `parallel-phase`. Workers never merge to `dev`.

## 10. Execution review and final report

After Round 3 and before any merge ask, the orchestrator spawns three Opus reviewers over the branch diff (`git diff dev...feat/candidate-pool` plus the fork branch diff), one persona each, each reading its reference first:

| Persona           | Reference             | Focus                                                                                                                                  |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Linus             | `linus-reviewer.md`   | Patch discipline, commit hygiene, correctness of the promotion rule, hash and `complete` typing; anything that lies about what it does |
| perf (Gregg/Rice) | `perf-reviewer.md`    | Are the §6.4 and E-W5 numbers measured and reproducible by command? Observability of screen/promote/stop in progress and disclosure    |
| Carmack           | `carmack-reviewer.md` | The pool, request building, per-request overhead, wasted work in the racing flow, memory per worker                                    |

The orchestrator answers every finding in `docs/reviews/feat-candidate-pool.md` (per `pre-merge-review`) and then writes **`.scratch/handoffs/wowsims-tab/candidate-pool/REPORT.md`** for the plan author, containing:

1. What was executed per slice, with commit SHAs and the `pnpm verify` result on the tip.
2. E-W5 and M1.5 numbers, the go/no-go, and the defaults chosen — or that M2 was not shipped and why.
3. Test table §7 with pass/fail per row and the recall result on the held-out fixture.
4. Every deviation from this plan, with the reason.
5. **Open disagreements**: each finding where the orchestrator and a reviewer still disagree after the response — persona, finding, orchestrator's position, reviewer's position — verbatim, not summarised into agreement. Include §8.1's carried disagreement (per-slot promotion) with whatever evidence the run produced.
6. What the user must still do (156 measurement, merge decision).

The plan author reads REPORT.md and judges the outcome against this plan before the user is asked to merge.
