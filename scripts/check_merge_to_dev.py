#!/usr/bin/env python3
"""Checks for the pure logic in scripts/merge_to_dev.py: no git, no writes.

Follows the check_worktree_pair.py convention -- a standalone script of
small checks, not a pytest suite (this repo has no pytest infra). The git
half of `pnpm merge-to-dev <branch>` is tested by live runs in a scratch
clone, recorded in docs/reviews/feat-merge-to-dev-arg.md.

    python scripts/check_merge_to_dev.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import merge_to_dev as m  # noqa: E402


def check_porcelain_reads_paths_and_rename_sources() -> list[str]:
    """`git status --porcelain -z` puts a rename's old path in its own
    NUL-separated field after the new one; both paths are dirty."""
    text = " M a.txt\0R  new.md\0old.md\0?? notes/x.md\0!! dist/y.js\0"
    got = m.parse_porcelain_z(text)
    want = [(" M", "a.txt"), ("R ", "new.md"), ("R ", "old.md"), ("??", "notes/x.md"), ("!!", "dist/y.js")]
    if got != want:
        return [f"parse_porcelain_z gave {got}, want {want}"]
    return []


def check_unrelated_dirty_files_do_not_block() -> list[str]:
    entries = [(" M", ".scratch/handoffs/note.md"), ("??", "scratch.txt")]
    got = m.merge_blockers(entries, {"scripts/merge_to_dev.py", "docs/x.md"})
    if got:
        return [f"unrelated dirty files must not block, got {got}"]
    return []


def check_dirty_file_the_merge_touches_blocks() -> list[str]:
    entries = [(" M", "docs/x.md"), ("??", "docs/new.md"), (" M", "other.md")]
    got = m.merge_blockers(entries, {"docs/x.md", "docs/new.md"})
    want = ["docs/x.md (modified, and the merge changes it)", "docs/new.md (untracked, and the merge writes it)"]
    if got != want:
        return [f"merge_blockers gave {got}, want {want}"]
    return []


def check_staged_change_blocks_anywhere() -> list[str]:
    """git merge refuses when the index differs from HEAD, and a merge
    commit would otherwise record the staged change too."""
    got = m.merge_blockers([("M ", "unrelated.md"), ("A ", "new.md")], {"docs/x.md"})
    want = ["unrelated.md (staged; the merge commit would record it)", "new.md (staged; the merge commit would record it)"]
    if got != want:
        return [f"merge_blockers gave {got}, want {want}"]
    return []


def check_ignored_files_never_block() -> list[str]:
    """git overwrites ignored files on merge, and today's clean check does
    not count them either."""
    got = m.merge_blockers([("!!", "dist/y.js")], {"dist/y.js"})
    if got:
        return [f"ignored files must not block, got {got}"]
    return []


def check_touched_paths_match_whatever_the_case() -> list[str]:
    """Windows checkouts are case-insensitive, so `Docs/X.md` dirty and
    `docs/x.md` merged are the same file. Refusing on a case variant is
    the safe side."""
    got = m.merge_blockers([(" M", "Docs/X.md")], {"docs/x.md"})
    if len(got) != 1:
        return [f"a case variant of a touched path must block, got {got}"]
    return []


CHECKS = (
    check_porcelain_reads_paths_and_rename_sources,
    check_unrelated_dirty_files_do_not_block,
    check_dirty_file_the_merge_touches_blocks,
    check_staged_change_blocks_anywhere,
    check_ignored_files_never_block,
    check_touched_paths_match_whatever_the_case,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"merge_to_dev.py checks ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
