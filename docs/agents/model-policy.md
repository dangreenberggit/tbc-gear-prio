# Agent model policy

How this repo picks models and reacts when the harness hits a wall
(rate limit, quota, spawn failure). Harness-agnostic policy; Cursor /
Claude / Codex are just places the wall shows up.

## What we can and cannot know

**Reactive detection works.** Treat these as a wall:

- Spawn / Task / subagent errors mentioning rate limit, usage limit, quota,
  `429`, capacity, or “switched to … after reaching API limit”
- Cloud Agents API / SDK `429 Too Many Requests` (backoff and retry)
- A reviewer or worker that never starts or dies immediately on create

**Proactive headroom usually does not.** On typical solo Cursor Pro there is
no reliable “how much sharp-model budget is left” API for IDE Task spawns.
Cloud Agents expose per-run usage _after_ the fact; team Admin/Analytics
usage APIs need team/enterprise keys and still won’t tell an IDE session
whether the next Opus spawn will succeed. Do not invent a fake meter —
assume walls are **observed**, not predicted.

## Two lanes

| Lane          | Jobs                                                                          | Model bar                                                                                                                                                                                                                            | Speed                                                                         |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Workhorse** | Implement plans, TDD slices, parallel-phase workers, merges, mechanical edits | Strong mid tier when the harness allows it — e.g. Claude Sonnet-class, GPT Terra / mid-high. On **Cursor**, prefer **Composer** (`composer-2.5-fast` or current Composer slug) for simple / mechanical / parallel implement workers. | Prefer parallel when slices are independent                                   |
| **Sharp**     | Pre-merge review axes, adversarial/domain judgment, hard design calls         | Top reasoning tier **actually available** on this harness (not aspirational). Elsewhere: Opus-class, GPT high/sol-class, `codex exec`. On Cursor today: **Grok high** (see harness notes).                                           | **Slow is fine**: sequential axes, wait/retry, or hand off to a fresh session |

Never silently **downgrade** a sharp job to a weaker model to “get unblocked.”
That trades a visible delay for invisible review theatre. Prefer: wait and
retry the same class → run axes **one at a time** → print briefs for a
fresh session / other tool → ask the user. Same-session review by the
authoring agent is last resort and must be labeled in `docs/reviews/…`.

Workhorse jobs **may** retry on a peer workhorse if one mid-tier is
exhausted; they still must not jump to a toy model for implementation
correctness without the user saying so.

## Parallelism vs serial

- **Implementation (`parallel-phase`):** parallel worktrees with **workhorse**
  models is the point — often faster _and_ better than one long chain. Cap
  around **3–5** workers. Do **not** fan out a swarm of high-ticket sharp
  models (Opus at effort `high`+, Fable, Sol, etc.) — they burn usage limits
  before fan-in finishes. Workers stay workhorse; sharp is for review axes.
- **Review (`pre-merge-review`):** parallel sharp reviewers when the
  harness allows; on a wall, **serialise** (one axis, wait, next) rather
  than three weak ones. Wall clock can grow; finding quality must not drop.

## Harness notes

### Cursor (IDE Task / `best-of-n-runner` / subagents)

Cursor bills **two pools**:

- **Cursor Models** — Composer 2.5, Grok 4.5 (“generous” included usage).
- **Other Models** — Terra, Sol, Sonnet, Opus, etc. (~$20/mo on Pro).

**Presume Cursor-owned models up front.** In this IDE, Task / subagent
spawns that ask for Sol/Opus are routinely refused or usage-walled and
land on Cursor’s own stack. Do not Sol/Opus-probe “for quality.”

**Default Task `model` by lane:**

| Lane          | Cursor default                                                                         | Use for                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Workhorse** | **Composer** — `composer-2.5-fast` (or current Composer slug in the Task enum)         | Simple / mechanical implement, parallel-phase workers, file moves, straightforward TDD green, merge chores |
| **Sharp**     | **Grok high** — prefer non-fast `…-high` when listed; else `cursor-grok-4.5-high-fast` | Design judgment, SME/math review, pre-merge axes, hard debugging calls                                     |

- **Composer is allowed and preferred for simple work** — it is not a silent
  downgrade from Grok; it _is_ the workhorse lane on Cursor. Do not burn
  Grok high on every mechanical worker.
- **Do not use Composer for sharp jobs** (adversarial review, pool redesign
  judgment, pre-merge axes). Those stay Grok high (or an external Opus/Sol
  session via handoff brief).
- **Do not Sol-probe:** skip aspirational non-Cursor Task models unless the
  user explicitly names one _and_ accepts wall-handling. One refused Sol
  spawn is already too many for a manager fan-out.
- **Ceiling vs wall:** A usage/`429` on Sol/Opus you should not have asked
  for is self-inflicted. A wall on Grok high (sharp) → wait, serialise, or
  hand off an external brief — never invent a weaker model to finish a
  _sharp_ job. A Composer wall on workhorse → retry Composer or peer
  workhorse; asking the user is fine; do not “upgrade” every simple task
  to Grok by default just because Composer hiccuped once.
- **“Prefer strongest available”** means **sharp lane on this harness**
  (Grok high on Cursor) for sharp work — not “try Sol until the API cries,”
  and not “Grok for everything including `mv` scripts.”

#### Manager / multi-step fan-out (Cursor Task)

A manager that must spawn workers **and** run fan-in (reviews, compile)
owns the whole pipeline until deliverables exist — or it must leave a
disk-canonical handoff the **parent** can continue.

**Do not** `run_in_background: true` on workers and then end the manager
turn with “waiting on workers.” That abandons fan-in: background
completions notify the _parent_ session, not a finished manager, and the
redesign stalls with an empty or half-filled handoff dir (2026-07-28
pool-redesign manager incident).

Prefer one of:

1. **Foreground / blocked fan-out** — spawn workers without abandoning
   responsibility; only report done when option docs (or equivalent) exist
   and the next stage is kicked or finished; or
2. **Explicit parent handoff** — write `.scratch/handoffs/…/PROCESS.md`
   naming what’s in flight, what’s blocked, and the exact next spawn
   (reviews/compile), then end. Parent resumes from that file.

Retrying Sol after a usage wall, then backgrounding Grok workers and
exiting, is the anti-pattern: wasted turns + no compile.

### Claude Code (effort, not a “medium” slug)

On Claude Code, the Opus **model** and the **effort level** are separate
controls ([model config](https://code.claude.com/docs/en/model-config#adjust-effort-level),
[effort API](https://platform.claude.com/docs/en/build-with-claude/effort)).
Effort is `low` | `medium` | `high` | `xhigh` | `max` via `/effort`,
`--effort`, `effortLevel`, or API `output_config.effort`. There is no
`claude-opus-*-medium` model slug — set Opus **and** the effort.

**This repo’s preference** (not Anthropic’s marketing default): for tough
Claude / Opus work, default to **effort `medium`**. Reserve effort `high`
(and above: `xhigh` / `max`) for niche cases — e.g. a **single** narrow
adversarial pre-merge review axis — where overthinking is worth the spend.
At high effort Opus here tends to trip on wording and wander; medium stays
tighter for this repo’s tasks.

Workhorse on Claude Code remains Sonnet-class / mid. Prefer this harness
when a non-Grok Opus reviewer is required; sequential review on rate limit.

On Pro, Other Models are often a **paper limit**: Task/`best-of-n-runner`
workers requested as Terra (or similar) die at spawn with
`API usage limit reached Switched to grok-4.5…` and still end as
`status: error` — no tools, no commits. That string is **not** a successful
ceiling handoff; treat it as a hard wall. Cursor advertises mid-tier models
the plan does not actually let you use for parallel fan-out.

This is a **Cursor packaging quirk**, not a universal “always Composer”
rule. On Claude Code / Codex / a plan with real Other-pool headroom, Sonnet
or Terra-class workhorses remain fine.

**On Cursor specifically:**

| Lane                               | Pin                                                                                                                                    | Why                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Workhorse** (workers, implement) | **Composer** (`composer-2.5-fast` on Task if that’s the only Composer slug; non-fast via custom agent / parent inherit when available) | Same first-party pool as Grok; much cheaper per token than Grok; avoids the Other-pool spawn death |
| **Sharp** (reviews)                | **Grok high** (prefer non-fast / non-`…-fast`; else `cursor-grok-4.5-high-fast`)                                                       | Top of the stack Cursor will actually run for judgment                                             |
| **Parent / orchestrator**          | Either; Grok is fine                                                                                                                   | Planning and merge coordination                                                                    |

Do **not** spawn N Terra/Sol/Other-pool workers in parallel on Cursor Pro.
Do **not** keep retrying Sol/Opus for sharp after Cursor has already refused —
use Grok high. A forced Grok-high after a Sol request for **review** is the
sharp ceiling (note it and continue). A Terra worker that logs “Switched to
grok…” then `status: error` is a **wall** — respawn on **Composer**, or
serialise / wait; do not pretend the dead Terra run continued on Grok.

Parent agents often auto-pick Terra for Task subagents; **pass an explicit
Composer model id** on worker spawns. Hiding Terra in the model picker helps
but is not enough by itself.

### Other harnesses

- **Cursor Cloud Agents API:** honor `429` with backoff; usage endpoints
  are for accounting, not preflight “can I spawn Opus.”
- **Claude Code / Codex:** mid-tier workhorse (Sonnet / Terra-class) for
  workers, top tier for review; sequential review on rate limit. Prefer
  those harnesses when you need a non-Grok sharp reviewer or real
  third-party mid-tier quota.
  Model _names_ change; the **lane** (workhorse vs sharp), the **Cursor pair =
  Composer workhorse + Grok high sharp**, and the **Claude Code Opus + effort
  `medium` default** do not. When in doubt, ask which lane the user wants.
