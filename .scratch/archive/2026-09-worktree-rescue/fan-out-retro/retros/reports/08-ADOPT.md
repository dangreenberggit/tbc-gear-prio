# Pass B fan-in — conservative adopt matrix

**Date:** 2026-07-27  
**Branch:** `feat/fan-out-retro` @ after merges of `07-review-{env,orch,ctx,rsn,doc}.md`  
**Inputs:** `06-RECONCILE.md` + five Pass B reviews (Grok high; Sol walled)  
**Stance:** Prefer rails over cognition. Default **defer**. Do not apply shared-doc edits from this file alone — this is the adoption *decision* artifact; a separate apply pass must copy minimal wording and touch both `.claude/` and `.agents/` mirrors.

**Reviewers:** ENV · ORCH · CTX · RSN · DOC (see `07-review-*.md`).

---

## Cross-review collision to resolve before apply

| Topic | ORCH | CTX | Fan-in call |
| --- | --- | --- | --- |
| “Idle while waiting / no speculative work” | **Defer** (can hide useful partition checks) | Counted as **ADOPT** in one tally | **Defer.** ORCH’s failure mode matches the meta brief: do not sabotage useful exploration. Drop from adopt pack. |

ORCH×CTX Step 3 interleave (base-SHA vs fan-in ownership): both want a small Step 3 edit — **compose by hand in apply pass**; do not paste either consolidated patch whole.

---

## Adopt now (mechanical / high confidence)

Ship these first. Minimal wording lives in the cited review; do not expand.

| ID | Rule | Source review | Notes |
| --- | --- | --- | --- |
| ENV-1p | vitest `exclude` + `.gitignore` for `.claude/worktrees/` | `07-review-env` | Real verify pollution. |
| ATTR | Fix `.gitattributes` comment (false CRLF story + bad ticket filename) | `07-review-env` + reconcile C5/C23 | Factual falsehood in tree today. |
| ENV-3n | Rename `adapters/claude.md` → `claude-code.md` (both skill trees) | `07-review-env` | Instruction-channel collision; apply ORCH’s content fix to the new name. |
| ENV-6n | Deny interactive `pnpm approve-builds` (settings), not a prose wall doc | `07-review-env` | |
| ORCH-3 | Single-writer shared manifests via `pathsAllowed`/`pathsForbidden` | `07-review-orch` | |
| ORCH-1/2n | Clean tree before spawn + **unconditional** base-SHA assert | `07-review-orch` | Narrow: assert + paste SHA; don’t novelize harness internals. |
| ORCH-2a | Correct `adapters/claude-code.md` (née claude) default-branch warning | `07-review-orch` | |
| ORCH-4n | Teardown worktrees **before** integrated `pnpm verify` | `07-review-orch` | Soft on severity until ENV-1 placement product decision. |
| ORCH-6n | Route **actionable** handoff concerns → review Disposition (not every bullet) | `07-review-orch` | |
| CTX-2 | Bound scaling command output (`head`/`tail`/limits) | `07-review-ctx` | |
| CTX-3d | Never hand-type SHAs into handoffs — generate once | `07-review-ctx` | |
| CTX-3% | Do **not** use unobservable context-% as fan-in trigger | `07-review-ctx` | Anti-rule; one sentence. |
| R2 | Generated artifacts: regen → diff → must match `HEAD` (or explain which side is wrong) | `07-review-rsn` | **Strengthened**; replaces cite-command-as-sufficient. |
| R5 | No `cd` in persistent-cwd agent shells (use `working_directory` / absolute paths) | `07-review-rsn` | |
| R8 | Never assert gitignored input present; name fetch/regen command | `07-review-rsn` | |
| DOC-1n | AGENTS Testing: ports (§5) vs pure-function tests (§6) — DOC’s trim, **not** retro §5 bake-in | `07-review-doc` | |
| DOC-2n | Surface existing `Blocked by:` in `issues:open` — **no** new `Depends:` | `07-review-doc` | |
| DOC-3n | Harness attribution on headings/status lines (Rules bullet only) | `07-review-doc` | |
| LIFE-n | Track `.scratch/handoffs/`; thin status header; no-dup ticket/verify status | `07-review-doc` | Partial lifecycle only. |
| MIRROR | `diff` `.claude/` ↔ `.agents/` skill mirrors in verify (or pre-commit) | `07-review-doc` | Beats prose “remember both”. |

---

## Adopt-narrowed / soft (optional second wave)

| ID | Rule | Caveat |
| --- | --- | --- |
| ENV-5n | Permission denial: don’t silently replan / fan out without preconditions | Keep the load-bearing bit; **reject** rigid retry-once ritual and fat allow-lists (defer allow-list). |
| R1n | Causal claims in **committed or dispatched** artifacts: test or label `hypothesis`/`untested` | Surfaces only — not chat. |
| R4n | Don’t attribute diffs to environments you didn’t observe | Commit/ticket text. |
| R6n | Don’t close an investigation with a reassuring wrong mechanism | Narrow; don’t encode “boring hypothesis first” as AGENTS law (deferred). |
| CTX-3 soft | Fan-in ownership from partition shape (mechanical vs editorial); default delegator when unsure | Interleave with ORCH Step 3 by hand. |
| CTX-4 soft | Keep literals on disk (readiness), not compaction doctrine | One sentence max. |
| CTX-6 soft | Heading-map *technique* for large docs — **no** hard >30kB law | |

---

## Defer (human / product / CI)

| Item | Why |
| --- | --- |
| ENV-2 global `* text=auto eol=lf` | Path rules already landed; global still optional. |
| ENV-4 CI `fetch_wowsimcli` | skipIf landed; coverage half is a product call. |
| ENV-5 allow-list in tracked settings | Shape-sensitive; defer. |
| ENV-1 GENERAL “worktrees must live outside the repo” | Reject as law; harness may force in-repo — exclusions are the rail. |
| CTX-1 hard “must not pre-explore” | **Dangerous** — blinds partition checks. |
| CTX-5 / Op-A “>3 gate boxes” ceremony | Session arithmetic as universal law. |
| CTX-7 / CTX-0 as agent operational rules | Owner backlog, not mid-session checklist. |
| ORCH idle / no-redundant-timer | Cognitive; see collision above. |
| R7 / R10 cognitive RSN essays | Chat norms, not AGENTS. |
| Linux CI proto byte-compare | Ticket 05 Done-when; needs a real push/CI read. |
| Out-of-repo worktree support probe | Still unverified. |

---

## Reject / blocked (do not ship)

Everything in `06-RECONCILE.md` §5 Blocked, plus Pass B rejects:

- Ticket 05 CRLF / trailing-spaces-as-corruption / regen-to-purge-spaces
- Cite-the-command **as sufficient** for generated-artifact correctness
- Retro ENV-2 `-text`/`-diff` on protos
- New `Depends:` field; prettier gates on `.scratch` reports
- ScheduleWakeup docs; ORCH-1 “flake” framing
- Hard >30kB never-read law; context-% fan-in triggers; predictor formulas
- Lifecycle ceremony built on “stash actively misleads” (C14 weakened)
- Mandating out-of-repo worktrees as GENERAL law

---

## Suggested apply order (when user asks)

1. ATTR comment fix + ENV-1p excludes (stop re-teaching false causes; stop verify pollution).
2. DOC-1n + MIRROR check (high leverage, small text).
3. ORCH-1/2n + ORCH-3 + ORCH-4n + adapter rename/content (parallel-phase skill, both mirrors).
4. R2 + R8 + R5 (AGENTS or comment-policy adjacent — keep short).
5. DOC-2n / DOC-3n / LIFE-n.
6. Soft CTX sentences last, if still wanted after living with 1–5.

**Do not** paste either ORCH or CTX consolidated patch wholesale.

---

## Explicit non-goals of this file

- Did not edit `AGENTS.md`, skills, tickets, workflows, or `.gitattributes`
- Did not land or push
- Did not re-run Pass A
- Did not resolve ticket 05 via prediction
