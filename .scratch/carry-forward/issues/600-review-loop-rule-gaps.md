Status: open
Type: task
Origin: docs/reviews/feat-review-loop-fixes.md (round 1: A1, A2, A4, A5, S1-S6, P3, P4; round 2: R2-1, R2-2, R2-3)
Blocks: none
Blocked by: none

# Gaps in the new review-loop rules

## Background

Branch `feat/review-loop-fixes` rewrote the pre-merge review loop
(`.claude/skills/pre-merge-review/SKILL.md`, mirrored byte-for-byte in
`.agents/skills/pre-merge-review/SKILL.md`). Its own review found the gaps
below. The owner had three of them fixed on the branch (A3, A4's skip path,
A6, in commit `5d2fb6ce`) and asked for the rest to be filed for another
session, 2026-10-10: "do the 3 that work and file away with detail for
another session all the bungled ones or whatever".

Every item here edits an agent file. AGENTS.md § Writing for agents says to
propose such edits in chat and wait for the owner's approval before
editing; item 1 needs a ruling in any case. Apply each `.claude/skills/**`
edit to the `.agents/skills/**` copy too, and check the two copies with
`cmp`. Line numbers are at branch commit `5d2fb6ce`; match on the quoted
text, since lines move.

Short names below: "SKILL.md" is `.claude/skills/pre-merge-review/SKILL.md`.

## Items

### 1. R2-1 (silent wrong result; needs an owner ruling) — A4 is fixed only on the skip path

**Fixed 2026-10-10** on branch `fix/loud-failure-blocks`, by a different
edit from the one proposed below. Owner ruling, 2026-10-10: "this at least
should be brought up for user/ my permission on the session level, i have
to allow it and it probably must be recorded or something. but it should
probablyyyyy block a merge?" SKILL.md step 3 now says a loud failure or
visibly wrong result this branch introduced blocks the merge, and becomes a
`defer` row only with the owner's permission quoted in the row. The outcome
list after "When round 2 passes or is skipped" and the step 5 report list
such a finding as blocking. The proposed text below was not applied.

- **Where:** SKILL.md:221-225 (the outcome list after "When round 2 passes
  or is skipped") and SKILL.md:154-155 (what the round 2 agent is given).
- **What is wrong:** step 3 says a loud failure, or any other finding,
  that this branch introduced is "fixed in this branch" (SKILL.md:238-240,
  254-256). The skip rule (SKILL.md:195-198) now blocks a skip while such
  a finding has no fix commit. But when round 2 runs, it is given only
  "the findings and tickets the commits fix", so it never sees a finding
  nobody fixed. Round 2 passes, and SKILL.md:225, "every other open
  finding: a `defer` row and a ticket", defers the branch's own failure.
  `scripts/check_merge_ready.py` does not compare finding IDs with rows,
  so `pnpm merge-to-dev --check-only` passes.
- **Replace** SKILL.md:221-222

  > - a "fixed before merge" finding that is still open: stop as the "Stop"
  >   paragraph above says, and report it to the user as blocking the merge;

  **with**

  > - a finding that step 3 says is fixed in this branch (a "fixed before
  >   merge" finding, or a loud failure or other finding this branch
  >   introduced) that is still open: stop as the "Stop" paragraph above
  >   says, and report it to the user as blocking the merge;

  **and** in SKILL.md:154-155 replace "the findings and tickets the commits
  fix" with "the findings and tickets the commits fix, and every round 1
  finding that step 3 says is fixed in this branch, so that it reports one
  with no fix commit as missing".
- **Why a ruling:** on 2026-10-10 the owner approved this ticket's earlier
  item 1, whose stop named only "fixed before merge" findings. This widens
  the stop to every loud failure the branch introduced.

### 2. R2-2 (code quality; contradiction) — "never starts a round of its own"

- **Where:** SKILL.md:243-245.
- **What is wrong:** commit `5d2fb6ce` took the code-quality pass off the
  round 2 skip list (SKILL.md:194-195), so a branch whose only fixes are the
  code-quality pass now runs round 2. The kept sentence "A code-quality row
  never starts a round of its own" reads as the opposite, and an agent that
  trusts it can skip round 2, which brings back A3 (an unreviewed refactor
  merges).
- **Replace**

  > A code-quality row
  > never starts a round of its own; round 2, which checks round 1's fixes,
  > also reads the code-quality pass.

  **with**

  > A code-quality row
  > adds no round beyond round 2; round 2 reads the code-quality pass like
  > any other fix.
- **Why:** the owner's ruling (code quality never starts an extra loop)
  stays true; round 2 is the last round in any case (SKILL.md:189-190).

### 3. A1 (loud failure) — a rewrap commit stops round 2

- **Where:** SKILL.md:147-148, condition 2.
- **What is wrong:** condition 1 accepts "a commit that changes only
  whitespace or line wrapping" and the code-quality pass, but condition 2
  still requires "Every changed line outside tests, comments, docs and
  fork re-pin commits" to sit at a place a fixed finding cites. A failed
  condition stops the review (SKILL.md:129-131), so a rewrap next to a
  real fix sends a false stop to the owner.
- **Replace**

  > 2. Every changed line outside tests, comments, docs and fork re-pin commits
  >    is at a place that a fixed finding cites.

  **with**

  > 2. Every changed line outside tests, comments, docs, fork re-pin commits,
  >    whitespace-only commits and the code-quality pass is at a place that a
  >    fixed finding cites.

### 4. A2 (loud failure) — "a fresh round 1" cannot run

- **Where:** SKILL.md:185 and SKILL.md:213-214.
- **What is wrong:** a round is "one line of this file that starts with
  `Reviewed range:`" and there is no round 3. The Stop paragraph offers the
  user "a fresh round 1 for new work", but a restart adds a third line, so
  by the count it is round 3.
- **Replace** SKILL.md:185 "A round is one line of this file that starts
  with `Reviewed range:`." **with** "A round is one line of this file that
  starts with `Reviewed range:`, counted from the last
  `## Restart (<date>)` heading when there is one."
- **And replace** "or a fresh
  round 1 for new work." (SKILL.md:213-214) **with** "or a fresh round 1
  for new work, which starts below a new `## Restart (<date>)` heading."

### 5. A5 (other) — "process notes" counts as bookkeeping

- **Where:** SKILL.md:250-251 (the Bookkeeping bullet).
- **What is wrong:** bookkeeping fixes skip round 2. On a branch whose
  files are process docs (like this one), a fix to a wrong skill rule can
  be called a "process note" and skip review.
- **Replace** "**Bookkeeping** (wording in this review file or in tickets,
  process notes)" **with** "**Bookkeeping** (wording in this review file
  or in ticket text, and nothing else)".

### 6. R2-3 (bookkeeping) — condition 1 does not name NEXT and map.md

- **Where:** SKILL.md:145-146.
- **What is wrong:** filing a ticket also changes
  `.scratch/carry-forward/issues/NEXT` and `.scratch/carry-forward/map.md`
  (step 3 and `docs/agents/known-traps.md` "Before filing a ticket"), but
  condition 1 allows only "this review file or tickets its Disposition rows
  link". Read literally, every review that files a ticket fails condition 1
  and stops.
- **Replace** "a commit that changes only this review file or tickets its
  Disposition rows link." **with** "a commit that changes only this review
  file, tickets its Disposition rows link,
  `.scratch/carry-forward/issues/NEXT` and `.scratch/carry-forward/map.md`."
  Make the same change in the round 2 skip list (SKILL.md:193-194).

### 7. P3 (loud failure) — design-task returns a path, not the plan

- **Where:** `.claude/agents/design-task.md:14`.
- **What is wrong:** when the prompt names a plan file, the final message
  is now "the file's path and your recommendation". The proposal's own
  review wanted "your plan ... is your final message" kept. A caller that
  expects the plan text in the final message gets a path.
- **Options:** (a) keep the path, and make it checkable: replace "Your
  final message then gives the file's path and your recommendation." with
  "Your final message then gives the file's path, its line count and your
  recommendation; the caller reads the plan from the file." (b) restore the
  plan in the final message: replace it with "Your final message is then
  the plan, as written to the file."
- **Recommendation:** (a). The plan is on disk, and printing it twice costs
  the caller's context.

### 8. P4 (code quality) — stage-gate still says "rewrites `plan.md`"

- **Where:** `.claude/skills/stage-gate/SKILL.md:183`, `:190`, `:212`.
- **What is wrong:** each says the re-split planner "rewrites `plan.md`
  itself", next to the new rule in `stage-gate/parts.md:84-90` (targeted
  `Edit` calls in one message; one whole `Write` only when most of the file
  changes).
- **Replace** each "rewrites `plan.md` itself" **with** "changes
  `plan.md` itself (`parts.md` § When you write files here)".

### 9. S1 (code quality) — unsourced owner claim

- **Where:** SKILL.md:210-212.
- **Replace** "The owner
  ruled out a third round: this rule assumes that another round would not
  make the writing agent get it right." **with** "There is no third round
  (owner, 2026-10-10: \"Agents should do something right the first or
  second time\")."
- **Why:** AGENTS.md § Durable claims; the quote is from the owner's scope
  addition relayed to the branch on 2026-10-10.

### 10. S2 (code quality) — the round 2 skip list repeats condition 1

- **Where:** SKILL.md:192-194 and condition 1 (SKILL.md:136-146).
- **What is wrong:** the same commit kinds are listed twice and can drift
  apart (item 6 is an example).
- **Replace** the first sentence of the skip paragraph ("Skip round 2 when
  every commit ... or applies a bookkeeping fix.") **with** "Skip round 2
  when every commit since round 1's `<through-sha>` is a whitespace-only
  commit or a review-file-and-tickets commit, as condition 1 of 'Focused
  check (round 2)' defines them, or applies a bookkeeping fix."
  Do this after item 6.

### 11. S3 (code quality) — three names for one role

- **Where:** SKILL.md:86 ("the agent that dispatches the axes"), :98 ("the
  agent that dispatches the review"), :118 ("the dispatching agent"),
  :187, :198 and :245-246 ("the agent that handles this review's
  findings").
- **What is wrong:** the file never says these are one agent, so each
  agent can assume another one owns the skip decision or the code-quality
  pass.
- **Fix:** insert after the table at SKILL.md:13-18: "One agent, the
  **review lead**, runs this skill: it dispatches every reviewer, writes
  this review file, sends each fix to a fixer, and makes every decision
  below." Then replace each of the phrases listed above with "the review
  lead".

### 12. S4 (code quality) — the effort rule in three files

- **Where:** `AGENTS.md:168`, `docs/agents/model-policy.md:188-193`,
  `.claude/skills/parallel-phase/adapters/claude-code.md:13` (and its
  `.agents` mirror).
- **What is wrong:** one rule, two wordings ("unless the owner asks" in
  AGENTS.md and the adapter; "the user, CLAUDE.md or a skill" in
  model-policy).
- **Fix:** keep the full rule in model-policy only. In `AGENTS.md:168`
  replace "The Agent tool takes an `effort` argument, but leave it off the
  spawn unless the owner asks for a specific effort; spawn the agent type
  whose frontmatter sets it (model-policy § Claude Code)." with "Set
  effort through the agent type's frontmatter, not the spawn (model-policy
  § Claude Code)." In the adapter replace "The prompt cannot set it, and
  the spawn's `effort` argument stays off unless the owner asks for a
  specific effort." with "Leave the spawn's `effort` argument off
  (model-policy § Claude Code)."

### 13. S5 (code quality, judgement call) — write-once rule in two files

- **Where:** `.claude/agents/design-task.md:10-14` and
  `.claude/skills/stage-gate/parts.md:84-90`.
- **Recommendation:** close as `wontfix`. The two agents read only their
  own file, so each needs the rule; a pointer would make one of them open
  a file it otherwise never reads.

### 14. S6 (code quality) — the trial-type rules have two homes

- **Where:** `AGENTS.md:158` and `docs/agents/model-policy.md:244-247`
  (§ Trial types opening paragraph).
- **What is wrong:** AGENTS.md restates § Trial types (the `general-task`
  check is already in "Modest" item 3 and "Discrete"; `TRIAL-REJECT` in
  "Measuring"), and "run nothing on Haiku" is only in AGENTS.md.
- **Fix:** add to the end of model-policy's § Trial types opening
  paragraph: "Nothing runs on Haiku (owner, 2026-10-10: \"i really dont
  trust sonnet much, let alone haiku\")." In `AGENTS.md:158` replace
  "Spawn a trial type only for a job that model-policy § Trial types names
  for it, and run nothing on Haiku. The session sends every `modest-task`
  or `discrete-task` result to a `general-task` check before it relays or
  builds on that result; the check's prompt asks for a `TRIAL-REJECT
  <type>: <why>` line when the check rejects or corrects the result
  (model-policy § Trial types, \"Measuring\")." with "Spawn a trial type
  only as model-policy § Trial types says, and send every trial-type
  result to a `general-task` check before you relay or build on it."

## Done when

Each item is applied, or closed by the owner with a reason in this file;
both skill copies are byte-identical (`cmp`); `pnpm verify` passes; and the
branch that applies them gets its own pre-merge review.
