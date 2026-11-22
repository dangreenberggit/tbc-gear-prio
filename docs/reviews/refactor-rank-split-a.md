# Pre-merge review — refactor/rank-split-a

Diffed against: our repo `1bcec319..HEAD` (`1bcec319` is `dev` when the pair
was made; the branch adds `43a1be89`, the three re-pins `8951dca8`,
`307f4a9c`, `dcdb9cce`, the review fixes `b75122e4`, and this file), and
the fork `d94930daa..bbe89a565` on fork branch `refactor/rank-split-a`
(`d94930daa` is the pin on `dev`).

What the branch is for: Phase 0 and Phase A of the readability plan
(`.scratch/agent-reports/2026-11-21-design-task-upgrades-readability-plan.md`,
gitignored; finish-line plan `.scratch/plans/upgrades-tab-finish-line.md`,
Chunk 7). Phase 0 adds an opt-in trace of fork `rankUpgrades` calls to the
test harness. Phase A moves whole declarations out of the fork's `rank.ts`
into thirteen files, word for word. No behaviour changes.

The owner's words (2026-11-21), from the plan: "I want it to be more
digestible, more readable, extracted functions where it makes sense in an
organized manner and a more manageable level of modularity", and "We don't
need to have a \"one function one thing\" extreme approach". On scope, "Q2
sounds good": Phases 0, A, B, then C1 and C3. This branch is 0 and A.

Reports (gitignored, in the main checkout's `.scratch/agent-reports/`): the
chunks `2026-11-21-general-task-rank-split-{0,a1,a2,a3}.md`; the three
reviews `2026-11-21-general-task-rank-split-a-review-{adversarial,standards-spec,domain}.md`;
the check of the fixes `2026-11-21-discrete-task-rank-split-a-check-fixes.md`; the phase summary
`2026-11-21-general-task-rank-split-phase-a.md`.

## What moved

`rank.ts` went from 4,018 lines to 1,070. New files (lines at `bbe89a565`):
`rank-types.ts` 467, `run-notes.ts` 280, `rank-setup.ts` 121, `sim-calls.ts`
138, `hit-budget.ts` 108, `gear-swap.ts` 199, `set-phase.ts` 800,
`set-worn-ladder.ts` 122, `set-reach.ts` 75, `set-bonus-values.ts` 86,
`set-bonus-net.ts` 34, `set-context.ts` 296, `set-bonus-gear.ts` 452.
`rank.ts` re-exports every name it exported, so no importer and no test
changed. `view.ts` and `plausibility.ts` import their types from
`rank-types.ts`.

## Check output

`node --version` printed v22.23.2 in every shell. Logs in the main checkout's
`.scratch/rank-split/logs/`.

- **K1, move check** (`.scratch/rank-split/decls-same.cjs`), the whole phase
  against the base, on the 16 engine files (`rev-k1-phase.txt`):

  ```
  decls-same: 141 declarations at base, 141 in working tree; 141 unchanged (92 moved file), 0 changed, 0 gone, 0 new, 0 duplicated, 0 allowed
  comments: 0 only at base, 13 only in working tree (hint, not a failure)
  ```

  rc=0. The 13 comments are the new file headers. Against `db76a0eda`, the
  review fixes alone (`rev-k1.txt`): `141 unchanged (0 moved file), 0
changed`, hint `7 only at base, 7 only in working tree` (the seven
  rewritten headers), rc=0. Per chunk: A1 141 unchanged, 36 moved; A2 58
  unchanged, 41 moved; A3 17 unchanged, 15 moved; each rc=0.

- **K2, trace** (`TBC_RANK_TRACE_DIR`, five engine suites, 251 `rankUpgrades`
  calls, 4,725 sim calls): `diff -r` of each chunk's trace against the one
  before was empty (0→A1, A1→A2, A2→A3), and `trace/0` against `trace/a3`
  too. After the harness fix, `trace-compare-kind.cjs trace/a3 trace/rev`
  (strips only the new `error.kind`): `5 files, 251 lines, 0 differences;
kinds recorded: {"sim-failed":9,"undefined":2,"internal":1}`, rc=0.
- **K3, engine suites**: `Test Files 5 passed (5)`, `Tests 246 passed (246)`
  at every chunk and after the fixes (`rev-k3.log`, 3m32s).
- **K4, fork**: tsc rc=0, `oxlint --deny-warnings ui/features/upgrades
ui/app/tabs/UpgradesTabBody.tsx` rc=0, `oxfmt --check` rc=0, fork vitest
  `--testTimeout=60000` `Test Files 341 passed (341)`, `Tests 2862 passed
(2862)`, `test-locales.mjs` valid, at every chunk and after the fixes.
- **K5**: `pnpm verify` printed `gates: 1749 ran, 0 skipped` at A1, A2 and
  A3; after the fixes: ``gates: 1750 ran, 0 skipped`, rc=0, 5m24s (`rev-verify.log`; one more gate than before, the new harness test)`.
- **K6, live tab**: two recordings each of ret P3 (from the P2 preset) and
  warlock P3 (from the T5 preset) at `d94930daa` were equal to each other;
  at `db76a0eda` both rankings were equal to those (`k6: Ranking equal`,
  rc=0; 889 ret rows), leaving out `durationMs`, which differs between equal
  runs. Feral could not be recorded in the sandbox: its preset loaded other
  gear ("gear not loaded", 10 of 16 items missing) on every try.
- **Fixes checked by a fresh agent**: with `fork-engine-harness.ts` from `dcdb9cce` written over the file,
  `pnpm exec vitest run packages/core/test/fork-engine-harness.test.ts` gave
  `Tests 2 failed | 3 passed (5)`: "records a rejected run" missed
  `"kind": "sim-failed"` (`:111`), and the overlap test got
  `expected [ 'from b', 'from a' ] to deeply equal [ 'from a' ]` (`:146`).
  With HEAD's file back (`git diff --stat` empty): `Tests 5 passed (5)`.
  `pnpm verify` rc=0, from its cache: "these inputs passed in full ... (1750
  ran, 0 skipped)". `git status` was clean before and after.

## Findings

Three reviewers: adversarial, standards and spec, domain. All found the move
itself clean: the adversarial reviewer's own scripts found all 94 top-level
declarations of the old `rank.ts` once each in the 14 files, 92 byte for byte
apart from an added `export`, two re-wrapped by oxfmt, and the same 41
exports. No domain constant changed.

- **A1** (adversarial, low-medium): `tracedRank` recorded `error.code`, but
  the fork's `RankError` carries `kind` (`rank-types.ts:120`), so K2 could
  not tell a `sim-failed` run from an `internal` one.
- **A2** (adversarial, low): `tracedRank` saved and restored `console.warn`
  per call. With overlapping traced runs (`fork-set-net.test.ts` runs three
  in `Promise.all`), a warning went to the wrong run and a stale hook stayed
  on `console.warn`.
- **A3, S1, D2, D3, D4** (three axes, low): new file headers described the
  files as Phase B will leave them. `set-context.ts` said "Pure." though
  `applySetContext` writes `item.setContext`; `set-reach.ts` claimed
  `crossingChecks`, which stay in `set-phase.ts`; `set-worn-ladder.ts` named
  `brokenSetValues`; `set-bonus-values.ts` said `setBonuses`;
  `set-bonus-net.ts` said `bonusDpsNet`.
- **D1** (domain, low): `sim-calls.ts` said "Every way the engine calls the
  sim"; eight call sites in `rank.ts` call `deps.sim` directly.
- **S2** (standards, low; also an adversarial note): the `rank.ts`
  provenance sentence said "Split into `rank-*.ts` and `set-*.ts`", leaving
  out four files.
- **S3** (standards, judgement): `stableJson` does not sort keys, so the name
  misleads.
- **P1** (spec, process): the A2 and A3 chunk reports were not written.
- **N1** (standards note): `hit-budget.ts` said it holds "the requests built
  for each copy layout"; the builder `requestsPerLayout` is in `rank.ts:407`.
- **N2** (adversarial note): `scripts/tab-harness/run-tab-cdp.mjs:713` said
  `DEFAULT_SEED_BASE` is in `engine/rank.ts`; a sweep for moved names next to
  `rank.ts` found two more live pointers, `make-mock-fixtures.ts:53` and ADR
  0034 line 106.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                       |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `b75122e4`: `tracedRank` records `error.kind`. Test "records a rejected run and rethrows the same error" now expects `kind`; red before the fix, green after (`review-harness-red.log`, checker below)                              |
| A2  | Adversarial | fixed       | `b75122e4`: one shared `console.warn` hook while any traced run is in flight, each warning sent to its run by `AsyncLocalStorage`. New test "keeps each warning with its own run when traced runs overlap"; red before, green after |
| A3  | Adversarial | fixed       | Fork `bbe89a565`: `set-context.ts` says `applySetContext` writes onto the rows; `set-reach.ts` names only `setBonusCountsInReach`. K1 vs `db76a0eda`: 141 unchanged, 0 changed                                                      |
| S1  | Standards   | fixed       | Fork `bbe89a565`: `set-reach.ts`, `set-worn-ladder.ts`, `set-bonus-values.ts` headers name what each file holds                                                                                                                     |
| D1  | Domain      | fixed       | Fork `bbe89a565`: `sim-calls.ts` says "The sim helpers `rankUpgrades` and the set phase share" and that other call sites call `deps.sim` directly                                                                                   |
| D2  | Domain      | fixed       | Fork `bbe89a565`: `set-bonus-values.ts` names `measurePairTwoPiece`                                                                                                                                                                 |
| D3  | Domain      | fixed       | Fork `bbe89a565`: `set-bonus-net.ts` names `countMembersBreaking`, "a term of the set phase's `bonusDpsNet`"                                                                                                                        |
| D4  | Domain      | fixed       | Fork `bbe89a565`: `set-reach.ts` drops `crossingChecks`                                                                                                                                                                             |
| S2  | Standards   | fixed       | `b75122e4`: the `rank.ts` row in `docs/fork-provenance/engine.md` names all six non-`set-` files and "the `set-*.ts` files"                                                                                                         |
| S3  | Standards   | fixed       | `b75122e4`: renamed `jsonWithBigints`                                                                                                                                                                                               |
| P1  | Spec        | fixed       | `.scratch/agent-reports/2026-11-21-general-task-rank-split-a2.md` and `-a3.md` written                                                                                                                                              |
| N1  | Standards   | fixed       | Fork `bbe89a565`: `hit-budget.ts` says it holds the types the requests are built with, and that `requestsPerLayout` in `rank.ts` builds them                                                                                        |
| N2  | Adversarial | fixed       | `b75122e4`: `run-tab-cdp.mjs:713` → `rank-setup.ts`; `make-mock-fixtures.ts:53` → `rank-types.ts`; ADR 0034 line 106 → `set-context.ts`                                                                                             |

## Notes

- **Merge check.** `pnpm merge-ready` printed `merge-ready: ok (this
checkout's copy and dev's copy)`, rc=0. It warned (advisory) that six open
  tickets name a file this branch changed: 165, 351 and 563
  (`wowsims-fork-parity.test.ts`, `fork-set-net.test.ts`), 795
  (`fork-meta-repair.test.ts`, `fork-set-net.test.ts`), 577
  (`run-tab-cdp.mjs`) and 841 (`make-mock-fixtures.ts`). The branch touches
  those files only with a one-line `tracedRank` wrap and its import, or a
  one-line comment pointer, so none of the six is addressed or changed here.

- **Dated records keep their pointers.** Older files in `docs/reviews/` and
  `docs/plans/` name `rank.ts` lines for code that has moved. They record
  what was true when written, so they stay. Comments inside the fork that
  still say `rank.ts` for moved code (for example `set-value.ts:297`) are
  plan chunk C3's work.
- **What K2 cannot see** (adversarial note): progress events, store reads and
  writes, which runner (`deps` or the Stop-guarded one) sent a sim except
  where a Stop test makes it refuse, `console.debug`/`info`/`error`, and
  warning arguments after the first. No engine suite makes the store fail,
  so Phase B's chunk B1 most needs a test for that.
- **Only five suites are traced**, as the plan scoped K2. Other main-repo
  suites and fork tests call `rankUpgrades` untraced.
- **`tracedRank` binds untraced runner methods** on each read, so
  `deps.sim.x !== deps.sim.x` under trace. No engine code compares them (the
  adversarial reviewer's grep found only `instanceof StopRefusedSim`).
- **Pointers into `.scratch/`.** The `rank.ts` provenance row and the harness
  comments name the gitignored plan path. `engine.md` already does this
  elsewhere (lines 131, 141).
- **Header comments on new files** were not asked for by the plan; the review
  kept them once they were true.
- **The fork commit is not pushed.** The lock has `pushed: false` at
  `bbe89a565`. The fork branch `refactor/rank-split-a` must reach the fork
  remote and the lock be marked pushed before a merge into `dev`.
- **Sandbox workarounds used**, not product changes: `GOFLAGS=-buildvcs=false`;
  the Playwright shim path; the fork bundle built with `node --import tsx`
  because `npx tsx` cannot open its IPC pipe (ticket 864); main-repo commits
  made through a T3 thread bound to the pair, because the sandbox mounts the
  main repo's `.git/worktrees` read-only. `GOFLAGS` must stay unset for
  `pnpm verify`: `scripts/verify_cache.test.mjs` sets
  `GOFLAGS=-buildvcs=false` and expects the cache key to move, so a shell
  that already has that value fails it (seen once in this review).
- **Over the size guide, unchanged by a move-only phase:** functions
  `rankUpgrades` 955 lines, `buildSetBonuses` 742, `measureBonusGear` 429,
  `applySetContext` 185; files `rank.ts` 1,070, `set-phase.ts` 800,
  `rank-types.ts` 467, `set-bonus-gear.ts` 452. Phase B splits the functions.
