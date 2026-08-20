#!/usr/bin/env bash
# Ticket 235 side-effect check: with --no-stash, does a NORMAL commit (no lock
# race) still format staged files, still commit, and — the known trade-off —
# what happens to the unstaged half of a partially staged file?
#
# Usage: happy-path.sh <stash|nostash> <abs-path-to-lint-staged-bin> <lab-dir>
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
printf '{ "*": "prettier --ignore-unknown --write" }\n' > .lintstagedrc

if [ "$MODE" = "nostash" ]; then
  printf '#!/usr/bin/env sh\nexec "%s" --no-stash --no-hide-partially-staged\n' "$LSBIN" > .githooks/pre-commit
else
  printf '#!/usr/bin/env sh\nexec "%s"\n' "$LSBIN" > .githooks/pre-commit
fi
chmod +x .githooks/pre-commit

echo "base" > base.txt
git add -A
git commit -qm base --no-verify

# Partially staged file: badly formatted staged content, plus a later unstaged
# edit that must NOT end up in the commit.
printf 'const a   =    1\n' > partial.js
git add partial.js
printf 'const a   =    1\nconst unstagedTail   =  2\n' > partial.js

# A purely unstaged WIP file that must survive untouched.
printf 'PRECIOUS-WIP\n' > wip.txt

git commit -qm "normal commit" > commit.out 2>&1
RC=$?

echo "=== MODE=$MODE  commit exit=$RC ==="
echo "--- committed content of partial.js ---"
git show HEAD:partial.js 2>&1
echo "--- working tree partial.js ---"
cat partial.js
echo "--- unstaged wip.txt survives? ---"
if [ -f wip.txt ]; then echo "PRESENT: $(cat wip.txt)"; else echo "LOST"; fi
echo "--- git log ---"
git log --oneline
echo "--- git status ---"
git status --short
