# Pre-merge review — feat/planner-tool-rounds-727

Reviewed range: `104b20176917bde1788cd64e540512ee0f8421fb..ccd7028ee8285ce69231bf88d2ffbfc0bab0be8f`

Dispatch: round 1, small-change lane. `git diff --shortstat dev...HEAD`
gave `3 files changed, 50 insertions(+), 17 deletions(-)`, and
`git diff --name-only dev...HEAD` listed
`.claude/agents/gate-planner.md`,
`.scratch/carry-forward/issues/724-separate-general-stage-gate-machinery-from-repo-specific-parts.md`
and `docs/agents/stage-gate-project.md`: at most 6 files and 150 lines,
and no path under `data/`, `vendor/` or `packages/core/src/` or with
`.generated.` in its name. `codex` is not on `PATH`, so the reviewer was
one fresh `general-task` agent on Opus (review lane), given the
adversarial brief and told to apply the `code-review` skill's Standards
and Spec checks itself and to write nothing. The domain brief was not
given: the diff changes only agent instructions and a ticket, with no
TBC, WCL or wowsims content. Ticket 727's before/after stage-gate test
run was out of scope for this review; the ticket stays open for it.

## Adversarial

R1, R2 and R3 (below). The tree was clean at review time
(`git status --porcelain` printed nothing; HEAD `ccd7028e`).

**R1. `.claude/agents/gate-planner.md:79-82` with :52-54. The planner's
own large-file rule is gone.** The old text told the planner: "Before
reading any other document over ~30 kB, get a heading map first ... and
read only the sections you need." The new text keeps that rule only for
helpers (:52-54), and round 1, "Inputs", tells the planner to "print the
others in one Bash call". In `next:` mode that call prints
`execution-report.md` and `progress.md` whole (§ Next chunk). In the
main checkout, 14 of 72 `.scratch/stage-gate/**/execution-report.md`
files are over 30 kB, and the five largest are 62, 88, 99, 133 and
1,053 kB (`find .scratch/stage-gate -name execution-report.md -size +30k
| wc -l`; `-printf '%s\n' | sort -n | tail -5`). That puts more text
into the Fable context that ticket 727 is trying to shrink. Whether the
Bash tool cuts such output, and whether it says so when it does, is
hypothesis, untested. The move of the 30 kB sentence to helpers was a
deliberate wording-review edit (`.scratch/agent-reports/2026-10-28-general-task-727-final-wording-check.md`,
P5), so the planner's own reads losing the rule is a gap in approved
wording, not a slip in applying it. Reviewer's suggested text for
:81-82: "`Read` each file you will edit; print the others in one Bash
call, joined with `; echo ===;`. For a file over ~30 kB, print its
heading map (`grep -n '^#\{1,3\} ' <file>`) in place of the file, and
print the sections you need with `sed -n '<a>,<b>p'` in your Research
round's Bash call." and, in the extra-round list at :92-94, ", a
`sed -n` of a section that a round-1 heading map named".

**R2. `.claude/agents/gate-planner.md:89-94`. When the Check round runs
is unclear.** Round 4, "Check", runs after the writes, but
`.claude/skills/stage-gate/parts.md` § When you write files here says to
write the files "as your last action", and `gate-planner.md` lets
`parts.md` replace its rules "where they differ". A planner may skip the
check. The extra-round list (:92-94) also gives no round to fix a file
that the check shows is wrong. Reviewer's suggested text for :89-90:
"4. **Check:** one Bash call, after your writes, that reads the files
you changed and counts the lines your final message reports. It changes
no file, so your writes are still your last action under `parts.md`."
And for :92-94, add "or to fix a file your Check round found wrong".

**R3. `.claude/agents/gate-planner.md:95-96`. Required extra rounds use
up the Decisions cap.** Part mode and reconcile mode always need an
extra round, because `parts.md` § Part mode and § Reconcile mode name
files that § Inputs does not. Each extra round adds a line to
`## Decisions`, which has a 10-line cap (§ Rules, "End your final
message with a `## Decisions` section of at most 10 lines"); only the
`added:` and `changed:` lines are exempt. Reviewer's suggested text:
"Add a line to `## Decisions` for each extra round, except the read of
the files `parts.md` names for your mode: `- extra tool round: ...`".

## Domain

Not run: the diff has no game-domain content (see Dispatch).

## Standards + Spec

**Standards:** R5 (below). Otherwise clean against `docs/workflow.md`
§ Editing agent-facing documents, the `writing-for-agents` skill and
the global writing-style rules; no banned words in the new text, and
both commit subjects follow the seven rules. `pnpm mirrors:check`
exits 0, and no tracked copy of either changed file exists.

**R5. `docs/agents/stage-gate-project.md:62-65`. The pointer names a
bound by a sentence fragment.** In `docs/agents/model-policy.md`
§ Workhorse jobs the block-size rule and the five-call "Run in place"
bound are one sentence, so "Block size: § Workhorse jobs. Its "Run in
place" bound does not apply" points the planner at that rule and then
turns half of it off, naming the half by words a reader cannot look up
as a heading. Reviewer's suggested text: "How to write a helper's block:
`docs/agents/model-policy.md` § Workhorse jobs, "Hand off a **block**".
That section's rule on what to run yourself (about five tool calls)
does not apply to the planner: the planner's own tool calls follow
`.claude/agents/gate-planner.md` § Rules, "Few tool rounds"."

**Spec (ticket 724, commit 17066a42): clean.** The close note's
`Verified by:` line follows `Status: closed`
(`docs/agents/issue-tracker.md`); `104b2017` is the merge of
`feat/stage-gate-split-724` (parents `6fc7fb58`, `c9ce64e2`); the
ticket's grep prints nothing at HEAD and at `104b2017`; `git show
e2445fda` shows it adds the note and drops the Run-log folder's
trailing slash, as the reworded note says.

**Spec (ticket 727): R4 (below).**

**R4. `.scratch/carry-forward/issues/727-limit-planner-tool-calls-on-fable.md`.
The ticket did not record that the change was applied.** The range did
not touch the ticket, so nothing recorded the owner's approval (§ Done
when, item 1), the applied change (item 2), the departure from
§ Proposed direction ("one helper") to "at most 4" helpers, or that
§ Facts line numbers are now stale. Bookkeeping: fixed in this review's
commit by an "Applied, 2026-10-28" section in the ticket.

## Code quality

| ID  | File                                      | Row                                                                                                |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| R2  | `.claude/agents/gate-planner.md:89-94`    | Check round's place against `parts.md` "last action"; no round to fix a file the check finds wrong |
| R3  | `.claude/agents/gate-planner.md:95-96`    | Required extra rounds in part and reconcile mode use up the 10-line Decisions cap                  |
| R5  | `docs/agents/stage-gate-project.md:62-65` | Pointer turns off half a sentence of model-policy, named by a fragment                             |

## Summary

Round 1 (small-change lane) found five problems; none is data loss.
R4 (ticket bookkeeping) is fixed in this review's commit. R1, R2, R3
and R5 all change the owner-approved wording in
`.claude/agents/gate-planner.md` or `docs/agents/stage-gate-project.md`,
so under this skill's "Agent files" rule they wait for one owner
approval before any fix is made; round 2 then checks the fixes.

Blocking the merge: R1. This branch introduced it, and its effect is a
cost (whole large reports printed into the planner's context) and
possibly cut-off output (hypothesis, untested). It needs either an
approved fix or the owner's allowance to defer it with a ticket.
R2, R3 and R5 are code-quality rows: they go to one fix pass after the
owner approves the wording, and each then gets a Disposition row.

Tickets so far: filed 0, closed 1 (724). Ticket 727 stays open for the
test run and for the outcome of R1, R2, R3 and R5. The final counts are
written when the last Disposition table is.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                   |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R4  | Spec        | fixed       | "Applied, 2026-10-28" section added to `.scratch/carry-forward/issues/727-limit-planner-tool-calls-on-fable.md` in this review's commit                                                                         |
| R1  | Adversarial | fixed       | Owner approved the suggested text in chat on 2026-10-28; heading-map text added to step 1 "Inputs" and the `sed -n` reason to the extra-round sentence in `.claude/agents/gate-planner.md`                      |
| R2  | Adversarial | fixed       | Owner approved the suggested text in chat on 2026-10-28; step 4 "Check" replaced and the "fix a file your Check round found wrong" reason added to the extra-round sentence in `.claude/agents/gate-planner.md` |
| R3  | Adversarial | fixed       | Owner approved the suggested text in chat on 2026-10-28; `## Decisions` line now exempts the read of the files `parts.md` names for your mode, in `.claude/agents/gate-planner.md`                              |
| R5  | Standards   | fixed       | Owner approved the suggested text in chat on 2026-10-28; Planner pointer in `docs/agents/stage-gate-project.md` now names § Workhorse jobs, "Hand off a **block**"                                              |
