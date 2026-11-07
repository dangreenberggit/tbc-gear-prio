Status: open
Type: process
Origin: merge attempt of `chore/fix-rule-review-bar` (worktree `.scratch/wt-fix-rule`, main checkout), 2026-11-05
Blocks: none
Blocked by: none
Related: 801, 709, 743

# pnpm install fails inside the agent sandbox, so an agent cannot set up a worktree

## What an agent sees

To fix the failed verify in ticket 801, an agent ran `pnpm install` in
`.scratch/wt-fix-rule` from a sandboxed Bash call. It failed:

```
ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK ... Read-only file system
```

## Why

- The main checkout's install uses the store at
  `/home/daniel/.local/share/pnpm/store/v11`
  (`grep -n storeDir node_modules/.modules.yaml` in the main checkout:
  line 759).
- In the agent sandbox that folder is not writable: `test -w
  ~/.local/share/pnpm/store` is false on 2026-11-05. The sandbox's write
  list includes `~/.npm` and `~/.cache`, but not `~/.local/share/pnpm`.
  The sandbox is set in the user-level Claude settings, not in this
  repo's `.claude/settings.json` (`grep -c '"sandbox"'` gives 0 there).
- That pnpm takes its lock in this store and that this is the read-only
  path in the error is a hypothesis, untested: the error text above was
  reported by the agent that ran the install, and its full path was not
  kept.
- `docs/agents/paired-worktrees.md:27-28` on `dev` says "Make a pair
  without asking the owner, through a subagent like any `pnpm` call".
  `pnpm wt:pair` runs an install (`:38-40`), so a sandboxed subagent
  probably cannot make a pair either — hypothesis, untested.
- No ticket or `docs/agents/known-traps.md` entry names this failure:
  `git grep -n -i -E 'ERR_PNPM|STORE_DIR|EROFS' dev --
  .scratch/carry-forward docs/agents/known-traps.md` finds nothing.
  Tickets 709 and 713 (closed) and 743 (open) are other sandbox
  failures, not this one.

## Done when

Either an agent in the sandbox can run `pnpm install` in a new worktree
(re-run it and confirm `ls <worktree>/node_modules/.modules.yaml`), or
the docs that tell agents to install or make a pair say the step must
run outside the sandbox and give the owner one command to paste. A
change to the sandbox settings is the owner's decision.

## Comments

### 2026-11-06: ticket 810 names the lock path

Ticket 810 reports the same `ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK`
error with the lock in `/run/user/1000`, which the sandbox mounts
read-only, and `XDG_RUNTIME_DIR` set to a writable folder as the
workaround. If that holds, the store-folder cause above is not the one.
