# Instruction review — chore/729-without-dry-run

Reviewed range: `3c008f0d2cffcb8b9218287d762abea39f3ee542..2e0673b128c2bdc89408cbb2842569c2035be898`

Review: the `instruction-review` skill (global,
`~/.claude_router/skills/instruction-review/SKILL.md`), full path. Every
file the branch changes is agent tooling, so it gets this review in
place of the product review (ticket 731, as the dispatching session
reports). This is one of the first real runs of the skill (ticket 732
§ Done when); notes on the skill are in § How the skill worked.

## The change

`git diff dev...HEAD --stat`: 9 files, 1172 insertions, 21 deletions.

Instruction changes (each mirror is identical to its `.claude/` file;
`python3 scripts/check_skill_mirrors.py` printed "skill mirrors match",
rc 0):

- `.claude/skills/stage-gate/plan-template.md:46-53` and
  `.agents/skills/stage-gate/plan-template.md` (commit `d3c72734`):
  "Each chunk you can plan now has steps … A chunk is one line only when
  it needs a result that an earlier chunk's run produces and the plan
  cannot know before then", and "A new plan for a later chunk" became
  "A new plan for a one-line chunk".
- `.claude/skills/stage-gate/SKILL.md:264-271` and its mirror (commit
  `f4d37a1c`): Gate A's open-question check. Old: "is answered with its
  three items, or named on the line of the later chunk that will answer
  it". New: "either has its three items in this plan, or is named on the
  line of a one-line chunk that will answer it", plus a parenthesis that
  says why a chunk with steps does not count.

Records (not instructions; checked only for claims about this branch):
ticket 729, tickets 731 and 732, `.scratch/carry-forward/issues/NEXT`,
`docs/reviews/chore-729-test-result.md`.

Intent (my reading, from ticket 729 § Option B did not take effect and
§ "Later chunk" in two files, and the commit subjects):

- Template: the planner gives steps to every chunk it can plan now, and
  writes a one-line chunk only for work that waits on an earlier chunk's
  run. This matches `.claude/agents/gate-planner.md:36-41`.
- Gate A: a clarification. An open question counts as parked only on a
  chunk with no steps, which gets its own plan; a question named on a
  chunk with steps fails Gate A. Under the old template "later chunk"
  meant a one-line chunk; under Option B a chunk with steps can also come
  later, and the new text removes that second reading. Meant to keep
  behaviour.

## Findings

| ID  | Check   | `file:line`                                                                    | Quoted text                                                                                                       | What an agent will do wrong                                                                                                                  | Severity | Evidence                                                                                                                                                                                                                                                                        |
| --- | ------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IR1 | 3       | `.claude/skills/stage-gate/plan-template.md:46-49`                             | "A chunk is one line only when it needs a result that an earlier chunk's run produces"                            | Unknown: the trial on record does not show that the template text, and not the brief edit, made the planner give steps to every chunk        | blocks   | Old and new runs used different briefs: `diff .scratch/stage-gate/729-planner-test/brief.md .scratch/stage-gate/729-planner-test-2/brief.md` shows line 27 "`K2` and `K3` are later chunks." deleted in the new run. Ticket 729:244-248 labels the cause `hypothesis, untested` |
| IR2 | 3       | `.claude/skills/stage-gate/SKILL.md:264-271`                                   | "or is named on the line of a one-line chunk that will answer it (a chunk with no steps yet: …)"                  | Nothing wrong seen. The trial run for this review stopped at the hand-off, which the skill counts as no trial                                | blocks   | § Check 3. Old and new runs both failed Q2 and wrote a planner respawn naming it; neither call was delivered                                                                                                                                                                    |
| IR3 | 1       | `.claude/skills/stage-gate/plan-template.md:51-52`                             | "A step whose result later steps must reason about goes in the same chunk as those steps."                        | A planner could read it as forbidding every one-line chunk, because a one-line chunk by definition needs an earlier chunk's result           | minor    | Cold reader U1, reading B. The cold reader took the meant reading as its own. The sentence is unchanged by this branch; the new text beside it makes the overlap easier to see                                                                                                  |
| IR4 | 1       | `.claude/skills/stage-gate/plan-template.md:47-49`                             | "A chunk is one line only when it needs a result that an earlier chunk's run produces"                            | A chunk that waits on something other than a run (an owner decision) has no form in the template                                             | minor    | Cold reader U5. `gate-planner.md:38-39` gives the same single reason for a one-line chunk, and owner questions go out as "Open questions" (`SKILL.md:240-243`)                                                                                                                  |
| IR5 | 2       | `.claude/skills/stage-gate/plan-template.md:48-49` with `SKILL.md:266`         | "`K3: <goal in one sentence> — needs from K2's run: <result>`"                                                    | A planner that copies the one-line form leaves out the open question it parks there, Gate A fails, and the session respawns the planner once | minor    | Gate A counts a question "named on the line of a one-line chunk"; the template's one-line form has no place for it, and no planner file has an open-question rule (ticket 729:441-444, `grep -n -i 'open question'`). Same option in the old Gate A text                        |
| IR6 | 1       | `.claude/skills/stage-gate/SKILL.md:266`                                       | "is named on the line of a one-line chunk"                                                                        | A session could ask for the question's full text on the line, not its label                                                                  | minor    | Cold reader D11. Both trial runs accepted the label "answers Q3"                                                                                                                                                                                                                |
| IR7 | 2       | `.claude/agents/gate-reviewer.md:63-64`                                        | "a later chunk (a one-line chunk in `## Execution chunks`)"                                                       | Nothing: the parenthesis defines the term as the template now uses it. Two terms for one thing                                               | minor    | `grep -rn 'later chunk' .claude/skills/stage-gate .claude/agents` finds only this line; ticket 729:446-449 records it                                                                                                                                                           |
| IR8 | records | `.scratch/carry-forward/issues/729-simplify-the-gate-planner-rules.md:459-461` | "Commit `7e2ebae0`, on the same branch, added the reviewer's dry run"                                             | After a merge, a reader of ticket 729 on `dev` looks for a commit that is not in `dev`'s history                                             | minor    | `git merge-base --is-ancestor 7e2ebae0 HEAD` rc 1; `git branch --contains 7e2ebae0` lists only `chore/729-test-result`. The review file § Item 7 dropped explains the drop; the ticket does not point there                                                                     |
| IR9 | rubric  | `.claude/skills/stage-gate/SKILL.md:266-271`                                   | "(a chunk with no steps yet: it gets its own plan before it runs, … so a question named there can go unanswered)" | Nothing seen. Reasons inside a mechanical check, and the first half repeats step 5 (`SKILL.md:407-416`)                                      | minor    | `writing-for-agents` § Pruning (duplication, no-ops). On the trial input the old text, without the parenthesis, gave the same verdict                                                                                                                                           |

## Check 1: cold readers

Two cold readers, `general-task` on Opus, one per distinct file (the
mirrors are identical). Each got only the receiving agent's text and
role, and no intent:

- Planner role, the whole new `plan-template.md` (agent
  `a3e7e570796e0ab59`).
- Session role, the whole new step 2 of `SKILL.md`, which holds Gate A
  (agent `a22af97d7e50fe5cc`).

Inputs: `.scratch/agent-reports/2026-10-29-instruction-review-729wd-trial/cold-reader-inputs/`
(gitignored). The answers below are excerpts, quoted as returned; each
full answer is in that agent's transcript.

Every changed sentence was acted on as meant:

- Template lines 46-49. Planner reader, layout for three chunks: "K1
  gets steps, always. … K2 gets steps, unless it needs a result from
  K1's run that I cannot know at planning time. … K3 gets steps if I can
  plan it now. It gets one line only when both conditions hold: it needs
  a result that K2's (or K1's) run produces, and the plan cannot know
  that result before the run." When nothing depends on a run: "all three
  chunks get steps: `K1: steps 1–3`, `K2: steps 4–6`, `K3: steps 7–9`."
- Template lines 52-54. Planner reader L3: "I would not write the
  follow-up plan for a one-line chunk now. A new plan does that later."
- Gate A. Session reader C6: "Pass, for each remaining question: its
  'three items' are in this plan, or it is named on the line of a
  one-line chunk. Fail, for any remaining question: it appears nowhere,
  or only some of its three items are present, or it is named only on a
  chunk that has steps." It quoted the parenthesis as the reason for the
  last case.

Statements of fact the readers acted on: "no rule tells its executor to
answer an open question" (true: `grep -n -i 'question'
.claude/agents/gate-executor.md` finds only the `NEEDS_PRIOR_CONTEXT`
question). "it gets its own plan before it runs" (true: `SKILL.md`
step 5, lines 407-416).

Unclear sentences the readers listed in unchanged text near the change
(not findings of this review, because this branch does not change
them): template U2-U4, U6-U16; step 2 D1-D9, D12-D16. D10 ("three
items" not defined) comes from giving the reader step 2 only; step 1
(`SKILL.md:133-146`) defines them, and both trial runs found them there.

## Check 2: files read

| File                                                  | What it does with the change                                                                                              | Result      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `.claude/agents/gate-planner.md:36-45`                | "Give steps to every chunk you can plan now. List in one line each chunk that needs a result from an earlier chunk's run" | agrees      |
| `.claude/agents/gate-reviewer.md:63-64`               | "a later chunk (a one-line chunk …)"                                                                                      | IR7         |
| `.claude/agents/gate-executor.md`                     | runs its chunk's steps; no open-question rule                                                                             | agrees      |
| `.claude/skills/stage-gate/SKILL.md:133-146` (step 1) | defines open questions and their three items                                                                              | agrees      |
| `.claude/skills/stage-gate/SKILL.md:227-243` (step 2) | planner spawn, "Open questions" route                                                                                     | agrees; IR4 |
| `.claude/skills/stage-gate/SKILL.md:407-416` (step 5) | new plan for "the next chunk [that] has no steps", with the brief                                                         | agrees      |
| `.claude/skills/stage-gate/plan-template.md:48-49`    | one-line form                                                                                                             | IR5         |
| `.agents/skills/stage-gate/*` (mirrors)               | identical text                                                                                                            | agrees      |
| `docs/agents/orchestration.md:137-141`                | "writes steps for every chunk it can plan now, and lists in one line each chunk that needs an earlier chunk's results"    | agrees      |
| `docs/agents/stage-gate-project.md`                   | no chunk or open-question text (`grep -n -i 'chunk\|question'` prints nothing)                                            | agrees      |
| `.claude/settings.json`                               | no stage-gate or gate-seat hook (`grep -n -i 'stage-gate\|gate-'` prints nothing)                                         | agrees      |
| `scripts/check_skill_mirrors.py`                      | mirror check, rc 0                                                                                                        | agrees      |

Commands: the change orders no new command. Gate A's `git status
--porcelain` and `git rev-parse HEAD` are unchanged. No stage-gate copy
exists under `~/.claude/skills/` or `~/.claude_router/skills/`.

`/doctor prompt-audit` was not run: this review ran as a subagent, which
cannot run slash commands.

## Check 3: trial runs

### Template (IR1)

On record: ticket 729 § Second run, 2026-10-29. The new text ran on
`eded62c3`, and the text at HEAD is the same (`git diff eded62c3 HEAD --
.claude/skills/stage-gate/plan-template.md` prints nothing). The first
plan gave steps to all three chunks. The old-text run is § Test result,
2026-10-28, at `3c008f0d`, whose template equals `dev`'s. It left K2 and
K3 as one-line chunks.

The two runs did not use the same input: the old run's brief had the
sentence "`K2` and `K3` are later chunks.", and the new run's brief did
not. Either the template edit or the brief edit can explain the
difference. Check 3 asks for both versions "on the same input", so the
record does not settle it.

Trial to run: one `gate-planner` spawn (Fable) with `dev`'s
`plan-template.md` and the second run's brief,
`.scratch/stage-gate/729-planner-test-2/brief.md` (main checkout,
gitignored), with the stage path moved. Read its first plan's
`## Execution chunks`. If the template caused the first run's result,
the old text leaves K2 and K3 as one-line chunks; the new text (on
record) gives steps to K1, K2 and K3. If the old text also gives steps
to all three, the brief sentence was the cause. The template edit then
still brings the template into line with `gate-planner.md:36-41`, but
no trial shows it changes what the planner does. The planner's
hand-off is its final message, so one spawn is a full trial. It was not
run: it needs the `gate-planner` type, which this review's budget
excludes.

#### Result of the trial, run after the review (2026-10-29)

Run by the dispatching session's follow-up agent, at the owner's request
(option 1 of Q-729wd-template-trial). One `gate-planner` spawn on Fable
(agent `a4c0a848e35c671a5`, model `claude-fable-5-1`, 2 calls, 0.7043
USD by the run log in `.scratch/agent-runs/46401644-f7e4-42f5-996c-65cd93061a16.jsonl`).

Set-up, the same as the second run except where named:

- Checkout: a shallow clone of `dev` at `3c008f0d`
  (`git clone --depth 1 --branch dev file://<main checkout>`), so the
  template the planner read is `dev`'s. `gate-planner.md` and
  `docs/agents/stage-gate-project.md` are the same on `dev`, `eded62c3`
  and this branch's HEAD (`git diff --stat dev eded62c3 -- <file>`
  prints nothing for both), so the template is the only planner input
  that differs from the second run.
- Brief: `.scratch/stage-gate/729-planner-test-2/brief.md` with only the
  stage path moved (`diff` shows line 15 alone).
- Prompt: the second run's planner prompt (from its transcript), with the
  paths and HEAD of the clone.
- `decision-log.md` at spawn time: the second run's first three lines,
  with the clone's SHA.

The planner read the named brief and template, and the stage folder
(transcript: two Bash calls). Its first plan gave steps to all three
chunks. `## Execution chunks`, quoted:

> - K1: steps 1–3 — creates `statements.md` with the K1 line.
> - K2: steps 4–7 — appends the K2 line. Needs from K1: `statements.md`
>   with exactly one line starting `K1: `.
> - K3: steps 8–12 — appends the K3 line and reports all three lines.
>   Needs from K2: `statements.md` with exactly two lines, `K1: ` then
>   `K2: `.
>
> All three chunks have steps now; no later chunk waits on a planning
> input from an earlier run.

Its § Approach rejects the first run's layout: "planning only K1 now and
leaving K2 and K3 as one-line chunks; that costs two extra planning
rounds for no information gain, since K2 and K3 do not depend on what
sentence K1 chose." Its first § Decisions line: "Planned all three
chunks with steps now instead of one-line placeholders for K2 and K3 —
later chunks need only a file-state precondition, not an earlier run's
result". The second run's planner, on the new template, wrote nearly the
same line: "Planned all three chunks with steps now instead of leaving
K2 and K3 one-line — no chunk needs a result from an earlier run"
(`.scratch/agent-runs/fc215b62-f051-47b1-b269-e4f6d0ac0250.jsonl`,
agent `a33945bd682b70549`, `decisions` field).

Conclusion: on this brief, the old template and the new template give
the same result. The brief sentence "`K2` and `K3` are later chunks."
caused the first run's one-line chunks, not the template. The template
edit is a no-op clarification here: it brings the template into line
with `gate-planner.md:36-41`, and no trial shows that it changes what
the planner does. One spawn per template is a small sample. One trace
of the old one-line form remains: K2 and K3 have steps but keep the
"Needs from K1:" wording of the old one-line example. It did no harm.

Files: `.scratch/agent-reports/2026-10-29-instruction-review-729wd-trial/ir1-old-template-run/`
in this worktree (gitignored; `brief.md`, `decision-log.md`, and
`plan.md`, the planner's final message verbatim).

### Gate A (IR2)

Run for this review. Two `general-task` agents on Opus (old text agent
`a002b52bd20ac7d11`, new text agent `a6353bc7adb4651cf`), each acting as
the session at step 2, just after writing a planner's plan to `plan.md`.
Each got `SKILL.md` and `plan-template.md` from its own ref (`dev` or
HEAD), the same brief and plan, and a clean temporary git checkout with
a matching `note sha` line. Each was told to spawn nothing and to write
its next agent call to `next-call.md`. A first attempt of both agents
hit a usage limit before any tool call and wrote nothing; both were
rerun on rebuilt fixtures.

Input: a brief with three open questions. The plan answers Q1 with its
three items, names Q2 on `K2: steps 4–6 — answers Q2` (a chunk with
steps, whose step 4 picks a key with no candidate, rule or
measurement), and names Q3 on the one-line chunk K3. Fixture, script
and both runs' output files:
`.scratch/agent-reports/2026-10-29-instruction-review-729wd-trial/`
(gitignored; rebuild with `bash fixture-source/setup.sh <worktree>
<outdir>`).

Expected: new text fails Gate A on Q2 and respawns the planner with the
violation named. Old text: either the same, or a pass, by reading K2 as
"the later chunk".

Result: both runs did the same thing. Each failed Gate A on Q2 only,
logged `gate A | fail | round 1` in `decision-log.md`, and wrote a
`gate-planner` (fable) respawn naming Q2. The difference is in the
reasons:

- New text: "It appears only on 'K2: steps 4–6 — answers Q2', and K2 is
  a chunk with steps. The skill says of that case: 'A chunk with steps
  runs the plan it already has, …'"
- Old text: "read word for word, K2 is 'a later chunk' whose line names
  Q2. I read the rule as meaning a chunk that a later plan will cover
  … If the owner meant the literal reading, this check passes and the
  next move is the step 3 reviewer spawn."

For a change meant to keep behaviour, the skill's pass test is that both
runs match. They match. The old text reached the meant verdict only by
picking one of two readings it named. The new text gave one reading and
quoted it.

Status under the skill: not passed. Both runs stopped at the hand-off.
They wrote the respawn call but did not deliver it, and check 3 says "a
run that stops before the agent hands work to the next agent leaves the
blocking finding open". A full trial is a live stage-gate run with the
`gate-*` types, outside this review's budget.

Ruling after the review (dispatching session, 2026-10-29): the trial
counts as full. The Gate A wording decides only the session's own
verdict and the respawn the session writes. Both runs produced that
verdict and the full respawn text, and the next agent's own
instructions (`gate-planner.md`) are unchanged. So the work that the
changed text controls was done in full, and IR2 is fixed. The skill's
rule that a run which "stops before the agent hands work to the next
agent" is no trial is unclear for text whose only output is a verdict;
ticket 732 § Skill feedback from real use records it.

## How the skill worked

What went well:

- The cold readers found nothing wrong in the changed sentences, but
  each listed 16 unclear sentences in the text around them. Separating
  changed from unchanged sentences took a manual pass. The skill could
  ask the cold reader to mark each item against the changed lines, or
  the reviewer could give it the diff's line numbers without the intent.
- Check 3 found that the template's trial record compares old and new
  runs on different inputs (IR1). No finding in
  `docs/reviews/chore-729-test-result.md` names this (`grep -n -i 'same
input\|later chunks\.\|brief sentence'` prints nothing).
- The Gate A trial was small and cheap: two agents, one fixture.

What went badly:

- The partial-trial rule ("stops before the agent hands work to the next
  agent") is hard to meet for a check that the session itself runs. The
  changed text decides only the session's verdict, and the next agent's
  file is unchanged, but the rule still asks for the hand-off. With
  `gate-*` types excluded from the budget, this review could not meet
  it. The skill could say what counts as the hand-off for a session-side
  gate: the call written in full, or the call delivered.
- "Run one when it fits the review's budget" does not say what happens
  when only part of the trial fits. Here the template trial needed a type
  outside the budget, and the Gate A trial fit only up to the hand-off.
- The skill gives no Disposition format. This file follows
  `docs/reviews/chore-729-test-result.md` because the merge gate parses
  that table; a repo without such a gate would need its own format.
- Check 1 says "one cold reader per changed file". Mirrored files are
  identical, so this review ran one reader per distinct text. The skill
  does not say whether that is allowed.
- The first launch of all four agents hit a usage limit. Both cold
  readers had finished before it. Both trial agents failed before any
  tool call and were rerun when the limit reset, which cost a coordinator
  round.

## Needed from the owner

- **Q-729wd-template-trial (IR1).** Today the template fix has an
  old-text run and a new-text run, but on two different briefs, so the
  record cannot say whether the template caused the change. Option 1:
  run the one-spawn trial in § Check 3 § Template (about 0.7 USD, from
  the first-plan cost in ticket 729 § Second run § Cost). Option 2:
  accept the record as it is, because the new template agrees with
  `gate-planner.md:36-41` either way. Recommended: option 1. It is one
  spawn, and if the brief sentence was the cause, that is worth knowing
  before the next brief is written. **Answered:** option 1 was run after
  the review. The brief sentence was the cause (§ Check 3 § Template
  § Result of the trial).
- **Q-729wd-gate-a-trial (IR2).** Today the Gate A trial matched old
  and new verdicts (the pass test for a behaviour-keeping change), but
  stopped at the hand-off, so under the skill's rule it counts as no
  trial. Option 1: accept the trial, because the changed text decides
  only the session's verdict, both runs wrote the same respawn, and
  `gate-planner.md` is unchanged. Option 2: wait for the next real
  stage-gate run whose brief has open questions, and check Gate A there.
  Option 3: build a live stage-gate trial now with a planted
  open-question plan (several spawns). Recommended: option 1.
  **Answered:** option 1, by the dispatching session's ruling (§ Check 3
  § Gate A).

Merging into `dev` also waits for the owner's own ask after reading this
review (`AGENTS.md` § Commits and merges).

## For the dispatching session

- IR8 needs no owner decision: one sentence in ticket 729:459-461 saying
  `7e2ebae0` is on `chore/729-test-result` only, pointing to
  `docs/reviews/chore-729-test-result.md` § Item 7 dropped. This review
  was allowed to write only this file, so it did not make the edit.
  **Done** after the review, in the same commit that set IR8 to fixed.

## Disposition

| ID  | Axis    | Disposition | Ticket / note                                                                                                                                                                                                   |
| --- | ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IR1 | Check 3 | fixed       | trial run (§ Check 3 § Template § Result): the old template with the second brief also gave steps to K1, K2 and K3, so the brief sentence was the cause and the template edit is a no-op clarification          |
| IR2 | Check 3 | fixed       | the changed text decides only the session's verdict and respawn; both runs wrote that verdict and the full respawn text, and `gate-planner.md` is unchanged (§ Check 3 § Gate A, ruling after the review)       |
| IR3 | Check 1 | wontfix     | the sentence is unchanged by this branch, and the cold reader took the meant reading as its own                                                                                                                 |
| IR4 | Check 1 | wontfix     | matches `gate-planner.md:38-39`; a chunk that waits on an owner decision goes out as "Open questions" (`SKILL.md:240-243`)                                                                                      |
| IR5 | Check 2 | wontfix     | the same option was in the old Gate A text; the cost is one Gate A respawn, and Gate A names the violation, as for A5 in `docs/reviews/chore-729-test-result.md`                                                |
| IR6 | Check 1 | wontfix     | both trial runs read a label such as "answers Q3" as naming the question                                                                                                                                        |
| IR7 | Check 2 | wontfix     | the parenthesis gives the template's meaning; recorded in ticket 729 § "Later chunk" in two files                                                                                                               |
| IR8 | Records | fixed       | ticket 729 § "Later chunk" in two files now says `7e2ebae0` is on `chore/729-test-result` only and points to `docs/reviews/chore-729-test-result.md` § Item 7 dropped                                           |
| IR9 | Rubric  | wontfix     | wording preference on text the owner approved (`8cd7e45e`, per `docs/reviews/chore-729-test-result.md` lines 26-30; `f4d37a1c` has the same `git patch-id`), and the rubric finding explains no check 1 finding |
