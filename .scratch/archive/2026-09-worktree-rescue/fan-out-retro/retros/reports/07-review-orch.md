# Pass B — Critical review: ORCH rules

## Status / base

| Item | Value |
| --- | --- |
| Worker branch | `retro/w-review-orch` |
| Asserted base | `feat/fan-out-retro` @ `1308b0a510006360ea1d057feb51d8e18bdeda6d` |
| `git rev-parse HEAD` at start of write | equals asserted tip (**pass**) |
| Scope | Documentation only — this file is the only allowed edit |
| Stance | Conservative. Prefer reject / defer / weaken over adopt when a rule over-scripts cognition, hides useful exploration, assumes unproven harness behavior, or generalizes one incident without mechanism. Mechanical rails > cognitive rituals. |

**Non-goals:** no edits to `SKILL.md`, adapters, `AGENTS.md`, or other shared skills; no land/push/merge to `dev`/`main`.

**Inputs honored:** `06-RECONCILE.md` (Blocked / Must-recheck / Strengthened), `02-orch.md`, `03-ctx.md` §C / CTX-3 (collision note only), `feat-fan-out-retro.md`, current `parallel-phase/SKILL.md` + `adapters/claude.md`.

---

## Method

For each candidate: restate · classify mechanical vs cognitive · verdict · evidence (repo + web) · failure mode if over-applied · minimal acceptable wording · confidence.

Web sources consulted as primary / near-primary docs (quotes truncated; URLs are the cite):

| Source | Relevance |
| --- | --- |
| [Claude Code worktrees](https://code.claude.com/docs/en/worktrees) | Official default `fresh` = remote default branch; `worktree.baseRef: "head"`; subagent isolation bases; cleanup |
| [Microsoft AI agent design patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) | Context growth across agents; compact / minimize handoff payload |
| [Prompt Bloat — Agent Patterns Catalog](https://www.agentpatternscatalog.org/patterns/prompt-bloat/) | Instruction accretion degrades following; treat prompts as code with eviction |
| [Agentic Thinking — Instructions that outlive the model](https://agenticthinking.ai/blog/instructions-that-outlive-the-model/) | Lean intent > frozen procedural micromanagement |
| [How to Think AI — premature parallelization](https://www.howtothink.ai/concepts/distinguish-artificial-serialization-treating-independent) | Parallelize only when B does not consume A's output |
| Industry worktree guides (Zylos, AgentMarketCap, reopt handbook) | Path domains, one-writer for hotspots, cleanup; corroborative not authoritative |

Repo facts re-checked at tip:

- Seven `worktree-agent-*` branches still at `55b5a51` (= `main` / `origin/main`).
- `adapters/claude.md` still says prefer feature-branch HEAD / `baseRef: "head"` when available.
- `adapters/agnostic.md` still documents verify-then-optional-cleanup.
- Committed `vitest.config.ts` has **no** worktree `exclude` (local dirty WT edits exist; ignored — not tip).
- `scripts/check_merge_ready.py` still gates on `## Disposition`.

---

## Per-rule reviews

### R1 — ORCH-1/2 combined: clean tree before spawn + unconditional base-SHA assert

**Restatement.** Before spawn: commit or stash so the named base commit is intentional. Name that SHA in every worker prompt; every worker asserts `git log -1 --format=%H` (or equivalent) before other work; after spawn, delegator checks `git worktree list`. Do not trust isolation defaults.

**Mechanical vs cognitive.** **Mechanical** (path/SHA rails). The “do not assume” framing is cognitive wrapping; the assert itself is a checkable gate.

**Verdict: adopt-narrowed**

**Evidence.**

- **Repo:** `02-orch` + `00-FAN-IN` + reconcile C10: 7/7 auto worktrees at `55b5a51` = default branch, not flaky. Tip still shows the same seven tips. Without a named SHA, feature-branch fan-out fails silently and merges look clean while missing post-`main` commits. Current `SKILL.md` Step 3 still says “branched from the **feature-branch HEAD**” — false for this harness’s default.
- **Web:** Claude Code docs: *“New worktrees branch from the repository's default branch”*; *`\"fresh\"` (default): branch from the repository's default branch on the remote, usually `main`*; *“Subagent worktrees use the same base branch … unless `worktree.baseRef` is set to `\"head\"`.”* ([code.claude.com/docs/en/worktrees](https://code.claude.com/docs/en/worktrees)). Prompt-level SHA pin remains necessary because settings are session/machine-local and `baseRef` only offers `fresh`|`head`, not an arbitrary SHA.
- **Reconcile:** Strengthened — unconditional assert; block “intermittent flake” framing (C10).

**Failure mode if over-applied.**

- Long “always paste this boilerplate” novels in Step 3 (prompt bloat).
- Forbidding any pre-spawn exploration that would catch a bad partition (CTX-1 tension) if the clean-tree rule is read as “delegator must be idle / mindless.”
- Treating `baseRef: "head"` as sufficient and dropping the SHA assert (settings drift / wrong cwd HEAD).

**Minimal acceptable wording.**

> Before spawn: commit or stash. Workers branch from a **named commit**, never the working tree. Put `git rev-parse HEAD`’s SHA in every worker prompt and require a first-action assert (+ `checkout -B` correction). After spawn, confirm bases with `git worktree list`. Do not describe default-branch basing as flaky.

Omit: multi-paragraph “why the harness lies”; duplicate essays in SKILL + template + adapter (one short rule + one adapter warning).

**Confidence:** high (0.9). Mechanism verified in-repo and in vendor docs.

---

### R2 — Correct `adapters/claude.md` default-branch warning

**Restatement.** Replace the current “prefer feature-branch HEAD (`worktree.baseRef: \"head\"` when available)” line with an accurate warning that the default bases on the remote default branch, and that prompt SHA assert remains required.

**Mechanical vs cognitive.** **Mechanical** (correct harness fact in the adapter). Risk of cognitive overclaim if it asserts “Agent tool exposes no base-ref option.”

**Verdict: adopt-narrowed**

**Evidence.**

- **Repo:** Current adapter text is still wrong at tip (reads as if HEAD-basing is the preferred/available default). `02-orch` consolidated patch §3; reconcile Strengthened.
- **Web:** Official docs contradict the stronger ORCH claim that there is *no* base-ref option: `worktree.baseRef` in settings *does* apply to agent-isolation worktrees ([worktrees docs](https://code.claude.com/docs/en/worktrees)). What is true: default is `fresh` (default branch); there is no per-spawn arbitrary SHA knob on the Agent tool; `"head"` is opt-in settings, not prompt magic.

**Failure mode if over-applied.**

- Shipping ORCH’s exact patch sentence *“The Agent tool exposes no base-ref option”* — false vs current docs; teaches a durable lie (same failure class as RSN durable-false-cause).
- Baking `origin/main` / seven-for-seven session archaeology into the skill forever (stale evidence paragraph).

**Minimal acceptable wording.**

> Default worktree isolation (`worktree.baseRef` unset / `"fresh"`) bases on the repo’s remote default branch, **not** the feature branch you are on. Set `"head"` in settings if you want local HEAD; **regardless**, pin the intended SHA in every worker prompt (SKILL Step 3) and check `git worktree list` after spawn.

**Confidence:** high (0.85). Narrowing required because ORCH overstated “no option.”

---

### R3 — ORCH-3 single-writer shared manifests via `pathsAllowed` / `pathsForbidden`

**Restatement.** Shared manifests (`package.json`, lockfiles, barrels) appear in exactly one slice’s `pathsAllowed` and every other slice’s `pathsForbidden`. Non-owners put needed lines in the handoff; fan-in owner applies them.

**Mechanical vs cognitive.** **Mechanical** (partition-table invariant, checkable by set intersection).

**Verdict: adopt**

**Evidence.**

- **Repo:** Inherited handoff already assigned `package.json` to protos; both workers still edited it (`02-orch` diffs from `bc148e8`). Prose ownership failed to transmit; constraining existing Step 1 fields is the structural fix ORCH proposes (and correctly rejects a second prose copy).
- **Web:** Parallel-agent practice repeatedly names one-writer rules for hotspot files (`package.json`, shared types) — e.g. AgentMarketCap parallel-agents guidance: designate a single agent authorized to modify each hotspot. Fits “shared mutable state ⇒ serialize / single writer” from multi-agent design patterns ([Microsoft](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)).
- **Reconcile:** Unchanged / eligible.

**Failure mode if over-applied.**

- Expanding “shared manifests” to every lightly touched file → false serialization (artificial serialization anti-pattern).
- Treating append-only collisions as always forbidden even when a scripted merge policy exists and is intentional.
- Checklist theater without actually filling the path sets.

**Minimal acceptable wording.**

> Shared manifests (`package.json`, lockfiles, `packages/*/src/index.ts` barrels) must appear in exactly one slice’s `pathsAllowed` and every other slice’s `pathsForbidden`. Non-owners state needed lines in the handoff; the owning slice applies them at fan-in.

**Confidence:** high (0.88).

---

### R4 — ORCH-4 teardown-before-verify

**Restatement.** After merging slices onto the feature branch, remove live in-repo worktrees **before** integrated `pnpm verify`. Fix `agnostic.md`’s optional cleanup-after-verify order; prefer `git worktree remove --force` first.

**Mechanical vs cognitive.** **Mechanical** (ordering rail). Severity language (“corrupt the run” / vitest·eslint·prettier trio) is where overclaim lives.

**Verdict: adopt-narrowed** (must-recheck severity per C19; soften tool list per C20)

**Evidence.**

- **Repo:** `agnostic.md` still shows merge → `pnpm verify` → `## Cleanup (optional)`. Committed vitest has no worktree exclude (reconcile + tip `git show HEAD:vitest.config.ts`). C20: eslint/prettier already ignore `.claude/**`; only vitest is the live polluter among the “trio.”
- **Reconcile C19:** If ENV-1 relocates worktrees out of repo, “corrupt verify” softens to ordinary hygiene; if not, teardown + vitest exclude strengthen. Product decision still open.
- **Web:** Claude docs recommend cleaning worktrees and note nested `.claude/worktrees/` under the repo root; industry guides say add that path to ignore and remove after merge. Ordering before verify is project-layout contingent, not a universal LLM law.

**Failure mode if over-applied.**

- Mandating teardown as a moral absolute even when worktrees are siblings outside the repo (ENV-1) → wasted ceremony.
- Documenting eslint/prettier excludes that are already no-ops (dead instruction = bloat).
- Blocking useful post-merge inspection of a worktree before removal when verify is run from a clean path / with excludes.

**Minimal acceptable wording.**

> While worktrees live under the repo (e.g. `.claude/worktrees/`), tear them down after fan-in merge and **before** integrated `pnpm verify`. Prefer `git worktree remove --force`, then `prune`, then remove leftovers. Soften “corrupt” language once vitest excludes or out-of-repo placement lands; name **vitest**, not a lint/format trio.

Keep agnostic.md ordering fix. Do not invent new cognitive wait rituals around teardown.

**Confidence:** medium-high (0.75) on ordering under current layout; medium (0.55) on permanent “mandatory forever” severity.

---

### R5 — ORCH-6 disposition every Notes/concerns into review Disposition / `check_merge_ready`

**Restatement.** Every worker `Notes / concerns` bullet becomes a Disposition row (`fixed` / `defer`+ticket / `wontfix`+reason) so land’s existing gate carries them.

**Mechanical vs cognitive.** **Mixed.** Routing into an existing parser is mechanical; “every bullet” is a cognitive completeness ritual that can hide judgment about what is actionable.

**Verdict: adopt-narrowed**

**Evidence.**

- **Repo:** 2.66 MB `data/items/index.json` concern was raised and dropped with no ticket (`02-orch`). `check_merge_ready.py` already enforces Disposition ↔ ticket existence. Building a new fuzzy bullet-matcher is correctly rejected by ORCH.
- **Web:** Microsoft patterns: decide what context the next stage needs; do not accumulate unbounded intermediate outputs. Disposition-as-durable state matches “persist shared state externally.” Prompt-bloat catalog warns against append-only process text without eviction — routing into a table with three closed statuses is better than a new parallel “concerns log.”

**Failure mode if over-applied.**

- Treating soft observations (“maybe later compact encoding”) as land-blocking rows → Disposition spam, false `defer` tickets, or rubber-stamp `wontfix`.
- Requiring on-disk handoffs + mechanical bullet matching (ORCH correctly priced this as unsound).
- Silencing workers from writing exploratory notes because every line becomes process debt.

**Minimal acceptable wording.**

> At fan-in, every **actionable** worker concern (defect, risk, missing ticket, scope breach) gets an explicit Disposition row: `fixed`, `defer` + ticket path, or `wontfix` + reason. Prefer routing into the existing `## Disposition` / `check_merge_ready.py` gate; do not add a second concerns enforcer.

**Confidence:** medium-high (0.78). Narrow “actionable” is load-bearing.

---

### R6 — Smaller idle / no-redundant-timer clause (ORCH-5 remainder; not ScheduleWakeup docs)

**Restatement.** While waiting for workers: idle; do not arm a polling/wakeup timer as fallback for a completion push the harness already delivers; if armed, cancel when the notification lands.

**Mechanical vs cognitive.** **Cognitive** (how to wait / what thoughts to suppress). The “don’t double-subscribe to completion” half is weakly mechanical if the harness push is proven.

**Verdict: defer** (eligible per C22 only as a small clause; this review still declines to adopt into SKILL now)

**Evidence.**

- **Repo:** No `ScheduleWakeup` / wakeup guidance in skills (`02-orch`). Completion is already pushed (Agent tool notify). Retro’s cancel-timer rule targets a doc that does not exist (C22 blocked for wakeup docs).
- **Web:** Instruction-bloat / “instructions that outlive the model”: procedural micromanagement (“idle,” “don’t manufacture busywork”) freezes one session’s taste and trains skimming. Premature-parallelization literature warns *orchestrators* who skip investigation — forbidding delegator exploration while waiting can **hide** bad partitions (stance: could hide gaps). Thin primary-source support for universal “idle while waiting” as a skill law.

**Failure mode if over-applied.**

- Forbidding cheap partition-validation greps / reading one conflicting report early → worse fan-in.
- Harness-specific timer names leaking into agnostic SKILL (rot).
- One stale-timer incident → universal anti-timer theology.

**Minimal acceptable wording** *(if later forced to ship one sentence — not recommended this pass):*

> Prefer the harness’s completion notification over a redundant polling timer. Do not document ScheduleWakeup cancellation.

Do **not** add “must idle / no speculative work” as a hard rule.

**Confidence:** medium (0.7) on defer; high (0.9) that ScheduleWakeup docs stay rejected.

---

## Blocked — do not adopt

| Candidate | Why |
| --- | --- |
| ScheduleWakeup / wakeup-cancellation documentation | C22 / ORCH-5: tool/guidance absent from repo; harness session-management ≠ parallel-phase git contract |
| ORCH-1 framed as intermittent / flaky HEAD | C10: deterministic default-branch basing, 7/7 |
| Retro remedies overturned by reports | Fan-out handoff + `02-orch`: most diagnoses wrong; adopt reports not retro |
| ORCH patch claim “Agent tool exposes no base-ref option” | Contradicts current Claude Code `worktree.baseRef` docs — correct the adapter without that lie |
| ORCH-4 “vitest / eslint / prettier” exposure trio | C20: only vitest lacks exclude among those three |
| New mechanical Notes↔Disposition fuzzy gate | ORCH-6 correctly rejects as unsound |
| “Idle while waiting / no speculative work” as hard law | Cognitive ritual; can hide useful partition checks (this review defers even the small clause) |

---

## ORCH ↔ CTX Step 3 composition (C21)

**Collision.** Both want Step 3 / spawn-time text:

| Concern | Owner | Substance |
| --- | --- | --- |
| Named base SHA + worker assert + post-spawn `worktree list` | **ORCH** | Where the checkout points |
| Fan-in ownership: mechanical vs editorial; brief fields; “can a cold merger succeed?” | **CTX-3 / §C** | Who merges and what the brief must carry |

`02-orch` already warns: compatible in substance, unsafe to apply blind; renumbering Steps 5→8 also shifts anchors.

**Compose without bloating Step 3 into a novel:**

1. **Step 3 stays short — spawn mechanics only:** clean tree → isolate → path scope → **one** base-SHA assert block (ORCH). No fan-in ownership essay here.
2. **Roles / Default block (or a one-line pointer from Step 3)** carries CTX-3: decide merger vs delegator from partition **shape** (mechanical vs editorial), not context %. Keep “delegator preferred” for editorial; allow merger for mechanical. Do **not** replace with unconditional “delegator always merges” prose that erases CTX-3.
3. **Fan-in brief** (CTX) holds generated SHA **once**, path ownership, conflict policy, acceptance, claims-to-verify — ORCH’s SHA assert **reads** that single generated value (aligns with CTX-3d: never hand-type SHAs in multiple places).
4. **Teardown / verify / disposition** stay in later steps (ORCH-4/6), not stuffed into Step 3.
5. Apply ORCH and CTX patches **by hand in one interleaved edit**, after both Pass B reviews; reject any single patch that rewrites all of Step 3 alone.

---

## Summary table

| ID | Candidate | Class | Verdict | Confidence |
| --- | --- | --- | --- | --- |
| R1 | Clean tree + unconditional base-SHA assert (ORCH-1/2) | Mechanical | **adopt-narrowed** | high |
| R2 | Fix `adapters/claude.md` default-branch warning | Mechanical | **adopt-narrowed** | high |
| R3 | Single-writer manifests via pathsAllowed/Forbidden (ORCH-3) | Mechanical | **adopt** | high |
| R4 | Teardown-before-verify (ORCH-4) | Mechanical (severity soft) | **adopt-narrowed** | med-high |
| R5 | Route actionable concerns → Disposition (ORCH-6) | Mixed | **adopt-narrowed** | med-high |
| R6 | Idle / no-redundant-timer clause | Cognitive | **defer** | medium |
| — | ScheduleWakeup docs / flake framing / overturned retro remedies | — | **reject** (blocked) | high |

**Counts:** adopt **1** · adopt-narrowed **4** · defer **1** · reject/blocked **(set above)** · no unconditional full adopt of ORCH’s consolidated patch as written.

---

## Top risks of uncritical adoption

1. **Prompt bloat / Step 3 novel** — pasting ORCH’s full consolidated diff + CTX-3 + idle sermon into `SKILL.md` recreates the accretion failure the retro was meant to fix ([Prompt Bloat](https://www.agentpatternscatalog.org/patterns/prompt-bloat/)).
2. **False harness claims in durable adapters** — “no base-ref option” / “flake” / “eslint+prettier pollute” become the next RSN-style durable wrong cause.
3. **Cognitive idle rule hides bad partitions** — forbidding delegator checks while waiting trades one stale-timer incident for systematic under-validation of ownership.
4. **ORCH-4 severity without ENV-1 decision** — overselling teardown as load-bearing forever, or underselling vitest exclude, leaves two edits that argue past each other (C19).
5. **Disposition spam from “every bullet”** — turns soft notes into land theater and trains workers to under-report.

---

## Verification notes

```text
HEAD == feat/fan-out-retro tip == 1308b0a510006360ea1d057feb51d8e18bdeda6d
worktree-agent-* ×7 → 55b5a51
adapters/claude.md → still “prefer feature-branch HEAD / baseRef head when available”
adapters/agnostic.md → Cleanup (optional) after pnpm verify
git show HEAD:vitest.config.ts → no worktree exclude
(local dirty vitest/.gitignore ENV-1 edits present — not tip; not committed by this review)
```
