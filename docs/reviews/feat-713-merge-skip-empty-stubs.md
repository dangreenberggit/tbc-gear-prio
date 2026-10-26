# Pre-merge review — feat/713-merge-skip-empty-stubs

Reviewed range: `a2aa244804a48707d847d7a2389f77185d7dd39f..bc17638b1d05db08efefbf833d516d6f94150186`

Dispatch (round 1): small-change lane. `git diff --shortstat dev...HEAD`
gave `3 files changed, 105 insertions(+), 11 deletions(-)`, and
`git diff --name-only dev...HEAD` listed
`.scratch/carry-forward/issues/713-merge-to-dev-refuses-empty-sandbox-stubs.md`,
`scripts/check_merge_to_dev.py` and `scripts/merge_to_dev.py`: none under
`data/`, `vendor/` or `packages/core/src/`, none `.generated.`. `codex` is
not on `PATH`, so one fresh `general-task` agent on Opus ran the
adversarial brief and the `code-review` Standards and Spec checks itself.
Domain axis skipped: the diff has no game-domain content (a git
clean-tree check in a merge script).

## Adversarial

**A1.** The checks never ran `has_changes` or the device branch of
`holds_no_work`. The reviewer copied `scripts/` to a temp folder and made
two mutations: deleting `if is_device(path): return True` (undoes the 709
fix) and putting `has_changes` back to `lambda p: is_device(cwd / p)`
(undoes the 713 fix). Both still gave `merge_to_dev.py checks ok (11
checks)`, rc 0. Effect: a later edit could undo either fix and pass
`pnpm verify`; the merge would then refuse loudly, and no work is lost.

Silent-failure hunt: nothing found. The reviewer ran the real
`has_changes` at `bc17638b` in a scratch git repo with `.claude/` tracked:
stubs only gave False; adding an empty `notes.md`, one byte in `.bashrc`,
a symlink `.zshrc` to `/dev/null`, an empty `sub/.bashrc`, or a modified
tracked file each gave True. None of the 17 paths is tracked or ignored
in the pair (`git ls-files`, `git check-ignore -v`). Not examined:
Windows, and a run inside the sandbox with real device stubs.

## Domain

Skipped: no game-domain content.

## Standards + Spec

**S1.** The `real_changes` docstring restated its list comprehension
after the "why" moved to `holds_no_work` (AGENTS.md "Comment policy").

**P1.** The ticket's "Limit" paragraph said pairs are not affected by the
`?? .claude/` case, but `worktree_problem` also runs `has_changes` on the
pair's fork worktree, which tracks nothing under `.claude/`
(`git -C <pair>/vendor/tbc-new-fork ls-files .claude` prints nothing).

Otherwise the spec is met: the 17 names in `SANDBOX_STUBS` match the
ticket's list, the 709 device rule holds for every path, only empty
regular files at the listed paths are skipped, and `.gitignore` is
unchanged.

## Fixes after round 1

- A1: `54726327` adds `check_clean_tree_check_skips_stubs_in_a_real_repo`
  (runs `has_changes` on a temp git repo with the 17 stubs, then with an
  empty `notes.md`) and a `/dev/null` row for `holds_no_work`.
  `c61d478b` clears `GIT_*` variables around that check, because
  `pnpm verify` runs from the pre-push hook (hypothesis, untested: that
  git exports `GIT_DIR` to that hook; the check passes with
  `GIT_DIR=/nonexistent-dir GIT_WORK_TREE=/nonexistent-dir` set). Both
  mutations above now fail the check script: the first with "a device
  must hold no work at any path (ticket 709)", the second with
  "has_changes counts the 17 empty sandbox stubs as work".
- P1: `fe33122f` rewords the ticket's Limit paragraph to name the fork
  worktree.
- S1 (code-quality pass, one fresh `general-task` agent): `8d3a1091`
  replaces the docstring with why the filter is a parameter.
  `pnpm verify` rc 0 after it.

Reviewed range: `bc17638b1d05db08efefbf833d516d6f94150186..8d3a1091a59cbae236f6d9414bcaccb16f4a28eb`

## Focused check (round 2)

Fork range: none. `git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
exits 0, so the branch never moves the fork pin.

One fresh `general-task` agent on Opus ran the four checks over
`bc17638b..8d3a1091`. All four pass, and it reported no findings.

1. Conditions hold. Each commit names its finding: 54726327 and c61d478b
   (A1), fe33122f (P1), 8d3a1091 (S1). The only change outside tests and
   docs is the `real_changes` docstring that S1 cites. The fork pin does
   not move.
2. Each commit changes only what its finding asks. fe33122f also records
   the A1 test in the ticket's Resolution; the agent confirmed that text.
3. The agent re-made both A1 mutations on a copy of `scripts/`: removing
   the device line fails with "a device must hold no work at any path
   (ticket 709)", and the old `has_changes` lambda fails with "has_changes
   counts the 17 empty sandbox stubs as work"; both rc 1.
4. `python scripts/check_merge_to_dev.py` prints `merge_to_dev.py checks
ok (12 checks)`, rc 0.

On c61d478b: in a throwaway linked worktree with a logging pre-commit
hook (git 2.34.1), the hook saw an absolute `GIT_DIR`. The unguarded
54726327 check, run from that hook, acted on the worktree's git dir,
re-entered the hook until stopped, and left the index holding only its
own file. The guarded version passed under the same hook. The pre-push
case is hypothesis, untested (agents cannot push).

Note, not a finding: the scratch repo's `git commit` does not override a
global `core.hooksPath` or `commit.gpgsign`; either would raise a loud
`CalledProcessError`, not a silent pass. Neither is set on this machine
(`git config --global --get-regexp '^(commit\.gpgsign|core\.hookspath|init\.templatedir)'`
rc 1).

## Code quality

| ID  | Finding                                    | Pass       |
| --- | ------------------------------------------ | ---------- |
| S1  | `real_changes` docstring restated the code | `8d3a1091` |

## Summary

Ticket 713 is fixed: the merge clean-tree check skips an empty regular
file at one of the 17 sandbox stub paths, keeps the 709 device rule, and
still counts every other untracked, modified or staged entry. Round 1
(small-change lane) found A1 (test gap), S1 (docstring) and P1 (ticket
wording); all three are fixed, and the round-2 focused check passed with
no findings. `pnpm verify` rc 0 after the last fix.

Tickets: this branch filed 0 (ticket 713 was filed on `dev` at
`a2aa2448`, the merge base) and closed 1 (713).

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                        |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | 54726327 and c61d478b: `has_changes` run on a temp git repo, a `/dev/null` row, and `GIT_*` cleared around the check |
| S1  | Standards   | fixed       | 8d3a1091 (code-quality pass): docstring says why the filter is a parameter                                           |
| P1  | Spec        | fixed       | fe33122f: ticket 713 Limit paragraph names the fork worktree                                                         |
