Status: open
Type: chore
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (standards axis, 3-St1)
Blocks: none
Blocked by: none

# `package.json`'s committed line endings flipped to CRLF

Commit `c2d3897` ("Gate the CURATED_SET_PHASE mirror against the Python that
produces it") added one script line to `package.json` and shows as
`67 insertions(+), 66 deletions(-)` — every line replaced, because the file's
committed bytes changed from LF to CRLF.

Verified on the blobs rather than the diff (a piped `git show` misleads here):

```
git show c2d3897~1:package.json | python -c "import sys; d=sys.stdin.buffer.read(); print('CRLF:', d.count(b'\r\n'))"   # 0
git show c2d3897:package.json   | python -c "import sys; d=sys.stdin.buffer.read(); print('CRLF:', d.count(b'\r\n'))"   # 67
git show HEAD:package.json      | python -c "import sys; d=sys.stdin.buffer.read(); print('CRLF:', d.count(b'\r\n'))"   # 67
git config core.autocrlf                                                                                                # false
```

`.gitattributes` covers only `data/proto/**` and `packages/core/src/proto/**`, so
nothing pins this file. With `core.autocrlf=false` the CRLF is now permanent in
the repository, and the next contributor editing it on a POSIX machine flips it
back — producing another whole-file diff in the opposite direction.

This is the case AGENTS.md's loop step 2 names: pre-commit runs `lint-staged`
against `*`, so an unrelated whole-file rewrite rides along with a real two-line
change and hides it. `scripts/generate_item_gem_index.py` in the same commit
range adds `newline="\n"` for exactly this reason.

Only `package.json` flipped in that commit; the other four files are clean. The
CRLF is new to this file — `git log --format=%H -- package.json` shows `c2d3897`
as the most recent change and the `dev`-side blob is LF.

## Fix

Restore LF in `package.json`, and decide whether to widen `.gitattributes` so it
cannot recur. The existing `.gitattributes` comment explains the proto trees were
pinned to stop exactly this churn; the same argument applies to the repo's
root-level JSON.

## Acceptance

- [ ] `git show HEAD:package.json` contains zero CRLF pairs.
- [ ] A rule prevents recurrence, or a note records why the file is left
      unpinned.
