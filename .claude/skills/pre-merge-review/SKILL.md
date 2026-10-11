---
name: pre-merge-review
description: Run the three-axis review (adversarial, domain, standards+spec) on a feature branch and stop after writing docs/reviews/. Use when the user wants to review a feature branch, asks to "run pre-merge review", or a feature's work looks done and needs a review before any merge ask.
---

# Pre-Merge Review

Three independent axes review the branch before it merges to `dev`; a small
change gets one reviewer covering all three (step 2, "Small-change lane"). Each
reviewer gets **fresh context** — the diff and its own brief only, no access
to this conversation. That's the point: a reviewer that remembers writing
the code stops finding the code's mistakes.

| Axis | Brief | Notes |
|---|---|---|
| Adversarial | [`.agents/reviews/adversarial.md`](../../../.agents/reviews/adversarial.md) | Correctness bugs, silent-failure modes, test theatre |
| Domain | [`.agents/reviews/domain.md`](../../../.agents/reviews/domain.md) | TBC/WCL/wowsims facts vs. `docs/stage0-findings.md` |
| Standards + Spec | the `code-review` skill | Invoked unchanged — don't duplicate its logic here |

## Process

### 1. Pin the diff

```bash
git diff dev...HEAD
git log dev..HEAD --oneline
```

Round 1 diffs `dev...HEAD` — three-dot against the merge-base, same convention
as `code-review`. Later rounds diff `<through-sha>..HEAD`, where `<through-sha>`
is the previous round's recorded `<through-sha>`. There is at most one later
round, a focused check; step 2's "Round limit" says when it runs and when the
review stops.

Why a recorded sha: fixes for a round's findings land after that round is
dispatched, so a round that guesses its own starting point leaves those fix
commits between rounds, unreviewed. Chaining from the recorded sha puts every
commit inside some round's window.

Before dispatching, record this round's `<through-sha>` on the review file's
`Reviewed range:` line — it is the next round's starting point:

```bash
git rev-parse HEAD
```

Confirm the diff is non-empty before dispatching — an empty diff means there is
nothing to review, not three empty reports.

### 2. Dispatch (review lane — slow is fine)

Reviewers are on the **review** model lane — see
[`docs/agents/model-policy.md`](../../../docs/agents/model-policy.md).

**Ceiling vs wall:** A **ceiling** is the harness having no taller model in its
review lane than the one it gave you — e.g. Cursor topping out at Grok high.
Run on the harness's review lane, note it in the dispatch line, and continue;
that is not a downgrade. A **wall** is rate/usage/quota/`429`/spawn failure, or
a swap to something *weaker* than the harness's review lane — then wait,
serialise, or hand off; do not invent a weaker model to finish. A model in the
**design** lane is not an upgrade for a review axis — it is a different kind of
model, and review axes do not run there.

Try in order:

1. **`codex exec`**, if the binary is on `PATH` — cross-vendor review-lane review.
   Pipe the brief + diff to it directly.
2. **Fresh subagents on a review-lane model** (explicit id) — Claude Code:
   `general-task` agents, `model: "opus"` (Opus at effort `high`); Codex: top tier;
   Cursor: Grok high (prefer non-fast; else the current `…-high-fast` slug);
   anywhere else: the model your harness section names for review. Prefer all
   three axes in one parallel batch when the harness is healthy.
3. **On a wall** (see above):
   - Retry once after a short wait on the **same review class**.
   - Then run axes **one at a time** (adversarial → domain → code-review),
     still on the review lane — slower wall-clock is acceptable.
   - Then **print and hand off**: each brief + `git diff <from-sha>..HEAD`
     over this round's pinned range, for a fresh session or other tool (no
     memory of writing this code).
4. **Same-session review by the authoring agent** only if the user
   explicitly opts in. Label it in the review file’s dispatch note.

Run the **adversarial** and **domain** sub-agents with the briefs above.
Invoke the **`code-review`** skill for the third axis — don't re-implement
its Standards/Spec logic here. Skip the domain axis when the diff has no
game-domain content; the agent that dispatches the axes decides, and
records the skip and its reason in the review file's dispatch note.

**Tell every axis it writes nothing**, and that it reports no finding on
this review file or on the tickets its Disposition rows link. Never ask
an axis to leave `git status --porcelain` empty. That phrasing makes a reviewer responsible for
tree state it does not own, and one duly "restored" a tree by reverting four
files of live work (ticket 261). The constraint is *you write nothing*; a dirty
tree is reported in the findings.

#### Small-change lane (round 1)

Before round 1, the agent that dispatches the review measures the branch
against its merge base:

```bash
git diff --shortstat dev...HEAD
git diff --name-only dev...HEAD
```

The branch is a small change when both hold:

- the first command reports at most 6 files changed, and its insertions
  plus deletions are at most 150;
- no path the second command lists starts with `data/`, `vendor/` or
  `packages/core/src/`, or has `.generated.` in its name.

For a small change, round 1 is one fresh reviewer on the review lane,
picked by the "Try in order" list above, in place of the separate axes.
Give it the adversarial brief, and tell it to read the `code-review` skill
and apply its Standards and Spec checks itself, spawning no subagents.
Give it the domain brief too when the diff has game-domain content; the
dispatching agent decides that and records the reason, as for the domain
axis above. Record the lane and both commands' output in the review
file's dispatch note. Every other branch gets the full axes.

#### Focused check (round 2)

Before dispatching round 2, test three conditions against
`git log -p <from-sha>..<through-sha>` (this round's `Reviewed range:` line
from step 1), the fork's
`git -C vendor/tbc-new-fork log -p <fork-from>..HEAD` (`<fork-from>` is the
end of the fork range the last round recorded), and this review file. When
all three hold, run the focused check below. When any condition fails, or
cannot be settled from those sources, do not run the three axes: stop as
"Round limit" says.
When `git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0, the
branch never moves the fork pin: skip the fork log and treat condition 3 as
holding.

1. Every commit, in both logs, is one of these:
   - a fix for findings that an earlier round in this file raised, named by
     ID in the commit message or in the ticket it names, whatever the
     finding's label;
   - the code-quality pass (step 3), with the `## Code quality` row IDs in
     its commit message;
   - a fork re-pin: it changes `data/wowsims-fork.lock.json`, and every
     other file it changes is under `data/` or `docs/`;
   - a commit that changes only whitespace or line wrapping;
   - a commit that changes only this review file or tickets its Disposition
     rows link.
2. Every changed line outside tests, comments, docs and fork re-pin commits
   is at a place that a fixed finding cites.
3. The wowsims-file check that this review file records (the commands in
   `docs/fork-upstream-touchpoints.md`) gives the same output at the new
   fork tip.

Dispatch one fresh agent on the review lane, picked by the "Try in order"
list above. Give it the main range, the fork range, the findings and tickets
the commits fix, and these four checks:

1. Conditions 1 to 3 above hold.
2. The diff changes only what each finding asks for.
3. Each new test asserts its finding. Where the ticket or the commit message
   records a run with the fix reverted, the test failed in that run.
4. The tests that the fixes touch pass.

Tell the agent it writes nothing, and that it reports a finding when a
change is wrong, missing, or does more than its finding asks, or when the
lines the fixes wrote add data loss, a silent wrong result, a loud failure
or a code-quality problem. The check is done when the agent reports a
result for all four checks.

The focused check is a round: step 1 has already written its
`Reviewed range:` line. Add a `## Focused check (round 2)` section to the
review file with the fork range and the result of each of the four checks.

When all four checks pass and the agent reports no finding other than
bookkeeping (step 3), add a `## Disposition (round 2)` table with one row
per finding. Follow `docs/agents/known-traps.md`, "Before writing a review
Disposition table", for an empty table and for rows of earlier rounds that
this round closes. File the ticket for each `defer` row as step 3 says. Then
continue at step 4.

Otherwise, record in the `## Focused check (round 2)` section which check
failed or what the agent found, and stop as "Round limit" says.

#### Round limit

A round is one line of this file that starts with `Reviewed range:`.
Round 1 is the full review, or the small-change lane. The agent that
handles this review's findings makes every fix for round 1's findings,
the code-quality pass included (step 3), before it dispatches round 2.
Round 2 is the focused check above, and it is the last round: there is
no round 3.

Skip round 2 when every commit since round 1's `<through-sha>` only
changes whitespace or line wrapping, only changes this review file or
tickets its Disposition rows link, or applies a bookkeeping fix. The
code-quality pass is not on this list: round 2 reads it. Do not skip
round 2 while a "fixed before merge" finding (step 3) has no
fix commit; when such a finding cannot be fixed now, stop as the next
paragraph says. The agent that handles this review's findings decides,
and writes the skip and the output of
`git log --oneline <through-sha>..HEAD` in `## Summary`.

Stop, and do not fix and review again, when round 2 cannot run (one of
the three conditions in "Focused check (round 2)" fails or cannot be
settled), when one of its four checks fails, or when it reports any
finding other than bookkeeping — for example a fix that is wrong or
missing, a new data loss or silent wrong result, a loud failure, or a
code-quality finding in the lines the fixes wrote. Commit the review file
as it stands, do not run step 4, and in place of step 5 report to the
user which finding, which fix, what the check found, and the likely
cause, labelled `hypothesis, untested` unless you checked it. The owner
ruled out a third round: this rule assumes that another round would not
make the writing agent get it right. The user decides what happens next,
for example a dedicated quality pass, a different writer, or a fresh
round 1 for new work.

When round 2 passes or is skipped, give each open finding its outcome.
When round 2 is skipped, write these outcomes in round 1's
`## Disposition` table, editing rows as `docs/agents/known-traps.md`,
"Before writing a review Disposition table", says.

- a "fixed before merge" finding that is still open: stop as the "Stop"
  paragraph above says, and report it to the user as blocking the merge;
- a finding that step 3 says blocks the merge, still open, that the owner
  has not allowed to be deferred: write no Disposition row for it yet;
  list it in `## Summary` as blocking the merge and report it as step 5
  says. When the owner allows the deferral, add its `defer` row with the
  quote, the date and a ticket;
- a bookkeeping finding: `wontfix` with the reason, or `fixed` when the
  suggested text is applied;
- every other open finding: a `defer` row and a ticket.

Tell the user which tickets are open.

### 3. Aggregate, file tickets, write the review

#### What a finding gets, by its effect (not its label)

Sort each finding by what it does, whatever label the reviewer gave it:

- **Fixed before merge:** data loss, or a silent wrong result: a check or
  test that passes when it should fail, or an output that is wrong with
  no error or warning.
- **A loud failure or a visibly wrong result** that a user or agent would
  hit: when this branch introduced it, it blocks the merge until this
  branch fixes it. It becomes a `defer` row with a ticket only when the
  owner allows that in the session, and the row then quotes the owner's
  words and gives the date. One from before this branch is a `defer` row
  with a ticket.
- **Code quality and style** (naming, structure, readability,
  duplication, comments): serious, and never dropped. Record each as a
  row under a `## Code quality` heading in this file. A code-quality row
  never starts a round of its own; round 2, which checks round 1's fixes,
  also reads the code-quality pass. Before round 2, the agent that handles this
  review's findings sends every `## Code quality` row to one fresh
  workhorse-lane agent, which fixes them all in one pass. The pass
  changes no behaviour, and `pnpm verify` passes after it. Each row then
  gets a Disposition row: `fixed`, or `defer` with a ticket.
- **Bookkeeping** (wording in this review file or in tickets, process
  notes): `wontfix` with the reason, or the reviewer's suggested text
  applied. Such a fix starts no round; round 2 checks it when round 2
  runs for another reason.
- **Any other finding** (a missing test, a gap against the spec, a
  performance cost): the same as a loud failure above. When this branch
  introduced it, it blocks the merge unless the owner allows a `defer`
  row as above; otherwise it is a `defer` row with a ticket.

**Fix scope.** The agent that dispatches a fix puts this sentence in the
fixer's prompt: "Change only what the finding asks for; list any other
change you think is needed in your final message." Each listed change
becomes a ticket or a line for the user at the hand-off.

**Agent files.** When findings ask for edits to agent files (`AGENTS.md`,
`CLAUDE.md`, `.claude/**`, `.agents/**`), list them all for one approval
by the user after round 1 and before any fix is made, so that the
approved edits are fixes that round 2 checks; do not ask once per round.

**Tickets are the source of truth for deferred work.** For every finding
you would defer, create `.scratch/carry-forward/issues/<NN>-<slug>.md`
first (`Status: open`, `Origin:`, `Blocks: phase-N`), then link it from
Disposition. See [`docs/agents/issue-tracker.md`](../../../docs/agents/issue-tracker.md).

Write `docs/reviews/<branch-name>.md` (slashes → dashes):

```markdown
# Pre-merge review — <branch>

Reviewed range: `<from-sha>..<through-sha>`

## Adversarial
…

## Domain
…

## Standards + Spec
…

## Summary
…

## Disposition

| ID | Axis | Disposition | Ticket / note |
| --- | --- | --- | --- |
| A1 | Adversarial | fixed | <what was fixed> |
| A2 | Adversarial | defer | `.scratch/carry-forward/issues/0N-slug.md` |
| D1 | Domain | wontfix | <why> |
```

`<through-sha>` is `git rev-parse HEAD` at dispatch; `<from-sha>` is the
merge-base for round 1, or the previous round's `<through-sha>` after that.
Both are resolved shas, never `HEAD` — a moved `HEAD` cannot be resolved
retroactively. One `Reviewed range:` line per round in exactly this form, so
coverage is checkable mechanically.

`Disposition` is exactly `fixed`, `defer`, or `wontfix`. A row disposes of a
finding. An axis with no findings writes no row — say so in that axis's prose
(`**Spec: clean.**`) and leave the table to the findings. A concern that was
raised and then checked and found not to be a defect is a finding: dispose of
it as `wontfix` with the reason. Append a one-liner
to `.scratch/carry-forward/map.md` when filing tickets.

When the review's last Disposition table is written and its tickets are
committed (round 2's table, or round 1's when round 2 is skipped), count
the tickets this branch filed and closed, and write both numbers in
`## Summary`. Filed is the number of `A` rows in
`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`.
Closed is
`git diff dev...HEAD -- '.scratch/carry-forward/issues/*.md' | grep -cE '^\+\s*(\*\*)?Status:(\*\*)? *(\*\*)?(closed|resolved|wontfix)'`.
When filed is higher than closed, say so in one sentence.

### 4. Prove the check (do not merge here)

```bash
pnpm merge-to-dev --check-only
```

On `phase-N/*` with open `Blocks: phase-N` tickets still open:

```bash
pnpm merge-to-dev --check-only --ack-open-blockers
```

### 5. Report — then stop

Tell the user where the review file is, the summary with its filed and
closed ticket counts, and that
`pnpm merge-to-dev --check-only` is green. List as blocking the merge
every finding that step 3 says blocks it and that the owner has not
allowed to be deferred, and ask the owner to allow the deferral or
to have it fixed. **Stop there.** Do not run `pnpm merge-to-dev`,
do not `git merge` into `dev`, and do not set `TBC_ALLOW_DEV_MERGE=1`
unless the user has **explicitly asked to merge after seeing the review
summary**. “Review and land” / “the branch looks done” / “commit this” /
finishing this skill is **not** permission to merge — wait for a separate
ask. When they do ask, use `pnpm merge-to-dev` only — never a raw merge into `dev`.
