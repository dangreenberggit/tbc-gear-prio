Status: open
Type: task
Origin: docs/reviews/feat-orchestration-model-policy.md
Blocks: none
Blocked by: none

# Point skills that spawn built-in agent types at the pinned types

## The contradiction

`docs/agents/model-policy.md` § Claude Code (from 1d86fd48) says: "Spawn
these types in place of the built-in `Explore`, `general-purpose` and
`Plan` types." Three skills still name a built-in type:

- `.claude/skills/code-review/SKILL.md:60` — "Use the `general-purpose`
  subagent for both."
- `.claude/skills/qa/SKILL.md:24` — `subagent_type=Explore`
- `.claude/skills/improve-codebase-architecture/SKILL.md:27` —
  `subagent_type=Explore`

Each has a byte-identical copy under `.agents/skills/`. Found with
`grep -rn -E "subagent_type=Explore|general-purpose\` subagent" .claude/skills .agents/skills`.

`code-review` matters most. `pre-merge-review` step 2 says Claude Code
review axes run as `general-task` agents, then invokes `code-review`
"unchanged", which spawns `general-purpose`. The Standards and Spec axes
therefore run on a built-in whose effort is unverified.

The approved proposal left these skills unchanged on purpose ("upstream-
sourced generic skills that name no model … Edit them only if the owner
wants the skills themselves pinned"). This ticket asks the owner that
question.

## What to do

1. Ask the owner, in plain prose, whether to pin these three skills.
   AGENTS.md requires approval before a skill file is edited.
2. If yes: on Claude Code, replace each built-in with `general-task`
   (`model: "opus"`), or `simple-task` where the job is extremely simple.
   Copy each edit byte-for-byte to `.agents/skills/`.
3. If no: add one sentence to `pre-merge-review` step 2 saying which type
   the `code-review` axes run on, so the two skills stop disagreeing.

Done when: the grep above finds no built-in type in a skill the owner chose
to pin, `pre-merge-review` and `code-review` agree on the axis agent type,
and `pnpm verify` passes.
