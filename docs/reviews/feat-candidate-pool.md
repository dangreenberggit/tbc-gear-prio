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

## Disposition summary

12 fixed, 4 deferred to tickets 200–202 plus 3 wontfix with reasons. No
blocker remains open. The two Linus blockers are resolved in both engine
copies.
