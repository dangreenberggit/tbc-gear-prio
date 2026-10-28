# Pre-merge review — feat/stage-gate-split-724

Reviewed range: `6fc7fb58aa29c00398abcbc1f93758ae7964fc39..2e0e5b339fdbd655f6a65b90e0be8448e1388cdd`

Reviewed range: `2e0e5b339fdbd655f6a65b90e0be8448e1388cdd..331c093bf783b05c7632bb34b32bdde7e3508fb0`

Dispatch note (round 1): full axes. The branch is not a small change:
`git diff --shortstat dev...HEAD` gives 14 files, 458 insertions, 254
deletions. `codex` is not on `PATH`, so each axis ran as a fresh
`general-task` agent (`model: "opus"`), all three in one parallel batch:
Adversarial, and the `code-review` skill's Standards and Spec sub-agents.
The dispatcher wrote the prompts from the `code-review` skill's step 4.
The Domain axis was skipped: the diff is workflow-document work with no
game-domain content. Spec sources: the plan
`.scratch/agent-reports/2026-10-27-design-task-724-split-in-place-plan.md`
(main checkout, gitignored), ticket 724, and the execution report
`.scratch/agent-reports/2026-10-27-general-task-724-split-execution.md`.
Each axis was told to write nothing and to propose no new wording for
approved text unless that text is wrong.

Checks the dispatcher reran at `2e0e5b33`:

- The plan's "test of general" grep, followed by
  `grep -v 'stage-gate-project.md'`, printed nothing (`rc=1`). Without
  the `grep -v`, it returns 32 lines.
- `diff -r .claude/skills/stage-gate .agents/skills/stage-gate` gave
  `rc=0`, so the two copies are the same, `agents/openai.yaml` included.

## Adversarial

**Reachability: no rule is unreachable.**

- Each seat now reads `docs/agents/stage-gate-project.md` at its Inputs
  step, before any step that uses a moved value: gate-planner.md:22-23,
  gate-reviewer.md:26-27 and gate-executor.md:39-40.
- The session reads the file "before step 1" (SKILL.md:36-39).
- The `docs/agents/orchestration.md` change (lines 25-27) lets the
  session read the file.
- gate-executor.md:19 points at § Checkouts during "First actions".
  That step runs only `git log` in the main checkout, and the first fork
  command comes after Inputs.
- The rule to spawn `gate-sme` appears only under **Session, step 5:**.
  The executor file at 6fc7fb58 had no SME rule either, so this is not
  a regression.

**Pointer targets: clean.** The axis checked 34 pointers in the six
changed files. Each one names a section, a sub-heading or a label that
exists in the new file and is spelled the same.

- **A1.** The **Run-log folder:** label (stage-gate-project.md:13-14)
  gives two file paths, `.scratch/agent-runs/<session>.jsonl` and
  `.scratch/agent-runs/*.jsonl`, and no folder. SKILL.md:558-562 builds
  `<run-log folder>/<session>.jsonl` and tells the session to grep "the
  run-log folder's `*.jsonl` files". Taken literally, that gives
  `.scratch/agent-runs/<session>.jsonl/<session>.jsonl`. A session that
  traces a decision then finds nothing. SKILL.md:566-567 tells it to say
  so, and the user gets a wrong "no run log". The plan's label table
  (plan line 66) gives exactly this text, so the executor followed the
  plan. The dispatcher confirmed both locations by reading them.
- **A2.** The planner entry **Spawns with no model argument:** except a
  GLM type's: you run on Fable, the top price tier (stage-gate-project.md:66-68)
  can be read backwards, as "spawn with no model argument unless it is
  a GLM type". At 6fc7fb58 the rule was "Name the model on every spawn
  except a GLM type's" (old gate-planner.md). The lines just above
  (:58-64) give each workhorse type its model explicitly, so a
  misreading is unlikely. If one happens, an unnamed helper runs on
  Fable. The Spec axis raised this as S-spec1, and the Standards axis
  as S2.
- **A3.** gate-planner.md:54-55 says "§ Worker lanes, Planner, names …
  the judgment agent". The **Judgment agent:** line is at
  stage-gate-project.md:49, under `## Worker lanes` and above
  `### Planner`.

## Domain

Skipped: the diff has no game-domain content (see the dispatch note).

## Standards + Spec

### Standards

**No hard violations.**

- Tickets 724 and 726 and `NEXT` meet `docs/agents/issue-tracker.md`:
  726 has all five header lines, `Status: open`, and `Blocked by: 724`.
  724's note is under `## Comments`. `NEXT` went from 726 to 727 in
  `2e0e5b33`.
- All four commit messages are subject-only, 37 to 46 characters long,
  in the imperative, and capitalised, with no full stop.
- § Comment policy covers code comments only, so it does not apply.

Approved text that is wrong:

- **S1.** gate-planner.md:59-61 reads "…its report file (report rule:
  that file's § Folders). Name the model on every spawn that section
  says to name". The nearest section that comes before "that section"
  is § Folders, which says nothing about models. The intended section
  is § Worker lanes, Planner. This backward reference is not
  unmistakable, so it breaks the global writing rule. The dispatcher
  read the lines to confirm. Together with A2, the planner's
  model-naming rule is now unclear in two places.

Judgement calls, all in `docs/agents/stage-gate-project.md` unless
noted:

- **S2.** The same label as A2.
- **S3.** Lines 58-86 hold three near-identical copies of the
  workhorse-type rule, under Planner, Reviewer and Executor (Duplicated
  Code).
- **S4.** § Session commands (lines 44-45) only points on to
  `orchestration.md` § The session delegates (Middle Man). Lines 53-54
  cite model-policy § Workhorse jobs twice in one value.
- **S5.** **Report folder:** (line 16) gives a pointer, not a folder.
  The label **Fork commands in the pair (the pair path is the checkout
  path):** (lines 98-99) repeats its value, "(fork commands: …)".
- **S6.** Ticket 726:41-42 says "`pnpm foreground-hook:check`, which
  finds the hook and settings by relative path", with no source.

### Spec

**Spec: every N-item is in place.**

- Each approved Becomes sentence (N1-N34, N14b, N32b, N38; N36 and N37
  outside the skill and agent files) is in its file word for word.
- Each moved passage is in the new file under the section and label
  that the plan's table gives.
- Nothing was dropped. A script checked every removed line. Each line
  it could not match falls in an N-item, and each such line is either
  replaced, moved (checked by eye), or a fragment that the plan or
  executor choice 3 leaves out (N4, N18, N22/N26/N32, N30).
- The diff makes no change that no N-item asked for.
- N38 has no Becomes text in the plan. The axis checked it against
  ticket 724 § Comments instead: the step 7 sentence and
  **Integration branch:** `dev`. are both present.
- One finding, S-spec1, is the same as A2.
- The axis saw some long unwrapped lines. That is formatting only, and
  `pnpm run format:check` passes (execution report, K2-K4).

## Summary

Round 1 found no dropped rule, no broken pointer and no change outside
the plan. The diff matches the approved plan item by item, the mirrors
match, and the test-of-general grep comes back empty.

Still open after round 1:

- **Blocks the merge until it is fixed, or until the owner allows a
  deferral: A1.** This branch added the wrong run-log value. Suggested
  fix, in the project file only: set the **Run-log folder:** value to
  `.scratch/agent-runs/` (stage-gate-project.md:13-14). The project
  file is not on the skill's agent-file list (`AGENTS.md`, `CLAUDE.md`,
  `.claude/**`, `.agents/**`), but it does change text that moved word
  for word. The other fix, in SKILL.md:558-562, edits approved text
  and needs the owner's approval.
- **Code quality, for one fix pass before round 2:**
  - **Q1 (A2, S2, S-spec1).** Rename the label at
    stage-gate-project.md:66 so that the entry reads as the old rule,
    "Name the model on every spawn except a GLM type's".
  - **Q2 (S1).** gate-planner.md:60, "that section". This is an
    agent file with owner-approved text, so the owner approves the
    edit before the fix. Suggested edit: name § Worker lanes, Planner
    in place of "that section". Q1 alone fixes most of the problem if
    the owner declines.
  - **Q3 (S4, second part).** Drop the repeated
    "(model-policy § Workhorse jobs)" at stage-gate-project.md:54.
  - **Q4 (S5, second part).** Remove the repetition between the label
    and the value at stage-gate-project.md:98-99.

The Disposition table below holds only the findings that were checked
and found not to be defects. The rows for A1 and Q1-Q4 get written
once their outcome is known (round 2, or the owner's ruling).

Tickets filed by this branch: 1 (726). Closed: 0. This branch filed
more tickets than it closed: 724 stays open until the merge, which its
close rule requires.

Round 2 (focused check) passed. It found three bookkeeping items and
no other finding; the round-2 Disposition table below gives each one
`wontfix`. After round 2: tickets filed by this branch: 2 (726, 727).
Closed: 0 (`git diff --name-status dev...HEAD --
'.scratch/carry-forward/issues/*.md'` lists 726 and 727 as `A`; the
closed-status grep counts 0). This branch filed more tickets than it
closed: 724 stays open until the merge, as its close rule requires.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                      |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3  | Adversarial | wontfix     | The planner reads the whole project file at Inputs (gate-planner.md:22-23). The **Judgment agent:** line opens § Worker lanes, which contains the named sub-heading, so the planner finds it. The approved text stays as it is.    |
| S3  | Standards   | wontfix     | Not added by this branch: each seat file had its own copy at 6fc7fb58, and step 1 moves text word for word. Merging the copies would change per-seat rules; ticket 726 (step 2) can take it up.                                    |
| S4  | Standards   | wontfix     | First part only (§ Session commands only points on). Plan N6 keeps that pointer by design. The repeated citation is Q3.                                                                                                            |
| S5  | Standards   | wontfix     | First part only (**Report folder:** gives a pointer). The plan's table gives this text exactly, and the pointer leads the reader to the report rule. The repeated fork-commands label is Q4.                                       |
| S6  | Standards   | wontfix     | True as written: the test resolves the hook and settings from its own path (`.claude/hooks/tests/subagent-foreground-helpers.py:22-24`).                                                                                           |
| A1  | Adversarial | fixed       | stage-gate-project.md:13 now reads: **Run-log folder:** `.scratch/agent-runs` (no trailing slash). With that value, SKILL.md:558 gives `.scratch/agent-runs/<session>.jsonl` and SKILL.md:562 gives `.scratch/agent-runs/*.jsonl`. |
| Q1  | Adversarial | fixed       | A2, S2 and S-spec1. stage-gate-project.md:65-69, owner-approved text 2026-10-27, now reads: **Name the model on every spawn:** every type except a GLM type (`glm-flash-task` here), which takes no model argument.                |
| Q2  | Standards   | fixed       | S1. Owner-approved text 2026-10-27. gate-planner.md:51-66 now says "Name the model on every spawn of every type except a GLM type." and names the **Report folder** line in § Folders, so no "that section" is left.               |
| Q3  | Standards   | fixed       | S4, second part. stage-gate-project.md:52-53 now reads: **Workhorse types:** the type `docs/agents/model-policy.md` § Workhorse jobs names. The second citation is gone.                                                           |
| Q4  | Standards   | fixed       | S5, second part. stage-gate-project.md:97-98 now reads: **In the pair (the pair path is the checkout path):** (fork commands: `-C <pair path>/vendor/tbc-new-fork`).                                                               |

## Focused check (round 2)

Dispatch note: the focused check ran in one fresh `general-task` agent
(Opus, effort high) that wrote none of the reviewed text; `codex` is not
on `PATH`. Main range `2e0e5b33..331c093b`; `dc6d91f0` in that range
changes only this review file. Fork range: none.
`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0,
so the branch never moves the fork pin and condition 3 holds. The
caller limited the check to the commits after round 1 and to the items
below.

1. **Conditions 1 to 3: pass, with one call recorded.** `a8c0d5a6`
   fixes A1, Q1, Q3 and Q4, which ticket 724's note names
   (724:104-116). `e2445fda` fixes Q2 with the owner-approved paragraph,
   replaces the Q1 entry with owner-approved text, and drops the
   trailing slash from the A1 value. Every changed line is at
   gate-planner.md:51-67 or at stage-gate-project.md:13, 52-53, 65-69 or
   99, the places those findings cite. `331c093b` adds ticket 727 and
   moves `NEXT` from 727 to 728. No Disposition row links 727, so taken
   literally it is none of condition 1's five kinds. It changes no rule
   text, and the caller asked for it to be checked here, so this check
   reviewed it in full rather than stopping.
2. **Diff changes only what each finding asks for: pass.** The
   `e2445fda` paragraph is wider than Q2's suggested edit; the owner
   approved it on 2026-10-27, as ticket 724's note records. The
   approved texts themselves are not in any file this check could
   read (searched `.scratch/` in the main checkout and worktrees), so
   the word-for-word match with the owner's approval is not checked
   here.
3. **New tests assert their findings: pass (no tests in range).**
   `git diff --stat dc6d91f0..HEAD` lists only agent docs, tickets,
   `NEXT` and this review file.
4. **Tests the fixes touch pass: pass.** `pnpm mirrors:check`
   (`python scripts/check_skill_mirrors.py`) rc=0, and
   `diff -r .claude/skills/stage-gate .agents/skills/stage-gate` rc=0.
   The ticket-724 test-of-general grep prints nothing (`grep` rc=1).

What else this check confirmed:

- **A1:** `**Run-log folder:** \`.scratch/agent-runs\``sits under
§ Folders (stage-gate-project.md:8, :13), the section SKILL.md:559
names. With the value substituted, SKILL.md:558 reads`.scratch/agent-runs/<session>.jsonl`and SKILL.md:562 reads "grep the`.scratch/agent-runs`folder's`*.jsonl`files". Both resolve to the
real log,`.scratch/agent-runs/<session>.jsonl` (main checkout).
- **Rules kept.** Each rule in the round-1 "Research by subagent" text
  is in the new one: judgment stays with the planner, blocks go to a
  workhorse helper, each helper is told what its report holds, the
  judgment agent only for judgment the planner cannot hold, at most 4
  helpers, report-file-only writes with the rule in § Folders, and
  naming the model on every spawn except a GLM type's. The new Q1
  entry keeps the old rule "Name the model on every spawn except a GLM
  type's" and its model-policy pointer.
- **Pointers.** § Worker lanes (:46), the **Judgment agent:** line
  (:48), the Planner part (:55), § Folders (:8), the **Report folder:**
  line (:15), model-policy § Lane is per job, not per parent (:107) and
  § Workhorse jobs (:282) all exist. `git grep` finds no pointer to the
  old labels "Spawns with no model argument" or "Fork commands in the
  pair".
- **Ticket 727** has the five header lines, `Status: open`, and
  `NEXT` moved in the same commit, as `docs/agents/issue-tracker.md`
  requires. Each quoted line matches its file: gate-planner.md:4,
  gate-planner.md:52-53, stage-gate-project.md:62-63,
  model-policy.md:334-338, log-agent-run.py:112 and :191, AGENTS.md:96,
  and `plan.md:146` in the main checkout. The run log
  `.scratch/agent-runs/c33da48e-1527-4d89-8989-f3c193ceffe9.jsonl`
  (main checkout) gives the four planner `stop` lines with `calls` 2,
  8, 2, 8 and `est_cost_usd` 0.6898, 1.0679, 0.7151, 1.1795, which the
  ticket rounds correctly.

Bookkeeping found (no other finding):

- **R2-1.** Ticket 724:113 says "The same commit also sets
  **Run-log folder:** to `.scratch/agent-runs`". The only fix commit the note names
  is `a8c0d5a6`, but `a8c0d5a6` set
  `.scratch/agent-runs/`; `e2445fda` removed the slash. Suggested text:
  "Commit `e2445fda`, which adds this note, also sets".
- **R2-2.** Round-1 Disposition rows cite stale lines: Q4 says
  stage-gate-project.md:97-98 (the label is at :98-99), and Q2 says
  gate-planner.md:51-66 (the rule ends at :67). The quoted text in both
  rows is right.
- **R2-3.** gate-planner.md:61-62, "The rule for report files is in
  that file's § Folders", follows a sentence that ends "its report
  file". Checked: a report file has no § Folders and no **Report
  folder** line, so only `docs/agents/stage-gate-project.md`, named
  at :54, fits. Round 1's text had the same "that file's § Folders".

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                        |
| ---- | ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-1 | Focused check | wontfix     | Bookkeeping in ticket 724's note; `git log` shows which commit set the value. The suggested text is above if the caller wants to apply it.           |
| R2-2 | Focused check | wontfix     | Bookkeeping: line numbers in round-1 rows are one line off; the quoted text is correct and findable by search.                                       |
| R2-3 | Focused check | wontfix     | Not a defect: the only file the rule names that has a § Folders and a **Report folder** line is `docs/agents/stage-gate-project.md`. Owner-approved. |
