Status: open
Type: task
Origin: docs/reviews/fix-unpair-rerun.md
Blocks: none
Blocked by: none

# Gaps in how unpair clears its mark after a failed run

Round 2 (the last round) of the review of `fix/unpair-rerun` found these in
the fix for round 1's A1. The review stopped at its two-round cap, so they
are open here. Line numbers are `scripts/worktree_pair.py` at 84ebc0e7.

- **R1 (minor)** No check covers the code in `unpair` that clears the mark
  after a `Refusal` (lines 889-896). With the clearing lines replaced by
  `pass`, all 27 checks in `scripts/check_worktree_pair.py` still pass
  (round 2 reviewer's mutation run). No live test runs that path either.
- **R2 (low)** Only `Refusal` is caught. An `OSError` from `shutil.copy2` in
  `keep_run_logs`, or a Ctrl-C, leaves the mark while both halves are still
  registered, which `docs/agents/paired-worktrees.md` now says does not
  happen. The `.git`-folder guard limits the harm. From reading the code;
  hypothesis, untested.
- **R3 (low)** The `except Refusal` block calls `worktrees()`, which can
  raise its own `Refusal`; the user then sees git's error and loses the
  original message (held files, rerun command). Hypothesis, untested.
- **R4 (nit)** The fallback cause in `delete_folder` says "The line above
  gives the reason" even when there is no "The delete said:" line.
- **R5 (nit)** No check covers the `--force` suffix of the rerun command
  (round 1 A2) or the non-lock branch of the failed-delete message (A6).
- **R7 (nit)** `scripts/check_worktree_pair.py` sets `procs[5]["Created"]`
  by list position, and one `delete_folder` call passes a pair name where
  the parameter is now a rerun command.

## Done when

Each item above is fixed with a check in `scripts/check_worktree_pair.py`
that fails with the fix undone, or is closed by the owner.
