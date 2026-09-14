# ORCH deep-dive — orchestration findings ORCH-1 … ORCH-6

Worker **W2** of the retro fan-out. Input: [`../2026-07-26-phase-1-fan-out.md`](../2026-07-26-phase-1-fan-out.md) §ORCH,
read as a **first-pass artifact, not gospel** (per [`00-FAN-IN.md`](00-FAN-IN.md)).
Every claim below was re-checked against repo state at `94debea`.

**Report only.** No shared file was edited. All proposed edits are quoted as a single
consolidated patch in the [last section](#consolidated-patch).

---

## Summary

| ID     | Verdict                                                    | Class            | Action                                                                       |
| ------ | ---------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| ORCH-1 | **Confirmed — retro's root cause is wrong.** Re-rank P1→P0 | MIXED            | Unconditional base-SHA boilerplate; correct the Claude Code adapter           |
| ORCH-2 | **Confirmed** — real gap; retro's mechanism also imprecise  | GENERAL          | **Merge into ORCH-1's rule.** One rule, not two                              |
| ORCH-3 | **Confirmed** — transmission failure, not knowledge failure | MIXED            | Fix **structurally** (partition-table field), not with more prose             |
| ORCH-4 | **Confirmed — retro understates it.** Adapter is actively wrong | MIXED        | Reorder Steps 5–7; fix `agnostic.md` cleanup block                            |
| ORCH-5 | **Not confirmed as written** — tool does not exist here     | MIXED            | **Reject the retro's remedy.** One clause on redundant timers instead         |
| ORCH-6 | **Confirmed** — 2.66 MB tracked, no ticket filed            | MIXED            | Route into the **existing** gate. Build no new enforcement                    |

**Net process weight:** six findings collapse to **four** `SKILL.md` edits, one
`handoff-template.md` edit, and one adapter correction. ORCH-1 and ORCH-2 are the same
defect seen from two ends and share one rule. ORCH-5 loses its proposed rule entirely.

---

## ORCH-1 — Worker worktree spawned at a stale base commit

**Verdict: confirmed, and more severe than the retro says. The retro's stated root cause
is wrong.** Re-rank **P1 → P0**.

### The retro's claim

> The Agent tool's `isolation: worktree` exposed no `baseRef`; one of two worktrees was
> based off an ancestor. **Non-deterministic across two identical spawns.**

### What the repo actually shows

Every auto-created worktree branch in this repository — all seven, across both fan-out
sessions — sits at exactly one commit:

```
$ git branch --format='%(refname:short) %(objectname:short)' | grep '^worktree-agent'
worktree-agent-a02ded47de00797f7 55b5a51
worktree-agent-a274af7fc466dcb18 55b5a51
worktree-agent-a47deb168d5296ac7 55b5a51
worktree-agent-ac1ac390a421e8031 55b5a51
worktree-agent-acd223515450ab3d4 55b5a51
worktree-agent-afd5cb53f1e70ed35 55b5a51
worktree-agent-afdffa24407776219 55b5a51    ← this worker
```

And:

```
main        55b5a51
origin/main 55b5a51
```

`55b5a51` is not "an ancestor". It is **`main`**. Seven spawns, seven identical bases,
zero variance.

**Corrected root cause:** the Agent tool's `isolation: worktree` bases the worktree on the
repository's **default branch**, unconditionally — never on the delegator's current branch.
This is **deterministic and 100% reproducible**, not intermittent.

### Why the retro concluded "non-deterministic"

Its evidence was a single `git worktree list` snapshot:

```
.claude/worktrees/agent-a02ded47de00797f7  55b5a51 [worktree-agent-a02ded47de00797f7]
.claude/worktrees/agent-afd5cb53f1e70ed35  bc148e8 [phase-1/w-item-gem-index]
```

The second row was read as "this one spawned correctly." It did not. It shows a worker
that had **already self-corrected** — it is on `phase-1/w-item-gem-index`, a branch the
worker created, not on its auto-generated `worktree-agent-*` branch. That auto branch still
exists, and it is at `55b5a51` like all the others. The snapshot compared a corrected
worker against an uncorrected one and inferred flakiness from the difference.

This is precisely the failure mode RSN-1 names — *"an investigation that ends in 'strange,
anyway —' is unfinished"* — recurring **inside the retro's own diagnosis of ORCH-1.** Worth
recording: the retro is evidence for RSN-1 as well as a victim of it.

### Live reproduction in this very fan-out

This worker was spawned at `55b5a51` and corrected to `94debea` per its prompt.
`worktree-agent-a47deb168d5296ac7` was still sitting uncorrected at `55b5a51` at the time
of writing. The prompt-level assertion is the only reason four of five retro workers are on
the right base.

### Why this changes the remedy

If the fault were intermittent, a base-SHA assertion would be a *safety net* — cheap
insurance against an occasional bad spawn. It is not intermittent. **The assertion is the
only mechanism that makes `isolation: worktree` usable on a feature branch at all.**
Without it, the failure rate is 100%, silent, and produces a branch that merges cleanly
while missing every commit made since the default branch diverged.

Consequently, `worktree.baseRef: "head"` **"when available"** in `adapters/claude.md` is
actively misleading. It implies the default might be acceptable. It never is.

**Prompt-level or harness-level?** Prompt-level, unconditionally. The harness knob was not
available through the Agent tool, and a durable rule cannot be conditioned on a flag whose
presence varies by harness build. Pinning the SHA is free, works on every harness, and
degrades to a no-op when the harness happens to get it right. It should be **unconditional
boilerplate**, not a "when the base matters" judgement call — the delegator is exactly the
party who cannot tell whether it matters, because it cannot see the worker's tree.

### Classification — MIXED

- **GENERAL:** _Never infer where an automation placed your worker's base commit — name the
  SHA in the prompt, make the worker assert it before doing anything else, and check the
  bases yourself after spawning._
- **PROJECT-SPECIFIC:** the Claude Code Agent tool's default-branch behaviour, the
  `git worktree list` post-spawn check, and this repo's `main`/`dev`/feature layout that
  makes the gap large (`main` is 40+ commits behind the feature branch).

---

## ORCH-2 — Fan-out from a dirty delegator tree

**Verdict: confirmed as a real gap in `SKILL.md`. The retro's proposed fix text contains
the same mechanical error as ORCH-1.**

### Verified

`SKILL.md`'s "Do not" list says only:

> - Run parallel coding workers on one shared dirty checkout.

That addresses two writers in one checkout. It says nothing about a **clean delegator tree
being a precondition for spawning isolated workers**. Step 3 says workers branch from
"the **feature-branch HEAD**" and stops there. The gap is real.

### But the retro's fix text is wrong

> Workers branch from **HEAD**, not from your working tree — uncommitted work is invisible
> to them.

In this harness they do not branch from HEAD either — they branch from `main` (ORCH-1). A
rule that names `HEAD` as the base teaches a false model and would leave a delegator
confident that committing is sufficient. It is necessary, not sufficient.

The portable statement that survives both harnesses: **workers branch from a *committed ref
that you must name*, never from your working tree.** That covers HEAD-based harnesses,
default-branch-based harnesses, and clone-based ones.

### Recommendation — merge with ORCH-1

These are one defect: *the base commit is not what the delegator assumes.* ORCH-1 is the
harness half, ORCH-2 the delegator half. Two separate prose rules in the same skill would be
two rules to read, two to misapply, and the second would be redundant once the first is
followed (asserting a named SHA forces you to resolve one, which forces you to notice your
tree is dirty). **One combined Step 3 block, one "Do not" amendment.** This is a deliberate
reduction in process weight.

The session's own note — *"won't see my uncommitted spec classifier work, but that's fine
since it's a disjoint file area"* — was correct **by partition luck**, and the retro's
assessment of that is fair and needs no change.

### Classification — GENERAL

> _Commit or stash before fanning out. Workers branch from a commit you name, never from
> your working tree._

Nothing about this is repo-specific.

---

## ORCH-3 — Single-writer rule for `package.json` existed and was dropped

**Verdict: confirmed, verbatim, structurally.** Worth fixing — but **not with the remedy the
retro proposes.**

### Verified

The inherited handoff says, at `.scratch/handoffs/phase-1-five-seed-spread.md:109`:

> `package.json` ownership: give to **protos** worker only; item-gem handoff can suggest
> `pnpm` aliases.

And both worker branches modified it from the common base `bc148e8`:

```
$ git diff --stat bc148e8 phase-1/w-protos          -- package.json
 package.json | 11 +++++++++++
$ git diff --stat bc148e8 phase-1/w-item-gem-index  -- package.json
 package.json |  1 +
```

Two append-only writers to the same manifest region. The conflict was **structurally
guaranteed** at partition time, before either worker ran.

### Correction to the retro

The retro adds:

> Note `packages/core/src/index.ts` auto-merged only because **all three** edits were
> appends.

There were **two** writers, not three. `phase-1/w-protos` does not touch `index.ts` at all
(`git diff --stat bc148e8 phase-1/w-protos -- packages/core/src/index.ts` is empty). The
two were the item worker (+14) and the delegator's own uncommitted spec-classifier work —
which is a neat illustration of ORCH-2: the delegator was itself an unregistered writer to a
shared barrel file. The substance holds; the count does not.

### Why the retro's remedy is the weak fix

The retro proposes promoting the rule into `SKILL.md` Step 1 as prose. But **the constraint
was already written down, in correct and specific language, and was still dropped.** Adding
a second copy of a sentence in a different file does not address why the first copy failed
to transmit. It just increases the number of places a future agent must read.

**What actually failed:** the constraint lived as *prose in an inherited document* and had
**nowhere to land in the delegator's own partition artifact.** Step 1 already requires a
per-slice record — goal, `pathsAllowed` / `pathsForbidden`, acceptance, verify recipe. The
ownership fact was relevant to that record and there was no field for it, so it stayed in
the source document and evaporated during prompt authoring.

### The structural fix

Not a checklist (another thing to remember), not a new field (another thing to fill in) —
**a constraint on fields that already exist**:

> Shared manifests must appear in exactly **one** slice's `pathsAllowed` and in **every**
> other slice's `pathsForbidden`.

This works because:

1. It reuses fields Step 1 already mandates. Zero new structure.
2. It is **mechanically checkable** — an owner-set intersection over the partition table,
   not a judgement call. A delegator can verify it by looking, and so can a reviewer.
3. It converts "remember this ownership fact" into "your partition table is malformed",
   which is a much stickier failure mode.
4. It gives inherited prose a **destination**. The next delegator reading a handoff that
   says "give `package.json` to protos" now has an obvious slot to put it in.

The complementary half — what a non-owning slice does when it needs a line — belongs in the
same block: state the line verbatim in the handoff, fan-in owner applies it. That is exactly
what the inherited handoff meant by *"item-gem handoff can suggest `pnpm` aliases"*, and it
is worth making explicit because it is the non-obvious half.

### Classification — MIXED

- **GENERAL:** _Shared manifests get exactly one writing owner per fan-out, recorded in the
  partition table as a path-scope fact, not carried as prose. Non-owners state the line they
  need in their handoff; the fan-in owner applies it._
- **PROJECT-SPECIFIC:** which files qualify here — `package.json`, `pnpm-lock.yaml`,
  `packages/*/src/index.ts` barrels. A non-pnpm, non-monorepo project has a different list.

---

## ORCH-4 — Teardown undefined, and fan-in ordering was wrong

**Verdict: confirmed, and the retro understates it. The repo does not merely omit teardown
guidance — one adapter documents the failing sequence.**

### Verified

`SKILL.md` Steps 5–6 contain no teardown and no ordering constraint. True as stated.

But `adapters/agnostic.md` **does** have teardown, and there are two defects in it:

```markdown
## Merge (delegator preferred)
...
git merge --no-ff "${FEATURE}/${SLICE}" ...
pnpm verify              ← verification happens here
...
## Cleanup (optional)     ← ...and teardown is after it, and optional

git worktree remove "../$(basename "$(pwd)")-${SLICE}"
```

1. **The documented order is the broken order.** Merge → `pnpm verify` → cleanup is exactly
   the sequence that produced the polluted run. The adapter is not silent on this; it is
   wrong on it.
2. **`git worktree remove` without `--force` is the documented form** — and that is
   precisely the invocation that deregisters the worktree while leaving files on disk,
   producing the `fatal: '<a>' is not a working tree` on the follow-up `--force` attempt.
   The retro's transcript shows this exact three-step failure.
3. "Cleanup **(optional)**" is wrong once worktrees live inside the repo. It is mandatory
   and it is ordered.

`adapters/claude.md`, `cursor.md`, and `codex.md` have no cleanup section at all.

### Dependency on ENV-1 — flagged, because it changes the size of this fix

The ordering constraint exists **only because worktrees are inside the repo**. W1 owns
ENV-1, whose "better long-term" recommendation is to place worktrees in a sibling directory
outside the repo. If that is adopted, teardown-before-verify stops being load-bearing and
this finding collapses to ordinary cleanup hygiene.

I still recommend landing the ordering rule now: it is correct under both layouts (a stale
worktree registration is worth pruning regardless), it is cheap, and it protects the current
layout, which is what exists today. But **if ENV-1 moves worktrees out of the repo, the
`pnpm verify` justification in this text should be softened rather than left overstating the
risk.** Noting the coupling so the merger does not land two edits that argue past each other.

### Merger-role note

Teardown and integrated verify are **fan-in duties**, and `SKILL.md` already assigns fan-in
to "Delegator (preferred) or merger". The new steps must inherit that attribution
explicitly, or a spawned merger will read Steps 6–7 as someone else's job. My patch says
"delegator or merger" on the new steps. (Boundary: *when* to hand fan-in to a merger is
W3's CTX-3 territory — I do not touch the trigger, only the duty attribution.)

### Classification — MIXED

- **GENERAL:** _Tear down isolated workspaces before running the integrated verification;
  an isolated workspace that lives inside the repo is visible to every path-walking tool._
- **PROJECT-SPECIFIC:** `--force` first, `git worktree prune`, the trailing `rm -rf`, and the
  reason for it — Windows + pnpm leave `node_modules` behind after removal — plus the
  `.claude/worktrees/` path and the vitest/eslint/prettier trio.

---

## ORCH-5 — Stale `ScheduleWakeup` fired after its condition resolved

**Verdict: not confirmed as written. Reject the retro's remedy; a smaller and better one
exists.**

### What I could and could not verify

- **No `ScheduleWakeup` tool exists in this worker's roster.** The scheduling surface is
  `Monitor` + `TaskStop` and `mcp__scheduled-tasks__{create,update,delete,list}`. None is
  named `ScheduleWakeup`; none takes a `stop: true` parameter.
- I **cannot** prove it was absent from the delegator's roster — a top-level session may
  expose tools a subagent does not. So the retro's observation may well be accurate for that
  session. I am not calling the *incident* false.
- `grep -rln "wakeup\|ScheduleWakeup" docs/ .claude/skills/` → **no matches anywhere.** The
  retro's fix says *"Add to the loop/wakeup guidance"* — **that guidance does not exist in
  this repo.** The remedy targets a document that would have to be created first.

### Why the retro's framing is the wrong fix regardless

Two reasons:

1. **Wrong home.** `ScheduleWakeup` is harness session-management. It is not a
   `parallel-phase` concept, it has no git contract, and it does not survive the adapter
   split — writing tool-specific cancellation discipline into a harness-agnostic skill is
   how skills rot.
2. **Wrong shape.** "Remember to cancel the timer" is a discipline rule, and discipline
   rules fail the same way ORCH-3 failed. The stronger move is **elimination**: the
   delegator armed a *polling fallback* for an event the harness **already pushes** — the
   Agent tool notifies on worker completion. The wakeup was redundant the moment it was
   created. A timer you never armed cannot fire stale.

### The in-scope remainder

There is a genuine orchestration lesson, and it is smaller than the retro's: `SKILL.md`
Step 4 ("Collect handoffs") says nothing about **how to wait**. One clause fixes it, and it
folds in the retro's own observation from CTX-4 that idling while waiting was correct
behaviour (*"I'll wait for the workers rather than manufacture busywork"*) — which is
currently praised in the retro but written down nowhere.

That is worth one sentence. The cancellation half is worth a subordinate clause, not a rule
of its own.

### Classification — MIXED

- **GENERAL:** _Do not arm a polling timer as a fallback for a completion event the harness
  already delivers; if you arm one anyway, cancel it when the condition resolves._
- **PROJECT-SPECIFIC:** nothing in this repo. The tool names (`ScheduleWakeup`, `Monitor`,
  `TaskStop`) are harness-specific and deliberately **not** named in the proposed text.

---

## ORCH-6 — A worker-flagged concern was relayed and then dropped

**Verdict: confirmed. Worth fixing — but the fix costs one sentence, not a new gate.**

### Verified

```
$ wc -c data/items/index.json   → 2664458      (2.66 MB)
$ wc -l data/items/index.json   → 159328
$ git ls-files data/items/index.json → tracked
$ ls .scratch/carry-forward/issues/
01-specid-unusable.md  02-shared-slot-map.md  03-temporary-enchant-imbue.md
04-meta-activation-check.md  05-proto-codegen-cross-platform-drift.md
```

Size and line count match the worker's report exactly. **No ticket covers the index size.**
The concern was raised, relayed in the delegator's summary, and dropped without a ticket or
a written accept. Confirmed as stated.

### Hard gate or soft convention?

**Neither, as posed — route it into a hard gate that already exists.**

`scripts/check_merge_ready.py` already implements exactly the machinery ORCH-6 asks for:

- `parse_disposition()` (line 59) parses a `## Disposition` table out of
  `docs/reviews/<branch>.md`.
- Each row must be `fixed`, `defer`, or `wontfix`.
- A `defer` row **must** link a ticket path; the script resolves it, checks the file
  **exists**, and reads its `Status` (line 168–179).
- Missing table, missing ticket path, or missing ticket file → land refused.

And `SKILL.md` Step 6 already routes fan-in through `pre-merge-review`. So the entire
enforcement path is built and wired. The **only** missing link is a sentence saying that
worker concerns are inputs to that table. One sentence buys a fully-enforced gate.

### Why not build new enforcement

I priced it, since the question was asked directly:

- `handoff-template.md` line 3 says workers write `handoffs/<slice>.md` **optionally** — so
  **there is no reliable on-disk artifact** to check concerns against. Handoffs live in the
  final message, which the script cannot see.
- Enforcing mechanically would require: (a) mandating on-disk handoff files on every worker
  branch, (b) parsing bullets out of a free-text `## Notes / concerns` section, and (c)
  fuzzy-matching those bullets against Disposition rows.
- (c) is the killer. Bullet-to-row matching has no reliable key. It would produce false
  failures on rephrasing and false passes on any row that mentions a shared keyword — a gate
  that is both annoying and unsound.

**Recommendation: do not build it.** Route concerns into the existing table; the existing
hard gate then carries them with zero new code and zero new failure modes.

### The dropped ticket itself

The retro's **Immediate** action — file a ticket for the 2.66 MB index — is still
outstanding and is correct. It is out of my report-only scope; flagging it for the merger as
a real, unfiled action item, not merely a process lesson. Options the worker named: gitignore
and generate at build time, or compact the encoding (stats currently ship as raw index
arrays).

### Classification — MIXED

- **GENERAL:** _Every concern a worker raises gets an explicit written disposition at
  fan-in — fixed, ticketed, or accepted in writing. Nothing carries silently._
- **PROJECT-SPECIFIC:** the routing target (`pre-merge-review`'s `## Disposition` table) and
  the enforcement (`check_merge_ready.py`, `.scratch/carry-forward/issues/`).

---

## What does not earn its place

Being explicit, since "do nothing" was named a valid conclusion:

- **ORCH-5's proposed rule — dropped.** No repo-level wakeup guidance exists to amend, the
  tool is not in evidence here, and tool-specific cancellation discipline does not belong in
  a harness-agnostic skill. Replaced by one clause about not arming redundant timers, which
  is a strictly smaller and more durable claim.
- **ORCH-6's implied new gate — dropped.** Priced above; unsound to enforce mechanically.
- **ORCH-2 as a standalone rule — dropped.** Folded into ORCH-1. Two rules describing one
  wrong assumption is one rule too many.
- **A second copy of the shared-manifest rule as prose — dropped.** ORCH-3 proves prose
  copies do not transmit; the patch constrains existing fields instead.

Six findings, four edits.

---

## Consolidated patch

Apply in one pass. Three files: `SKILL.md`, `handoff-template.md`, `adapters/claude.md`.
Paths are relative to `.claude/skills/parallel-phase/`.

> **Merger note — probable textual collision.** W3 (CTX-3/CTX-4) is expected to propose its
> own additions to Step 3 (fan-in ownership decided at spawn time) and to the merger-brief
> contents. My Step 3 edit is about the **base commit**; W3's is about **who merges**. They
> are compatible in substance but will both land in Step 3 and must be interleaved by hand,
> not applied blind. My Step 5–8 renumbering also shifts the anchor any other report may
> reference as "Step 5".

### 1. `SKILL.md`

```diff
@@ Steps
-1. **Partition** — On `feat/<slug>` or `phase-N/<slug>`, list slices. For each: goal, `pathsAllowed` / `pathsForbidden`, acceptance, verify recipe. Minimize path overlap.
+1. **Partition** — On `feat/<slug>` or `phase-N/<slug>`, list slices. For each: goal, `pathsAllowed` / `pathsForbidden`, acceptance, verify recipe. Minimize path overlap.
+
+   **Shared manifests get exactly one owner.** `package.json`, lockfiles, and barrel files (`packages/*/src/index.ts`) must appear in exactly **one** slice's `pathsAllowed` and in **every** other slice's `pathsForbidden`. A slice that needs a line in a file it does not own states that line verbatim in its handoff, and the fan-in owner applies it. Two slices appending to one manifest is a conflict, not a merge — check the ownership sets before spawning, not after.
+
 2. **Pick adapter** — Detect the harness; load only that file under [adapters/](adapters/). Unknown harness → [adapters/agnostic.md](adapters/agnostic.md).
-3. **Spawn workers** — One isolated worktree or clone per slice, branched from the **feature-branch HEAD** (not `main`/`dev` alone). Give each worker the handoff template and its path scope.
-4. **Collect handoffs** — Each worker ends with [handoff-template.md](handoff-template.md). No sibling chat for implementation; the delegator relays upstream context via `dependsOn` when a later slice needs an earlier result.
-5. **Merge onto the feature branch** — Delegator (preferred) or merger: merge each worker branch into the feature branch with an explicit conflict policy. Run `pnpm verify` on the **integrated** tip. Per-worker green is not enough.
-6. **Review, then ask** — run `pre-merge-review`, commit the review file, then **ask** before `pnpm land`. Workers and mergers do not land to `dev`; the delegator does not land without an explicit user ask.
+3. **Spawn workers** — One isolated worktree or clone per slice. Give each worker the handoff template and its path scope.
+
+   **Your own tree must be clean first.** Workers branch from a *commit*, never from your working tree — uncommitted work is invisible to them. Commit it (preferred) or stash it before spawning.
+
+   **Name the base commit and make every worker assert it.** Do not assume the harness bases the worktree where you are standing: some base from the repo's **default branch** regardless of your current branch, silently producing a worker that is missing every commit since the branches diverged. Resolve the SHA yourself (`git rev-parse HEAD`) and paste this into every worker prompt, verbatim, always:
+
+   > **First action, before reading anything else:** run `git log -1 --format=%H`. If HEAD is not `<SHA>`, run `git checkout -b <your-branch> <SHA>` and say so in your handoff.
+
+   Then, after spawning and before you start waiting, run `git worktree list` and confirm every base SHA yourself. This costs one call and is the only check that catches a bad base before the work is done on top of it.
+4. **Collect handoffs** — Each worker ends with [handoff-template.md](handoff-template.md). No sibling chat for implementation; the delegator relays upstream context via `dependsOn` when a later slice needs an earlier result. While waiting, **idle** — do not start speculative work in the delegator, and do not arm a polling timer or wakeup as a fallback for a completion notification the harness already pushes. A redundant timer fires after its condition has resolved and costs a full turn; if you arm one anyway, cancel it the moment the notification lands.
+5. **Merge onto the feature branch** — Delegator (preferred) or merger: merge each worker branch into the feature branch with an explicit conflict policy.
+6. **Tear down worktrees — before verifying** (delegator or merger). A live worktree inside the repo is visible to vitest / eslint / prettier and will corrupt the run:
+
+   ```bash
+   git worktree list
+   git worktree remove --force <path>   # --force first: a failed plain remove
+                                        # deregisters the worktree but leaves the files
+   git worktree prune
+   rm -rf .claude/worktrees/<leftover>  # Windows + pnpm: node_modules survives removal
+   ```
+
+7. **Verify the integrated tip** (delegator or merger) — `pnpm verify`. Per-worker green is not enough.
+8. **Review, then ask** — run `pre-merge-review`, commit the review file, then **ask** before `pnpm land`. **Every `Notes / concerns` bullet from every handoff becomes a row in that review's `## Disposition` table** — `fixed`, `defer` with a ticket path, or `wontfix` with a reason. `scripts/check_merge_ready.py` already enforces that table at land time, so a concern routed there cannot silently vanish. Workers and mergers do not land to `dev`; the delegator does not land without an explicit user ask.

@@ Completion criteria
 - Every accepted slice has a handoff with `Status` and `Branch`.
+- Every worker asserted the intended base SHA (`git worktree list` checked post-spawn).
 - Feature branch contains the merged result; worker branches are optional leftovers.
-- `pnpm verify` passed on the feature-branch tip after fan-in.
+- Worktrees were torn down **before** the integrated `pnpm verify`, and that run passed on the feature-branch tip.
+- Every `Notes / concerns` bullet is dispositioned in the review's `## Disposition` table.
 - No worker merged to `dev` or `main`.

@@ Do not
-- Run parallel coding workers on one shared dirty checkout.
+- Run parallel coding workers on one shared dirty checkout, **or fan out from a dirty delegator tree** — workers branch from a commit, and your uncommitted work is not in it.
+- Trust the base commit an isolation flag gave you without asserting it.
 - Let workers `pnpm land` or merge into `dev`/`main`.
 - Skip post-merge `pnpm verify`.
+- Run the integrated `pnpm verify` while a worktree is still live inside the repo.
 - Use peer "agent teams" as the default for parallel *file edits* unless path ownership is strict and the harness isolates checkouts.
```

### 2. `handoff-template.md`

```diff
@@ template body
 ## Branch
 <worker-branch-name>

+## Base
+- spawned at `<sha>` · expected `<sha>` · corrected: yes/no
+
 ## What I did
 - <bullet per meaningful change>

@@ Rules
 - `Status: success` only if every acceptance criterion for this slice is met.
 - `Branch` is the branch that carries the commits to merge — name it exactly.
+- **Assert your base before anything else.** Run `git log -1 --format=%H`. If it is not the SHA your prompt named, `git checkout -b <your-branch> <SHA>` from the right one and record it under `Base`. Isolation flags do not reliably branch from the delegator's current branch.
+- **Do not write a file your slice does not own.** If you need a line in a shared manifest (`package.json`, a lockfile, a barrel file) that another slice owns, put the exact line under `Notes / concerns` instead — the fan-in owner applies it.
+- Anything under `Notes / concerns` will be dispositioned at fan-in as fixed, ticketed, or accepted in writing. Raise concerns there rather than acting outside your scope — but state them concretely enough to act on.
 - Do not merge, rebase onto `dev`, or run `pnpm land`.
 - If blocked, say what is missing; do not invent out-of-scope fixes.
```

### 3. `adapters/claude.md`

> **Note:** this file is *also* the subject of ENV-3 (W1), which proposes renaming it to
> `claude-code.md` because Windows' case-insensitive filesystem makes Claude Code inject it
> as a `CLAUDE.md` instruction file. **I reproduced that live in this session** — reading
> `adapters/claude.md` surfaced a system-reminder titled *"Contents of …\adapters\CLAUDE.md"*
> carrying its full text as project instructions. ENV-3 is W1's to specify; apply this
> content edit to whatever the file ends up being called.

```diff
-- Subagent: `isolation: worktree` in agent frontmatter (or equivalent Agent-tool flag). Prefer branching from the **feature-branch HEAD** (`worktree.baseRef: "head"` when available), not only the remote default branch.
+- Subagent: `isolation: worktree` in agent frontmatter (or equivalent Agent-tool flag). **The Agent tool exposes no base-ref option and bases the worktree on the repo's default branch — not on your current feature branch.** Verified here: every auto-created `worktree-agent-*` branch in this repo sits at `origin/main`, seven for seven, across two fan-out sessions. This is deterministic, not flaky. Set `worktree.baseRef: "head"` if your harness build offers it, and **regardless of that**, pin the base SHA in every worker prompt (SKILL.md Step 3) and check `git worktree list` after spawning. The prompt-level assertion is what makes worktree isolation usable on a feature branch at all.
```

Optionally, in the same file's `## Merge` section:

```diff
-Delegator merges worker branches into the feature branch with git, then `pnpm verify`. Prefer delegator merge; spawn a merger worker only if context or session limits force it.
+Delegator merges worker branches into the feature branch with git, then tears down the worktrees, then `pnpm verify` (SKILL.md Steps 5–7 — teardown precedes verify because `.claude/worktrees/` is inside the repo). Prefer delegator merge; spawn a merger worker only if context or session limits force it.
```

### 4. `adapters/agnostic.md` — ordering defect

Not part of the two files named in the brief, but this adapter documents the failing
sequence and the fix is two lines. Included for completeness; drop it if the merger wants to
keep the patch to two files.

```diff
-## Cleanup (optional)
+## Cleanup (required, before the integrated verify)
+
+Do this **after** merging every slice and **before** running `pnpm verify` on the
+integrated tip — a live worktree inside the repo is visible to test and lint tooling.

 ```bash
-git worktree remove "../$(basename "$(pwd)")-${SLICE}"
+git worktree remove --force "../$(basename "$(pwd)")-${SLICE}"   # --force first: a failed
+                                                                 # plain remove deregisters
+                                                                 # but leaves files behind
+git worktree prune
 git branch -d "${FEATURE}/${SLICE}"   # after merge
 ```
```

The `pnpm verify` line currently inside `## Merge (delegator preferred)` should move below
this section, or be annotated *"run once, after cleanup, on the fully integrated tip."*
