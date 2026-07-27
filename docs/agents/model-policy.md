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

| Lane          | Jobs                                                                          | Model bar                                                                                                                                                 | Speed                                                      |
| ------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Workhorse** | Implement plans, TDD slices, parallel-phase workers, merges, mechanical edits | Best **mid-tier the harness will actually run** — e.g. Claude Sonnet-class, GPT Terra / mid-high when quota is real. Not a fixed brand name.              | Prefer parallel when slices are independent                |
| **Sharp**     | Pre-merge review axes, adversarial/domain judgment, hard design calls         | Top reasoning tier **actually available** on this harness. Elsewhere: Opus-class, GPT high/sol-class, `codex exec`. On Cursor: **Grok high** (see below). | **Slow is fine**: sequential axes, wait/retry, or hand off |

Never silently **downgrade** a sharp job to a weaker model to “get unblocked.”
That trades a visible delay for invisible review theatre. Prefer: wait and
retry the same class → run axes **one at a time** → print briefs for a
fresh session / other tool → ask the user. Same-session review by the
authoring agent is last resort and must be labeled in `docs/reviews/…`.

Workhorse jobs **may** retry on a peer workhorse if one mid-tier is
exhausted; they still must not jump to a toy model for implementation
correctness without the user saying so.

## Parallelism vs serial

- **Implementation (`parallel-phase`):** parallel worktrees with workhorse
  models is the point — often faster _and_ better than one long chain.
- **Review (`pre-merge-review`):** parallel sharp reviewers when the
  harness allows; on a wall, **serialise** (one axis, wait, next) rather
  than three weak ones. Wall clock can grow; finding quality must not drop.

## Harness notes

### Cursor (IDE Task / `best-of-n-runner` / subagents)

Cursor bills **two pools**:

- **Cursor Models** — Composer 2.5, Grok 4.5 (“generous” included usage).
- **Other Models** — Terra, Sol, Sonnet, Opus, etc. (~$20/mo on Pro).

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
  are for accounting, not preflight.
- **Claude Code / Codex:** mid-tier workhorse (Sonnet / Terra-class) for
  workers, top tier for review; sequential review on rate limit. Prefer
  those harnesses when you need a non-Grok sharp reviewer or real
  third-party mid-tier quota.

Model _names_ change; the **lane** (workhorse vs sharp) and the rule
**workhorse = what the harness will actually run** do not. When in doubt,
ask which lane the user wants.
