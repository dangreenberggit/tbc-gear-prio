# Pre-merge review — feat/subagent-reports

Reviewed range: `12b3391960eedfcb864aaca9f8e229c84734fe76..fbf937435c3634eb88af376a59ce167c1aae3caa`

## Dispatch

Small-change lane (round 1): one fresh reviewer covering all axes.

`git diff --shortstat dev...HEAD`:

```text
 5 files changed, 26 insertions(+), 14 deletions(-)
```

`git diff --name-only dev...HEAD`:

```text
.claude/agents/design-task.md
.claude/agents/gate-planner.md
.claude/agents/gate-reviewer.md
.claude/agents/general-task.md
AGENTS.md
```

5 files (at most 6) and 40 changed lines (at most 150); no path under
`data/`, `vendor/` or `packages/core/src/`, and none with `.generated.`.
`codex` is not on `PATH`, so the reviewer is a fresh `general-task` agent,
model `opus` (review lane). The domain brief is skipped: the diff changes
agent instructions only and has no game-domain content.

The approved intent is the owner's approval of this wording on 2026-10-16
(reported by the session that dispatched this review) and the design in
`.scratch/plans/agent-setup-2026-10/t3-orchestration-subplan.md` § 2.3
(gitignored, main checkout). The review checks the edits against that
intent and against the other agent docs; it does not reopen the design.

## Adversarial

One fresh reviewer (`general-task`, model `opus`) covered the adversarial
brief and the `code-review` Standards and Spec checks. It wrote nothing.
Its line citations were spot-checked by the dispatching agent with `sed -n`
on each cited file at `fbf93743`.

No finding is a silent wrong result: in each case an agent meets two texts
that disagree and has to choose, and none of the choices damages the tree,
because `.scratch/agent-reports/` is gitignored
(`git check-ignore -v .scratch/agent-reports/x.md` prints `.gitignore:43:.scratch/*`).

- **R2 — four agent definitions still forbid the report file.**
  `.claude/agents/simple-task.md:11-12`, `discrete-task.md:17-18` and
  `modest-task.md:11-13` say a prompt that allows no path is read-only;
  `design-task.md:8-16` changes no file except a named plan file, and with
  none "your plan or recommendation is your final message". `AGENTS.md:177`
  applies the rule to every subagent and allows the file "even when the
  prompt allows no other path"; the branch added that exception only to
  `general-task.md:11`. The design (§ 2.3, "every other delegated task")
  includes these types. An agent of these types either breaks its own
  definition or breaks `AGENTS.md`; a `design-task` with no plan file
  most likely keeps returning the full plan. Gap against intent,
  introduced by this branch: blocks the merge unless the owner allows a
  defer.
- **R4 — report files written inside a worktree that is later removed.**
  The duty to "name a path in their own checkout" is only in
  `AGENTS.md:177`. The two callers that spawn `general-task` workers into
  removable worktrees, the parallel-phase Delegator
  (`.claude/skills/parallel-phase/SKILL.md:38`, step 3) and `gate-executor`
  (`.claude/agents/gate-executor.md:97-101`), were not updated, and
  `AGENTS.md:179` ("Stage-gate seats (`gate-*`) follow their definitions
  … instead") can be read as exempting `gate-executor` as a caller. A
  worker then writes the default path in its own worktree, and teardown
  deletes it, so the path in its handoff points at nothing. That the
  default path resolves inside the worker's worktree and that
  `git worktree remove --force` deletes ignored files is `hypothesis,
untested` (git's documented behaviour, not run). The handoff template
  takes precedence, so most content is in the message anyway. Loud failure
  (missing file when looked for), introduced by this branch: blocks the
  merge unless the owner allows a defer.

## Domain

Skipped: the diff changes agent instructions only and has no game-domain
content.

## Standards + Spec

**Spec:** the new `### Subagent reports` section matches the approved
design in § 2.3: condensed message with conclusion, sourced claims, a line
on what the file holds, and the path; no length cap; the caller reads the
file only when it needs a detail; stage-gate seats unchanged. The
researcher "at most 40 lines" caps in `gate-planner`, `gate-reviewer` and
`design-task` were replaced as § 2.3 asks. R2 above is the one gap
against intent.

**Standards:** no banned word in the added lines; both commit subjects
follow the seven rules. Wording findings R1, R3, R5 are under
`## Code quality`.

Checked and not defects (reported by the reviewer, not re-run here unless
stated): `git grep -n -i -E "40 lines|at most 40|change no files"` at
`fbf93743` finds only `.claude/skills/stage-gate/parts.md:93` and its
mirror, which is the planner's own digest (a gate seat, exempt); every
"AGENTS.md § Subagent reports" reference resolves to `AGENTS.md:175`; the
gate-reviewer `REFUTED:`/`NOT REFUTED:` format and the pre-merge-review
fixer's "in your final message" list are prompt-named formats that take
precedence; the `TRIAL-REJECT` line stays in the condensed message as the
check's conclusion; `.claude/hooks/log-agent-run.py:33` parses only a
`## Decisions` heading; `<UTC date>` has no stated format, which is
cosmetic since the absolute path is returned.

## Code quality

- **R1 — `general-task.md` makes the report file unconditional.**
  `.claude/agents/general-task.md:25-29`: "every fact, with the command or
  file it came from, goes in the report file" has no condition, against
  the skip clause at `AGENTS.md:179`, and can be read as moving sources out
  of the message, against `AGENTS.md:177`. Suggested text: "Open your final
  message with the conclusion in plain English and return the condensed
  report (AGENTS.md § Subagent reports): each important claim with the
  command or file it came from, and the rest of the evidence in the report
  file unless that section says to skip it. Label each claim you did not
  check `hypothesis, untested`. When the prompt names a handoff template,
  use it."
- **R3 — unstated whether "you write nothing" overrides the report file.**
  `AGENTS.md:177,179` and `general-task.md:10-12`. pre-merge-review
  `SKILL.md:89` tells every axis it writes nothing, and
  `.agents/reviews/adversarial.md:53` says "Edit no file". "A format or
  template the prompt names takes precedence" covers format, not a write
  ban. Suggested text after "takes precedence." at `AGENTS.md:179`: "So
  does a prompt that forbids all writes, such as a review axis told it
  writes nothing: that agent returns its whole report in its final
  message."
- **R5 — the session's read list names only the default folder.**
  `AGENTS.md:161` permits reading only `.scratch/agent-reports/`, while
  `AGENTS.md:177` lets the prompt name another path. Suggested text:
  "- reading a subagent's report file (AGENTS.md § Subagent reports) for a
  detail the condensed report leaves out". The reviewer called this
  bookkeeping; it is an `AGENTS.md` line, not this review file, so it is
  recorded here.

## Summary

Round 1 found five findings, all in agent files: two that block the merge
(R2 gap against intent, R4 loud failure) and three code-quality rows (R1,
R3, R5). No data loss and no silent wrong result.

Every fix edits `AGENTS.md` or `.claude/agents/*.md`, so per this skill
("Agent files", step 3) all five go to the owner as one approval before
any fix is made. The review stops here pending that approval: no fix
commit, no `## Disposition` table yet, no round 2, and
`pnpm merge-to-dev --check-only` not run. After approval: one fixer
applies R2 and R4, one workhorse pass applies R1, R3 and R5, then round 2
(focused check) runs over `fbf93743..HEAD`.

Tickets filed: 0. Tickets closed: 0.

## Owner approval of the agent-file fixes

Owner, 2026-10-16, asked to approve the whole batch (R1-R5 as suggested
in this file, plus E1 and E2 below): "Sure". Reported by the session
that dispatched round 2.

- **E1** (owner addition, part of R2's fix): in `AGENTS.md` § Subagent
  reports, after "it is allowed even when the prompt allows no other
  path.", three sentences saying that Claude Code's built-in note against
  report files does not apply to this file, and that the file name must
  not start with report, summary, findings or analysis. With E1 in
  `AGENTS.md`, R2's edits to the four agent files need no clause about
  the built-in note.
- **E2** (owner addition, part of R1's fix): R1's suggested text, with
  its first parenthesis extended to "(AGENTS.md § Subagent reports;
  Claude Code's note against report files does not apply to it)".

R2 and R4 had no suggested text in round 1; the wording of their fixes
is the fixer's, inside the approved scope.

## Fixes

| Finding         | Commit     | Files                                                                                                                                            |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| R2              | `06703de4` | `.claude/agents/{simple,discrete,modest,design}-task.md`                                                                                         |
| R4              | `94bf869c` | `AGENTS.md`, `.claude/agents/gate-executor.md`, `.claude/skills/parallel-phase/SKILL.md` and its mirror `.agents/skills/parallel-phase/SKILL.md` |
| E1 (R2)         | `e5478faf` | `AGENTS.md`                                                                                                                                      |
| R1 + E2, R3, R5 | `02b5bd2e` | `.claude/agents/general-task.md`, `AGENTS.md`                                                                                                    |

The code-quality pass (R1, R3, R5) was applied by the agent that handles
this review's findings, not by a separate workhorse agent as step 3 of
the skill says: the owner approved the exact text, so the pass was a
verbatim edit. Round 2 reads it like any other fix.

Reviewed range: `fbf937435c3634eb88af376a59ce167c1aae3caa..02b5bd2ed9cc46a209c4299c638c050743eed0f9`

`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0: the
branch never moves the fork pin, so there is no fork range and condition 3
of the focused check holds.

## Focused check (round 2)

One fresh reviewer (`general-task`, model `opus`), over
`fbf93743..22b8eeeb` (the fixes end at `02b5bd2e`; `b5a965eb` and
`22b8eeeb` change only this file). Fork range: none (see above).

1. **Conditions 1 to 3: hold.** Every commit names its finding or is a
   review-file-only commit. `modest-task.md:17-18` ("the report file not
   counted") is outside the lines R2 cites, but the reviewer counts it
   inside R2's scope: without it, a modest-task that touches 3 files
   breaks its own cap when it writes the report file.
2. **Only what each finding asks: fails** on R2's `design-task.md` edit
   (F1 below). E1, R1 + E2, R3 and R5 match the approved text word for
   word; R4 and the other three R2 edits stay inside their findings.
3. **New tests: none.** No test file changed
   (`git diff --name-only fbf93743..HEAD | grep -i -E "test|spec"`, rc=1).
4. **Touched tests pass: none touched.**
   `python -I scripts/check_skill_mirrors.py` printed "skill mirrors
   match", rc=0.

- **F1 (code quality, in lines the R2 fix wrote) — `design-task.md`
  makes the report file unconditional.** `.claude/agents/design-task.md:16-17`:
  "When your prompt names no plan file, the plan goes in your report file
  and your final message is the condensed report." It has no condition,
  against the skip rule at `AGENTS.md:179` ("Skip the file when the whole
  report fits the condensed report") and R3's sentence for prompts that
  forbid all writes. It is the defect R1 fixed in `general-task.md`. The
  edit also drops "or recommendation", and at lines 10-11 the next
  sentence, "When it names one", can now be read as naming the report
  file as well as the plan file. Confirmed by the dispatching agent with
  `sed -n 8,18p .claude/agents/design-task.md` at `22b8eeeb`. Suggested
  text (reviewer's, needs the owner's approval as an agent-file edit):
  "When your prompt names no plan file, put the plan in your report file
  unless AGENTS.md § Subagent reports says to skip it; your final message
  is the condensed report", and "When it names a plan file" in the
  sentence before.

Observation, no finding: at `general-task.md:26-27`, "does not apply to
it" can be read as referring to the condensed report, not the report
file. This is the owner's exact E2 text.

**Result: the review stops here** ("Round limit": round 2 reported a
code-quality finding in the lines the fixes wrote). No Disposition table,
no `pnpm merge-to-dev --check-only`, no merge. Cause: the agent that handles this
review wrote R2's design-task sentence itself (round 1 gave no suggested
text) and did not carry over the skip condition that R1's suggested text
has for `general-task.md`. The owner decides what happens next.

## Owner ruling on F1

Owner, 2026-10-16, asked whether to "apply the reviewer's one-sentence
fix with no further review round, then run pnpm verify and merge",
answered "A". Reported by the session that dispatched this step. F1 is
fixed with no round 3.

Fix commit `564f107b` applies the reviewer's suggested text at
`.claude/agents/design-task.md:11` ("When it names a plan file") and
`:16-18`. At `:16` it keeps "your plan or recommendation", the words
commit `06703de4` dropped (`git show 06703de4 -- .claude/agents/design-task.md`).
No round reads `564f107b`, by the owner's ruling above.

## Disposition (round 2)

| ID  | Axis          | Disposition | Ticket / note                                                                                                                                                |
| --- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Code quality  | fixed       | `02b5bd2e`, suggested text with E2; owner approval 2026-10-16: "Sure"; round 2 found it matches word for word                                                |
| R2  | Adversarial   | fixed       | `06703de4` (four task-type definitions allow the report file) and `e5478faf` (E1); owner approval 2026-10-16: "Sure"; design-task wording corrected under F1 |
| R3  | Code quality  | fixed       | `02b5bd2e`, suggested sentence added to `AGENTS.md`; owner approval 2026-10-16: "Sure"; round 2 found it matches word for word                               |
| R4  | Adversarial   | fixed       | `94bf869c`, worktree callers name report paths; owner approval 2026-10-16: "Sure"; round 2 found it inside the finding                                       |
| R5  | Code quality  | fixed       | `02b5bd2e`, suggested read-list line in `AGENTS.md`; owner approval 2026-10-16: "Sure"; round 2 found it matches word for word                               |
| E1  | Owner         | fixed       | `e5478faf`, owner addition to R2's fix; owner approval 2026-10-16: "Sure"; round 2 found it matches word for word                                            |
| E2  | Owner         | fixed       | `02b5bd2e`, owner addition to R1's fix; owner approval 2026-10-16: "Sure"; round 2 found it matches word for word                                            |
| F1  | Focused check | fixed       | `564f107b`, reviewer's suggested text; owner ruling 2026-10-16: "A" (fix with no further review round, then verify and merge)                                |

Tickets filed: 0. Tickets closed: 0. Counted with the two commands in
the skill's step 3 at `564f107b`; both printed 0.
