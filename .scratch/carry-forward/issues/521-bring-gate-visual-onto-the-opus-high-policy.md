Status: open
Type: task
Origin: docs/reviews/feat-orchestration-model-policy.md
Blocks: none
Blocked by: feat/tab-signoff-followups merged to dev (it is the only branch with `.claude/agents/gate-visual.md`)

# Bring gate-visual onto the Opus-at-high policy after both branches merge

feat/orchestration-model-policy (1d86fd48) moved every `gate-*` seat to
`model: opus` plus a new effort in frontmatter, and says so in
`docs/agents/model-policy.md` § Claude Code ("`gate-*` seats | `opus` |
`high`; `gate-planner` `xhigh`"). `gate-visual.md` is not on `dev`, so that
branch could not edit it. On feat/tab-signoff-followups it still has
`effort: medium` and no `model:` line
(`git show feat/tab-signoff-followups:.claude/agents/gate-visual.md`).

The stage-gate seat table will conflict when the second branch merges,
which makes the Visual row visible. `gate-visual.md` itself will not
conflict, so it would silently keep `medium`.

## What to do

Once both branches are on `dev`:

1. In `.claude/agents/gate-visual.md`, replace `effort: medium` with
   `model: opus` and `effort: high`.
2. In `.claude/skills/stage-gate/SKILL.md` § Seats, make the Visual row
   `| Visual | \`gate-visual\` | \`opus\` | \`high\` | review |`. Copy the
   file byte-for-byte to `.agents/skills/stage-gate/SKILL.md`.
3. In `docs/agents/model-policy.md` § Stage-gate seats, add Visual to
   "Reviewer, Executor and SME = review".

AGENTS.md requires owner approval before a skill file is edited. The
approved proposal (2026-09-25) already specified steps 1 and 2 word for word.

Done when: `git grep -n "effort: medium" .claude/agents` prints nothing,
the stage-gate table has a Visual row at `high`, and `pnpm verify` passes.
