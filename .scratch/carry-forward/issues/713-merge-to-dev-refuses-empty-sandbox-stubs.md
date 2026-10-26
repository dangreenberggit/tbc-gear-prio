Status: open
Type: task
Origin: owner's `pnpm merge-to-dev` run of feat/712-stage-gate-loops, 2026-10-26
Blocks: none
Blocked by: none

# `pnpm merge-to-dev` refuses the empty stub files that agent commands leave

## What happens today

On 2026-10-26 the owner ran `pnpm merge-to-dev` in their own terminal,
from the main checkout on feat/712-stage-gate-loops. It refused with
`FAIL: working tree not clean — commit or stash first`
(`scripts/merge_to_dev.py:481`, no-branch mode). The only untracked
entries were 17 empty (0-byte) regular files:

- `.bash_profile`, `.bashrc`, `.gitconfig`, `.gitmodules`, `.idea`,
  `.mcp.json`, `.profile`, `.ripgreprc`, `.vscode`, `.zprofile`, `.zshrc`
- `.claude/commands`, `.claude/loop.md`, `.claude/output-styles`,
  `.claude/routines`, `.claude/settings.local.json`, `.claude/workflows`

These are the same 17 paths as ticket 709. The agent bash sandbox
(bubblewrap) creates an empty file at each denied path that does not exist,
to use as a mount point, and mounts `/dev/null` over it. The files stay on
disk after the command ends, so they come back after any agent command runs
in the folder. Inside the sandbox they look like devices:

    git -C <main checkout> status --porcelain        # 17 `??` lines
    stat -c '%n %F' .bashrc                          # character special file
    findmnt -T .bashrc                               # none[/null] devtmpfs ro

Ticket 709 (closed, `tbc-gear-prio@fcb8de41`) made the clean-tree checks
skip untracked devices (`is_device`, `real_changes`,
`scripts/merge_to_dev.py:135-158`). That covers a run inside the sandbox.
In the owner's terminal there is no mount, so the same paths are plain
empty files and the check counts them. The owner worked around it by
deleting every empty untracked file and running the merge again.

The same `has_changes` check also guards the branch worktree and its fork
in named-branch mode (`worktree_problem`), so that mode refuses the same
way when stubs exist there.

## Fix direction

Extend `real_changes` so that an untracked (`??`) entry also holds no work
when it is an empty regular file at one of the known stub paths above.
Keep the device rule from 709 as it is.

### Why only the known names, and not every empty untracked file

An empty file can still be work in this repo: its existence is the change.
The repo tracks three empty files today:

    git ls-files -z | xargs -0 -I{} sh -c 'test -f "{}" && test ! -s "{}" && echo "{}"'
    # docs/reviews/.gitkeep
    # packages/core/test/fixtures/.gitkeep
    # .scratch/set-bonus-value/loop-103-106/payload-dump.stderr.log

If a branch adds a new `.gitkeep` and forgets to commit it, a rule that
skips every empty untracked file would let the merge go ahead without it,
and nothing would say so. A name list fails the other way: if Claude Code
adds a new stub path, the merge refuses again with the same message. That
failure is loud and safe, and the fix is one line in the list.

A device check needs no list because git cannot track a device (709). An
empty regular file can be tracked, so the name is the only thing that tells
a stub from a new empty file outside the sandbox.

Not done: adding the 17 names to `.gitignore`. That would also quiet the
other scripts that read `git status`, but it would hide a real `.mcp.json`
or `.gitmodules` that a branch adds on purpose, with content, and the 709
fix chose not to depend on ignore rules.
