# Agnostic adapter (git)

Use when the harness is unknown or you want only git primitives. Any coding agent that can run shell commands can follow this.

## Isolate a worker

From the feature-branch tip (`feat/<slug>` or `phase-N/<slug>`):

```bash
FEATURE=$(git branch --show-current)
SLICE=<slice-kebab>
git fetch origin 2>/dev/null || true
git worktree add "../$(basename "$(pwd)")-${SLICE}" -b "${FEATURE}/${SLICE}" "${FEATURE}"
```

Point the worker session at that worktree directory. Install deps in the worktree the same way the repo expects (`pnpm install`), or copy local env files if needed — do not symlink `node_modules` from the main tree.

## Worker contract

- Commit on `${FEATURE}/${SLICE}` only.
- End with the handoff template (`Status`, `Branch`, what, verify).
- Do not merge into `dev` / `main` or run `pnpm land`.

## Merge (delegator preferred)

On the feature branch checkout:

```bash
git checkout "${FEATURE}"
git merge --no-ff "${FEATURE}/${SLICE}" -m "Merge ${FEATURE}/${SLICE} into ${FEATURE}"
pnpm verify
```

Repeat per slice (or merge in dependency order). On conflict, apply the written conflict policy from the partition plan, then re-run `pnpm verify`.

## Cleanup (optional)

```bash
git worktree remove "../$(basename "$(pwd)")-${SLICE}"
git branch -d "${FEATURE}/${SLICE}"   # after merge
```

## Merger fallback prompt

If the delegator cannot merge, spawn a merger with: feature branch name, list of worker branches + handoff bodies, path ownership, conflict policy, and acceptance = `pnpm verify` green on the feature tip.
