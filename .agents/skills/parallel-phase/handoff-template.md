# Worker handoff

Workers produce exactly one handoff when done. Copy this shape into the final message (and optionally write `handoffs/<slice>.md` on the worker branch).

```markdown
## Status
success | partial | blocked | error

## Branch
<worker-branch-name>

## Base
- spawned at `<sha>` · expected `<sha>` · corrected: yes/no

## What I did
- <bullet per meaningful change>

## Paths touched
- <path or glob>

## Verification
- <command> → <outcome>
(list what you actually ran)

## Notes / concerns
- <collisions, deviations, underspecified prompts>

## Suggested follow-ups
- <tasks for the delegator; optional>
```

Rules:

- `Status: success` only if every acceptance criterion for this slice is met.
- `Branch` is the branch that carries the commits to merge — name it exactly.
- **Attribute failures in the heading/`Status` line, not only the body.** Mark harness/infra (quota, sandbox, missing tool) vs repo/code. Harness-specific → close with “re-evaluate on another harness.” Never let a title say “X failed here” when only the harness blocked the attempt.
- **Assert your base before anything else.** Run `git log -1 --format=%H`. If it is not the SHA your prompt named, `git checkout -b <your-branch> <SHA>` from the right one and record it under `Base`. Isolation flags do not reliably branch from the delegator's current branch.
- **Do not write a file your slice does not own.** If you need a line in a shared manifest (`package.json`, a lockfile, a barrel file) that another slice owns, put the exact line under `Notes / concerns` instead — the fan-in owner applies it.
- Anything under `Notes / concerns` will be dispositioned at fan-in as fixed, ticketed, or accepted in writing. Raise concerns there rather than acting outside your scope — but state them concretely enough to act on.
- Do not merge, rebase onto `dev`, or run `pnpm merge-to-dev`.
- If blocked, say what is missing; do not invent out-of-scope fixes.
