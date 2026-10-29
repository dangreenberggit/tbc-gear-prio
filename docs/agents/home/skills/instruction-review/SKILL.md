---
name: instruction-review
description: Review a change to agent instructions - a skill, agent definition, AGENTS.md or CLAUDE.md, rule file, plan template, brief, hook or harness setting. Use before such a change counts as done or merges.
---

# Instruction review

A change to agent instructions fails in three ways that a code review
does not look for:

1. A sentence that an agent reads as an order nobody meant.
2. A clash with another instruction file.
3. A behaviour-changing rule counted as done before anyone ran it.

This skill checks for those three. The repo's own `AGENTS.md` (or
equivalent) supplies its values: where the report goes, which agent
types and models to spawn, and which review covers code.

## Inputs

- The change: old and new text (a diff, or `git show <base>:<path>` for
  the old version).
- The intent: what the change is meant to make agents do. Take it from
  the request, the ticket or the commit. If you have to infer it, write
  it down and label it as your reading.

## Pick the path

- **Light path:** a wording edit of one line that changes no rule (no
  change to who does what, when, or with what). Do check 1 only, with
  one reader.
- **Full path:** everything else, including any new file, new or changed
  rule, hook or setting. Do checks 1, 2 and 3, then the rubric pass.

When unsure, take the full path.

## Check 1: read it cold

Spawn one **cold reader** per changed file: a fresh-context agent that
gets only the text the receiving agent will see (the whole new file or
whole changed section, not the diff) and that agent's role ("You are the
planner that gets this brief"). Ask it: "Do a dry version of your job.
List every action you will take because of this text and every action
you will leave out, and quote the sentence behind each one." Keep the
intent out of its prompt.

Compare the cold reader's answer with the intent. Each of these is a
finding: an action the intent did not mean, a meant action it left out,
a sentence it quoted for a reason the author did not mean. Agents read a
plain statement of fact in instructions as an order, so check every
statement of fact the cold reader acted on.

Done when every changed sentence is either acted on as meant in the cold
reader's answer or listed as a finding.

## Check 2: clashes with other files

List every file the change names, points to, or hands work to. Follow
each hand-off one step further, to the file that defines the receiver:
the agent definition (project and user level), skill or script. Add the
hooks and settings that act on the same tools or events. Read each one.

- For each job the change gives another agent, quote the receiver's
  rule that allows that job in that form. A job the receiver's own
  definition refuses or hands back is a finding.
- For each rule the change adds, look for a file that says the opposite
  or gives a different value.
- For each command the change orders, check that permissions, sandbox
  rules and hooks let it run.

If you can run slash commands, also run `/doctor prompt-audit <changed
path>`. It does not read hooks or settings, so it adds to the reading
and does not replace it.

Done when you have a table of every file read, each marked "agrees" or
linked to a finding that quotes both sides.

## Check 3: trial run

A change that alters what an agent does is done only after one trial
run: a fresh agent does the real job once with the new text and once
with the old text as baseline, on the same input. This is the
skill-creator baseline method (snapshot the old version, run both,
compare). Pass means the new run shows the meant behaviour and the old
run does not, or, for a change meant to keep behaviour, both runs match.

If a trial is on record, cite it and check that it ran the current
text. If none is on record, run one when it fits the review's budget;
otherwise report "no trial run" as a blocking finding and write
down the trial to run: the input, and what each version should do. A
paper review, this one included, is not a trial run. A partial trial
counts as none: a run of the new text with no old-text run beside it,
or a run that stops before the agent hands work to the next agent,
leaves the blocking finding open.

Done when the report gives the trial's record and result, or the
blocking finding with the trial to run.

## Hooks and settings

A hook is code. This skill reviews what a hook does to agents: the text
it shows them (check 1), what it blocks or allows against other
instructions (check 2), and a trial (check 3) that feeds it a recorded
event on stdin, checks the exit code and output, then fires it once in a
live session. For the hook's code itself (logic, error handling,
security, tests), use the repo's code review as well.

## Rubric pass

Read the changed text against the `writing-for-agents` skill (upstream:
mattpocock/skills on GitHub): negation, no-ops, completion criteria,
duplication. A rubric finding is minor unless it also explains a
check 1 finding.

## Report

A findings table: check, `file:line`, quoted text, what an agent will
do wrong, severity (blocks, should fix, minor), and evidence (the cold
reader's quote, both clashing quotes, or the trial output). After the
table: the cold reader's answer as returned, the check 2 file table, and
the trial status.
