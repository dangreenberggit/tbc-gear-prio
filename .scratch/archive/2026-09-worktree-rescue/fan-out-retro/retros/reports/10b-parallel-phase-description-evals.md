# Parallel-phase description trigger evals (smoke)

**Date:** 2026-07-27  
**Skill:** `parallel-phase`  
**Method:** [agentskills.io optimizing-descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) — labeled should / should-not prompts only. Not a CI harness. Treat as smoke, not proof.

**Current description:**

> Fan-out parallel independent slices on a feature branch. Use when tasks can run in parallel (different kinds of work, mostly disjoint files), when the user asks to fan out / delegate / orchestrate workers, or when another skill needs worktree-isolated parallel coding.

## Should trigger

| # | Prompt sketch |
| --- | --- |
| S1 | “These three tickets are independent — fan out workers on the phase branch.” |
| S2 | “Partition the remaining Phase 1 work into parallel slices with disjoint files.” |
| S3 | “Orchestrate worktree-isolated workers for protos vs item-gem index.” |
| S4 | “Delegate the DOC and ENV doc fixes in parallel; I’ll merge.” |
| S5 | “Same shape as last fan-out: independent report files, one worker each.” |

## Should not trigger (near-misses)

| # | Prompt sketch | Why not |
| --- | --- | --- |
| N1 | “Fix the null check in `rank.ts`.” | Single-file sequential fix |
| N2 | “Run pre-merge review on this branch.” | Review skill, not fan-out |
| N3 | “Land when ready.” | Land loop / ask-before-land |
| N4 | “What’s in the fan-out-retro worktree?” | Curiosity / read-only peek |
| N5 | “Explain how parallel-phase works.” | Docs question, not a fan-out job |
| N6 | “Continue the compose stage TDD.” | Single sequential slice |

## How to use

In a fresh session, paste one row and note whether the agent loads `parallel-phase` without being told the skill name. Adjust the **description** leading words if should-rows miss or should-not rows false-fire. Do not grow the description to fit this list.
