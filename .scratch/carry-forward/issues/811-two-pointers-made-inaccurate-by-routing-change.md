Status: open
Type: task
Origin: docs/reviews/chore-808-one-routing-source.md (findings R808-6 and R808-7, on branch `chore/808-one-routing-source`)
Blocks: none
Blocked by: the owner's approval of the exact text; the routing change (ticket 808) reaching `dev`
Related: 808

# Two sentences point at text the routing change removed or moved

Both are agent-instruction text, so the new text needs the owner's
approval first (`~/.claude/AGENTS.md` § Changing agent instructions).
Line numbers are on branch `chore/808-one-routing-source` at 8ef43bec.

## 1. The parallel-phase adapter says model-policy defines each agent type

`docs/agents/home/skills/parallel-phase/adapters/claude-code.md:7`:

> Lane-aware defaults (see `~/.claude/model-policy.md` § Claude Code, which defines each agent type):

The routing change deleted the "Use for" column of that section's
agent-type table (row 5a; `git diff dev..chore/808-one-routing-source --
docs/agents/home/model-policy.md`). The section now gives only each
type's model and effort. The bullets under line 7 already point at
`routing.md`, so a reader who opens model-policy § Claude Code first
makes one wasted read (review R808-6).

## 2. Global model-policy says the repo's AGENTS.md names where repo values live

`docs/agents/home/model-policy.md:5-6`:

> A "repo value" is kept in the repo's own docs; the repo's `AGENTS.md` names where.

On `dev`, the repo's `AGENTS.md` said "this repo's values are in
`docs/agents/model-policy.md`" twice. On the branch it names that file
only for card limits (`AGENTS.md:28-30`, "this repo's card limits:
`docs/agents/model-policy.md` § GLM worker types"), and § Spawning
(`:91-92`) now names `~/.claude/routing.md`. The repo values under
§ Budget the round, § Trial types and § Stage-gate seats of
`docs/agents/model-policy.md` lose their pointer. The cost is small,
because that file's own header says it holds every repo value
(review R808-7). The branch text is the approved text, applied as
approved.

## Done when

Each of the two sentences is true of the text it points at, with the
owner's approval of the exact new text, or the owner rules that one
stays as it is (then this ticket records the ruling word for word).
