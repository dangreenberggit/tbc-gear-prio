# Pre-merge review — feat/usage-limit-fixes

Reviewed range: `2bc139f424db09c2635022f344d0ae20d1388d11..572ff9084a55924b3e9696e3f3fec877684c9c80`

Reviewed range: `572ff9084a55924b3e9696e3f3fec877684c9c80..eff96d3878c5db0f15fc96e95682ba4c3fd6bd21`

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
- **A5 (defer, 718).** Stopping a trial type (model-policy § Trial types,
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

Tickets filed by this review: 714, 715, 716, 718 (all open). The
filed/closed counts for the branch are written when the last Disposition
table is written.

Update, 2026-10-26: E1-E6 are made; the commits are named in the
Disposition rows below, with the code-quality rows, P8a and the
owner's GLM Flash ruling (O1). Ticket 716 is closed. Round 2 has not
run.

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2a | Adversarial  | fixed       | Removed "and the larger worker jobs" from the § Workhorse jobs table row in `docs/agents/model-policy.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A5  | Adversarial  | defer       | `.scratch/carry-forward/issues/718-trial-stop-names-no-workhorse-fallback.md` — no named fallback when a trial type is stopped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A6  | Adversarial  | fixed       | Restored the "readers share the index" sentence in `docs/agents/orchestration.md` § Parallel agents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| A7a | Adversarial  | fixed       | Pointers in `docs/adr/0032`, `docs/plans/wowsims-tab/candidate-pool.md:525`, `docs/plans/upstream-data-redundancy.md:301` now name the `docs/workflow.md` sections; dated plan text naming "AGENTS.md \"The loop\"" (`docs/plans/wowsims-tab/orchestration.md:68,80`) describes the file at its date and stays                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A8  | Adversarial  | defer       | `.scratch/carry-forward/issues/714-simple-task-parallel-phase-slice-contradiction.md` — existed on `dev`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S6  | Standards    | wontfix     | The owner ruled the record rule (investigation record line 42)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| S8  | Standards    | wontfix     | Text moved unchanged from `dev` AGENTS.md; the move did not create the claim                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S9  | Standards    | wontfix     | Deliberate copy: a worker reads only its own agent file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| P1  | Spec         | wontfix     | The five-step chunk limit is the size rule; a small brief is one `K1` with Backburner "none"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| P2  | Spec         | defer       | `.scratch/carry-forward/issues/715-q-haiku-open-question.md` — open owner question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| P3  | Spec         | fixed       | Both owner edits are made; ticket 716 closed in 1467d9b8, and e5a80126 moves exact-text edits and small or modest coding to `glm-flash-task`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| P5  | Spec         | wontfix     | The owner chose the GLM card for this project                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| P7  | Spec         | wontfix     | Keeps Backburner chunks from vanishing; within the pacing ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| P8b | Spec         | wontfix     | Follows the global "Secrets and GLM workers" rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| P8c | Spec         | wontfix     | Follows the ruling that Opus agents oversee worker tasks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| P8d | Spec         | wontfix     | Follows the workhorse rename; the `simple-task` part is A8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| A1  | Adversarial  | fixed       | 23e15665: new first bullet in `AGENTS.md` "Before you start" sends the interactive session to `docs/agents/orchestration.md` § The session delegates (E1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A2b | Adversarial  | fixed       | f8233fa7: `parallel-phase/SKILL.md` (both mirrors) says workers run the lead lane (E3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| A3  | Adversarial  | fixed       | 3381fa1a: the five agent files send a read that could reach secrets, session logs, `~/.claude*` or `~/.t3` to `discrete-task` (E4); e5a80126 adds `/tmp/claude-*/**/tasks/*.output` to the list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| A4  | Adversarial  | fixed       | 23e15665: the `AGENTS.md` trigger for `orchestration.md` now includes "ending an investigation" (E2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| A7b | Adversarial  | fixed       | 8096a9e1: `dont-be-stupid/SKILL.md` (both mirrors) points at `docs/workflow.md` § Editing agent-facing documents (E5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| P4  | Spec         | fixed       | 9ada8dc8: `gate-executor.md` lets the executor hand one oversight step to a `general-task` and judge it (E6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S1  | Standards    | fixed       | 7d7d8f70: removed the second Cursor table header in `docs/agents/model-policy.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S2  | Standards    | fixed       | 7d7d8f70: "carry weight", "forced the shape", "carry" and "carries" replaced in `docs/workflow.md`, `model-policy.md` and `gate-planner.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S3  | Standards    | fixed       | 7d7d8f70: `model-policy.md` and stage-gate `SKILL.md` (both mirrors) say the Executor runs on Opus at effort `high`, without the old lane contrast                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| S4  | Standards    | fixed       | 7d7d8f70: review axes are no longer called lead-lane work in `general-task.md`, `model-policy.md` and `orchestration.md`; "overseer" points to `AGENTS.md` § Spawning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S7  | Standards    | fixed       | 7d7d8f70: gitignored report citations in `model-policy.md` and stage-gate `SKILL.md` marked "gitignored; main checkout only", with the causal claim labelled a hypothesis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S10 | Standards    | fixed       | 7d7d8f70: three `packages/core/test/*.test.ts` header comments use "§ Testing: seams and where tests go"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| P8a | Spec         | wontfix     | the coordinator kept 'lead', an ordinary word covering the whole job                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| O1  | Owner ruling | fixed       | e5a80126: on the "Claude + GLM workers" card `glm-flash-task` is the default workhorse type (searches, reads, named runs, measurements, exact-text edits, small or modest coding), `glm-task` takes larger planned edits, and Sonnet types take only jobs z-ai must not see, in `model-policy.md`, `AGENTS.md` § Spawning, `orchestration.md`, the seat and trial agent files and the parallel-phase adapter. Owner, 2026-10-26: "Flash should be used instead of sonnet, except for certain things zai models shouldn't do privacy-wise and are probably hooked out of doing (using gh, for example, I think). Sonnet generally should not be used but flash should be used for workhorse tasks." `gh` is denied to every agent on that card, so it is no reason to pick Sonnet |

## Focused check (round 2)

Range: `572ff908..eff96d38` (second `Reviewed range:` line). The session
named `9e5abb00..eff96d38`; the one commit before that, `840f690e`
(A2a, A6, A7a), was checked by the dispatching agent with `git show
840f690e` and matches its three Disposition rows. Fork range: none;
`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` gave rc 0,
so condition 3 holds. Dispatch: `codex` is not on `PATH` (round 1), so
one fresh `general-task` agent on Opus (review lane), told it writes
nothing. A `discrete-task` agent on Sonnet ran the mechanical checks
(verify, mirrors, ticket numbers, ticket paths).

Scope exception, as in `docs/reviews/feat-712-stage-gate-loops.md`
§ Focused check: these commits are not on condition 1's list, and the
session asked round 2 to review them anyway. Merges `8c3438c1` and
`271affba` (their conflict resolutions only; dev's own commits were
reviewed on their branches), `54b5e2c9` (the owner-approved r4 patch;
only how it fits this branch's pacing and routing text), `861c3ce9`
(the owner-approved "Open items carry forward." paragraph) and the
option-A part of `e5a80126` (owner ruling O1). The fix commits name no
finding ID in their messages; the round-1 Disposition rows map each one
to its finding, and the reviewer checked each mapping against the diff.

1. **Conditions 1-3: pass, with the scope exception above.** Each
   mapping matches its commit, except `f8233fa7` (R2-1). Merge
   `8c3438c1` resolved both meaning conflicts that § Merge order names
   on this branch's side: `gate-planner.md:48-68` and
   `gate-reviewer.md:91-108` keep the workhorse routing, and no text
   points at "AGENTS.md § The session delegates". A line-presence check
   over both merges (every line either side added since the merge base,
   looked up in the merge result) found only 4 dev lines in
   `gate-planner.md` where "researcher" became "helper" (now `:66-70`)
   and the expected `NEXT` value. `271affba` brings dev's files in
   unchanged. `861c3ce9`: `diff ~/.claude/AGENTS.md
docs/agents/home/AGENTS.md` gives rc 0.
2. **Only what each finding asks: fail for A2b and A3.** A1, A4, A7b,
   P4, S1, S2, S3, S4, S7 and S10 are fixed at the tip in both skill
   mirrors (`python3 scripts/check_skill_mirrors.py` rc 0). A2b goes
   past E3 (R2-1); A3 covers reads only (R2-2).
3. **Tests assert their findings: pass, none added.** The only test
   changes are the three S10 header comments.
4. **Touched tests pass.** `pnpm exec vitest run` on the three files:
   34 passed, rc 0. `TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` at
   `eff96d38`: rc 0, `gates: 1345 ran, 218 skipped`; the upstream drift
   step printed "CHECK DID NOT RUN" (sandbox denied `api.github.com`).

Clean: the renumber (no duplicate ticket number, `NEXT` 719, `map.md`
lists 713-718 once each, every ticket path in this file resolves, no
text names the branch's old 713); the r4 fit; no commit after
`271affba` changes the content ticket 717 cites.

New findings. The dispatching agent re-read R2-1 to R2-4 at the tip;
R2-5 to R2-11 are the reviewer's, not re-checked.

- **R2-1 (fixed-before-merge class; skill file).** `f8233fa7`,
  `parallel-phase/SKILL.md:14`, both mirrors. E3 asked for "workhorse"
  to become "lead". The commit also wrote "a small or modest slice may
  run on a workhorse type, as `docs/agents/model-policy.md` § Workhorse
  jobs says". That contradicts `adapters/claude-code.md:10` ("a
  `parallel-phase` slice itself never goes to them") and
  `model-policy.md:412` (any `parallel-phase` worker is `general-task`),
  and § Workhorse jobs does not mention slices. A Delegator reads this
  skill first and could put a whole slice on `glm-flash-task`: the A2
  fault again. Suggested text: "Workers run the **lead** lane (Opus
  `general-task`), as `docs/agents/model-policy.md` § Four lanes says."
- **R2-2 (fixed-before-merge class; agent files).** `3381fa1a`,
  `e5a80126`. The five seat files (`general-task.md:18`,
  `design-task.md:26`, `gate-planner.md:53`, `gate-reviewer.md:93`,
  `gate-executor.md:113`) keep off GLM only "a read that could reach"
  private paths, but they hand down runs and measurements too; the rule
  they point to says "job". A measurement over `~/.claude/projects/` is
  routed to `glm-flash-task` if read literally (hypothesis, untested:
  not observed). Suggested text: "except a job that could reach" in all
  five, and at `model-policy.md:483` "A search, read, run or measurement
  of that kind goes to `discrete-task`".
- **R2-3 (other: spec gap; introduced here).** `e5a80126`,
  `model-policy.md:294-295`. The rows "Small or modest coding" →
  `glm-flash-task` and "A larger planned edit inside the "Modest"
  bounds" → `glm-task` overlap; every coding job inside the Modest
  bounds matches both, and "larger" has no measure. `:351-352` does not
  say which GLM type replaces which pick. Needs an owner ruling
  (Q-glm-coding-split).
- **R2-4 (code quality; introduced here).** `e5a80126`. The Sonnet rule
  says two things: `model-policy.md:304-307` and `:485-486` name a
  retry on a GLM wall as a second Sonnet use; `AGENTS.md:146-150`,
  `orchestration.md:47-49`, `simple-task.md:3`, `discrete-task.md:3`,
  the adapter (both mirrors) and the lane table (`model-policy.md:186`)
  say Sonnet there takes only jobs z-ai must not see. The coding retry
  goes to `modest-task` (Opus medium), not Sonnet. Fix depends on
  Q-glm-wall-retry.
- **R2-5 (silent-wrong-result risk, low; introduced here).**
  `model-policy.md:89-91`: "A GLM type and its Claude counterpart are
  peer fills" reads both ways, so a private job on `discrete-task` that
  hits a wall "may retry" on `glm-flash-task`; only `:481` stops it.
  Suggested text: "On Claude Code a job on a GLM type may retry on its
  Claude counterpart (§ Workhorse jobs); a job never moves from a Claude
  type to a GLM type."
- **R2-6 (other; from dev, made contradictory by `e5a80126`).**
  stage-gate `SKILL.md:86` sends a question between gates to
  "`general-task` / `simple-task`", and slices go to `simple-task` at
  `SKILL.md:49-50`, `gate-executor.md:119-120`,
  `adapters/claude-code.md:9`, `model-policy.md:528-529`; the new
  `simple-task.md:3` says that type is for private jobs only on the GLM
  card. The slice lines belong with ticket 714.
- **R2-7 (code quality; introduced here).** The stage-gate seat table
  (`SKILL.md:41`) and `model-policy.md:519-521` put the Executor in the
  review lane; § Four lanes (`model-policy.md:55`) defines lead as
  running a plan and hard implementation, the Executor's job.
- **R2-8 (code quality; introduced here).** `orchestration.md:3-4`
  still lists the four old triggers, without "ending an investigation"
  (E2).
- **R2-9 (code quality; from merge `8c3438c1`).** `gate-planner.md:76,
113, 115` still say "researcher" for the agent that `:48-68` now
  calls "helper".
- **R2-10 (code quality, judged wontfix-class by the dispatching
  agent).** Inserted lines are not rewrapped to 80 columns. `.prettierrc`
  sets no `proseWrap`, so Prettier keeps markdown line breaks as written,
  and many tracked markdown lines are longer (`parallel-phase/SKILL.md:14`
  is one line); no repo rule asks for the wrap.
- **R2-11 (bookkeeping).** Ticket 717's line numbers, given at
  `54b5e2c9`, are off at the tip: `SKILL.md` lines +1 (S7), and
  `gate-planner.md:101-139` +3 (E4). The cited text is unchanged.

Round 2 reported findings other than bookkeeping, so under § Round
limit the review stops here: no fixes are made on this branch, there is
no round 3, `## Disposition (round 2)` is not written, and the owner
decides what happens next. R2-1, R2-2 and R2-5 are in the
fixed-before-merge class and block the merge; R2-3, R2-4 and R2-7 to
R2-9 were introduced here and block it unless the owner allows a
deferral.

## Summary (round 2)

Every round-1 finding except A2b and A3 is fixed as its Disposition row
says. The two dev merges, the r4 fit, the open-items copy and the ticket
renumber are clean, and nothing on the branch fixes ticket 717's
faults. Round 2 found two fixes that need another pass (R2-1, R2-2),
one more privacy-routing gap (R2-5), two option-A contradictions that
need owner rulings (R2-3, R2-4), and code-quality items R2-6 to R2-10.
The merge is blocked until the owner rules on the next step.

Tickets so far (counted at `eff96d38`; the final count is written with
the last Disposition table): filed 4 (714, 715, 716, 718; `git diff
--name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`),
closed 1 (716). Filed is higher than closed because the round-1 defer
rows each needed a ticket.
