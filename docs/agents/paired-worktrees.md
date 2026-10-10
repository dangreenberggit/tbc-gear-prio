# Paired worktrees

A **pair** is a main-repo worktree that has its own fork worktree at
`vendor/tbc-new-fork`. `pnpm wt:pair` makes one and `pnpm wt:unpair` removes
it (`scripts/worktree_pair.py`). Every gate finds the fork as
`<checkout>/vendor/tbc-new-fork`, so in a pair each gate reads that pair's
fork and that pair's lock. No script needs an edit.

Use a pair when a session works on a fork branch other than the one the main
checkout's clone has checked out, or works on the fork while another session
also does. Work that never reads the fork can use a plain worktree.

## Make one

```
pnpm wt:pair <name> <main-branch> <fork-branch>
pnpm wt:pair <name> <main-branch> --fork-detached
```

`<name>` is 1-23 characters of a-z, 0-9 and `-`, starting with a letter or
digit. Flags: `python scripts/worktree_pair.py pair --help`. The pair is made
at `<parent of the main checkout>/tbc-wt/<name>`, outside the repo and short
enough that its deepest file stays under Windows' 260-character limit. The
command copies `vendor/` inputs from the main checkout, installs, and runs
`make proto` and `make go-to-ts`.

It takes about 1.5 minutes, or about 3 with `--build`, so give the shell call
a 600000 ms timeout or run it in the background. It is done when it prints
`pair ready` with no `WARNING` line after it; a warning names a missing or
mismatched `vendor/` input and the command that restores it.

If the fork branch's HEAD is not the commit the pair's
`data/wowsims-fork.lock.json` pins, the fork gates exit 2 until the lock names
it. The command prints a note when that is the case. See `known-traps.md`,
"Before moving the wowsims engine pin".

## Work in it

- **Memory.** Open the session in the pair folder. Memory is kept per folder,
  so that session starts with no memory notes (ticket 572). The owner's notes
  are in
  `C:\Users\dgree\.claude\projects\C--Users-dgree-Code-lulz-tbc-gear-prio\memory\`.
- **Subagents.** A subagent starts in the spawning session's folder, not the
  pair. Give it the pair's path and have it use `git -C <pair>` and
  `pnpm -C <pair>`. `pnpm -C <pair> verify` checks the pair: in a scratch pair
  on 2026-10-10 it failed on that pair's missing `constants_auto_gen.ts`,
  which the main checkout's fork has.
- **Fork commits.** Commit with `git -C <pair>/vendor/tbc-new-fork`, then
  re-pin the pair's lock. AGENTS.md "The forked tab repo" has the full cycle.
- **Live tab.** One session at a time runs it. In `.claude/launch.json`, vite
  must have port 5173 (`--strictPort`) and the backend port 3333
  (`autoPort: false`), and each serves the fork of the folder that started
  it. Use servers already on those ports only when your session started them
  (`preview_list` shows them). Otherwise find the folder from the backend.
  `wowsimtbc.exe` is built inside that folder's fork, so its path names the
  folder (PowerShell: `Get-NetTCPConnection -LocalPort 3333 -State Listen`
  for `OwningProcess`, then
  `(Get-CimInstance Win32_Process -Filter "ProcessId=<pid>").ExecutablePath`;
  on 2026-10-10 it gave
  `C:\Users\dgree\Code\lulz\tbc-wt\worktree-pair\vendor\tbc-new-fork\wowsimtbc.exe`
  for a backend started in that pair). The vite command line holds only
  relative paths and names no folder. If the servers belong to another
  folder, the live tab is taken until that session stops them.
  `wowsims-fork-prod` (port 4180) always serves the main checkout's `dist/`.
- **Layout gate and `pnpm tab-review`.** Each starts its own server on a free
  port from the pair's own `dist/`. Build `dist/` with `--build`, or later
  with `make -C <pair>/vendor/tbc-new-fork dist/tbc/.dirstamp` in Git Bash.
  Without `dist/`, the layout gate skips. Leave `TBC_FORK_PORT` unset: when it
  is set, both reuse the server on that port, which may serve another
  folder's fork.

## Land it on dev

The merge into `dev` runs from the main folder, and only when the owner asks
(AGENTS.md "The loop", step 6). This section is a reading of
`scripts/merge_to_dev.py`; no merge was run from a pair.

- **The checks run in a pair.** Steps 1–5 of `merge_to_dev.py` run in the
  checkout that runs the script, so `pnpm merge-to-dev --check-only` checks
  the pair (untested).
- **The merge step fails in a pair.** Step 6 runs `git checkout dev`
  (`merge_to_dev.py:182`), and git checks a branch out in only one worktree.
  While the main folder is on `dev`, that checkout fails in a pair (untested).

The steps, each with the folder it runs in:

1. **Pair folder: check.** Commit everything on both branches, then run
   `pnpm merge-to-dev --check-only`. A green layout-gate run in it rewrites
   `data/wowsims-fork-layout.lock.json` (check-only does not commit it):
   commit that file too, or step 2 refuses.
2. **Main folder: remove the pair.** Run `pnpm wt:unpair <name>`. Both
   branches are kept, and git now lets the main folder check them out.
3. **Main folder: merge the fork side.** Check that
   `git -C vendor/tbc-new-fork branch --show-current` prints the fork lock's
   `branch`, then merge the pair's fork branch into it:
   `git -C vendor/tbc-new-fork merge <fork-branch>`. Do this before the main
   branch merges into `dev`, so the fork commit the lock names holds every
   pair's fork work.
4. **Main folder: check out, and re-pin when needed.** Run
   `git checkout <main-branch>`. If `dev` already holds another pair's
   re-pin, run `git merge dev` first: the lock's `commit` and `_comment`
   conflict, because the repo has no merge driver for the lock. Resolve it by
   taking the clone's HEAD as `commit` and keeping both `_comment` sentences.
   If the clone's HEAD is not the lock's `commit` (step 3 made a merge
   commit), read the lock's `_comment` history, set `commit` to the clone's
   HEAD, append a dated sentence to `_comment`, run
   `pnpm sim-implemented-effects:generate` and `pnpm verify`, and commit on
   the branch.
5. **Main folder: merge.** Run `pnpm merge-to-dev` once the owner asks.
   `merge_to_dev.py` refuses to run from `dev` (`:125-127`), so step 4's
   checkout is needed every time.

A pair made with `--fork-detached` has no fork branch. With no fork commits,
skip step 3 and the re-pin in step 4, but still check out the main branch.
With fork commits, put them on a branch
(`git -C <pair>/vendor/tbc-new-fork switch -c <branch>`) before step 2;
unpair refuses a detached commit that no branch contains.

Between step 3 and the merge, the fork gates exit 2 in the main folder while
it is on `dev`, because `dev`'s lock still names the old fork commit.

## Remove it

```
pnpm wt:unpair <name>
```

Run it from the main checkout or from another pair; it refuses to run from
inside the pair it removes. Without `--force` it refuses when:

- either worktree has uncommitted or untracked files;
- either worktree has ignored files that pair setup did not write, such as
  `.scratch/` stage records or a folder added under `vendor/`;
- either worktree is detached at a commit no branch contains;
- a folder sits at the pair's main or fork path that git does not register
  as a worktree (with `--force`, unpair deletes it as a leftover).

Even with `--force`, it refuses a locked worktree, and a pair with another
worktree registered inside it (such as a second fork worktree under
`vendor/`; remove that one first with `git worktree remove`). Both checks run
before either half is removed. Before removing anything, unpair copies the
pair's agent run logs (`.scratch/agent-runs/`, written by the run-log hook)
into the main checkout's.

Remove pairs only with `pnpm wt:unpair`. On its own, `git worktree remove`
drops the registration and then leaves a pair's main folder half-deleted
("Directory not empty", every live run on 2026-10-10). The script deletes
what git leaves behind only once git has dropped the registration, and only
after it checks that no link inside the pair points out of it.

Live timings for one pair (2026-10-10, `--fork-detached --build`): main
worktree 3 s, fork worktree 2 s, `pnpm install` 7 s with a warm store,
`npm ci` 24 s, `make proto` 28 s, `make go-to-ts` 20 s, build 104 s; 188 s in
all. The other live runs are in `docs/reviews/feat-worktree-pair.md`, "Live
tests".
