# Worker handoff

Workers produce exactly one handoff when done. Copy this shape into the final message (and optionally write `handoffs/<slice>.md` on the worker branch).

```markdown
## Status
success | partial | blocked | error

## Branch
<worker-branch-name>

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
- Do not merge, rebase onto `dev`, or run `pnpm land`.
- If blocked, say what is missing; do not invent out-of-scope fixes.
