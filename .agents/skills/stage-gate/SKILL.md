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
Executor may run `parallel-phase` inside its own stage. `pre-merge-review`
runs after, unchanged — this skill reviews the plan before code exists;
that one reviews the diff after.

## Seats

| Seat | subagent_type | Call-site model | Frontmatter effort | Lane |
| --- | --- | --- | --- | --- |
| Planner | `gate-planner` | `fable` | `low` | design |
| Reviewer | `gate-reviewer` | `opus` | `high` | review |
| Executor | `gate-executor` | `opus` | `high` | lead |
| SME | `gate-sme` | `opus` | `high` | review |
| Visual | `gate-visual` | `opus` | `high` | review |

The Executor runs on Opus at effort `high` because plans are
underspecified and it decides adapt-vs-flag-vs-stop on every
step where reality disagrees with the plan — the failure mode is a silent
paper-over, which is a judgment failure, not a throughput one. Its
`parallel-phase` workers are a separate call: `simple-task` for an
extremely simple slice, `general-task` for every other slice. Every seat
hands its workhorse jobs — searches, plain reads, named runs,
measurements — to the workhorse types, with several jobs in each
helper's prompt (model-policy § Workhorse jobs).

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
   between gates goes to a seat or to a `general-task` agent; a workhorse
   job goes to the type `docs/agents/model-policy.md` § Workhorse jobs
   names. The only commands you run are the gate checks that `docs/agents/orchestration.md`
   § The session delegates lists. Tell the user that an agent is working
   only when the last `spawn` line in `decision-log.md` with that agent's
   id is `started` or `resumed` (step 1). When the agent's last
   notification says it is waiting on its own background work, tell the
   user that it has stopped and may resume on its own, and that when the
   timer in step 1 ends, the session sends it one message.
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
6. **Pace the pipeline.** Hold at most two stages between step 2 and
   step 4 (planning or review) at once, and run one executor at a time
   across all stages; a further feature waits with its `brief.md`
   written and nothing spawned. The session spawns at most three
   reviews, plus at most one **Added-lines check**, for each chunk, a
   group of plan steps that one `gate-executor` runs (step 4, **Review
   limit per chunk**). On
   2026-10-25 five stages ran at once, 12 planner and 8 reviewer runs
   went to 2 executor runs, and the session hit the 5-hour limit in 59
   minutes (`.scratch/agent-reports/2026-10-25-general-task-usage-limit-burn.md`;
   gitignored; main checkout only).
   This pacing is for this pipeline only: a plain request for a plan,
   outside stage-gate, is planned whole.

## Steps

In these steps, "you" and "the session" are the same agent.

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
       <time> | <session> | spawn <subagent_type> (<model>) | <started, resumed, or returned (<status>)> | agent <agent id> | subagent_tokens <n or n/a> | <mode, part id or chunk id>
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
     agent can have several `returned` lines.
     - `started`: the Agent call's tool result gave the new agent's id
       (the line `agentId: <id>`). The line has that agent id and
       `subagent_tokens n/a`.
     - `resumed`: the session sent the agent a `SendMessage`, and the
       tool result has `"success":true`.
     - `returned (<status>)`: a `<task-notification>` whose `<task-id>`
       is the agent id arrived. Write the text of its `<status>` tag in
       the brackets (seen: `completed`, `failed`, `killed`). Copy the
       number in its `<subagent_tokens>` tag, or write `n/a` when it has
       none.
     An agent is **working** when the last `spawn` line with its agent id
     is `started` or `resumed`. An agent's **final message** is the
     `<result>` of a `<task-notification>` with
     `<status>completed</status>` whose `<summary>` does not say the
     agent `is waiting on its own background work`. When the `<summary>`
     does say that, the `<result>` may be interim: log the `returned`
     line and act on nothing else in that notification. Then start a
     timer: one Bash call `sleep 1800` with `run_in_background: true` and
     `timeout: 1900000`. When it ends, its notification starts a turn of
     the session. On each later turn of the session, from the timer or
     from anything else, when that `returned` line is still the last
     `spawn` line with that agent id and is at least 30 minutes old (the
     timer's length; starting value, hypothesis, untested), the session
     sends that agent one `SendMessage`: "Read the output of your
     background work. When it has finished, end your turn with the final
     message your instructions ask for." This holds for a `gate-executor`
     at any tool-call count. When the tool result has `"success":true`,
     the session logs `resumed`. When it lacks `"success":true`, or the
     agent's next notification again says it is waiting on its own
     background work, the session stops and tells the user.
   - `note`: the SHAs that steps 1 and 5 record, each question and
     answer of step 5, and filed ticket ids with the new HEAD.

   Write the reason on every line. Write `evidence: none` when you
   checked nothing.

2. **Plan.** Every `gate-planner` spawn (`model: "fable"`) names the
   absolute paths of `brief.md`,
   `.claude/skills/stage-gate/plan-template.md` and the stage folder.
   Spawn one. When a `gate-planner`'s final message is a plan, write it
   to `plan.md` verbatim.
   When its final message starts with `DECISION:`, it has split the
   brief and written its files itself: this is a **split run**, marked
   by a `decomposition.md` in the stage folder. When the Parts table
   there has more than one part, spawn one `gate-planner` with
   `part: <id>` for each part after `P1`, in order and one at a time;
   then one with `reconcile`, which writes `plan.md`.
   When a planner's final message lists "Open questions", put them to
   the user before the next spawn and send the answers back to that
   planner (`SendMessage` it, or respawn it in the same mode with the
   answers). That planner receives the user's answers once.

   When a `gate-planner`'s final message is none of these — a plan,
   meaning a message with at least one `##` heading of
   `plan-template.md` (Gate A, not this rule, handles a plan with a
   missing section); a message that starts with
   `DECISION:`, with `WRONG_MODEL:`, or with `Plan file:`
   (`parts.md` § When you write files here,
   `.claude/agents/gate-planner.md` § Next chunk); a message that lists "Open
   questions" — no agent is working on that `gate-planner`'s job. The
   session sends that `gate-planner` a `SendMessage` to its agent id with
   this text: "Your final message was not the final message your
   instructions ask for. If you started researchers, read their report
   files. Then end your turn with that final message." The session logs
   `resumed`. When the `SendMessage` tool result lacks
   `"success":true`, the session respawns the `gate-planner` in the
   same mode. When the next final message of the resumed or respawned
   `gate-planner` is again none of these, the session stops and tells
   the user.

   **Gate A (mechanical):** every template section present, Backburner
   included ("none" allowed); steps only for `K1`
   (`plan-template.md` § Execution chunks) and for each later chunk that
   a `gate-planner` with `next:` has added (step 5); Claims register
   nonempty; Paths manifest present; every open question in the
   brief answered with its three items, or assigned to a deferred part;
   `git status --porcelain` still empty; `git rev-parse HEAD` still the
   SHA logged in step 1 or, once `K1` has run, the SHA in the `note`
   line that step 5 logged before it spawned the `gate-planner` with
   `next:` for the chunk being planned.
   New changes mean the seat edited files: **stop and report them to the
   user** — never revert, because another agent's live work looks identical
   from here (ticket 261). Respawn once with the violation named (on a
   split run, `gate-planner` with `re-split: gate A`). One respawn per
   gap; a second failure goes to the user. Log the outcome.

   On a split run, Gate A also checks: `decomposition.md` has a
   `DECISION:` line and a Why; when two or more parts were planned,
   every planned part has its `parts/<id>/plan.md` and `plan.md` has a
   Seams section; every deferred part has its `parts/<id>/ticket.md`.

   Before the first review in the stage, when `plan.md` has steps for
   more than one chunk, or is over about 350 lines (starting value,
   hypothesis, untested), spawn `gate-planner` once with
   `re-split: over budget`; it rewrites `plan.md` itself, moving every
   chunk after `K1` to the Backburner. Then run Gate A on the result.

   Deferrals made at the first split stand, and the reviewer checks
   them. A deferral made by a re-split, and any open question of the
   brief assigned to a deferred part, goes to the user before Gate B
   passes. If the user rejects one, spawn `gate-planner` with
   `re-split: ruling` and the ruling; it rewrites `plan.md` itself, and
   that rewrite is a revision of the chunk being planned (step 4,
   **Review limit per chunk**).

3. **Review.** The session spawns `gate-reviewer` (`model: "opus"`).
   The session's spawn prompt gives the round number `<n>` (1 for the
   first review in the stage, then 1 higher for each later review,
   whichever chunk it reviews, so that no two `# Round` headings in
   `plan-review.md` share a number) and the
   absolute paths of `brief.md`, `plan.md`, `plan-review.md` and, on a
   split run, `decomposition.md`, all in `.scratch/stage-gate/<slug>/`.
   Every review after the first in the stage is a **re-review**. Its
   spawn prompt also names what the review checks. After a revision, it
   names the claims and steps that the latest revision changed or added,
   and the `blocking` and `material` findings that the latest revision
   prompt listed, each by its `row` id `R<m>-<id>` (step 1). On the
   first review of a later chunk (step 5), it names the claims and steps
   that the `gate-planner` with `next:` added for that chunk, and no
   earlier findings. The prompt says that the review checks only those
   claims and steps and whether `plan.md` now fixes each named finding,
   and does not review the rest of the plan.
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
     claim → loop back: respawn `gate-planner` with brief + plan + review
     for a revision, then spawn a `gate-reviewer` for a re-review
     (step 3). Loop back a second time only when the
     re-review after the first loop-back has a `blocking` finding or a
     refuted load-bearing claim. After the revision of the second
     loop-back, the session spawns one more `gate-reviewer` for a
     re-review. That re-review is the chunk's third review, and
     **Review limit per chunk** below says what the session does next.
   - No `blocking` finding and no refuted load-bearing claim, but one or
     more `material` findings need a change to `plan.md` → the session
     spawns one `gate-planner` revision with brief + plan + review, then
     runs Gate A. This revision is not a loop-back and does not count
     toward the two loop-backs that **Loop back** allows. The session
     spawns a `gate-reviewer` for a re-review (step 3) only when the
     `## Decisions` section of that `gate-planner`'s final message has
     lines that start with `- added:`. When that re-review has a
     `blocking` finding or a refuted load-bearing claim, the session
     loops back as **Loop back** above says, and that loop-back counts
     toward the two. When it has `material` findings only, the session
     spawns one `gate-planner` revision for them, runs Gate A, and spawns
     no further `gate-reviewer` for that chunk.
   - **Review limit per chunk.** A chunk is a group of plan steps that
     one `gate-executor` runs (`plan-template.md` § Execution chunks):
     `K1`, then each Backburner line that step 5 plans. Each chunk gets
     its first review (step 3 for `K1`, step 5 for each later chunk) and
     at most two more, each after a revision of that chunk. The session
     spawns no fourth `gate-reviewer` for a chunk. The one exception is
     the **Added-lines check** below: it checks only claims and steps
     that no review has seen, and no revision follows it, so it cannot
     lead to another review. The session counts
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
   - **Added-lines check.** After a revision that is followed by "no
     further `gate-reviewer` for that chunk", when the `## Decisions`
     section of that `gate-planner`'s final message has lines that start
     with `- added:`, the session spawns one `gate-reviewer` (step 3)
     once Gate A passes. Its spawn prompt names only the claims and
     steps on those lines, and no findings. No revision follows this
     review. When it has a `blocking` finding or a refuted load-bearing
     claim, the session stops and gives the user the open findings. Each
     `material` finding goes to the user. Each `minor` finding gets a
     `row R<n>-<id> | advisory` line in `decision-log.md`. The session
     also checks that revision's `material` findings against `plan.md`,
     as it does for a revision that no re-review follows.
   - In every revision prompt, the session states, for each `blocking`
     and `material` finding, the result `plan.md` must reach. When a
     revision prompt repeats a way of doing a step, or a command, that a
     `gate-reviewer` or a researcher's report suggested, the session
     marks it `hypothesis, untested` in that prompt.
   - On a split run, when a `blocking` or `material` finding has
     `Where: decomposition`, the round's revision is one `gate-planner`
     (`model: "fable"`) with `plan-review.md` and `re-split: review`. It
     handles every finding and rewrites `plan.md` itself. Every other
     revision prompt on a split run says: keep each step's part id and
     the `## Seams` section.
   - Proceed when: no blocking finding stands; every `material` finding is
     fixed in the plan or accepted in `decision-log.md` with a reason;
     every `minor` finding has a `row R<n>-<id> | advisory` line in
     `decision-log.md`. A revision prompt lists `blocking` and `material`
     findings only. The `gate-executor` reads the `minor` findings in
     `plan-review.md` (`.claude/agents/gate-executor.md` § Inputs).
   - A seat contradiction you cannot settle by having a subagent re-run a
     command is the user's call. Log every gate outcome.
   - **File deferred parts.** When `decomposition.md` lists deferred
     parts, after `K1`'s Gate B passes spawn one `general-task`
     (`model: "opus"`) to file the
     `parts/<id>/ticket.md` of each part in the Deferred table as a
     ticket per `docs/agents/issue-tracker.md` and commit them. Log
     their ids and the new `git rev-parse HEAD`.

5. **Execute.** Run one `gate-executor` (`model: "opus"`) for `K1`. When
   its Gate C passes and the Backburner is not "none", log
   `git rev-parse HEAD` in a `note` line (Gate A compares against it),
   then spawn
   `gate-planner` (`model: "fable"`) with `next: <first Backburner id>`
   and the paths of `plan.md`, `execution-report.md` and `progress.md`;
   it writes that chunk's steps into `plan.md`. The session runs Gate A
   (step 2) on `plan.md`, then spawns
   a `gate-reviewer` for a re-review of that chunk (step 3); that
   re-review is the chunk's first review (step 4, **Review limit per
   chunk**). Then the session judges Gate B (step 4) for that chunk and
   runs the chunk's `gate-executor` as the rest of this step says.
   Repeat until the Backburner is empty. A
   plan whose `Execution chunks` section is missing or says "none" is one
   chunk, `K1`, covering every step. For each chunk:
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
   When AGENTS.md § The forked tab repo says the work needs a pair, have a
   subagent make the pair with `pnpm wt:pair`, use it as the shared
   checkout for every chunk, pass its path, and run this step's git
   checks with `git -C <pair>`; `isolation: worktree` has no fork.
   Append its final message to `execution-report.md` under the chunk id,
   and log the chunk id, its base SHA and the executor's agent id in
   `decision-log.md`. A fresh executor per chunk keeps each context small.
   A chunk whose handoff `Status` is not `success`, or whose ledger has a
   `flag` or `stop` row, goes to Gate C before the next chunk starts; an
   `advisory` row waits for the final Gate C. A final message that
   starts with `NEEDS_PRIOR_CONTEXT` is not a handoff.

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

   When the plan has an SME step, the executor spawns `gate-sme` once and
   commits its handoff. That handoff is the ticket's SME verdict: Gate C
   dispositions it like a ledger row, and a second SME runs only when the
   executor's ledger marks the verdict `contested`.

   When a plan step carries a `Visual check:` line, the executor looks at
   each named fixture before that unit's re-pin (`pnpm tab-fixtures:smoke`
   and its PNGs, or the fixture's link in a browser pane where the harness
   has one), judges it against the sentence, and records the smoke line
   and what it saw in its ledger. That is the whole check: no `tab-review`
   run and no `gate-visual` seat.

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

   A Gate C between chunks covers that chunk's rows other than
   `advisory` rows, and its status. Step 5 goes on to the next chunk only
   when all of them are `accepted`. The
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
   merges. Backburner lines still open when the stage ends become
   tickets, filed like deferred parts (step 4, **File deferred parts**).

## Recovery

A dead or cut-off seat retains its context — `SendMessage` it to resume
before respawning. An executor past about 25 tool calls is respawned for
its chunk instead, and resumes from `progress.md`. Before any executor
respawn, run `git status --porcelain` and `git rev-parse HEAD`: pass the
fresh SHA, and name any dirty paths in the prompt as probably the
earlier executor's unfinished work. Every stage artifact is on disk the
moment its stage ends, so a fresh session resumes from
`decision-log.md`: the last logged gate is where you are. In a fresh
session, a `gate-planner` with no final message after its last
`started` or `resumed` line was cut off: respawn that `gate-planner` in
the same mode.

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

- Implement plan steps yourself between gates.
- Spawn any seat without naming its model at the call site.
- Resolve a judgment-level contradiction between seats by silently picking
  a side — have a subagent re-run the command that settles it, or hand it
  to the user.
- Carry a `blocking` finding into step 5 under any wording.
