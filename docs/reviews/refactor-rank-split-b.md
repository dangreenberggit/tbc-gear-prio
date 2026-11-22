# Pre-merge review — refactor/rank-split-b

Diffed against: our repo `3635b122..HEAD` (`3635b122` is `dev` when the pair
was made; the branch adds nine re-pins `ffea5bf6` to `c673a436`, the review
re-pin, and this file), and the fork `bbe89a565..04bf9faf8` on fork branch
`refactor/rank-split-b` (`bbe89a565` is the pin on `dev`). The fork diff
touches only the tab's engine files under `ui/features/upgrades/model/engine/`;
`upstream/master` has no `ui/features/upgrades`, so no upstream wowsims file
changed.

What the branch is for: Phase B of the readability plan
(`.scratch/agent-reports/2026-11-21-design-task-upgrades-readability-plan.md`,
gitignored; finish-line plan `.scratch/plans/upgrades-tab-finish-line.md`,
Chunk 7). It breaks `rankUpgrades`, `buildSetBonuses`, `measureBonusGear` and
`applySetContext` into named steps, with no behaviour change.

The owner's words (2026-11-21), from the plan: "I want it to be more
digestible, more readable, extracted functions where it makes sense in an
organized manner and a more manageable level of modularity", and "We don't
need to have a \"one function one thing\" extreme approach".

Reports (gitignored, in the main checkout's `.scratch/agent-reports/`): the
chunks `2026-11-21-general-task-rank-split-b{1..9}.md`; the phase summary
`2026-11-21-general-task-rank-split-phase-b.md`; the three reviews
`2026-11-22-general-task-rank-split-b-review-{adversarial,domain,standards-spec}.md`;
the fixes `2026-11-22-general-task-rank-split-b-review-fixes.md`; this
review's summary `2026-11-22-general-task-rank-split-phase-b-review.md`.

## Sizes

| Function                                 | After Phase A          | Now               |
| ---------------------------------------- | ---------------------- | ----------------- |
| `rankUpgrades`                           | 955 (run nested in it) | 100 (setup steps) |
| `runRanking` (was `rankAfterJobCreated`) | about 655, nested      | 61                |
| `buildSetBonuses`                        | 742                    | 55                |
| `measureBonusGear`                       | 429                    | 47                |
| `applySetContext`                        | 185                    | 54                |

Still over about 80 lines, each one job read top to bottom: `rankUpgrades`
100, `runSetPhase` 97 (now in `set-phase.ts`), `bestSwapFor` 93 and
`runCandidates` 89 (`rank-candidates.ts`), `rankingContentHash` 80 (the
cache key block, unedited by the plan's rule), `choosePartnersFor` 80.
Files over 400 lines: `set-phase.ts` 422, `set-bonus-values.ts` 500 (the
plan puts the whole per-set loop there), and `rank-types.ts` 467 (untouched). `rank.ts` is 413 lines, down from 1,070.

## Check output

`node --version` printed v22.23.2 in every shell. Logs in the main checkout's
`.scratch/rank-split/logs/`.

- **K1, move check** (`decls-same.cjs`), the review fixes against
  `bbcfc965f` (`b-rev-k1.txt`): `86 unchanged (1 moved file), 0 changed, 0
gone, 0 new, 0 duplicated, 22 allowed`, rc=0. The moved declaration is
  `runSetPhase`, unchanged. Per chunk B1 to B9: rc=0 each (phase summary,
  § Checks per chunk).
- **K2, trace** (five engine suites, 251 `rankUpgrades` calls): `diff -r
trace/b0 trace/b9-check` 0 bytes for the phase; the fixes `diff -r
trace/b9-check trace/b-rev` 0 bytes, and the caller's own rerun
  `trace/b-rev-check` 0 bytes (`b-rev-mycheck-k6.log`, `Tests 246 passed (246)`).
- **K3, engine suites**: `Test Files 5 passed (5)`, `Tests 246 passed (246)`
  at every chunk and after the fixes (`b-rev-k2k3k4.out`, 3m20s).
- **K4, fork**: `npm run type-check` rc=0; `oxlint --deny-warnings
ui/features/upgrades ui/app/tabs/UpgradesTabBody.tsx` rc=0; `oxfmt --check`
  rc=0; fork vitest `Test Files 341 passed (341)`, `Tests 2862 passed
(2862)`; `test-locales.mjs` valid.
- **K5**: `pnpm verify` printed `gates: 1750 ran, 0 skipped`, rc=0, at every
  chunk and after the fixes (`b-rev-verify.log`). Engine port drift check
  (domain reviewer, at `c673a436`): `engine port drift check ok: 50 ported
files match engine.md`.
- **K6, live tab** (`k6.sh`, vite dev serving the pair's fork on :5181, the
  pair's backend on :3333; `k6-compare.cjs`, which leaves out `durationMs`):
  ret P3 from the P2 preset (889 rows) and warlock P3 from the T5 preset.
  Before is `k6/b-before/` at `bbe89a565`. At `bbcfc965f` (`k6/b-after/`):
  `k6: Ranking equal`, rc=0, for both. At `04bf9faf8` (`k6/b-rev-after/`):
  `k6: Ranking equal`, rc=0, for both (`b-rev-mycheck-k6.log`). Feral could not be recorded in the sandbox: its preset loads other
  gear ("gear not loaded", 10 of 16 items missing), as in Phase A.
- **Extended trace** (adversarial reviewer, `bbe89a565` against
  `bbcfc965f`, scripts in its scratchpad): ranking, every sim call, every
  store call, every progress event and every console argument compared.
  The five suites, 251 calls, 0 differing fields. A store fault at each read
  or write 1–145, a sim fault at each sim 1–66, a stats fault 1–3, and a
  Stop at each sim 1–67, on a 7-item and a 12-item pool: 563 calls, 0
  differing fields. Concurrency 1, 2 and 4: 39 calls; at 2 and 4 only the
  order of store calls differs (Notes).

## Findings

Three reviewers: adversarial, domain, standards and spec. None found a
behaviour change. All findings are low: comments, names and organisation.

- **A1** (adversarial): `rank.ts:280-284` said `runSetPhase` "After a Stop
  ... runs no sim and gives the empty set phase"; a Stop during
  `buildSetBonuses` still runs `applySetContext` and returns the partial
  phase, which `dropSetFigures` then empties.
- **D1** (domain): `set-bonus-values.ts:180` called the `isBonusImplemented`
  table "a bonus the sim lacks"; the table says no for Justicar 2pc, which
  the sim implements (`sim/paladin/item_sets.go:11,17-18`).
- **D2** (domain): `set-bonus-values.ts:73-74` said a set with no count to
  measure goes in `setIdsNotValued`; false when `measureSetBonuses` is off
  and 4+ pieces are worn (the tab always turns it on, `model/run.ts:128`).
- **D3** (domain): the `hit-budget.ts` row in `docs/fork-provenance/engine.md`
  said the talents read moved out of `rank.ts`; it came from `rank-setup.ts`.
- **D4** (domain): `set-bonus-gear.ts:268-269` said a bonus with no choice
  gets a line; it gets none (`partner-choice.ts:164`).
- **S1** (standards): `measurePairTwoPiece` took 12 positional parameters,
  nine of them unpacked from `ctx` by its one caller; `setBonusCountsInReach`
  7 and `measureWornSets` 6, the same way.
- **S2** (standards; also a domain note): four comments pointed at code
  Phase B moved ("the loop below" at `set-phase.ts:188`, `:202`; "the
  same-gear check below" at `set-reach.ts:112`; `runCandidate` at
  `hit-budget.ts:22`).
- **S3** (standards): `SetPhaseResult` was unused while two signatures spelt
  the same type the long way.
- **S4** (standards): `ctx` meant `SetPhaseContext` in four files but a row's
  `SetContext` in `PartnerRow.ctx`; `at` meant a set and count in one file
  and the sim bundle in `sim-calls.ts:91`.
- **S5** (standards): the cached sample runner's type was written out four
  times; `runCached` returns a runner rather than running one.
- **S6** (standards; open item from the phase summary): `bonusNotMeasured`
  existed twice, `set-reach.ts:207-208` and `set-bonus-values.ts:459`.
- **S7** (standards): the broken-bonus map was `brokenDpsByKey` in three
  files and `brokenBonusDpsByKey` in the types.
- **S8** (standards): exported `readHitCap` called its hit pseudo-stat
  parameter `slot`.
- **S9** (standards): `measureCrossingChecks` kept an `if
(measureSetBonuses)` wrapper only to keep its body word for word; 86 lines.
- **P1** (spec): `runSetPhase` and `SetPhaseOutcome` stayed in `rank.ts`
  after B8, where B5 had parked them; two functions each called themselves
  "the set phase", and `rank.ts` was 523 lines against the plan's ~350.
- **P2** (spec, known): the lock says `pushed: false` though the fork
  commits are pushed.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | Fork `04bf9faf8`: `runSetPhase`'s doc says only a Stop before the phase gives the empty phase; a Stop during it returns the partial phase, which `dropSetFigures` empties. K2 0 bytes                                                                        |
| D1  | Domain      | fixed       | Fork `04bf9faf8`: `set-bonus-values.ts:179-181` names the `isBonusImplemented` table                                                                                                                                                                         |
| D2  | Domain      | fixed       | Fork `04bf9faf8`: `set-bonus-values.ts:69-74` says when the set goes in `setIdsNotValued`                                                                                                                                                                    |
| D3  | Domain      | fixed       | `engine.md` `hit-budget.ts` row says the talents read came from `rank-setup.ts` (review re-pin commit)                                                                                                                                                       |
| D4  | Domain      | fixed       | Fork `04bf9faf8`: `set-bonus-gear.ts:266-271` says which bonuses get a line                                                                                                                                                                                  |
| S1  | Standards   | fixed       | Fork `04bf9faf8`: the three functions take `ctx` in place of plain `ctx` fields (`measurePairTwoPiece(ctx, bonusLabel, pair, onNotMeasured)`); `ctx` is built once after the hit budget read and is readonly, so trap 3 does not apply. K2 0 bytes, K6 equal |
| S2  | Standards   | fixed       | Fork `04bf9faf8`: `set-phase.ts:206-208`, `:221`, `set-reach.ts:107-108`, `hit-budget.ts:22` name where the code now is                                                                                                                                      |
| S3  | Standards   | fixed       | Fork `04bf9faf8`: `emptySetPhase` and `SetPhaseOutcome.setBonusResult` use `SetPhaseResult` (tsc rc=0)                                                                                                                                                       |
| S4  | Standards   | fixed       | Fork `04bf9faf8`: `PartnerRow.setContext`; `CountedSims.sims`                                                                                                                                                                                                |
| S5  | Standards   | fixed       | Fork `04bf9faf8`: `SampleRunnerFor` (`set-phase.ts:98`) at all four sites; `makeCachedSampleRun`; file-local `DeltaSample` in `sim-calls.ts`                                                                                                                 |
| S6  | Standards   | fixed       | Fork `04bf9faf8`: one exported `bonusNotMeasured` in `set-bonus-values.ts`; `set-reach.ts` imports it. No runtime import cycle (type-only imports skipped, 0 cycles over `ui/`). Same push in the same order: K2 0 bytes                                     |
| S7  | Standards   | fixed       | Fork `04bf9faf8`: `brokenBonusDpsByKey` everywhere; no `brokenDpsByKey` left                                                                                                                                                                                 |
| S8  | Standards   | fixed       | Fork `04bf9faf8`: `readHitCap(…, hitStat)`                                                                                                                                                                                                                   |
| S9  | Standards   | fixed       | Fork `04bf9faf8`: early return; `measureCrossingChecks` 77 lines                                                                                                                                                                                             |
| P1  | Spec        | fixed       | Fork `04bf9faf8`: `runSetPhase` and `SetPhaseOutcome` moved word for word to `set-phase.ts` (K1: moved, unchanged); `rank.ts` 413 lines and still exports the same 41 names                                                                                  |
| P2  | Spec        | wontfix     | By `docs/agents/paired-worktrees.md` § Land it on dev the merging agent sets `pushed: true` after the merge, as Phase A did (`3635b122`)                                                                                                                     |
| N2a | Adversarial | defer       | `.scratch/carry-forward/issues/890-set-bonus-store-fault-reported-as-sim-failed.md`: older than Phase B; a store fault in the set-bonus sims becomes an "its sim failed" note                                                                                |
| N2b | Adversarial | defer       | `.scratch/carry-forward/issues/891-ranking-cache-read-fault-throws-plain-error.md`: older than Phase B; the ranking-cache read throws a plain `Error`, not `RankError('internal')`                                                                           |

## Notes

- **Each fix is a no-behaviour edit**, so no new test was written: the
  referee is K2 (trace unchanged, 0 bytes), K3 and K6, as for every chunk.
  The plan's rule is that tests are not edited in this refactor.
- **Store-call order at concurrency 2 and 4** (adversarial N1): with
  instant fake sims, the tip reads and writes the store for one candidate
  before starting the next, where the base did both reads first. The same
  store calls happen and the sims, progress, console and ranking are equal;
  with a sim delayed by 3 ms nothing differs. This is the added `await` hop
  the plan's trap 10 allows.
- **Older than Phase B, not changed here** (adversarial N2): a store fault
  during the set-bonus sims is reported as "its sim failed"
  (`set-less-copies.ts`, untouched); a store fault in the ranking-cache read
  throws a plain `Error` rather than `RankError('internal')` (base
  `rank.ts:319`, tip `rank.ts:162`). Changing either is a behaviour change,
  which this branch must not make. Filed as tickets 890 (the "its sim
  failed" note) and 891 (the plain `Error`); Disposition rows N2a and N2b.
- **Comments in files Phase B did not change** still point at `rank.ts` for
  moved code (`promise-pool.ts:2`, `se.ts:18`, `meta-repair.ts:54`,
  `pool.ts:155`, `run_progress.ts:32`, `set-value.ts:317`). Plan chunk C3
  fixes them.
- **What the branch adds beyond the plan's names**, each justified in its
  chunk report: `dispatchUntilStop`, `runSetPhase`, `RunSetup`,
  `wornSetValues`, `measureSetBonusValues`, `choosePartnerGears`,
  `partnerRowOf`, `choosePartnersFor`, `queueShownBonuses`, a top-level
  `readHitCap`, the `brokenBonusDpsByKey` field, about 30 small types, and
  in the review fixes `SampleRunnerFor` and `DeltaSample`. `simEachOnce` went
  to `sim-calls.ts`, not where the plan put it, to avoid an import cycle.
- **What K2 cannot see** (progress events, store calls, which runner sent a
  sim): the adversarial reviewer's extended trace above covered these for
  the phase. The review fixes were checked by K2, K3 and K6 only.
- **Sandbox workarounds used**, not product changes: `GOFLAGS=-buildvcs=false`
  for the live tab and unset for `pnpm verify`; the Playwright shim path;
  the fork bundle built with `node --import tsx` (ticket 864); main-repo
  commits made through a T3 thread bound to the pair, because the sandbox
  mounts the main repo's `.git/worktrees` read-only.
