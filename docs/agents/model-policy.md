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

## Four lanes

This is the portable part. Every harness has all four; only the model names
change. **Lanes sort by kind of work, not by model height** — "which model is
biggest" is never the question, and a taller model is not a better fill for a
lane it does not belong to.

| Lane          | Jobs                                                                                                                              | Model bar                                                                                                                  | Speed                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Workhorse** | Searches, plain reads, command runs, measurements, small or modest coding, mechanical edits (§ Workhorse jobs)                    | The model your harness section names for **workhorse**: the cheap worker models, which the harness will **actually run**   | Prefer parallel; hand work over in blocks                                     |
| **Lead**      | Oversight (running a plan, an investigation or a set of workers), judgment, hard implementation, `parallel-phase` workers, merges | The model your harness section names for **lead**                                                                          | Prefer parallel when slices are independent                                   |
| **Review**    | Pre-merge review axes, adversarial and domain judgment, SME rank review                                                           | The model your harness section names for **review** — critique against a fixed standard, not the tallest model             | **Slow is fine**: sequential axes, wait/retry, or hand off to a fresh session |
| **Design**    | Planning, architecture, hard open-ended design calls                                                                              | The model your harness section names for **design** — reserved for open-ended work with no fixed standard to check against | One at a time; never fanned out                                               |

**Hard implementation** is any change that is not a workhorse job: one
where the agent chooses the approach, one larger than § Trial types,
"Modest", allows, or one on that section's "Always `general-task`" list.
An agent in the lead, review or design lane is an **overseer**: it holds
the judgment and hands workhorse jobs down (§ Workhorse jobs).

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
for workhorse, when it names one. On Claude Code a GLM type and its Claude
counterpart are peer fills (§ Workhorse jobs). A lead, review or design
job that hits a wall waits or serialises and stays on its model; it never
moves to a workhorse type. A job never moves to a cheaper model for
implementation correctness unless the user says so.

> **Retired term.** This policy used to run two lanes, with review and design
> merged into one called **sharp**, whose bar was "the top reasoning tier
> available." That bar was height-ranked, so it resolved to whatever model was
> tallest — which is how the top price tier ended up filling lanes it did not
> belong in (2026-08-11, below). Review notes under `docs/reviews/` written
> before 2026-08-12 say "sharp lane" and mean the review lane; they are left
> as written because they record what actually ran.

### Lane is per job, not per parent

A worker’s lane follows the **worker’s** job. A mechanical edit is
workhorse whether its manager is lead, review, or design.

Name the model on every spawn (except the GLM types, § GLM worker types),
and give it an effort the way your harness section says (Claude Code: an
agent type whose definition sets it). The harness default is
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

- **Implementation (`parallel-phase`):** parallel worktrees are the point —
  often faster _and_ better than one long chain. Cap around **3–5**
  workers. Every worker gets the fill your harness section names for its
  slice, stated explicitly on the spawn. Review and design **jobs**
  are never fanned out: one spawn per review axis, and one design call at a
  time. When the workers run the same model as review — on Claude Code a
  `general-task` worker and a reviewer are both Opus — size the round with § Budget the round
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

| Lane          | Fill it with                                                                                                                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workhorse** | On the T3 Code card "Claude + GLM workers": **`glm-flash-task`** (GLM Flash) and **`glm-task`** (GLM). Where the harness does not list the GLM types: **`discrete-task`** (Sonnet 5.5, effort `high`), **`modest-task`** (Opus, effort `medium`) and **`simple-task`** (Sonnet, effort `high`). Which job goes to which: § Workhorse jobs |
| **Lead**      | **Opus at effort `high`** (`general-task`)                                                                                                                                                                                                                                                                                                |
| **Review**    | **Opus at effort `high`**                                                                                                                                                                                                                                                                                                                 |
| **Design**    | **Fable at effort `low`** — used only for planning and architecture (`gate-planner`, `design-task`)                                                                                                                                                                                                                                       |

The **model** and the **effort level** are separate controls
([model config](https://code.claude.com/docs/en/model-config#adjust-effort-level),
[effort API](https://platform.claude.com/docs/en/build-with-claude/effort)).
Effort is `low` | `medium` | `high` | `xhigh` | `max` via `/effort`,
`--effort`, `effortLevel`, API `output_config.effort`, or `effort:` in an
agent definition's frontmatter. There is no `claude-opus-*-high` model
slug — set the model **and** the effort.

The Agent tool takes `model` and `effort` arguments; `effort` overrides
the agent definition's frontmatter
([sub-agents](https://code.claude.com/docs/en/sub-agents); the tool's
own description says to pass it only when the user, CLAUDE.md or a
skill asks). This repo sets effort through each agent type's
frontmatter, so spawn through a type that pins both:

| Agent type      | Model                          | Effort                       | Use for                                                                                                                |
| --------------- | ------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `simple-task`   | `sonnet`                       | `high`                       | An **extremely simple** job: one lookup, one search with a known target, or one edit whose exact text the prompt gives |
| `general-task`  | `opus`                         | `high`                       | Lead-lane jobs: oversight, judgment, hard implementation, `parallel-phase` workers, review axes, investigations        |
| `modest-task`   | `opus`                         | `medium`                     | Trial: a modest job where the worker writes the code or text, as § Trial types defines it                              |
| `discrete-task` | `sonnet`                       | `high`                       | Trial: one job whose result the prompt fixes, as § Trial types defines it                                              |
| `design-task`   | `fable`                        | `low`                        | Planning and architecture outside stage-gate                                                                           |
| `gate-*` seats  | `opus`; `gate-planner` `fable` | `high`; `gate-planner` `low` | Stage-gate only — see § Stage-gate seats                                                                               |

The spawning agent decides which type to use (§ Trial types, "Which type
takes a small job"; § Workhorse jobs). When unsure whether the job needs
judgment, spawn `general-task`; when it is a workhorse job whose result
the prompt can fix or name, spawn the workhorse type § Workhorse jobs
names. A `simple-task`, `discrete-task`, `modest-task`, `glm-task` or
`glm-flash-task` that returns
`NEEDS_JUDGMENT`, or a `discrete-task` that returns `WRONG_MODEL`, is
respawned on `general-task` with the same prompt. A `design-task` that
returns `WRONG_MODEL` is respawned on `design-task` with the model the
agent-type table above names, not the model the return says it
expected: a session started before an agent file changed may hold the
old check. A second `WRONG_MODEL` from the same job goes to the owner,
not to another respawn: the check has rejected a correct Opus spawn
before (ticket 252). Spawn these types in place of the built-in
`Explore`, `general-purpose` and `Plan` types. This repo does not
set the built-ins' effort, and whether they pin an effort of their own
is unverified. If the harness does not recognize one of these
types, restart the session rather than falling back to a built-in.
The GLM types are the exception (§ GLM worker types). New agent files can
register mid-session: `simple-task`, `general-task` and `design-task`
(added in 1d86fd48 on 2026-09-25) appeared in the coordinator session's
harness notices without a restart. Whether an edit to an existing agent
file is picked up the same way is untested.

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
>
> **Changed 2026-10-26.** The workhorse lane had meant Opus at effort
> `high` for all implementation since 2026-09-25, so Opus agents did the
> searches, reads and command runs themselves. The owner reads
> "workhorse" as the cheap worker models: the Opus agents did "all the
> work and toolcalls that workhorse models were supposed to do, that the
> opus agents were only supposed to be planning or overseeing"
> (`.scratch/agent-reports/2026-10-26-session-usage-limit-investigation.md`).
> The lead lane now holds the Opus work, and the workhorse lane holds the
> cheap worker models. Text written before this date that says "workhorse"
> for an Opus job means today's lead lane.

**Fable fills only the design lane.** It is the top price tier on this
harness, above Opus. The owner may run the interactive session on Fable,
and a subagent whose agent type names no model inherits the session's
model and bills at that tier. Name the model on every spawn, including
for agent types whose frontmatter already names one, except the GLM
types (§ GLM worker types). A Fable planner names `sonnet` on every
`discrete-task`, `opus` on every `general-task`, and no model on a GLM
type.

Prefer this harness when a review-lane reviewer from a different vendor than the
authoring session is wanted, and sequential axes on a rate limit.

#### Workhorse jobs

An overseer (§ Four lanes) holds the judgment and hands **workhorse
jobs** to the workhorse lane: searches (`grep`, `rg`, `find`), plain
reads (`cat`, `sed -n`, `ls`), named command runs whose output is read
only for pass/fail or for a number, measurements the overseer specifies
exactly, and small or modest coding (§ Trial types, "Modest"). In session
895dc2f0 the 18 Opus subagents made 684 Bash calls, 492 of them searches
or plain reads, and spawned nothing
(`.scratch/agent-reports/2026-10-26-general-task-opus-did-worker-jobs.md` § 2).

| Job                                                                  | When the harness lists the GLM types | Otherwise                                     |
| -------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------- |
| Searches, reads, named runs that write no tracked file, measurements | `glm-flash-task`                     | `discrete-task`; `simple-task` for one action |
| An edit whose exact text the prompt states                           | `glm-task`                           | `discrete-task`                               |
| Small or modest coding (§ Trial types, "Modest")                     | `glm-task`                           | `modest-task`                                 |

`glm-flash-task` has no Edit or Write tool (its agent file in
`~/.claude_router/agents/`), so every edit on the GLM card goes to
`glm-task`. The owner wants small and modest coding on GLM Flash
(2026-10-26: "small or even modest coding tasks shuld be fine glm
flash"); that needs the agent file changed first. The jobs on § Trial
types' "Always `general-task`" list never go to a workhorse type, and
§ GLM worker types says which jobs never go to GLM.

Hand off a **block**, not a command. One helper prompt names every file to
read, every command to run, and the exact form of the answer: the lines to
return, the number to report, `not found` with where it looked. A helper
starts at about 51k tokens before its first tool call (measured, same
session: `.scratch/agent-reports/2026-10-26-general-task-claude-code-context-levers.md`),
so a block is worth a helper when it would otherwise take the overseer
more than about five tool calls on its own grown context (hypothesis,
untested: the break-even is not measured). Run in place: a read of a file
you are about to edit, a check whose output decides your next step, and
anything under that bound. Run independent blocks at once, up to 4 helpers.

The overseer's own tool calls are then its briefs and reports, its edits,
and the checks no helper covered. It judges every helper result against
the sources the helper names, as § Trial types requires. A helper's
`not found` is one input to a conclusion of absence, never the conclusion.

The workhorse types (`simple-task`, `discrete-task`, `modest-task`, the
GLM types) spawn nothing. A `general-task` told that its job is one
narrow investigation spawns no other overseer, and hands its workhorse
jobs down like any overseer.

#### Trial types

`modest-task` (Opus at effort `medium`) and `discrete-task` (Sonnet 5.5
at effort `high`) are options the owner asked for on 2026-09-29, run as a
trial. `general-task` stays the default for jobs that need judgment; the
workhorse types are the default for workhorse jobs (§ Workhorse jobs).

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

**Always `general-task` (or its own seat), never `simple-task`, a trial
type or a GLM type:** any review (a pre-merge axis, a plan review, a claim
check that needs judgment, SME or visual judgment); planning or
architecture; debugging; the conclusion that something is absent (a
helper's `not found` is one input to it, never the verdict); any action
`docs/agents/known-traps.md` names a trap for, except that `modest-task`
and `glm-task` may run `node` / `pnpm` / test commands, and
`discrete-task` and `glm-flash-task` may run a named check command that
writes no tracked file, each with `node --version` run in the same shell
command and its v22 output confirmed before the result is used; a `sed`
or script write to a tracked file, and any command that rewrites tracked
files outside the allowed paths, such as `pnpm format`; any edit under
`data/`, any generated file or regen, and any pin move; any edit under
`vendor/tbc-new-fork` (reads there are workhorse jobs like any other);
`.githooks/` and `scripts/`; `AGENTS.md`, `CLAUDE.md`, skills and agent
files; any stage-gate seat; any `parallel-phase` worker; and any job
moved off `general-task` because of a wall (§ Four lanes). A seat's
helpers are not seats: they take the type their job gives them
(§ Workhorse jobs). The trial and GLM agent files repeat a short form of
this list, because a worker reads only its own agent file; change them
all together.

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

#### GLM worker types

Two more agent types exist only when the session runs on the T3 Code
provider card "Claude + GLM workers" (instance
`claudeAgent_claude_glm_workers`). Their agent files are in
`~/.claude_router/agents/`, outside this repo. On that card they are the
first fill of the workhorse lane (owner, 2026-10-26: "i have an opus +
glm card and thats' what we'll use for the project"); § Workhorse jobs
says which job goes to which. They are meant to cost less than Opus, but
the cost per task is not yet measured. A lead, review or design job that
hits a wall does not move to them (§ Four lanes).

| Agent type       | Model                | Use for                                                                                                                                           |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glm-flash-task` | `z-ai/glm-5.3-flash` | Searches, reads, named commands that change nothing, and measurements, run and reported. It has no Edit or Write tool                             |
| `glm-task`       | `z-ai/glm-5.3`       | A planned edit whose files, behaviour and check command the prompt names: small or modest coding, a test from a clear ticket, a mechanical change |

- **Spawn** with the Agent tool, `subagent_type: "glm-task"` or
  `"glm-flash-task"`, and no `model` argument: a call-site model replaces
  GLM with Claude (the agent files' descriptions). Send GLM work through
  these types, not through T3's `delegate_task` or the "GLM via
  OpenRouter" card.
- **Not for** review, design, planning, debugging or judgment: spawn the
  types in the agent-type table above for these. § Four lanes' rule
  against a weaker model for a review job applies.
- **Bars.** `glm-flash-task` takes the jobs and the bars of
  `discrete-task`, minus edits; `glm-task` takes those of `modest-task`
  (§ Trial types, "Always `general-task`"): no `data/` edits, generated
  files, regens, pins, `vendor/tbc-new-fork` edits, `.githooks/`,
  `scripts/`, agent docs or `parallel-phase` workers. Their agent files
  in `~/.claude_router/agents/` are to carry the short form of the list,
  as the trial files do; the owner keeps them in step, because they are
  outside this repo. A GLM type that returns `NEEDS_JUDGMENT` is
  respawned on `general-task` with the same prompt (§ Claude Code).
- **Private data.** z-ai receives everything a GLM worker sees: its
  prompt, every file it reads, and every command output (global
  `AGENTS.md` § Secrets and GLM workers, staged in
  `docs/agents/home/AGENTS.md`). Give a GLM type no job that could reach
  secrets, session transcripts (`~/.claude/projects/`), or the config
  folders `~/.claude*` and `~/.t3`; such a job goes to its Claude
  counterpart in § Workhorse jobs.
- **Check every result** before you relay it or build on it, as for the
  trial types: when the caller is the interactive session, a
  `general-task` verifier does it. Check the worker's claims as well as
  its tests. In the first real use (pattern-text-extractor, 2026-10-23),
  151 of 151 tests passed, and a later review still found that a new test
  name claimed more than the data supports (pattern-text-extractor
  `docs/reviews/feat-test-gaps-04-05.md`, ticket 57).
- **If the harness does not list these types** (every card except
  "Claude + GLM workers", such as "Claude", "GLM via OpenRouter" and
  Codex), use the types in the agent-type table above. A missing GLM type
  is not a wall and is no reason to restart the session.
- **Card limits.** GLM workers install no packages (owner, 2026-10-23), so
  give them a checkout whose packages are installed. Sessions on this
  card cannot run `gh`, and `git push` to GitHub is expected to fail too
  (untested), because `~/.claude_router/settings.json` denies reads of
  `~/.config/gh`. Push from the "Claude" card. The card's sandbox allows
  writes only under `~/.npm` and `~/.cache`, so `pnpm wt:pair` probably
  fails there too (hypothesis, untested;
  `docs/reviews/feat-glm-worker-policy.md`, "Not a defect").

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
other slice. Every seat hands its workhorse jobs to the workhorse types in
blocks (§ Workhorse jobs).

The orchestrator is the interactive session. The owner picks its model and
effort per session. Whatever it runs on, it delegates every task
(`docs/agents/orchestration.md` § The session delegates). The skill names every seat's model at
the call site, and each seat self-checks
(`WRONG_MODEL: <name>` → respawn with the model the skill's seat table
names, never continue).

### Codex

| Lane          | Fill it with                                                           |
| ------------- | ---------------------------------------------------------------------- |
| **Workhorse** | Mid tier at a lower reasoning effort, for workers and mechanical edits |
| **Lead**      | The workhorse fill; no owner ruling has named another for Codex        |
| **Review**    | Top tier; `codex exec` runs                                            |
| **Design**    | Top tier, extended reasoning                                           |

The interactive session delegates every task (`docs/agents/orchestration.md`
§ The session delegates). Work that is not review or design goes to a
subagent at the workhorse fill, and the owner wants these used freely. Review and design
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

| Lane                                | Pin                                                                                                                                    | Why                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Lane                                | Pin                                                                                                                                    | Why                                                                                                          |
| ---                                 | ---                                                                                                                                    | ---                                                                                                          |
| **Workhorse** (workers, implement)  | **Composer** (`composer-2.5-fast` on Task if that’s the only Composer slug; non-fast via custom agent / parent inherit when available) | Same first-party pool as Grok; much cheaper per token than Grok; avoids the Other-pool spawn death           |
| **Lead**                            | **Composer**, as workhorse                                                                                                             | No owner ruling has named another pin for Cursor                                                             |
| **Review** (pre-merge axes)         | **Grok high** (prefer non-fast; else `cursor-grok-4.5-high-fast`)                                                                      | The judgment tier Cursor will actually run                                                                   |
| **Design** (planning, architecture) | **Grok high**; hand off externally for a big design call                                                                               | Cursor has no distinct design tier that reliably spawns — one lane fills both                                |
| **Parent / orchestrator**           | Either; Grok is fine                                                                                                                   | Routes and judges; it delegates planning and merges (`docs/agents/orchestration.md` § The session delegates) |

The interactive session delegates every task (`docs/agents/orchestration.md`
§ The session delegates). Work that is not review or design goes to a subagent on the
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

Fill the four lanes from what the harness will actually run: the cheapest
model that does the job reliably for workhorse, a strong mid tier for lead, a
strong critical-reasoning model for review, and — if the
harness has a distinct top-end planning model — design. If it does not, review
and design share one fill; say so rather than inventing a tier. Model _names_
change; the **lane model**, the **lanes-sort-by-kind** rule, the
**never-downgrade-a-review-job** rule, and the **manager fan-out** rule do not.
When in doubt, ask which lane the user wants.
