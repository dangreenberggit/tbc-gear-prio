Status: open
Type: bug
Origin: docs/reviews/chore-pnpm-12.16.1.md (finding A3)
Blocks: none
Blocked by: none

# `pnpm -C <other checkout>` fails when the two checkouts pin different pnpm versions

Corepack picks the pnpm version from the current directory's
`package.json`, not from the `-C` target. So while one checkout pins
pnpm 11.24.0 and another pins 12.16.1 (every branch cut before the pnpm 12
bump merges), a `pnpm -C <pnpm-12 checkout> ...` run from a pnpm-11
checkout stops with:

    [ERROR] This project is configured to use 12.16.1 of pnpm. Your current pnpm is v11.24.0

Re-run (2026-11-01): from `/home/daniel/Code/lulz/tbc-gear-prio` (pnpm 11
branch), `corepack pnpm -C .scratch/wt-pnpm-bump --version` gave rc=1 with
that message; `(cd .scratch/wt-pnpm-bump && pnpm --version)` printed
12.16.1.

`docs/agents/paired-worktrees.md` (lines 30 and 74 at the time of the
review) tells agents to run `pnpm -C <pair>` from their own checkout, and
`scripts/worktree_pair.py` `pnpm_in()` prints hints in that form. The pair
script's own install was fixed on branch `chore/pnpm-12.16.1` (commit
a642ae6a, finding A1). The failure is loud and ends once both checkouts
pin the same pnpm, and it comes back with every later pnpm bump.

Possible fix (hypothesis, untested): a `docs/agents/known-traps.md` entry
saying to run pnpm from inside the target folder (`(cd <dir> && pnpm ...)`)
when pins may differ, and the same form in `pnpm_in()` hints. Both are
agent-facing text: see `docs/workflow.md` § Editing agent-facing documents.
