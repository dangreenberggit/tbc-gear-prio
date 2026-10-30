Status: closed
Type: process
Origin: docs/reviews/chore-731-tooling-review-exemption.md (round 1, A3)
Blocks: none
Blocked by: none
Related: 731

# The merge gate judges a branch with the branch's own copy of its code

## What happens

`pnpm merge-to-dev` loads and runs the branch's own
`scripts/check_merge_ready.py` (`scripts/merge_to_dev.py:73` and
`:375`, as the round 1 adversarial axis reports). A branch can edit that
copy and pass its own gate.

The adversarial axis built this case in a throwaway repo: a branch added
`packages/` to `TOOLING_PATHS`, removed the gate file from `GATE_PATHS`,
and edited `packages/x.ts`. The branch's copy printed
`review not required`, rc=0. Dev's copy of the script listed
`packages/x.ts` and `scripts/check_merge_ready.py` as product files for
the same branch.

This gap is older than branch `chore/731-tooling-review-exemption`: any
branch could already edit the gate to drop the review requirement. The
ticket 731 proposal records it under "Limits of the prototype"
(`.scratch/agent-reports/2026-10-28-general-task-731-exemption-proposal.md`
in the main checkout). Ticket 731 makes the gap matter more, because a
branch that the gate counts as tooling now merges with no review file.

## What would fix it

In named mode, have `scripts/merge_to_dev.py` work out the branch's
product files with `dev`'s copy of the module, before it runs the
branch's gates. Hypothesis, untested: loading the module from
`git show dev:scripts/check_merge_ready.py` is enough.

## Done when

- A branch that edits `TOOLING_PATHS` or `GATE_PATHS` and a product file
  is refused when it has no review file.
- A test in `scripts/check_merge_to_dev.py` or the
  `check_merge_ready.py` self-test shows it.

## Resolution

Fixed in `tbc-gear-prio@de4e383a`. `scripts/merge_to_dev.py` now runs
dev's committed copy of `scripts/check_merge_ready.py` on the branch
(`merge_ready_at`). It loads the text with `git show <dev>:<path>` and
runs it with `__file__` set to the branch checkout's path, so the copy
reads the branch's tickets and review file. The branch's own copy still
runs too, and both must pass.

- Named form (`pnpm merge-to-dev <branch>` from the folder on dev): the
  caller is dev's copy of `merge_to_dev.py`, and it runs dev's copy of
  the check, at dev's tip, before it starts the branch's own gates. A
  branch cannot edit this call away.
- No-branch form (`pnpm merge-to-dev` from the branch's checkout): the
  branch's own `merge_to_dev.py` makes the same call, against the local
  `dev` ref. A branch that edits only `check_merge_ready.py` is refused
  (`check_editing_only_the_gate_cannot_skip_devs_copy` in
  `scripts/check_merge_to_dev.py`). A branch that also edits
  `merge_to_dev.py`, `gate_copy.py` (which holds `merge_ready_at`), or the
  `merge-to-dev` line in `package.json` can skip the call in this form. No
  code change can close that: in this form every line that runs comes from
  the branch.
- `pnpm merge-ready` runs the checkout's copy and then dev's copy, and
  fails if either fails (`check_merge_ready_runs_devs_copy` and
  `check_merge_ready_needs_both_copies_to_pass` in
  `scripts/check_merge_to_dev.py`). It skips `pnpm verify` and the layout
  gate, so it is a preview, not the door. It has the no-branch form's
  limit: a branch that edits `main()` in its own `check_merge_ready.py`
  can skip dev's copy.
- Both forms also run code from the branch: `pnpm verify`, its gates,
  and its git hooks (in the named form, the merge of dev into the branch
  runs the branch's `.githooks/` before dev's check). The door stops a
  branch that changes the gate's rules. It does not stop code in the
  branch written to get around it (review round 1, A3).

Review round 1 (`docs/reviews/chore-733-gate-runs-dev-copy.md`) found
two older ways past the check, fixed in `tbc-gear-prio@07da3aed`: a tag
named `dev` moved the merge base (the check now names `refs/heads/dev`),
and a review file that an ignore rule hides from git counted as present
(the check now refuses it).

### A branch that changes the gate itself

The choice: such a branch always needs a review file, and both copies
must accept it. Dev's `GATE_PATHS` lists the gate files, so dev's copy
counts them as product files whatever the branch's copy says. The branch
stays checkable: dev's copy reads the branch's own review file and
tickets. If a branch changes the review-file or ticket format in a way
dev's copy rejects, that branch cannot pass the door. Split such a
change: first teach the gate to accept the new format, merge that, then
start writing the new format on a later branch.

Verified by: `python scripts/check_merge_to_dev.py` (rc 0, 13 checks,
including `check_branch_cannot_exempt_itself_by_editing_the_gate`) at
`tbc-gear-prio@de4e383a`. On a throwaway repo, a branch adds `packages/`
and `scripts/` to `TOOLING_PATHS`, takes `check_merge_ready.py` and
`merge_to_dev.py` off `GATE_PATHS`, and edits `packages/x.ts`, with no
review file. Its own copy prints `review not required`. Both forms with
`--check-only --no-verify` now print `missing review` and exit non-zero.
A second branch also makes its own `merge_to_dev.py` skip dev's copy;
the named form still refuses it. With a review file, both forms pass.
With dev's `merge_to_dev.py` (before the fix) in place, the check fails
on all three refusal cases (rc 0 each). Three mutants each fail it:
skipping the call in the named form, skipping it in the no-branch form,
and loading the branch's copy in place of dev's.

At `tbc-gear-prio@07da3aed` the same command gives rc 0 with 17 checks.
The new checks cover a real named run with dev ahead of the branch,
`--ack-open-blockers`, a tag named `dev` and an ignored review file.
Each of seven mutants fails it: the three above, dropping
`--ack-open-blockers` on the way to dev's copy, the short `dev` name in
`git merge-base`, removing the ignored-review-file refusal, and keeping
the `GIT_*` variables in the throwaway repos.
