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

| ID  | Axis        | Disposition | Ticket / note                                                                 |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | Needs a change to owner-approved wording; passed to the owner for a decision  |
| A2  | Adversarial | wontfix     | Needs a change to owner-approved wording; passed to the owner with S1         |
| A3  | Adversarial | wontfix     | Gap in general-task.md format predates this branch; outside the approved edit |
| A4  | Adversarial | wontfix     | Duplicate of S2                                                               |
| A5  | Adversarial | wontfix     | Duplicate of S4                                                               |
| A6  | Adversarial | wontfix     | Needs a change to owner-approved wording; passed to the owner                 |
| A7  | Adversarial | wontfix     | Duplicate of S5                                                               |
| S1  | Standards   | wontfix     | Needs a change to owner-approved wording; passed to the owner with A2         |
| S2  | Standards   | wontfix     | Needs a change to owner-approved wording; passed to the owner                 |
| S3  | Standards   | wontfix     | Needs a change to owner-approved wording; passed to the owner                 |
| S4  | Standards   | wontfix     | Reference resolves in this repo; changing it changes approved wording         |
| S5  | Standards   | wontfix     | Needs a change to owner-approved wording; passed to the owner                 |
| S6  | Standards   | wontfix     | Formatting of owner-approved text; passed to the owner                        |
| S7  | Standards   | wontfix     | Rewording would mean rewriting a commit; the subject names the main rule      |
