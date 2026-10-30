# Staged copies of the global agent files

On the WSL host, `~/.claude/hooks/agent-guard.py` and `permissions.deny`
rules in `~/.claude/settings.json` replace `block-outside-repo.sh`; both
were installed 2026-10-19. The hook refuses an agent's writes to
`~/.claude/settings.json`, `~/.claude/settings.local.json` and
`~/.claude/hooks/`, and the deny rules also refuse Write and Edit calls to
`settings.json` and `hooks/`. An agent's write anywhere else in
`~/.claude/` goes ahead, and the hook
logs it to `~/.local/state/agent-guard/outside-writes.jsonl` except under
`~/.claude/projects/` and `~/.claude/plans/`. The hook sees a Write or
Edit call, and a Bash redirect or write command such as `cp` or `tee`
that names the path with `~` or in full. It expands `$HOME`, `$USER` and
the XDG directory variables before it checks a path. It does not see a
write made inside a script or an interpreter one-liner. The
`settings.json` in the Windows home wires no hook.

The files are versioned here, and **the user runs the install in their own
terminal**, from inside a checkout of the branch that holds the change. It checks
every source first, writes each copy next to its target as `.new`, and
moves the copies into place only when all are written:

```bash
bash <<'EOF'
set -euo pipefail
S="$(git rev-parse --show-toplevel)/docs/agents/home"
pairs=(
  "$S/AGENTS.md"                          "$HOME/.claude/AGENTS.md"
  "$S/CLAUDE.md.install"                  "$HOME/.claude/CLAUDE.md"
  "$S/model-policy.md"                    "$HOME/.claude/model-policy.md"
  "$S/skills/instruction-review/SKILL.md" "$HOME/.claude/skills/instruction-review/SKILL.md"
  "$S/hooks/bash-footguns.sh"             "$HOME/.claude/hooks/bash-footguns.sh"
  "$S/hooks/subagent-foreground-helpers.py" "$HOME/.claude/hooks/subagent-foreground-helpers.py"
)
for t in general discrete simple modest design; do
  pairs+=("$S/agents/$t-task.md" "$HOME/.claude/agents/$t-task.md"
          "$S/agents/$t-task.md" "$HOME/.claude_router/agents/$t-task.md")
done
for t in glm-task glm-flash-task; do
  pairs+=("$S/agents/$t.md" "$HOME/.claude_router/agents/$t.md")
done
for ((i = 0; i < ${#pairs[@]}; i += 2)); do
  test -s "${pairs[i]}" || { echo "missing or empty: ${pairs[i]}" >&2; exit 1; }
done
for ((i = 0; i < ${#pairs[@]}; i += 2)); do
  mkdir -p "$(dirname "${pairs[i+1]}")"
  cp "${pairs[i]}" "${pairs[i+1]}.new"
  cmp -s "${pairs[i]}" "${pairs[i+1]}.new"
done
for ((i = 0; i < ${#pairs[@]}; i += 2)); do
  mv "${pairs[i+1]}.new" "${pairs[i+1]}"
done
echo "installed $(( ${#pairs[@]} / 2 )) files"
EOF
```

`AGENTS.md` is reached only through the `@AGENTS.md` import in
`CLAUDE.md`, so both are needed. `~/.claude_router/` links `AGENTS.md`,
`CLAUDE.md` and `skills` to `~/.claude/`, but each card reads its own
`agents` folder: the "Claude" card reads `~/.claude/agents/`, and "Claude +
GLM workers" reads `~/.claude_router/agents/`. So the five worker types go
to both, and the two GLM types only to the second. The script prints
`installed 18 files`.

The staged file is named `CLAUDE.md.install` because a real `CLAUDE.md`
here would be auto-discovered as project context when an agent reads this
directory. Edit here first, then re-copy; the copies in `~/.claude/` are
not versioned. Until the copy is run, nothing in this directory is live.
