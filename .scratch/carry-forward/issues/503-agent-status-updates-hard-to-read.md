Status: open
Type: process
Origin: 2026-09-24 closeout session (chat, no review file)
Blocks: none
Blocked by: none

# Agent status updates to the owner are hard to read

**What happened.** During the 2026-09-24 closeout session, the orchestrating
agent's messages to the owner went wrong in four ways:

- Mid-task updates read as a stream of consciousness and repeated the same
  list of pending questions every turn.
- Separate lists each restarted at 1, 2, 3, so the owner's answers were
  ambiguous. The owner called the numbering "trash".
- Decision questions came in nested bullets with invented terms
  ("best-stop", "full-path", "provenance cycle"). The owner called one "too
  snappy and wannabe-intelligent to be intelligible … a flop".
- The owner finally had to ask for "a full response without stream of
  consciousness or repetition that's worth reading".

**What worked.** A single consolidated reply with four sections (what is
finished, what the tests showed, decisions needed, what comes after). Every
decision was labelled by ticket number and gave a recommendation with its
reason. It ended with a one-line answer template. Also, having a focused
subagent draft a hard decision question in plain paragraphs, which the owner
then understood.

**Proposed change**, for the owner to approve before any edit, because
AGENTS.md changes need approval: add to AGENTS.md § Interacting with the
user, or to the stage-gate skill's Orchestrator conduct, rules like these:

1. Label every question to the owner by its ticket number, never by list
   numbers that restart.
2. Have a focused subagent draft any decision that needs reasoning, as
   plain short paragraphs: what happens today, what each option does to a
   concrete example, the recommendation and why. No nested bullets, no
   invented terms.
3. Keep mid-task updates to one or two lines. Do not repeat the
   pending-question list unless something in it changed.
4. When several results and decisions pile up, send one consolidated
   status (finished / found / decisions / next, with an answer template)
   instead of a drip of partial messages.

**Related:** the auto-memory files
`feedback-owner-questions-unique-labels-plain-prose.md` and
`feedback-lead-with-the-conclusion.md` already hold parts of this for
future sessions. This ticket is about making it durable in the repo's agent
instructions.

**What would close this:** the owner approves a wording, the edit lands in
AGENTS.md or the stage-gate skill, and it is reviewed with the
writing-for-agents skill.

**Priority:** take up at the end of the Upgrades-tab closeout arc, before
or with the merge ask.
