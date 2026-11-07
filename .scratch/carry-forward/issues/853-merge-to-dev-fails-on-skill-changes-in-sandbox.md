Status: open
Type: process
Origin: merge of `feat/452-reword-and-close` into `dev`, 2026-11-07
Blocks: none
Blocked by: none
Related: 810, 452

# An agent cannot merge a branch that changes `.claude/skills/` into dev

## What an agent sees

`pnpm merge-to-dev feat/452-reword-and-close`, run by an agent from the
`dev` worktree, passed every gate (verify "1596 ran, 0 skipped",
merge-ready ok) and then failed at its last step with rc 128:

```
error: unable to unlink old '.claude/skills/sme-rank-review/SKILL.md': Read-only file system
```

The agent sandbox makes `.claude/skills/` read-only in every checkout
(the session's `denyWithinAllow` list names
`<worktree>/.claude/skills`), so `git merge` cannot write a branch's
skill change into the `dev` worktree. The failed merge left nine changed
files and four new files of the branch in the `dev` worktree, which the
agent had to restore by hand. The owner then ran the same command in a
terminal outside the sandbox, and it merged (`0cd6a7fc`).

`.claude/hooks/` is in the same list (hypothesis, untested: a branch that
changes a hook fails the same way).

## Done when

Either an agent can merge such a branch, or `merge-to-dev` checks before
it runs the gates whether the merge writes a path the current process
cannot write, and stops there with a message that names the path and
says to run the command outside the sandbox.
