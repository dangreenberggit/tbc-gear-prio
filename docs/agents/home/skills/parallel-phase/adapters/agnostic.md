# Agnostic adapter (git)

Use when the harness is unknown or you want only git primitives. Any coding agent that can run shell commands can follow this.

## Isolate a worker

From the feature-branch tip:

```bash
FEATURE=$(git branch --show-current)
SLICE=<slice-kebab>
BASE=$(git rev-parse HEAD)
git fetch origin 2>/dev/null || true
git worktree add "../$(basename "$(pwd)")-${SLICE}" -b "${FEATURE}-${SLICE}" "${BASE}"
```

If the repo's values file (`docs/agents/parallel-phase-project.md`) § Isolation covers the slice, isolate it as that section says instead of the plain worktree above.

Point the worker session at that worktree directory. Install deps in the worktree the same way the repo expects (for example `pnpm install`), or copy local env files if needed — do not symlink `node_modules` from the main tree. Tell the worker to assert `git log -1 --format=%H` equals `${BASE}` before doing anything else.

## Worker contract

- Commit on `${FEATURE}-${SLICE}` only.
- End with the handoff template (`Status`, `Branch`, `Base`, what, verify).
- Do not merge into an integration branch or run the merge command (values file § Branches and § Commands).

## Merge (delegator preferred)

On the feature branch checkout:

```bash
git checkout "${FEATURE}"
git merge --no-ff "${FEATURE}-${SLICE}" -m "Merge ${FEATURE}-${SLICE} into ${FEATURE}"
```

Repeat per slice (or merge in dependency order). On conflict, apply the written conflict policy from the partition plan.

## Cleanup (required, before the integrated verify)

Do this **after** merging every slice and **before** running the gate command on the
integrated tip — a live worktree inside the repo is visible to the test runner.

```bash
git worktree remove --force "../$(basename "$(pwd)")-${SLICE}"   # --force first: a failed
                                                                 # plain remove deregisters
                                                                 # but leaves files behind
git worktree prune
git branch -d "${FEATURE}-${SLICE}"   # after merge
```

Then run the gate command (values file § Commands) once, after cleanup, on the fully integrated tip.

## Merger fallback prompt

If the delegator cannot merge, spawn a merger with: feature branch name, list of worker branches + handoff bodies, path ownership, conflict policy, and acceptance = the gate command green on the feature tip.
