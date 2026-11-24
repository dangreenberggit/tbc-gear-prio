# Pre-merge review — refactor/rank-split-c

Diffed against: our repo `bc5a9be1..HEAD` (`bc5a9be1` is `dev` after Phase B
landed; the branch was made from `refactor/rank-split-b` at `4f2b585f` and
merged `dev` in `d3cc2f09`), and the fork `04bf9faf8..ed1bc49a9` on fork
branch `refactor/rank-split-c` (`04bf9faf8` is the pin on `dev`). Every file
in the fork diff is under `ui/features/upgrades/`; `upstream/master`
(`24606be6b`) has no `ui/features/upgrades`, and `git cat-file -e
upstream/master:<file>` failed for each of the 16 files, so no upstream
wowsims file changed.

What the branch is for: chunks C1 and C3 of the readability plan
(`.scratch/agent-reports/2026-11-21-design-task-upgrades-readability-plan.md`,
gitignored; finish-line plan `.scratch/plans/upgrades-tab-finish-line.md`,
Chunk 7). C1 moves the set-potential arithmetic out of `view.ts` into
`set-potential.ts`. C3 drops the re-exports that kept old import paths
working during the split. Chunk C2 is out of scope by the owner's choice. No
behaviour change.

The owner's words (2026-11-21), from the plan: "I want it to be more
digestible, more readable, extracted functions where it makes sense in an
organized manner and a more manageable level of modularity". For this phase:
"The pr will be more successful if it's less sloppy."

Reports (gitignored, in the main checkout's `.scratch/agent-reports/`): the
phase report `2026-11-22-general-task-rank-split-phase-c.md`; the two
reviews `2026-11-22-general-task-rank-split-c-review-{adversarial,standards-spec}.md`.

## What changed

| Fork commit | Chunk        | Change                                                                                                                                                                                                                                                                                           |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `c26dc9a94` | C1           | `setCreditUnmeasured` through `rankableSetPotential` (with `ownSwapBreaks`, `SwapBreak` and the private `creditBreakdown`, `bonusGearCredit`), and the types `SetContextLike`, `FutureBonus`, `SetPotentialTerm`, moved word for word to `set-potential.ts` (416 lines). `view.ts` is 193 lines. |
| `a7fea6cc1` | C3           | `rank.ts` exports `rankUpgrades`, `RankError` and the `rank-types.ts` types; `view.ts` only its own names. Six fork importers repointed. Eight comments in seven files that named `rank.ts` for moved code name its file.                                                                        |
| `ed1bc49a9` | review fixes | Comments only (S1, S2, S5, S6 below).                                                                                                                                                                                                                                                            |

In this repo: the engine test loaders take `candidateSwap*` from
`gear-swap.ts`, `equipmentForCandidateSwap` from `gear-swap.ts` and the
set-potential names from `set-potential.ts`; the provenance rows, the lock and
`data/sim-implemented-effects.json` follow each fork commit.

## Check output

`node --version` printed v22.23.2 in every shell. Logs in the main checkout's
`.scratch/rank-split/logs/`.

- **K1, move check** (`decls-same.cjs`): C1 against `04bf9faf8` over
  `view.ts` and `set-potential.ts`: `35 unchanged (18 moved file), 0
changed, 0 gone, 0 new, 0 duplicated, 0 allowed`, rc=0 (`c1-k1.txt`). C3
  against `c26dc9a94` over its 15 fork files: `222 unchanged`, 0 changed,
  rc=0 (`c3-k1.txt`). Review fixes against `a7fea6cc1`: `62 unchanged`, 0
  changed, rc=0 (`c-rev-k1.txt`).
- **K2, trace**: the pair's base trace `trace/c0` equals Phase B's last
  (`trace/b-rev-check`, 0 bytes). `c0`→`c1`, `c1`→`c3` and `c3`→`c-rev`: 0
  bytes each.
- **K3, engine suites**: `Test Files 5 passed (5)`, `Tests 246 passed (246)`
  at C1, C3 and after the fixes (`c1-k2k3k4.out`, `c3-k2k3k4.out`,
  `c-rev-k2k3k4.out`). `fork-set-fixtures.test.ts` (not in K3, but its
  loaders changed): `Tests 7 passed (7)` at C3 and after the fixes.
- **K4, fork**: `python scripts/check_fork_lint.py`: oxlint clean, fork
  type-check clean, oxfmt clean, rc=0; fork vitest `Test Files 341 passed
(341)`, `Tests 2862 passed (2862)`; `test-locales.mjs` valid.
- **K5**: `pnpm verify` printed `gates: 1750 ran, 0 skipped`, rc=0, at C1,
  C3 and after the fixes (`c1-verify.log`, `c3-verify.log`,
  `c-rev-verify.log`). `python scripts/check_engine_port_drift.py`: `ok: 51
ported files match engine.md`.
- **The tab's view figures (C1)**: a scratch test
  (`.scratch/rank-split/c1-render-dump.test.ts`) ran `applyView` (with and
  without set potential, grouped by slot), the ΔDPS sort key, the set-bonus
  popover lines and every set-potential function over every row of eight
  recorded rankings (the six in `packages/core/test/fixtures/tab-recordings/`
  and Phase B's ret and warlock K6 recordings). The output before C1 and after
  it is the same file: `cmp` rc=0, sha256 `626116e9…`.
- **K6, live tab** (`k6.sh`, vite dev serving the pair's fork on :5181, the
  pair's backend on :3333; `k6-compare.cjs`): ret P3 from the P2 preset and
  warlock P3 from the T5 preset, compared with `k6/b-rev-after/` (recorded at
  `04bf9faf8`, this phase's base). At `a7fea6cc1` (`k6/c-after/`): `k6:
Ranking equal`, rc=0, for both. At `ed1bc49a9` (`k6/c-rev-after/`): `k6: Ranking equal`, rc=0, for both. Feral was not recorded: its
  preset loads other gear in the sandbox, as in Phases A and B.

## Findings

Two reviewers, adversarial and standards/spec, both `general-task` on Opus.
Neither found a behaviour change. The adversarial reviewer found no import
cycle at base (84 modules) or tip (85), confirmed `view.ts` and
`set-potential.ts` share no export name (so the test helper's spread
overwrites nothing), re-ran K2 (0 bytes) and the five suites plus
`fork-set-fixtures` (253 passed).

- **A1** (adversarial; also S2): `fork-set-fixtures.test.ts:5,9` said the
  suite checks "the shipped fork `view.ts`".
- **A2** (adversarial): `set-phase.ts:4` names `rank.ts`; still true
  (`rank.ts` builds the set fields).
- **A3** (adversarial): `docs/adr/0034-…md:5,71,75,118` and
  `docs/set-bonus-fixture-derivations.md:1327` name fork `view.ts` for the
  set-potential functions.
- **S1** (standards): `set-potential.ts:1-3` did not mention `ownSwapBreaks`.
- **S2** (standards): C1 left comments saying the set figures live in
  `view.ts`: `packages/core/test/fixtures/tab-recordings/README.md:8`,
  `fork-set-fixtures.test.ts:5,9`, fork `set-bonus-off.ts:51-52`.
- **S3** (standards): four main-repo test comments named fork `rank.ts` for
  code Phases A and B moved: `fork-run-progress.test.ts:904`,
  `fork-virtual-i18next-loader.ts:10`, `wowsims-fork-parity.test.ts:954`,
  `fork-meta-repair.test.ts:2169`.
- **S4** (standards): test names no longer matched what they load:
  `viewModule`/`ViewMod` and `bonusGearView` load `set-potential.ts`,
  `Engine.rank` held `gear-swap.ts`, and `viewWithSetPotential` was used by 13
  cases where 2 call `applyView`.
- **S5** (standards): rewritten comment lines not rewrapped
  (`run_progress.ts:4`, `pool.ts:155`, `promise-pool.ts:2`).
- **S6** (standards): `promise-pool.ts:2` named one of its two users.
- **P1** (spec): the branch edits test loader lines the plan did not name;
  the plan's rule is to stop and report then.
- **P2** (spec): no per-chunk report.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `fork-set-fixtures.test.ts:5,9` name `set-potential.ts` (commit `398e34b2`)                                                                                                                                                                                                                                                                             |
| A2  | Adversarial | wontfix     | The comment is true: `rank.ts` `assembleRanking` writes the `Ranking`'s set fields                                                                                                                                                                                                                                                                      |
| A3  | Adversarial | fixed       | `set-bonus-fixture-derivations.md:1327` names `ownSwapBreaks` in `set-potential.ts` (`398e34b2`). ADR-0034 is left as written: an ADR is a dated record, and the same lines name code that is gone for other reasons (`RULE_490`, "until ticket 513")                                                                                                   |
| S1  | Standards   | fixed       | Fork `ed1bc49a9`: the header names `ownSwapBreaks`                                                                                                                                                                                                                                                                                                      |
| S2  | Standards   | fixed       | `README.md:8` and `fork-set-fixtures.test.ts:5,9` (`398e34b2`); fork `ed1bc49a9`: `set-bonus-off.ts` says "the popover's own list"                                                                                                                                                                                                                      |
| S3  | Standards   | fixed       | The four comments name `rank-replication.ts`, "the engine", `rank-setup.ts` and `set-bonus-values.ts` (`398e34b2`)                                                                                                                                                                                                                                      |
| S4  | Standards   | fixed       | `setPotentialModule`/`SetPotentialMod`; `Engine.gearSwap`; `SubLineViewMod` with `applyView` for the 2 cases that read it, the other 11 load `set-potential.ts` directly (`398e34b2`). `bonusGearView`/`BonusGearViewMod` keep their names: "view" there means the bonus-gear figures the tab shows, which is what they hold. K3 246 passed, K2 0 bytes |
| S5  | Standards   | fixed       | Fork `ed1bc49a9`: the three paragraphs rewrapped                                                                                                                                                                                                                                                                                                        |
| S6  | Standards   | fixed       | Fork `ed1bc49a9`: names `rank-candidates.ts`'s loop and `sim-calls.ts`'s `simEachOnce`                                                                                                                                                                                                                                                                  |
| P1  | Spec        | wontfix     | Accepted departure, recorded here: the edits change only which file a loader reads and the names of the loader types. No assertion line changed (`git diff bc5a9be1...HEAD -- packages`), and both reviewers judged them required once `view.ts` drops its re-exports. The plan named two loader lines of the same kind and undercounted                |
| P2  | Spec        | fixed       | One phase report covers both chunks, at the path the brief named: `.scratch/agent-reports/2026-11-22-general-task-rank-split-phase-c.md`                                                                                                                                                                                                                |

## Notes

- **No new tests.** Every edit moves code, changes an import path, a name in
  a test, or a comment. The referee is K1, K2, K3 and K6, as for Phases A and
  B, and for C1 the view-figures dump above.
- **Departures from the plan**, beyond P1: C3 also repointed
  `set-bonus-off.ts`, which imported from `./view` and the plan did not list;
  C1 moved `ownSwapBreaks` and `SwapBreak`, which sit inside the plan's line
  range; the `view.ts` header's set-potential paragraph moved word for word to
  `set-potential.ts`, and `view.ts` got a two-line pointer; C3 also fixed
  three comments in `scripts/check_desktop_tab.py` that named fork `rank.ts`
  for the hand rule and the cap.
- **Sizes**: `set-potential.ts` is 416 lines, over the plan's ~400 guide (the
  plan estimated ~350); its longest function, `creditBreakdown`, is 76 lines.
  Splitting it would not help reading.
- **Open tickets that name a changed file** (`pnpm merge-ready`, advisory):
  165, 351, 563 and 795 (engine test files), 519 (`fork-set-fixtures.test.ts`),
  407 and 434 (`scripts/check_desktop_tab.py`). Judged irrelevant: this branch
  changes only loader paths, test-local names and comments in those files,
  nothing any of those tickets is about.
- **The lock says `pushed: false`.** The fork branch is pushed; by
  `docs/agents/paired-worktrees.md` § Land it on dev the merging agent sets
  `pushed: true` after the merge, as Phases A and B did.
- **Sandbox workarounds used**, not product changes: `GOFLAGS=-buildvcs=false`
  for the live tab and unset for `pnpm verify`; the Playwright shim path; the
  fork bundle built with `node --import tsx`; main-repo commits made through
  the T3 thread "rank-split-c: pair commits", because the sandbox mounts the
  main repo's `.git/worktrees` read-only.
