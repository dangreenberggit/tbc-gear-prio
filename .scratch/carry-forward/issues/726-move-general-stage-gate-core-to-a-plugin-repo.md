Status: open
Type: process
Origin: owner decision in session, 2026-10-27, on ticket 724
Blocks: none
Blocked by: 724
Related: 724

# Move the general stage-gate core to a plugin repo (724 step 2)

Owner, 2026-10-27, on the two-step plan for ticket 724: "i agree with
your 2 step rec. it makes the most sense to me."; "sure lets go".

Step 1 (ticket 724, branch `feat/stage-gate-split-724`) keeps only
general text in the stage-gate skill and seat files and puts this
repo's values in `docs/agents/stage-gate-project.md`. This ticket moves
the general files to a plugin repo. It starts after step 1 is on `dev`.

## First task: the symlink load test

Make a throwaway plugin folder with `.claude-plugin/plugin.json`, one
skill, one agent and one hook, symlinked under `~/.claude/skills/`. Run
`claude plugin list`, then start a session and see whether the agent
and the hook load. Whether they load this way is hypothesis, untested.

## Then

- The pipeline's own paths that step 1 left in the general files:
  `.claude/skills/stage-gate/plan-template.md`,
  `.claude/skills/stage-gate/parts.md`, `.claude/agents/` and
  `.claude/agents/gate-*.md`, the run-log hook and
  `.claude/settings.json`.
- Seat-name prefixes in `.claude/skills/stage-gate/SKILL.md`,
  `AGENTS.md` § Subagent reports (the `gate-*` sentence),
  `docs/agents/model-policy.md`, `docs/agents/orchestration.md` and
  `.claude/hooks/log-agent-run.py`.
- Delete the project copies of the three seats (`gate-planner`,
  `gate-reviewer`, `gate-executor`) in the same change, because project
  agents outrank plugin agents (hypothesis, untested).
- The two hooks, `.claude/hooks/log-agent-run.py` and
  `.claude/hooks/subagent-foreground-helpers.py`, and
  `pnpm foreground-hook:check`, which finds the hook and settings by
  relative path.
- Whether `parallel-phase` moves too.
- The hard-coded `.scratch/agent-runs` path in
  `.claude/hooks/log-agent-run.py` (`grep -n agent-runs
  .claude/hooks/log-agent-run.py`).
