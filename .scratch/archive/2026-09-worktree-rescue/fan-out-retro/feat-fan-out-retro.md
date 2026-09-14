# Handoff — workflow retro deep-dive (`feat/fan-out-retro`)

Status: **Pass B applied on tip — verify green; not pushed, not landed**
Harness: Cursor (Grok), Windows 11 (Pass B); earlier body Claude Code / Opus
Branch: check `git branch --show-current` (integration tip carries `retro/w-*` merges onto `feat/fan-out-retro` lineage). Count: `git rev-list --count dev..HEAD`
Date: 2026-07-27
Supersedes: nothing. Sibling to `phase-1-five-seed-spread.md` (Cursor), which is **stale** — see Loose ends.

> **Provenance — read before weighing anything below.** This file has **two authors** with
> different evidence and different blind spots. It is not one voice.
>
> | Part | Author | Evidence held | Authoritative on | Blind to |
> | --- | --- | --- | --- | --- |
> | Everything down to *"If you resume this"* | the fan-in session | read **all five** worker reports; ran the proto codegen experiment | report contents, the two live bugs, ticket 05, what to adopt | agent-termination behaviour; the two commits after its fan-in |
> | `## Addendum` onward | the session that wrote `07c188b` / `b6ed38a` | ran the `TaskStop` termination experiment; verified branch history | cutoff, rescue, resumption, the concurrency hazard | **did not read the five reports** |
>
> **Precedence when sources conflict:** worker reports **>** this handoff **>** the retro. The
> retro is unverified. Within this handoff, the author holding the *direct evidence for that
> specific claim* wins — the table above says who that is. The addendum corrects one line in
> the body (how the killed workers were recovered) and defers to the body everywhere else,
> including on priority: **the two live bugs outrank everything in the addendum.**
>
> Claims here should state their basis. Where one doesn't, treat it as unverified.
>
> *(This block was added by the addendum author after the body was written — the only edit
> made above the addendum line.)*

Status facts are deliberately not duplicated here. Read them from the repo:

```bash
git log --oneline dev..HEAD
pnpm issues:open
ls .scratch/retros/reports/
```

---

## What this branch is

Not feature work. It carries a **process retro** of the phase-1 parallel fan-out, plus five
verification reports produced by five Opus subagents (one per topic area).

- `.scratch/retros/2026-07-26-phase-1-fan-out.md` — the original retro. **First-pass, written
  from a session transcript without repo verification. Do not act on it directly.**
- `.scratch/retros/reports/00-FAN-IN.md` — partition, base SHA, claims-to-verify
- `.scratch/retros/reports/{01-env,02-orch,03-ctx,04-rsn,05-doc}.md` — the verification pass

`pnpm verify` green at fan-in (8 files / 39 tests). Nothing outside `.scratch/` was modified
by the retro work.

---

## The one thing to carry forward

Every finding in the retro was real. **Most of its diagnoses and remedies were wrong**, and two
would have caused damage if applied. Four correct observations would have produced four wrong
changes.

**Read the reports, not the retro.** Where they disagree, the reports win — they were verified
against the repo; the retro was not.

**But the reports are not safe either, and this is the sharper lesson.** `04-rsn.md`'s central
finding — the one it explicitly labelled "verified by controlled experiment, not inferred", with
byte counts and a three-row results table — **does not reproduce.** See the retraction under
*Live bugs* below. It was the most confident, most instrumented claim in the whole fan-out, and
it was wrong; it then propagated into the ticket rewrite it prescribed, and into this handoff's
own P0 ordering, where two later readers passed it along unchecked.

Note what this does to `04-rsn.md`'s own proposed GENERAL rule — *"a causal claim in a durable
artifact must cite the command that established it or carry the word hypothesis."* The report
followed that rule and still produced a false cause, because a cited command proves a command
was run, not that its output supports the conclusion drawn. **Adopt the stronger version: for a
generated artifact, the check is that regeneration reproduces the committed bytes** — one
command whose result cannot be spun. Precedence in the provenance block above should read
*repo* > reports > handoff > retro, with the reports demoted below anything re-derivable on
demand.

---

## Live bugs

### 1. ~~Committed proto corruption; CI fails on next push~~ — RETRACTED, was never a bug

**This section was wrong and has been acted on. Do not work it.** See
`.scratch/carry-forward/issues/05-proto-codegen-byte-stability.md` for the corrected account.

The claim was that `c0acbfc` committed 7 corrupt lines via CRLF contamination, and that CI's
byte-compare therefore fails. Checked directly: regenerating from the committed sources
reproduces `HEAD` **exactly** on Windows, and all 7 trailing spaces come back every time. They
are plain `protoc-gen-es` output — it renders a doc comment line as `   * ` + the source text,
and the sources contain bare `//` lines (e.g. `data/proto/api.proto:109`). Nothing is corrupted.

`04-rsn.md`'s controlled experiment does not reproduce. It reports "LF sources → byte-identical
to `c0acbfc^`"; in fact `c0acbfc^` has 0 trailing spaces where LF generation produces 6 and 1.
The mechanism cannot work as stated either — the `\r` follows the space, so stripping it leaves
the space whichever line endings the sources have. `c0acbfc^` is the state that disagrees with
the generator; its provenance is still unexplained and the ticket says so rather than guessing.

`.gitattributes` was still added (`749aa02`), on its own merits: CRLF checkouts left all 14
generated files permanently "modified" in `git status`, so `lint-staged` stashed and restored on
every commit. It does not change any committed byte.

The real open question — does the byte-compare pass on Linux? — is nobody's answered question
and is now the ticket's Done-when. **Read a CI run; do not predict one.**

### 2. `cli-sim-runner.test.ts` will break CI on the next land — FIXED (`749aa02`)

This one was real. No skip guard, `vendor/` is gitignored, and CI never fetches the binary.
Green today only because the test does not exist on `origin/dev`. Fired on the next land.
See `01-env.md` (ENV-4).

Fixed with `describe.skipIf(!existsSync(binaryPath))` — the recorded `SimRunner` adapter is what
covers the seam offline. Verified both ways: skips with `vendor/` moved aside, runs with it back.

---

## Open items

1. ~~**Rewrite ticket 05.**~~ Done (`cb5b2cd`), but **not** using the replacement text quoted in
   `04-rsn.md` — that text is itself wrong, see the retraction above. Renamed to
   `05-proto-codegen-byte-stability.md`. What remains open in it is one thing: read a real CI
   run of the proto byte-compare.
2. **Nobody has reconciled contradictions *between* reports.** Flagged by `03-ctx.md` and never
   assigned. Only the `.gitattributes` case was reconciled (in chat, not written down).
3. **Decide what to actually adopt.** Each report classifies its findings
   GENERAL / PROJECT-SPECIFIC / MIXED with proposed edit text. None applied — all five workers
   were report-only by design, so shared docs (`AGENTS.md`, `SKILL.md`, `handoff-template.md`)
   are untouched.
4. Phase 1 itself is unfinished — tickets 03/04 still open, both blocked on a `compose` stage
   that does not exist. See `05-doc.md` (DOC-2); note it found ticket 04 is **not** blocked on
   compose, contrary to the retro.

---

## Loose ends / cautions

- **Two commits post-date my fan-in** (`07c188b`, `b6ed38a`) and a second untracked handoff
  (`phase-1-compose-stage.md`) appeared. I did not author or review either — check them before
  assuming this handoff describes the tip.
- **`.scratch/handoffs/` is untracked but not gitignored.** Both sibling handoffs vanish on a
  clean checkout. Recommended lifecycle in `05-doc.md`; not implemented.
- **`phase-1-five-seed-spread.md` is stale** — says ticket 01 is open (closed). It is *accurate*
  about `stash@{0}` (the retro wrongly claimed otherwise). I did not edit it.
- **`stash@{0}` still dangles**, confirmed superseded by committed `spec.ts`. A drop was
  permission-denied earlier; drop it deliberately.
- **Do NOT create `docs/reviews/feat-fan-out-retro.md`** unless a real `pre-merge-review` has run.
  `scripts/check_merge_ready.py:55` gates `pnpm land` on that path's *existence* alone.
- `.scratch/` is in `.prettierignore` — `format:check` does not gate anything under it. Any
  instruction claiming otherwise (including in `00-FAN-IN.md`) is vacuous.
- Two of five workers were killed mid-run by an **account-wide API session limit**, both at the
  moment they began writing. Resuming via message (not respawning) recovered their work intact.

---

## If you resume this

Highest value first:

1. ~~Fix the two live bugs~~ — done. One was real and is fixed; the other did not exist.
2. ~~Rewrite ticket 05~~ — done.
3. ~~Pass A reconcile + Pass B review + adopt~~ — done on this tip. Reports:
   `06-RECONCILE.md`, `07-review-{env,orch,ctx,rsn,doc}.md`. Adoption landed in
   `AGENTS.md`, `parallel-phase` (+ mirrors), `handoff` skill, vitest/eslint ignores,
   `.gitattributes` comment, tickets' `Blocked by:`, `issues:open`, `mirrors:check`,
   `adapters/claude-code.md` rename. Deferred by design:
   global `* text=auto eol=lf`, CI wowsimcli fetch,
   ScheduleWakeup docs, idle-while-waiting hard law, CTX-1 hard explore ban.
4. Ticket 05 still needs a **real CI read** of the proto byte-compare — push gets that.
5. Then return to Phase 1 (`phase-1/five-seed-spread`).

### Parked 2026-07-27 — superseded by Pass A/B above

The two-pass sketch below was completed. Left for provenance only.

**A. Reconcile the reports against each other.** Flagged by `03-ctx.md`, never assigned; only
the `.gitattributes` case was ever reconciled, and that in chat. Produce one list of every
place two reports disagree, resolve each **against the repo** rather than by preferring the
better-argued report, and write the resolutions down somewhere durable. Budget for the list
being longer than expected — one contradiction has already been found the hard way, and it
was in the report that read as most rigorous.

**B. Review the rules, then adopt.** `02-orch.md` and `05-doc.md` each propose a consolidated
edit table for `AGENTS.md` / `parallel-phase/SKILL.md`. **Re-verify each rule's supporting
claim before adopting it** — the retraction above is the reason this is a review pass and not
a transcription pass. Apply to `.claude/` *and* `.agents/`; they are byte-identical mirrors
and nothing checks for divergence.

Do A before B: a rule derived from a claim that reconciliation is about to overturn is worse
than no rule, because it lands in a shared doc where the next reader takes it as settled.

Preconditions and state when parked:

- `pnpm verify` green, working tree clean, **not pushed, not landed**. For the commit count run
  `git rev-list --count dev..HEAD` — the two counts already written into this file (header, and
  an earlier draft of this line) were both stale within a day.
- Ticket 05 needs one thing: read a real CI run of the proto byte-compare. Pushing the branch
  gets that for free and is the cheapest way to close it.
- Still no `docs/reviews/feat-fan-out-retro.md`, deliberately — see *Loose ends*.
- The two untracked `phase-1-*.md` handoffs describe `phase-1/five-seed-spread`, not this
  branch. Commit them **there**. They survive a branch switch; they do not survive a clean
  clone.

---

## Addendum — what `07c188b` and `b6ed38a` contain

Written by the session that authored those two commits, answering the open question in
*Loose ends*. Nothing above this line was edited **except** the provenance block at the head
of the file, which was added later so a reader gets the weighting rule before the content
rather than after it.

Both commits touch **only** `.scratch/retros/cutoff-recovery-runbook.md`. No product code, no
shared docs, no reports. They are orthogonal to the fan-in and to both live bugs.

### The runbook is the tested half of the retro's cutoff material

`ENV`/`ORCH` findings about worker termination were transcript-derived guesses. The runbook
replaces them with an experiment: a Haiku agent wrote an uncommitted file, was killed with
`TaskStop`, and the result was inspected.

| Stop mode | Notification status | Worktree | Uncommitted files |
| --- | --- | --- | --- |
| Resource / API limit | `failed` | survives, still registered | intact |
| Deliberate `TaskStop` | `killed` | survives, still registered | intact |
| User interrupt | — | not tested | — |

Three consequences:

1. **Termination is unhookable.** Both stopped agents' `result` fields end **mid-sentence**.
   There is no signal handler, no flush, no last-chance write. This is why durability must be
   proactive — "commit immediately after writing" is the entire fix, not a style preference.
2. **`killed` ≠ `failed`.** Branch on it. A killed agent was stopped deliberately; a failed one
   hit a wall and probably has unfinished work.
3. **A stopped agent resumes with full context.** `SendMessage` to its ID resumes it from its
   transcript. Verified end to end: the test agent was resumed, correctly reported the file it
   had written before dying, appended to it, branched and committed, and confirmed retaining
   its original briefing.

### Correction to *"Resuming via message (not respawning) recovered their work intact"*

Accurate but incomplete, and the sequence matters. **Both mechanisms were used, in order:**

1. The two dead workers' reports were first rescued by committing them **from their
   worktrees** — `51dbce2` (01-env) and `cbc2e51` (04-rsn), both still in branch history.
2. The workers were **then resumed**, and produced genuine further work on top: `c7c2425` and
   `47c5c33` ("Add cross-worker evidence: RSN-2 is the retro's own defect").

They are **complementary, not alternatives.** Worktree rescue secures the artifact
immediately and cheaply; resumption then lets the agent finish properly, because it still
holds the reasoning behind its own work. Doing the durable rescue first and *then* resuming is
strictly better than either alone — which is what actually happened here, partly by accident.

### The recovery window is bounded — this is not in the runbook's source material

Worktrees are **auto-cleaned some time after an agent stops.** By the end of the session all
five worker directories were gone from `.claude/worktrees/`, and `git worktree prune` merely
deregistered paths already deleted. The 65KB rescue succeeded because it happened promptly,
not because the window is generous. **Treat a failure notification as time-sensitive:** inspect
and secure before anything else. Once the directory is gone, transcript salvage is the only
path left — and the parent cannot read a transcript itself (`TaskOutput` warns it will
overflow context), so that means dispatching a fresh agent to read it.

### Three retractions recorded in `07c188b`

Claims I made earlier in-session and then withdrew. Listed so they are not re-derived:

- **"Incremental materialization is the highest-value change"** — withdrawn. It treats a
  failure that did not occur (dying mid-investigation) at real cost to analysis quality
  (anchoring on committed conclusions; cross-finding judgments unavailable until the end;
  reports that open with their conclusion become unwritable). The observed failure was the
  write→commit gap, fixed by committing immediately. An append-only **evidence log** is the
  cheap insurance for the unobserved case, because it checkpoints facts without constraining
  reasoning.
- **"Cursor's Terra wall and our session limit are the same failure class"** — withdrawn, and
  this one is instructive. They are unrelated: Cursor misrepresented quota state to steer model
  selection; ours was a genuine limit. The retro's original *attribute-failures-to-the-harness*
  guidance (DOC-3) was right, and my "correction" of it is itself retracted. The error ran
  *toward* a unifying general principle, which is harder to catch than carelessness because the
  result feels like insight.
- **A prettier gate that does not exist** — `00-FAN-IN.md` instructed five workers to run
  prettier "or `format:check` fails". `.scratch/` is prettier-ignored. Already noted above.

### New hazard: two sessions, one working tree

Two commits in this session failed mid-write, the second with
`fatal: Unable to create '.git/index.lock': File exists` — another session was operating on
this repo concurrently. **Do not delete `index.lock`;** removing it during another process's
write is how an index gets corrupted. Wait, confirm your edit survived and `HEAD` is unmoved,
then retry — both times the work was intact and the retry succeeded.

`lint-staged` makes this worse than it needs to be: it stashes unstaged changes, so a lock
collision aborts mid-dance and prints *"Any lost modifications can be restored from a git
stash"*, which reads like data loss when nothing was lost. It compounds with the
`.gitattributes` bug — the 14 permanently-modified proto files mean that stash/restore runs on
every commit and has more to go wrong with. Another reason `.gitattributes` is P0.

Not covered by any of the five reports; the fan-out they analysed was one delegator with
isolated worktrees, not two peer sessions sharing a tree.

### What this session did not do

**I have not read the five reports** — only the workers' handoff summaries. Every claim above
concerns the runbook and the cutoff experiment, not the reports' contents. The two live bugs
identified above are better-evidenced than anything here and should be worked first; nothing in
the addendum competes with them for priority.
