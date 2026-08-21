#!/usr/bin/env bash
# Reproduce ticket 235: make lint-staged's error-recovery path race
# .git/index.lock, and observe whether unstaged working-tree content survives.
#
# Usage: repro.sh <stash|nostash|guard> <abs-path-to-lint-staged-bin> <lab-dir>
#   stash   = current repo config (lint-staged default: backup stash + restore)
#   nostash = lint-staged --no-stash
#   guard   = proposed mitigation (pre-commit lock guard, then lint-staged)
#
# Mechanism under test (lint-staged 15.5.2, lib/gitWorkflow.js:326-344):
# restoreOriginalState() runs `git reset --hard HEAD` and THEN
# `git stash apply --index`. A task failure sends us down that path; if the
# lock blocks the stash apply after the reset already wiped the tree, the
# unstaged work is gone from the working tree.
#
# The lab is a throwaway git repo; this script never touches the real repo.
set -u
MODE="$1"
LSBIN="$2"
LAB="$3"

rm -rf "$LAB"
mkdir -p "$LAB"
cd "$LAB" || exit 1

git init -q .
git config user.email t@t.t
git config user.name t
git config core.hooksPath .githooks
mkdir -p .githooks

# A task that fails: this drives lint-staged into restoreOriginalState().
# It sleeps first so the harness can take .git/index.lock during the window.
cat > failing-task.sh <<'TASK'
#!/usr/bin/env sh
sleep 3
exit 1
TASK
chmod +x failing-task.sh

printf '{ "*": "./failing-task.sh" }\n' > .lintstagedrc

case "$MODE" in
  nostash)
    printf '#!/usr/bin/env sh\nexec "%s" --no-stash --no-hide-partially-staged\n' "$LSBIN" > .githooks/pre-commit
    ;;
  guard)
    # Mitigation: refuse to start while another process holds the index lock.
    cat > .githooks/pre-commit <<GUARD
#!/usr/bin/env sh
lock="\$(git rev-parse --git-path index.lock)"
i=0
while [ -f "\$lock" ]; do
  i=\$((i + 1))
  if [ "\$i" -gt 10 ]; then
    echo "index.lock held by another git process — commit refused." >&2
    exit 1
  fi
  sleep 1
done
exec "$LSBIN"
GUARD
    ;;
  *)
    printf '#!/usr/bin/env sh\nexec "%s"\n' "$LSBIN" > .githooks/pre-commit
    ;;
esac
chmod +x .githooks/pre-commit

# Baseline commit so a backup stash is possible. --no-verify because this is
# lab setup, not the commit under test.
echo "base" > base.txt
git add -A
git commit -qm base --no-verify

# STAGED change — what the commit is meant to capture.
printf 'staged change\n' > staged.txt
git add staged.txt

# UNSTAGED WIP — the content ticket 235 reports as destroyed.
printf 'PRECIOUS-WIP-CONTENT-DO-NOT-LOSE\n' > wip.txt
printf 'more precious wip\n' >> base.txt
git add wip.txt
printf 'PRECIOUS-WIP-CONTENT-DO-NOT-LOSE\nplus unstaged tail\n' > wip.txt

# Another process holds .git/index.lock across the restore window, then
# releases it. The failing task sleeps 3s, so grabbing the lock at ~2s means
# it is held exactly while lint-staged tries to recover.
( sleep 2; : > .git/index.lock; sleep 7; rm -f .git/index.lock ) &
HOLDER=$!

git commit -qm "commit under lock race" > commit.out 2>&1
COMMIT_RC=$?
wait $HOLDER 2>/dev/null
rm -f .git/index.lock

echo "=== MODE=$MODE  commit exit=$COMMIT_RC ==="
echo "--- commit output (tail) ---"
tail -30 commit.out
echo "--- unstaged WIP file wip.txt ---"
if [ -f wip.txt ]; then
  echo "PRESENT: $(tr '\n' '|' < wip.txt)"
else
  echo "LOST -- wip.txt gone"
fi
echo "--- unstaged WIP edit inside base.txt ---"
if grep -q 'more precious wip' base.txt; then echo "PRESENT"; else echo "LOST -- edit gone"; fi
echo "--- git stash list ---"
git stash list
echo "--- git log ---"
git log --oneline
echo "--- git status ---"
git status --short
