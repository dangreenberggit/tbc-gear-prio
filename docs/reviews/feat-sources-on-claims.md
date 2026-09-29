# Pre-merge review — feat/sources-on-claims

Reviewed range: `21817076a550c9370dc7a1b4dd324476bc1c4f78..4459fcf04473da7c4bcfc791b1715641d3b59545`

Dispatch: `codex` is not on PATH (`command -v codex` rc=1), so all three axes ran as fresh `general-task` subagents on Opus, in parallel, read-only, and were waited for in the foreground. The Standards + Spec axis ran the `code-review` skill unchanged.

Scope: one commit, 4459fcf0, two files, 7 added lines. It inserts two paragraphs whose text the owner approved word for word on 2026-09-29 (proposal `claim-review-proposal.md` in the session scratchpad): the "Sources on important claims" paragraph in `docs/agents/home/AGENTS.md` § Chat responses, and the research-split sentence in `.claude/agents/general-task.md`. Root `AGENTS.md` is unchanged, as approved ("Edit 3: no change").

Every finding below asks to change owner-approved wording. `AGENTS.md` § Writing for agents requires owner approval before `AGENTS.md` or skill/agent files change, and the task was to use the approved text verbatim. So no finding is fixed on this branch; each is recorded as `wontfix` here and passed to the owner to decide. No tickets were filed, by instruction.

## Adversarial

No blockers. Tree clean. No banned words in the added lines.

- **A1 (should-fix).** `.claude/agents/general-task.md:13-16` sets no depth or fan-out limit. A research child is itself a `general-task` (AGENTS.md:152 sends judgment work there), so the same sentence tells it to split again. The sibling seats set limits: `gate-planner.md:34-37` (at most 4 researchers, 40-line returns) and `design-task.md:12-14`. Suggested: "Spawn at most 4; tell each one to change no files, return at most 40 lines, and spawn no subagents."
- **A2 (should-fix).** `docs/agents/home/AGENTS.md:42` says the relaying agent "adds no factual claim of its own", while :40 lets the caller add "its own verdict" and correct the summary. Suggested: "beyond its verdict, which names its source like any other important claim." (The proposal's self-review argues a verdict adds no new fact; the reviewer disagrees.)
- **A3 (nit).** `general-task.md:18-21` final-message format has no **Summary for the user** section, which the new relay check at home :42 relies on. The gap predates this branch.
- **A4 (nit).** "unverified" (home :42) versus `hypothesis, untested` (`general-task.md`, `design-task.md`, `gate-planner.md:39-40`). Same as S2.
- **A5 (nit).** "AGENTS.md § The session delegates" at `general-task.md:14` could mean the root, home or `~/.claude` file; the section exists only at root AGENTS.md:136, and :156 says it binds the interactive session only. Same as S4.
- **A6 (nit).** "things on screen" at home :42 does not say whose screen; the home file is global to all projects.
- **A7 (nit).** The three sentences at home :42 are 44, 41 and 38 words; home :8 discourages long sentences you wrote. Same as S5.

Not a diff defect: `~/.claude/AGENTS.md` does not yet contain the new paragraph, so the rule is not live until the staged home file is copied over.

## Domain

**Domain: clean.** The diff makes no TBC, WCL, wowsims or data-pipeline claim; the reviewer read the full diff against the lanes in `.agents/reviews/domain.md`.

## Standards + Spec

**Spec: clean.** The added lines match the proposal byte for byte (`cmp` IDENTICAL for both edits), at the named places; root `AGENTS.md` diff is empty; no removed lines; `git diff --check` rc=0; no CR bytes.

Standards (no blockers):

- **S1 (should-fix).** Home :42 sentence 3 restates the caller check from :40 ("checks that the summary agrees with the report and corrects it") with a different remedy; a reader cannot tell whether it replaces or extends :40.
- **S2 (should-fix).** Three labels for an unchecked claim: "unverified" (home :42), **hypothesis** / **untested** (AGENTS.md:61), `hypothesis, untested` (`general-task.md:20`). Durable claims also says "Chat may speculate freely", and the new rule does not say which wins in chat.
- **S3 (should-fix).** `general-task.md:13-16` puts a contrast ("rather than doing all the reading yourself") inside the sentence; home :10 says to make a needed contrast a separate sentence.
- **S4 (nit).** Bare "AGENTS.md" in `general-task.md:14`; the reference resolves in this repo but not against `~/.claude/AGENTS.md`.
- **S5 (nit).** Home :42 sentence 1 is about 43 words; "a relation that no source shows" has no example.
- **S6 (nit).** Home :42 opens with a stand-alone bold heading where :34-40 use an inline bold lead-in; "unverified" is in straight quotes where the file uses backticks for labels.
- **S7 (nit).** Commit subject "Require sources on important claims" describes only the home AGENTS.md change, not the general-task sentence.

## Summary

The commit inserts the approved text exactly (Spec clean, Domain clean). Adversarial and Standards found no blockers, but two defects are worth the owner's attention: A1, no limit on nested research subagents, and A2/S1, the new relay sentence overlaps and partly conflicts with the caller rule directly above it. All findings would change owner-approved wording, so all are `wontfix` on this branch and go to the owner.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                  |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Superseded in round 2: owner ruling, no numeric cap; narrow jobs spawn no subagents            |
| A2  | Adversarial | fixed       | Superseded in round 2: owner ruling, the verdict is the one allowed addition                   |
| A3  | Adversarial | wontfix     | Gap in general-task.md format predates this branch; outside the approved edit                  |
| A4  | Adversarial | wontfix     | Duplicate of S2                                                                                |
| A5  | Adversarial | wontfix     | Duplicate of S4                                                                                |
| A6  | Adversarial | wontfix     | Needs a change to owner-approved wording; passed to the owner                                  |
| A7  | Adversarial | wontfix     | Duplicate of S5                                                                                |
| S1  | Standards   | fixed       | Superseded in round 2: owner ruling, the caller check now lives only in the subagent paragraph |
| S2  | Standards   | wontfix     | Needs a change to owner-approved wording; passed to the owner                                  |
| S3  | Standards   | fixed       | Superseded in round 2: the in-sentence contrast was removed in the A1 rewrite                  |
| S4  | Standards   | wontfix     | Reference resolves in this repo; changing it changes approved wording                          |
| S5  | Standards   | wontfix     | Needs a change to owner-approved wording; passed to the owner                                  |
| S6  | Standards   | wontfix     | Formatting of owner-approved text; passed to the owner                                         |
| S7  | Standards   | wontfix     | Rewording would mean rewriting a commit; the subject names the main rule                       |

# Round 2 — owner rulings and writing review

Reviewed range: `4459fcf04473da7c4bcfc791b1715641d3b59545..c3f2121bff4e4db1c558abb2a27b802862367f01`

Owner rulings (2026-09-29, relayed by the coordinator): A1 — no numeric cap; an agent spawned for one narrow lookup or investigation (for example `simple-task`) spawns no subagents, and a `general-task` research agent may still split its questions. A2 + S1 — approved: the verdict is the relaying agent's one allowed addition and names its source, and the caller check lives in one place, the subagent paragraph. S3 — fix if it falls out of the rewrite. Other round-1 findings stay `wontfix`.

Commit c3f2121b applied those rulings. One fresh `general-task` subagent on Opus, read-only and waited for in the foreground, then reviewed every added or changed line on the branch against `.claude/skills/writing-for-agents/SKILL.md` and the Writing style section of `docs/agents/home/AGENTS.md`. The fixes below were made after that review, in the commit that adds this round; they apply the reviewer's own replacement text where it stays within the rulings.

## Writing review

- **W1 (should-fix).** `general-task.md`: "one narrow lookup or investigation" reads two ways, and "research task" is a second term for the same branch.
- **W2 (should-fix).** `general-task.md`: the fan-out sentence does not exclude review axes, which `docs/agents/model-policy.md` says are never fanned out, and does not point at model-policy § Budget the round.
- **W3 (nit).** The "AGENTS.md § The session delegates" pointer takes two hops and names an ambiguous file. Same as round-1 A5 and S4.
- **W4 (nit).** "judge what each one returns" gives no completion criterion.
- **W5 (should-fix).** Home :42 sentence 1 is 41 words. Same as round-1 S5 and A7.
- **W6 (should-fix).** Home :42 "things on screen" and "a relation that no source shows" allude to something the reader cannot see, the contrast "never by …" sits inside the sentence, and the sentence binds only relaying agents. Same family as round-1 A6.
- **W7 (should-fix).** "unverified" differs from `hypothesis, untested` used elsewhere. Same as round-1 S2 and A4.
- **W8 (should-fix).** Home :40: "verifies" read literally has the interactive session read files itself, and "whose source is missing or does not appear in the report" reads two ways.
- **W9 (nit).** Home :40: "It also" can refer to the summary; the forward reference "(defined in the next paragraph)" splits one idea over two paragraphs.
- **W10 (nit).** Home :42: "adds no factual claim of its own except its verdict" repeats line 40's "adds only its own verdict" and is phrased as a negation.
- **W11 (nit).** Home :42: "a substantial decision" defines "important" with another vague adjective.
- **W12 (nit).** `simple-task.md`: "Spawn no subagents." is a bare prohibition with no positive target.

## Disposition (round 2)

| ID  | Axis    | Disposition | Ticket / note                                                                                                                 |
| --- | ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| W1  | Writing | fixed       | Trigger now reads "one narrow lookup or one narrow investigation"; "research task" kept as the owner's term                   |
| W2  | Writing | fixed       | 0d8dc289: owner ruling 2026-09-29; the research paragraph now excludes a review axis. No budget pointer added                 |
| W3  | Writing | wontfix     | Owner ruled round-1 A5 and S4 stay as they are                                                                                |
| W4  | Writing | wontfix     | Owner-approved wording outside the rulings                                                                                    |
| W5  | Writing | wontfix     | Owner ruled round-1 S5 and A7 stay as they are                                                                                |
| W6  | Writing | wontfix     | Owner ruled round-1 A6 stays; the sentence now opens "The agent keeps" so it no longer hangs on an ambiguous "It"             |
| W7  | Writing | wontfix     | Owner ruled round-1 S2 stays                                                                                                  |
| W8  | Writing | fixed       | Now "names no source or whose source the report does not show", verified "directly or through a subagent"                     |
| W9  | Writing | fixed       | Sentence now opens "The caller also"; the forward reference stays because the ruling puts the check in the subagent paragraph |
| W10 | Writing | fixed       | Now "adds only its verdict, and the verdict names its source like any other important claim"                                  |
| W11 | Writing | wontfix     | Owner-approved wording outside the rulings                                                                                    |
| W12 | Writing | fixed       | Now "Do the job with your own tool calls; spawn no subagents."                                                                |

# Round 3 — research depth

Owner ruling (2026-09-29), their words: "research depth: option 1, although of course it has to be worded carefully and effectively. the sort of managing agent (even a subagent itself) should estimate and tell its subagents in this case that they dont need their own subagents, perhaps? rather than merely implying through wording that more subagents arent needed". Option 1: a research agent that splits its questions tells each subagent its job is one narrow question, so splitting stops after one level.

Commit f02f2296 applies the ruling to `.claude/agents/general-task.md` and adds one sentence to `AGENTS.md` § The session delegates. One fresh `general-task` subagent on Opus, told to spawn no subagents and waited for in the foreground, reviewed a first draft against `.claude/skills/writing-for-agents/SKILL.md` and the global Writing style section. The commit contains the draft with the fixes below.

## Writing review (round 3)

- **W13 (must-fix).** The draft gave the no-subagents sentence only to subagents judged narrow, so a subagent judged not narrow could split again.
- **W14 (must-fix).** The `AGENTS.md` line paraphrased the sentence and pointed the session at `general-task.md`, a file the same section says the session does not read.
- **W15 (must-fix).** After the insertion, "This does not apply to a review axis" no longer referred clearly to splitting.
- **W16 (must-fix).** `design-task`, `gate-planner` and `gate-reviewer` spawn research subagents and were not covered.
- **W17 (optional).** "narrow" had no test.
- **W18 (optional).** "helper" and "subagent" named the same thing.

## Disposition (round 3)

| ID  | Axis    | Disposition | Ticket / note                                                                                           |
| --- | ------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| W13 | Writing | fixed       | Split until each question is narrow; every subagent's prompt gets the sentence                          |
| W14 | Writing | fixed       | `AGENTS.md` now quotes the exact sentence and names no file                                             |
| W15 | Writing | fixed       | Now "Do not split a review axis: run the axis yourself"                                                 |
| W16 | Writing | fixed       | The `AGENTS.md` sentence now binds any agent that splits a research question, the session or a subagent |
| W17 | Writing | fixed       | Test is "narrow enough for one agent to answer with its own reads"                                      |
| W18 | Writing | fixed       | "subagent" throughout                                                                                   |
