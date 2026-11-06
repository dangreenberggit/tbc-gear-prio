Status: open
Type: task
Origin: stage-gate fix draft 3 and its instruction-review, 2026-11-05 (record below)
Blocks: none
Blocked by: none

# The stage-gate skill has no way to re-plan a step that turns out wrong during the build

## What happens today

In the stage-gate skill (`docs/agents/home/skills/stage-gate/SKILL.md`),
once step 5 (Execute) has started, a plan step can turn out to be wrong:
an executor stops on it, or the answer to a `NEEDS_PRIOR_CONTEXT`
question shows it must change. Gate C (step 6) then offers `accepted`,
`rework` or `escalate`. `rework` respawns an executor on the same plan,
so it stops at the same place. No step sends the chunk back to a
`gate-planner` for a new revision and review. On 2026-11-03, with no
route, the session put plan-review findings into an executor's prompt as
notes and ran only steps 1-3 of chunk K1
(`.scratch/stage-gate/p45-dps-pass-452/decision-log.md`, the 15:15Z and
15:16Z lines). The owner, 2026-11-03: "tacking on prompts that
contradict the plan rather than simply amending the plan is fucking
dumb".

On 2026-11-05 the owner chose a smaller fix, "sure ban sounds fine": the
skill forbids putting a step change, or part of a chunk, in an executor's
prompt, and a step found wrong during the build goes to the user through
`escalate`. That ban was still waiting for the owner's approval of its
exact text when this ticket was filed. This ticket holds the larger part
that was left out: a route that re-plans the chunk instead of asking the
user each time.

## Earlier attempt and its open problems

Draft 3 tried this route ("plan a chunk again" in step 5). Its record,
review, assessor answers and dry trial are in the main checkout at
`.scratch/agent-reports/2026-11-05-general-task-stage-gate-fix-draft3.md`
and the folder `.scratch/agent-reports/2026-11-05-stage-gate-fix-draft3/`
(both gitignored, so they exist only in that checkout). Its review left
four problems open, each needing a rule change:

1. After a re-plan, `rework` still gives the executor the old ledger row,
   which describes a step change, beside the new plan. The executor can
   follow the row instead of the plan.
2. The stopped executor's uncommitted files are logged but not given to
   the planner, and the planner is not told which steps already ran. A
   respawned executor can finish work for a step the new plan changed.
3. After a re-plan, a session that keeps running and a fresh session
   that resumes from `decision-log.md` count a chunk's reviews
   differently, so they disagree on which review is the last round.
4. No one checks that the new plan reaches the result the session asked
   the planner for.

The assessor of that review judged that each draft added text in which
the next review found new gaps, and that another round would most likely
find more (record above, "Assessor").

## Done when

- The owner has ruled whether the skill gets a mid-build re-plan route.
- If yes: the skill text answers problems 1-4 above, the owner approved
  its exact text, `instruction-review` ran on it, and a trial ran it once
  on the old text and once on the new (instruction-review § Check 3).
- If no: this ticket is closed as `wontfix` with the owner's words.
