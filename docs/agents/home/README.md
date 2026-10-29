# Staged copies of ~/.claude/AGENTS.md and ~/.claude/CLAUDE.md

On the WSL host, `~/.claude/hooks/agent-guard.py` and `permissions.deny`
rules in `~/.claude/settings.json` replace `block-outside-repo.sh`; both
were installed 2026-10-19. The hook refuses an agent's writes to
`~/.claude/settings.json`, `~/.claude/settings.local.json` and
`~/.claude/hooks/`, and the deny rules also refuse Write and Edit calls to
`settings.json` and `hooks/`. An agent's write anywhere else in
`~/.claude/`, including the two copies below, goes ahead, and the hook
logs it to `~/.local/state/agent-guard/outside-writes.jsonl` except under
`~/.claude/projects/` and `~/.claude/plans/`. The hook sees a Write or
Edit call, and a Bash redirect or write command such as `cp` or `tee`
that names the path with `~` or in full. It expands `$HOME`, `$USER` and
the XDG directory variables before it checks a path. It does not see a
write made inside a script or an interpreter one-liner. The
`settings.json` in the Windows home wires no hook.

The files are versioned here, and **the user runs the copy in their own
terminal**:

```bash
cp docs/agents/home/AGENTS.md ~/.claude/AGENTS.md
cp docs/agents/home/CLAUDE.md.install ~/.claude/CLAUDE.md
mkdir -p ~/.claude/skills/instruction-review
cp docs/agents/home/skills/instruction-review/SKILL.md ~/.claude/skills/instruction-review/SKILL.md
```

Both files are required — `AGENTS.md` is reached only through the
`@AGENTS.md` import in `CLAUDE.md`, so copying `AGENTS.md` alone loads
nothing. Verify with `ls ~/.claude/AGENTS.md ~/.claude/CLAUDE.md`.

The staged file is named `CLAUDE.md.install` because a real `CLAUDE.md`
here would be auto-discovered as project context when an agent reads this
directory. Edit here first, then re-copy; the copies in `~/.claude/` are
not versioned. Until the copy is run, nothing in this directory is live.
