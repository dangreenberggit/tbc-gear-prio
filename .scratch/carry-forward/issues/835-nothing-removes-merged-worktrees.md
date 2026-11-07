Status: closed
Type: process
Origin: merge of `chore/808-one-routing-source` into `dev` on 2026-11-07; owner 2026-11-07: "i agree with those. have a session take care of them"
Blocks: none
Blocked by: none
Related: 149

Verified by: `python scripts/check_worktree_cleanup.py`, and
`python scripts/worktree_cleanup.py` (list mode) on the real repo, on
branch `chore/merge-hurdles`.

# Nothing removes worktrees whose branch dev already contains

## What a reader sees

`git worktree list` showed 32 worktrees on 2026-11-07 in four places:
`~/.t3/worktrees` (T3), `.claude/worktrees` (Claude Code), `.scratch/wt-*`
(agents by hand) and `../tbc-wt` (`pnpm wt:pair`). Most hold branches
already in `dev`. Many hold gitignored agent reports under
`.scratch/agent-reports/` and similar folders that exist nowhere else.
The clutter hid which worktree held `dev`.

## Done when

A `pnpm` script lists each worktree (path, branch, merged into `dev` or
not, clean or not, the gitignored report files it holds) and changes
nothing by default. With an explicit flag it copies the reports to one
archive folder in the main checkout, then removes only worktrees that are
clean, fully merged and do not hold `dev`. It never touches the main
checkout or the worktree holding `dev`, and leaves T3's worktrees alone
unless a flag says otherwise.

## Closed

`pnpm wt:cleanup` (`scripts/worktree_cleanup.py`) lists, and prints a
`pnpm wt:cleanup --remove <names>` line for every worktree it may take.
`--remove` acts only on the worktrees named after it: the pre-merge
review found that no process or git check can tell that a session has
finished with a worktree (`docs/reviews/chore-merge-hurdles.md`, A2 and
R2-1 to R2-4), and the owner chose naming on 2026-11-07 ("sure 1 is
fine"). For each named worktree it archives every gitignored file under `.scratch/`
(except Claude Code's `.cc-writes` markers and `__pycache__`) to
`<main checkout>/.scratch/worktree-archive/<folder name>/`, then runs
`git worktree remove` without `--force`. It also keeps pairs (they need
`pnpm wt:unpair`), locked worktrees, the one it runs from, and any
worktree holding ignored files outside `.scratch/` that are not build
output or empty sandbox stubs. `--include-t3` lets a named T3 worktree go;
the script cannot see which ones a T3 thread uses, so it keeps all of
them by default. `pnpm verify` runs `scripts/check_worktree_cleanup.py`.

The removing mode was run only on throwaway repos in those checks, never
on the real repo. List mode on the real repo on 2026-11-07 said
`--remove` may take 12 of 32 worktrees.
