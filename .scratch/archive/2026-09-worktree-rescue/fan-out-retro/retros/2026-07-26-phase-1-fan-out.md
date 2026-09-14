# Retro — `phase-1/five-seed-spread` parallel fan-out (2026-07-26)

**Type:** process/workflow retro. **Not** a pre-merge review.
**Deliberately NOT at `docs/reviews/phase-1-five-seed-spread.md`** — that exact path is
what `scripts/check_merge_ready.py:review_path()` checks, and `pnpm land` only tests for
the file's *existence*. Putting this there would satisfy the land gate without a real
`pre-merge-review` having run. Do not move this file into `docs/reviews/`.

**Scope of session reviewed:** picked up a Cursor handoff, closed ticket 01, fanned out
two workers (`phase-1/w-protos`, `phase-1/w-item-gem-index`), merged both, stopped before
tickets 03/04. End state: `bc148e8..119c0b7`, `pnpm verify` green (8 files / 39 tests).

---

## How to use this document

Findings are `<AREA>-<n>`, each with **Evidence → Root cause → Fix → Verify**.
`Fix` blocks are literal commands or literal text to insert. `Verify` is the check that
proves the fix landed. Work P0 → P1 → P2. Nothing here is blocked on anything else
except where `Depends:` says so.

Areas: `ENV` environment/harness · `ORCH` orchestration · `RSN` agent reasoning ·
`DOC` documentation · `CTX` context budget.

---

## Action table

| ID | P | Area | One-line | Est |
|---|---|---|---|---|
| ENV-1 | P0 | env | `.claude/worktrees/` excluded from git + vitest + eslint + prettier | 5 min |
| ENV-2 | P0 | env | Add `.gitattributes`; `core.autocrlf=true` with no attrs file | 5 min |
| RSN-2 | P0 | reasoning | Retest proto-regen drift; ticket 05 states an untested (likely wrong) cause | 20 min |
| CTX-1 | P0 | context | Delegator must not pre-explore territory it is about to delegate | doc |
| CTX-3 | P0 | context | Define a numeric trigger for handing fan-in to a fresh merger agent | doc |
| ENV-3 | P1 | env | Rename `adapters/claude.md` → `claude-code.md` (CLAUDE.md misinjection) | 2 min |
| ORCH-1 | P1 | orch | Mandate base-SHA assertion in every worker prompt | doc |
| ORCH-2 | P1 | orch | "Commit or stash before fan-out" — workers branch from HEAD, not worktree | doc |
| ORCH-3 | P1 | orch | Single-writer rule for shared manifests (`package.json`) | doc |
| ORCH-4 | P1 | orch | Teardown step + correct fan-in ordering | doc |
| DOC-1 | P1 | doc | AGENTS.md testing rule contradicts PLAN.md §5 | 5 min |
| DOC-2 | P1 | doc | Add `Depends:` to ticket template | 5 min |
| CTX-2 | P1 | context | Output hygiene rules for high-volume commands | doc |
| ENV-4 | P2 | env | `.worktreeinclude` with `vendor/` | 2 min |
| ENV-5 | P2 | env | Allow-rules for `git add` / `git commit` | 5 min |
| ENV-6 | P2 | env | Record `pnpm approve-builds` as a known interactive wall | 2 min |
| ORCH-5 | P2 | orch | Cancel pending `ScheduleWakeup` when its condition resolves | doc |
| ORCH-6 | P2 | orch | Disposition worker-flagged concerns at fan-in (2.6MB `index.json`) | 10 min |
| DOC-3 | P2 | doc | Handoff template: attribute failures to the harness | 5 min |
| DOC-4 | P2 | doc | Never assert a gitignored build input is "in the repo" | doc |

---

# ENV — environment / harness

### ENV-1 — Worktrees live inside the repo and nothing excludes them · P0

**Evidence**
- Workers were placed at `.claude/worktrees/agent-*` by `isolation: worktree`.
- Verified absent: no `worktrees` entry in `.gitignore`, `vitest.config.ts`,
  `eslint.config.js`, or `.prettierignore`.
- `pnpm verify` on the integrated tip ran **21 test files / 96 tests instead of 8 / 39**,
  executing every suite ~3× and reporting **2 false failures**
  (`cli-sim-runner.test.ts` in a worktree, missing gitignored `vendor/wowsimcli-*`).
- `git status` showed `?? .claude/worktrees/` — untracked but **not ignored**.
  `.claude/` is intentionally tracked (skills live there), so the worktree dir was
  one `git add -A` away from staging two full checkouts + ~7,600 `node_modules` files.
  Only the habit of using explicit paths in `git add` prevented this.

**Root cause** Worktree root is inside the repo and no tool config knows to skip it.

**Fix**
```bash
printf '\n# Agent worktrees (parallel-phase). Never tracked, never linted, never tested.\n.claude/worktrees/\n' >> .gitignore
```
`vitest.config.ts` → add to `test.exclude`:
```ts
exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/worktrees/**'],
```
`eslint.config.js` → add `'.claude/worktrees/**'` to `ignores`.
`.prettierignore` → add `.claude/worktrees/`.

**Verify** With a worktree present, `pnpm verify` reports 8 test files, and
`git status --short` does not list `.claude/worktrees/`.

**Better long-term** Place worktrees outside the repo entirely (sibling dir). Removes
this whole class rather than patching four tools.

---

### ENV-2 — No `.gitattributes` while `core.autocrlf=true` · P0

**Evidence**
- Verified: `.gitattributes` **ABSENT**; `git config core.autocrlf` → **true**.
- 14 generated proto files showed persistent ` M` in `git status` with **zero** content
  diff (`git diff --stat` empty). Chased and re-explained **twice** in one session.
- Every `git add` of an LF file emitted `warning: ... LF will be replaced by CRLF`,
  padding output on ~6 occasions.

**Root cause** Generator emits LF; `autocrlf=true` rewrites on checkout; with no
`.gitattributes` git treats these as dirty-but-identical forever.

**Fix**
```bash
cat > .gitattributes <<'EOF'
* text=auto eol=lf

# Generated protobuf-es output: byte-compared by CI (PLAN.md §8.1). Never
# normalize, never diff — see .scratch/carry-forward/issues/05-*.md.
packages/core/src/proto/** -text -diff
data/proto/** -text
EOF
git add --renormalize .
```

**Verify** `git status --short` is empty immediately after a clean `pnpm verify`.

**Interacts with RSN-2** — `-text` on the proto dir removes line-ending as a confound
when re-diagnosing the regen drift. Do ENV-2 **before** RSN-2.

---

### ENV-3 — `adapters/claude.md` is injected as a CLAUDE.md instruction file · P1

**Evidence**
- Directory listing confirms exactly one lowercase file: `.claude/skills/parallel-phase/adapters/claude.md`.
- Yet a system-reminder surfaced *"Contents of ...\adapters\**CLAUDE.md**"* carrying that
  file's full text, as project instructions, immediately after it was `Read`.

**Root cause** Windows filesystem is case-insensitive. Claude Code's per-directory
CLAUDE.md discovery matches `claude.md`. Result: skill documentation is injected into the
*instruction* channel, and paid for twice (once by `Read`, once by injection).

**Fix**
```bash
git mv .claude/skills/parallel-phase/adapters/claude.md \
       .claude/skills/parallel-phase/adapters/claude-code.md
git mv .agents/skills/parallel-phase/adapters/claude.md \
       .agents/skills/parallel-phase/adapters/claude-code.md 2>/dev/null || true
```
Then update the adapter table link in both `SKILL.md` copies.

**Verify** `grep -rn "adapters/claude.md" .claude .agents` returns nothing.

**Generalize** No file named `claude.md` (any case) anywhere except an intentional
CLAUDE.md. Worth a one-line note in `docs/agents/`.

---

### ENV-4 — No `.worktreeinclude`; `vendor/` is gitignored · P2

**Evidence** Verified `.worktreeinclude` **ABSENT**; `.gitignore` contains `vendor/`.
Both workers independently hit the missing `wowsimcli` binary and resolved it
*differently*: the protos worker ran `pnpm fetch:wowsimcli`; the item worker spent calls
on a `git stash` bisect to prove the 2 failures were pre-existing at `bc148e8`. Same
problem, twice, neither fix persisted.

**Fix**
```bash
printf 'vendor/\n' > .worktreeinclude
```
If the harness ignores `.worktreeinclude`, put this in the worker prompt preamble instead:
> Gitignored build inputs are absent in a fresh worktree. Run `pnpm fetch:wowsimcli` and
> `pnpm sync:wowsims` before your first `pnpm verify`; do not treat their absence as a
> pre-existing failure to reason about.

**Verify** A fresh worktree runs `pnpm verify` green with no fetch reasoning in transcript.

---

### ENV-5 — Permission classifier was non-deterministic and altered the plan · P2

**Evidence** In order: `git stash drop stash@{0}` → **denied**;
`git add <6 explicit paths>` → **denied**; later the *identical* `git add` → **allowed**.

Consequence chain (this is why it is not cosmetic):
1. Denial led to the conclusion *"likely a broader auto-mode gate on git write operations
   … I'll hold off committing"*.
2. The delegator then **fanned out with uncommitted work** (see ORCH-2). Workers branched
   from `bc148e8`, which lacked `spec.ts`.
3. The blocked `stash drop` left a dangling stash that the session had already determined
   was fully superseded — and `.scratch/handoffs/phase-1-five-seed-spread.md` still
   advertises `stash@{0}` as containing the spec classifier work. Actively misleading now.

**Root cause** Classifier verdict varied for identical command shapes; the agent inferred
a durable rule from two samples and replanned around it.

**Fix** Add project allow-rules for `Bash(git add:*)` and `Bash(git commit:*)`.
Agent-side rule: **a permission denial is a fact about one call, not a capability
model.** Re-test once before restructuring a plan around it; if genuinely blocked, say so
and stop rather than silently rerouting.

---

### ENV-6 — `pnpm approve-builds` hangs (interactive) · P2

**Evidence** Protos worker: *"`pnpm approve-builds` is interactive and hangs in this
environment; used the declarative `pnpm.onlyBuiltDependencies` config instead."*

**Fix** Record in `docs/agents/` known-walls: never invoke `pnpm approve-builds`; declare
`pnpm.onlyBuiltDependencies` in `package.json`. (Already correctly applied for
`@bufbuild/buf` — capture the *rule*, not just the instance.)

---

# ORCH — orchestration

### ORCH-1 — Worker worktree spawned at a stale base commit · P1

**Evidence** `git worktree list` immediately post-spawn:
```
.claude/worktrees/agent-a02ded47de00797f7  55b5a51 [worktree-agent-a02ded47de00797f7]
.claude/worktrees/agent-afd5cb53f1e70ed35  bc148e8 [phase-1/w-item-gem-index]
```
Protos worker handoff: *"this worktree was checked out at a stale commit (`55b5a51`, only
an ancestor of `phase-1/five-seed-spread`), not `bc148e8` as instructed."* It self-corrected.

**Root cause** The Agent tool's `isolation: worktree` exposed no `baseRef`; one of two
worktrees was based off an ancestor. Non-deterministic across two identical spawns.

**Why it was caught** Only because the prompt named the exact expected SHA and the worker
checked. Nothing else in the pipeline would have noticed — the branch would simply have
been missing upstream commits.

**Fix** Mandatory boilerplate, added to `handoff-template.md` and quoted in every prompt:
> **First action, before reading anything else:** run `git log -1 --format=%H`. If HEAD is
> not `<SHA>`, `git checkout <SHA>` and create your branch from there, and state in your
> handoff that you corrected a stale base.

Delegator-side: after spawning, run `git worktree list` and assert every base SHA.

---

### ORCH-2 — Fan-out from a dirty delegator tree · P1

**Evidence** At spawn time the delegator held uncommitted `spec.ts`, `spec.test.ts`,
`PLAN.md`, `index.ts` (blocked by ENV-5). Its own note: *"Workers spawned from `bc148e8`
… won't see my uncommitted spec classifier work, but that's fine since it's a disjoint
file area."*

**Assessment** Correct *here*, by partition luck. Had either slice imported `classifySpec`,
it would have built against a missing module and failed opaquely inside an isolated
worktree.

**Root cause** `parallel-phase/SKILL.md` says *"Do not run parallel coding workers on one
shared dirty checkout"* — which addresses shared checkouts, not the delegator's own dirty
tree feeding a worktree base.

**Fix** Add to SKILL.md Step 3:
> Before spawning, the delegator's own tree must be clean. Workers branch from **HEAD**,
> not from your working tree — uncommitted work is invisible to them. Commit it (preferred)
> or stash it, and record the base SHA in every worker prompt.

---

### ORCH-3 — Single-writer rule for `package.json` existed and was dropped · P1

**Evidence** The inherited Cursor handoff said verbatim:
> `package.json` ownership: give to **protos** worker only; item-gem handoff can suggest
> `pnpm` aliases.

The delegator read that file, then instructed the item worker: *"Add a `pnpm` script alias
in `package.json`."* Result: `CONFLICT (content): Merge conflict in package.json`.

**Assessment** Cost was ~3 calls (trivial resolution). The defect is that a *correct,
already-written* constraint was discarded during prompt authoring.

**Fix** Promote from one-off handoff prose to `SKILL.md` Step 1:
> Shared manifests (`package.json`, lockfiles, barrel files like `src/index.ts`) get
> **exactly one writing owner** per fan-out. Other slices state the line they need in
> their handoff; the delegator applies it at fan-in.

Note `packages/core/src/index.ts` auto-merged only because all three edits were appends —
same latent hazard, resolved by luck a second time.

---

### ORCH-4 — Teardown undefined, and fan-in ordering was wrong · P1

**Evidence** Removal sequence:
1. `git worktree remove <a>` → `error: failed to delete ...: Directory not empty`
2. `git worktree remove --force <a>` → `fatal: '<a>' is not a working tree`
   (call 1 had already deregistered it while leaving files behind)
3. `git worktree list` → `<a>` gone from git, directory still on disk with 7,667 files
4. manual `rm -rf`

Separately: `pnpm verify` was run on the integrated tip **before** cleanup, so the run was
polluted (ENV-1) and had to be repeated.

**Root cause** `SKILL.md` Step 5–6 has no teardown, and no ordering constraint.

**Fix** Replace Step 5's tail with explicit ordering:
> 5. Merge each worker branch into the feature branch.
> 6. **Tear down worktrees before verifying** — a live worktree inside the repo is visible
>    to vitest/eslint/prettier and will corrupt the result:
>    ```bash
>    git worktree list
>    git worktree remove --force <path>   # --force first; a failed plain remove
>                                         # deregisters but leaves files
>    git worktree prune
>    rm -rf .claude/worktrees/<leftover>  # Windows/pnpm: node_modules survives removal
>    ```
> 7. `pnpm verify` on the integrated tip. Per-worker green is not enough.

---

### ORCH-5 — Stale `ScheduleWakeup` fired after its condition resolved · P2

**Evidence** Two wakeups scheduled (1200s, then 900s) while waiting on workers. Both
workers reported via task-notification. The pending wakeup then fired anyway with a prompt
describing already-completed work, costing a full turn of re-verification and producing a
confusing user-facing message.

**Fix** `ScheduleWakeup` supports `stop: true`. Call it the moment the awaited condition
resolves. Add to the loop/wakeup guidance: *a wakeup scheduled as a fallback for a
notification must be cancelled when the notification arrives.*

---

### ORCH-6 — A worker-flagged concern was relayed and then dropped · P2

**Evidence** Item worker: *"`data/items/index.json` is 2.6MB — much larger than the 'small
and diffable' pool-file precedent PLAN.md's commit-`data/` policy was written around …
worth the delegator's awareness."* (159,328 lines committed.) The delegator repeated it in
its summary and took no action — no ticket, no explicit accept.

**Fix** Add to `SKILL.md` Step 5: every `Notes / concerns` item in a handoff must be
dispositioned at fan-in as **fixed / ticketed / accepted-in-writing**. Nothing silently
carries.

**Immediate** File a ticket for the index size (options: gitignore + generate at build,
or compact encoding — the worker noted stats ship as raw index arrays).

---

# RSN — agent reasoning

### RSN-1 — `cd` persistence spiral, and a wrong postmortem · P0 (process)

**Evidence** After `cd .../packages/core && npx vitest`, the Bash cwd persisted.
Subsequent `find`, `ls *.md`, and `git ls-tree -r HEAD --name-only` all ran from there.
`git ls-tree` is **prefix-scoped to cwd**, so it returned `packages/core`'s 20 files.

Conclusion cascade:
> "PLAN.md genuinely does not exist anywhere in this repo's history"
> → "this is a completely different repo structure"
> → "those are from a *different, unrelated* repo (also called tbc-gear-prio but different
> codebase/history)!"
> → nested-git-repo hypothesis

~10 calls to unwind. **The second-order defect is worse:** the postmortem concluded
*"`git ls-tree -r HEAD --name-only` always lists from repo root regardless of cwd"* —
which is false — and closed with *"everything actually resolved fine."* The correct
mechanism was never identified, so the trap is not learned.

**Fixes**
1. Never `cd` in Bash. Use `git -C <path> …`; run test subsets root-relative
   (`npx vitest run packages/core/test/spec.test.ts` from root — used successfully later
   in the same session).
2. Behavioural rule worth adding to `docs/agents/`: **an investigation that ends in
   "strange, anyway —" is unfinished.** Spend one more call naming the mechanism, or the
   same trap recurs. A wrong postmortem is worse than no postmortem, because it
   manufactures false confidence.

---

### RSN-2 — Untested causal claim written into a commit message and a ticket · P0

**Evidence** Commit `c0acbfc` states the proto whitespace diff was
*"versus what was committed from the worker's **Linux/WSL** run"*, and
`.scratch/carry-forward/issues/05-proto-codegen-cross-platform-drift.md` builds its entire
**Done when** on a Windows-vs-Linux hypothesis.

**Both workers ran on the same Windows machine**, in
`C:\Users\dgree\Code\lulz\tbc-gear-prio\.claude\worktrees\`. There was no Linux/WSL run.
The stated cause is very probably wrong; the diff (trailing space on blank `*` lines in
generated doc comments, `api_pb.ts` + `common_pb.ts` only) is more likely intra-platform
nondeterminism in buf's comment emission, or first-commit normalization.

**Why this is the most severe reasoning defect** It is **durable**. Unlike a transient
wrong turn, it is now in git history and a tracked ticket, where the next reader inherits
it as established fact — and ticket 05's prescribed remedy ("regenerate in CI or a
container matching CI's OS") will not fix a cause that isn't platform-related.

**Live landmine** `.github/workflows/verify.yml` runs
`pnpm proto:generate && git diff --exit-code -- packages/core/src/proto data/proto` on
`ubuntu-latest`, against bytes generated on Windows. This is plausibly **red on the next
push** and was never tested.

**Fix** (do ENV-2 first to eliminate line endings as a confound)
```bash
# same machine, same OS, twice in a row — isolates platform from nondeterminism
pnpm proto:generate && git diff --stat -- packages/core/src/proto
pnpm proto:generate && git diff --stat -- packages/core/src/proto
```
- Diff on run 2 of 2 on one machine ⇒ **nondeterministic generator**, not platform.
  Ticket 05's remedy must change to normalization (post-process strip of trailing
  whitespace in generated files) or pinning generation to CI only.
- No diff locally ⇒ platform hypothesis survives; confirm by reading a CI run before
  asserting it.

Then rewrite ticket 05's Problem section and amend/append a correcting note. **Rule:
inferred causes must be labelled `hypothesis, untested` in any durable artifact.**

---

# DOC — documentation defects causing repeated re-derivation

### DOC-1 — `AGENTS.md` testing rule contradicts `PLAN.md` §5 · P1

**AGENTS.md** *"No test is written at a seam that isn't one of those three without
agreeing it first."*

**PLAN.md §5 (~line 431)** *"Stage-level tests exist only where the logic is genuinely
intricate and independently valuable: the gem solver …, the ranking statistics, the 19→17
slot mapping …, and `applyView`. All four are pure functions over in-memory data … so they
need no adapters at all."*

**Evidence of cost** Re-derived twice in one session — once for `classifySpec`
(*"it's not testing at a seam at all, just a pure unit"*), once when writing the same
carve-out into the item worker's prompt.

**Fix** Reword AGENTS.md → Testing:
> **Adapters** are written only at the three seams (`GearSource`, `SimRunner`, `Store`) —
> that is what makes the engine run offline from fixtures. **Pure functions may be
> unit-tested directly** where the logic is intricate and independently valuable
> (PLAN.md §5). Do not invent a *new architectural seam* without agreeing it first.

---

### DOC-2 — Tickets carry no dependency field · P1

**Evidence** Tickets 03 and 04 both read as though a `compose` stage exists
(*"Normalize/compose applies weapon imbues from `temporaryEnchant` …"*). It does not —
`compose` exists only as the throwaway Phase-0 script
`scripts/compose_slamaltman_raid_sim.py`, which **deliberately drops `temporaryEnchant`**
(`scripts/compose_slamaltman_raid_sim.py:61`).

**Cost** Discovered only *after* all other work was done and the tickets were picked up
for sizing. Had the dependency been declared, `compose` could have been scoped as a
**third worker slice** in the same fan-out, plausibly finishing Phase 1 this session.

**Fix** Add to the ticket template and to the three open tickets:
```
Depends: <thing that must exist first, or "none">
```
Backfill now: `03` and `04` → `Depends: compose stage (PLAN.md §8.2) — not yet built`.
Make `pnpm issues:open` surface the column.

---

### DOC-3 — Handoff template does not attribute failures to a harness · P2

**Evidence** The inherited handoff's section B reads *"Parallel workers (failed — no
branches)"*, detailing three workers killed by a Terra usage wall. The framing generalises
a **Cursor-specific quota failure** into "parallelism failed here." The user had to
intervene: *"the handoff was from a cursor agent and we're in claude desktop code tab now."*

**Fix** `handoff-template.md`, under `Notes / concerns`:
> Attribute every failure to its scope: **harness-specific** (model pool, quota, sandbox)
> vs **repo-specific** (code, config, data). A harness-specific failure must say so
> explicitly and end with *"re-evaluate on another harness."*

---

### DOC-4 — Worker prompt asserted a gitignored input was present · P2

**Evidence** Delegator prompt: db.json is *"already in the repo, gitignored — do not read
it at runtime"* — self-contradictory, and it was **not** in the fresh worktree. The worker
refetched from the pinned SHA with sha256 verification and flagged the discrepancy rather
than fabricating, explicitly citing the user's `feedback_missing_referenced_file` memory.
(That memory is load-bearing and working — worth keeping.)

**Fix** Prompt-authoring rule: for any gitignored build input, give the **regeneration
command**, never an assertion of presence:
> `vendor/wowsims/db.json` is a gitignored build input. Obtain it with `pnpm sync:wowsims`
> (pinned by `data/wowsims.lock.json`); verify sha256 against the lockfile before use.

---

# CTX — context budget

> Session note: we hit ~200k context **without finishing Phase 1.** This section is the
> analysis of why and what to change.

### CTX-0 — Where the budget actually went (measure before prescribing)

Attribution matters, because the intuitive culprit is wrong.

**Fan-out was context-*protective*, not the cost.** The two workers consumed
**147,944** and **151,940** subagent tokens. **None** of that entered the parent — only
two ~1.2k-token handoffs did. Had the delegator done both slices inline it would have blown
the window mid-slice with nothing merged. *Isolation worked exactly as designed.*

The parent's budget went to, roughly in order:

| Consumer | Notes |
|---|---|
| Session fixed floor | system prompt + deferred-tool roster + skills listing + CLAUDE/AGENTS |
| **Pre-exploration of delegated work** (CTX-1) | ~6 large `db.json` dumps, then delegated anyway |
| RSN-1 `cd` spiral | ~10 calls of misleading output + reasoning |
| Repeated full `pnpm verify` output | ~6 runs × 30–60 lines, ANSI-escaped |
| `git show --stat` + merge output for the protos commit | 41-file list printed **twice** |
| PLAN.md read in ~5 separate chunks | plus 2 full-file greps |
| Skill/instruction re-injection | AGENTS.md ×2, `adapters/claude.md` ×2 (see ENV-3) |
| Fan-in itself | merges, conflict, teardown, re-verify, claim verification |

**Conclusion:** fan-in is a real cliff (CTX-3), but it is **second** to output hygiene and
pre-exploration. Fixing only the fan-in handoff would treat the smaller half.

---

### CTX-1 — Delegator pre-explored territory it was about to delegate · P0

**Evidence** Before writing the item-worker prompt, the delegator ran ~6 Python probes over
`db.json`: full top-level key/shape dump, item-`type` histogram with 14 sample names,
socket/`setId`/`unique` field discovery, enchant-type probing (2 of which errored on
`None` sorting and had to be re-run). It then wrote:

> *"I've done enough exploratory digging myself; the remaining detail work … is exactly
> what the worker should own end-to-end with TDD, not something I should pre-derive by hand
> in my own context."*

Correct realisation, arrived at **after** paying the cost. The worker then re-derived the
same `type` enum independently — and **better**, cross-checking two ways (item names *and*
`enchants[].type` self-describing names), which is how it caught the enchantability bug.

**Rule** The delegator explores only enough to **partition** (which files, which slices,
where they overlap) — never enough to **design** (schemas, enums, edge cases). Schema-level
detail belongs in the worker's context, and the worker will do it better because it is the
one holding the acceptance criteria.

Practical test before any exploratory call during partitioning:
> *"Will this output appear in a worker prompt as a fact, or am I about to ask a worker to
> derive it anyway?"* If the latter — **don't run it**; name the uncertainty in the prompt
> and let the worker resolve it.

The delegator's prompts already did the right thing structurally by naming the enum risk
and offering options (a)/(b). It just paid twice for the privilege.

---

### CTX-2 — Unbounded command output · P1

**Evidence** `pnpm verify` piped through `tail -100` / `tail -80` (fine) but also `tail -60`
×4 on runs whose only interesting line was pass/fail. `git show --stat` on a
22,573-insertion commit printed all 41 paths, then `git merge` printed the same 41 paths
again. Full `git diff` on generated protos printed before narrowing to `--stat`.

**Rules**
- Verification runs: `pnpm verify 2>&1 | tail -15` — you need the tail summary, not the suite list.
- Inspecting a large commit: `git show --stat --oneline <sha> | tail -5` or
  `git show --numstat <sha> | wc -l`; only expand when a specific file is in question.
- Merge output: `git merge --no-ff <branch> -m "…" | tail -5`.
- Any probe over a multi-MB data file: write to the scratchpad, read back only the summary.
  ```bash
  python probe.py > "$SCRATCH/probe.txt" && tail -20 "$SCRATCH/probe.txt"
  ```
- Never print a diff to inspect *whether* there is one — `git diff --stat` or
  `git diff --quiet; echo $?` first.

---

### CTX-3 — Fan-in is the context cliff; the merger role exists but has no trigger · P0

**Key finding:** `parallel-phase/SKILL.md` **already anticipated this exact failure** —

| Role | Job |
|---|---|
| **Merger** (optional) | Same merge job when **the delegator's context is full**, the session died, or merges are queued separately |

…and **"Default:** the delegator merges. **Fallback:** spawn a merger."

So the mechanism exists. What's missing is (a) any way to *detect* "full", (b) a *numeric
threshold*, and (c) the recognition that the decision must be made **at spawn time**, not
when you notice you're struggling — by then the context is already spent.

**Should the default flip?** *No — but the trigger must become explicit.* The skill's
stated reason for delegator-merge is real and was load-bearing in this session. Delegator
context is what produced:
- catching the `package.json` ownership collision (from the inherited handoff),
- **independently re-verifying the ring-enchant claim** against the fixture before
  accepting it — which confirmed a genuine PLAN.md §9 bug,
- noticing the protos worker's "verified idempotent" claim did not reproduce.

A cold merger would likely have accepted all three at face value. That is a real quality
cost, and it is why "always hand off fan-in" is the wrong rule.

**The reconciliation:** make the delegator's knowledge an **artifact** rather than context,
so a fresh merger inherits it. `SKILL.md` already says the merger gets *"the partition plan,
every worker handoff, path ownership, and conflict policy"* — it is missing the one that
matters most:

> **Claims requiring independent verification.** Every worker assertion that (a) contradicts
> a committed document, (b) claims a property the merger cannot see (idempotency,
> determinism, "pre-existing failure"), or (c) overturns a plan decision — listed
> explicitly, with the command that would check it.

**Proposed decision rule (add to SKILL.md Step 3):**

> **Fan-in ownership is decided at spawn time, not at fan-in.**
> Estimate at the moment the last worker is spawned — this is the quiet point, and the
> delegator only grows from here. Reserve for fan-in with N slices:
> ~10k tokens × N (merge + conflicts) + ~15k (integrated verify, teardown, claim
> verification, review write-up).
>
> - Delegator has **> ~40%** context remaining at last-spawn → **delegator merges** (default).
> - Delegator has **< ~40%**, or N ≥ 4, or the feature spans multiple PLAN.md sections →
>   **write the fan-in brief now, while context is cheap**, and hand fan-in to a fresh
>   merger agent.
> - Either way, **write the fan-in brief before waiting on workers.** It is nearly free at
>   that moment and it is the artifact that makes handoff possible at all.

The last bullet is the highest-value change here: authoring the brief early is cheap
insurance that costs almost nothing if unused.

**Model note (user's "unless using something like fable")** A larger-context or
faster model raises the threshold but does not change the shape — with a bigger window you
simply fan out wider before hitting the same cliff. Treat model choice as adjusting the
percentage, not as removing the rule.

---

### CTX-4 — Compaction as the alternative to handoff · P1

The other option raised: let the delegator compact rather than hand off.

**Compaction preserves** the narrative thread — decisions made, claims to distrust, why a
partition was chosen. That is precisely the merger's blind spot, so compaction is the
*better* fit when the delegator's judgment is load-bearing (as here).

**Compaction loses** exact literals — SHAs, file paths, the precise wording of a worker's
concern. Those must therefore be **on disk before compacting**, not in context.

**Recommended sequencing** — the two are complements, not alternatives:

1. **At last-spawn:** write `.scratch/handoffs/<branch>-fan-in.md` (partition plan, base
   SHA per worker, path ownership, conflict policy, claims-to-verify list). Cheap now.
2. **While waiting:** do not fill context with speculative work. Idling is correct — the
   session did this well (*"I'll wait for the workers rather than manufacture busywork"*).
3. **On the last worker's completion, before merging:** append each handoff verbatim to the
   fan-in file, then **compact**. Merging is mechanical and benefits from a clean window;
   the file carries the literals; the compacted summary carries the judgment.
4. **If still over budget after compaction** → spawn the merger, pointed at the fan-in file.

This keeps the default (delegator merges, quality preserved) while making the escape hatch
real instead of theoretical.

---

### CTX-5 — Anticipation heuristic

Can this be predicted before starting? Partially — enough to be useful.

**Pre-flight estimate**, at the point a phase is picked up:

```
budget_needed ≈ fixed_floor
              + (slices × ~12k)          # prompt authoring + handoff + merge
              + (docs_read × ~4k)        # PLAN.md sections, ADRs, tickets
              + (verify_runs × ~1.5k)    # with tail-limited output
              + investigation_slack      # ~15k; the unknown-unknowns line
```

**Leading indicators that you are on the 200k path** — any two of these means write the
fan-in brief and plan to compact:

1. The feature touches **≥ 3 PLAN.md sections** (this one touched §5.1, §5.2, §8.1, §8.3,
   §9, §14).
2. You have read **> 2** large documents in full or near-full.
3. An investigation has exceeded **~6 calls** without resolving (RSN-1 was ~10).
4. You are **probing a data file** you intend to hand to a worker (CTX-1).
5. **≥ 2** independent tickets turn out to be blocked on an unbuilt component (DOC-2).
6. Fan-out is planned **and** the delegator has follow-on work in the same session.

This session hit **all six**.

**Cheapest single mitigation, ranked:**
1. CTX-1 — don't pre-explore delegated territory (largest avoidable block).
2. CTX-2 — tail-limit output (pure win, no downside).
3. RSN-1 — no `cd`; end investigations with a named mechanism.
4. CTX-3/4 — write the fan-in brief at spawn; compact before merge; merger as fallback.

---

## Friction that earned its keep — do not optimise away

- **`pnpm verify` before every push.** ~15s, ran ~6×, caught nothing here — that is what a
  backstop looks like when things go right. Keep.
- **lint-staged prettier on commit.** Seconds; noisy stash/restore output; worth it.
- **Ask-before-land.** Observed correctly throughout; nothing reached `dev`. Working.
- **Base-SHA pinned in worker prompts.** The *only* thing that caught ORCH-1.
- **Independent re-verification of a worker claim.** Cost a few calls; confirmed a real
  documentation bug (PLAN.md §9's non-enchantable set is neck/**waist**/trinket, not
  neck/**finger**/trinket — the Phase-0 two-character sample never happened to include an
  enchanted ring; the 25-combatant fixture shows 14/50 finger slots enchanted). Best call
  of the session. **Promote into `SKILL.md` Step 5** — fan-in currently mandates only
  `pnpm verify`.
- **Long, scoped worker prompts with explicit out-of-scope lists.** Both workers stayed in
  scope, met acceptance criteria, and flagged the right concerns. Prompt-authoring was
  strong apart from DOC-4.
- **sha256-verified pinning of build inputs.** The item worker refetched `db.json` and
  verified the hash against the lockfile rather than trusting the prompt.

---

## Single highest-leverage fix

**ENV-1** — the worktree-exclusion gap. One missing `.gitignore` line broke the integrated
`pnpm verify`, created a near-miss for committing ~7,600 junk files, and made teardown
hazardous — inside the exact workflow the repo's own docs recommend for parallel work.

**Runner-up: CTX-1** — the delegator paying full context price for exploration it then
correctly delegated. Biggest avoidable single block of the 200k.
