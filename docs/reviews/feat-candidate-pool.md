# Pre-merge review — feat/candidate-pool

Reviewed range: `baa6821..b52fd51` (39 commits, 40 files) plus the fork-side
diff `655b3c36f..6a192eb2a` in `vendor/tbc-new-fork` (a nested, gitignored
clone; pinned by `data/wowsims-fork.lock.json`, `pushed: false`).

Plan: [`docs/plans/wowsims-tab/candidate-pool.md`](../plans/wowsims-tab/candidate-pool.md).
Ticket: `.scratch/carry-forward/issues/199-tab-candidate-pool-is-not-prefiltered.md`.

Three axes per plan §10, one persona each, Opus, each reading its reference
under `~/.claude/skills/review/references/` before the diff:

| Persona           | Focus                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| Linus             | Patch discipline, hygiene, hash and `complete` typing, anything that lies |
| perf (Gregg/Rice) | Are the E-W5 numbers measured and reproducible by command?                |
| Carmack           | Pool, request building, per-request overhead, memory per worker           |

`pnpm verify` exits 0 on `b52fd51`, confirmed by capturing the exit code
directly rather than reading a wrapper's status (see R11).

## What shipped, and what did not

**Shipped (M0 + M1):** documents corrected to match the engine; a candidate
cap; candidate-level concurrency via a `promisePool`; pre-gem EP ordering;
Stop returning a `PartialRanking`; row-landed progress; the fork port of all
of it plus Candidates and Stop controls.

**Not shipped (M2):** racing was cancelled by its own gate. E-W5 §3.2 measured
`cost(100)/cost(5000) = 0.609` on the tuning fixture against a `< 0.25`
requirement. The mechanism is in §3.1: `t_fixed` = 373.2 ms dominates
`t_iter` = 0.0637 ms/iteration, so a low-iteration screen avoids almost
nothing. The floor as iterations → 0 is `t_fixed/cost(5000)` = 0.540, so **no
`screenIterations` could pass that gate on this path** — a stronger statement
than the gate required. M3 goes to a fresh design pass per §2.

**Cap defaults to all eligible**, because M1.5 measured the worst above-cutoff
EP-ordering rank at 114/246 (ret) and 96/246 (feral). EP orders well
(Spearman ≥ 0.97) and predicts cap membership badly — a question it had never
been validated against.

## Findings and disposition

| ID  | Axis    | Sev     | Finding                                                                                                                                                                                                                                                                | Disposition                                                                                                     |
| --- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| R1  | Linus   | blocker | `complete: true` docblock and commit `34ae844` claimed the ranking cache "can accept `PartialRanking` nowhere by construction". False: `rankingCacheKey` takes a `string` and `Store.put<T>` is generic. The `if (aborted) return partial` branch is what enforces it. | **fixed** `b52fd51`, both copies                                                                                |
| R2  | Linus   | blocker | An aborted run re-added sim-crashed candidates as `simmed: false` rows, so one ranking said an item was both dropped for a sim failure and never reached by Stop                                                                                                       | **fixed** `b52fd51`, test red first                                                                             |
| R3  | Linus   | major   | `promisePool` rethrew the first error by wall-clock time, not index, so the surfaced error depended on pool size and sim latency — the opposite of 7.3's advertised guarantee                                                                                          | **fixed** `b52fd51`                                                                                             |
| R4  | Linus   | major   | Test 7.3 could not detect R3: its sim threw one identical error from every call, so any winner looked the same                                                                                                                                                         | **fixed** `b52fd51` — new pool tests with distinguishable errors                                                |
| R5  | Linus   | major   | Nine `as never` casts on M1 test deps disabled checking on exactly the fields this branch added; `concurency` compiled clean                                                                                                                                           | **fixed** `b52fd51`, verified by reintroducing the typo (TS2561)                                                |
| R6  | Carmack | major   | `promisePool` with a non-finite `n` spawned zero workers, ran nothing, and returned success                                                                                                                                                                            | **fixed** `b52fd51` + test                                                                                      |
| R7  | perf    | major   | `node scripts/ew5_rank.mjs` — the published command for the branch's central claim — fails with `ERR_MODULE_NOT_FOUND`; wrong in five places                                                                                                                           | **fixed** `16ef233`, generators too                                                                             |
| R8  | perf    | major   | `ew5_rank.mjs` hardcodes a gitignored, win32-only binary with no fetch pointer (AGENTS.md durable-claims)                                                                                                                                                              | **fixed** `16ef233`                                                                                             |
| R9  | Carmack | major   | **CLI passes no `concurrency`**, so `rank.ts` defaults to 1 and the branch ships zero throughput change on the only measured path                                                                                                                                      | **defer** → ticket 200                                                                                          |
| R10 | Carmack | major   | `memoryCapFromDeviceMemory` returns 4 on every browser anyone will use; `navigator.deviceMemory` is spec-capped at 8 and the cap never binds                                                                                                                           | **defer** → ticket 201                                                                                          |
| R11 | perf    | minor   | 183.8 MB RSS is a native CLI process reused to size browser WASM workers; caveat existed only in fork source                                                                                                                                                           | **fixed** `16ef233`                                                                                             |
| R12 | perf    | minor   | M1.5 never stated it inherits §3.2's single-seed runs, so above-cutoff membership is noise-sensitive near the cutoff                                                                                                                                                   | **fixed** `16ef233`                                                                                             |
| R13 | perf    | minor   | Partial and complete rankings carry byte-identical `substitutions`/`assumptions`; the replication-skipped disclosure exists only as a fork i18n string                                                                                                                 | **defer** → ticket 202                                                                                          |
| R14 | Carmack | minor   | `orderCandidatesByEp` recomputes `bestEpDelta` inside the sort comparator, ~16× more work than a decorate-sort-undecorate                                                                                                                                              | **wontfix** — microseconds against a 141 s run; revisit only if ordering becomes hot                            |
| R15 | Carmack | minor   | `makeRaidSimRequest`'s `iterations` param is dead code, its consumer cancelled                                                                                                                                                                                         | **wontfix** — one optional param, comment already says so; it is the shape any future per-request control needs |
| R16 | Linus   | minor   | `contentHash` collides "5 eligible, cap 2" with "2 eligible, no cap"                                                                                                                                                                                                   | **wontfix** — correct behaviour: same candidate list, same sims, same result, so sharing a cache row is right   |

### Notes on the deferred four

**R9 is the most consequential finding in this review.** The branch exists to
bound wall-clock. On the CLI path — the only path with measured numbers — it
changes wall-clock by nothing, because `cli.ts` never sets `concurrency` and
`rank.ts:986` defaults to 1. The pool is a `for` loop with extra allocation
there. Plan §5.2 pre-authorised `CLI: 1`, but that line was written _before_
E-W5 proved `t_fixed` dominates, which is exactly the condition under which
parallel processes are the whole win. Deferred rather than fixed here because
it widens scope the plan explicitly assigned away, and because shipping it
honestly requires a measured before/after ratio, not just the four-line
change. **No before/after concurrency timing exists anywhere in this branch** —
§5.3 asked only for byte-identical output at 1 vs 4, and got it.

**R10** is behaviourally correct today (it returns 4, the right answer) and its
hypothesis flagging satisfies the durable-claims rule. The objection is that it
dresses a guess as arithmetic, so a future reader trusts the calculation.

**R13** is a structural, not user-facing, gap: the fork UI _does_ disclose the
skipped replication ("Stopped early… replication and set-completion packages
were not run"), and a stopped run bypasses `applyView` entirely rather than
rendering a pretend-complete view. But the disclosure rides an i18n string in
one renderer instead of the `Ranking` object, so any second consumer inherits
a partial that looks complete.

### Carried disagreement, now with evidence

§8.1 recorded Dean (per-slot promotion) against Fowler and Beck (defer until a
measurement names a starved slot), with that measurement as the explicit
trigger. **M1.5 fired it.** Above-cutoff misses cluster by slot: on ret, all
six worst-ranked upgrades are cloaks (ranks 94–114); on feral the tail is
belts and necks. Counting rows beyond the _j_-th of their own slot: _j_=3
misses 5 on ret, _j_=5 misses 1, **_j_=10 misses none on either fixture** —
where a global cap needs ~114. Recorded in §8.1 (`007c50a`) as evidence for
Dean, with two limits: it was measured for cap membership rather than M2
promotion, and _j_=10 is fit on the same two fixtures it is judged against. A
supported hypothesis, not a validated default. It belongs to the M3 design
pass.

### What the axes credited

All three independently credited the measurement discipline: E-W5 killed a
milestone with numbers rather than intuition, caught its own harness bug (a
50 ms RSS poller inflating wall-clock 2–40×) and re-ran, and §3.3 explains the
mechanism rather than only reporting a verdict. The perf axis recomputed the
whole chain and reproduced `t_fixed` = 373.161 ms and `t_iter` = 0.063693
exactly, plus all ten cost ratios and the 0.5395 floor.

## Orchestrator self-report

Two things this review caught that the orchestrator had asserted:

1. **R1 is partly the orchestrator's error.** The "structurally cannot accept a
   partial" claim was repeated in a merge commit message and in progress
   summaries after checking only that `Ranking.complete` is a literal — without
   checking `Store.put`'s signature. The type does real work at `applyView` and
   `cli.ts`; it does not work at the cache. Corrected in code and here.
2. A backgrounded `pnpm verify` reported `[exited with code 0]` while its own
   log ended in `ELIFECYCLE … exit code 1`. The wrapper's status is not the
   command's. Every verify claim in this file comes from capturing `$?`
   directly.

## Verification

- `pnpm verify` → exit 0 on `b52fd51` (`$?` captured, not inferred).
- `packages/core/test/rank.test.ts` → 76 passed, including the two new Stop
  boundary tests.
- `packages/core/test/promise-pool.test.ts` → 6 passed.
- E-W3 fork parity (`wowsims-fork-parity.test.ts`) → passed, re-run after the
  fork fixes and **before** the PROVENANCE hashes were updated, per
  `check_engine_port_drift.py`'s own instruction.
- `pnpm engine-port-drift:check` → 32 ported files match.

## Fix round — second three-axis review (2026-08-15)

After the plan author's §3.4 judgment, a fix round ran: ticket 203 (WASM
sweep, which **resumed M2**), ticket 200 (CLI `--concurrency`), ticket 204
(synthetic fixtures), slice E (M2 in core) and slice F (M2 ported to the
fork). The same three personas re-reviewed **the new diff only** —
`7e2ffad..HEAD` plus the fork's `6a192eb2a..138fa77f5`.

**Two NACKs, both earned.** Linus found three blockers; Carmack found one the
whole branch had missed.

### The finding that mattered most

**Racing shipped enabled on the runtime it was proven not to pay for.** §3.2
declared M2 no-go on the CLI; §3.4.1 resumed it for the browser. But `rank.ts`
gates racing on `fullPool` alone and `cli.ts` never set it, so the CLI raced by
default. The Carmack axis did the sum nobody had done, and it reproduces: 277
screening sims plus 169 full sims costs **237.9 s** against **191.6 s** for the
old flow — **1.24× slower**. Break-even on the CLI needs a promoted ratio under
0.368; it measures 0.704. Fixed by `cli.ts` passing `fullPool: true`, with the
per-runtime reasoning recorded at the call site.

That sum also prices the feature honestly: **racing saves ~15% on WASM and
loses ~24% on the CLI**, not the ~2.5× the ≤0.4 ratio target implied.
`experiments/m2-net-win-arithmetic.md` carries it.

### An objection tested and refuted

Linus suspected §6.4's "the ratio target is unreachable" might be measuring an
over-broad `setPackageItemIds` filter (it promotes _every_ item with a set id,
not the packages `selectPackage` sims) rather than a real recall constraint.
Good objection, and testable. Instrumented and measured: of 160 promoted rows,
**150 come from the global top-K** and 10 from everything else combined, with
the set clause solely responsible for 6. Deleting it outright moves the ratio
from 0.704 to about 0.68 against a 0.4 target. **The conclusion survives**; the
clause is still over-broad and worth tightening on its own merits.

### Fix-round findings

| ID  | Axis    | Sev     | Finding                                                                                                                                    | Disposition                                           |
| --- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| F1  | Carmack | blocker | CLI raced by default and was 24% slower for it; §3.2 had already ruled racing no-go on that runtime                                        | **fixed** `6a47776`                                   |
| F2  | Linus   | blocker | Best-in-slot floor promoted a slot whose every candidate screened at `-Infinity`; the doc comment claimed it could not                     | **fixed** `452cc35`, both copies, test red first      |
| F3  | Linus   | blocker | `-Infinity` could reach a screened row; `JSON.stringify` writes it as `null`, the sort comparator returns `NaN`, and 7.3's guarantee voids | **fixed** `452cc35`, both copies                      |
| F4  | Linus   | blocker | §6.4's tension might be an artifact of the over-broad set-package filter                                                                   | **investigated, refuted** `d7726a9`                   |
| F5  | perf    | major   | `t_fixed` 748.4 ms is an extrapolated intercept (RMSE 477.7 ms = 64% of it); the go verdict is robust, the number is not precise           | **defer** → ticket 207                                |
| F6  | perf    | major   | The harness docstring promises a boot-vs-call split that does not exist, and the timer starts after boot                                   | **defer** → ticket 207                                |
| F7  | Carmack | major   | Screening discards the winning slot (~13% of WASM wall-clock) and the measured `stdev`, shipping `se: 0`                                   | **defer** → ticket 205                                |
| F8  | perf    | major   | ~240 screening sims — roughly 13 minutes on WASM — emit no progress events at all                                                          | **defer** → ticket 206                                |
| F9  | perf    | major   | §6.4 never states that the K=120 zero-miss floor still lands near 0.58, so ≤0.4 is unreachable at any K passing recall                     | **fixed** `d7726a9`                                   |
| F10 | perf    | major   | Ticket 200's "why 1.88× not 4×" mechanism is inconsistent with its own numbers and stated as fact                                          | **fixed** — relabelled in the ticket                  |
| F11 | perf    | major   | The 1.88× ratio is n=1 per arm against the ticket's own criterion of three runs                                                            | **fixed** — relabelled as a single-sample observation |
| F12 | Linus   | major   | `fullPool: true` is claimed byte-for-byte but asserted by two weak proxies; the hash payload changed, orphaning old cache entries          | **defer** → ticket 205                                |
| F13 | Linus   | major   | Screened rows are unconditionally `belowCutoffInView: true`, so `belowCutoffCount` collapses the third state back into "below cutoff"      | **defer** → ticket 206                                |
| F14 | Carmack | major   | `MEASURED_MB_PER_SIM_PROCESS = 183.8` is stale against the measured 402.7 MB and its doc comment is now false                              | **defer** → ticket 201                                |
| F15 | Linus   | major   | `screenIterations = 1000`'s justification is contradicted by its own figures — both 300 and 1000 land at K≈150                             | **defer** → ticket 207                                |
| F16 | Carmack | minor   | `--concurrency` has no upper bound; `--concurrency 200` requests ~36.8 GB                                                                  | **defer** → ticket 205                                |
| F17 | perf    | minor   | `measure-racing-ratio.ts` reads a gitignored gear file with no "Requires:" note                                                            | **defer** → ticket 207                                |
| F18 | perf    | minor   | `e-w5-overhead-wasm.md` calls 402.7 MB "the measured browser number" — it is Node-hosted WASM                                              | **defer** → ticket 201                                |
| F19 | Linus   | minor   | Hash normalizes `fullPool` in two layers; one is dead belt-and-braces                                                                      | **wontfix** — redundant, not wrong                    |
| F20 | Linus   | nit     | `Math.max(0, promoteTopK)` accepts a negative K; `promotionRule` returns an array every caller converts to a Set                           | **wontfix** — no live caller reaches either           |

### What the axes credited

All three credited the measurement discipline again, and specifically: that
0.7042 was reported as a **failed** target rather than the target being moved,
which is the only reason the net-win arithmetic was possible at all; that slice
F rejected a false premise in its own brief rather than implementing a no-op;
and that the screened / below-cutoff / ranked three-state model is carefully
drawn. The perf axis reproduced the fit, the floor and the ratio exactly from
published commands, and confirmed the previous round's reproducibility
regression was fixed properly rather than patched.

### Orchestrator self-report, fix round

- **F1 is partly mine.** I wrote §3.4.1 recording that M2 resumes "on the
  browser path" and did not check that the code had any way to distinguish
  runtimes. It did not; `fullPool` is one global switch and the CLI never set
  it.
- **My §3.4.1 defaults were structurally impossible.** I proposed
  `promoteTopK = 35` from a fixture with 16 above-cutoff rows; the gating
  fixture has 42 at contiguous ranks, so no K below 42 could ever pass. Slice E
  caught it.
- **My first net-win sum used 240 screens where the real count is 277** —
  paired slots screen twice. Carmack's figure is the accurate one; mine
  understated racing's cost.

## Disposition

| ID  | Finding                                                              | Disposition | Note                                                                                 |
| --- | -------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| R1  | `complete` cache claim false — `Store.put<T>` is generic             | fixed       | `b52fd51`, both engine copies                                                        |
| R2  | Aborted run duplicated sim-crashed candidates as unsimmed rows       | fixed       | `b52fd51`, test red first                                                            |
| R3  | `promisePool` first error by time, not index                         | fixed       | `b52fd51`                                                                            |
| R4  | Test 7.3 could not detect R3                                         | fixed       | `b52fd51`, distinguishable errors                                                    |
| R5  | Nine `as never` casts voided checking on the new `Deps` fields       | fixed       | `b52fd51`, typo now TS2561                                                           |
| R6  | `promisePool` non-finite `n` ran nothing and returned success        | fixed       | `b52fd51` + test                                                                     |
| R7  | Published `node scripts/ew5_rank.mjs` does not run                   | fixed       | `16ef233`, five places                                                               |
| R8  | `ew5_rank.mjs` names a gitignored binary with no fetch pointer       | fixed       | `16ef233`                                                                            |
| R9  | CLI sets no concurrency; zero throughput change on the measured path | fixed       | Ticket 200 closed this round: --concurrency default 4, measured 1.88x                |
| R10 | `memoryCapFromDeviceMemory` is a constant wearing a calculation      | defer       | `.scratch/carry-forward/issues/201-memorycap-is-a-constant-wearing-a-calculation.md` |
| R11 | CLI RSS reused for browser sizing without the caveat                 | fixed       | `16ef233`                                                                            |
| R12 | M1.5's single-seed provenance undisclosed                            | fixed       | `16ef233`                                                                            |
| R13 | A `PartialRanking` carries no disclosure in its own data             | defer       | `.scratch/carry-forward/issues/202-partial-ranking-carries-no-disclosure.md`         |
| R14 | `orderCandidatesByEp` recomputes keys in the comparator              | wontfix     | Microseconds against a 141 s run; revisit only if ordering becomes hot               |
| R15 | `makeRaidSimRequest`'s `iterations` param is dead                    | wontfix     | One optional param; the shape any future per-request control needs                   |
| R16 | `contentHash` collides capped and uncapped equivalents               | wontfix     | Correct: same candidate list, same sims, same result                                 |
| F1  | CLI raced by default, 24% slower                                     | fixed       | `6a47776`                                                                            |
| F2  | Best-in-slot promoted an all-failed slot                             | fixed       | `452cc35`, both copies                                                               |
| F3  | Non-finite delta reached a row and serializes to null                | fixed       | `452cc35`, both copies                                                               |
| F4  | Set-package filter suspected of driving the ratio                    | fixed       | `d7726a9` measured and refuted                                                       |
| F5  | t_fixed published as precise but extrapolated                        | defer       | `.scratch/carry-forward/issues/207-tfixed-is-an-extrapolated-intercept.md`           |
| F6  | Harness docstring describes a split that does not exist              | defer       | `.scratch/carry-forward/issues/207-tfixed-is-an-extrapolated-intercept.md`           |
| F7  | Screening discards winning slot and stdev                            | defer       | `.scratch/carry-forward/issues/205-racing-reuses-nothing-from-the-screen.md`         |
| F8  | Screening emits no progress for ~13 minutes                          | defer       | `.scratch/carry-forward/issues/206-screening-emits-no-progress.md`                   |
| F9  | 6.4 understates that 0.4 is unreachable at any K                     | fixed       | `d7726a9`                                                                            |
| F10 | Ticket 200 speedup mechanism unsupported                             | fixed       | relabelled in ticket 200                                                             |
| F11 | 1.88x is n=1 against a 3-run criterion                               | fixed       | relabelled in ticket 200                                                             |
| F12 | fullPool byte-for-byte claim not actually asserted                   | defer       | `.scratch/carry-forward/issues/205-racing-reuses-nothing-from-the-screen.md`         |
| F13 | belowCutoffCount counts screened rows                                | defer       | `.scratch/carry-forward/issues/206-screening-emits-no-progress.md`                   |
| F14 | MEASURED_MB_PER_SIM_PROCESS stale at 183.8                           | defer       | `.scratch/carry-forward/issues/201-memorycap-is-a-constant-wearing-a-calculation.md` |
| F15 | screenIterations justification self-contradictory                    | defer       | `.scratch/carry-forward/issues/207-tfixed-is-an-extrapolated-intercept.md`           |
| F16 | concurrency flag unbounded above                                     | defer       | `.scratch/carry-forward/issues/205-racing-reuses-nothing-from-the-screen.md`         |
| F17 | Ratio harness hides a gitignored input                               | defer       | `.scratch/carry-forward/issues/207-tfixed-is-an-extrapolated-intercept.md`           |
| F18 | 402.7 MB called the measured browser number                          | defer       | `.scratch/carry-forward/issues/201-memorycap-is-a-constant-wearing-a-calculation.md` |
| F19 | Hash normalizes fullPool twice                                       | wontfix     | Redundant, not wrong                                                                 |
| F20 | Negative K accepted; array-then-Set                                  | wontfix     | No live caller reaches either                                                        |

12 fixed, 3 deferred to tickets 200–202, 3 wontfix with reasons. No blocker
remains open; both Linus blockers are resolved in both engine copies.
