# Pre-merge review — fix/web-run-speed

Diffed against: our repo `64e07bf0..HEAD` (`64e07bf0` is `dev` when the pair
was made; the branch re-pins the fork three times, adds tests, opens ticket 893 and
adds this file), and the fork `82d0c5818..0a332e475` on fork branch
`fix/web-run-speed` (`82d0c5818` is the pin on `dev`). The fork diff touches
only the tab's files under `ui/features/upgrades/model/`; none of the eight
changed files exists on `upstream/master` (`24606be6b`; `git cat-file -e`
fails for each), so no upstream wowsims file changed.

What the branch is for: the orchestrator's brief of 2026-11-22, "Find out why
the Upgrades tab is so slow on the web build, and fix it, up to the owner's
merge ask. Do not merge.", after the owner's "idk. Seems pretty smelly and
iffy. Have a opus high subagent knock this out." The brief's evidence: feral
P3 from the Phase 2 "BiS 6%" preset took 239 s on desktop and 3987 s on web
with identical results, and the web counter sat at "Measuring set bonuses
663/699" for 523 s.

Reports (gitignored, in the pair's `.scratch/agent-reports/`): the reviews
`2026-11-22-general-task-web-speed-review-{adversarial,standards-spec}.md`
and the fix check `2026-11-22-general-task-web-speed-fix-check.md`; the
branch's summary is in the main checkout's
`.scratch/agent-reports/2026-11-22-general-task-web-run-speed.md`. Run
readbacks and scripts: the pair's `.scratch/wsp/` (gitignored).

## Why the web build is slow

- **One sim is about 5.8 times slower in WASM.** The feral baseline request
  at 3000 iterations, replayed outside the tab: native Go on one thread
  2.67 s; WASM under Node 15.5 s; the browser's own replication sims took
  about 15 s each. `wasm-opt -O3`, which upstream's deploy runs
  (`.github/workflows/deploy.yml:49-50` installs binaryen), gained about 3%.
- **Desktop splits each sim over every core; web gives each sim one
  worker.** The desktop server answers `/raidSimAsync` with
  `RunRaidSimConcurrentAsync` (`sim/web/main.go:132-133`,
  `sim/core/api.go:133`), which splits the iterations over
  `runtime.NumCPU()` (20 here, `sim/core/sim_concurrent.go:505`): 0.30 s for
  the same request. WASM runs `RunRaidSimAsync` on one thread
  (`sim/wasm/main.go:279`).
- **The tab runs 4 web workers, as wowsims does.** Upstream defaults to
  `min(4, floor(hardwareConcurrency / 2))` (`ui/sim/sim.ts:176`) and its bulk
  sim runs `Math.min(workerPool.getNumWorkers(), candidates.length)` sims at
  once (`ui/sim/wasm/bulk_sim/batch.ts:107`). The tab's
  `WorkerPoolSimRunner` uses the same default and honours the player's
  worker setting (`model/adapters/worker_pool_sim_runner.ts`,
  `workerCountFor`). Per "match wowsims, don't invent", unchanged.
- **The stall was ours.** The set screen, the set-bonus values, partner
  choice and paired replication sent their sims one at a time, so three of
  four workers sat idle: on the web run before the fix, the set stage was
  527 s at 1.02 sims in flight and replication 523 s at 1.00. The set stage
  also sends no progress events, so the counter stood at 663/699 (ticket
  893).

## What changed

- Fork `cb92de833`: independent sims go through `promisePool` at
  `Deps.concurrency`: the replication sims (`rank-replication.ts`), the set
  screen's sets (`set-screen.ts`, `set-phase.ts`), the set-bonus values per
  set (`set-bonus-values.ts`; a set's thresholds stay in order, as its 4pc
  reads its 2pc), and partner choice's close calls across every row and bonus
  (`set-bonus-gear.ts`; `partner-choice.ts` splits `choosePartners` into
  `closeCalls` and `pickClosest`; `sim-calls.ts` exports `DeltaSample`).
  Results, notes and queued requests are applied in the order the sims ran
  one at a time, and a gear two rows share is simmed once, as the store gave
  it before. The never-read `partnerSimFailure` is gone.
- Fork `70c257d17`: `run_progress.ts` refits the time left's set-stage and
  replication costs (below).
- Fork `0a332e475`: `oxfmt` puts one type alias in `set-bonus-gear.ts` on
  one line (the fork lint check in `pnpm verify` flagged it).
- Our repo: the lock re-pins and the regenerated effects file,
  `docs/fork-provenance/engine.md` (seven hashes and notes), the tests, ticket 893.

No player-facing text changed.

## Before and after

Same build base, same machine. The two web runs ran at the same time (each
its own browser, 4 workers each; about 8.6 busy cores), so each sim took
about 17.9 s against about 15 s alone. The two desktop runs ran one after
the other. Phases from each run's progress trace (`phases.py`).

| Run                          | Total    | Candidates | Set stage | Replication |
| ---------------------------- | -------- | ---------- | --------- | ----------- |
| web before (`w2-before`)     | 4639.8 s | 3559.9 s   | 527.1 s   | 537.7 s     |
| web after (`w2-after`)       | 3969.5 s | 3564.8 s   | 244.2 s   | 145.3 s     |
| desktop before (`d2-before`) | 558.2 s  | 478.6 s    | 47.5 s    | 29.3 s      |
| desktop after (`d2-after`)   | 525.2 s  | 494.1 s    | 15.0 s    | 13.6 s      |

Web saves 670 s (14%); desktop 33 s. Every run gave the same 646 rows, every
field equal, baseline 2448.7 (`rows-equal.py`, rc=0 for web before against
after, desktop before against after, and desktop after against web after).

What is left on web is the candidate loop: 789 sims at about 15 to 18 s each
over 4 workers. That is the WASM cost above, at wowsims' own worker count. A
player who raises the worker count in the site's settings gets more sims at
once, capped by cores and memory.

## Check output

`node --version` printed v22.23.2 in every shell.

- **New tests, red on the base engine** (fork engine files at
  `82d0c5818`): "runs the replication sims up to the runner's concurrency
  at once", "… set screen's sims …", "… set-bonus value sims …" and "…
  partner choice's sims …" each fail on their `Math.max` line (`expected 1
to be greater than 1`); green at the tip. The seven "same ranking at
  concurrency 4 as one sim at a time" scenarios pass at both.
- **K2, trace** (`.scratch/wsp/k2k3.sh`, five engine suites with
  `TBC_RANK_TRACE_DIR`, base engine against the tip, the new describe left
  out): `K2 diff rc=0 (0 bytes)`, 251 trace lines; K3 at the tip
  `Tests 258 passed (258)`.
- **Fork suite**: `npx vitest run ui/features/upgrades`, `Test Files 72
passed (72)`, `Tests 894 passed (894)`.
- **Drift**: `python3 scripts/check_engine_port_drift.py`, "ok: 51 ported
  files match engine.md".
- **`pnpm verify`**: see the push; the pre-push hook runs it on the final
  tree.

## Findings

Two reviewers, both `general-task` on Opus: adversarial (does running at once
change any output?) and standards and spec. Both found no output change; the
adversarial reviewer also scrambled the fake sims' finish order and ran the
store-fault suite at concurrency 4 (4 of 4).

- **F1** (both): the time left still priced a replication sim at its
  one-at-a-time cost (`replicationSimCost` 1.2884 at any concurrency).
- **A2 / S3** (adversarial F2, standards F3): the fake sim answered in start
  order and no scenario had a failing sim, so a note-order bug at concurrency
  4 would pass; a mutant of `set-bonus-values.ts` that writes notes in finish
  order passed all tests.
- **S2** (standards): the partner-choice test found 5 of its 10 sims by
  stack name, because V8 rebuilds only part of an async stack.
- **S4** (standards): a test comment cited a gitignored report.
- **S5** (standards): five `engine.md` notes followed text with no full stop.

## Disposition

| ID    | Axis      | Disposition | Ticket / note                                                                                                                                                                                                                                                         |
| ----- | --------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1    | Both      | fixed       | Fork `70c257d17` refits both costs on `w2-after`: `setBonusStageCandidates` 45.34, `replicationSimCost` 0.75 (desktop `d2-after` measured 20.1 and 0.505). Test "ships the constants fitted on the web feral run of 2026-11-22", red at `cb92de833`, green at the tip |
| A2/S3 | Both      | fixed       | The fake answers after a varying delay; scenario "three sets, two sets' sims failing" makes one set finish last. Red with the finish-order mutant (`.scratch/wsp/mutant-notes.py`), green without it (fix check report)                                               |
| S2    | Standards | fixed       | The test matches `choosePartnerGears` or `simCloseCall`: 10 of 10 sims found; red at the base engine on its `Math.max` line, green at the tip                                                                                                                         |
| S4    | Standards | fixed       | The comment cites this file                                                                                                                                                                                                                                           |
| S5    | Standards | fixed       | Full stops added; `prettier --write` on the file                                                                                                                                                                                                                      |

## Notes

- **Idle pool slots** (adversarial N4): partner choice's per-bonus step holds
  a pool slot while it waits for its own sims, so those sims peak at 3 in
  flight (web: about 13 sims, about 15 s lost). Freeing the slot would move
  a stats read relative to later sims at concurrency 1 and change the trace;
  not worth it for 15 s.
- **`promise-pool.ts` starting tasks in order** (adversarial N3): partner
  choice relies on it, and its header does not say so. The file is a ported
  file with no divergence from core, so the reliance is written at the call
  site in `set-bonus-gear.ts`.
- **A shared gear whose sim fails** (adversarial N1, N2): rows waiting on it
  sim it again, as one at a time would; a duplicate gear skips the store
  read, so a store fault on only that read is not seen.
- **Store faults surface after running set tasks finish** (adversarial N5);
  Stop is not affected.
- **The set stage's counter and time left stand still**: ticket 893. Now
  about 4 minutes on web, 15 s on desktop.
- **Desktop runs 4 requests at once**, each split over every core, where
  wowsims' own page uses one (`ui/sim/sim.ts:163-166`, "Local sim has native
  threading"). Not changed here; desktop got faster, not slower.
- **Background tickets**: 156 (browser WASM throughput) measured 14.7 s for
  5000 iterations under Node, in line with the 15.5 s above at 3000 for this
  heavier feral request (hypothesis, untested which request 156 used); 397
  concerns the bulk path, deleted since (ticket 518).
- **The lock says `pushed: false`.** The merging agent sets it after the
  merge (`docs/agents/paired-worktrees.md` § Land it on dev).
- **Sandbox workarounds used**, not product changes: GOFLAGS unset for
  `pnpm verify`; main-repo commits made through the T3 thread "web-speed:
  pair commits"; desktop runs served the built `dist/` with `--usefs`.
