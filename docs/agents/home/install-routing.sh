#!/usr/bin/env bash
# Install the routing change of ticket 808: ~/.claude/routing.md, the global
# files that now point at it, the agent files for both cards, and the
# flash-over-sonnet hook. The owner runs it in their own terminal, from any
# directory; it is safe to run again.
#   bash docs/agents/home/install-routing.sh
# Each file it replaces is first copied to ~/.claude/backups/routing-<UTC time>/,
# under its path relative to $HOME. It ends with one cmp line per file.
set -euo pipefail
S="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
export BACKUP_DIR="$HOME/.claude/backups/routing-$STAMP"

pairs=(
  "$S/routing.md"                                       "$HOME/.claude/routing.md"
  "$S/AGENTS.md"                                        "$HOME/.claude/AGENTS.md"
  "$S/model-policy.md"                                  "$HOME/.claude/model-policy.md"
  "$S/skills/parallel-phase/SKILL.md"                   "$HOME/.claude/skills/parallel-phase/SKILL.md"
  "$S/skills/parallel-phase/adapters/claude-code.md"    "$HOME/.claude/skills/parallel-phase/adapters/claude-code.md"
  "$S/skills/pre-merge-review/SKILL.md"                 "$HOME/.claude/skills/pre-merge-review/SKILL.md"
  "$S/skills/code-review/SKILL.md"                      "$HOME/.claude/skills/code-review/SKILL.md"
  "$S/skills/instruction-review/SKILL.md"               "$HOME/.claude/skills/instruction-review/SKILL.md"
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
  src="${pairs[i]}" dst="${pairs[i+1]}"
  cmp -s "$src" "$dst" && continue
  if [ -e "$dst" ]; then
    rel="${dst#"$HOME"/}"
    mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
    cp -p "$dst" "$BACKUP_DIR/$rel"
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst.new"
  mv "$dst.new" "$dst"
done

# The GLM card reads ~/.claude_router/; it links AGENTS.md to ~/.claude/ the same way.
link="$HOME/.claude_router/routing.md"
if [ "$(readlink "$link" 2>/dev/null)" != "$HOME/.claude/routing.md" ]; then
  if [ -e "$link" ] || [ -L "$link" ]; then
    mkdir -p "$BACKUP_DIR/.claude_router"
    cp -P "$link" "$BACKUP_DIR/.claude_router/routing.md"
  fi
  ln -sfn "$HOME/.claude/routing.md" "$link"
fi

bash "$S/hooks/install-flash-over-sonnet.sh"

echo "--- installed vs staged"
rc=0
for ((i = 0; i < ${#pairs[@]}; i += 2)); do
  if cmp -s "${pairs[i]}" "${pairs[i+1]}"; then echo "same    ${pairs[i+1]}"
  else echo "DIFFERS ${pairs[i+1]}"; rc=1; fi
done
if cmp -s "$S/routing.md" "$link"; then echo "same    $link -> $(readlink "$link")"
else echo "DIFFERS $link"; rc=1; fi
if cmp -s "$S/hooks/flash-over-sonnet.py" "$HOME/.claude/hooks/flash-over-sonnet.py"; then
  echo "same    $HOME/.claude/hooks/flash-over-sonnet.py"
else echo "DIFFERS $HOME/.claude/hooks/flash-over-sonnet.py"; rc=1; fi
if [ -d "$BACKUP_DIR" ]; then echo "backups in $BACKUP_DIR"; else echo "nothing replaced, no backups"; fi
exit $rc
