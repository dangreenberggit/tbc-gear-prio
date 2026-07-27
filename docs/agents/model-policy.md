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

| Lane          | Jobs                                                                          | Model bar                                                                                                                                                                                  | Speed                                                                         |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Workhorse** | Implement plans, TDD slices, parallel-phase workers, merges, mechanical edits | Strong mid tier when the harness allows it — e.g. Claude Sonnet-class, GPT Terra / mid-high. On Cursor, often the same Grok family as sharp (see below).                                   | Prefer parallel when slices are independent                                   |
| **Sharp**     | Pre-merge review axes, adversarial/domain judgment, hard design calls         | Top reasoning tier **actually available** on this harness (not aspirational). Elsewhere: Opus-class, GPT high/sol-class, `codex exec`. On Cursor today: **Grok high** (see harness notes). | **Slow is fine**: sequential axes, wait/retry, or hand off to a fresh session |

Never silently **downgrade** a sharp job to a weaker model to “get unblocked.”
That trades a visible delay for invisible review theatre. Prefer: wait and
retry the same class → run axes **one at a time** → print briefs for a
fresh session / other tool → ask the user. Same-session review by the
authoring agent is last resort and must be labeled in `docs/reviews/…`.

Workhorse jobs **may** retry on a peer workhorse if one mid-tier is
exhausted; they still must not jump to a toy / ultra-fast model for
implementation correctness without the user saying so.

## Parallelism vs serial

- **Implementation (`parallel-phase`):** parallel worktrees with workhorse
  models is the point — often faster _and_ better than one long chain.
- **Review (`pre-merge-review`):** parallel sharp reviewers when the
  harness allows; on a wall, **serialise** (one axis, wait, next) rather
  than three weak ones. Wall clock can grow; finding quality must not drop.

## Harness notes

### Cursor (IDE Task / subagents)

Cursor often **only spawns Grok** for subagents in this environment, and
**high** is the top of that stack. Treat that as the Cursor sharp lane —
do not keep retrying Sol/Opus after the harness has already refused or
swapped; that burns time without changing the ceiling.

- **Sharp on Cursor:** Grok **high**. Prefer non-fast / non-“fast” when the
  harness exposes it (`…-high` over `…-high-fast`). If only
  `cursor-grok-4.5-high-fast` (or the current high-fast slug) is available,
  that is the sharp id — use it; do not drop to a lower Grok tier.
- **Workhorse on Cursor:** when non-Grok mid-tiers spawn, use them for
  implement/parallel workers; when Cursor forces Grok for everything,
  workhorse = same Grok high family (still better than silently accepting
  a weaker auto-swap without telling the user).
- **Ceiling vs wall:** Forced Grok-high after a Sol/Opus request is the
  **Cursor ceiling** — note it in the review dispatch line and continue on
  Grok high. A **wall** is rate/usage/`429`/spawn failure, or a swap to
  something _below_ Grok high — then wait, serialise, or hand off; never
  invent a weaker model to finish.

### Other

- **Cursor Cloud Agents API:** honor `429` with backoff; usage endpoints
  are for accounting, not preflight “can I spawn Opus.”
- **Claude Code / Codex:** mid for workers, top for review; sequential
  review on rate limit. Prefer those harnesses when a non-Grok sharp
  reviewer is required.

Model _names_ change; the **lane** (workhorse vs sharp) and the **Cursor =
Grok high ceiling** do not. When in doubt, ask which lane the user wants.
