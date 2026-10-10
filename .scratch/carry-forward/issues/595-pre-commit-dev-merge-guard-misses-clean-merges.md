Status: open
Type: task
Origin: docs/reviews/feat-merge-to-dev-arg.md (round 2, A13)
Blocks: none
Blocked by: none

# The pre-commit guard on merges into dev misses clean merges

## What is wrong

`.githooks/pre-commit` refuses a merge commit on `dev` unless
`TBC_ALLOW_DEV_MERGE=1` (lines 11-21). A clean `git merge --no-ff` does not
run `pre-commit`, so the guard fires only when a conflicted merge is
finished with `git commit`. AGENTS.md "Gates" says merges into `dev`
without `TBC_ALLOW_DEV_MERGE=1` "are refused by pre-commit".

Evidence: the round-2 adversarial reviewer installed a `pre-commit` that
exits 1 in a throwaway repo (`C:\Users\dgree\AppData\Local\Temp\mtd-adv2\hooktest`,
not kept) and a clean `git merge --no-ff` still succeeded with rc 0.
Re-run: in any temp repo, set `core.hooksPath` to a folder whose
`pre-commit` is `exit 1`, then `git merge --no-ff <branch>`.

## What to do

Decide whether the guard should also cover clean merges. Git runs a
`pre-merge-commit` hook for a clean merge that makes a commit (githooks(5));
a `.githooks/pre-merge-commit` that applies the same rule is one option
(untested). Then make AGENTS.md "Gates" match what the hooks do.
