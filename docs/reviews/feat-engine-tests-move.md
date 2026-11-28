# Pre-merge review — feat/engine-tests-move

Ranges:

- Main: `580a6bce` plus the uncommitted working tree. `580a6bce` is the main
  half of the engine clean-up (`feat/engine-cleanup-step1`, reviewed in its
  own file, not merged), so `dev` is not this range's base.
- Fork (`vendor/tbc-new-fork`, branch `feat/engine-tests-move`):
  `47d299441..eb0c8155d`. That is 7 commits that move the tests in
  (`91b9f1c19..e58798376`), 8 that strengthen them (`c2c728a24..71d0f20a7`),
  and 6 from this review (`e860397b0..eb0c8155d`). Every changed path is
  under `ui/features/upgrades/` and is a test file or a `testing/` helper.
  None of these paths exists on `upstream/master` (`24606be6`).
- The lock pins `eb0c8155d4e935aa7894c7383f23a4ef79a45138`.

What the branch is for: after the clean-up, the owner said "after we handle
this - since it seems like it could be test adjacent and perhaps involving
changing test files-- we'll have a session focus on the tests". The plan
(`.scratch/agent-reports/2026-11-27-general-task-engine-tests-plan.md`,
gitignored) offered options for moving the engine tests into the fork, so
that the upstream PR stands on its own. The owner picked option B:
"recommended sounds ok. i think tests arent as bad as the functioning app
code for LOC issues". Option B moves the engine-logic tests, keeps the 13
tests over 5 s here, and strips the owner's rotation from the skeletons. The
owner then said "what we might need is an independent review to see if the
tests really test well", and "i would like it, yes". That review and the
strengthening after it are in the fork range. These quotes are relayed by
the session that launched this review on 2026-11-27.

## What was found

- **The move is faithful.** All 276 old cases in the 7 moved or trimmed
  files are accounted for: 254 moved, 13 kept here, and 9 deleted where the
  plan says (RS-3, four staleness cases, B4-B6, the results-view recording
  test). The orphan `feral-rank-fixture.ts` is also deleted. A token diff of
  the bodies of the 206 old/new test pairs found no dropped `expect`, no
  looser matcher, no changed literal, no lost loop case and no new guard.
  The 12 kept set-net tests are unchanged as text, and O1 changes only its
  oracle import.
- **One deletion was not covered.** RS-3 was said to be covered by
  `candidate-order.test.ts:80`, but that test fakes the item score. With
  `item_ep.ts:29` broken, all 1185 upgrades tests still passed (A1/P1).
- **The strengthening is real.** Mutants M11, M36, M43 and M48 were re-run:
  each fails at `71d0f20a7` and passes at `e58798376`. The `expectNear` swap
  has 53 calls before and 53 after, with the same arguments. On 2 cores
  (`taskset -c 0,1`) no test without its own timeout took over 2.7 s.
  Shuffled order with seeds 1 and 4242 passed.
- **Main-repo wording was left in the fork**, in test names, constants and
  comments: "Z", "(known limit d)", names built from ticket case ids, and
  comments about the owner's demo row, the parity harness, C5 and the live
  sweep (S1-S4, P5).
- **Main-repo docs still pointed at moved cases**: the set-bonus derivations
  doc, ADR-0035:649, `docs/fork-provenance/engine.md`, and four comments in
  `fork-set-net.test.ts` (S5, P3, P4).
- **The skeletons.** Both lack the rotation. The feral skeleton still had
  the owner's potion and drums, not the preset's values (D2).
- Format, lint and type-check in the fork all exit 0. The fixtures are small:
  4,225 B and 5,428 B, against upstream's largest test fixture at 6.4 KB.

## What changed in this review

- Fork `e860397b0`: an `item_ep.test.ts` case brings back RS-3's checks on
  the real item score. A suffixed item scores `Math.floor(5259*41/10000)`,
  and with no suffix it scores 0.
- Fork `9d2ac02a8`: a direct unit test of `clearsSameGearNoise`; unit tests
  of the three `netInflation` terms that had none; a second check each for
  M08 and M13.
- Fork `7b63f7f5a`: plain-word test names, scenario constants and comments,
  with no main-repo ids or references.
- Fork `b7be18d94`: the meta-repair comments corrected (blue 3; MP5; the
  Stone of Blades is an epic, jewelcrafter-only gem passed in by hand;
  Justicar Greaves).
- Fork `4c0831cca`: two unused scenario exports dropped.
- Fork `eb0c8155d`: the feral test skeleton's potion (22838) now matches the
  upstream preset (`ui/specs/druid/feralcat/presets.ts:74-85`), and its drums
  are dropped.
- Main, uncommitted: `docs/set-bonus-fixture-derivations.md` now says where
  each case lives, with a `Test:` line under each case. The comments in
  `packages/core/test/fork-set-net.test.ts` that named moved cases now name
  the fork file. The lock now pins `eb0c8155d`, and
  `pnpm sim-implemented-effects:generate` changed only `forkCommit`.

## Reviews

All reports are under `.scratch/agent-reports/` (gitignored), with the prefix
`2026-11-27-`.

- Adversarial: `general-task-engine-tests-review-adversarial.md`
- Standards: `general-task-engine-tests-review-standards.md`
- Spec: `general-task-engine-tests-review-spec.md`
- Domain: `general-task-engine-tests-review-domain.md`. Scope: the 8
  strengthening commits and the two skeletons, checked against `db.json` and
  the engine code. All arithmetic and game rules check out.
- Fixes: `general-task-engine-tests-review-fixes.md` (fork) and
  `modest-task-engine-tests-doc-pointers-1.md` (main docs).
- Fix check: `general-task-engine-tests-fix-check.md`

## Check output

Fix check, by a fresh agent. Each mutant was applied in a copy of the fork,
and each node command printed v22.23.2.

| Mutant               | Fails under the mutant                                                                 | Undone    |
| -------------------- | -------------------------------------------------------------------------------------- | --------- |
| random-suffix score  | `item_ep.test.ts:52:63 expected +0 to be 21`                                           | 5/5 pass  |
| M19                  | `set-less-copies.test.ts:30:47 expected true to be false`                              | 4/4 pass  |
| M02                  | `set-value.test.ts:91:27 expected -20 to be 60`                                        | 6/6 pass  |
| M03                  | `set-value.test.ts` :63, :76, :91                                                      | 6/6 pass  |
| M04                  | `set-value.test.ts` :76, :91                                                           | 6/6 pass  |
| M08 (upgrades suite) | 2 of 1192: `set-value.test.ts:125:18` (new), `rank_set_lost_thresholds.test.ts:121:59` | 1192 pass |
| M13 (upgrades suite) | 2 of 1192: `rank_set_commit_breaks.test.ts:190:3` (new), `:168:3`                      | 1192 pass |

- Each of the 6 fix commits type-checks on its own (`git archive` into a
  copy, `npm run -s type-check`, rc=0 each).
- In the fork at `eb0c8155d`, each with v22.23.2, all rc=0: `npx oxfmt .
--check`, `npm run -s lint`, `npm run -s type-check`, and `npx vitest run
ui/features/upgrades` (1192 passed).
- A grep of the 44 changed fork files for main-repo wording (ticket-id
  patterns, `known limit`, `\bZ\b`, `owner`, `ADR`, `ticket`,
  `packages/core`, `.scratch`, `docs/plans`) found 0 hits.
- `node --version; pnpm verify` in the main worktree with the lock at
  `eb0c8155d`: v22.23.2, rc=0, ran in full.
  `fork tests check ok at fork commit eb0c8155d4e9: vitest run, whole suite
(Test Files  377 passed (377); Tests  3164 passed (3164)); test-locales.mjs
passed`, `gates: 1528 ran, 0 skipped`. Layout gate:
  `layout: skipped -- the fork's built dist/ is absent`. That gate can skip
  without blocking (`docs/workflow.md` § The loop step 5), and this branch
  changes no tab source.

## Merge-ready and the base

`scripts/check_merge_ready.py` `read_changes` diffs against the merge-base
with `dev`. While `feat/engine-cleanup-step1` is unmerged, that diff also
holds the clean-up's own files from `580a6bce`, which belong to the
clean-up's review, not this one. The order that keeps each review over its
own range:

1. Merge `feat/engine-cleanup-step1` into `dev`.
2. Merge `dev` into `feat/engine-tests-move` and re-pin if the fork moved.
3. Run `pnpm merge-to-dev --check-only` from this pair.

`node --version; pnpm merge-ready` in the pair, as things stand: v22.23.2,
rc=1. `disposition rows: 23 parsed of 23 row-shaped lines in 1 section(s)`.
It fails on only the two `open` rows (P3, S5-prov), and that failure is
correct until they are fixed. `changed vs dev merge base: 25 file(s)`
includes the clean-up's files. Five open tickets are listed as advisory, and
none bears on this branch:

- 165 and 351 match `wowsims-fork-parity.test.ts`, which only the clean-up
  changes.
- 563 is about Stop aborting sims in the tab.
- 795 is about verify failing under load, with no test failing.
- 841 is a false sentence in `known-traps.md` about "Took". This branch
  changes only a comment in `make-mock-fixtures.ts`, not the `durationMs`
  it writes.

## Findings

- **A1 (medium, adversarial) / P1 (medium, spec).** Deleting RS-3 left the
  item score's random-suffix line (`model/item_ep.ts:29`) untested. A mutant
  that drops the suffix passed all 1185 upgrades tests.
- **P2 (low-medium, spec).** The strengthen report said all smaller findings
  were fixed. The quality review's rec 4 was not done: a direct
  `clearsSameGearNoise` test, the other three `netInflation` terms, and a
  second check each for M08 and M13.
- **P3 (low, spec).** ADR-0035:649 runs `-t "536"`, which now matches only
  536-X. 536-A to 536-J live in the fork's `model/engine/set-potential.test.ts`.
- **S5 (medium, standards) / P4 (low, spec).** Main docs and comments point
  at cases that moved and lost their ids:
  - `docs/set-bonus-fixture-derivations.md`: 52 of its 63 case ids.
  - `packages/core/test/fork-set-net.test.ts` comments at :153, :186, :473
    and :1783.
  - `docs/fork-provenance/engine.md:424, 450-452`: about 30 ids, of which
    only 512-N, 476-D and 863-L are still in the main file.
  - ADR-0034:52 and ADR-0035:64 point at the derivations doc.
- **P5 (low, spec) / S2 (low, standards).** A fork test name ended "(known
  limit d)", a main-repo ADR reference.
- **S1 (medium, standards).** "Z", the main repo's name for the
  sum-of-singles estimate, appeared in a fork test name and in five comments.
- **S3 (low, standards).** Scenario constants were named after ticket case
  ids (`R_`, `PS_`, `SR_`, `PC_`, `SN_`, `SB_`, `SD_SCENARIO`; `'V6' | 'V7'`).
- **S4 (low, standards).** Five fork comments talked about things only the
  main repo has: the owner's demo row, the parity harness, C5, the live sweep,
  and a bare `progress.ts:60-67`.
- **S6 (low, standards).** `TH_OVER_MALORNE_POOL` and `TH_FOUR_IDS` were
  exported, but nothing in the fork used them.
- **D1 (low, domain).** `meta-repair-rules.test.ts:99-100` said "blue 2";
  the counts are blue 3. The expected values were right.
- **D2 (low, domain note N5).** The feral skeleton had the owner's potion
  (22832) and Greater Drums, not the preset's values. Both were inert for
  the model sim.
- **Spec N1.** A test name ended "— Σown − Δ branch".
- **Domain N1, N2, N4.** Comments did not say that the Stone of Blades is
  jewelcrafter-only, that "stat 35" is MP5, or that Justicar 29074 is
  Greaves.
- **Spec N2.** Rec 5's tighter tolerance was not done.
- **Spec N5.** Nine fork commit subjects are over 50 characters; the longest
  is 73.
- **Spec N6.** The draft main commit message did not mention the deletions.
- **Adversarial N1.** The slowest test that relies on vitest's 5 s default
  took 2.7 s on 2 cores under heavy load.
- **Standards N2.** The new `testing/database_mock.ts` duplicates inline
  copies in 4 older fork tests, which this branch leaves as they were.

## Disposition

| ID          | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                       |
| ----------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1          | Adversarial | fixed       | Fork `e860397b0`, `item_ep.test.ts`. Under the mutant it fails with `expected +0 to be 21`; on the real code it passes (fix check above).                                                                                                                           |
| P1          | Spec        | fixed       | Same as A1.                                                                                                                                                                                                                                                         |
| P2          | Spec        | fixed       | Fork `9d2ac02a8`. M19, M02, M03 and M04 each fail a new test, and M08 and M13 each now fail two tests (fix check above).                                                                                                                                            |
| P3          | Spec        | open        | Not fixed. The worker sent to fix it was stopped by Anthropic's safeguards before it made any edit (`git status` unchanged), and the session was told not to do that work itself. The edit: point the command at the fork's `model/engine/set-potential.test.ts`.   |
| S5-derivs   | Standards   | fixed       | `docs/set-bonus-fixture-derivations.md`: header and a `Test:` line per case. A script checked 77 pointers with 0 bad, and the fix check sampled 10 by hand. This also fixes what ADR-0034:52 and ADR-0035:64 point at.                                              |
| S5-comments | Standards   | fixed       | `packages/core/test/fork-set-net.test.ts`: comment-only edits (the fix check compared the code lines with comments stripped).                                                                                                                                       |
| S5-prov     | Standards   | open        | `docs/fork-provenance/engine.md:424, 450-452` is not fixed, for the same reason as P3. The edit: name the fork test files for the ids that moved.                                                                                                                   |
| P4          | Spec        | fixed       | Same as S5-derivs.                                                                                                                                                                                                                                                  |
| P5          | Spec        | fixed       | Fork `7b63f7f5a`: "two set rings key to one slot, so their 2pc is out of reach".                                                                                                                                                                                    |
| S2          | Standards   | fixed       | Same as P5.                                                                                                                                                                                                                                                         |
| S1          | Standards   | fixed       | Fork `7b63f7f5a`: "the sum-of-singles estimate" in the name and the five comments.                                                                                                                                                                                  |
| S3          | Standards   | fixed       | Fork `7b63f7f5a`: descriptive constant names; `incrementScenario` takes `'gauntlets-in-pool' \| 'gauntlets-worn'`.                                                                                                                                                  |
| S4          | Standards   | fixed       | Fork `7b63f7f5a`. The fix check's grep of all changed fork files found 0 hits.                                                                                                                                                                                      |
| S6          | Standards   | fixed       | Fork `4c0831cca`. `git grep` found no users.                                                                                                                                                                                                                        |
| D1          | Domain      | fixed       | Fork `b7be18d94`. In db.json, Sovereign is purple and Jagged is green, so the counts are red 2, yellow 2, blue 3.                                                                                                                                                   |
| D2          | Domain      | fixed       | Fork `eb0c8155d`: potion 22838, as in the upstream preset, and no drums. The upgrades suite passes (1192).                                                                                                                                                          |
| Spec-N1     | Spec        | fixed       | Fork `7b63f7f5a`: "a worn Malorne 2pc that a package takes from three pieces to one is valued at its model bonus".                                                                                                                                                  |
| Domain-N1   | Domain      | fixed       | Fork `b7be18d94` (N1 and N2) and `7b63f7f5a` (N4).                                                                                                                                                                                                                  |
| Spec-N2     | Spec        | wontfix     | A tighter tolerance changes what the moved tests accept. The move kept every assertion as it was, and no surviving mutant is one that a tighter tolerance would catch (the quality review judged the 3 strict survivors, M20, M22 and M26, practically equivalent). |
| Spec-N5     | Spec        | wontfix     | The subjects are imperative and plain, just long. Shortening them means rewriting 21 unpushed commits and every sha that the lock's history and the reports cite.                                                                                                   |
| Spec-N6     | Spec        | fixed       | The commit message (`.scratch/agent-reports/2026-11-27-engine-tests-move-commit-msg.txt`) names the deletions.                                                                                                                                                      |
| Adv-N1      | Adversarial | wontfix     | Measured, not predicted: 2.7 s against a 5 s limit on 2 cores at load 23. A GitHub runner was not tried.                                                                                                                                                            |
| Std-N2      | Standards   | wontfix     | The 4 older tests are outside this branch's range, and changing them would widen the upstream PR.                                                                                                                                                                   |

## Notes

- Standards N1: about 15 exports in the new `testing/` files are used only
  inside their own file. This is harmless.
- Standards N8: `pnpm pointers refs` exits 1 on a deleted file ("missing or
  unreadable"), so the deleted paths were searched with `git grep` instead,
  which found no live pointer.
- Domain N3: the brute-force oracle shares the engine's rule functions. It
  checks the search, not the rules; the literal cases in
  `meta-repair-rules.test.ts` check the rules.
- Adversarial N3: `docs/agents/known-traps.md` also fixes an unrelated stale
  list of test files. The fix is true.
- `pnpm verify` skipped the layout gate because the fork's `dist/` is
  unbuilt. This branch changes no tab source.
