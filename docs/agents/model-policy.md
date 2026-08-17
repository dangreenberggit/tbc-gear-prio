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
Multiply by slice count, add fan-in.

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
| **Workhorse** | Implement plans, TDD slices, parallel-phase workers, merges, mechanical edits | Strong mid tier the harness will **actually run** — see the per-harness sections for who that is here                      | Prefer parallel when slices are independent                                   |
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

Workhorse jobs **may** retry on a peer workhorse if one mid-tier is
exhausted; they still must not jump to a toy model for implementation
correctness without the user saying so.

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

Name the model and effort on every spawn. The harness default is
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
  around **3–5** workers. Every worker gets the workhorse model named in your
  harness section, stated explicitly on the spawn. Review and design models are
  for review axes and design calls, never for a fan-out: a fan-out on either
  burns the usage limit before fan-in finishes, so the swarm dies half-merged.

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

| Lane          | Fill it with                                                                    |
| ------------- | ------------------------------------------------------------------------------- |
| **Workhorse** | Sonnet-class / mid tier                                                         |
| **Review**    | **Opus at effort `medium`** (see below)                                         |
| **Design**    | **Fable** — planning and architecture only; anything else needs a stated reason |

The Opus **model** and the **effort level** are separate controls
([model config](https://code.claude.com/docs/en/model-config#adjust-effort-level),
[effort API](https://platform.claude.com/docs/en/build-with-claude/effort)).
Effort is `low` | `medium` | `high` | `xhigh` | `max` via `/effort`,
`--effort`, `effortLevel`, or API `output_config.effort`. There is no
`claude-opus-*-medium` model slug — set Opus **and** the effort.

**This repo’s preference** (not Anthropic’s marketing default): for tough
Claude / Opus work, default to **effort `medium`**. Reserve effort `high`
(and above: `xhigh` / `max`) for niche cases — e.g. a **single** narrow
adversarial pre-merge review axis — where overthinking is worth the spend.
At high effort Opus here tends to trip on wording and wander; medium stays
tighter for this repo’s tasks (untested as a controlled comparison — this is
accumulated session judgment, not a benchmark).

**Fable is the design lane and nothing else.** It is the top price tier on this
harness, above Opus — so an unnamed subagent spawned from a Fable session
inherits Fable and bills at that tier. Name the model on every spawn. Review
axes run **Opus**, not Fable: a taller model is not a better reviewer, and
review is not the kind of work Fable is reserved for.

Prefer this harness when a review-lane reviewer from a different vendor than the
authoring session is wanted, and sequential axes on a rate limit.

#### Stage-gate seats

The `stage-gate` skill fills its seats from these lanes: Planner = design
(Fable, frontmatter `effort: low` — the capability is what is bought, not
the tokens), Reviewer = review (Opus at effort `medium`; its optional
single judgment-claim refuter is the one narrow adversarial axis this
policy reserves `high`+ for, when used at all), Executor = workhorse
(Sonnet-class). The orchestrator is the interactive session; Opus at
effort `medium` is the recommended seat, and a Fable session may
orchestrate with the stated reason that between-stage adjudication is
planning-adjacent — a deliberate one-job extension of the design lane.
Agent-definition frontmatter cannot name Fable, so the skill names every
seat's model at the call site and each seat self-checks
(`WRONG_MODEL: <name>` → respawn with the model named, never continue).

### Codex

| Lane          | Fill it with                              |
| ------------- | ----------------------------------------- |
| **Workhorse** | Mid tier for workers and mechanical edits |
| **Review**    | Top tier; `codex exec` runs               |
| **Design**    | Top tier, extended reasoning              |

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
| **Parent / orchestrator**           | Either; Grok is fine                                                                                                                   | Planning and merge coordination                                                                    |

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
On Claude Code, Codex, or a Cursor plan with real Other-pool headroom,
Sonnet- or Terra-class workhorses remain fine.

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
