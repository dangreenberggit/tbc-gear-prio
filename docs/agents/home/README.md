# Staged copies of ~/.claude/AGENTS.md and ~/.claude/CLAUDE.md

`~/.claude/hooks/agent-guard.py` and `permissions.deny` rules in
`~/.claude/settings.json` replace `block-outside-repo.sh`; they are being
installed 2026-10-19. The hook refuses an agent's writes to
`~/.claude/settings.json`, `~/.claude/settings.local.json` and
`~/.claude/hooks/`, and the deny rules also refuse `settings.json` and
`hooks/`. An agent's write anywhere else in `~/.claude/`, including the
two copies below, goes ahead, and the hook logs it to
`~/.local/state/agent-guard/outside-writes.jsonl` when it sees the path:
a Write or Edit call, or a Bash command that names the path. Writes under
`~/.claude/projects/` and `~/.claude/plans/` are not logged.

The files are versioned here, and **the user runs the copy in their own
terminal**:

```bash
cp docs/agents/home/AGENTS.md ~/.claude/AGENTS.md
cp docs/agents/home/CLAUDE.md.install ~/.claude/CLAUDE.md
```

Both files are required — `AGENTS.md` is reached only through the
`@AGENTS.md` import in `CLAUDE.md`, so copying `AGENTS.md` alone loads
nothing. Verify with `ls ~/.claude/AGENTS.md ~/.claude/CLAUDE.md`.

The staged file is named `CLAUDE.md.install` because a real `CLAUDE.md`
here would be auto-discovered as project context when an agent reads this
directory. Edit here first, then re-copy; the copies in `~/.claude/` are
not versioned. Until the copy is run, nothing in this directory is live.
