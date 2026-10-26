# Pre-merge review — feat/usage-limit-fixes

Reviewed range: `2bc139f424db09c2635022f344d0ae20d1388d11..572ff9084a55924b3e9696e3f3fec877684c9c80`

Dispatch (round 1, 2026-10-26): `codex` is not on `PATH` (`which codex`
exit 1), so the axes ran as three fresh `general-task` agents on Opus
(review lane) in one parallel batch: adversarial (brief
`.agents/reviews/adversarial.md`), and the `code-review` skill's Standards
and Spec sub-agents. Not the small-change lane: `git diff --shortstat
dev...HEAD` gives 34 files, 1028 insertions, 369 deletions. **Domain axis
skipped:** the diff changes agent rules and docs; its only edits under
`packages/` are four comment pointers (`git diff dev...HEAD -- packages`),
so it has no game-domain content. Spec source: the owner's words in
`.scratch/agent-reports/2026-10-26-session-usage-limit-investigation.md`
(gitignored, main checkout only); the drafts and the apply report were
context, not spec. Each axis was told it writes nothing.

## Adversarial

Tree on arrival: only this review file untracked. Findings, most severe
first.

- **A1 (fixed before merge, agent file).** The rule that the interactive
  session hands every task to a subagent left AGENTS.md. Its only route is
  the trigger "Spawning an agent, fanning out, stage-gating, or writing a
  question for the owner" (`AGENTS.md:23-25`). A session asked to "fix X"
  matches "Writing code" instead, reads `docs/workflow.md`, and does the
  reads, runs and edits itself: the usage burn this branch exists to stop.
  Check: `grep -n -i "delegat\|orchestrat\|interactive session" AGENTS.md`
  (one hit, line 138, about overseers). The approved router draft made the
  same move (`ROUTER-AGENTS.md` § 3, row "The session delegates"), so this
  is a draft fault the branch carried over.
- **A2 (fixed before merge).** The § Workhorse jobs table sent "the larger
  worker jobs" to `glm-task` / `modest-task` (`model-policy.md:290`), which
  contradicts the hard-implementation definition (`:59-61`) and the
  "Always `general-task`" list (`:392-393`). `parallel-phase/SKILL.md:14`
  still says "Workers run the **workhorse** lane" in the old meaning, so a
  Delegator could put whole slices on cheap workers. A2a (the table row) is
  fixed on the branch; A2b (`SKILL.md:14`, both mirrors) is an agent-file
  edit waiting for approval (E3).
- **A3 (fixed before merge, agent files).** Five agent files send every
  search or read to `glm-flash-task` "when the harness lists it", with no
  exception for private data: `general-task.md:18`, `design-task.md:26`,
  `gate-planner.md:46`, `gate-reviewer.md:59`, `gate-executor.md:100`.
  The exclusion for `~/.claude/projects/`, `~/.claude*` and `~/.t3` is only
  in `model-policy.md:459-465`. A `general-task` investigating usage on the
  GLM card would send session transcripts to z-ai, against the global
  "Secrets and GLM workers" rule. Plausible, not observed.
- **A4 (fixed before merge, agent file).** The new rule "An investigation
  session writes its record before it ends" (`orchestration.md:149-155`)
  sits behind the spawning trigger. A session that finishes an
  investigation without spawning never opens the file. The Standards axis
  found the same (its item 5).
- **A5 (defer, 713).** Stopping a trial type (model-policy § Trial types,
  "Stopping and review") leaves no named workhorse type on a card without
  GLM. The stop is not silent: the finder tells the owner.
- **A6 (fixed).** Lost rule: "Readers share that index too: a read-only
  agent sees your uncommitted edits and cannot tell them from a stray
  worker's" (dev `AGENTS.md:127`; 0 hits at tip with
  `git grep -n -i "readers share\|cannot tell them from"`). Restored in
  `orchestration.md` § Parallel agents.
- **A7 (fixed in docs; skill part waits for approval).** Pointers to
  removed AGENTS.md sections. A7a, fixed: `docs/adr/0032:5` (§ Types from
  JSON), `docs/plans/wowsims-tab/candidate-pool.md:525` and
  `docs/plans/upstream-data-redundancy.md:301` (§ Testing). A7b:
  `dont-be-stupid/SKILL.md:19` (both mirrors) points at "§ Editing skills"
  (E5). The full set came from a loop over
  `git ls-files -- '*.md' '*.ts' ':!docs/reviews' ':!.scratch'` that joins
  each file's lines and greps `AGENTS.md § <removed section>`.
- **A8 (defer, 714).** Existed on `dev`, made worse here: "any
  `parallel-phase` worker" must be `general-task`
  (`model-policy.md:392-393`), but three places send an extremely simple
  slice to `simple-task`, and the adapter's new Workhorse line says a slice
  "never goes to" the workhorse types, which now include `simple-task`.

Checked, not a defect: no text caps delegation depth
(`git grep -n -i "one level\|depth\|nest"`); every cheap type says "spawn
no subagents"; pacing applies only inside the stage-gate flow
(`SKILL.md:110-111`, `orchestration.md:128-129`; `design-task.md` has no
Backburner text); skill mirrors are byte-identical (`diff -r`); every
other moved rule kept its force (pair rules, approve-builds, watchedRefs,
`--no-verify`, the §14 main gate, mini-loops); pointers for fork edits, a
merge, a stage-gate run, a spawn and a generated file each reach a file
and section that exist. Unexamined: the GLM agent files in
`~/.claude_router/agents/` (outside the repo).

## Domain

Skipped: no game-domain content (see the dispatch note).

## Standards + Spec

### Standards

Hard violations:

- **S1 (code quality).** `model-policy.md:543-546`: the Cursor table
  header and separator appear twice (`grep -n '^| Lane'`).
- **S2 (code quality).** Words on the global banned list ("carries",
  "shape"): `workflow.md:209` "comments that carry weight", `:211` "forced
  the shape", `gate-planner.md:25` "`K1` carries steps",
  `model-policy.md:455` "are to carry".
- **S3 (code quality).** Old lane meaning left in place:
  `stage-gate/SKILL.md:46` and `model-policy.md:493` say the Executor is
  "on the review lane, not the workhorse lane", which only made sense when
  "workhorse" meant Opus. (`parallel-phase/SKILL.md:14` is A2b.)

Judgement calls:

- **S4 (code quality).** "Lead-lane" is used for a review axis
  (`general-task.md:3`, `model-policy.md:208`), but the § Four lanes table
  puts review axes in Review; `orchestration.md:45` uses "lead-lane"
  before any definition; "overseer" is defined twice in different words
  (`AGENTS.md:133-139`, `model-policy.md:62-63`). Whether to keep the
  name "lead" at all is Q-lead-name.
- **S5.** Same as A4.
- **S6 (wontfix).** "Rule with no source" for the record rule: the owner
  ruled it ("for investigatory sessions to always make a detailed report",
  investigation record line 42).
- **S7 (code quality).** New committed claims cite gitignored
  `.scratch/agent-reports/*.md` files that a fresh checkout does not have:
  `model-policy.md:258, 284, 304` and stage-gate `SKILL.md:109`
  (`grep -n agent-reports`). On `dev`, no file under `docs/agents/` or
  `.claude/` cited that folder
  (`git grep -c "\.scratch/agent-reports" 2bc139f4 -- docs .claude` lists
  review files only).
- **S8 (wontfix).** Unsourced causes in moved text
  (`known-traps.md:182-186`, workflow.md "An uncommitted token audit"):
  carried unchanged from `dev` AGENTS.md; the move did not create them.
- **S9 (wontfix).** The paste-in "narrow investigation" sentence is in
  `orchestration.md:73-75` and `general-task.md:25-27`: deliberate, because
  a worker reads only its own agent file.
- **S10 (code quality).** Three test comments point at "docs/workflow.md
  § Testing"; the heading is "Testing: seams and where tests go"
  (`workflow.md:214`).

### Spec

Met: AGENTS.md is a router (159 lines, 8,359 chars, one pointer per kind
of work, no `@` imports); Opus overseers hand searches, reads and runs
down in blocks; the delegation guard is by job type
(`orchestration.md:35-39`), not depth; cheap workers spawn nothing;
pacing is limited to stage-gate; "fetch" is gone; the investigation
record rule exists.

- **P1 (wontfix).** "Pacing ignores chunk size" (owner: "this really
  depends on how big the chunk is"). The chunk limit is the size rule: a
  brief that fits about five steps is one `K1` with Backburner "none"
  (`plan-template.md:57-70`), and the re-split runs only when a plan has
  steps for more than one chunk (`SKILL.md:194`). A plan pays an extra
  planner run only when it is bigger than one chunk.
- **P2 (defer, 715).** Q-haiku was never answered (owner: "maybe bash
  calls should be done by haiku or something even"), and `AGENTS.md:145`
  "Nothing runs on Haiku" (unchanged from `dev`) reads as settled. The
  ticket records the open question.
- **P3 (defer, 716).** "small or even modest coding tasks shuld be fine glm
  flash": `glm-flash-task` has no Edit or Write tool, so all edits go to
  `glm-task` (`model-policy.md:292-293`) until the owner edits the agent
  file outside the repo.
- **P4 (fixed before merge, agent file).** `orchestration.md:37-39` calls
  "an executor that delegates oversight of a chunk to another Opus agent"
  the intended case, matching the owner ("an overseer looking over a plan
  executing agent, and that agent itself delegates pieces of complex
  oversight to other opus agents"). `gate-executor.md:95-97` says "Without
  a Partition, implement serially yourself", so the executor will not do
  it (E6).
- **P5 (wontfix).** On cards without GLM, modest coding goes to
  `modest-task`, which is Opus at effort medium. The owner chose the GLM
  card for this project ("i have an opus + glm card and thats' what we'll
  use for the project").
- **P6.** The adapter contradiction is part of A8 (714).
- **P7 (wontfix).** Backburner lines become tickets at the end of a run
  (`SKILL.md` step 7). Not asked for, but it keeps the "chunks onto the
  backburner for later planning" from vanishing.
- **P8, additions beyond the drafts.**
  - P8a, the "lead" lane name: no ruling names it. Q-lead-name.
  - P8b (wontfix), the GLM "Private data" bullet: follows from the global
    rule "Do not give them a job that includes or could reach private
    data" (`~/.claude/AGENTS.md` § Secrets and GLM workers). A3 is about
    the agent files not repeating it.
  - P8c (wontfix), the `general-task` description no longer says "the
    default for every delegated task": follows from "The opus agents
    should have been managing and overseeing worker tasks".
  - P8d (wontfix), the pre-merge-review fixer and the parallel-phase
    adapter rename: they follow the workhorse rename. (The adapter's
    `simple-task` contradiction is A8.)

## Merge order with feat/712-stage-gate-loops

Both branches fork from `dev` at 2bc139f4; 712's tip is 2f8d537b.
`git merge-tree 2bc139f4 HEAD feat/712-stage-gate-loops` gives 7
conflict hunks: stage-gate `SKILL.md` 2 (and 2 in the `.agents` mirror:
the Executor-paragraph gate-check pointer and Gate A), `gate-planner.md` 2
(Research by subagent; this branch's § Next chunk against 712's revision
text), `gate-reviewer.md` 1 (§ Fan-out). `gate-executor.md` merges clean.

Two conflicts are in meaning, not only text:

- 712's new gate-planner and gate-reviewer text sends research and claim
  checks to `general-task` on Opus (cap 4) and to `simple-task`; this
  branch sends those reads to the workhorse types. A resolution that takes
  712's side brings back the Opus-does-reads pattern.
- 712 points at "AGENTS.md § The session delegates", which this branch
  removes; the resolution must point at `docs/agents/orchestration.md`.

Whichever branch lands second merges `dev` in and resolves these. A merge
commit is not on round 2's list of allowed commits (pre-merge-review
"Focused check (round 2)", condition 1), so that resolution needs its
own review pass. Neither branch was merged here.

## Agent-file edits waiting for one owner approval

Per the skill, these are listed once, before any of them is made. Exact
text:

- **E1 (A1), `AGENTS.md`**, new first bullet under "Before you start, by
  kind of work": "- **You are the interactive session (the user talks to
  you directly):** you route work and hand every task to a subagent. Read
  `docs/agents/orchestration.md` § The session delegates before your first
  tool call; it lists the few calls you make yourself."
- **E2 (A4), `AGENTS.md:23-24`**: the trigger becomes "**Spawning an
  agent, fanning out, stage-gating, writing a question for the owner, or
  ending an investigation:**".
- **E3 (A2b), `parallel-phase/SKILL.md:14`, both mirrors**: "Workers run
  the **workhorse** lane." becomes "Workers run the **lead** lane." (or the
  name Q-lead-name picks).
- **E4 (A3), the five agent files**: after "when the harness lists it"
  insert ", except a read that could reach secrets, session transcripts
  (`~/.claude/projects/`), `~/.claude*` or `~/.t3`, which goes to
  `discrete-task` (model-policy § GLM worker types, Private data)".
- **E5 (A7b), `dont-be-stupid/SKILL.md:19`, both mirrors**: "`AGENTS.md`
  § Editing skills" becomes "`docs/workflow.md` § Editing agent-facing
  documents". Line 25 is a dated incident log entry and stays.
- **E6 (P4), `gate-executor.md`**, after "every check whose output decides
  your next edit are yours.": "When one step is itself oversight (running
  a worker set or judging an investigation), you may hand that step to one
  `general-task` (`model: "opus"`) and judge its result yourself
  (`docs/agents/orchestration.md` § Who spawns whom)."
- **E7, code-quality rows in agent files**: S2 `gate-planner.md:25`
  ("`K1` carries steps" → "`K1` has steps"), S3 `stage-gate/SKILL.md:46`,
  S4 `general-task.md:3`, S7 stage-gate `SKILL.md:109`. The code-quality
  pass applies them with the doc rows.

## Code quality

| ID  | Where                                                                                                                             | What the pass does                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `docs/agents/model-policy.md:543-546`                                                                                             | Delete the second header and separator                                                                                                              |
| S2  | `docs/workflow.md:209,211`; `docs/agents/model-policy.md:455`; `.claude/agents/gate-planner.md:25`                                | Replace "carry weight", "forced the shape", "carry", "carries" with plain words                                                                     |
| S3  | `docs/agents/model-policy.md:493`; stage-gate `SKILL.md:46` (both mirrors)                                                        | Say why the Executor runs on Opus without the old "not the workhorse lane" contrast                                                                 |
| S4  | `.claude/agents/general-task.md:3`; `docs/agents/model-policy.md:208`; `docs/agents/orchestration.md:45`; `model-policy.md:62-63` | Stop calling review axes lead-lane work; define "overseer" once and point to it                                                                     |
| S7  | `docs/agents/model-policy.md:258, 284, 304`; stage-gate `SKILL.md:109` (both mirrors)                                             | Mark each gitignored report citation "(gitignored; main checkout only)" and label its causal claim hypothesis where no re-runnable command is given |
| S10 | three `packages/core/test/*.test.ts` header comments                                                                              | Use the full heading "§ Testing: seams and where tests go"                                                                                          |

## Summary

Round 1 found one rule lost outright (A6, restored) and six places where
the move changes what an agent does without warning: A1, A2b, A3, A4, A7b
and P4. Their fixes are agent-file edits (E1-E6) that wait for the
owner's one approval, so the code-quality pass and round 2 have not run.
Fixed on the branch now: A2a, A6, A7a.

Blocking the merge, with no Disposition row yet: A1, A2b, A3, A4, A7b, P4
(fixed-before-merge class; E1-E6), the six code-quality rows (the pass
runs after approval), and P8a (Q-lead-name, an addition the owner did
not ask for).

Tickets filed by this review: 713, 714, 715, 716 (all open). The
filed/closed counts for the branch are written when the last Disposition
table is written.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                  |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2a | Adversarial | fixed       | Removed "and the larger worker jobs" from the § Workhorse jobs table row in `docs/agents/model-policy.md`                                                                                                                                                                                                      |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/713-trial-stop-names-no-workhorse-fallback.md` — no named fallback when a trial type is stopped                                                                                                                                                                                 |
| A6  | Adversarial | fixed       | Restored the "readers share the index" sentence in `docs/agents/orchestration.md` § Parallel agents                                                                                                                                                                                                            |
| A7a | Adversarial | fixed       | Pointers in `docs/adr/0032`, `docs/plans/wowsims-tab/candidate-pool.md:525`, `docs/plans/upstream-data-redundancy.md:301` now name the `docs/workflow.md` sections; dated plan text naming "AGENTS.md \"The loop\"" (`docs/plans/wowsims-tab/orchestration.md:68,80`) describes the file at its date and stays |
| A8  | Adversarial | defer       | `.scratch/carry-forward/issues/714-simple-task-parallel-phase-slice-contradiction.md` — existed on `dev`                                                                                                                                                                                                       |
| S6  | Standards   | wontfix     | The owner ruled the record rule (investigation record line 42)                                                                                                                                                                                                                                                 |
| S8  | Standards   | wontfix     | Text moved unchanged from `dev` AGENTS.md; the move did not create the claim                                                                                                                                                                                                                                   |
| S9  | Standards   | wontfix     | Deliberate copy: a worker reads only its own agent file                                                                                                                                                                                                                                                        |
| P1  | Spec        | wontfix     | The five-step chunk limit is the size rule; a small brief is one `K1` with Backburner "none"                                                                                                                                                                                                                   |
| P2  | Spec        | defer       | `.scratch/carry-forward/issues/715-q-haiku-open-question.md` — open owner question                                                                                                                                                                                                                             |
| P3  | Spec        | defer       | `.scratch/carry-forward/issues/716-glm-agent-files-need-owner-edits.md` — owner edits outside the repo                                                                                                                                                                                                         |
| P5  | Spec        | wontfix     | The owner chose the GLM card for this project                                                                                                                                                                                                                                                                  |
| P7  | Spec        | wontfix     | Keeps Backburner chunks from vanishing; within the pacing ruling                                                                                                                                                                                                                                               |
| P8b | Spec        | wontfix     | Follows the global "Secrets and GLM workers" rule                                                                                                                                                                                                                                                              |
| P8c | Spec        | wontfix     | Follows the ruling that Opus agents oversee worker tasks                                                                                                                                                                                                                                                       |
| P8d | Spec        | wontfix     | Follows the workhorse rename; the `simple-task` part is A8                                                                                                                                                                                                                                                     |
