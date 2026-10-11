Status: open
Type: task
Origin: docs/reviews/fix-unpair-rerun.md
Blocks: none
Blocked by: none

# Unpair passes the rerun hint through remove() into delete_folder()

## What is wrong

In `scripts/worktree_pair.py`, `unpair` builds the rerun command
(`pnpm wt:unpair <name>`, with `--force` when the run had it) and passes it
through `remove(repo, path, listed, force, rerun)` into
`delete_folder(path, rerun)`, only so that `delete_folder` can end its
failed-delete message with "then run `<rerun>` again". Review finding S6
(Standards, code smell: a parameter that only travels through) on
`fix/unpair-rerun`.

## Why it was not fixed on that branch

The code-quality pass (commit 84ebc0e7) left it. The alternative it found
was a `Refusal` subclass raised by `delete_folder` and an `isinstance`
branch in `unpair`'s `except Refusal` block that appends the rerun line.
That is not simpler, and it would move the rerun line out of reach of
`check_locked_file_is_named_and_rerun_is_offered`, which calls
`delete_folder` directly; no check calls `unpair`, because it needs real
repos.

## Done when

Either a structure is found that drops the pass-through parameter and keeps
the rerun line under a check in `scripts/check_worktree_pair.py`, or the
owner rules that the parameter stays and this ticket is closed as
`wontfix`.
