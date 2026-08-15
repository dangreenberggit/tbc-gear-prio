Status: open
Type: process gap
Origin: the feat/sweep-ret-tickets merge to dev, 2026-08-15 (dev 996766f)
Blocks: none
Blocked by: none

# `merge-to-dev` cannot finish a conflicted merge, so a hand escape hatch exists

`scripts/merge_to_dev.py` is written for the happy path: gate, `git
checkout dev`, `git merge --no-ff <branch>`, done. When the merge stops on
conflicts it has no resume mode, and re-running it from `dev` dies with
"refuse to merge from 'dev'". Finishing therefore requires a hand `git
commit` on `dev` with `TBC_ALLOW_DEV_MERGE=1` set — the variable
`.githooks/pre-commit` uses to recognize the script's own merge, which the
script's docstring documents as an "escape hatch".

That is fishy by design: AGENTS.md § Gates says never to set that variable
on `dev` for real work, yet the only documented way to finish a conflicted
door-merge is exactly that. An agent following the docstring did so on
2026-08-15 (every gate had passed and `pnpm verify` was green on the
resolved tree, so the outcome was sound, but the procedure is the one the
rule exists to prevent).

## Why it conflicted (root cause to design against)

Two parallel sweep branches both edited the same bookkeeping files —
`package.json` (each added a verify gate), `.scratch/carry-forward/map.md`
(each appended), and eight ticket files that existed as independent copies
on both branches. One-branch-at-a-time flow never produces this; parallel
branches carrying duplicated ticket files do (see the issue-tracker note
added alongside this ticket).

## Done when

The door script handles conflicts itself, by one of:

- **Refuse up front**: dry-run the merge (`git merge-tree` against the
  current `dev` tip) and die with "would conflict — rebase <branch> onto
  dev first" before touching anything. Simplest; keeps one-branch-at-a-time
  the only path.
- **Verified resume**: a `--continue` mode that, on `dev` with `MERGE_HEAD`
  present, re-runs `pnpm verify` on the resolved tree and creates the merge
  commit itself with its own signal.

Either way, the "escape hatch" line is removed from the docstring and the
hook's message, and AGENTS.md § Gates needs no exception. Hypothesis:
refuse-up-front is enough for this solo repo.
