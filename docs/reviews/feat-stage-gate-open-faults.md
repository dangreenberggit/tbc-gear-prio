# Pre-merge review — feat/stage-gate-open-faults

Reviewed range: `8a59f35def47c4f5b8428e16f2e1e5b64b71a331..2b9ed795b202bdc41037d7a6dbf6c8f63ad0b1ee`
Reviewed range: `2b9ed795b202bdc41037d7a6dbf6c8f63ad0b1ee..f50cc3c7a692e5205a128148c8cbff6fd8a779c7`

## Dispatch note

- Lane: full axes. `git diff --shortstat dev...HEAD` gives 17 files
  changed, 911 insertions, 129 deletions, over the small-change limits.
- `codex` is not on `PATH` (`which codex` prints nothing), so each axis
  ran as a fresh `general-task` agent on `model: "opus"`: Adversarial,
  and the `code-review` skill's Standards and Spec sub-agents. All three
  were told they write nothing and report nothing on this file.
- Domain axis skipped: the branch changes only agent-facing rule text
  and tickets, and has no ranking, shortlist or pool output to judge.
- Scope given to every axis: only what the branch changes (owner, ticket
  712: "i want reviews to cover what they should cover, not expand to
  everything over and over for all eternity"). The copied review file
  `docs/reviews/feat-subagent-foreground-helpers.md` is byte-identical
  to the one on `remotes/windows/feat/subagent-foreground-helpers`
  (`git diff remotes/windows/feat/subagent-foreground-helpers HEAD -- docs/reviews/feat-subagent-foreground-helpers.md`
  prints nothing), so no axis reviewed its content. Ticket 720 was
  reviewed only where it differs from that branch's ticket 550.
- `python3 scripts/check_skill_mirrors.py`: "skill mirrors match", rc 0.
- Line numbers below are at `2b9ed795`. `SKILL.md` means
  `.claude/skills/stage-gate/SKILL.md`; its `.agents/` mirror has the
  same lines.

## Adversarial

No two changed rules contradict each other, and no rule makes an agent
loop. Seven findings.

- **A1. Gate A no longer limits a `next:` planner to its chunk.**
  `SKILL.md:251-254`. The old Gate A allowed steps only for `K1` and for
  chunks a `next:` planner had added. The new one checks only that every
  step is in a chunk that `## Execution chunks` lists. A `next: K2`
  planner that also moves K3's Backburner line into Execution chunks and
  gives it steps passes Gate A. The K2 re-review covers K2's steps. Step
  5 then plans no K3 (`SKILL.md:425-433` plans only a chunk "still a
  Backburner line"), so K3's steps reach an executor with no review. Only
  the planner's own rule stops this (`gate-planner.md:29`, § Next
  chunk). Whether a planner does this: hypothesis, untested.
- **A2. Nothing requires the first chunk to have steps.**
  `plan-template.md:57-63`, `gate-planner.md:26-30`, `SKILL.md:425-433`.
  The old template said `K1` has steps; the new text lets the planner
  choose. A first plan with every chunk on the Backburner passes Gate A.
  Step 5 has no rule for it: the `next:` path assumes an earlier chunk
  ran, and `next:` mode reads an empty `execution-report.md`. Unlikely in
  practice.
- **A3. A reviewer's `spawn` line names one chunk, but a review of the
  first plan covers several.** `SKILL.md:170-174`, `:358-360`,
  `:542-545`. The last field is "the chunk id that the review covers". A
  first-plan review counts for every chunk the first plan gives steps,
  but Recovery counts only lines "that name that chunk", so after a
  restart the other chunks count 0. Small effect today, because no rule
  spawns a separate review of such a chunk.
- **A4. A fresh session cannot apply the new timer rule.**
  `SKILL.md:189-210`. The rule needs to know that an agent's last
  notification said it is waiting, and whether its one message was
  already sent. A `returned (completed)` line does not record "waiting",
  and the `resumed` line for that message looks like any other `resumed`
  line. After a restart the session can send the message twice, or miss
  a waiting agent. Hypothesis, untested: that a fresh session can message
  the old agents at all (Recovery at `SKILL.md:530` assumes it can).
- **A5. Ticket 722 points at a size check that does not exist.**
  `722-stage-gate-revision-prompt-names-no-chunk.md:23-26` cites "the
  fault-3 size check in ticket 712, if the owner approves it". Ticket 712
  has no fault 3, and 717:101-112 records that the owner chose a
  planner-led rule with no size count (`602d7b14`).
- **A6. Ticket 712's `Verified by:` predates a change it records.**
  `712-stage-gate-revision-loops-run-wrong.md:337-340` cites
  `tbc-gear-prio@98356b7f` for the four open items. The same comment
  (`:322-327`) records `c8737b8a`, which came later
  (`git log --oneline 8a59f35d..2b9ed795` lists it after `98356b7f`).
- **A7. Every chunk's executor handles each plan-wide `minor` finding.**
  `gate-executor.md:43-49`. A `minor` finding whose `Where` names no step
  now goes to every chunk's executor, so the same change can be applied
  twice, or the final Gate C gets one `advisory` row per chunk. Small;
  hypothesis, untested that a later executor applies it again, since it
  reads the earlier chunks' reports.

Checked by the axis and not defects: no trace of the removed size budget
is left (`grep -rn '350\|stage budget\|over budget\|five steps\|size limit' .claude/skills/stage-gate .agents/skills/stage-gate .claude/agents`,
rc 1); the "no further `gate-reviewer`" lines and the **Unasked-changes
check** do not conflict, because **Review limit per chunk** names that
check as its one exception (`SKILL.md:361-370`); the 30-minute timer
works with minute-precision stamps; the cross-references "step 1 **Open
the stage**" and "**Whole job first**" resolve; ticket 720's test claim
reproduces (`python3 .claude/hooks/tests/subagent-foreground-helpers.py`,
"11 of 11 cases passed", rc 0).

## Domain

Skipped: no game-domain content (dispatch note).

## Standards + Spec

### Standards

The branch breaks no standard that a tool or script checks.

- **S1. Ticket 722 cites a rule that does not exist.** Same as A5.
  writing-for-agents § Pruning; AGENTS.md § Durable claims.
- **S2. Two new sentences are far too long.** `SKILL.md:384-390` is one
  sentence of about 75 words with a nested parenthesis; `SKILL.md:199-206`
  is about 60 words. Owner's § Plain English: "Long sentences ... Not OK
  when you wrote them."
- **S3. The same limit is stated in several places** (Duplicated Code,
  judgement). "At most one" unasked-changes review per chunk is at
  `SKILL.md:112-114`, `:362-364` and `:384`; the parenthesis at
  `:385-388` restates when **Loop back** and **Review limit per chunk**
  stop reviewing. The 30-minute wait is at `SKILL.md:93-95` and
  `:199-202`.
- **S4. The check's name appears in six places** (Shotgun Surgery,
  judgement). `SKILL.md:113, 173-174, 296, 363, 384, 545`.
- **S5. Rules named by position.** `SKILL.md:363` says "this bullet's
  rules for a third review" and `SKILL.md:192` says "the message below".
  The brief: "No rule named by its list position ... name a rule by its
  bold label."
- **S6. The Backburner check is written out twice** (judgement).
  `gate-reviewer.md:67-68` and `plan-template.md:72-73`.
- **S7. Ticket 720 says "Copied to dev" before the merge.**
  `720-…md:10` and `:234`. The ticket is on the feature branch only.
- **S8. Ticket 712's `Verified by:` predates its last change.** Same as
  A6.

### Spec

Faults 1, 3, 4, 5, 6 and 7 are done as the rulings say. Fault 2 is
partial. No scope creep: the `orchestration.md:131-140` and `parts.md`
edits follow from removing the size budget.

| Fault | Verdict      | Where the rule is                                                           |
| ----- | ------------ | --------------------------------------------------------------------------- |
| 1     | done         | `SKILL.md:425-428`, `:459-464`                                              |
| 2     | partial (P1) | `SKILL.md:170-174`, `:542-547`                                              |
| 3     | done         | `gate-planner.md:26-30`; `plan-template.md:55-73`; `gate-reviewer.md:66-68` |
| 4     | done         | `SKILL.md:93-95`, `:191-210`, `:531-534`; `orchestration.md:21-24`          |
| 5     | done         | `SKILL.md:384-398`, `:361-366`, `:296-298`                                  |
| 6     | done         | `gate-planner.md:126-132`; `SKILL.md:289-291`, `:345`                       |
| 7     | done         | `gate-executor.md:43-49`                                                    |

- **P1. Fault 2 vs fault 3.** Same as A3. Ticket 717 item 2: "a fresh
  session could run a fourth review of a chunk". Suggested fix: the line
  names every chunk the review covers, for example `K1 K2 round 1`.
- **P2.** Same as A5.
- **P3.** Same as A6. Suggested fix: cite `2b9ed795`.
- **P4. Ticket 712's header still points at the old ticket.**
  `712-…md:6` says `Related: 550 on unmerged branch
feat/subagent-foreground-helpers`; that ticket is now 720.
- **P5. Owner approval of later wording is not recorded** (hypothesis,
  untested). The tickets record no approval of the wording in the
  post-review fix commits `f3f47db2`, `3883082e`, `1808a79c`,
  `d22fe9fd`, `2b9ed795`, or of the reviewer's Backburner check
  (`90b61b8e`). The axis did not read the session transcript.

Tickets: 717 and 712 meet their Done when in form, with P1, P3 and P4
open. `NEXT` = 723 is right: no ref has tickets 720-722 other than this
branch (`git ls-tree` over every ref, per the Spec axis).

One line per axis: Standards 8 findings, worst S1 (stale rule reference
in a new ticket); Spec 5 findings, worst P1 (fault 2 partial).

## Code quality

| ID  | Row                                        | Fix                                                                         |
| --- | ------------------------------------------ | --------------------------------------------------------------------------- |
| S2  | Two new sentences of about 60 and 75 words | Split `SKILL.md:199-206` and `:384-390` into short sentences                |
| S3  | One limit stated in two or three places    | State each limit once, at its bold-labelled rule, and point to it elsewhere |
| S5  | "this bullet's rules", "the message below" | Name **Review limit per chunk**; quote or name the message                  |
| S6  | Backburner check written out twice         | Keep it in one file and point to it from the other                          |

## Summary

Round 1 found no rule an agent would loop on, and the skill mirrors
match. Findings by effect (step 3), after merging duplicates
(A3 = P1, A5 = S1 = P2, A6 = S8 = P3):

- **Fixed before merge:** A1. Gate A is the mechanical check against a
  planner breaking its rules, and after this branch it passes when a
  `next:` planner gives steps to a second chunk; those steps then run
  unreviewed with no warning.
- **Block the merge until fixed, or until the owner allows a `defer`
  row:** A2, A3/P1, A4, A7. Each is a gap this branch introduced.
- **Code quality:** S2, S3, S5, S6 (table above). S4 is `wontfix`
  (Disposition).
- **Bookkeeping:** A5/S1/P2, A6/S8/P3, P4, S7, and P5 (the approval
  record; the finding handler confirms it with the session or owner).

Agent-file edits for the owner's one approval (step 3, "Agent files"):
A1, A2, A3/P1, A4 and A7 (`SKILL.md`, `plan-template.md`,
`gate-executor.md`, `gate-planner.md`), and S2, S3, S5, S6. The ticket
fixes (A5, A6, P4, S7) are not agent files.

The owner approved every fix on 2026-10-27 ("have a subagent do all of
the fixes now", relayed by the session). The fixes are commits
`12ca28fb` through `4e75a9ea`, and the Disposition table below names the
commit for each finding. Round 2 (focused check) runs on
`2b9ed795..<new HEAD>`.

Step 4 (`pnpm merge-to-dev --check-only`) has not run: the review is not
finished until round 2. Tickets filed and closed are counted then.

Round 2 found two problems in the fixes (R2-1, R2-2 in
`## Focused check (round 2)`), so the review stops there, as step 2
"Round limit" says: no round-2 Disposition table, no step 4, and the
owner decides what happens next.

## Disposition

| ID  | Axis             | Disposition | Ticket / note                                                                                                                                                                                 |
| --- | ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial      | fixed       | `12ca28fb`: after a `next:` planner, Gate A checks that `## Execution chunks` has the lines step 5 logged, unchanged, plus one line for the named chunk                                       |
| A2  | Adversarial      | fixed       | `3264721c`: `K1` always has steps (`plan-template.md`, `gate-planner.md`), and Gate A checks it                                                                                               |
| A3  | Adversarial      | fixed       | `ceac7d35`: a reviewer `spawn` line names every chunk the review covers, for example `K1 K2 round 1`                                                                                          |
| A4  | Adversarial      | fixed       | `b7811da3`: `returned (<status>, waiting)` and `resumed (waiting)` record a waiting agent and its one message, and a fresh session starts the timer from the log                              |
| A5  | Adversarial      | fixed       | `4e75a9ea`: ticket 722 no longer cites the size check                                                                                                                                         |
| A6  | Adversarial      | fixed       | `4e75a9ea`: ticket 712's `Verified by:` cites `3c9d7ee2`                                                                                                                                      |
| A7  | Adversarial      | fixed       | `f8603807`: only `K1`'s executor handles a `minor` finding whose `Where` names no step                                                                                                        |
| S1  | Standards + Spec | fixed       | Same as A5: `4e75a9ea`                                                                                                                                                                        |
| S2  | Standards + Spec | fixed       | `b7811da3` splits the waiting-agent rule; `180ce269` splits **Unasked-changes check**                                                                                                         |
| S3  | Standards + Spec | fixed       | `180ce269`: "at most once" only in **Unasked-changes check**, its restating parenthesis removed; `b7811da3`: the 30 minutes only in step 1                                                    |
| S5  | Standards + Spec | fixed       | `180ce269` names **Review limit per chunk**; `b7811da3` names the **one message to a waiting agent**                                                                                          |
| S6  | Standards + Spec | fixed       | `3c9d7ee2`: the check stays in `gate-reviewer.md` **The approach**; `plan-template.md` points to it                                                                                           |
| S7  | Standards + Spec | fixed       | `4e75a9ea`: ticket 720's section is "Copied from the old branch 2026-10-27"                                                                                                                   |
| S8  | Standards + Spec | fixed       | Same as A6: `4e75a9ea`                                                                                                                                                                        |
| P1  | Standards + Spec | fixed       | Same as A3: `ceac7d35`                                                                                                                                                                        |
| P2  | Standards + Spec | fixed       | Same as A5: `4e75a9ea`                                                                                                                                                                        |
| P3  | Standards + Spec | fixed       | Same as A6: `4e75a9ea`                                                                                                                                                                        |
| P4  | Standards + Spec | fixed       | `4e75a9ea`: ticket 712's `Related:` names 720                                                                                                                                                 |
| P5  | Standards + Spec | fixed       | `4e75a9ea`: ticket 712 § Comments records the approvals as relayed by the session, and the review reports each later fix commit applies                                                       |
| S4  | Standards + Spec | wontfix     | The name is how each rule that applies the check links to it; one rule defines it (`SKILL.md:384`) and the others name it, so a rename touching each mention is expected, not scattered logic |

## Focused check (round 2)

Range: `2b9ed795..f50cc3c7` (9 commits: 7 rule fixes `12ca28fb` to
`3c9d7ee2`, the ticket fixes `4e75a9ea`, and the review commits
`c35fbd6f`, `f50cc3c7`). Fork range: none.
`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0,
so the branch never moves the fork pin.

Who ran it: one fresh `general-task` agent on `model: "opus"`, which
wrote none of the fixes. `codex` is still not on `PATH`. It ran the
check itself and wrote only this section and the lines that point to it.
Scope: only the lines that `2b9ed795..f50cc3c7` changes, and the rules
those lines touch (owner, ticket 712: "i want reviews to cover what
they should cover, not expand to everything over and over for all
eternity"). Line numbers below are at `f50cc3c7`. `SKILL.md` means
`.claude/skills/stage-gate/SKILL.md`; the `.agents/` mirror is
identical (`python3 scripts/check_skill_mirrors.py`: "skill mirrors
match", rc 0).

### Conditions

1. **Every commit is a fix, a review-file change or a ticket change:
   holds, with one gap in form (R2-3).** The Disposition table above
   names the commit for every round-1 finding, and each commit touches
   only the files of its findings
   (`git show --name-only --format= <sha>` for each). No commit message
   names a finding ID, and none names a ticket; the step reads the IDs
   only from this file's table.
2. **Every changed line is at a place a fixed finding cites: holds.**
   Each hunk is at a line round 1 cites: A1 (`SKILL.md:251-254`,
   `:425-433`), A2 (`plan-template.md:57-63`, `gate-planner.md:26-30`),
   A3 (`SKILL.md:170-174`), A4 (`SKILL.md:189-210`), A7
   (`gate-executor.md:43-49`), S3 (`SKILL.md:93-95`, `:112-114`), S2/S5
   (`SKILL.md:362-364`, `:384-390`), S6 (`plan-template.md:72-73`). The
   one hunk outside a cited line, the `note` bullet (`SKILL.md:216-218`),
   is the log entry that A1's Gate A check reads.
3. **The wowsims-file check gives the same output: holds.** The fork pin
   does not move (above).

### The four checks

1. Conditions 1 to 3: hold (above).
2. **The diff changes only what each finding asks for: fails for A1 and
   A7** (R2-1, R2-2). A2, A3, A4, A5, A6, P4, P5, S2, S3, S5, S6 and S7
   do what their findings ask, and contradict no other rule in the
   edited files.
3. Each new test asserts its finding: no test was added; the branch
   changes only rule text and tickets.
4. The tests the fixes touch pass: the fixes touch no test.
   `python3 scripts/check_skill_mirrors.py` passes (rc 0).

### Findings

- **R2-1. Gate A's new count disagrees with the planner's rule for a
  next chunk** (fix `12ca28fb`, for A1). `SKILL.md:260-262`: "after a
  `gate-planner` with `next: <id>`, `## Execution chunks` has the lines
  that step 5 logged before that spawn, unchanged, and one more line,
  for chunk `<id>`". `.claude/agents/gate-planner.md:139-143` tells
  that planner to "move its Backburner line into Execution chunks ...
  Where an earlier chunk's report contradicts a Backburner line, say so
  under the chunk line". A planner that writes that note adds two lines,
  so Gate A fails a plan that follows its rules; the session respawns
  the planner once and then stops and asks the user. The planner text
  is older than the fix (`git show 2b9ed795:.claude/agents/gate-planner.md`,
  line 143). Effect: a loud failure this branch introduced. How often an
  earlier chunk's report contradicts a Backburner line: hypothesis,
  untested. Smallest fix: in `SKILL.md:261-262`, write "one more chunk
  line, for chunk `<id>`, and any note under it
  (`.claude/agents/gate-planner.md` § Next chunk)".
- **R2-2. A `minor` finding that names no step, raised after `K1` has
  run, now reaches no executor** (fix `f8603807`, for A7).
  `gate-executor.md:43-45`: "For each `minor` finding in
  `plan-review.md` whose `Where` names a step of your chunk, or, when
  your chunk is `K1`, names no step". The first review of a later chunk
  runs after `K1` has run (`SKILL.md:430-443`) and adds its own
  `# Round <n>` section to `plan-review.md`. A `minor` finding there
  whose `Where` names no step (for example the Claims register or the
  whole plan) matches no later executor's rule, and `K1`'s executor has
  already finished. So it gets no ledger row, and the final Gate C, which
  works from ledger rows (`SKILL.md:504-524`), never sees it. The
  session's Gate B `advisory` line (`SKILL.md:415-420`) still records
  it. Before the fix, every chunk's executor handled it, so this gap
  came with the fix. Effect: a gap against the fault-7 spec that this
  branch introduced; small, because such findings are advisory, and how
  often a later chunk's review writes one is hypothesis, untested.
  Smallest fix, in `gate-executor.md` only: replace "or, when your chunk
  is `K1`, names no step (for example the whole plan)" with "or names
  no step (for example the whole plan) and has no ledger row in an
  earlier chunk's report in `execution-report.md`", and add one
  sentence: "Start the reason of each ledger row for a `minor` finding
  with its id `R<n>-<id>`, where `<n>` is the number in its
  `# Round <n>` heading." The executor already reads
  `execution-report.md` (`gate-executor.md:36`), so `K1` still handles
  first-plan findings, later chunks handle later ones, and no finding is
  handled twice. Not tried on a run: hypothesis, untested.
- **R2-3 (bookkeeping). The fix commits name no finding ID.** Condition
  1 asks for the ID "in the commit message or in the ticket it names".
  The commit messages are subject lines only
  (`git log --format='%h %s%n%b' 2b9ed795..f50cc3c7`), so this check
  read the IDs from the Disposition table instead. Suggested
  disposition: `wontfix`, because changing it would mean rewriting
  commits; later fixes name their IDs in the message.
- **Q-1 (code quality). One rewritten sentence is still long and
  hard to follow.** `SKILL.md:201-204` is one sentence of about 45
  words, with "for an agent that has not had the message" placed after
  the log file it qualifies. Suggested: "When an agent that has not had
  the message is **waiting**, the session starts a timer: ...", with
  the fresh-session case as its own sentence. The rest of the new
  wording is plain. Three changed lines (`SKILL.md:263`, `:372`, `:400`)
  are longer than the lines around them; that is line wrapping only.

Checked and not defects:

- A1 by a revision: a revision of a later chunk is not covered by the
  new Gate A count, so it could also move a Backburner line. But its
  re-review covers every step on its `- added:` lines
  (`SKILL.md:296-301`); a step a planner changes without listing it is
  a limit of every focused re-review, and older than this branch.
- A2: "`K1` has steps" (`SKILL.md:258`) agrees with
  `plan-template.md:59` and `gate-planner.md:29`.
- A3: Recovery counts "the `gate-reviewer` `spawn` lines that name that
  chunk" (`SKILL.md:547-550`), which now works for `K1 K2 round 1`.
- A4: **working**, **waiting** and "has had it" (`SKILL.md:185-199`) are
  read from the log alone, so a fresh session can apply them; Recovery
  (`SKILL.md:535-539`) and `orchestration.md:21-24` agree.
- Ticket 712's `Verified by:` cites `3c9d7ee2`; no commit after it
  touches `.claude` or `.agents`
  (`git diff --quiet 3c9d7ee2 HEAD -- .claude .agents`, rc 0).

### Result

Round 2 reports two findings that are not bookkeeping (R2-1, R2-2) and
one code-quality finding (Q-1). Step 2 "Round limit" says the review
stops here: this file is committed as it stands, no round-2 Disposition
table is written, step 4 (`pnpm merge-to-dev --check-only`) does not
run, and the owner decides what happens next. Both R2-1 and R2-2 block
the merge until fixed, or until the owner allows a `defer` row. Likely
cause of both: each fix was written against its own finding's text and
did not check the other rules that read the same lines (R2-1:
`gate-planner.md` § Next chunk; R2-2: reviews that run after `K1`).
Hypothesis, untested.
