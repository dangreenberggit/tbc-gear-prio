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

The seats run in sequence — Planner → Reviewer → Executor — and the
session that runs them is the **orchestrator**.
Complementary to `parallel-phase` (which partitions one phase into
parallel slices): stage-gate sequences different kinds of work, and its
Executor may run `parallel-phase` inside its own stage. The project's
review step (`docs/agents/stage-gate-project.md` § Hand off) runs after,
unchanged — this skill reviews the plan before code exists; that one
reviews the diff after.

This project's values — folders, commands, ticket rules, worker lanes,
project seats — are in `docs/agents/stage-gate-project.md` at the
checkout root. Read it before step 1. Each rule below that depends on one
of them names that file's section.

## Seats

| Seat | subagent_type | Call-site model | Frontmatter effort | Lane |
| --- | --- | --- | --- | --- |
| Planner | `gate-planner` | `fable` | `low` | design |
| Reviewer | `gate-reviewer` | `opus` | `high` | review |
| Executor | `gate-executor` | `opus` | `high` | lead |

The project seats and when they run:
`docs/agents/stage-gate-project.md` § Project seats.

The Executor runs on Opus at effort `high` because plans are
underspecified and it decides adapt-vs-flag-vs-stop on every
step where reality disagrees with the plan — the failure mode is a silent
paper-over, which is a judgment failure, not a throughput one. Its
`parallel-phase` workers are a separate choice
(`docs/agents/stage-gate-project.md` § Worker lanes, Executor). Every
seat hands its workhorse jobs — searches, plain reads, named runs,
measurements — to the workhorse types that section names for the seat,
with several jobs in each helper's prompt.

Name the model on every spawn, even though each seat's frontmatter sets
its model. A call-site name outranks frontmatter, so a wrong name
there is the one way a seat runs on the wrong model. Every
seat self-checks and ends with the final message `WRONG_MODEL: <name>` on
a mismatch: respawn with the model the seat table names, not the model
that message says it expected (a session started before a seat file changed may hold the old
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
   between gates goes to a seat or to a judgment agent; a workhorse job
   goes to a workhorse type (`docs/agents/stage-gate-project.md` § Worker
   lanes names both). The only commands you run are the ones that file's
   § Session commands lists. Tell the user that an agent is working
   only when it is **working** (step 1 **Open the stage**, the `spawn`
   lines). When it is **waiting** (same place), tell the user that it has
   stopped and may resume on its own, and when the session will send it
   the **one message to a waiting agent**.
4. **Let open issues block end-of-line moves like merge.** When a phase
   produces open tickets — a correctness gap, a test hole, a half-delivered
   feature — the honest next step is to close that work. "No blocking review
   findings" is a fact about the review, not a verdict that the work is done.
   Reserve merge (and other end-of-line moves) for when the work is done by
   the user's bar, and say plainly when it isn't. Ties to step 7 (ask before
   merge) and the project's merge rule
   (`docs/agents/stage-gate-project.md` § Hand off).
5. **Carry every decision whose answer is derivable; hand back the ones that
   are the user's to make.** Points 1–4 all say "carry the work yourself" —
   this is the limit. Intent, priorities, spending, and anything irreversible
   are the user's call, not yours to decide because you could. Surfacing one
   of those is not a re-ask; deciding it silently is the failure.
6. **Pace the pipeline.** Hold at most two stages between step 2 and
   step 4 (planning or review) at once, and run one executor at a time
   across all stages; a further feature waits with its `brief.md`
   written and nothing spawned. The session limits the reviews of each
   chunk, a group of plan steps that one `gate-executor` runs (step 4,
   **Review limit per chunk**).
   This pacing is for this pipeline only: a plain request for a plan,
   outside stage-gate, is planned whole.

## Steps

In these steps, "you" and "the session" are the same agent.

1. **Open the stage.** Pick `<slug>`; create the stage folder
   (`docs/agents/stage-gate-project.md` § Folders);
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
       <time> | <session> | spawn <subagent_type> (<model>) | <started, resumed, resumed (waiting), returned (<status>), or returned (<status>, waiting)> | agent <agent id> | subagent_tokens <n or n/a> | <chunk id, or none>
       <time> | <session> | note <sha, question, or tickets> | <the SHA, the question and its answer, or the ticket ids> | <reason, one line>

   - `gate`: each gate outcome.
   - `row`: each Gate B finding, with the id `R<n>-<id>`, where `<n>` is
     the number in the `# Round <n>` heading of the `plan-review.md`
     section the finding came from (`advisory` for each `minor` finding);
     and each Gate C ledger row,
     non-`success` status and out-of-manifest path.
   - `spawn`: one line per event below, for every agent the session
     spawns. The session spawns every agent in the background (leave
     `run_in_background` unset). The harness then sends the session a
     `<task-notification>` each time the turn of that agent ends, so one
     agent can have several `returned` lines. On every `spawn` line of a
     `gate-reviewer`, the last field is the id of every chunk that the
     review covers and its round number, for example `K2 round 4`, or
     `K1 K2 round 1` for a review of a first plan that gives steps to
     `K1` and `K2`. For an
     **Unasked-changes check** (step 4), add `unasked-changes`, for
     example `K2 round 6 unasked-changes`.
     - `started`: the Agent call's tool result gave the new agent's id
       (the line `agentId: <id>`). The line has that agent id and
       `subagent_tokens n/a`.
     - `resumed`: the session sent the agent a `SendMessage`, and the
       tool result has `"success":true`. For the **one message to a
       waiting agent** (below), write `resumed (waiting)`.
     - `returned (<status>)`: a `<task-notification>` whose `<task-id>`
       is the agent id arrived. Write the text of its `<status>` tag in
       the brackets (seen: `completed`, `failed`, `killed`). Copy the
       number in its `<subagent_tokens>` tag, or write `n/a` when it has
       none. When its `<summary>` says the agent `is waiting on its own
       background work`, write `returned (<status>, waiting)`.
     An agent is **working** when the last `spawn` line with its agent id
     is `started`, `resumed` or `resumed (waiting)`. An agent's **final
     message** is the `<result>` of a `<task-notification>` with
     `<status>completed</status>` whose `<summary>` does not say the
     agent `is waiting on its own background work`. When the `<summary>`
     does say that, the `<result>` may be interim: log the `returned`
     line and act on nothing else in that notification.

     An agent is **waiting** when the last `spawn` line with its agent id
     is a `returned` line marked `waiting`. The **one message to a
     waiting agent** is one `SendMessage` with this text: "Read the
     output of your background work. When it has finished, end your turn
     with the final message your instructions ask for." The session sends
     it at most once to each agent. An agent has had it when a `spawn`
     line with its agent id is `resumed (waiting)`.

     When the session logs a `returned` line marked `waiting`, or a fresh
     session finds one in `decision-log.md`, for an agent that has not
     had the message, the session starts a timer: one Bash call
     `sleep 1800` with `run_in_background: true` and `timeout: 1900000`.
     When the timer ends, its notification starts a turn of the session.
     That notification does not say which agent the timer is for. So on
     each turn, the session gets the time with
     `date -u +%Y-%m-%dT%H:%MZ` and checks every waiting agent. When an
     agent's last `spawn` line is at least 30 minutes old and the agent
     has not had the message, the session sends it the message. (30
     minutes is a first guess, not measured: hypothesis, untested.) This
     holds for a `gate-executor` at any tool-call count. When the tool
     result lacks `"success":true`, or the agent's next notification
     again says it is waiting on its own background work, the session
     stops and tells the user.
   - `note`: the SHAs that steps 1 and 5 record, each question and
     answer of step 5, and filed ticket ids with the new HEAD.

   Write the reason on every line. Write `evidence: none` when you
   checked nothing.

2. **Plan.** Every `gate-planner` spawn (`model: "fable"`) names the
   absolute paths of `brief.md`,
   `.claude/skills/stage-gate/plan-template.md` and the stage folder.
   Spawn one. When a `gate-planner`'s final message is a plan, write it
   to `plan.md` verbatim.
   When its final message starts with `SPLIT:`, it planned nothing and
   proposes building the brief as separate stages, one line each, in
   build order. Log a `gate A` line with the outcome `split`, open one
   stage per line (step 1) with a brief cut from this one, and end this
   stage. For a line that no existing ticket covers, a judgment agent
   (`docs/agents/stage-gate-project.md` § Worker lanes) files a ticket
   first (same file, § Tickets). § Orchestrator conduct, point 6, paces
   the new stages.
   When a planner's final message lists "Open questions", put them to
   the user before the next spawn and send the answers back to that
   planner (`SendMessage` it, or respawn it with the same prompt and the
   answers). That planner receives the user's answers once.

   When a `gate-planner`'s final message is none of these — a plan,
   meaning a message with at least one `##` heading of
   `plan-template.md` (Gate A, not this rule, handles a plan with a
   missing section); a message that starts with `SPLIT:` or with
   `WRONG_MODEL:`; a message that lists "Open
   questions" — no agent is working on that `gate-planner`'s job. The
   session sends that `gate-planner` a `SendMessage` to its agent id with
   this text: "Your final message was not the final message your
   instructions ask for. If you started researchers, read their report
   files. Then end your turn with that final message." When the
   `SendMessage` tool result has `"success":true`, the session logs
   `resumed` in `decision-log.md`. When it lacks `"success":true`, the
   session respawns the `gate-planner` with the same prompt. When the next
   final message of the resumed or respawned `gate-planner` is again
   none of these, the session stops and tells the user.

   **Gate A (mechanical):** every template section present; the first
   chunk in `## Execution chunks` has steps, and no chunk with steps
   comes after a one-line chunk;
   Claims register nonempty; Paths manifest present; every open question
   in the brief that no earlier plan of the stage answered is answered
   with its three items, or named on the line of the later chunk that
   will answer it; `git status --porcelain` still
   empty; `git rev-parse HEAD` still the SHA in the latest `note sha`
   line (step 1, or step 5 before a new plan).
   New changes mean the seat edited files: **stop and report them to the
   user** — never revert, because another agent's live work looks identical
   from here. Respawn once with the violation named. One respawn per
   gap; a second failure goes to the user. Log the outcome.

3. **Review.** The session spawns `gate-reviewer` (`model: "opus"`).
   The session's spawn prompt gives the round number `<n>` (1 for the
   first review in the stage, then 1 higher for each later review,
   whichever chunk it reviews, so that no two `# Round` headings in
   `plan-review.md` share a number) and the
   absolute paths of `brief.md`, `plan.md` and `plan-review.md`, all in
   the stage folder.
   A review that follows a revision is a **re-review**. Its
   spawn prompt also names what the review checks. It
   names the claims and steps that the latest revision changed or added
   (those the listed findings asked for, and those on the revision's
   `- added:` and `- changed:` lines), and the `blocking` and `material`
   findings that the latest revision prompt listed, each by its `row` id
   `R<m>-<id>` (step 1). For an **Unasked-changes check** (step 4), it names
   only the claims and steps on the `- added:` and `- changed:` lines of
   the latest revision, and no findings. The prompt says that the review
   checks only those claims and steps and whether `plan.md` now fixes
   each named finding, and does not review the rest of the plan.
   The `gate-reviewer` writes its review into `plan-review.md` under the
   heading `# Round <n>` (`.claude/agents/gate-reviewer.md` § Report).
   The session writes nothing to `plan-review.md`. After the
   `gate-reviewer`'s final message arrives, the session acts in this
   order:
   - When the final message starts with `WRONG_MODEL:`, the session
     spawns a new `gate-reviewer` with the same prompt and round number
     and the model that the § Seats table names.
   - Otherwise the session reads the last section of `plan-review.md`
     headed `# Round <n>`. When that section is missing or has no
     `VERDICT:` line, the session sends that `gate-reviewer` (same agent
     id) one `SendMessage` that asks it to write the `# Round <n>`
     section. When the tool result has `"success":true`, the session
     logs `resumed` in `decision-log.md`. When the tool result lacks
     `"success":true`, or the section is still missing or has no
     `VERDICT:` line after that `gate-reviewer`'s next final message,
     the session stops and tells the user.
   - The session runs Gate A's clean-tree check
     (`git status --porcelain` is still empty), then judges Gate B
     (step 4) from that section.

4. **Gate B (judgment — yours).** Reconcile each finding against the
   brief's intent — a finding can be correct about the plan and wrong
   about the goal; that reconciliation is the session's job, not the
   reviewer's. A **refuted load-bearing claim** is a Claims-register row
   whose `Load-bearing` cell is `yes` (`plan-template.md` § Claims
   register) and whose verdict in the `## Register verdicts` table of the
   review is `refuted`.
   - **Loop back.** A `blocking` finding, or a refuted load-bearing
     claim → loop back: respawn `gate-planner` with brief + plan +
     review + the id of each chunk that the latest review covers (the
     last field of that `gate-reviewer`'s `spawn` line), for a revision,
     then spawn a `gate-reviewer` for a re-review
     (step 3). Loop back a second time only when the
     re-review after the first loop-back has a `blocking` finding or a
     refuted load-bearing claim. After the revision of the second
     loop-back, the session spawns one more `gate-reviewer` for a
     re-review. That re-review is the chunk's third review, and
     **Review limit per chunk** below says what the session does next.
   - No `blocking` finding and no refuted load-bearing claim, but one or
     more `material` findings need a change to `plan.md` → the session
     spawns one `gate-planner` revision with brief + plan + review + the
     id of each chunk that the latest review covers (the last field of
     that `gate-reviewer`'s `spawn` line), then
     runs Gate A. This revision is not a loop-back and does not count
     toward the two loop-backs that **Loop back** allows. The session
     spawns a `gate-reviewer` for a re-review (step 3) only when the
     `## Decisions` section of that `gate-planner`'s final message has
     lines that start with `- added:` or `- changed:`. When that
     re-review has a `blocking` finding or a refuted load-bearing claim,
     the session
     loops back as **Loop back** above says, and that loop-back counts
     toward the two. When it has `material` findings only, the session
     spawns one `gate-planner` revision for them, runs Gate A, and spawns
     no further `gate-reviewer` for that chunk.
   - **Review limit per chunk.** A chunk is a group of plan steps that
     one `gate-executor` runs (`plan-template.md` § Execution chunks).
     Each chunk gets its first review, on the plan that gives it steps,
     and at most two more, each after a revision of that plan. A review
     or revision of a plan counts for every chunk that plan gives steps.
     The session
     spawns no fourth `gate-reviewer` for a chunk. The **Unasked-changes
     check** below is not one of these reviews: it does not count toward
     the three, and the rules of **Review limit per chunk** for a chunk's
     third review do not apply to it. It is the one exception because it checks only claims and steps that no
     review has seen, and no revision follows it, so it cannot lead to
     another review. The session counts
     the reviews and the loop-backs of each chunk separately; the round
     number `<n>` counts every review in the stage, so it is not this
     count. Where another rule in step 4 says otherwise, this rule wins.
     When the third review of a chunk (its `# Round <n>` section in
     `plan-review.md`) has a `blocking` finding or a refuted
     load-bearing claim, the session spawns no revision: it stops, gives
     the user the open findings, and states any contradiction between
     seats without resolving it. When that review has `material`
     findings only, the session spawns one `gate-planner` revision for
     them, runs Gate A, and spawns no further `gate-reviewer` for that
     chunk.
   - After Gate A passes on a revision that no re-review follows, the
     session checks `plan.md` against the result the revision prompt
     stated for each `material` finding and logs each one `fixed`, with
     the plan step as evidence. A `material` finding that `plan.md` does
     not meet goes to the user.
   - **Unasked-changes check.** This check is for a chunk's last
     revision, the one that step 4 follows with no further
     `gate-reviewer` for that chunk. The session runs it at most once for
     each chunk, and only when the `## Decisions` section of that
     `gate-planner`'s final message has lines that start with `- added:`
     or `- changed:`. Once Gate A passes on that revision, the session
     first checks the revision's `material` findings against `plan.md`,
     as it does for a revision that no re-review follows. Then it spawns
     one `gate-reviewer` with the spawn prompt that step 3 gives for this
     check. No revision follows this review. When it has a `blocking` finding or a refuted load-bearing
     claim, the session stops and gives the user the open findings. Each
     `material` finding goes to the user. Each `minor` finding gets a
     `row R<n>-<id> | advisory` line in `decision-log.md`.
   - In every revision prompt, the session states, for each `blocking`
     and `material` finding, the result `plan.md` must reach. When a
     revision prompt repeats a way of doing a step, or a command, that a
     `gate-reviewer` or a researcher's report suggested, the session
     marks it `hypothesis, untested` in that prompt.
   - Proceed when: no blocking finding stands; every `material` finding is
     fixed in the plan or accepted in `decision-log.md` with a reason;
     every `minor` finding has a `row R<n>-<id> | advisory` line in
     `decision-log.md`. A revision prompt lists `blocking` and `material`
     findings only. The `gate-executor` reads the `minor` findings in
     `plan-review.md` (`.claude/agents/gate-executor.md` § Inputs).
   - A seat contradiction you cannot settle by having a subagent re-run a
     command is the user's call. Log every gate outcome.

5. **Execute.** Run the chunks in the order of their ids (`K1`, `K2`,
   ...), one `gate-executor` (`model: "opus"`) for each. When the next
   chunk has no steps in `plan.md` and may start (**Gate C between
   chunks** below), rename `plan.md` to `plan-<id of its first
   chunk>.md` (`mv`), log `git rev-parse HEAD` in a `note` line, and
   spawn a `gate-planner` (`model: "fable"`) with the paths step 2
   names, plus the renamed plan, `execution-report.md`, `progress.md`
   and the id of the chunk to plan. Its final message is a new plan:
   write it to `plan.md`, run Gate A (step 2), then review it (step 3)
   and judge Gate B (step 4) as for a first plan.
   Repeat until every chunk has run. For each chunk:
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
   When the work needs a checkout other than this one
   (`docs/agents/stage-gate-project.md` § Checkouts says when, and how a
   subagent makes it), use it as the shared checkout for every chunk, pass
   its path to each executor as the checkout path, and run this step's git
   checks with `git -C <checkout path>`.
   Append its final message to `execution-report.md` under the chunk id,
   and log the chunk id, its base SHA and the executor's agent id in
   `decision-log.md`. A fresh executor per chunk keeps each context small.
   **Gate C between chunks.** A chunk whose handoff `Status` is not
   `success`, or whose ledger has a `flag` or `stop` row, goes to Gate C
   before the next chunk starts, and the next chunk starts when step 6
   has `accepted` every row and status that this Gate C covers. After
   any other chunk, the next chunk starts with no Gate C. An `advisory`
   row waits for the final Gate C. A final message that starts with
   `NEEDS_PRIOR_CONTEXT` is not a handoff.

   An executor whose final message starts with
   `NEEDS_PRIOR_CONTEXT: <question>` has hit a
   gap that `progress.md` and the earlier reports do not answer. Append
   its message (the question and its ledger so far) to
   `execution-report.md` under the chunk id. Find in `decision-log.md`
   the most recent executor that ran the chunk the question is about,
   `SendMessage` it the question (it keeps its context) and ask it to
   answer only, with no edits or commits, and log the question and
   answer. Then give the answer to the asking executor: `SendMessage` it
   when it made fewer than about 25 tool calls, or else respawn it for the
   same chunk with a fresh base SHA and the answer in its prompt.

   A plan step of a kind that `docs/agents/stage-gate-project.md`
   § Project seats names runs as that section says. When a project seat
   judges it, the seat's handoff is the ticket's verdict: Gate C
   dispositions it like a ledger row, and that seat runs a second time
   only when the executor's ledger marks the verdict `contested`.

6. **Gate C.** Disposition every Deviation-ledger row, and every chunk
   `Status` that is not `success`, in `decision-log.md`: `accepted`,
   `rework` (respawn a `gate-executor` for the affected chunk with a fresh
   base SHA and the ledger row; `SendMessage` the same executor only when
   it made fewer than about 25 tool calls), or `escalate` to the user.
   Then cross-check `git diff --stat <base SHA>..HEAD`, using the first
   chunk's base SHA, against the Paths manifests of `plan.md` and of
   each `plan-<id>.md` that step 5 renamed: any
   out-of-manifest path with no ledger row becomes one now and is
   dispositioned like the rest. `progress.md`, the executor's resume
   file, is not an out-of-manifest path.

   A Gate C between chunks covers that chunk's rows other than
   `advisory` rows, and its status. Step 5 goes on to the next chunk only
   when all of them are `accepted`. The
   final Gate C covers the remaining rows and statuses and runs the diff
   check.

   Done when (final Gate C): every ledger row, every non-`success`
   status and every out-of-manifest path is dispositioned, the report
   shows the project's gate command (`docs/agents/stage-gate-project.md`
   § Hand off) passed on the tip, and every Gate C condition in that
   file's § Project seats holds.

7. **Hand off.** The normal loop resumes: the project's review step, then
   **ask** before its merge command (`docs/agents/stage-gate-project.md`
   § Hand off). Stage artifacts stay in the stage folder. Chunks that
   have not run when the stage ends become tickets: spawn one judgment
   agent (`docs/agents/stage-gate-project.md` § Worker lanes) to file
   them per that file's § Tickets and commit them, and log their ids and
   the new `git rev-parse HEAD`. Name the tickets in the reply, and say
   they are visible from the project's integration branch (same file,
   § Hand off) only after this branch merges.

## Recovery

A dead or cut-off seat retains its context — `SendMessage` it to resume
before respawning. An executor past about 25 tool calls is respawned for
its chunk instead, and resumes from `progress.md`; the one message to a
waiting agent (step 1 **Open the stage**, the `spawn` lines) is the
exception. Before any executor
respawn, run `git status --porcelain` and `git rev-parse HEAD`: pass the
fresh SHA, and name any dirty paths in the prompt as probably the
earlier executor's unfinished work. Every stage artifact is on disk the
moment its stage ends, so a fresh session resumes from
`decision-log.md`: the last logged gate is where you are. In a fresh
session, a `gate-planner` with no final message after its last
`started` or `resumed` line was cut off: respawn that `gate-planner`
with the same prompt. A fresh session counts a chunk's reviews (step 4,
**Review limit per chunk**) as the number of different round numbers on
the `gate-reviewer` `spawn` lines that name that chunk, leaving out
the lines marked `unasked-changes`. It needs no loop-back count: each
loop-back is followed by a review, so the review limit also limits the
loop-backs.

## Run log (Claude Code)

Two async hooks (`.claude/hooks/log-agent-run.py`, registered in
`.claude/settings.json`) append one JSON line per subagent report, at
any depth, to `<run-log folder>/<session>.jsonl`
(`docs/agents/stage-gate-project.md` § Folders), where `<session>`
is a session ID as in `decision-log.md`. The `decisions` field holds
the report's `## Decisions` section. To trace a decision: find its line
in `decision-log.md`, grep the run-log folder's `*.jsonl` files for the agent
id or agent type, read `decisions`, then open `agent_transcript_path`
if it still exists (transcripts are deleted after `cleanupPeriodDays`,
default 30: https://code.claude.com/docs/en/settings-reference.md).
The run log is gitignored and per-checkout. A missing or empty run log
never stops a run; say so in the hand-off reply.

## Do not

- Implement plan steps yourself between gates.
- Spawn any seat without naming its model at the call site.
- Resolve a judgment-level contradiction between seats by silently picking
  a side — have a subagent re-run the command that settles it, or hand it
  to the user.
- Carry a `blocking` finding into step 5 under any wording.
