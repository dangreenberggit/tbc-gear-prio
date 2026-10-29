# Instruction review — chore/732-instruction-review

Reviewed range: `3c008f0d2cffcb8b9218287d762abea39f3ee542..ebbdb9281d5dd8d43738351ed62d4a26fb542bf6`
(`git diff dev...HEAD`: 2 files, 122 insertions).

Dispatch: every changed file is agent tooling (`docs/agents/` is in
`TOOLING_PATHS`, `scripts/check_merge_ready.py:174-188` on branch
`chore/731-tooling-review-exemption`), so this branch gets the
`instruction-review` skill in place of `pre-merge-review`. That rule is
on the unmerged 731 branch, not on `dev` (`git grep -n instruction-review
dev -- AGENTS.md docs/workflow.md .claude/skills/pre-merge-review`
prints nothing). Path: full (the branch adds a new file). Two cold
readers ran as fresh `general-task` agents on Opus, one per changed file.
No GLM type was used. No new trial of the skill ran in the review itself,
as the caller asked; a follow-up ran the K1 trial (§ Trial status).

Intent, from ticket 732 (`.scratch/carry-forward/issues/732-global-skill-for-reviewing-agent-instruction-changes.md`
§ The problem, § Where it lives, § Done when): a global skill that
checks the three failures (an unmeant order, a clash with another file,
a rule counted done before a trial), with a lighter path for small
changes; a staged copy in `docs/agents/home/` with install steps in its
README. The owner approved the skill text with one added sentence in
check 3 (caller's prompt).

## Copy check

`cmp docs/agents/home/skills/instruction-review/SKILL.md ~/.claude/skills/instruction-review/SKILL.md`
exits 0: the staged copy and the installed copy are byte-identical. The
session's config directory reaches the same file:
`readlink -f ~/.claude_router/skills/instruction-review` prints
`/home/daniel/.claude/skills/instruction-review` (`~/.claude_router/skills`
is a symlink to `~/.claude/skills`; `~/.claude_router/CLAUDE.md` and
`AGENTS.md` are symlinks into `~/.claude/` too).

## Findings

| ID  | Check   | file:line                        | Quoted text                                                                                                                 | What an agent will do wrong                                                                                                                                                            | Severity   | Evidence                                                                                                                                                                                                                                                                                                  |
| --- | ------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | Check 3 | SKILL.md:91-94                   | "A partial trial counts as none: a run of the new text with no old-text run beside it, or a run that stops before ..."      | The sentence is meant to change how a reviewer rates a partial trial. It was written after the trial on record, so no trial has run it.                                                | blocks     | `trial.md:4` says the trial ran a 118-line draft; the staged file has 121 lines (`wc -l`). `trial.md:176-179` proposes this edit after the trial ("not applied because the draft passed"). See § Trial status.                                                                                            |
| R1  | Check 2 | README.md:24 (before the fix)    | `cp docs/agents/home/skills/instruction-review/SKILL.md ~/.claude/skills/instruction-review/SKILL.md`                       | On a machine with no `~/.claude/skills/instruction-review/`, the copy fails and the skill is not installed. The two other lines copy into `~/.claude/`, which always exists.           | should fix | In `$TMPDIR`, `cp src <missing dir>/SKILL.md` printed `cp: cannot create regular file ... No such file or directory`, rc=1. README cold reader: "The third copy fails if the folder `~/.claude/skills/instruction-review/` does not exist yet."                                                           |
| R2  | Check 1 | README.md:1, :9, :27-29 (before) | "Staged copies of ~/.claude/AGENTS.md and ~/.claude/CLAUDE.md"; "including the two copies below"; "Both files are required" | The text around the new line still describes two files. An agent that verifies the install with the README's `ls` skips the skill, and cannot tell whether the skill copy is required. | should fix | README cold reader: "It names two files but copies three", "Its check only shows that the files exist ... It does not check the third file (`SKILL.md`)", "Is the skill copy required? The check leaves it out, which suggests no."                                                                       |
| R3  | Check 1 | README.md:21-29                  | relative `cp` sources; "Verify with `ls ...`"; "On the WSL host"                                                            | The commands fail outside the repo root; `ls` passes on an old copy; the README does not say WSL or Windows.                                                                           | minor      | README cold reader, § Where the text is unclear. All three were in the README before this branch; the new line follows the same style.                                                                                                                                                                    |
| S1  | Check 1 | SKILL.md:27-35                   | "Light path: a wording edit of one line that changes no rule"                                                               | The skill does not say whether the path is chosen per branch or per file. The reader took the full path for the whole branch, which is the safe choice the skill names.                | minor      | Skill cold reader Q2, quoting "When unsure, take the full path."                                                                                                                                                                                                                                          |
| S2  | Check 1 | SKILL.md:80-85                   | "A change that alters what an agent does is done only after one trial run" / "Do checks 1, 2 and 3"                         | On the full path, a reviewer cannot tell whether a wording line that keeps behaviour also needs a trial.                                                                               | minor      | Skill cold reader Q3 quotes all three sentences.                                                                                                                                                                                                                                                          |
| S3  | Check 1 | SKILL.md:88                      | "run one when it fits the review's budget"                                                                                  | "Budget" is not defined, so the reviewer picks between running a trial and reporting it blocked. Both choices end with the gap on record, so no wrong outcome follows.                 | minor      | Skill cold reader Q10.                                                                                                                                                                                                                                                                                    |
| S4  | Check 1 | SKILL.md:117-118                 | "severity (blocks, should fix, minor)"                                                                                      | Only "no trial run" and rubric findings get a stated severity; the reviewer picks the rest.                                                                                            | minor      | Skill cold reader Q13.                                                                                                                                                                                                                                                                                    |
| S5  | Check 2 | SKILL.md:80-82                   | "a fresh agent does the real job once with the new text and once with the old text"                                         | In this repo, a trial of a `gate-*` seat change cannot spawn that seat directly. The skill leaves agent types to the repo, and this repo's AGENTS.md does not name a type for a trial. | minor      | Harness agent list: `gate-planner` "Spawn only via the stage-gate skill" (same for the other `gate-*` types). SKILL.md:15-17: "The repo's own `AGENTS.md` ... supplies its values: ... which agent types and models to spawn". `trial.md:22-25` shows the trial used `general-task` in place of the seat. |
| S6  | Check 1 | SKILL.md:15-17, :82-83, :110-111 | "The repo's own `AGENTS.md`"; "snapshot the old version, run both"; "upstream: mattpocock/skills on GitHub"                 | Edge cases the reader flagged: which `AGENTS.md` to use when the branch changes it, how to run the old text, and local or upstream `writing-for-agents`. Each has an obvious default.  | minor      | Skill cold reader Q1, Q11, Q14. `ls ~/.claude/skills/writing-for-agents` fails; the repo copy is `.claude/skills/writing-for-agents`.                                                                                                                                                                     |

No finding in the rubric pass beyond S1-S4, which are also completion
and negation points of the `writing-for-agents` kind; none explains a
check 1 finding of higher severity.

## Check 2 file table

| File or setting                                                                                                     | Why read                                         | Result                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (this repo, `dev`)                                                                                      | SKILL.md:15-17 takes its values from it          | agrees: § Subagent reports gives the report path; § Spawning gives agent types and models                                                                                                                                                       |
| `.claude/skills/pre-merge-review/SKILL.md`, `docs/workflow.md`, `AGENTS.md` on `chore/731-tooling-review-exemption` | the rule that sends tooling branches here        | agrees: "Run `instruction-review` in place of this skill" (pre-merge-review § Agent-tooling branches); workflow.md step 4 says a review file that exists is still checked, so the Disposition table below uses only `fixed`, `defer`, `wontfix` |
| `scripts/check_merge_ready.py` `TOOLING_PATHS` (731 branch, lines 174-188)                                          | which files count as tooling                     | agrees: `docs/agents/` is listed, so both changed files are tooling                                                                                                                                                                             |
| `docs/agents/known-traps.md` § Before writing a review Disposition table                                            | the gate that reads this file                    | agrees: owner items are kept out of the table, because a row with no disposition word fails the gate                                                                                                                                            |
| `.claude/skills/writing-for-agents`                                                                                 | SKILL.md:110 rubric                              | S6: present in this repo only, not in `~/.claude/skills/`; the skill names the upstream                                                                                                                                                         |
| `anthropic-skills:skill-creator`                                                                                    | SKILL.md:82-83 baseline method                   | agrees: listed in this session's skills                                                                                                                                                                                                         |
| `/doctor prompt-audit`                                                                                              | SKILL.md:71-73                                   | agrees: `grep -c -a prompt-audit` on the Claude Code 2.1.309 binary prints 15; `trial.md:169-172` shows a subagent cannot run it, and the skill already says "If you can run slash commands"                                                    |
| `gate-*` agent definitions (harness agent list)                                                                     | receivers of a trial in this repo                | S5                                                                                                                                                                                                                                              |
| Subagent foreground hook                                                                                            | acts on the Agent tool the skill uses            | agrees: `trial.md:57` shows it ran the trial agents in the foreground; both cold readers in this review also returned in the foreground                                                                                                         |
| Sandbox `denyWithinAllow` (`/home/daniel/.claude/skills`, `/home/daniel/.claude/CLAUDE.md`)                         | the README's copy commands                       | agrees: agents cannot run the copy, and README.md:18-19 gives it to the user ("the user runs the copy in their own terminal")                                                                                                                   |
| `~/.claude/hooks/agent-guard.py` as described in README.md:3-16                                                     | the README's copy commands                       | agrees: the user's terminal is not under the hook; R2 covers "the two copies below" at line 9                                                                                                                                                   |
| `~/.claude_router/skills`, `CLAUDE.md`, `AGENTS.md`                                                                 | does a copy into `~/.claude/` reach this session | agrees: all three are symlinks into `~/.claude/` (`ls -la`, `readlink -f`). This disproves the README cold reader's hypothesis that the copy might not reach sessions.                                                                          |

## Trial status

**The skill as a whole: trial on record, passed, but on an older text.**
`.scratch/agent-reports/2026-10-29-instruction-review-draft/trial.md`
records a known-answer trial with a baseline: three defects, a reviewer
following the draft against a reviewer told only "Review this change to
agent instructions", six `general-task` agents on Opus. Result
(`trial.md:9-17`): the draft reviewers found all three defects; both
baseline reviewers missed defect 3 (no trial run). The trial ran a
118-line draft (`trial.md:4`). The staged and installed file has 121
lines; the difference is the sentence the owner added at SKILL.md:91-94
("A partial trial counts as none: ..."), which `trial.md:176-179`
proposed after the trial.

**The added sentence: trial run, both versions block (K1).** Before
the follow-up, no trial had run the sentence. The evidence that the old
text did not rate a partial trial as blocking was draft run 1
(`trial.md:142-154`), which found the missing helper trial but said
"Nothing blocks".

Set-up, 2026-10-29:

- Old text: the staged SKILL.md with the sentence "A partial trial counts
  as none: ... leaves the blocking finding open." deleted, 118 lines. New
  text: the staged SKILL.md, 121 lines, `cmp` against the staged file
  exits 0. `diff` of the two shows only that sentence (SKILL.md:91-94).
  Each was copied to a neutral path in `$TMPDIR` (`copy-a`, `copy-b`).
- Input: the item 7 case from `trial.md:49`, the command
  `git -C /home/daniel/Code/lulz/tbc-gear-prio diff dev chore/729-test-result -- .claude/agents/gate-reviewer.md`,
  with the Limits of `trial.md:51-56`: `.scratch/`, `docs/reviews/` and
  commit messages out of reach, no `gate-*` types, no stage-gate run, a
  trial of at most one agent run, writes only under `$TMPDIR`. Both
  reviewers were also told not to load the installed `instruction-review`
  skill or read `~/.claude/skills/instruction-review/`.
- A recorded partial trial, written for this test and given to both
  reviewers: a run of the new item 7 text by one `general-task` agent,
  through its hand-off (the `# Round 1` section and its final message),
  that "behaved as written". Its last line: "No run of the old text was
  made."
- Two `general-task` reviewers on Opus, sent in one message. The prompts
  were the same except for the skill file path, and neither was told
  what was being tested. No GLM type was used.

Result: **both reviewers rated the missing old-text run as blocks.** By
the caller's pass rule this is a pass, but this pair shows no
difference in the rating from the sentence.

- Old text (agent a0f67b36147b06b80, 594 s, 18 tool uses): "One thing
  blocks: the trial is not complete. A complete trial runs the old text
  as a baseline on the same input as the new text, and nobody has done
  that run." Its finding 1, severity **blocks**, quotes the record: "No
  run of the old text was made." It then used its one agent run on a
  second new-text trial: "My own trial ran the current text (blob
  `d8ec5d7a`), but I was allowed only one agent run, so there is no
  old-text run to compare it with."
- New text (agent a8d2fb3e65a1b99e7, 493 s, 14 tool uses): "One finding
  blocks. The trial record ran only the new text. [...] Under the
  skill's check 3, that counts as no trial." Its trial status: "It is
  new text only, so it is partial and leaves finding 1 open." It ran no
  trial of its own: "My budget allowed one agent run, and a trial needs
  two runs, new text and old text, on the same input."

The one observed difference is in what each reviewer did, not in how it
rated the gap. The old-text reviewer spent its run on another new-text
trial. The new-text reviewer used the sentence's words ("partial",
"leaves [...] open") and did not start a run that could not be
complete. One pair cannot show that this difference comes from the
sentence and not from chance (hypothesis, untested).

Limits of this trial: it tests only the first part of the sentence (a
new-text run with no old-text run beside it). The second part (a run
that stops before the hand-off) was not tested; draft run 1's case is
the one that tests it. The record's explicit last line makes the gap
easy to see. The inputs (`$TMPDIR/k1-trial/`) are temporary and are not
kept.

**The README line:** it changes what the user runs, not what an agent
does, so check 3 does not apply. The fixed block was run as written
against a fresh home: from the worktree root with `HOME=$TMPDIR/fakehome732`
(only `~/.claude/` present), `bash -e` on the README's code block exited
0, and `cmp` of the installed skill against the staged copy exited 0.

## Cold reader answers as returned

The only change to each answer below is that its headings are moved
down two levels so they stay inside this section.

### Skill cold reader (agent ac0b3f3e321f6986b)

Role given: a reviewer told "Load the `instruction-review` skill and
follow it to review branch `chore/example` against `dev`", where the
branch adds a rule to `.claude/agents/planner.md` and changes one
wording line in `AGENTS.md`. It got the full SKILL.md text and no
intent.

#### Dry run of the instruction-review skill: full path, 13 steps, 15 unclear points

I would take the full path for the whole branch. That means: read both versions of the two files, spawn two cold readers, read every file the change hands work to, and then either run a two-version trial of the planner rule or report "no trial run" as blocking. After that I would do the rubric pass and write the findings table. I worked only from the skill text you gave me: I read no file, ran no command and spawned no agent. Fifteen places leave me a choice or are unclear. The ones that matter most:

- **Which `AGENTS.md`:** the skill takes its settings from `AGENTS.md`, and the branch changes that file.
- **Light path:** it is not clear whether the light path can apply to one file of a branch.
- **Trial for the wording line:** it is not clear whether check 3 applies to the `AGENTS.md` wording line.
- **Budget:** the "budget" that decides whether I run the trial is not defined.

#### Actions, in order

1. **Get the old and new text of both files.** I diff `dev...chore/example`, and run `git show dev:.claude/agents/planner.md` and `git show dev:AGENTS.md`.
   Source: "The change: old and new text (a diff, or `git show <base>:<path>` for the old version)."

2. **Find the intent.** My caller's request says only "review", so I look for a ticket or the commit messages. If neither states the intent, I write my own reading and label it as such.
   Source: "Take it from the request, the ticket or the commit. If you have to infer it, write it down and label it as your reading."

3. **Read the repo's `AGENTS.md` for its settings.** These are the report location, the agent types and models to spawn, and which review covers code. This sentence is a plain statement of fact. I act on it as an order to read the file.
   Source: "The repo's own `AGENTS.md` (or equivalent) supplies its values: where the report goes, which agent types and models to spawn, and which review covers code."

4. **Take the full path for the whole branch.** The planner change is a new rule. Even if the `AGENTS.md` edit changes no rule, the branch as a whole is not "a wording edit of one line".
   Sources: "Full path: everything else, including any new file, new or changed rule, hook or setting." and "When unsure, take the full path."

5. **Check 1: spawn two cold readers, one for each changed file.**
   - Each one is a fresh-context agent. It gets the whole new text, not the diff, plus a role:
     - For `planner.md`: "You are the planner that this agent definition defines."
     - For `AGENTS.md`: a role for an agent in this repo. Which role is unclear (see Q5 below).
   - I ask each one, word for word: "Do a dry version of your job. List every action you will take because of this text and every action you will leave out, and quote the sentence behind each one."
   - I leave the intent out of both prompts.
   - The agent type and model come from step 3.

   Sources: "Spawn one **cold reader** per changed file", "gets only the text the receiving agent will see (the whole new file or whole changed section, not the diff)", and "Keep the intent out of its prompt."

6. **Compare each answer with the intent.** Three things count as findings:
   - an action the intent did not mean;
   - a meant action the reader left out;
   - a sentence quoted for a reason the author did not mean.

   I also check every statement of fact the reader acted on. I stop when every changed sentence is either acted on as meant or listed as a finding.
   Sources: "Each of these is a finding: …", "check every statement of fact the cold reader acted on." and "Done when every changed sentence is either acted on as meant … or listed as a finding."

7. **Check 2: list and read the related files.** I list every file the two changes name, point to or hand work to. I follow each hand-off one step further, to the receiver's own definition at both project and user level. I add the hooks and settings that act on the same tools or events, and I read all of them.
   Source: "List every file the change names, points to, or hands work to. Follow each hand-off one step further … Add the hooks and settings that act on the same tools or events. Read each one."

8. **Check 2: run three tests.**
   - For each job the planner rule gives another agent, I quote the receiver's rule that allows that job in that form.
   - For the new planner rule, and for the `AGENTS.md` line if it turns out to be a rule, I search for a file that says the opposite or gives a different value. The two changed files are also checked against each other.
   - For each command the new rule orders, I check that permissions, the sandbox and hooks let it run.

   I then build the file table, marking each file "agrees" or linking it to a finding that quotes both sides.
   Sources: the three bullets under Check 2, and "Done when you have a table of every file read …".

9. **Check 2: `/doctor prompt-audit` only if I can run slash commands.** I run `/doctor prompt-audit .claude/agents/planner.md` and the same for `AGENTS.md`, but only if slash commands are available to me. As a subagent I expect they are not (hypothesis, untested). If they are not, I say so in the report.
   Source: "If you can run slash commands, also run `/doctor prompt-audit <changed path>`."

10. **Check 3: look for a trial already on record.** If one exists, I cite it and confirm it ran the current text.
    Source: "If a trial is on record, cite it and check that it ran the current text."

11. **Check 3: run a trial or report its absence.** If no trial is on record, I run one if it fits the budget:
    - A fresh planner agent does a real planning job twice on the same input, once with the new `planner.md` and once with the `dev` version.
    - Each run continues until the planner hands work to the next agent.
    - Pass means the new run shows the meant behaviour and the old run does not.

    If I do not run it, I report "no trial run" as a blocking finding. I write down the trial to run: the input, and what each version should do. My own review never counts as a trial.
    Sources: "run one when it fits the review's budget; otherwise report "no trial run" as a blocking finding and write down the trial to run", "A paper review, this one included, is not a trial run." and "a run that stops before the agent hands work to the next agent, leaves the blocking finding open."

12. **Rubric pass.** I read both changed texts against the `writing-for-agents` skill for negation, no-ops, completion criteria and duplication. A rubric finding is minor unless it explains a check 1 finding.
    Source: "Read the changed text against the `writing-for-agents` skill … A rubric finding is minor unless it also explains a check 1 finding."

13. **Write the report.**
    - A findings table with these columns: check, `file:line`, quoted text, what an agent will do wrong, severity (blocks / should fix / minor), and evidence.
    - After the table: each cold reader's answer as returned, the check 2 file table, and the trial status.
    - The report goes where `AGENTS.md` says (step 3).

    Source: "A findings table: … After the table: the cold reader's answer as returned, the check 2 file table, and the trial status."

#### Actions I leave out

- **The light path, or check 1 alone.** The branch is not a single wording edit. Source: "Light path: a wording edit of one line that changes no rule".
- **The "Hooks and settings" trial and the code review of a hook.** The branch changes no hook or setting. Source: "A hook is code. This skill reviews what a hook does …". I still read related hooks and settings in step 7.
- **Giving a cold reader the diff or the intent.** Source: "not the diff" and "Keep the intent out of its prompt."
- **Counting this review, or a run of the new text only, as a trial.** Source: "A partial trial counts as none".
- **Fixing the change, committing or merging.** The skill orders none of these. It only says "Use before such a change counts as done or merges", which describes when to use it, not an action for me.

#### Places where the text leaves a choice or is unclear

- **Q1. Which `AGENTS.md` gives the settings?** "The repo's own `AGENTS.md` … supplies its values." The branch changes `AGENTS.md`, and nothing says whether to use the `dev` version or the branch version. If the changed line is one of those settings, the review's own setup depends on the change being reviewed.
- **Q2. Is the path chosen per branch or per file?** "Pick the path" does not say. The `AGENTS.md` line alone could fit the light path ("a wording edit of one line that changes no rule"). I fall back on "When unsure, take the full path" for both files. I also cannot know whether the line "changes no rule" until I have read it.
- **Q3. Does check 3 apply to the `AGENTS.md` line?** Three sentences point different ways:
  - "A change that alters what an agent does is done only after one trial run" limits check 3 to behaviour changes.
  - "for a change meant to keep behaviour, both runs match" implies behaviour-keeping changes get a trial too.
  - The full path says "Do checks 1, 2 and 3".
- **Q4. Whole file or changed section?** "the whole new file or whole changed section" is a choice. For `planner.md` I would give the whole file, because the planner sees the whole file. For `AGENTS.md` either could work.
- **Q5. What role does the `AGENTS.md` reader get?** "that agent's role" assumes there is one receiving agent. `AGENTS.md` is read by every agent in the repo, and the skill does not say which role to give.
- **Q6. Does the planner reader also get `AGENTS.md`?** A planner in this repo also sees `AGENTS.md`. "gets only the text the receiving agent will see" could mean the changed file only, or everything the planner sees.
- **Q7. How far does the clash search go?** "look for a file that says the opposite" sets no limit. It could mean only the files listed in step 7, or every instruction file in the repo and at user level.
- **Q8. Does "the change" mean the changed line or the whole file?** For the one-line `AGENTS.md` edit, "every file the change names, points to, or hands work to" could mean either.
- **Q9. Where is a trial "on record"?** The skill does not say where to look: commits, a ticket, or an earlier review file.
- **Q10. What is "the review's budget"?** It is not defined. This one undefined word decides whether I run the trial or report a blocking finding.
- **Q11. How do I run the old text?** "snapshot the old version, run both" does not say how. A planner normally loads `.claude/agents/planner.md` from disk. Running the `dev` version may need a separate worktree, or the old text passed in as the prompt. The skill does not say whether the reviewer may write files to do this.
- **Q12. Who receives the planner's hand-off?** "a run that stops before the agent hands work to the next agent" requires me to know the next agent. The skill does not name it, so I would find it from `planner.md`.
- **Q13. What severity do check 1 and check 2 findings get?** "blocks, should fix, minor" is listed, but only "no trial run" is given a level (blocking). A rubric finding that explains a check 1 finding has no stated level either.
- **Q14. Local or upstream `writing-for-agents`?** The rubric names "upstream: mattpocock/skills on GitHub". A repo copy may also exist, and the skill does not say which one to use.
- **Q15. Can a subagent run `/doctor`?** "If you can run slash commands" leaves this to me. I expect a subagent cannot (hypothesis, untested).

(The answer's own "Summary for the user" section repeated the four main
gaps above and is left out.)

### README cold reader (agent aaed1b268ab3fe421)

Role given: an agent told "The staged global files in
`docs/agents/home/` changed. Follow `docs/agents/home/README.md` to get
them live on this machine, then verify." It got the full README text as
it was before the R1 fix.

#### Dry run: the user runs the three copies and I only verify, but the README's check cannot show that the new text is live

I would not run any of the three `cp` commands. The README says "**the user runs the copy in their own terminal**". My part is to give the user the commands, wait for them to say the copy is done, and then run the README's `ls` check.

The README has gaps a reader would trip on:

- It names two files but copies three.
- Its check only shows that the files exist, so it would also pass on an old copy.
- Its copy commands use relative paths.
- The third copy fails on a machine that does not already have the skill's folder.
- It does not say whether "this machine" means WSL or Windows.

#### Actions, in order

**1. Read the README.** The prompt already supplies it, so this step is done.

**2. Optional, and not in the README: compare the staged files with the live ones before anyone copies.** This would be read-only, for example `diff docs/agents/home/AGENTS.md ~/.claude/AGENTS.md`, and the same for the other two files. The reason: "the copies in `~/.claude/` are not versioned", and `cp` overwrites without a backup. This is my choice, not something the README asks for.

**3. Do not run the copies. Give them to the user, ready to paste.** Behind this: "The files are versioned here, and **the user runs the copy in their own terminal**". When the commands can fail:

- **The terminal is not at the repo root.** All three source paths are relative. The README also does not say which checkout to run from.
- **The skill folder does not exist yet.** `cp ... ~/.claude/skills/instruction-review/SKILL.md` fails if `~/.claude/skills/instruction-review/` is missing, because `cp` does not create folders. `mkdir -p` first would avoid it, but the README does not say so.
- **The terminal is on Windows, not WSL.** In a Windows shell, `~/.claude` would point to the Windows home.
- **A missing source file** in that checkout.

**4. Wait for the user to say the copy is done.** Behind it: "Until the copy is run, nothing in this directory is live."

**5. Run the check.** Behind this: "Verify with `ls ~/.claude/AGENTS.md ~/.claude/CLAUDE.md`." It proves only that the files exist, and it does not check the third file (`SKILL.md`).

**6. Report.**

#### Actions I leave out, and why

| Action                                          | Sentence behind it                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Running the `cp` commands myself                | "the user runs the copy in their own terminal". The hook paragraph says such a write "goes ahead", but that is not permission. |
| Editing the staged files                        | "Edit here first, then re-copy".                                                                                               |
| Renaming `CLAUDE.md.install` in the repo        | "a real `CLAUDE.md` here would be auto-discovered as project context"                                                          |
| Any write to `settings.json` or `hooks/`        | "The hook refuses an agent's writes to ..."                                                                                    |
| Writing through a script to get around the hook | "It does not see a write made inside a script or an interpreter one-liner." This describes a gap, not a permission.            |

#### Where the text is unclear

- **"Both files are required"** and the title talk about two files, but the code block copies three. Is the skill copy required? The check leaves it out, which suggests no.
- **"Verify with `ls ...`"** confirms existence, not content.
- **"this machine"** against "On the WSL host" and "the Windows home".
- **Which checkout** to run the copy from is not stated.
- **Why the hook paragraph is there.** It tells an agent its own write to the copy targets "goes ahead". That invites an agent to do the copy, against the next paragraph.

#### Outside the README (session context only, no file read)

- This session loaded its global instructions from `/home/daniel/.claude_router/CLAUDE.md`. If Claude Code reads its user settings from `~/.claude_router` and not from `~/.claude`, copying to `~/.claude/CLAUDE.md` may not change what sessions load (hypothesis, untested). [Reviewer's note: disproved, see the check 2 table.]
- The sandbox blocks writes to `/home/daniel/.claude/CLAUDE.md` and `/home/daniel/.claude/skills`, which matches the README's rule that the user runs the copy.

(This answer is shortened: its step 3 and 5 sub-bullets, and its own
"Summary for the user" and "Needed from you" sections, which repeated the
points above, are left out. The full text is in agent aaed1b268ab3fe421's
transcript.)

## Needed from the owner

Nothing open from this review. The caller asked for both follow-ups
named here before: the K1 trial (option 1, result in § Trial status)
and the R2 wording (README.md:1, :9, :28-32 now).

## Disposition

| ID  | Axis    | Disposition | Ticket / note                                                                                                                                                                                               |
| --- | ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | Check 3 | fixed       | trial run 2026-10-29 (§ Trial status): both the old-text and new-text reviewer rated the missing old-text run blocks; no observed difference from the sentence in one pair; first part of the sentence only |
| R1  | Check 2 | fixed       | README.md:24 now `mkdir -p ~/.claude/skills/instruction-review` before the `cp`; the block exits 0 against a fresh home, `cmp` exits 0                                                                      |
| R2  | Check 1 | fixed       | README.md title names the skill; "the copies below"; one sentence says the skill copy installs the global `instruction-review` skill; the `ls` check lists `SKILL.md`                                       |
| R3  | Check 1 | wontfix     | relative paths, existence-only `ls` and WSL-or-Windows were in the README before this branch; the new line follows the file's style                                                                         |
| S1  | Check 1 | wontfix     | minor; the reader took the safe full path the skill names; the skill text is owner-approved and this review edits none of it                                                                                |
| S2  | Check 1 | wontfix     | minor; same reason as S1                                                                                                                                                                                    |
| S3  | Check 1 | wontfix     | minor; both choices leave the gap on record, so no wrong outcome follows; skill text not edited                                                                                                             |
| S4  | Check 1 | wontfix     | minor; same reason as S1                                                                                                                                                                                    |
| S5  | Check 2 | wontfix     | minor; the skill leaves agent types to the repo; the earlier trial used `general-task` in place of a seat (`trial.md:22-25`)                                                                                |
| S6  | Check 1 | wontfix     | minor; each edge case has an obvious default; skill text not edited                                                                                                                                         |
