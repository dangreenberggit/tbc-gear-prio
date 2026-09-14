# Pass B — Critical review: CTX context-economics rules

| Item | Value |
| --- | --- |
| Worker branch | `retro/w-review-ctx` |
| Branched from | `feat/fan-out-retro` @ `1308b0a` |
| Base assert | **pass** (`git rev-parse HEAD` = `1308b0a510006360ea1d057feb51d8e18bdeda6d`) |
| Scope | Documentation only — this file is the only edit |
| Stance | **Skeptical of exploration constraints.** Prefer defer/reject when cognition is over-scripted. Mechanical bounds > cognitive micromanagement. |

**Inputs read:** `06-RECONCILE.md`, `03-ctx.md` (full), `02-orch.md` merger note on Step 3 collision, `feat-fan-out-retro.md`.

**Blocked by reconcile (not revived):** prettier/`format:check` gate for `.scratch/` reports (C18); CTX-5 indicator #5 / `Depends:` field (C16); any “context % remaining” trigger the CTX report itself already rejected.

---

## Research (mandatory)

Vendor and research guidance converges on three points that frame this review:

1. **Retrieval / progressive disclosure beats stuffing.** Anthropic: agents should “maintain lightweight identifiers … and use these references to dynamically load data into context at runtime,” assembling understanding “layer by layer” rather than pre-loading exhaustive corpora ([Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)). Cursor’s product direction is the same: “providing fewer details up front, making it easier for the agent to pull relevant context on its own” — *dynamic context discovery* vs static context ([Dynamic context discovery](https://cursor.com/blog/dynamic-context-discovery)).
2. **Compaction is lossy; durable literals belong on disk.** Anthropic cookbook: compaction “aims to distill the context window … It’s lossy by design”; memory is “structured note-taking” to external storage so facts survive resets ([Context engineering: memory, compaction, and tool clearing](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)). Cursor writes long tool/terminal output to files and lets the agent `tail`/grep rather than truncating blindly ([same Cursor post](https://cursor.com/blog/dynamic-context-discovery)). OpenAI Agents cookbooks treat compaction as a *capability the harness runs* (auto or threshold), not as an agent-scheduled ritual ([Building Reliable Agents with Memory and Compaction](https://developers.openai.com/cookbook/examples/agents_sdk/building_reliable_agents_memory_compaction)).
3. **Over-instruction is itself context rot.** Anthropic’s “right altitude”: hardcoding brittle if-else logic in prompts creates fragility; the cure is “the minimal set of information that fully outlines … expected behavior,” tested by starting lean and adding only for observed failures ([same Anthropic engineering post](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)). Prompt-bloat literature: accreted rules collide, dilute attention, and constrain adaptive reasoning ([Prompt Bloat — Agent Patterns Catalog](https://www.agentpatternscatalog.org/patterns/prompt-bloat/); [Why Simpler Prompts Win](https://www.mindstudio.ai/blog/bitter-lesson-building-with-llms)). Stuffing distractors actively misleads ([DEV summary of context-rot findings](https://dev.to/lynkr/stuffing-the-context-window-is-making-your-agent-dumber-what-the-research-says-2063)).

**Implication for Pass B:** rules that *forbid exploration*, invent *unobservable thresholds*, or add *ceremony that costs a map turn to save a map turn* fight the grain of strong models and of the vendors’ own agent designs. Rules that *bound scaling tool output* or *put irreversible literals on disk* align with that grain.

---

## Rules that would hurt a strong explorer most (call-out)

Adopted blindly, these sabotage map-then-seek more than they save tokens:

| Rank | Candidate | Why it hurts |
| --- | --- | --- |
| 1 | **CTX-1** (“explore only enough to partition”) | Forbids the reads that catch ownership collisions, wrong base assumptions, and “I thought that was out of scope” surprises. The report’s own caveat (partition needs overlap knowledge; `package.json` conflict was under-exploration) is the failure mode. Strong models already prefer JIT retrieval; a hard stop trains *under*-map. |
| 2 | **Operational B / CTX-6** as a hard “Never `Read` >30 kB without header map” | Invents a byte threshold the agent does not observe, and burns a mandatory grep+sed ceremony even when a targeted `Read` of a known section is cheaper. Turns a *good habit* into a *universal law*. |
| 3 | **Operational A / CTX-5** (“>3 unchecked gate boxes → not a session”) | Session-specific arithmetic (Phase 1’s 9 boxes, zero closed) promoted to law. Wrong denominator for work that correctly ships enablers. Forces handoff ceremony before the model has explored whether the gate is even the right unit. |
| 4 | **CTX-3 fan-in brief checklist at spawn** (acceptance criteria + claim table + idle rules bundled) | Correct *ideas*, but as a mandatory multi-section artifact at every spawn it is ceremony that can go stale (CTX-3d’s own evidence) while consuming the delegator’s attention — the resource it claims to save. |

Mechanical companions (**CTX-2**, **CTX-3d**, soft **CTX-4 readiness**) are comparatively safe.

---

## Per-rule reviews

### CTX-1 — Explore only enough to partition / don’t pre-explore delegated territory

**Restatement:** Before spawning workers, the delegator should not run probes whose outputs a worker will re-derive; explore only far enough to know file ownership and collision surface; name uncertainty in the prompt instead of materializing schemas/enums/edge cases.

**Mechanical vs cognitive:** **Cognitive.** A judgment call about “enough,” “would be re-derived,” and “partition vs design.”

**Verdict: DEFER (prefer reject as a hard skill rule; soft heuristic only if kept).**

**Evidence:**
- Session evidence for the *waste* case is real (db.json probes ~10k, worker did better). That supports a *tip*, not a *forbid*.
- Same report’s caveat: “Taken too literally the rule under-explores”; the one merge conflict was an overlap failure.
- Anthropic explicitly endorses autonomous navigation / progressive disclosure; Cursor reduces *static* upfront context so agents can *pull* more. A rule that forbids reading fights that design.
- Reconcile lists CTX-1 as unchanged/eligible — Pass B may still refuse on harm grounds.

**Failure mode if over-applied:** Missed path overlap; wrong slice boundaries; workers rediscover collisions the delegator could have cheaply mapped; “I didn’t explore because the rule said not to” becomes an excuse for partition errors. For a strong model that explores well, this is the highest-damage adoption.

**Minimal wording (if any):** Soft tip only, never a hard stop:

> Prefer not to materialize facts a worker’s acceptance criteria already require them to derive. Partition still needs enough path/ownership mapping to name collisions — when unsure, map more, not less.

**Confidence:** high.

---

### CTX-2 — Bound scaling command output

**Restatement:** Commands whose output grows with repo size (`git diff`, verify logs, `find`, etc.) should get a bound (`--stat`, `head`/`tail`, `wc`, exit code) before a full dump.

**Mechanical vs cognitive:** **Mechanical.** Observable, cheap, no introspection.

**Verdict: ADOPT (narrow).**

**Evidence:**
- Aligns with Cursor (long shell → file + `tail`) and Anthropic (Claude Code `head`/`tail` over large data).
- Report’s own calibration: ~4–6k recovered — small vs 200k, but near-zero downside.
- “`git diff --stat` / `--quiet` before printing a diff” is especially high signal (clarity, not just tokens).

**Failure mode if over-applied:** Truncating *before* knowing whether the tail contains the failure (false “green”); agents that never `Read` the rest of a log file after `tail`. Mitigate by: bound first, expand on signal.

**Minimal wording:**

> Prefer bounded views of scaling output (`--stat`, `tail`, exit code) before dumping full logs or diffs. Expand only when the bound shows a problem.

**Confidence:** high.

---

### CTX-3 — Fan-in ownership by partition shape, not context %

**Restatement:** At partition time, decide mechanical vs editorial merge: if someone who never saw the worker prompts can merge correctly → mechanical (fresh merger OK); else editorial (delegator merges). Reject “> ~40% context remaining” as a trigger.

**Mechanical vs cognitive:** **Mixed.** The *rejection of context %* is mechanical (agents cannot observe %). The *mechanical vs editorial* test is cognitive but decidable from the partition plan.

**Verdict: ADOPT the anti-% clause; ADOPT-SOFT the shape test; RECHECK interleave with ORCH Step 3 (reconcile C21).**

**Evidence:**
- CTX report correctly kills the unexecutable % threshold — same defect as `SKILL.md` “context is full.”
- Shape test is better than %; still judgmental (“can a cold merger succeed?”). Default staying with delegator for editorial work matches ORCH’s “Delegator (preferred).”
- `02-orch` merger note: Step 3 collision — ORCH edits base SHA; CTX edits who merges. Compatible if interleaved by hand (C21).
- Completeness-as-delegator-only-function is a stronger argument than “context was load-bearing three times” (report already inverted the `package.json` exhibit).

**Failure mode if over-applied:** Labeling almost everything “editorial” → never use merger; or labeling report-only fan-outs “mechanical” and skipping cross-report reconciliation (exactly what this retro needed and delayed). Mis-applied shape test recreates the missing arbitrator the CTX report itself flagged.

**Minimal wording:**

> Do not use context-% remaining to choose fan-in owner (agents cannot reliably read it). Prefer: mechanical merge (disjoint paths, no cross-claim synthesis) → merger OK; editorial (interacting slices / claim checks / reconciliation) → delegator. When unsure, keep the delegator.

**Confidence:** high on anti-%; medium on shape test as shared-doc law.

---

### CTX-3d — Never hand-type SHAs into handoffs

**Restatement:** Generate base SHAs (`git rev-parse HEAD`) into the brief in exactly one place; workers read from there. Don’t type hex by hand across multiple sections.

**Mechanical vs cognitive:** **Mechanical.**

**Verdict: ADOPT.**

**Evidence:**
- Empirically verified in-session: fan-in brief had three inconsistent bases (`d77cba5` / `968400f` / actual spawn `94debea`).
- Pairs with ORCH-1 unconditional base assert (reconcile Strengthened).
- Cheap; prevents a class of silent wrong-base work.

**Failure mode if over-applied:** Almost none. Extreme form (“never mention a SHA in prose”) would block useful discussion of historical commits — keep the rule scoped to *handoff/brief fields that workers assert against*.

**Minimal wording:**

> Base SHAs in fan-in briefs and worker prompts must be machine-generated into one canonical field (`git rev-parse`), not typed into multiple prose locations.

**Confidence:** high.

---

### CTX-4 — Compaction readiness / keep literals on disk

**Restatement:** Agents generally cannot schedule compaction; keep SHAs, paths, claim-check commands, and exact worker concerns on disk continuously so compaction/session death is non-destructive. Prefer readiness over “compact instead of merger.” Idling while waiting is OK.

**Mechanical vs cognitive:** **Mostly mechanical** (write literals to disk); “prefer compaction over merger” is cognitive/organisational and already soft in `SKILL.md`.

**Verdict: ADOPT the readiness invariant; DEFER “compaction over cold merger” as doctrine.**

**Evidence:**
- Matches Anthropic memory vs compaction split and Cursor history-as-files after summarization.
- OpenAI treats compaction as harness capability — reinforcing “you cannot schedule it.”
- Handoff addendum’s cutoff experiment independently supports durable-on-disk (commit/write before death).
- Full CTX-4 sequencing (“then request compaction”) is still not agent-executable in many harnesses.

**Failure mode if over-applied:** Obsessive note-writing that burns more context than it saves; premature “summarize everything to disk” that anchors wrong conclusions (addendum already retracted “incremental materialization” for that reason). Keep the bar at *irreversible literals and claim-check commands*, not full reasoning transcripts.

**Minimal wording:**

> Assume compaction or session death can wipe conversation state. Keep irreversible literals (SHAs, branches, path ownership, claim-check commands, exact concerns) on disk as you go. Do not treat “I will compact later” as a plan.

**Confidence:** high on readiness; medium on elevating compaction over merger.

---

### Operational A / CTX-5 — Scope at pickup (>3 unchecked gate boxes)

**Restatement:** At phase pickup, count unchecked PLAN.md gate boxes for the phase; if >3, the phase is not a session — write `Session scope: <slice>` into the handoff before starting. Reject the six leading-indicator predictor and the pre-flight token formula.

**Mechanical vs cognitive:** **Mixed.** Counting boxes is mechanical; “>3 ⇒ not a session” and mandatory handoff scope line are cognitive policy from one session’s arithmetic.

**Verdict: ADOPT rejection of predictors/formula; DEFER (prefer reject) the >3 threshold and mandatory scope ceremony.**

**Evidence:**
- Report’s negative result on six indicators is strong — “predictor with no negative case.” Do not adopt those.
- Phase 1 zero-gate-progress while shipping real work is a true story — but generalizing to “>3 open boxes” is session-specific token/denominator arithmetic as universal law.
- Strong models already re-scope; forcing a handoff write *before* any exploration can mis-name the slice.
- Anthropic: start minimal, add rules for observed failures — not bake numeric session gates from one retro.

**Failure mode if over-applied:** Agents refuse useful mid-phase work because a phase has many boxes; or invent tiny artificial “Session scope” labels that fragment work; ceremony burns the first turn of every session.

**Minimal wording (if any):** Soft heuristic, no magic number:

> Before measuring a session against a phase gate, note which gate items you actually intend to close. Prefer naming a concrete slice over “finish Phase N” when the gate is large. Do not build context-burn predictors.

**Confidence:** high on rejecting predictors; medium-high on deferring the threshold.

---

### Operational B / CTX-6 — Heading map before reading >30 kB docs

**Restatement:** Never `Read` a document over ~30 kB without first `grep`ing headings and then `sed`-ing only needed ranges. Optional repo-side TOC for `PLAN.md` (out of scope here).

**Mechanical vs cognitive:** **Mixed.** Heading grep is a technique; “never / >30 kB” is an unobservable universal law.

**Verdict: ADOPT-SOFT as technique; REJECT as hard rule with byte threshold.**

**Evidence:**
- Technique is excellent and matches JIT retrieval (Anthropic/Cursor).
- Agents typically do not know byte size before reading; “~30 kB” is invented observability.
- Mandatory map-first can *cost more* than a single targeted read when the agent already knows the section (§14, etc.).
- Report’s ~12–15k savings vs original session’s wasteful chunking is real *for that session*, not proof every large read needs a prelude.

**Failure mode if over-applied:** Two-tool ceremony before every large file; agents that refuse to read `PLAN.md` ranges they already know; false confidence that a heading map substitutes for actually reading load-bearing prose (DOC-1 §5 vs §6 style errors survive a map if you never open the section).

**Minimal wording:**

> For large planning docs, prefer a heading map (`grep` headings) and ranged reads over whole-file chunking. Skip the map when you already know the target section.

**Confidence:** high.

---

### Operational C pieces already covered — fan-in brief at spawn / idle / claim table

Bundled in CTX-3’s operational §C. Treat separately for adoption hygiene:

| Sub-piece | Verdict | Note |
| --- | --- | --- |
| Write fan-in brief at last spawn | ADOPT-SOFT | Good; pair with CTX-3d freshness. |
| Per-slice acceptance + claims-with-commands | ADOPT-SOFT | High value for editorial fan-outs; don’t mandate a novel for mechanical ones. |
| Idle while waiting | ADOPT | Aligns with ORCH Step 4 idle clause; low risk. |
| Append handoffs verbatim before merge | ADOPT-SOFT | Good for cold merger; don’t require dumping huge reports into context if paths suffice. |
| Brief’s claim table = required checklist for merger | ADOPT for merger fallback | This is the right way to make cold merge work. |

**Failure mode:** Brief written early goes stale (CTX-3d); mandatory claim tables for five disjoint report files automate the easy half and skip naming a reconciler (exactly the gap that produced Pass A).

---

### CTX-7 — Audit fixed floor before in-session tactics

**Restatement:** ~20k fixed floor + ~39k governance corpus ≈ 30% of 200k before productive work; audit tool roster / skill listing / always-injected docs before optimising mid-session behaviour. Mentions pruning unused skills.

**Mechanical vs cognitive:** **Cognitive / project hygiene.** Useful framing, not an operational mid-session rule.

**Verdict: DEFER as a skill/AGENTS rule; keep as a human/project backlog item.**

**Evidence:**
- Directionally right and matches Anthropic “minimal viable tool set” and Cursor MCP dynamic loading (46.9% token cut in A/B).
- Token figures are estimates (`~3.8 chars/token`, unverified floor). Session-specific arithmetic → weak universal law.
- Putting “audit the floor” into agent loop guidance adds meta-work every session — ceremony that burns context to discuss saving context.
- Skill pruning is a repo/owner decision, not something a coding agent should re-litigate mid-feature.

**Failure mode if over-applied:** Agents spend turns enumerating skills/tools instead of working; premature deletion of skills that matter rarely; false precision about floor size.

**Minimal wording (if any — prefer none in AGENTS):** Owner note only: periodically prune unused always-loaded skills and inject less static context. Not an agent operational checklist.

**Confidence:** high on defer-from-agent-docs.

---

### CTX-0 — Attribution framing (measure before prescribe)

Not in the candidate “adopt as rule” set as a skill edit, but the report’s framing underpins rankings.

**Verdict: DEFER as shared rule; useful as retro methodology only.**

Measuring where tokens went is good analysis. Encoding “expect floor + docs to dominate” into every session is another unobservable claim that can excuse real leaks (unbounded diffs, full `db.json` dumps).

**Confidence:** medium.

---

## Explicit non-adoptions (blocked / already dead)

| Item | Disposition |
| --- | --- |
| Retro / CTX-3 “>~40% context remaining” trigger | **Reject** (CTX report already; unobservable) |
| CTX-5 six leading indicators / pre-flight token formula | **Reject** |
| `Depends:` / indicator #5 evaluability | **Blocked** (reconcile C16) |
| Prettier / `format:check` gates `.scratch/` reports | **Blocked** (reconcile C18) |
| Hard “Never Read >30kB without map” | **Reject** as law (soft technique OK) |
| Hard “>3 unchecked boxes ⇒ not a session” | **Defer/reject** as law |
| CTX-1 as hard “must not pre-explore” | **Defer/reject** as law |

---

## Verdict counts

| Verdict | Count | Items |
| --- | --- | --- |
| **ADOPT** | 3 | CTX-2 (narrow); CTX-3d; CTX-3 anti-% clause; (+ idle-while-waiting as ADOPT) |
| **ADOPT-SOFT** | 4 | CTX-3 shape test; CTX-4 readiness (not compaction doctrine); CTX-6 technique without threshold; fan-in brief / claims-with-commands for editorial merges |
| **DEFER** | 4 | CTX-1 hard form; CTX-5/Operational A threshold+ceremony; CTX-7 as agent rule; CTX-0 as shared law |
| **REJECT** | 3 | context-% trigger; CTX-5 predictors/formula; hard >30kB never-Read law |
| **RECHECK** | 1 | Interleave CTX-3 ownership prose with ORCH Step 3 base-SHA edit (C21) |

*(Idle-while-waiting counted with ADOPT; if tallying unique CTX IDs only: ADOPT 2–3, ADOPT-SOFT 3, DEFER 3, REJECT 2+.)*

**Unique candidate IDs scored:** CTX-1 · CTX-2 · CTX-3 · CTX-3d · CTX-4 · CTX-5/Op-A · CTX-6/Op-B · CTX-7 · Op-C idle/brief — **9**.

| Summary | n |
| --- | --- |
| ADOPT / ADOPT-SOFT | 5 |
| DEFER | 3 |
| REJECT | 2 (plus sub-rejects inside CTX-3/5/6) |
| RECHECK | 1 (ORCH×CTX Step 3) |

---

## Adoption priority if anything ships

1. **CTX-3d** + **CTX-2** — mechanical, high confidence, low harm.
2. **CTX-3 anti-%** + soft shape default (delegator when unsure) — interleaved with ORCH Step 3 by hand.
3. **CTX-4 readiness** (literals on disk) — one sentence; no compaction ritual.
4. Everything else — leave out of `AGENTS.md` / `SKILL.md` until a second session shows the same failure without a strong model simply exploring.

---

## Status

success

## Branch

`retro/w-review-ctx`

## Paths touched

- `.scratch/retros/reports/07-review-ctx.md` (created)
