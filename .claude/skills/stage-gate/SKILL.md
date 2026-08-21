---
name: stage-gate
description: Sequential stage-gate pipeline - plan, adversarial plan review, fresh-context execution, with the session as non-executing gatekeeper. Use when a wrong plan would be expensive, when the user asks to stage-gate a feature or to review a plan before building, or when planning and implementation should not share context.
---

# Stage-gate

A sequential pipeline of distinct seats — Planner → Reviewer → Executor —
with the **session as orchestrator**: it routes, judges at the gates, and
implements nothing; its only writes are the stage artifacts below.
Complementary to `parallel-phase` (which partitions one phase into
parallel slices): stage-gate sequences different kinds of work, and its
Executor may run `parallel-phase` inside its own stage. `pre-merge-review`
runs after, unchanged — this skill reviews the plan before code exists;
that one reviews the diff after.

## Seats

| Seat | subagent_type | Call-site model | Frontmatter effort | Lane |
| --- | --- | --- | --- | --- |
| Planner | `gate-planner` | `fable` | `low` | design |
| Reviewer | `gate-reviewer` | `opus` | `medium` | review |
| Executor | `gate-executor` | `opus` | `medium` | review |
| SME | `gate-sme` | `opus` | `medium` | review |

The Executor is on the review lane, not the workhorse lane, because
plans are underspecified and it decides adapt-vs-flag-vs-stop on every
step where reality disagrees with the plan — the failure mode is a silent
paper-over, which is a judgment failure, not a throughput one. Its
`parallel-phase` workers are a separate call: pick each worker's model
from the difficulty of its slice.

Name the model on every spawn — frontmatter cannot name Fable, and an
unnamed seat inherits the session's model at the session's price. Every
seat self-checks and returns `WRONG_MODEL: <name>` on a mismatch: respawn
with the model named. A `subagent_type` the harness does not recognize
means `.claude/agents/` changed after session start — agent files register
at startup only; restart the session.

## Steps

1. **Open the stage.** Pick `<slug>`; create `.scratch/stage-gate/<slug>/`;
   write `brief.md` — goal, constraints, and what done means, in terms the
   planner can plan against. Start `decision-log.md` (one dated line per
   gate: gate, outcome, reason, round count). Confirm
   `git status --porcelain` is empty and record `git rev-parse HEAD` in
   the log.

   When the deliverable is a decision — the ticket ends in a
   recommendation, a chosen design, or a keep/change/remove verdict
   rather than a change it already specifies — list each **open
   question** in the brief and require, per question: a candidate approach that is not the same approach with
   different constants; the result that would make that candidate win,
   written down before anything is measured; and a measurement of it, or
   the reason the committed fixtures cannot measure it. A candidate the
   plan drops carries a stated reason.

   Done when: `brief.md` answers "what exists when this is done", every
   open question carries those three items, the tree is clean, and the SHA
   is logged.

2. **Plan.** Spawn `gate-planner` (`model: "fable"`) with the absolute
   paths of `brief.md` and
   `.claude/skills/stage-gate/plan-template.md`. Write its final message
   to `plan.md` verbatim.

   **Gate A (mechanical):** every template section present; Claims
   register nonempty; Paths manifest present; every open question in the
   brief answered with its three items; `git status --porcelain`
   still empty. A dirty tree means the seat edited files: run
   `git checkout -- .`, discard the output, respawn once with the
   violation named. One respawn per gap; a second failure goes to the
   user. Log the outcome.

3. **Review.** Spawn `gate-reviewer` (`model: "opus"`) with the paths of
   `brief.md` and `plan.md`. Write its final message to `plan-review.md`.
   Same clean-tree check.

4. **Gate B (judgment — yours).** Reconcile each finding against the
   brief's intent — a finding can be correct about the plan and wrong
   about the goal; that reconciliation is this seat's job, not the
   reviewer's.
   - A `blocking` finding, or a refuted load-bearing claim → loop back:
     respawn `gate-planner` with brief + plan + review for a revision,
     then `gate-reviewer` on the changed claims only. **One revision
     round is the norm.** Loop back again only while a `blocking` finding
     still stands after the revision; a third disagreement goes to the
     user with the contradiction stated, not resolved.
   - Proceed when: no blocking finding stands; every `material` finding is
     fixed in the plan or accepted in `decision-log.md` with a reason;
     `minor` findings ride along to the executor as advisories.
   - A seat contradiction you cannot settle by re-running a command is the
     user's call. Log every gate outcome.

5. **Execute.** Resolve the base SHA fresh (`git rev-parse HEAD` — paste
   command output, never hand-typed). Spawn `gate-executor`
   (`model: "opus"`) with the paths of `plan.md` and `plan-review.md`,
   the base SHA, the current branch name, and its checkout mode: shared
   checkout (default — you write nothing while it runs) or
   `isolation: worktree` when the tree must stay free (the seat's
   base-SHA assertion is what makes worktree mode safe on a feature
   branch). Write its final message to `execution-report.md`.

   When the plan has an SME step, the executor spawns `gate-sme` once and
   commits its handoff. That handoff is the ticket's SME verdict: Gate C
   dispositions it like a ledger row, and a second SME runs only when the
   executor's ledger marks the verdict `contested`.

6. **Gate C.** Disposition every Deviation-ledger row in
   `decision-log.md`: `accepted`, `rework` (`SendMessage` the same
   executor — it retains context — or respawn), or `escalate` to the user.
   Then cross-check `git diff --stat <base SHA>..HEAD` against the plan's
   Paths manifest: any out-of-manifest path with no ledger row becomes one
   now and is dispositioned like the rest.

   Done when: every ledger row and every out-of-manifest path is
   dispositioned, and the report shows `pnpm verify` passed on the tip.

7. **Hand off.** The normal loop resumes: `pre-merge-review`, then **ask**
   before `pnpm merge-to-dev`. Stage artifacts stay in
   `.scratch/stage-gate/<slug>/`.

## Recovery

A dead or cut-off seat retains its context — `SendMessage` it to resume
before respawning. Every stage artifact is on disk the moment its stage
ends, so a fresh session resumes from `decision-log.md`: the last logged
gate is where you are.

## Do not

- Implement plan steps yourself between gates — this seat writes only the
  stage artifacts.
- Spawn any seat without naming its model at the call site.
- Resolve a judgment-level contradiction between seats by silently picking
  a side — re-run the command that settles it, or hand it to the user.
- Carry a `blocking` finding into step 5 under any wording.
