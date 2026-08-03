# Docs archaeology — stash vs tip (worker D)

**Branch:** `phase-1/w-salvage-docs`  
**Tip / salvage base:** `25de532f3a5001344494ed74e550d9ef3550c6cc`  
**Stash WIP tree (frozen):** `45236ef7ef3a69c40ce576e204969da8c203cfb6`  
(`refs/stash` message: *phase-1 ranking/pool WIP before raid-scoped fan-out*)  
**Stash parent / WIP base:** `9f6c49616a154de80f855e503906fcc2b38ad811`  
**Inbox copies:** `.scratch/stash-salvage/inbox-tracked/` (blob-identical to `45236ef` for these paths)  
**Date:** 2026-07-28  
**Lane:** sharp / Grok high  

## Method

1. Asserted salvage base SHA; worked in an isolated worktree (`tbc-gear-prio-wt-salvage-docs`) because the shared main checkout was being switched by sibling salvage workers.
2. Compared tip blobs at `25de532` to inbox / `45236ef` for each owned path.
3. Walked `git log` / `git show` on those paths and the frozen stash refs in `stash0-refs.txt`.
4. Applied only stash hunks that are small, tip-lacking, and justified against tip history or a re-runnable incident note. Everything else → keep tip or unresolved.

## Timeline (these paths)

| When | Commit / ref | What happened to these docs |
|------|----------------|-----------------------------|
| 2026-07-26 | `7f338d5` *Clarify Cursor Grok-high ceiling…* | Tip Cursor policy: sharp = Grok high; workhorse often same Grok family; ceiling vs wall. |
| 2026-07-27 | `698a79b` *Bail out of sibling worktrees…* | Added `AGENTS.md` § **Session focus** + `dont-be-stupid` birdy checklist pointing at it. |
| 2026-07-27 | `07a9fc6` *Import agent workflow rails from the fan-out retro branch.* | **Dropped Session focus** while importing durable-claims / seam wording / Claude Code effort medium. Tip AGENTS/model-policy since this commit match `9f6c496` / `25de532` blobs. |
| 2026-07-28 | stash base `9f6c496` | Tip docs frozen here for these paths — **no later tip commit touched them**. |
| 2026-07-28 | stash WIP `45236ef` / inbox-tracked | Uncommitted docs WIP: Composer workhorse, manager fan-out, SME pointer, Editing skills, Step 0, fit checks. **Never committed; tip never overwrote with a “better” later version — tip simply never took the WIP.** |
| 2026-07-28 | postmortem `.scratch/handoffs/pool-redesign/manager-stall-postmortem.md` | Records Sol-probe + `run_in_background` abandon; names model-policy / AGENTS / cursor adapter as the intended fix surface. |

**Harsh correction to the brief’s “tip has later commits on these files”:**  
`git log 9f6c496..c3495fb -- AGENTS.md docs/agents/model-policy.md .agents/skills/{parallel-phase,dont-be-stupid,writing-great-skills}` is **empty**. Tip after stash base did not supersede stash on these paths. The only “tip better than stash” story is older tip policy (`7f338d5` Grok-ceiling framing) that stash *revises*, not tip commits after the stash.

Also: PROCESS claimed tip AGENTS already references `sme-rank-review`. **False** at `25de532` / `c3495fb` — tip AGENTS has no `sme-rank` string. Locked decision #5 still wants the skill restored (worker C); D must land the AGENTS pointer.

---

## Per-file verdict tables

### 1. `AGENTS.md`

| Hunk | Stash-only | Tip-only | Verdict |
|------|------------|----------|---------|
| § SME rank review (pointer + audience + sharp lane) | Present in stash | Absent | **take stash hunk** — PROCESS lock #5; tip claim that AGENTS already points at the skill is false (`rg sme-rank AGENTS.md` empty at tip). |
| § Editing skills (fit / personality) | Present | Absent | **take stash hunk** — incident-backed (SME stuffed with pipeline rules, 2026-07-27); pairs with `dont-be-stupid` / `writing-great-skills` stash lines. |
| Parallel agents: Step 0 sentence | Present | Absent | **unresolved — needs owner** — large process change; not named in locked salvage decisions; tip `parallel-phase` skill also lacks Step 0. Do not land AGENTS pointer without skill Step 0 (and owner buy-in). |
| Models and walls: Composer workhorse + no Sol-probe + manager handoff | Present (rewrites tip paragraph) | Tip keeps shorter “sharp = Grok high” + Claude Code medium from `07a9fc6` / `7f338d5` | **take stash hunk** — does not weaken sharp=Grok high; revises tip workhorse from “same Grok family” (`7f338d5`) to Composer; manager rule matches manager-stall postmortem. Tip did **not** later reaffirm Grok-as-workhorse after the stash. |
| § Session focus | **Absent from stash** | **Also absent from tip** (regression) | **unresolved — needs owner** — not a stash hunk. Lost in `07a9fc6` after `698a79b`. Tip `dont-be-stupid` still points at `AGENTS.md` § Session focus (dangling). Restore text from `git show 698a79b:AGENTS.md` (section *Session focus (critical)*). |

**Applied on this branch:** SME section, Editing skills section, Models and walls stash wording. **Not applied:** Step 0 sentence; Session focus restore.

---

### 2. `docs/agents/model-policy.md`

| Hunk | Stash-only | Tip-only | Verdict |
|------|------------|----------|---------|
| Two-lanes table: Cursor workhorse = Composer slug | Present | Tip: “often the same Grok family as sharp” (`7f338d5` / `07a9fc6`) | **take stash hunk** — tip framing encourages burning Grok on mechanical workers; stash separates lanes. Postmortem + current salvage fan-out already use Composer workhorse / Grok sharp. |
| Cursor section rewrite: presume Cursor-owned models; Task defaults table; no Sol-probe; Composer≠sharp; ceiling vs wall reframe | Present | Tip: “only spawns Grok” + workhorse=Grok family + Sol refusal as ceiling | **take stash hunk** — tip’s “forced Grok after Sol request is ceiling” still true for *sharp*, but tip never forbade Sol-probing first; stash forbids the self-inflicted wall the postmortem records. |
| § Manager / multi-step fan-out (`run_in_background` anti-pattern + PROCESS.md handoff) | Present | Absent | **take stash hunk** — concrete failure 2026-07-28; postmortem names this file. |
| Claude Code effort-medium section | Same substance as tip | Same | **keep tip** (already identical in stash). |
| Closing slogan: “Composer workhorse + Grok high sharp” vs tip “Grok high ceiling” | Stash | Tip | **take stash** with the Cursor rewrite — tip slogan understates workhorse lane. |

**Applied:** full stash file (blob match to inbox / `45236ef`). Tip-only Cursor “Grok workhorse” framing intentionally discarded — superseded by stash, not by a later tip commit.

---

### 3. `.agents/skills/parallel-phase/SKILL.md` (+ `.claude` mirror)

| Hunk | Stash-only | Tip-only | Verdict |
|------|------------|----------|---------|
| Frontmatter description adds Step 0 trigger | Present | Tip description without Step 0 | **unresolved — needs owner** (with Step 0 body). |
| New Step 0 block (sharp planner → `.scratch/handoffs/…-execution-plan.md`) | Present (~20 lines) | Absent; tip still starts at Step 1 Partition | **unresolved — needs owner** — smart-looking, but changes every phase open; not locked in PROCESS; do not invent by applying alone. |
| Step 1 “from the execution plan” wording | Present | Tip: “list slices” without plan citation | **unresolved** — depends on Step 0. |
| Rest of steps / roles / do-not | Same as tip | Same | **keep tip** |

**Applied:** nothing. Tip skill left byte-identical to `25de532`.

---

### 4. `.agents/skills/parallel-phase/adapters/cursor.md` (+ `.claude` mirror)

| Hunk | Stash-only | Tip-only | Verdict |
|------|------------|----------|---------|
| New § Models (Composer workhorse / Grok sharp / no Sol open) | Present | Absent | **take stash hunk** — adapter must match model-policy after take. |
| Manager: no `run_in_background` + end turn; PROCESS.md handoff | Present | Absent | **take stash hunk** — postmortem. |
| Isolate / Orchestrate / Merge | Same | Same | **keep tip** (unchanged). |

**Applied:** full stash adapter (both mirrors).

---

### 5. `.agents/skills/dont-be-stupid/SKILL.md` (+ `.claude` mirror)

| Hunk | Stash-only | Tip-only | Verdict |
|------|------------|----------|---------|
| Checklist: stuffed wrong kind of rule into a skill → Editing skills | Present | Absent | **take stash hunk** |
| Log: 2026-07-27 SME pipeline-rules incident | Present | Absent | **take stash hunk** |
| Birdy / Session focus checklist + log | Present (same as tip) | Present | **keep tip** (already there); note dangling AGENTS § Session focus (see unresolved above). |

**Applied:** stash file (adds Editing skills rows; preserves tip birdy rows).

---

### 6. `.agents/skills/writing-great-skills/SKILL.md` (+ `.claude` mirror)

| Hunk | Stash-only | Tip-only | Verdict |
|------|------------|----------|---------|
| Pruning: before adding, check **fit** + pointer to AGENTS § Editing skills | Present (4 lines) | Tip only has relevance check | **take stash hunk** — small, pairs with Editing skills take. |
| All other sections | Same | Same | **keep tip** |

**Applied:** stash file (both mirrors).

---

## What tip did *not* do

- Tip did **not** land a competing Composer / manager policy after the stash.
- Tip did **not** restore Session focus after `07a9fc6` ate it.
- Tip did **not** grow an AGENTS `sme-rank-review` pointer (PROCESS was wrong).
- Tip `parallel-phase` remains pre–Step 0 (`07a9fc6` import era).

## Applied edits (this branch)

| Path | Action |
|------|--------|
| `AGENTS.md` | SME + Editing skills sections; Models paragraph → stash |
| `docs/agents/model-policy.md` | → stash |
| `.agents` + `.claude` `parallel-phase/adapters/cursor.md` | → stash |
| `.agents` + `.claude` `dont-be-stupid/SKILL.md` | → stash |
| `.agents` + `.claude` `writing-great-skills/SKILL.md` | → stash |
| `parallel-phase/SKILL.md` | untouched (Step 0 unresolved) |

`pnpm mirrors:check` green after edits.

## Unresolved — owner decisions

1. **Restore `AGENTS.md` § Session focus** from `698a79b` (not in stash; tip regression; `dont-be-stupid` dangling pointer).
2. **parallel-phase Step 0** (+ AGENTS one-liner + description) — take or reject as a process change; do not half-apply.
3. Fan-in: if worker C states an extra AGENTS line beyond the SME section already applied here, merge carefully (D owns AGENTS).

## Claims re-checked

| Claim | Command / evidence |
|-------|-------------------|
| Tip docs unchanged after stash base | `git log --oneline 9f6c496..c3495fb -- AGENTS.md docs/agents/model-policy.md .agents/skills/parallel-phase/ .agents/skills/dont-be-stupid/ .agents/skills/writing-great-skills/` → empty |
| Tip AGENTS lacks sme-rank | `rg sme-rank AGENTS.md` at `25de532` → no match |
| Session focus dropped by rails import | `git show 07a9fc6 -- AGENTS.md` removes `### Session focus`; `698a79b` still has it |
| Inbox = stash WIP blobs | `git hash-object` inbox files = `git rev-parse 45236ef:<path>` |
| Stash not dropped | frozen SHA in `stash0-refs.txt`; do not `git stash drop` |
| Mirrors | `pnpm mirrors:check` |
