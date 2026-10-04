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
| Planner | `gate-planner` | `fable` | `low` | design |
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
its model. A call-site name outranks frontmatter, so a wrong name
there is the one way a seat runs on the wrong model. Every
seat self-checks and returns `WRONG_MODEL: <name>` on a mismatch: respawn
with the model the seat table names, not the model the return says it
expected (a session started before a seat file changed may hold the old
check). A `subagent_type` the harness does not recognize has no
registered agent definition. First check that a file under
`.claude/agents/` sets that exact value as its `name:`. If it does and the
type is still unknown, restart the session. New agent files have
registered without a restart (seen in harness notices on 2026-09-25), so
check before restarting.

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
   write `brief.md` — goal, the tickets in scope, constraints, and what
   done means, in terms the planner can plan against. Start
   `decision-log.md` in the format below. Confirm
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

   `decision-log.md` is an index for a later investigator: each line
   says what was decided, why in one line, and where to look. Append
   one line per event, in the order the events happen. `<time>` is the
   output of `date -u +%Y-%m-%dT%H:%MZ` (Bash); one call may stamp all
   the lines you append together. `<session>` is the session ID: the
   folder name just above `scratchpad` in the scratchpad path your
   system prompt gives, or `unknown`.

       <time> | <session> | gate <A, B, C, or chunk id> | <outcome> | round <n> | <reason, one line>
       <time> | <session> | row <finding or ledger id> | <fixed, accepted, rejected, advisory, rework, or escalate> | <reason, one line> | evidence: <file:line, command, or none>
       <time> | <session> | spawn <subagent_type> (<model>) | <started or returned> | agent <agent id or n/a> | subagent_tokens <n or n/a> | <mode, part id or chunk id>
       <time> | <session> | note <sha, question, or tickets> | <the SHA, the question and its answer, or the ticket ids> | <reason, one line>

   - `gate`: each gate outcome.
   - `row`: each Gate B finding (`advisory` for a `minor` finding that
     rides along) and each Gate C ledger row, non-`success` status and
     out-of-manifest path.
   - `spawn`: a `returned` line for every spawn you make, with the
     `subagent_tokens` figure its result reports, or `n/a` if it shows
     none. A `started` line goes before a spawn only where a step asks
     for one; it has `agent n/a` and `subagent_tokens n/a`.
   - `note`: the SHAs that steps 1 and 5 record, each question and
     answer of step 5, and filed ticket ids with the new HEAD.

   Write the reason on every line. Write `evidence: none` when you
   checked nothing.

2. **Plan.** Every `gate-planner` spawn (`model: "fable"`) names the
   absolute paths of `brief.md`,
   `.claude/skills/stage-gate/plan-template.md` and the stage folder.
   Spawn one. When it returns a plan, write it to `plan.md` verbatim.
   When its final message starts with `DECISION:`, it has split the
   brief and written its files itself: this is a **split run**, marked
   by a `decomposition.md` in the stage folder. When the Parts table
   there has more than one part, spawn one `gate-planner` with
   `part: <id>` for each part after `P1`, in order and one at a time;
   then one with `reconcile`, which writes `plan.md`. Write a `started`
   line before every `gate-planner` spawn.
   When a planner's final message lists "Open questions", put them to
   the user before the next spawn and send the answers back to that
   planner (`SendMessage` it, or respawn it in the same mode with the
   answers). There is one round of answers.

   **Gate A (mechanical):** every template section present; Claims
   register nonempty; Paths manifest present; every open question in the
   brief answered with its three items, or assigned to a deferred part;
   `git status --porcelain` still empty. Compare against the SHA logged in step 1.
   New changes mean the seat edited files: **stop and report them to the
   user** — never revert, because another agent's live work looks identical
   from here (ticket 261). Respawn once with the violation named (on a
   split run, `gate-planner` with `re-split: gate A`). One respawn per
   gap; a second failure goes to the user. Log the outcome.

   On a split run, Gate A also checks: `decomposition.md` has a
   `DECISION:` line and a Why; when two or more parts were planned,
   every planned part has its `parts/<id>/plan.md` and `plan.md` has a
   Seams section; every deferred part has its `parts/<id>/ticket.md`.

   When `plan.md` is over the stage budget (more than 5 execution chunks
   or 700 lines; starting values, hypothesis, untested), spawn
   `gate-planner` once per stage, before the review, with
   `re-split: over budget`; it rewrites `plan.md` itself. Then run Gate
   A on the result.

   Deferrals made at the first split stand, and the reviewer checks
   them. A deferral made by a re-split, and any open question of the
   brief assigned to a deferred part, goes to the user before Gate B
   passes. If the user rejects one, spawn `gate-planner` with
   `re-split: ruling` and the ruling; it rewrites `plan.md` itself, and
   that is one revision round.

3. **Review.** Spawn `gate-reviewer` (`model: "opus"`) with the paths of
   `brief.md`, `plan.md` and, on a split run, `decomposition.md`. Write
   its final message to `plan-review.md`. Same clean-tree check.

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
   - On a split run, when a `blocking` or `material` finding has
     `Where: decomposition`, the round's revision is one `gate-planner`
     (`model: "fable"`) with `plan-review.md` and `re-split: review`. It
     handles every finding and rewrites `plan.md` itself. Every other
     revision prompt on a split run says: keep each step's part id and
     the `## Seams` section.
   - Proceed when: no blocking finding stands; every `material` finding is
     fixed in the plan or accepted in `decision-log.md` with a reason;
     `minor` findings ride along to the executor as advisories.
   - A seat contradiction you cannot settle by having a subagent re-run a
     command is the user's call. Log every gate outcome.
   - When `decomposition.md` lists deferred parts, after Gate B passes
     spawn one `general-task` (`model: "opus"`) to file the
     `parts/<id>/ticket.md` of each part in the Deferred table as a
     ticket per `docs/agents/issue-tracker.md` and commit them. Log
     their ids and the new `git rev-parse HEAD`.

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
   `.scratch/stage-gate/<slug>/`. Name any deferred-part tickets in the
   reply, and say they are visible from `dev` only after this branch
   merges.

## Recovery

A dead or cut-off seat retains its context — `SendMessage` it to resume
before respawning. An executor past about 25 tool calls is respawned for
its chunk instead, and resumes from `progress.md`. Before any executor
respawn, run `git status --porcelain` and `git rev-parse HEAD`: pass the
fresh SHA, and name any dirty paths in the prompt as probably the
earlier executor's unfinished work. Every stage artifact is on disk the
moment its stage ends, so a fresh session resumes from
`decision-log.md`: the last logged gate is where you are. In a fresh
session, a planner spawn with a `started` line and no `returned` line
after it was cut off: respawn it in the same mode.

## Run log (Claude Code)

Two async hooks (`.claude/hooks/log-agent-run.py`, registered in
`.claude/settings.json`) append one JSON line per subagent report, at
any depth, to `.scratch/agent-runs/<session>.jsonl`, where `<session>`
is a session ID as in `decision-log.md`. The `decisions` field holds
the report's `## Decisions` section. To trace a decision: find its line
in `decision-log.md`, grep `.scratch/agent-runs/*.jsonl` for the agent
id or agent type, read `decisions`, then open `agent_transcript_path`
if it still exists (transcripts are deleted after `cleanupPeriodDays`,
default 30: https://code.claude.com/docs/en/settings-reference.md).
The run log is gitignored and per-checkout. A missing or empty run log
never stops a run; say so in the hand-off reply.

## Do not

- Implement plan steps yourself between gates — this seat writes only the
  stage artifacts.
- Spawn any seat without naming its model at the call site.
- Resolve a judgment-level contradiction between seats by silently picking
  a side — have a subagent re-run the command that settles it, or hand it
  to the user.
- Carry a `blocking` finding into step 5 under any wording.
