# Plan — craft-quality skill/docs on `feat/fan-out-retro`

**Date:** 2026-07-27  
**Planner branch:** `retro/w-skill-craft-plan`  
**Base tip:** `feat/fan-out-retro` @ `94b4371` (asserted equal at plan start)  
**Pass B apply already landed:** `ace103f` (“Apply Pass B adopt matrix…”) — **do not re-apply**  
**Stance:** Conservative. Sharpen what exists. Prefer rails + progressive disclosure over new doctrine. This file is a plan only — **do not apply** from this commit.

**Parent decisions (binding):**

1. `parallel-phase` stays **model-invoked** (keep `description`). Ambient `AGENTS.md` Parallel agents is enough to fire it when fan-out is obvious; humans need not say “use parallel agents” every time.
2. Concurrency / cost prudence: fan out with care — cap ~3–5; prefer **workhorse** for workers; do not spawn a swarm of high-ticket models (Opus high / Fable / Sol) that burn limits before finishing.
3. Claude: prefer **Opus + effort `medium`** over Opus + effort `high` for tough Claude tasks; reserve effort `high`+ for niche uses (e.g. a single adversarial review axis). Encode in `docs/agents/model-policy.md` (+ short AGENTS pointer if needed).

**Gold sources (cite by technique, not as cargo):**

| Source | URL | Techniques this plan inherits |
| --- | --- | --- |
| Repo research list | `.scratch/retros/reports/09-skill-writing-sources.md` | Ranked reading order; ambient vs playbook split |
| Pocock `writing-great-skills` | https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/writing-great-skills/SKILL.md | Model- vs user-invoked, leading words, steps + completion criteria, progressive disclosure, pruning, failure modes |
| Pocock glossary | https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/writing-great-skills/GLOSSARY.md | Vocabulary: context load, sediment, sprawl, no-op, negation, premature completion |
| Pocock essay | https://www.aihero.dev/skills-writing-great-skills | Predictability as root virtue |
| agentskills best practices | https://agentskills.io/skill-creation/best-practices | Progressive disclosure, defaults-not-menus, gotchas, omit what the model knows, calibrate control |
| agentskills optimizing descriptions | https://agentskills.io/skill-creation/optimizing-descriptions | Leading/imperative description, should/should-not trigger evals |
| Anthropic engineering | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills | Three-tier load (metadata → SKILL.md → linked files) |
| Claude Code model config | https://code.claude.com/docs/en/model-config#adjust-effort-level | Effort levels are real; aliases are `opus` / version ids — not `*-medium` slugs |
| Anthropic effort API | https://platform.claude.com/docs/en/build-with-claude/effort | `low` / `medium` / `high` / `xhigh` / `max` as `output_config.effort` |

---

## 1. Current state

### 1.1 Already applied (`ace103f` + tip)

Diff of `08-ADOPT.md` **Adopt now** table vs tip (`94b4371`): **all Adopt-now rows are present.** Do not re-propose them.

| ID | Tip evidence |
| --- | --- |
| ENV-1p | `vitest.config.ts` excludes `**/.claude/worktrees/**`; `.gitignore` lists `.claude/worktrees/` |
| ATTR | `.gitattributes` comment corrected (LF / ticket 05 — no false CRLF story) |
| ENV-3n | `adapters/claude-code.md` (both mirrors); SKILL adapter table updated |
| ENV-6n (prose) | `AGENTS.md` Durable claims: no interactive `pnpm approve-builds`; `pnpm.onlyBuiltDependencies` already set |
| ORCH-3 | Shared-manifest single-writer in `parallel-phase` Step 1 |
| ORCH-1/2n | Clean tree + unconditional base-SHA paste/assert in Step 3 |
| ORCH-2a | `claude-code.md` default-branch (`fresh` → `origin/main`) warning |
| ORCH-4n | Teardown **before** integrated verify (Steps 6–7) |
| ORCH-6n | Actionable concerns → review Disposition; completion criteria |
| CTX-2 | Bound scaling output in `AGENTS.md` Durable claims |
| CTX-3d | Never hand-type SHAs — `git rev-parse HEAD` |
| CTX-3% | Fan-in from shape, not context-% |
| R2 / R5 / R8 | Generated-artifact regen rule; no `cd`; never assert gitignored input present |
| DOC-1n | Testing: ports §5 vs pure-function tests §6 |
| DOC-2n | `Blocked by:` documented + surfaced in `issues:open` (`check_merge_ready.py`) |
| DOC-3n | Handoff-template harness attribution rule |
| LIFE-n | `.scratch/handoffs/` tracked; handoff skill points there for cross-session |
| MIRROR | `scripts/check_skill_mirrors.py` + `pnpm mirrors:check` in `pnpm verify` — currently green |

Soft second-wave already present (do not re-land):

| ID | Tip evidence |
| --- | --- |
| R1n / R4n | Causal claims → command or `hypothesis`/`untested`; no unobserved-env attribution |
| CTX-3 soft | Mechanical vs editorial fan-in decision in Roles |
| CTX-4 soft | Fan-in brief / literals on disk in Step 3 |

### 1.2 Remaining gaps from `08-ADOPT` (soft / optional only)

| ID | Status | Recommendation for this plan |
| --- | --- | --- |
| ENV-5n | **Missing** — no “permission denial ≠ silent replan” sentence | **WP-C candidate** — one positive sentence max (see ENV review minimal wording). Reject retry-once ritual / fat allow-lists (already deferred). |
| ENV-6n settings deny | **Partial** — prose + `onlyBuiltDependencies` yes; no tracked `.claude/settings.json` deny | **Skip** unless a settings file is introduced for other reasons. Do not invent a settings file just for this. |
| R6n | **Missing** | **Skip** — soft, easy to become chat-norm sediment; 08 already warns against encoding “boring hypothesis first” as law. |
| CTX-6 soft | **Missing** | **Skip** — technique note without a hard size law is low leverage vs prompt cost. |

**Net:** Pass B content work left is ~0–1 soft sentences (ENV-5n). Everything else in this plan is **craft + model-policy**, not re-adoption.

### 1.3 `parallel-phase` vs Pocock hierarchy (today)

**Invocation:** model-invoked. Description present (~289 chars). No `disable-model-invocation`. Matches parent decision (overrides the user-invoked suggestion in `09-skill-writing-sources.md` Notes).

**Structure (good bones):**

- Ordered **Steps** 1–8 with a **Completion criteria** block (Pocock ladder: in-skill steps + checkable done).
- **Adapters** already progressive-disclosed under `adapters/` (Anthropic tier 3 / Pocock external reference).
- **Handoff template** already a sibling file with a context pointer.
- Cap **3–5** + workhorse pointer already in “When to fan out.”
- Leading words already in play: *fan-out*, *handoff*, *worktree*, *delegator*, *mechanical* / *editorial*.

**Craft debts (sharpen, don’t rewrite from scratch):**

| Debt | Diagnosis (Pocock / agentskills) | Fix direction |
| --- | --- | --- |
| Step 3 mega-step | Spawn + clean-tree + base-SHA paste + post-spawn assert + fan-in brief co-located as one long step → **sprawl** risk and **premature completion** risk (agent “does spawn” and skims asserts) | Keep as one step **or** split only if observed rush; prefer **sharper completion criterion** for Step 3 first (Pocock: sharpen bound before sequence-split). Optionally move the long SHA paste block / Windows leftover note behind a short pointer if Step 3 still exceeds ~½ page. |
| Reference mixed into steps | Gotchas (vitest pollution, Windows `node_modules`, default-branch basing) partly duplicated in SKILL + `claude-code.md` / `agnostic.md` → **duplication** | Single source: harness gotchas live in the adapter; SKILL keeps the harness-agnostic assert + teardown order. |
| Description | Solid triggers; leading word *fan-out* / *parallel* present. Could front-load *fan-out* slightly harder (Pocock leading words in description; agentskills imperative “Use when…”). | WP-B description pass — no keyword stuffing. |
| Prudence on expensive models | Cap + workhorse present; does **not** yet warn against spawning many Opus-high / Fable / Sol workers | One sentence in “When to fan out” + model-policy (WP-A/B). |
| Negation-heavy “Do not” | Necessary hard guardrails (land, dirty tree, verify-with-live-worktree) — keep, but pair each with positive target already mostly done | Prune any “Do not” that restates a positive step (no-op / negation). |
| Dual mirrors | Identical today; `mirrors:check` green | Always edit both or edit one + copy; never land with drift. |

**Size:** ~85 lines / ~7.2k chars — under agentskills ~500-line budget. Not emergency sprawl; the win is hierarchy clarity, not a dramatic cut.

**Note:** `09` suggested making this skill user-invoked to save context load. **Rejected by parent** — ambient AGENTS + model-invoked description is the chosen trade (pay context load for autonomous fan-out).

---

## 2. Goals / non-goals

### Goals

1. Encode **Claude Opus effort preference:** prefer **effort `medium`** over **`high`** for tough Claude (Code) work; reserve `high` / `xhigh` / `max` for niche cases (narrow adversarial review axis, etc.). Map carefully — see §2.1.
2. Keep `parallel-phase` **model-invoked**; improve description leading words / branches without flipping invocation mode.
3. Add **concurrency / cost prudence** language: ~3–5 cap stays; prefer workhorse workers; do not fan out with a cloud of high-ticket sharp models.
4. Craft-rewrite `parallel-phase` toward Pocock/agentskills: steps with checkable completion criteria, progressive disclosure of adapters/handoff schemas, prune sediment/duplication — both `.claude/` and `.agents/` mirrors; run mirror check.
5. Optionally land **ENV-5n** one-liner if still missing and mechanical (WP-C).

### Non-goals

- Re-applying anything already landed in `ace103f` / tip (see §1.1).
- Resurrecting Pass B **defer / reject** items (see §6).
- Flipping `parallel-phase` to `disable-model-invocation: true`.
- Adding `Depends:`, idle-while-waiting, CTX-1 hard forbid, context-% fan-in, hard >30kB law, ScheduleWakeup docs, fat permission allow-lists, known-walls essay.
- Building a full description-eval harness / skill-creator loop (WP-D is a sketch only).
- Inventing model **slug** names like `claude-opus-5-medium` or Cursor-style `…-thinking-medium` for Claude Code.

### 2.1 Opus “medium” — real mapping (must land accurately)

**Finding:** In Claude Code / Anthropic docs, `medium` is an **effort level**, not a separate model id.

| Concept | Real control | Docs |
| --- | --- | --- |
| Model family | Alias `opus` / version ids (e.g. latest Opus 5) | https://code.claude.com/docs/en/model-config |
| Reasoning depth / spend | Effort: `low` \| `medium` \| `high` \| `xhigh` \| `max` via `/effort`, `--effort`, `effortLevel`, or API `output_config.effort` | https://code.claude.com/docs/en/model-config#adjust-effort-level · https://platform.claude.com/docs/en/build-with-claude/effort |

**Wording to encode (approx):**

> On Claude Code, sharp/tough Opus work defaults to **effort `medium`** (`/effort medium` or `--effort medium`), not effort `high`. Reserve effort `high` (and above: `xhigh` / `max`) for narrow niches — e.g. a single adversarial pre-merge axis — where overthinking is worth the spend. Do not invent a model slug that embeds “medium”; set the Opus model **and** the effort level.

**Do not** equate this with Cursor Grok `…-high` / `…-high-fast` slugs — different harness, different control surface. Cursor sharp lane stays Grok high per existing policy.

**Rationale (user):** Opus at high effort gets tripped up on words and tangents; medium stays sharper for this repo’s tough tasks.

---

## 3. Work packages

Ordered, independently reviewable. Apply in order WP-A → WP-B → WP-C → WP-D (D optional).

### WP-A — Model policy: Opus effort medium + concurrency prudence

**Intent:** Encode the Opus medium preference and strengthen cost/concurrency prudence without rewriting the two-lane model.

**Files touched:**

- `docs/agents/model-policy.md` (primary)
- `AGENTS.md` — Models and walls (1–2 sentences pointer only)

**Content sketch:**

1. Under **Two lanes** or a new **Claude Code effort** subsection:
   - Workhorse unchanged (Sonnet-class / mid).
   - Sharp on Claude Code: Opus-class **at effort `medium`** by default for tough tasks.
   - Effort `high`+ reserved for niche (name adversarial review axis as example).
   - Explicit: `medium` is effort, not a model slug; cite Claude Code model-config + effort docs.
2. Under **Parallelism vs serial** (or workhorse note):
   - Prefer workhorse for `parallel-phase` workers.
   - Cap remains ~3–5; do not spawn many Opus-high / Fable / Sol workers in one fan-out — burns usage before fan-in finishes.
3. AGENTS pointer: “Claude Code sharp → Opus + effort medium; see model-policy.” Keep AGENTS short.

**Acceptance:**

- [ ] `model-policy.md` states effort `medium` preference and that it is not a slug.
- [ ] `high`/`xhigh`/`max` reserved with at least one niche example.
- [ ] Concurrency/cost prudence names expensive models as anti-pattern for worker swarms.
- [ ] AGENTS does not invent slugs; points at policy.
- [ ] No change to Cursor = Grok high ceiling.

**Risks:** Over-prescribing effort for every harness; conflicting with Anthropic’s own “start at high/xhigh” marketing — mitigate by labeling this as **this repo’s** preference with rationale.  
**Size:** S (~15–40 lines net).

**Cites:** Claude Code model-config (effort); Anthropic effort API; parent decision #2–3.

---

### WP-B — `parallel-phase` craft rewrite (both mirrors)

**Intent:** Sharpen predictability (Pocock) without adding doctrine. Keep model-invoked.

**Files touched (edit in lockstep):**

- `.claude/skills/parallel-phase/SKILL.md`
- `.agents/skills/parallel-phase/SKILL.md`
- Optionally thin adapters / `handoff-template.md` only if deduping duplication (prefer SKILL→adapter single-source).
- Do **not** change invocation to user-invoked.

**Rewrite checklist (techniques → actions):**

| Technique | Source | Action |
| --- | --- | --- |
| Leading words in description | Pocock; agentskills optimizing-descriptions | Front-load *fan-out* / *parallel slices*; keep distinct branches (independent slices; user asks fan out/delegate/orchestrate; other skill needs worktree isolation). Collapse synonym duplication. |
| Imperative “Use when…” | agentskills optimizing-descriptions | Keep; trim identity already in body. |
| Steps + completion criteria | Pocock | Keep 8-step spine. Per-step: ensure each has a checkable done signal; strengthen Step 3’s criterion (clean tree + every worker base SHA asserted via `git worktree list`) before considering a sequence split. |
| Progressive disclosure | Pocock ladder; Anthropic three-tier; agentskills best practices | Keep adapters + handoff template out of body. Push any remaining harness-only gotchas into the matching adapter. SKILL retains agnostic rails. |
| Defaults not menus | agentskills best practices | Delegator-merges-editorial already default — keep; avoid adding alternate orchestration menus. |
| Prune sediment / no-ops / duplication | Pocock pruning | Sentence-level no-op test; delete restatements of AGENTS land loop; dedupe teardown/base-SHA across SKILL↔adapters. |
| Prudence sentence | Parent #2 | One line: workers = workhorse; do not fan out with many high-ticket sharp models. Point at model-policy. |
| Negation | Pocock failure mode | Keep hard guardrails in “Do not”; drop any “Do not” that only restates a positive step. |

**Acceptance:**

- [ ] Still model-invoked (`description` present; no `disable-model-invocation`).
- [ ] Description ≤ ~500 chars preferred (hard ceiling 1024 per agentskills spec).
- [ ] Steps remain ordered; completion criteria still exhaustive on base-SHA, teardown-before-verify, Disposition.
- [ ] No new Pass B reject content.
- [ ] `python scripts/check_skill_mirrors.py` (or `pnpm mirrors:check`) exits 0.
- [ ] SKILL line count not ballooned (prefer flat or down; reject +30% growth without disclosure).

**Risks:** Over-scripting cognition (turn editorial judgment into a checklist theater); prompt bloat; dual-mirror drift if one tree edited alone.  
**Size:** M (focused edit of one skill + mirrors; adapters only if dedupe needs it).

---

### WP-C — Soft adopt leftovers (only if still missing and mechanical)

**Intent:** At most one sentence from the soft table — ENV-5n.

**Files:** `AGENTS.md` Durable claims **or** `parallel-phase` “When to fan out” / Roles — pick **one** surface (single source of truth). Prefer AGENTS if it is a session-wide behavior; prefer skill if it is fan-out-specific.

**Minimal wording target** (from `07-review-env`, load-bearing bit only):

> A permission denial is evidence about that call, not a capability model. Do not silently drop or rewrite the plan; if a fan-out / land precondition cannot be established, stop and report the exact blocked command.

Trim further if still chatty. **Do not** add retry-once ritual or tracked allow-lists.

**If ENV-5n already feels covered by other text at apply time:** skip WP-C entirely.

**Acceptance:** Zero or one new sentence; mirrors unaffected unless skill path chosen (then both mirrors).  
**Risks:** Negation-heavy phrasing — pair with positive “stop and report.”  
**Size:** XS.

---

### WP-D — Optional description trigger-eval sketch (do not overbuild)

**Intent:** Lightweight train set only — not a CI harness.

**Deliverable:** Short appendix in this report family **or** a tiny `.scratch/retros/reports/10b-parallel-phase-description-evals.md` with ~8–12 should / should-not prompts (agentskills optimizing-descriptions). No scripted 60-run loop unless the user asks later.

**Should-trigger examples (sketch):** independent slices on a phase branch; “fan out these three tickets”; “orchestrate workers on disjoint files.”  
**Should-not (near-misses):** single-file bugfix; “review this branch”; “land when ready”; sibling-worktree curiosity without independent slices.

**Acceptance:** File exists with labeled queries; no package.json / CI wiring.  
**Risks:** Overfitting description to the sketch set — treat as smoke, not proof.  
**Size:** XS; **optional** after WP-B.

---

## 4. Per-WP summary table

| WP | Files | Acceptance | Top risks | Size |
| --- | --- | --- | --- | --- |
| A | `docs/agents/model-policy.md`, `AGENTS.md` | Effort medium encoded as effort not slug; prudence on expensive worker swarms | Harness confusion; fighting Anthropic defaults | S |
| B | `.claude/` + `.agents/` `parallel-phase/**` | Model-invoked; steps+criteria; mirrors green; no bloat | Over-scripting; prompt bloat; mirror drift | M |
| C | One of AGENTS or skill | 0–1 ENV-5n sentence | Negation / sediment | XS |
| D | Optional eval sketch md | Should/should-not list only | Overfit; overbuild | XS |

---

## 5. Apply order + verify recipe

1. **WP-A** — model-policy + AGENTS pointer. Commit alone.
2. **WP-B** — craft rewrite on one mirror, copy to the other (or edit both identically). Run mirror check before commit.
3. **WP-C** — only if ENV-5n still absent and still wanted after living with A/B.
4. **WP-D** — optional, last.

**Verify (from repo root / worktree):**

```bash
pnpm mirrors:check          # or: python scripts/check_skill_mirrors.py
pnpm verify                 # includes mirrors:check today
```

Manual smoke (WP-B): ask a fresh agent session whether independent phase slices trigger `parallel-phase` without the human saying “use parallel agents”; confirm a single-file fix does not.

**Land:** still ask before `pnpm land`; this plan branch merges into `feat/fan-out-retro` first, not `dev`.

---

## 6. Explicit “do not do”

### From Pass B rejects / defers (do not resurrect)

- CTX-1 hard “must not pre-explore” / idle-while-waiting
- New `Depends:` field; prettier gates on `.scratch` reports
- Context-% as fan-in trigger; hard >30kB never-read law
- ENV-1 GENERAL “worktrees must live outside the repo”
- ENV-5 retry-once ritual / fat tracked allow-lists
- ScheduleWakeup docs; ORCH “flake” framing for deterministic basing
- Cite-the-command **as sufficient** for generated-artifact correctness
- Ticket 05 CRLF / trailing-spaces-as-corruption narratives
- Lifecycle ceremony built on “stash actively misleads”
- Mandating out-of-repo worktrees as GENERAL law

### From skill-writing failure modes (Pocock / agentskills)

- **Negation-heavy** rules without a positive target
- **No-ops** (“be thorough”, restating AGENTS land loop inside the skill)
- **Sprawl** / dumping adapter internals back into `SKILL.md`
- **Sediment** — adding soft R6n / CTX-6 “just in case”
- **Duplication** across `.claude/` and `.agents/` (fix with `mirrors:check`, not prose)
- Teaching the model what it already knows (HTTP, what a worktree is) — keep gotchas only
- Menus of equal orchestration options (defaults, not menus)
- Flipping to user-invoked to “save tokens” against the parent decision
- Inventing `*medium*` **model slugs** for Claude

---

## 7. Out of scope for the apply pass

- Merging to `dev` / `main`
- Re-running Pass A / Pass B reviews
- Changing `pre-merge-review` beyond what model-policy already implies for sharp axes
- Automating description evals in CI

---

## Appendix — tip SHAs at plan time

| Ref | SHA |
| --- | --- |
| `feat/fan-out-retro` / plan base | `94b4371c72bf9a3451885e69e5d1705cb51980ed` |
| Pass B adopt commit | `ace103f` (ancestor of tip) |
