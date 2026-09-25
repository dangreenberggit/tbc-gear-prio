Status: open
Type: task
Origin: orchestration model-policy proposal, revision 2 (2026-09-25), applied on feat/orchestration-model-policy
Blocks: none
Blocked by: none

# Check whether edited agent definitions need a session restart

## The claim to check

Two lines say agent files register only at session start:

- `AGENTS.md` § Stage-gate features: "files added there register at session
  start only, so a new or edited seat needs a fresh session."
- `.claude/skills/stage-gate/SKILL.md` § Seats (mirrored in
  `.agents/skills/stage-gate/SKILL.md`): "agent files register at startup
  only; restart the session."

The Claude Code sub-agents docs (https://code.claude.com/docs/en/sub-agents,
fetched 2026-09-25) say `.claude/agents/` is watched and that new or edited
files take effect with no restart. They also say a restart is still needed
when the directory did not exist at session start. Which behavior the
installed version has is untested. `claude --version` printed
`2.1.267 (Claude Code)` on 2026-09-25.

## What to do

1. In a session started with `.claude/agents/` present, add a throwaway
   agent file, then spawn it by its `subagent_type`. Edit its body and spawn
   it again. Record whether each spawn is recognized and whether the edit is
   used, with the version.
2. Delete the throwaway file.
3. Correct both lines to match what step 1 shows. Copy the stage-gate edit
   byte-for-byte to `.agents/skills/stage-gate/SKILL.md`.

The "restart the session rather than fall back to a built-in" sentences in
`docs/agents/model-policy.md` § Claude Code and `AGENTS.md` § The session
delegates are correct under either behavior. Leave them.

Done when: both lines state the behavior step 1 measured, with the version
and date, and `pnpm verify` passes.
