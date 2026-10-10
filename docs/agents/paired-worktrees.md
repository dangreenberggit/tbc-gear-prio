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

Flags: `python scripts/worktree_pair.py pair --help`. The pair is made at
`<parent of the main checkout>/tbc-wt/<name>`, outside the repo and short
enough that its deepest file stays under Windows' 260-character limit. The
command copies `vendor/` inputs from the main checkout, installs, and runs
`make proto` and `make go-to-ts`. It is done when it prints `pair ready`.

If the fork branch's HEAD is not the commit the pair's
`data/wowsims-fork.lock.json` pins, the fork gates exit 2 until the lock names
it. The command prints a note when that is the case. See `known-traps.md`,
"Before moving the wowsims engine pin".

## Work in it

- **Memory.** Open the session in the pair folder. Memory is kept per folder,
  so that session starts with no memory notes (ticket 572). The owner's notes
  are in
  `C:\Users\dgree\.claude\projects\C--Users-dgree-Code-lulz-tbc-gear-prio\memory\`.
- **Fork commits.** Commit with `git -C <pair>/vendor/tbc-new-fork`, then
  re-pin the pair's lock. AGENTS.md "The forked tab repo" has the full cycle.
- **Live tab.** One session at a time runs it. In `.claude/launch.json`, vite
  is pinned to port 5173 with `--strictPort`, the backend to port 3333 with
  `autoPort: false`, and the http-server entry names the main checkout's fork
  path. The layout gate and `pnpm tab-review` use no port: they serve the
  pair's own `dist/` (`pnpm wt:pair ... --build`).

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

The steps:

1. **Merge the fork side first.** Merge the pair's fork branch into the fork
   lock's `branch` in the main clone. When two pairs both moved the lock's
   `commit`, merging both main branches would conflict on that field.
   Merging the fork side first gives one fork commit that holds both pairs'
   work. Then re-pin the branch's lock to that commit (regenerate and
   `pnpm verify`) before landing it.
2. **Remove the pair.** Run `pnpm wt:unpair <name>`. The branches are kept.
3. **Merge from the main folder.** In the main folder, `git checkout
<main-branch>`, confirm that the fork clone's HEAD is the lock's `commit`,
   then run `pnpm merge-to-dev`.

## Remove it

```
pnpm wt:unpair <name>
```

Run it from the main checkout or from another pair; it refuses to run from
inside the pair it removes. Without `--force` it refuses when either worktree
has uncommitted or untracked files, or is detached at a commit no branch
contains.

Remove pairs only with `pnpm wt:unpair`. In all three live runs,
`git worktree remove` dropped the main worktree's registration and then left
its folder half-deleted ("Directory not empty"). In a scratch test at a
deeper path it did the same to the fork folder ("Filename too long"). The
script deletes what git leaves behind, but only after it checks that no link
inside the pair points out of it. A junction into the main checkout would
make any recursive delete remove the main checkout's files.

## Live test, 2026-10-10

Run from the `feat/worktree-pair` pair on Node 22.17.1:
`pnpm wt:pair live-probe fix/585-resort-test-claims --fork-detached --build`.

| Step                        | Time                                 |
| --------------------------- | ------------------------------------ |
| main worktree               | 3 s                                  |
| fork worktree               | 2 s                                  |
| `pnpm install` (warm store) | 7 s                                  |
| `npm ci`                    | 24 s                                 |
| `make proto`                | 28 s                                 |
| `make go-to-ts`             | 20 s                                 |
| build (`--build`)           | 104 s                                |
| whole command               | 188 s (about 84 s without the build) |

- **verify.** `pnpm verify` in the new pair gave rc 0, "gates: 1517 ran, 0
  skipped", in 185 s.
- **unpair refusals.** `wt:unpair` refused while the pair's fork held an
  untracked file.
- **unpair.** Once the fork was clean, `wt:unpair` took 17 s. git left the
  main folder ("Directory not empty"), and the script deleted it. After that,
  neither `worktree list` named the pair.
- **disk.** The same layout in a scratch test measured 404 MB for the main
  worktree without `vendor/` and 561 MB for the fork worktree.
- **First-run fixes.** Two failures in the first runs were fixed in the
  script. Python found the sh `corepack` script that Windows cannot start
  (`[WinError 193]`). Under pnpm, `make proto` lacked Git for Windows'
  `usr/bin` tools (`FIND: Parameter format not correct`).
