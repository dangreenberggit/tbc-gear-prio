Status: open
Type: process
Origin: docs/reviews/feat-planner-tool-rounds-727.md
Blocks: none
Blocked by: none
Related: 727

# Fix five wording gaps in the planner's "Few tool rounds" rule

## Why this is a ticket

Round 2 of the pre-merge review of `feat/planner-tool-rounds-727`
found these five wording problems (S3 to S7). Each one costs a planner
an extra tool round or leaves a sentence unclear, but none stops a
planner from doing its job. The owner ruled on 2026-10-28, in chat, by
agreeing to this text: "If round 2 finds only small wording issues,
they go to a ticket rather than another pass before the merge. A real
break would still come back to you."

Every fix below edits `.claude/agents/gate-planner.md` or
`docs/agents/stage-gate-project.md`, so each needs the owner's approval
of its exact text before it is applied (AGENTS.md, "Propose changes to
`AGENTS.md`, `CLAUDE.md` and skill files in chat and wait for approval";
pre-merge-review skill, "Agent files"). The suggested texts are the
reviewer's and have not been checked against a run. Line numbers are at
`63959063`.

## Findings

**S3. `.claude/agents/gate-planner.md:95-98`. The Check round prints
whole files.** Round 4 "reads the files you changed", which puts a
changed `plan.md` back into the Fable context, and Bash shows only a
2 KB preview of an output over about 30 kB. Suggested text:

> 4. **Check:** one Bash call, after your writes, that checks the files
> you changed without printing them whole (`wc -l`, and `grep -n` for
> the headings, step numbers and claim ids you wrote) and counts the
> lines your final message reports. It changes no file, so your writes
> are still your last action under `parts.md`.

**S4. `docs/agents/stage-gate-project.md:66-69`. "The rest of that
section ... does not apply to the planner" turns off more than the
five-call rule.** It also turns off `docs/agents/model-policy.md`
§ Workhorse jobs on judging helper results (a helper's `not found` is
never the conclusion) and on `NEEDS_JUDGMENT` hand-backs. AGENTS.md
§ Spawning still states the `not found` rule to every agent. Round 1's
R5 text turned off only the five-call rule; text P4 in `63959063`
widened it. Suggested text for the sentence:

> You need not read the rest of that section. Its rule on what to run
> yourself (about five tool calls) does not apply to the planner: the
> planner's own tool calls follow `.claude/agents/gate-planner.md`
> § Rules, "Few tool rounds".

**S5. `.claude/agents/gate-planner.md:81-83`. The rule to `Read` a file
before changing it is stated only for round 1.** In `re-split` the
planner learns from `parts.md` that it changes `plan.md` and
`decomposition.md`, after round 1. If it prints them with Bash in its
extra round, its `Edit` or `Write` is refused and it spends a redo
round. Suggested fix: move the sentence above the numbered list as "In
every round, `Read` each file you will change with `Edit` or overwrite
with `Write`, whatever its size, because those tools refuse a file you
have not opened with `Read`."

**S6. `.claude/agents/gate-planner.md:93-94`. No round names a file
delete.** In `re-split`, a part brought back has its `ticket.md` deleted
(`.claude/skills/stage-gate/parts.md:51-52`). Round 3 names only `Edit`
and `Write`, and round 4 changes no file. Suggested text:

> 3. **Edits:** in `next:` mode, or when `parts.md` has you write
> files, one message with every `Edit` and `Write` call, and one Bash
> `rm` for any file `parts.md` has you delete.

**S7. `.claude/agents/gate-planner.md:84-88` with § Revisions. A
revision of a `plan.md` over about 30 kB always costs an extra round.**
The revision's final message is the whole plan, but round 1 prints only
the heading map of a large `plan.md`. Suggested addition to round 1:
"In a revision, also `Read` `plan.md`, because your final message
reproduces it."

## Not in this ticket

Round 2 also found S1 and S2 (output cut short by the harness, with no
extra-round reason that allows reading the rest). Those were classed as
real breaks and went back to the owner; see
`docs/reviews/feat-planner-tool-rounds-727.md` § Round 2. If the owner's
fix for S1 adds a reason such as "to read the rest of a file or output
that came back cut short", S5 and S7 may need less text.

## Done when

- The owner approved the text for each of S3 to S7, or dropped it.
- The approved texts are applied and `pnpm mirrors:check` passes.
