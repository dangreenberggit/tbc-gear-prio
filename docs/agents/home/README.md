# Staged copies of ~/.claude/AGENTS.md and ~/.claude/CLAUDE.md

A hook blocks agent writes to `~/.claude/`, so the files are versioned here
and copied by hand:

```bash
cp docs/agents/home/AGENTS.md docs/agents/home/CLAUDE.md ~/.claude/
```

Edit here first, then re-copy. The copy in `~/.claude/` is not versioned.
