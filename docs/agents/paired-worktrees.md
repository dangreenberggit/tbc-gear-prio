# Paired worktrees

A **pair** is a main-repo worktree that has its own fork worktree at
`vendor/tbc-new-fork`. `pnpm wt:pair` makes one and `pnpm wt:unpair` removes
it (`scripts/worktree_pair.py`). Every gate finds the fork as
`<checkout>/vendor/tbc-new-fork`, so in a pair each gate reads that pair's
fork and that pair's lock. No script needs an edit.

Edit the fork or check out a fork branch only in a pair, so the main
checkout's clone stays on the fork lock's `branch` for "Main folder: merge
the fork side" below. Work
that never reads the fork can use a plain worktree, and runs `pnpm verify`
with `TBC_VERIFY_WITHOUT_FORK=1` after `pnpm run sync:wowsims:restore` and
`pnpm run sync:atlasloot:restore`, as CI does. Without the two restores, the tests that
read `vendor/wowsims` fail: on 2026-10-10, `pnpm verify` with the opt-out in
a plain worktree with no `vendor/` reported "vitest failures (16)".

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

- **Memory.** Memory is kept per folder, so a session opened in the pair
  folder (needed only for the live tab) starts with no memory notes (ticket
  572). The owner's notes are in
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
  relative paths and names no folder, so if only 5173 is held, treat the live
  tab as taken unless `preview_list` shows your session's vite. If the
  servers belong to another folder, the live tab is taken until that session
  stops them.
  `wowsims-fork-prod` (port 4180) always serves the main checkout's `dist/`.
- **Live tab from a pair (agents).** A pair's fork has no `dist/` unless
  `wt:pair` ran with `--build`; without it the page hangs in `waitForInit`
  and loads no gear. Build it with
  `make -C <pair>/vendor/tbc-new-fork dist/tbc/.dirstamp`. For the backend,
  `sim/web/main.go` imports the gitignored `binary_dist/`, so first write its
  stub with `make -C <pair>/vendor/tbc-new-fork binary_dist/dist.go`, then
  run `go build -o wowsimtbc.exe ./sim/web` in the pair's fork and start it
  with `./wowsimtbc.exe --usefs=true --launch=false --host=:3333`, as the
  `wowsims-backend` entry in `.claude/launch.json` does. Start the
  pair's vite on a free port and give scripts that drive it
  (`tab-fixtures:record`, `tab-fixtures:smoke`) `TBC_FORK_PORT=<that port>`,
  and `run-tab-cdp.mjs` `--origin http://localhost:<that port>`, so they
  drive this pair and not another folder's 5173. The backend port 3333 is
  shared: while one pair's backend holds it, every folder's vite sends sim
  calls there, so one folder runs live sims at a time. Run one recorder at a
  time, and stop it and its shell before starting the next.
- **Layout gate and `pnpm tab-review`.** Each starts its own server on a free
  port from the pair's own `dist/`. Build `dist/` with `--build`, or later
  with `make -C <pair>/vendor/tbc-new-fork dist/tbc/.dirstamp` in Git Bash.
  Without `dist/`, the layout gate skips. Leave `TBC_FORK_PORT` unset: when it
  is set, both reuse the server on that port, which may serve another
  folder's fork.

## Land it on dev

The merge into `dev` runs from the main folder, and only when the owner asks
(AGENTS.md "The loop", step 6). The pair stays in place.

1. **Pair folder: commit.** Commit everything on both branches. Done when
   `git -C <pair> status --porcelain` and
   `git -C <pair>/vendor/tbc-new-fork status --porcelain` print nothing.
2. **Main folder: merge the fork side.** Skip this when the pair has no fork
   commits. Check that `git -C vendor/tbc-new-fork branch --show-current`
   prints the fork lock's `branch`, then merge the pair's fork branch into
   it: `git -C vendor/tbc-new-fork merge <fork-branch>`. Do this before the
   main branch merges into `dev`, so the fork commit the lock names holds
   every pair's fork work. A pair made with `--fork-detached` that has fork
   commits puts them on a branch first
   (`git -C <pair>/vendor/tbc-new-fork switch -c <branch>`). Done when
   `git -C vendor/tbc-new-fork rev-parse HEAD` prints the `commit` that the
   pair's `data/wowsims-fork.lock.json` names. When it prints another commit
   (the merge was not a fast-forward), take the older route below.
3. **Main folder, on `dev`: merge.** Run `pnpm merge-to-dev <main-branch>`.
   Done when it prints `merged <main-branch> -> dev`. Add `--check-only` to
   run the checks without merging. A green layout gate under `--check-only`
   rewrites `data/wowsims-fork-layout.lock.json` in the pair without
   committing it; commit that file there, or the real run refuses the pair.

What step 3 does (full list: `scripts/merge_to_dev.py`, "Named branch"):

- Verify, the review and ticket check, and the layout gate run in the pair,
  so they read the pair's fork, lock, review file and tickets.
- If `dev` has commits the branch lacks, it first runs `git merge dev` in
  the pair. After that, `dev` is an ancestor of the branch, so the merge into
  `dev` produces exactly the branch's tree: the checks ran on the tree that
  `dev` gets. That merge commit stays on the branch even when a later check
  fails.
- In the main folder, dirty files block the merge only when the merge writes
  them or when they are staged. Other dirty files, tracked or untracked,
  stay as they are.
- `--check-only` does not merge `dev` into the branch. When `dev` is ahead,
  it checks the branch's tip and prints a note saying so.

The live tests of step 3 and their commands are in
`docs/reviews/feat-merge-to-dev-arg.md`, "Live tests". It has not yet
merged into the real `dev`.

**When `git merge dev` conflicts in the pair,** step 3 aborts that merge,
leaves the pair as it was, and stops. For an ordinary conflict, resolve it in
the pair (`git -C <pair> merge dev`) and run step 3 again.

**When `dev` has a new fork pin,** take the older route below. Step 3
refuses, before it merges anything, when `data/wowsims-fork.lock.json` on
`dev` changed since the branch forked. Two reasons:

- When this pair re-pinned too, the lock's `commit` and `_comment` lines
  conflict (temp-repo test 2026-10-10, `docs/reviews/feat-worktree-pair.md`
  WD7; the repo has no merge driver for the lock).
- When only `dev` re-pinned, `git merge dev` would succeed, but the pair's
  fork worktree stays on the old commit, so the fork gates in the pair's
  verify would fail (a reading of `scripts/_fork_gate.py`, untested).

The older route's git steps ran in temp repos on 2026-10-10
(`docs/reviews/feat-worktree-pair.md`, R1; the `pnpm` commands did not run
there):

1. **Main folder: remove the pair.** Run `pnpm wt:unpair <name>`. Both
   branches are kept, and git now lets the main folder check them out.
2. **Main folder: merge the fork side**, as in step 2 above, if not done.
3. **Main folder: check out and re-pin.** Run `git checkout <main-branch>`
   and `git merge dev`. Keep `dev`'s `commit` and both `_comment` sentences,
   and commit the merge. Then, if the clone's HEAD is not the lock's
   `commit`, read the lock's `_comment` history, set `commit` to the clone's
   HEAD, append a dated sentence to `_comment`, run
   `pnpm sim-implemented-effects:generate` and `pnpm verify`, and commit on
   the branch.
4. **Main folder: merge.** Run `pnpm merge-to-dev` with no branch; it merges
   the branch the folder has checked out.

Between the fork-side merge and the merge into `dev`, the fork gates exit 2
in the main folder while it is on `dev`, because `dev`'s lock still names
the old fork commit. Step 3 runs its checks in the pair, so this does not
stop it (a reading of `merge_to_dev.py`, untested).

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
  as a worktree, and either no earlier unpair of this pair started removing
  it or the folder holds its own `.git` folder (a separate clone); with
  `--force`, unpair deletes it as a leftover;
- on Windows, a running process has its program inside the pair or names
  the pair on its command line, in Windows or Git Bash (`/c/...`) spelling,
  such as `tsc.exe` under `node_modules` or the backend `wowsimtbc.exe`. It
  lists each one with its pid. With `--force`, it lists them and goes on.

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

**When unpair stops part-way.** A file that some process holds open stops
the delete, and git may already have dropped that half's registration. The
process check above misses a process whose program is outside the pair and
whose command line does not name it, such as a shell or vite started inside
it. It probably also misses an elevated process when unpair runs in a shell
that is not elevated (hypothesis, untested). Unpair then prints the files
that are still there and the command to rerun, and stops. Stop the process
that holds them, then run that command; it finishes the removal. It is
`pnpm wt:unpair <name>`, with `--force` only when the stopped run had it.
This works because unpair writes a mark, `.git/tbc-wt-unpair/<name>` in
the main checkout, after its work checks pass (or `--force` skips them) and
before it removes anything. It deletes the mark when the pair is gone, and
when a run stops while git still registers every half that is left. A
rerun deletes an unregistered folder at the pair's paths only while that
mark exists. A half that git still registers gets the full work checks
again.

Live timings for one pair (2026-10-10, `--fork-detached --build`): main
worktree 3 s, fork worktree 2 s, `pnpm install` 7 s with a warm store,
`npm ci` 24 s, `make proto` 28 s, `make go-to-ts` 20 s, build 104 s; 188 s in
all. The other live runs are in `docs/reviews/feat-worktree-pair.md`, "Live
tests".
