# Agent model policy

How this repo picks models and reacts when the harness hits a wall
(rate limit, quota, spawn failure). The policy is the **lane model** below;
Claude Code, Codex, and Cursor are three peer places to fill those lanes,
and none of them is assumed.

## What we can and cannot know

**Reactive detection works.** Treat these as a wall:

- Spawn / Task / subagent errors mentioning rate limit, usage limit, quota,
  `429`, capacity, or “switched to … after reaching API limit”
- Cloud Agents API / SDK `429 Too Many Requests` (backoff and retry)
- A reviewer or worker that never starts or dies immediately on create

**Proactive headroom usually does not.** No harness here exposes a reliable
“how much review- or design-lane budget is left” number to an in-IDE session. Usage
endpoints that exist (e.g. Cursor Cloud Agents) report per-run usage _after_
the fact, and team Admin/Analytics APIs need team/enterprise keys and still
won’t predict whether the next review or design spawn succeeds. Do not invent a fake
meter — assume walls are **observed**, not predicted.

### Budget the round at the phase boundary

The window’s limit is **tokens**; time is only what resets them. So the
question before a fan-out is whether the remaining budget covers the whole
round — not how long the round will take, and not where you sit in the
window. Reset timing is invisible from inside a session; estimate the spend
instead.

Estimate: implementation workers on this repo have run roughly 100k–240k
tokens each (five measured workers, 2026-08-11, fix-round worker table in
`.scratch/set-bonus-value/orchestration-observations-2026-08-12.html`).
Multiply by slice count, add fan-in. Those five workers ran Fable
(§ Lane is per job, not per parent). No Opus-at-`high` worker has been
measured, so on Claude Code the estimate is a hypothesis, untested.

If the round does not fit, **stop at the partition**. The fan-in brief is a
complete, resumable artifact: a fresh window spawns from it at full
strength, where a round killed mid-dispatch leaves workers in flight and
fan-in lost (observed twice that day — `agent-usage-log.md` rows 16b and 18,
both killed by the session limit).

## Three lanes

This is the portable part. Every harness has all three; only the model names
change. **Lanes sort by kind of work, not by model height** — "which model is
biggest" is never the question, and a taller model is not a better fill for a
lane it does not belong to.

| Lane          | Jobs                                                                          | Model bar                                                                                                                  | Speed                                                                         |
| ------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Workhorse** | Implement plans, TDD slices, parallel-phase workers, merges, mechanical edits | The model your harness section names for **workhorse** — a model the harness will **actually run**                         | Prefer parallel when slices are independent                                   |
| **Review**    | Pre-merge review axes, adversarial and domain judgment, SME rank review       | The model your harness section names for **review** — critique against a fixed standard, not the tallest model             | **Slow is fine**: sequential axes, wait/retry, or hand off to a fresh session |
| **Design**    | Planning, architecture, hard open-ended design calls                          | The model your harness section names for **design** — reserved for open-ended work with no fixed standard to check against | One at a time; never fanned out                                               |

**Read the fill out of your harness section — do not derive it.** There is no
"pick the strongest available" rule here, in any lane. The harness tables below
are the authority; if a lane's fill is not named there for your harness, ask the
user rather than ranking models yourself.

The **design** lane is the narrow one. A model pinned there is not a
general-purpose upgrade: taking it outside planning and architecture needs a
specific stated reason, in the spawn or the handoff. Review is not design —
checking a diff against a standard is the **review** lane even when the diff is
hard.

When a lane is walled, spend the delay: wait and retry the same lane → run
axes **one at a time** → print briefs for a fresh session / other harness →
ask the user. Work down that ladder in order; a visible delay is the correct
outcome. Same-session review by the authoring agent is the last rung, and must
be labeled in `docs/reviews/…`.

A job **stays** in its lane. Substituting a weaker model for a review job buys
review theatre — a `docs/reviews/…` file that reads complete and carries no
judgment — which is why the delay is cheaper than it looks. Substituting a
_taller_ model is not a fix either: it spends the top price tier on work that
did not ask for it.

Workhorse jobs **may** retry on the peer fill your harness section names
for workhorse, when it names one. Claude Code names none: on a wall, an
Opus job waits or serialises and stays on Opus. A job never moves to a
cheaper model for implementation correctness unless the user says so.

> **Retired term.** This policy used to run two lanes, with review and design
> merged into one called **sharp**, whose bar was "the top reasoning tier
> available." That bar was height-ranked, so it resolved to whatever model was
> tallest — which is how the top price tier ended up filling lanes it did not
> belong in (2026-08-11, below). Review notes under `docs/reviews/` written
> before 2026-08-12 say "sharp lane" and mean the review lane; they are left
> as written because they record what actually ran.

### Lane is per job, not per parent

A worker’s lane follows the **worker’s** job. A mechanical implementation
slice is workhorse whether its manager is workhorse, review, or design.

Name the model on every spawn, and give it an effort: on a harness where
effort is not a spawn argument, pick an agent type whose definition sets
it (Claude Code: see its section). The harness default is
**inherit**: an unnamed worker runs its parent’s model at its parent’s
price, so a design-lane manager fanning out unnamed workers buys a fan-out of
design-lane workers. Observed 2026-08-11: a Fable-low director fanned out five
implementation slices with no model named, and all five ran Fable — the top
price tier — at default effort, against this policy’s workhorse rule
(fix-round worker table in
`.scratch/set-bonus-value/orchestration-observations-2026-08-12.html`).

**Read only your own harness’s section below.** The others exist because
this repo gets worked on from more than one, not because an agent chooses
between them mid-task — you cannot switch harness, only the user can.
So when a lane is walled and waiting or serialising has not
cleared it, the move is to **say so and stop**, optionally leaving a brief
under `.scratch/handoffs/` the user can run elsewhere.

## Parallelism vs serial

- **Implementation (`parallel-phase`):** parallel worktrees with **workhorse**
  models is the point — often faster _and_ better than one long chain. Cap
  around **3–5** workers. Every worker gets the workhorse fill named in your
  harness section, stated explicitly on the spawn. Review and design **jobs**
  are never fanned out: one spawn per review axis, and one design call at a
  time. When the workhorse fill is the same model as review — on Claude Code
  both are Opus — size the round with § Budget the round
  before spawning. A fan-out that exceeds the budget burns the usage limit
  before fan-in finishes, and the swarm dies half-merged.

  **Price tier is not inferable — never guess it.** Do not rank a model by
  its name, its reputation, or which lane you assume it fills: this repo
  wrote Fable into the cheap lane and Fable is the **top** price tier, which
  cost a real round (2026-08-11, five workers dispatched on Fable by
  `model: inherit`). If you cannot name a model's lane from your harness
  section below, it is not a workhorse — ask the user.

- **Review (`pre-merge-review`):** parallel **review-lane** reviewers when the
  harness allows; on a wall, **serialise** (one axis, wait, next) rather
  than three weak ones. Wall clock can grow; finding quality must not drop.
  Do not promote an axis to the design lane to "get a better read" — a review
  axis checks a diff against a standard, which is what the review lane is for.

## Manager / multi-step fan-out (any harness)

A manager that must spawn workers **and** run fan-in (reviews, compile)
owns the whole pipeline until deliverables exist — or it must leave a
disk-canonical handoff the **parent** can continue.

**Do not** background workers and then end the manager turn with “waiting on
workers.” That abandons fan-in: background completions notify the _parent_
session, not a finished manager, and the work stalls with an empty or
half-filled handoff dir (observed 2026-07-28 on a Cursor pool-redesign
manager; the failure mode is the harness-independent one — any harness whose
background completions notify the spawning session can lose fan-in this way).

Prefer one of:

1. **Foreground / blocked fan-out** — spawn workers without abandoning
   responsibility; only report done when option docs (or equivalent) exist
   and the next stage is kicked or finished; or
2. **Explicit parent handoff** — write `.scratch/handoffs/…/PROCESS.md`
   naming what’s in flight, what’s blocked, and the exact next spawn
   (reviews/compile), then end. Parent resumes from that file.

Retrying a refused review model after a usage wall, then backgrounding
workhorse workers and exiting, is the anti-pattern: wasted turns + no
compile.

## Harness notes

Three peers. Read only the one you are running on.

### Claude Code

| Lane          | Fill it with                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| **Workhorse** | **Opus at effort `high`**; an extremely simple job runs **Sonnet at effort `high`** (see the agent-type table) |
| **Review**    | **Opus at effort `high`**                                                                                      |
| **Design**    | **Fable at effort `low`** — used only for planning and architecture (`gate-planner`, `design-task`)            |

The **model** and the **effort level** are separate controls
([model config](https://code.claude.com/docs/en/model-config#adjust-effort-level),
[effort API](https://platform.claude.com/docs/en/build-with-claude/effort)).
Effort is `low` | `medium` | `high` | `xhigh` | `max` via `/effort`,
`--effort`, `effortLevel`, API `output_config.effort`, or `effort:` in an
agent definition's frontmatter. There is no `claude-opus-*-high` model
slug — set the model **and** the effort.

The Agent tool takes a `model` argument but no effort argument. A
subagent's effort comes from its agent definition's frontmatter, or from
the session when the definition sets none
([sub-agents](https://code.claude.com/docs/en/sub-agents)). So spawn
through an agent type that pins both:

| Agent type      | Model                          | Effort                       | Use for                                                                                                                |
| --------------- | ------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `simple-task`   | `sonnet`                       | `high`                       | An **extremely simple** job: one lookup, one search with a known target, or one edit whose exact text the prompt gives |
| `general-task`  | `opus`                         | `high`                       | Every other delegated job: implementation, `parallel-phase` workers, review axes, investigation                        |
| `modest-task`   | `opus`                         | `medium`                     | Trial: a modest job where the worker writes the code or text, as § Trial types defines it                              |
| `discrete-task` | `sonnet`                       | `high`                       | Trial: one job whose result the prompt fixes, as § Trial types defines it                                              |
| `design-task`   | `fable`                        | `low`                        | Planning and architecture outside stage-gate                                                                           |
| `gate-*` seats  | `opus`; `gate-planner` `fable` | `high`; `gate-planner` `low` | Stage-gate only — see § Stage-gate seats                                                                               |

The spawning agent decides which type to use (§ Trial types, "Which type
takes a small job"). If you are unsure, spawn `general-task`. A
`simple-task`, `discrete-task` or `modest-task` that returns
`NEEDS_JUDGMENT`, or a `discrete-task` that returns `WRONG_MODEL`, is
respawned on `general-task` with the same prompt. A `design-task` that
returns `WRONG_MODEL` is respawned on `design-task` with the model the
agent-type table above names, not the model the return says it
expected: a session started before an agent file changed may hold the
old check. A second `WRONG_MODEL` from the same job goes to the owner, not to another respawn: the check has rejected a correct Opus
spawn before (ticket 252). Spawn these types in place of the built-in
`Explore`, `general-purpose` and `Plan` types. You cannot set the
built-ins' effort at the call site, and whether they pin an effort of
their own is unverified. If the harness does not recognize one of these
types, restart the session rather than falling back to a built-in.

> **Changed 2026-09-25.** Before this date the repo preferred Opus at effort
> `medium`, reserved `high` and above for a single narrow adversarial review
> axis, filled the workhorse lane with Sonnet and the design lane with Fable,
> and recommended Opus at `medium` for the orchestrator. The owner replaced
> all of that with the tables above. Plans and review notes written before
> this date that say "Opus at effort `medium`" or "Fable (design lane)"
> record what ran then and are left as written. The design lane went back
> to Fable on 2026-10-04 (next note).
>
> **Changed 2026-10-04.** The owner moved the design lane from Opus at
> effort `xhigh` to Fable at effort `low`. This is the current choice, and
> the owner may change it. Text written between 2026-09-25 and this date
> that names Opus at effort `xhigh` for planning records what ran then.

**Fable fills only the design lane.** It is the top price tier on this
harness, above Opus. The owner may run the interactive session on Fable,
and a subagent whose agent type names no model inherits the session's
model and bills at that tier. Name the model on every spawn, including
for agent types whose frontmatter already names one. A Fable planner
names `opus` on every `general-task` it spawns for research.

Prefer this harness when a review-lane reviewer from a different vendor than the
authoring session is wanted, and sequential axes on a rate limit.

#### Trial types

`modest-task` (Opus at effort `medium`) and `discrete-task` (Sonnet 5.5
at effort `high`) are options the owner asked for on 2026-09-29, run as a
trial. `general-task` stays the default.

**Which type takes a small job.** A job on the list below ("Always
`general-task`") goes to `general-task` whatever its size. For any other
job, ask whether the prompt fixes the whole result, so that checking it
needs no judgment: the answer is checked against the sources given, the
command output against the command as reported, the edit against the
result the prompt states.

- Fixed, and one action → `simple-task`.
- Fixed, and more than one action → `discrete-task`.
- The worker chooses any line of code or text, and the job is modest →
  `modest-task`.
- Anything else, or unsure → `general-task`.

For code this means: a rename whose old and new names the prompt gives, a
block moved without change, or text the prompt gives word for word is
`discrete-task` work. A fix, a new test, a new function, or any edit
where the worker decides what the code does is `modest-task` work at
least. For commands: a named check that writes no tracked file
(`pnpm verify`, a named test), run and reported with its exit code, is
`discrete-task` work. A generator re-run, or any command that rewrites a
committed file, is `general-task` work. That `pnpm verify` writes no
tracked file was checked on 2026-10-03: every step in `package.json`'s
`verify:steps` is a check or a test run, and `git status --porcelain
--untracked-files=no` printed nothing after a run. Check again when
verify gains a step.

**Modest.** A job is modest only when all four hold:

1. The prompt names the files to change and what the result must do. It
   leaves no choice between approaches open.
2. The change is small: at most 3 files and 150 changed lines, new
   files included.
3. The result is checked before it is accepted. The caller reads the diff
   and runs a check the prompt names (`pnpm verify`, a named test). When
   the caller is the interactive session, a `general-task` verifier does
   this. The worker's own report of a pass does not count.
4. It is one job: the worker spawns no subagents, fans nothing out, and
   merges nothing.

**Discrete.** A `discrete-task` job is one of: a question with one named
target ("which commit added X", "where is Y defined"); commands the
prompt names that write no tracked file (`git log`, `pnpm verify`, a
named test), run and reported without diagnosis; or an edit whose exact
text the prompt states. The caller checks it before accepting it: the
answer against its sources, the diff against the stated result, plus a
check the prompt names when code changed. When the caller is the
interactive session, a `general-task` verifier does this. A list of
matches means "at least these", and `not found` means unanswered;
neither is evidence that something is absent.

**Always `general-task` (or its own seat), never `simple-task` or a trial
type:** any review (a pre-merge axis, a plan review, a claim check, SME or
visual judgment); planning or architecture; debugging; a question whether
something exists or is absent; any action `docs/agents/known-traps.md`
names a trap for, except that `modest-task` may run `node` / `pnpm` /
test commands, and `discrete-task` may run a named check command that
writes no tracked file, each with `node --version` run in the same shell
command and its v22 output confirmed before the result is used; a `sed`
or script write to a tracked file, and any command that rewrites tracked
files outside the allowed paths, such as `pnpm format`; any file under
`data/`, any generated file or regen, and any pin move;
`vendor/tbc-new-fork`; `.githooks/` and `scripts/`; `AGENTS.md`,
`CLAUDE.md`, skills and agent files; any stage-gate seat or worker a seat
spawns; any `parallel-phase` worker; and any job moved off `general-task`
because of a wall (§ Three lanes). The two trial agent files repeat a
short form of this list, because a worker reads only its own agent file;
change all three together.

**Measuring.** A spawn's `agentType` is in
`~/.claude/projects/<project-dir>/<session>/subagents/*.meta.json`; the
matching `.jsonl` records the model ID and `effort` that ran. When a check
rejects or corrects a trial type's result, or someone later finds a wrong
claim in one, the agent that finds it writes
`TRIAL-REJECT <type>: <one line saying why>` in its own text, so the
transcript records it.

**Stopping and review.** On 2026-10-31 a `general-task` counts each
type's runs, `NEEDS_JUDGMENT` and `WRONG_MODEL` returns, and
`TRIAL-REJECT` lines, and the owner decides whether each type stays.
Before that date, every caller stops spawning a type, and the finder
tells the owner, when either holds:

- a result that passed its check is later found wrong (for
  `discrete-task`: a wrong or unsourced claim, or an edit that differs
  from the stated result; for `modest-task`: a change that needs a fix);
- more than 1 in 10 of its runs so far were rejected, corrected, or
  returned `NEEDS_JUDGMENT`.

A `discrete-task` run that records any model other than
`claude-sonnet-5-5` also stops that type until the harness is fixed.
`sonnet` resolves to Sonnet 5.5 only on Claude Code v2.1.284 or later
(https://code.claude.com/docs/en/model-config).

#### Stage-gate seats

The `stage-gate` skill fills its seats from these lanes: Planner = design
(Fable at effort `low`), Reviewer, Executor and SME = review
(Opus at effort `high`). Each seat's agent definition sets its model and
its effort in frontmatter.

The Executor is on the review lane, not the workhorse lane, because of the
kind of work it does. It decides adapt-vs-flag-vs-stop wherever the plan
and reality disagree, and a plan is underspecified by construction. The
failure mode there is a silent paper-over, which is a judgment failure and
not a throughput one. The Executor's `parallel-phase` workers run
`simple-task` for an extremely simple slice and `general-task` for every
other slice. Stage-gate uses no trial type from § Trial types.

The orchestrator is the interactive session. The owner picks its model and
effort per session. Whatever it runs on, it delegates every task
(AGENTS.md § The session delegates). The skill names every seat's model at
the call site, and each seat self-checks
(`WRONG_MODEL: <name>` → respawn with the model the skill's seat table
names, never continue).

### Codex

| Lane          | Fill it with                                                           |
| ------------- | ---------------------------------------------------------------------- |
| **Workhorse** | Mid tier at a lower reasoning effort, for workers and mechanical edits |
| **Review**    | Top tier; `codex exec` runs                                            |
| **Design**    | Top tier, extended reasoning                                           |

The interactive session delegates every task (AGENTS.md § The session
delegates). Work that is not review or design goes to a subagent at the
workhorse fill, and the owner wants these used freely. Review and design
jobs go to subagents at the review and design fills.

`codex exec` is the cross-vendor review-lane reviewer `pre-merge-review` reaches
for **first** when the binary is on `PATH` (see
`.claude/skills/pre-merge-review/SKILL.md`) — its value is that it is not the
authoring vendor, so it is not agreeing with its own prose. For fan-out,
`parallel-phase`’s [Codex adapter](../../.claude/skills/parallel-phase/adapters/codex.md)
gives each worker its own worktree cwd, one agent (or `codex exec` run) per
slice, with the full slice brief in the prompt because workers have no
sibling channel.

No plan-specific spawn-death quirks are recorded for Codex in this repo. That
is absence of evidence, not evidence of absence — if a wall shows up here,
record it in this section the way the Cursor one is recorded.

### Cursor

Cursor bills **two pools**:

- **Cursor Models** — Composer 2.5, Grok 4.5 (“generous” included usage).
- **Other Models** — Terra, Sol, Sonnet, Opus, etc. (~$20/mo on Pro).

| Lane                                | Pin                                                                                                                                    | Why                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Workhorse** (workers, implement)  | **Composer** (`composer-2.5-fast` on Task if that’s the only Composer slug; non-fast via custom agent / parent inherit when available) | Same first-party pool as Grok; much cheaper per token than Grok; avoids the Other-pool spawn death |
| **Review** (pre-merge axes)         | **Grok high** (prefer non-fast; else `cursor-grok-4.5-high-fast`)                                                                      | The judgment tier Cursor will actually run                                                         |
| **Design** (planning, architecture) | **Grok high**; hand off externally for a big design call                                                                               | Cursor has no distinct design tier that reliably spawns — one lane fills both                      |
| **Parent / orchestrator**           | Either; Grok is fine                                                                                                                   | Routes and judges; it delegates planning and merges (AGENTS.md § The session delegates)            |

The interactive session delegates every task (AGENTS.md § The session
delegates). Work that is not review or design goes to a subagent on the
workhorse pin, Composer. Review and design jobs go to subagents on the
review and design pins.

**Why Composer is pinned rather than merely preferred.** On Pro, Other Models
are often a **paper limit**: Task / `best-of-n-runner` workers requested as
Terra (or similar) die at spawn with
`API usage limit reached Switched to grok-4.5…` and still end as
`status: error` — no tools, no commits. That string is **not** a successful
ceiling handoff; treat it as a hard wall, respawn on **Composer** or
serialise, and do not pretend the dead Terra run continued on Grok. Cursor
advertises mid-tier models the plan does not actually let you use for
parallel fan-out.

This is a **Cursor packaging quirk**, not a universal “always Composer” rule.
On Codex, or a Cursor plan with real Other-pool headroom, mid-tier
workhorses remain fine. Claude Code's fill is in its own section.

- **Composer is allowed and preferred for simple work** — it is not a silent
  downgrade from Grok; it _is_ the workhorse lane on Cursor. Do not burn
  Grok high on every mechanical worker.
- **Do not use Composer for review or design jobs** (adversarial review, pool
  redesign judgment, pre-merge axes). Those stay Grok high, or go out as a
  handoff brief to a Claude Code / Codex / external session.
- **Do not Sol-probe:** skip aspirational non-Cursor Task models unless the
  user explicitly names one _and_ accepts wall-handling. One refused Sol
  spawn is already too many for a manager fan-out.
- **Ceiling vs wall:** a usage/`429` on Sol/Opus you should not have asked
  for is self-inflicted. A wall on Grok high (review or design) → wait, serialise, or
  hand off an external brief. A Composer wall on workhorse → retry Composer
  or a peer workhorse; asking the user is fine; do not “upgrade” every simple
  task to Grok because Composer hiccuped once.
- Parent agents often auto-pick Terra for Task subagents; **pass an explicit
  Composer model id** on worker spawns. Hiding Terra in the model picker
  helps but is not enough by itself.
- **Cursor Cloud Agents API:** honor `429` with backoff; usage endpoints are
  for accounting, not preflight “can I spawn Opus.”

## When the harness is none of these

Fill the three lanes from what the harness will actually run: a strong mid tier
for workhorse, a strong critical-reasoning model for review, and — if the
harness has a distinct top-end planning model — design. If it does not, review
and design share one fill; say so rather than inventing a tier. Model _names_
change; the **lane model**, the **lanes-sort-by-kind** rule, the
**never-downgrade-a-review-job** rule, and the **manager fan-out** rule do not.
When in doubt, ask which lane the user wants.
