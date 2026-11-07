Status: open
Type: process
Origin: .scratch/agent-reports/2026-10-31-general-task-ticket-735-instruction-review-1.md (F6; gitignored; main checkout only)
Blocks: none
Blocked by: owner approval of any settings or hook change (agents cannot edit `~/.claude_router/settings.json`)

# GLM workers can write some setup files

On the "Claude + GLM workers" card, a GLM worker's Write and Edit pass
every permission rule and hook for these paths, and all of them steer
later sessions:

- `~/.claude_router/rules/**`
- the project's `.claude/agents/`, `.claude/skills/` and
  `.claude/settings.json`

## Evidence

Finding F6 of the ticket 805 review 1 is the table row at
`.scratch/agent-reports/2026-10-31-general-task-ticket-735-instruction-review-1.md:98`
(gitignored; main checkout only). It cites
`~/.claude_router/settings.json:47-91` and `:18`, and says:

- (a) `~/.claude_router/rules/**` has no deny rule and no PROTECT entry.
  The folder does not exist yet (`ls -ld ~/.claude_router/rules` reports
  no such folder).
- (b) The project's `.claude/agents/`, `.claude/skills/` and
  `.claude/settings.json` have no deny rule, and the project
  `.claude/settings.json` has no `permissions`.
- Both hooks allow both kinds of path when replayed with
  `agent_type: glm-flash-task`. In `bypassPermissions` the
  protected-path check allows them too.

The row also states, marked "Hypothesis, untested", that Claude Code
loads user rules from `$CLAUDE_CONFIG_DIR/rules` the way
`memory.md:273` describes `~/.claude/rules/`. The row says this was
already true before ticket 805's change and that the swap does not
change it.

The hook replay method is in
`.scratch/agent-reports/2026-10-31-ticket-735-hook-probe.sh`
(gitignored; main checkout only). It feeds PreToolUse JSON to the real
`~/.claude/hooks/glm-log-guard.py` with `HOME` set to a throwaway
folder.

Needs the owner's approval of any settings or hook change.

## Done when

A GLM worker's write to each path above is refused, checked on fixtures
with the hook replay method of
`.scratch/agent-reports/2026-10-31-ticket-735-hook-probe.sh`, and Claude
agents can still write the files they legitimately need.

Renumbered from 736 on 2026-11-05: `dev` had already filed a different ticket 736. Report file names under `.scratch/agent-reports/` keep the old number.
