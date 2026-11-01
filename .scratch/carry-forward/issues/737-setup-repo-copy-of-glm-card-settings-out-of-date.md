Status: open
Type: task
Origin: .scratch/agent-reports/2026-10-31-general-task-ticket-735-fix.md (lines 86-91; gitignored; main checkout only)
Blocks: none
Blocked by: none

# Setup repo's copy of the GLM card settings is out of date

`/home/daniel/setup` tracks `home/.claude_router/settings.json`. Per the
ticket 735 report (Origin, lines 86-91) it is behind the live
`~/.claude_router/settings.json`: it lacks the glm-log-guard hook, the
subagent-foreground-helpers hook, and `~/pte-scratch`.

## Check

```
diff /home/daniel/setup/home/.claude_router/settings.json /home/daniel/.claude_router/settings.json | head -40
```

On 2026-10-31 it printed these differences, and nothing that looks like
a key or token:

- live file only: a PreToolUse entry with matcher
  `Read|Grep|Glob|Bash|Edit|Write|NotebookEdit|Monitor` that runs
  `python3 "$HOME/.claude/hooks/glm-log-guard.py"`
- live file only: a PreToolUse entry with matcher `Agent` that runs
  `python3 "$HOME/.claude/hooks/subagent-foreground-helpers.py"`
  (timeout 10)
- live file only: `"~/pte-scratch"` after `"~/.cache"` in a path list

## Done when

The diff command above shows no difference, or this ticket records why a
difference is kept.
