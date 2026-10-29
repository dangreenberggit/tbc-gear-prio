# Pre-merge review — chore/733-gate-runs-dev-copy

Reviewed range: `e0958bfb2406b5106b03e94286afa4e466125106..2e7e373232847fe5a17d6ba3e784ab701892df3f`

Reviewed range: `2e7e373232847fe5a17d6ba3e784ab701892df3f..4a743b7f18f4a2301592a33414205cf176c80def`

The second line is the focused check (round 2) of the fixes for round 1's
findings: `## Focused check (round 2)`, at the end of this file.

Dispatch: round 1, full axes. `codex` is not on `PATH` (`command -v
codex` printed nothing), so each axis ran as a fresh `general-task`
agent on Opus, all three in one parallel batch: Adversarial, and the
`code-review` skill's Standards and Spec sub-agents. The branch is too
large for the small-change lane: `git diff --shortstat dev...HEAD` gave
4 files changed, 221 insertions, 11 deletions (232 lines, over the 150
limit). `git diff --name-only dev...HEAD` lists
`.scratch/carry-forward/issues/733-merge-gate-runs-the-branchs-own-copy.md`,
`scripts/check_merge_ready.py`, `scripts/check_merge_to_dev.py` and
`scripts/merge_to_dev.py`.

`python scripts/check_merge_ready.py --product-files` printed the three
scripts, so the branch is mixed. The axes reviewed the three scripts.
The other changed file is ticket 733, a verified close; it is not an
agent instruction, so `instruction-review` has nothing to read there,
and the Spec axis read the ticket as the spec.

The domain (SME) axis was skipped. The owner's words, as the
dispatching session quotes them: "pre merge review without the SME stuff
is fine (this is a different subject matter!)". The diff changes the
merge gate and has no game-domain content.

The adversarial axis was told to hunt first for any remaining way a
branch can pass the gate with its own edited gate code.

## Adversarial

The fix does what ticket 733 asks: a branch that edits only the gate's
lists is refused in both forms. The reviewer re-ran the fails-before run
and the three mutants in copies under `$TMPDIR` (`mut733.*`), plus a
fourth mutant (`__file__` pointing at the caller's folder); each failed
the check. Three ways remained to merge a product change with no
committed review file, each shown in a throwaway repo:

- **A1.** A local tag named `dev` moves the merge base, in both forms
  and in a real run. git resolves `refs/tags/dev` before
  `refs/heads/dev`, and `_merge_base` ran `git merge-base dev <branch>`
  (`scripts/check_merge_ready.py`, about line 630); the no-branch form ran
  `git show dev:` (`scripts/merge_to_dev.py:537`). With commit C1 editing
  `packages/x.ts`, C2 editing `docs/agents/foo.md` and `git tag dev C1`,
  dev's copy printed `review not required` and a real named run merged
  (`$TMPDIR/adv733.*`). Older than this branch.
- **A2.** A review file that an ignore rule hides from git counts as
  present. `check()` reads it from disk (`review.is_file()`, about line
  1112), and the clean-tree checks skip ignored files. With
  `docs/reviews/` in `.git/info/exclude` and an uncommitted review file,
  a real named run merged and dev's tree held no review file
  (`$TMPDIR/adv733b.*`). Older than this branch.
- **A3.** In a real named run, branch code runs before dev's check: the
  merge of dev into the branch runs the branch's `.githooks/` (the repo
  sets the relative `core.hooksPath=.githooks`). A `post-merge` hook ran
  before `=== merge-ready, by dev's copy` (`$TMPDIR/adv733c.*`). The
  docstring and the ticket said the named form's call "cannot be edited
  away", which is true of the call but not of its inputs.
- **A4.** The test ran only `--check-only`. The real-run order (merge dev
  into the branch, dev's copy, then the branch's `--gates-only`) and the
  passing of `--ack-open-blockers` to dev's copy were never run.

Checked and clean: `sys.path` (dev's copy imports only the standard
library), `ROOT`, `REVIEWS`, `CARRY` and default arguments (all bound
during `exec`, after `__file__` is set), and the layout-gate lock commit.
Unexamined: a `.git/dev` file and a remote named `dev` (both
hypothesis, untested; the A1 fix names `refs/heads/dev`, which neither
matches), and dev's copy raising (read only: the exception exits 1, and
the "keeps its commits" note is not printed).

## Domain

Skipped; see the dispatch note.

## Standards + Spec

### Standards

No hard breach of a documented standard. The comments say why, the
causal claims hold (`ROOT = Path(__file__).resolve().parents[1]` at
`scripts/check_merge_ready.py:59`), and none of the listed words appear.
Judgement calls:

- **S1.** The new throwaway-repo check did not clear the `GIT_*`
  variables, which `check_clean_tree_check_skips_stubs_in_a_real_repo`
  says hooks export; `pnpm verify` runs from the pre-push hook, so its git
  calls could reach the real checkout (hypothesis, untested by the
  reviewer).
- **S2.** Duplicated Code: the new nested `git` helper repeats the one in
  `_stub_repo_problems`.
- **S3.** The new check was about 100 lines with three scenarios; the
  file's other checks are under 45 lines.
- **S4.** Mysterious Name: `dev_merge_ready(rev, ...)` runs at any `rev`.
- **S5.** Duplicated Code: `"" if args.check_only else f" {kept}."`
  appears twice in `merge_named`.
- **S6.** Shotgun Surgery: the no-branch limit was written three times.

### Spec

What was asked for is done: both forms run dev's committed copy, the
ticket states the choice for a branch that changes the gate, and its
`Verified by:` line passes (`python3 -B scripts/check_merge_ready.py`
printed "no ticket closed on this branch without Verified by:
evidence"). The reviewer re-ran the fails-before run (rc=1, all three
refusal cases failing) and the branch-copy mutant. No scope creep.

- **P1.** `docs/workflow.md:77` reads "Check without merging: `pnpm
merge-to-dev --check-only` (or `pnpm merge-ready`)", while
  `pnpm merge-ready` now runs only the branch's copy. The branch proposes
  no text for that line.
- **P2.** `.claude/skills/pre-merge-review/SKILL.md:27` has the reviewer
  run the branch's own copy for `--product-files`. A branch that widens
  `TOOLING_PATHS` gets an empty list, skips its product review, and is
  then refused at the door. A gap older than this branch, not a false
  statement.

## Code quality

| ID  | Row                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------ |
| Q1  | S2: one way to run git in the throwaway repos of `scripts/check_merge_to_dev.py`.                            |
| Q2  | Standards                                                                                                    | fixed | `07da3aed` split the check into five, although its message names only A1, A2, A4 and S1 (round 2, R2-3); the longest is 42 lines, as the pass for `d3d7bcb3` measured. |
| Q3  | S4: rename `dev_merge_ready` to `merge_ready_at`.                                                            |
| Q4  | S5: one local `kept_note` for the two `die(...)` calls in `merge_named`.                                     |
| Q5  | S6: state the no-branch limit once, in "Which copy of the gate code runs"; the other two places point to it. |

## Summary

Round 1 found four adversarial findings (A1 to A4), six standards
findings (S1 to S6) and two spec findings (P1, P2). A1 and A2 are older
ways past the check, each a silent wrong result, so both were fixed on
this branch. A4 and S1 are a missing test and a test risk this branch
added; both were fixed. A3 and P1 are `wontfix` with the reasons in the
table. S2 to S6 went to one code-quality pass as Q1 to Q5. P2 is older
than this branch and is deferred to ticket 734.

Commits after round 1, each naming its findings: `07da3aed` (A1, A2, A4,
S1), `bbebe5cb` (A3), `d3d7bcb3` (Q1 to Q5), and the commit that adds
this table and ticket 734.

Not a review finding, noted by the dispatching agent: an ignored `.md`
file in `.scratch/carry-forward/issues/` would be read as a ticket in the
same way A2 read an ignored review file. No `defer` row can link such a
file today unless an ignore rule matches it (hypothesis, untested).

## Disposition

| ID   | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                    |
| ---- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Adversarial | fixed       | `07da3aed`: `_merge_base` runs `git merge-base refs/heads/dev <branch>`, and the no-branch form loads `refs/heads/dev:scripts/check_merge_ready.py`. Check `check_a_tag_named_dev_does_not_move_the_merge_base` (both forms); it fails with the short name restored.                                                             |
| A2   | Adversarial | fixed       | `07da3aed`: `check()` refuses a review file that `git check-ignore` reports. Check `check_an_ignored_review_file_does_not_count` (a real named run); it fails with the refusal removed.                                                                                                                                          |
| A3   | Adversarial | wontfix     | Both forms run branch code anyway (`pnpm verify`, its gates), so turning hooks off for the merge of dev into the branch would not stop code written to get around the door. `bbebe5cb` states this limit in the `merge_to_dev.py` docstring and the ticket.                                                                      |
| A4   | Adversarial | fixed       | `07da3aed`: `check_real_named_run_runs_devs_copy_after_merging_dev` (a real run with dev ahead: refused and dev not moved, then merged with the branch's tree) and `check_ack_open_blockers_reaches_devs_copy`. Each fails under its mutant (named-form call skipped; flag dropped).                                             |
| S1   | Standards   | fixed       | `07da3aed`: `_scratch_env()` drops every `GIT_*` variable for the throwaway repos. With `GIT_DIR=/nonexistent/.git` set, the checks pass; with the clearing removed, they fail.                                                                                                                                                  |
| P1   | Spec        | wontfix     | `pnpm merge-ready` never matched `pnpm merge-to-dev --check-only`: it skips verify and the layout gate (`package.json`: `python scripts/check_merge_ready.py`). The line offers a lighter check, not the same one. The owner may still want to name the difference; the proposed text is in the dispatching agent's report.      |
| P2   | Spec        | defer       | `.scratch/carry-forward/issues/734-product-files-list-uses-the-branchs-own-gate.md`                                                                                                                                                                                                                                              |
| Q1   | Standards   | fixed       | `d3d7bcb3`: `_stub_repo_problems` runs git with `_scratch_env()` too.                                                                                                                                                                                                                                                            |
| Q2   | Standards   | fixed       | `07da3aed` split the check into five; the longest is 42 lines (`d3d7bcb3` measured).                                                                                                                                                                                                                                             |
| Q3   | Standards   | fixed       | `d3d7bcb3`: `merge_ready_at`; `grep -rn dev_merge_ready scripts` prints nothing.                                                                                                                                                                                                                                                 |
| Q4   | Standards   | fixed       | `d3d7bcb3`: one `kept_note`.                                                                                                                                                                                                                                                                                                     |
| Q5   | Standards   | fixed       | `d3d7bcb3`: the full statement is in "Which copy of the gate code runs"; step 4 and the `TOOLING_PATHS` comment point to it.                                                                                                                                                                                                     |
| R2-1 | Round 2     | fixed       | `97667012`, after the round limit by the orchestrator's choice, with a short check (below). Check `check_a_tag_named_dev_does_not_pick_devs_gate_copy`: a tag `dev` at an old commit with a wider gate; the no-branch form must refuse with `missing review`. It fails with line 543 back to `merge_ready_at("dev", ...)`.       |
| R2-2 | Round 2     | fixed       | `97667012`, after the round limit by the orchestrator's choice, with a short check (below): the named form runs `git merge --no-edit refs/heads/dev`. Check `check_a_tag_named_dev_does_not_change_what_is_merged` (a real named run, tag `dev` at an old commit, the branch `dev` ahead); it fails with line 394 back to `dev`. |

## Focused check (round 2)

Range `2e7e3732..4a743b7f`; no fork range (`git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json` exits 0). Dispatch: one fresh `general-task`
agent on Opus, with the four checks.

### The four checks

1. Conditions 1 to 3: pass. `07da3aed` names A1, A2, A4 and S1;
   `bbebe5cb` names A3; `d3d7bcb3` names Q1 to Q5; `4a743b7f` changes
   only this file, ticket 734, `NEXT` and `map.md`, which the agent counted
   as ticket filing for the P2 row (`docs/agents/issue-tracker.md:22-23`).
   Every changed line outside tests and comments is at a place a fixed
   finding cites.
2. The diff changes only what each finding asks: pass.
3. Each new test asserts its finding: pass for A1 (`git merge-base`), A2,
   A4 and S1. The agent re-ran those mutants on copies under
   `$TMPDIR/r2-733/`; each made `check_merge_to_dev.py` exit 1. The
   unmutated copy with `GIT_DIR=/nonexistent/.git` gave rc 0, 17 checks.
   The exception is R2-1.
4. The tests the fixes touch pass: `python scripts/check_merge_to_dev.py`
   (17 checks, rc 0) and `python scripts/check_merge_ready.py --self-test`
   (43 checks, rc 0).

### Findings

- **R2-1 (not bookkeeping).** `scripts/merge_to_dev.py:543`: the
  no-branch half of the A1 fix (`merge_ready_at("refs/heads/dev", ...)`)
  has no test. With the short name `"dev"` put back, the check still
  passed 17 of 17. Trigger: a branch widens its gate and tags that commit
  `dev`; the mutant then loads the tag's widened copy and passes, while
  the real code refuses with `missing review` (`$TMPDIR/r2-733/probe.py
tagwiden`). The current check tags a commit whose scripts match dev's.
- **R2-2 (not bookkeeping; older than this branch; a loud failure).**
  `scripts/merge_to_dev.py:394`, `git -C <wt> merge --no-edit dev`, still
  uses the short name. With a local tag `dev` at an old dev commit and dev
  ahead of the branch, a real named run merges the tag, the gates check a
  tree without dev's newer commits, the merge into dev is made, and the
  run then fails with "dev's new tree differs ...": rc 1, but dev has
  moved (`$TMPDIR/r2-733/probe.py tagmerge`).
- **R2-3 (bookkeeping).** Q2's change is in `07da3aed`, whose message
  does not name Q2. Fixed: the Q2 row above now says so.

### Outcome

Round 2 reported two findings other than bookkeeping, so the review stops
under the skill's "Round limit": no further fix and no third round here.
R2-1 and R2-2 have no Disposition row yet; the owner decides what happens
next. Step 4 (`pnpm merge-to-dev --check-only`) was not run, as the round
limit says.

Afterwards the orchestrator chose to fix R2-1 and R2-2 in `97667012`, as
it did for 731, and had a fresh agent check only that fix: see "Short
check of the round 2 fixes" and the two Disposition rows.

## Short check of the round 2 fixes

Range `7c2a4ede..97667012` (one commit, `97667012`). Dispatch: one
`general-task` agent on Opus.

- **R2-2 fix.** `scripts/merge_to_dev.py:394` now runs
  `git -C <wt> merge --no-edit refs/heads/dev`, and the error text at
  line 398 names the same ref.
- **R2-1 test.** `check_a_tag_named_dev_does_not_pick_devs_gate_copy`
  tags `dev` at a commit with a wider gate and expects the no-branch
  `--check-only` run to refuse with `missing review`.
- **R2-2 test.** `check_a_tag_named_dev_does_not_change_what_is_merged`
  tags `dev` at the first commit, moves the branch `dev` ahead, and runs
  a real named merge. It expects rc 0, the branch `dev`'s old tip in the
  feature branch, and the same tree on both branches.

Commands and results:

- `python3 scripts/check_merge_to_dev.py`: rc 0, 19 checks.
- `python3 scripts/check_merge_ready.py --self-test`: rc 0, 43 checks.
- Mutant 1 (copy under `$TMPDIR/sc733/m1`, line 543 back to
  `merge_ready_at("dev", ...)`): rc 1. One failure, from the R2-1 test:
  "no-branch form with a tag named dev at a wider gate: want a refusal
  naming 'missing review'; rc=0".
- Mutant 2 (copy under `$TMPDIR/sc733/m2`, line 394 back to
  `merge --no-edit dev`): rc 1. Three failures, all from the R2-2 test:
  the run returned rc 1 with "dev's new tree differs", "the branch did
  not get the branch dev's tip merged in", and "dev's tree is not the
  branch's".
- No other short-name `dev` ref reaches git in either file. `_merge_base`
  uses `refs/heads/{integration}`, and the named form passes `dev_sha`.
  The no-branch form's `git checkout dev` (`merge_to_dev.py:583`) stays
  as it is. In a throwaway repo with git 2.34.1, a tag `dev` and a branch
  `dev` at different commits, `git rev-parse dev` gave the tag's commit,
  but `git checkout dev` printed "Switched to branch 'dev'" and left HEAD
  on the branch's tip. `git checkout refs/heads/dev` would detach HEAD.
  The other uses of `INTEGRATION_BRANCH` in `check_merge_ready.py` are
  message text or self-test setup in throwaway repos.

| ID  | Axis | Disposition | Ticket / note |
| --- | ---- | ----------- | ------------- |

No finding.

## Code check of the merge-ready change

Range `3d493648..5e394981` (commit `5e394981`, "Run dev's copy of the
gate in pnpm merge-ready"). Dispatch: one fresh `general-task` agent on
Opus, given the diff and the owner's intent. The fixes are in `8996a94d`.

The check found that `pnpm merge-ready` now refuses whenever dev's copy
refuses, for every flag and case it tried, unless the branch edits
`main()` in its own copy. It found one regression (C1) and six smaller
points.

- **C1 (P2).** With `merge_ready_at` in `check_merge_ready.py`, a branch
  that edited only that file could stub `merge_ready_at` and pass the
  no-branch `pnpm merge-to-dev --check-only`. At `3d493648` the same
  branch was refused.
- **C2 (P3).** The checkout's copy printed `merge-ready: ok` before dev's
  copy ran, and no closing verdict followed.
- **C3 (P3).** The comment in `main()` claimed that no edit to the
  branch's own copy could make merge-ready pass.
- **C4 (P3).** Three mutants survived: dev's copy given the current branch
  in place of `--branch`; a failure of the checkout's copy ignored; a
  missing local `dev` treated as a pass.
- **C5 (P3).** On `dev`, merge-ready asked for `docs/reviews/dev.md`
  instead of refusing `dev` by name as `merge-to-dev` does.
- **C6 (P3).** With `--branch` from another checkout, or `--review` at
  another path, merge-ready can pass where `merge-to-dev` refuses. Both
  flags existed before this branch.
- **C7 (P3).** Ticket 733 said `pnpm merge-ready` runs only the branch's
  copy, and that a branch editing only `check_merge_ready.py` is refused.

Commands and results after `8996a94d`:

- `python3 scripts/check_merge_to_dev.py`: rc 0, 23 checks.
- `python3 scripts/check_merge_ready.py --self-test`: rc 0, 43 checks.
- `TBC_VERIFY_WITHOUT_FORK=1 pnpm verify`: rc 0.
- Mutants, each on a copy of `scripts/` under `$TMPDIR/mut733`: dropping
  the dev-copy run, passing the current branch to dev's copy, ignoring
  the checkout's copy's failure, treating a missing `dev` as a pass,
  taking `merge_ready_at` from `check_merge_ready`, dropping the
  `dev`/`main` refusal, and dropping the `--review` or
  `--ack-open-blockers` pass-through. Each gives rc 1 with at least one
  failure.

## Disposition (merge-ready code check)

| ID  | Axis       | Disposition | Ticket / note                                                                                                                |
| --- | ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| C1  | Code check | fixed       | `merge_ready_at` moved to `scripts/gate_copy.py` (on `GATE_PATHS`); test `check_editing_only_the_gate_cannot_skip_devs_copy` |
| C2  | Code check | fixed       | `main()` prints a FAIL line naming dev's copy, or `merge-ready: ok (this checkout's copy and dev's copy)`                    |
| C3  | Code check | fixed       | comment now limits the claim to edits of the rules and points to "Which copy of the gate code runs"                          |
| C4  | Code check | fixed       | test `check_merge_ready_needs_both_copies_to_pass` kills all three mutants                                                   |
| C5  | Code check | fixed       | `main()` refuses `dev` and `main`; covered by the same test                                                                  |
| C6  | Code check | fixed       | comment in `main()` says that with `--branch` or `--review` the result can differ from the door's                            |
| C7  | Code check | fixed       | ticket 733 updated in `8996a94d`                                                                                             |
