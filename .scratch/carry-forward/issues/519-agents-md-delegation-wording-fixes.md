Status: open
Type: task
Origin: docs/reviews/feat-orchestration-model-policy.md
Blocks: none
Blocked by: none

# Fix five AGENTS.md sentences in the delegation rule (owner approval needed)

The pre-merge review of feat/orchestration-model-policy (1d86fd48) found
five wording defects in `AGENTS.md`. AGENTS.md says to propose edits to
AGENTS.md in chat and wait for approval, so they were not fixed on the
branch. Propose each one to the owner, then apply the approved text.

1. **§ Parallel agents: the "never merge" clause now reads as Claude Code
   only.** The sentence ends "on Claude Code that is a `general-task` agent
   — never merge each worker into `dev`". The dash clause used to close the
   whole workflow sentence; it now hangs off the Claude Code aside. The
   paragraph also says "The Delegator then tears down worktrees" before it
   says who the Delegator is. Proposed fix: move "The session spawns a
   subagent to act as Delegator (§ The session delegates); on Claude Code
   that is a `general-task` agent." to the start of the Delegator
   sentences, and make "Never merge each worker into `dev`." its own
   sentence. (Spec and Standards axes.)

2. **§ The session delegates: review and design jobs have no stated
   destination on Codex and Cursor.** The Codex and Cursor bullets say only
   where work "that is not review or design" goes. A reader can take that to
   mean the session keeps review and design work. Proposed fix: add to each
   bullet "Review and design jobs go to subagents at the review and design
   fills." model-policy § Codex and § Cursor already say this since the
   review-fix commit. (Spec and Adversarial axes.)

3. **§ The session delegates, Codex bullet: an unsourced causal claim.**
   "Lower-reasoning agents do this work well, so use them freely." AGENTS.md
   § Durable claims requires a command or a `hypothesis` / `untested` label.
   The owner stated a preference, not a measurement. Proposed fix: "The owner
   wants them used freely." (Standards axis.)

4. **§ The session delegates: the session cannot read its own stage
   artifacts.** The rule sends all "reading code or docs" to a subagent.
   Stage-gate Gate A (`stage-gate/SKILL.md` step 3) needs the section list
   from `plan-template.md`, and Recovery resumes by reading
   `decision-log.md`. Proposed fix: add "reading the stage-gate artifacts
   and templates" to the list of calls the session makes itself.
   (Adversarial axis.)

5. **§ The session delegates: the delegated `pre-merge-review` agent may
   have no write permission.** `general-task.md` treats a prompt that
   allows no path as read-only. The sentence "spawn one subagent to run the
   whole skill" does not tell the session to grant writes. Proposed fix:
   "…to run the whole skill, allowed to write `docs/reviews/` and
   `.scratch/carry-forward/` and to commit them, and to return…". Stage-gate
   step 7 should point at the same sentence. That is a skill edit, so it
   also needs approval. (Adversarial axis.)

Done when: the owner has approved or rejected each proposed sentence, the
approved ones are in `AGENTS.md`, and `pnpm verify` passes.
