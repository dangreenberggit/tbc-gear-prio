# Pre-merge review — chore/733-gate-runs-dev-copy

Reviewed range: `e0958bfb2406b5106b03e94286afa4e466125106..2e7e373232847fe5a17d6ba3e784ab701892df3f`

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
| Q2  | S3: no check function in `scripts/check_merge_to_dev.py` over about 45 lines.                                |
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

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                               |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `07da3aed`: `_merge_base` runs `git merge-base refs/heads/dev <branch>`, and the no-branch form loads `refs/heads/dev:scripts/check_merge_ready.py`. Check `check_a_tag_named_dev_does_not_move_the_merge_base` (both forms); it fails with the short name restored.                                                        |
| A2  | Adversarial | fixed       | `07da3aed`: `check()` refuses a review file that `git check-ignore` reports. Check `check_an_ignored_review_file_does_not_count` (a real named run); it fails with the refusal removed.                                                                                                                                     |
| A3  | Adversarial | wontfix     | Both forms run branch code anyway (`pnpm verify`, its gates), so turning hooks off for the merge of dev into the branch would not stop code written to get around the door. `bbebe5cb` states this limit in the `merge_to_dev.py` docstring and the ticket.                                                                 |
| A4  | Adversarial | fixed       | `07da3aed`: `check_real_named_run_runs_devs_copy_after_merging_dev` (a real run with dev ahead: refused and dev not moved, then merged with the branch's tree) and `check_ack_open_blockers_reaches_devs_copy`. Each fails under its mutant (named-form call skipped; flag dropped).                                        |
| S1  | Standards   | fixed       | `07da3aed`: `_scratch_env()` drops every `GIT_*` variable for the throwaway repos. With `GIT_DIR=/nonexistent/.git` set, the checks pass; with the clearing removed, they fail.                                                                                                                                             |
| P1  | Spec        | wontfix     | `pnpm merge-ready` never matched `pnpm merge-to-dev --check-only`: it skips verify and the layout gate (`package.json`: `python scripts/check_merge_ready.py`). The line offers a lighter check, not the same one. The owner may still want to name the difference; the proposed text is in the dispatching agent's report. |
| P2  | Spec        | defer       | `.scratch/carry-forward/issues/734-product-files-list-uses-the-branchs-own-gate.md`                                                                                                                                                                                                                                         |
| Q1  | Standards   | fixed       | `d3d7bcb3`: `_stub_repo_problems` runs git with `_scratch_env()` too.                                                                                                                                                                                                                                                       |
| Q2  | Standards   | fixed       | `07da3aed` split the check into five; the longest is 42 lines (`d3d7bcb3` measured).                                                                                                                                                                                                                                        |
| Q3  | Standards   | fixed       | `d3d7bcb3`: `merge_ready_at`; `grep -rn dev_merge_ready scripts` prints nothing.                                                                                                                                                                                                                                            |
| Q4  | Standards   | fixed       | `d3d7bcb3`: one `kept_note`.                                                                                                                                                                                                                                                                                                |
| Q5  | Standards   | fixed       | `d3d7bcb3`: the full statement is in "Which copy of the gate code runs"; step 4 and the `TOOLING_PATHS` comment point to it.                                                                                                                                                                                                |
