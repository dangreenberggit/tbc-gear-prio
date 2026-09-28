---
name: stage-gate
description: Sequential stage-gate pipeline - plan, adversarial plan review, fresh-context execution, with the session as non-executing gatekeeper. Use when a wrong plan would be expensive, when the user asks to stage-gate a feature or to review a plan before building, or when planning and implementation should not share context.
---

# Stage-gate

Stage-gate turns your intent into finished work through a pipeline of
specialized seats — planning, reviewing, executing, judging domain
output — while the session stays a thin overseer. The seats do the
digging and the deciding within their scope; the session routes their
findings to the next seat, judges each gate, and passes plain-English
conclusions back to you. It does no seat work itself — its only writes
are the stage artifacts.

This division keeps the session's context clean enough to judge: the
heavy detail lives in the seats, so the session holds conclusions, not
raw output. So when a step raises a question, its default move is to send
it to a seat, not to guess and not to ask you — investigating is what the
pipeline is for. Bring a question up to you only when a seat's findings
genuinely fork on what you want, one no further investigation settles.

Each seat's report carries a plain-English summary alongside its detail,
so that when something does reach you, it reaches you in language you can
act on.

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
| Planner | `gate-planner` | `opus` | `xhigh` | design |
| Reviewer | `gate-reviewer` | `opus` | `high` | review |
| Executor | `gate-executor` | `opus` | `high` | review |
| SME | `gate-sme` | `opus` | `high` | review |
| Visual | `gate-visual` | `opus` | `high` | review |

The Executor is on the review lane, not the workhorse lane, because
plans are underspecified and it decides adapt-vs-flag-vs-stop on every
step where reality disagrees with the plan — the failure mode is a silent
paper-over, which is a judgment failure, not a throughput one. Its
`parallel-phase` workers are a separate call: `simple-task` for an
extremely simple slice, `general-task` for every other slice.

Name the model on every spawn, even though each seat's frontmatter sets
`model: opus`. A call-site name outranks frontmatter, so a wrong name
there is the one way a seat runs on the wrong model. Every
seat self-checks and returns `WRONG_MODEL: <name>` on a mismatch: respawn
with the model named. A `subagent_type` the harness does not recognize
means `.claude/agents/` changed after session start — agent files register
at startup only; restart the session.

## Orchestrator conduct

You drive a multi-turn pipeline across gates. How you carry it matters as
much as the gate logic. These are the positive counterparts to the `## Do
not` list below.

1. **Act on standing instructions; don't re-confirm them.** When the user
   gives an ordered plan — "do the work, then plan the reviews, then run
   them" — carry it to the next natural stopping point without asking
   permission at each seam. A clear instruction already on the table is your
   go signal. Re-asking makes the user repeat themselves.
2. **Scope a "stop" to the turn it was given for.** "Stop after the plan is
   solidified" governs the turn it was said in, not every future phase. When
   you get a fresh go-ahead, the earlier stop is spent. Track what each
   instruction attaches to, and let it expire when its turn ends.
3. **Route detail outward; keep the judgment.** Track what's done, what's
   next, and what's blocked. Delegate the detail and keep the one-paragraph
   conclusion. You judge the result; you don't author it. A question
   between gates goes to a seat, or to a `general-task` / `simple-task`
   agent. The only commands you run are the gate checks that AGENTS.md
   § The session delegates lists.
4. **Let open issues block end-of-line moves like merge.** When a phase
   produces open tickets — a correctness gap, a test hole, a half-delivered
   feature — the honest next step is to close that work. "No blocking review
   findings" is a fact about the review, not a verdict that the work is done.
   Reserve merge (and other end-of-line moves) for when the work is done by
   the user's bar, and say plainly when it isn't. Ties to step 7 (ask before
   merge) and the AGENTS.md merge gate.
5. **Carry every decision whose answer is derivable; hand back the ones that
   are the user's to make.** Points 1–4 all say "carry the work yourself" —
   this is the limit. Intent, priorities, spending, and anything irreversible
   are the user's call, not yours to decide because you could. Surfacing one
   of those is not a re-ask; deciding it silently is the failure.

## Steps

1. **Open the stage.** Pick `<slug>`; create `.scratch/stage-gate/<slug>/`;
   write `brief.md` — goal, constraints, and what done means, in terms the
   planner can plan against. Start `decision-log.md` (one dated line per
   gate: gate, outcome, reason, round count; step 5 adds lines per chunk
   and per question). Confirm
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

2. **Plan.** Spawn `gate-planner` (`model: "opus"`) with the absolute
   paths of `brief.md` and
   `.claude/skills/stage-gate/plan-template.md`. Write its final message
   to `plan.md` verbatim.

   **Gate A (mechanical):** every template section present; Claims
   register nonempty; Paths manifest present; every open question in the
   brief answered with its three items; `git status --porcelain`
   still empty. Compare against the SHA logged in step 1.
   New changes mean the seat edited files: **stop and report them to the
   user** — never revert, because another agent's live work looks identical
   from here (ticket 261). Respawn once with the violation named. One respawn per gap; a second failure goes to the
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
   - A seat contradiction you cannot settle by having a subagent re-run a
     command is the user's call. Log every gate outcome.

5. **Execute.** Run one `gate-executor` (`model: "opus"`) per execution
   chunk, in order. A plan whose `Execution chunks` section is missing or
   says "none" is one chunk, `K1`, covering every step. For each chunk:
   resolve the base SHA fresh (`git rev-parse HEAD` — paste command
   output, never hand-typed), then spawn the executor with the paths of
   `plan.md`, `plan-review.md` and `execution-report.md` (the earlier
   chunks' reports), the absolute path of `progress.md` in the stage
   folder of this checkout, the chunk id, the base SHA, the current branch
   name, and its checkout mode: shared checkout (default — you write
   nothing while it runs) or `isolation: worktree` when the tree must stay
   free (the seat's base-SHA assertion is what makes worktree mode safe on
   a feature branch). A plan with more than one chunk uses the shared
   checkout, so each chunk starts from the commits of the one before.
   Append its final message to `execution-report.md` under the chunk id,
   and log the chunk id, its base SHA and the executor's agent id in
   `decision-log.md`. A fresh executor per chunk keeps each context small.
   A chunk whose handoff `Status` is not `success`, or whose ledger has a
   `flag` or `stop` row, goes to Gate C before the next chunk starts. A
   `NEEDS_PRIOR_CONTEXT` return is not a handoff.

   An executor that returns `NEEDS_PRIOR_CONTEXT: <question>` has hit a
   gap that `progress.md` and the earlier reports do not answer. Append
   its message (the question and its ledger so far) to
   `execution-report.md` under the chunk id. Find in `decision-log.md`
   the most recent executor that ran the chunk the question is about,
   `SendMessage` it the question (it keeps its context) and ask it to
   answer only, with no edits or commits, and log the question and
   answer. Then give the answer to the asking executor: `SendMessage` it
   when it made fewer than about 25 tool calls, or else respawn it for the
   same chunk with a fresh base SHA and the answer in its prompt.

   When the plan has an SME step, the executor spawns `gate-sme` once and
   commits its handoff. That handoff is the ticket's SME verdict: Gate C
   dispositions it like a ledger row, and a second SME runs only when the
   executor's ledger marks the verdict `contested`.

   When a plan step carries a `Visual check:` line, the executor looks at
   each named fixture before that unit's re-pin (`pnpm tab-fixtures:smoke`
   and its PNGs, or the fixture's link in the Browser pane), judges it
   against the sentence, and records the smoke line and what it saw in its
   ledger. That is the whole check: no `tab-review` run and no
   `gate-visual` seat.

   When a plan step carries a `Visual acceptance:` block, the executor
   writes the unit's manifest, runs `pnpm tab-review <manifest>`, and spawns
   `gate-visual` once per unit before that unit's re-pin. The handoff is the
   tickets' visual verdict: Gate C dispositions it like a ledger row, and a
   second visual seat runs only when the ledger marks it `contested`. A
   ticket with a Visual acceptance is not closed on `fail` or
   `cannot-judge`.

6. **Gate C.** Disposition every Deviation-ledger row, and every chunk
   `Status` that is not `success`, in `decision-log.md`: `accepted`,
   `rework` (respawn a `gate-executor` for the affected chunk with a fresh
   base SHA and the ledger row; `SendMessage` the same executor only when
   it made fewer than about 25 tool calls), or `escalate` to the user.
   Then cross-check `git diff --stat <base SHA>..HEAD`, using the first
   chunk's base SHA, against the plan's Paths manifest: any
   out-of-manifest path with no ledger row becomes one now and is
   dispositioned like the rest. `progress.md`, the executor's resume
   file, is not an out-of-manifest path.

   A Gate C between chunks covers that chunk's rows and status. Step 5
   goes on to the next chunk only when all of them are `accepted`. The
   final Gate C covers the remaining rows and statuses and runs the diff
   check.

   Done when (final Gate C): every ledger row, every non-`success`
   status and every out-of-manifest path is dispositioned, the report
   shows `pnpm verify` passed on the tip, and every ticket with a Visual
   acceptance has a `pass` row or an accepted / escalated disposition.

7. **Hand off.** The normal loop resumes: `pre-merge-review`, then **ask**
   before `pnpm merge-to-dev`. Stage artifacts stay in
   `.scratch/stage-gate/<slug>/`.

## Recovery

A dead or cut-off seat retains its context — `SendMessage` it to resume
before respawning. An executor past about 25 tool calls is respawned for
its chunk instead, and resumes from `progress.md`. Before any executor
respawn, run `git status --porcelain` and `git rev-parse HEAD`: pass the
fresh SHA, and name any dirty paths in the prompt as probably the
earlier executor's unfinished work. Every stage artifact is on disk the
moment its stage ends, so a fresh session resumes from
`decision-log.md`: the last logged gate is where you are.

## Do not

- Implement plan steps yourself between gates — this seat writes only the
  stage artifacts.
- Spawn any seat without naming its model at the call site.
- Resolve a judgment-level contradiction between seats by silently picking
  a side — have a subagent re-run the command that settles it, or hand it
  to the user.
- Carry a `blocking` finding into step 5 under any wording.
