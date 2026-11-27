# Pre-merge review — feat/engine-cleanup-step1

Diffed against: `dev` `cbb7d927`, range `cbb7d927..HEAD` (HEAD `580a6bce`,
plus this review's uncommitted fixes). Fork pair branch
`feat/engine-cleanup-step1`, range `ed4f42caa..47d299441` (five commits); the
lock re-pins the fork to `47d2994413a0`.

What the branch is for: step 1 of the owner's plan to trim the Upgrades tab's
engine before a pull request into `wowsims/tbc-new` `master`. The plan and the
owner's words are in `.scratch/agent-reports/2026-11-27-general-task-engine-size.md`
(gitignored; main checkout). § Owner follow-up (`:264`) quotes the owner's
replies on the five pieces: "1 sounds like something that should be a test.
maybe im wrong. / 2. no idea wtf thats for exactly and why it is or isnt
needed / 3. that obviously sounds like something that should belong with test
files (which would be different from simply trimming!!!) or not exist / 4. idk
/ 5. dead function sounds trimmable". § Owner decision (`:439`) asked for one
approval: delete items 1, 2, 4 and 5, move item 3's fakes into
`ui/features/upgrades/testing/`, update the main repo's tests and provenance,
and let the plausibility check go. The owner answered "go" in chat on
2026-11-27. Done means the fork's tests and the main repo's parity test pass,
`docs/fork-provenance/` is updated, and nothing a player sees changes.

## What was found

No reviewer showed a behaviour change or a failing test. The five deletions
and the move are complete, and nothing the tab shows reads what was removed.

- `countsAsBreak` (fork `set-phase.ts`) was read only by the plausibility
  check (`rank.ts:31x` at base, adversarial and spec reports). Removing it
  changes no row or popover.
- The new Stop test (`rank_store_faults.test.ts:251-`) is real: with the
  stopped branch made to save the partial ranking, it fails (`Tests 1 failed
| 3 passed (4)`, fix check, Check 2).
- The A3-R rewrite (`packages/core/test/fork-set-net.test.ts:1380-1397`)
  builds the same set as the deleted `IMPLEMENTED_SET_IDS` (adversarial
  report, table under § A3-R).
- The six tab recordings equal their base copies minus
  `ranking.plausibilityWarnings` (adversarial report, § Recordings).
- `data/wowsims-fork.lock.json` and `data/sim-implemented-effects.json`
  change only the fork commit (and `pushed`, plus one `_comment` sentence, in
  the lock).
- No changed fork path exists on the fork's `upstream/master`: the live
  master tip equals the local ref, and `ui/features/upgrades` returns 404
  there (P-N4 below).

The findings were documentation and process gaps: an unsourced owner quote
and a stale heading in `engine.md`, two tickets and the scope doc still
describing the deleted files, and fork commit messages that are not wrapped.

## What changed

The builder's commit `580a6bce` and fork `47d299441` are as the builder's
report describes (`.scratch/agent-reports/2026-11-27-general-task-engine-cleanup-step1.md`).
This review added, in the main pair only (no fork commit):

- `docs/fork-provenance/engine.md`: § Engine clean-up now points to the
  owner's "go" and where it was given (S2); the heading at `:22` and its
  tense now read as history (S5).
- `.scratch/carry-forward/issues/124-*` and `133-*`: `Status: wontfix`, each
  with a 2026-11-27 comment. The fork's copies are gone; core's copies feed
  only this repo's command-line output (`packages/core/src/rank-report.ts:312`,
  `packages/core/src/cli.ts:384-390`), which the owner's 2026-10-16 scope
  ruling (`PLAN.md:934`) puts out of scope.
- `.scratch/carry-forward/issues/80-*`: stays open; a note that
  `RecordedGearSource` (and its bare `Error`) moved to test code.
- `docs/upgrades-tab-scope.md`: rows for 124 and 133 removed; the rows that
  had drifted from the tickets at `dev` (seven closed tickets still listed,
  five open ones missing) brought in line. Its Maintenance loops now print
  nothing. Prettier re-padded the tables, so the diff is large; with `-w` it
  is 6 added and 10 removed lines.
- This file.

## Reviews

- Adversarial: `.scratch/agent-reports/2026-11-27-general-task-engine-cleanup-review-adversarial.md`
- Standards: `.scratch/agent-reports/2026-11-27-general-task-engine-cleanup-review-standards.md`
- Spec: `.scratch/agent-reports/2026-11-27-general-task-engine-cleanup-review-spec.md`
- Fix check: `.scratch/agent-reports/2026-11-27-general-task-engine-cleanup-fix-check.md`
- Domain: not run. The branch changes no TBC, WCL or wowsims fact.

All four are gitignored, in the main checkout.

**Spec: clean.** It found nothing missing, nothing extra and nothing wrong;
its notes are P-N1 to P-N5 below.

## Check output

Every command printed node `v22.23.2` first.

Builder, main pair, before this review:

- `pnpm verify`: rc=0, `gates: 1791 ran, 0 skipped`.
- Fork, each of the five steps and the final tree: `tsc --noEmit` rc=0,
  oxlint rc=0, `Test Files 344 passed`, `Tests 2889 passed`, rc=0.

Adversarial reviewer:

- `pnpm exec vitest run packages/core/test/wowsims-fork-parity.test.ts
packages/core/test/fork-`: `Test Files 12 passed (12)`, `Tests 293 passed
(293)`, rc=0.
- `python3 scripts/check_fork_tests.py`, idle machine: `fork tests check ok
at fork commit 47d2994413a0: vitest run, whole suite (Test Files 344 passed
(344); Tests 2889 passed (2889)); test-locales.mjs passed`, rc=0. Two
  earlier runs under load timed out in `ui/canonical_classes.test.ts` (A-N5).

Fix check (fresh agent, one round):

- Doc fixes: each claim true against its source, after one wording fix
  (F-1).
- Stop-test mutation: `Tests 1 failed | 3 passed (4)`, rc=1, `× writes no
saved ranking`; restored, `Tests 4 passed (4)`, rc=0.
- `python3 scripts/check_engine_port_drift.py`: `engine port drift check
ok`, rc=0.
- `pnpm verify`: rc=1 with `vitest exited nonzero, but its JSON report lists
no failed test or file.` The kept report: `success: True`, 1745 passed, 0
  failed, 2 todo. Load at the end `2.01, 11.89, 9.83` (F-2).

`pnpm merge-to-dev --check-only` on the pair, with this review's fixes on
disk and uncommitted (`(working tree dirty — allowed for --check-only)`).
Load rose from 2.28 to 15.13 during the run.

- verify: `pointers: 271 checked, 0 dead`; `gates: 1791 ran, 0 skipped`.
- merge-ready, both copies: `disposition rows: 24 parsed of 24 row-shaped
lines in 1 section(s)`, every row `ok`, `merge-ready: ok`. Its ticket
  checks read committed changes, so the edits to 124, 133 and 80 were not
  among them.
- merge-ready warned (advisory) that four open tickets name a file this
  branch changed: 165 and 351 (`wowsims-fork-parity.test.ts`), 563
  (`fork-set-net.test.ts`, the parity test) and 795 (`fork-meta-repair.test.ts`,
  `fork-set-net.test.ts`). Judged unrelated: the branch changes those tests
  only to load the moved fakes, drop the deleted wrapper and rebuild A3-R's
  set. 165 (E-W3 self-keying) and 351 (weapon stone) are untouched by that.
  563 asks for Stop to abort in-flight sims; Stop's behaviour is unchanged
  here (sims finish, a partial ranking is returned and not saved). 795 is
  F-2.
- layout gate: `layout gate: SKIPPED -- the fork's built dist/ is absent`.
  The pair has no `dist/`. The tab's layout source changed (fork
  `ui/features/upgrades/model/`), so the gate should run at the real merge
  from the main folder, which has a built `dist/tbc`.
- `check-only: ok (not merging)`, rc=0.

## Findings

Standards:

- **S1.** Fork commit bodies are not wrapped at 72: `47d299441` (246-character
  line), `40fe9105a` (183), `2ea48446c` (126).
- **S2.** `engine.md` § Engine clean-up quoted the owner's approval with no
  source.
- **S3.** `ui/features/upgrades/testing/recorded_sim_runner.ts` has no user in
  the fork (`git grep RecordedSimRunner` at `47d299441` finds only its own
  file); only the main repo's parity test uses it.
- **S4.** The new Stop test sits in `rank_store_faults.test.ts`, whose header
  is about store faults.
- **S5.** `engine.md` § "Two rows trace to a later core commit": the heading
  and one sentence still read as present after the rows they describe were
  removed.
- **S6.** A3-R hard-codes thresholds 2 and 4 where the engine exports
  `SET_THRESHOLDS`.
- **S7.** `70c61281f` has no body; `40fe9105a`'s body says "the main repo",
  which means nothing upstream.
- **S8.** `saveRanking` takes the whole `RunSetup` and reads one field.
- **St-N1.** `engine.md` table rows got hash changes only; their Adaptation
  cells still name removed things.
- **St-N2.** The import path `../testing/recorded_gear_source.ts` and its
  inline type literal repeat in six main-repo tests.
- **St-N3.** `engine.md:297` runs to about 95 characters against the file's
  usual 78.

Adversarial (notes; no failing behaviour shown):

- **A-N1.** The `rank.ts` row at `engine.md:433` still says the dead-slot
  check runs through `plausibilityWarnings`.
- **A-N2.** `Deps.clock` (`rank-types.ts:41`) has no reader.
- **A-N3.** The lock says `pushed: false` and `branch:
"feat/upgrades-tab-react"` while the work is on `feat/engine-cleanup-step1`;
  the reviewer read `merge_to_dev.py:338` as needing the fork pushed.
- **A-N4.** Same as S6: a future set keyed only at another threshold would be
  missed.
- **A-N5.** `ui/canonical_classes.test.ts` timed out in its 40 s `beforeAll`
  twice under load.

Spec (notes):

- **P-N1.** Same as St-N1 (sim-runner, set-value and rank rows).
- **P-N2.** Tickets 124, 133 and 80 and the scope doc still said the fork has
  the deleted files.
- **P-N3.** The Stop test's mutation check had not been re-run by a second
  agent.
- **P-N4.** The local `upstream/master` was not refreshed before the overlap
  check.
- **P-N5.** The intermediate fork commits `70c61281f` and `2ea48446c` do not
  pass the main repo's tests on their own.

Fix check and this review:

- **F-1.** The new wording in tickets 124 and 133 said core's copies feed
  "only the command-line HTML report"; `cli.ts:384-390` also prints them.
- **F-2.** `pnpm verify` exited 1 in the fix check with every test passing.
- **R-1.** `docs/upgrades-tab-scope.md` had drifted from the tickets at `dev`
  (seven STALE, five MISSING), beyond 124 and 133.

## Disposition

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                      |
| ----- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1    | Standards   | wontfix     | Rewording rewrites the five pinned fork commits that the lock names and that the parallel test-move pair branches from. The messages are accurate. Flagged for the upstream pull request's preparation, where the branch will be rebased anyway.                   |
| S2    | Standards   | fixed       | `engine.md:359-362` names the owner's "go", the date and the plan section it approved. Before/after capture in the reviewer's scratchpad; fix check, Check 1.                                                                                                      |
| S3    | Standards   | wontfix     | The owner asked for the move ("3. ... should belong with test files ... or not exist"). The parallel test-move pair may give it fork users; if not, it can go when the parity test moves. Flagged to the caller.                                                   |
| S4    | Standards   | wontfix     | The test reuses that file's `FaultingStore` and `runWithFault` harness in its own `describe` block; it replaces the job-row test that lived there.                                                                                                                 |
| S5    | Standards   | fixed       | `engine.md:22` heading now "Two rows traced to a later core commit than the header"; `:40-41` in past tense. Fix check, Check 1.                                                                                                                                   |
| S6    | Standards   | wontfix     | Equal today: every key in the table has threshold 4, and the adversarial check found the built set equals the old list. Editing `fork-set-net.test.ts` here risks a modify/delete conflict with the parallel pair that moves engine tests; suggested to that pair. |
| S7    | Standards   | wontfix     | Same as S1.                                                                                                                                                                                                                                                        |
| S8    | Standards   | wontfix     | Matches its sibling `runRanking(ctx, setup)`; narrowing one helper's argument is outside a deletion step.                                                                                                                                                          |
| St-N1 | Standards   | wontfix     | The doc's convention keeps old rows as history and records the removal in a dated section (§ Pre-PR removals; § Store faults, `:311`). § Engine clean-up names the three rows that still mention removed things; a grep of every row finds only those.             |
| St-N2 | Standards   | wontfix     | The repeated shape predates the branch; only the path changed.                                                                                                                                                                                                     |
| St-N3 | Standards   | wontfix     | `prettier --check` passes; the tooling owns wrapping.                                                                                                                                                                                                              |
| A-N1  | Adversarial | wontfix     | Same as St-N1; the `rank.ts` row is one of the three the section names.                                                                                                                                                                                            |
| A-N2  | Adversarial | wontfix     | Already unread at base (`git grep "\.clock"` at `ed4f42caa` finds only `MemoryStore`'s own field). A candidate for the next clean-up step; flagged to the caller.                                                                                                  |
| A-N3  | Adversarial | wontfix     | `merge_to_dev.py:338` is a docstring; no merge script reads `pushed`. Landing still needs the fork branch merged into `feat/upgrades-tab-react` in the main folder (`docs/agents/paired-worktrees.md` § Land it on dev, step 2).                                   |
| A-N4  | Adversarial | wontfix     | Same as S6.                                                                                                                                                                                                                                                        |
| A-N5  | Adversarial | wontfix     | An upstream file this branch does not touch. Alone it passes in 11.18 s; the whole fork suite passed 344/2889 on an idle machine (Check output).                                                                                                                   |
| P-N1  | Spec        | wontfix     | Same as St-N1.                                                                                                                                                                                                                                                     |
| P-N2  | Spec        | fixed       | Tickets 124 and 133 `wontfix` with comments; ticket 80 note; scope doc rows removed. The scope doc's Maintenance loops print nothing. Fix check, Check 1.                                                                                                          |
| P-N3  | Spec        | fixed       | Fix check, Check 2: mutated, `Tests 1 failed \| 3 passed (4)`; restored, `Tests 4 passed (4)`.                                                                                                                                                                     |
| P-N4  | Spec        | wontfix     | Checked live: the remote master tip `24606be6b` equals the local ref, and the GitHub contents API returns 404 for `ui/features/upgrades` on `master`.                                                                                                              |
| P-N5  | Spec        | wontfix     | The lock pins only the final commit, and the upstream pull request will be prepared from the final tree.                                                                                                                                                           |
| F-1   | Author      | fixed       | Both tickets now name the HTML report (`rank-report.ts:312`) and the console (`cli.ts:384-390`).                                                                                                                                                                   |
| F-2   | Author      | wontfix     | Ticket 795's pattern (exit 1 with every test passed under load), not this branch: the check-only run's verify passed (`gates: 1791 ran, 0 skipped`) with load up to 15.                                                                                            |
| R-1   | Author      | fixed       | Scope doc rows brought in line with every ticket's Status; the Maintenance loops print nothing (before/after lists in the reviewer's scratchpad). The doc's own rule regenerates it in the commit that changes a ticket's Status.                                  |
