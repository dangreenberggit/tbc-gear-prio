# Agnostic adapter (git)

Use when the harness is unknown or you want only git primitives. Any coding agent that can run shell commands can follow this.

## Isolate a worker

From the feature-branch tip (`feat/<slug>` or `phase-N/<slug>`):

```bash
FEATURE=$(git branch --show-current)
SLICE=<slice-kebab>
BASE=$(git rev-parse HEAD)
git fetch origin 2>/dev/null || true
git worktree add "../$(basename "$(pwd)")-${SLICE}" -b "${FEATURE}/${SLICE}" "${BASE}"
```

Point the worker session at that worktree directory. Install deps in the worktree the same way the repo expects (`pnpm install`), or copy local env files if needed — do not symlink `node_modules` from the main tree. Tell the worker to assert `git log -1 --format=%H` equals `${BASE}` before doing anything else.

## Worker contract

- Commit on `${FEATURE}/${SLICE}` only.
- End with the handoff template (`Status`, `Branch`, `Base`, what, verify).
- Do not merge into `dev` / `main` or run `pnpm land`.

## Merge (delegator preferred)

On the feature branch checkout:

```bash
git checkout "${FEATURE}"
git merge --no-ff "${FEATURE}/${SLICE}" -m "Merge ${FEATURE}/${SLICE} into ${FEATURE}"
```

Repeat per slice (or merge in dependency order). On conflict, apply the written conflict policy from the partition plan.

## Cleanup (required, before the integrated verify)

Do this **after** merging every slice and **before** running `pnpm verify` on the
integrated tip — a live worktree inside the repo is visible to vitest.

```bash
git worktree remove --force "../$(basename "$(pwd)")-${SLICE}"   # --force first: a failed
                                                                 # plain remove deregisters
                                                                 # but leaves files behind
git worktree prune
git branch -d "${FEATURE}/${SLICE}"   # after merge
```

Then run once, after cleanup, on the fully integrated tip:

```bash
pnpm verify
```

## Merger fallback prompt

If the delegator cannot merge, spawn a merger with: feature branch name, list of worker branches + handoff bodies, path ownership, conflict policy, and acceptance = `pnpm verify` green on the feature tip.
