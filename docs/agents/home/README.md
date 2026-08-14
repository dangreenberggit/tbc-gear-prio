# Staged copies of ~/.claude/AGENTS.md and ~/.claude/CLAUDE.md

`~/.claude/hooks/block-outside-repo.sh` blocks agent writes to `~/.claude/`,
so the files are versioned here and **the user runs the copy in their own
terminal** — an agent that attempts it gets blocked by that same hook:

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
