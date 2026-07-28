#!/usr/bin/env python3
"""Fail if .claude/skills and .agents/skills diverge (DOC mirror check)."""

from __future__ import annotations

import filecmp
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEFT = ROOT / ".claude" / "skills"
RIGHT = ROOT / ".agents" / "skills"


def main() -> int:
    if not LEFT.is_dir() or not RIGHT.is_dir():
        print("missing .claude/skills or .agents/skills", file=sys.stderr)
        return 1

    left_files = {p.relative_to(LEFT) for p in LEFT.rglob("*") if p.is_file()}
    right_files = {p.relative_to(RIGHT) for p in RIGHT.rglob("*") if p.is_file()}
    only_left = sorted(left_files - right_files)
    only_right = sorted(right_files - left_files)
    mismatched = sorted(
        rel
        for rel in left_files & right_files
        if not filecmp.cmp(LEFT / rel, RIGHT / rel, shallow=False)
    )

    if not only_left and not only_right and not mismatched:
        print("skill mirrors match (.claude/skills <-> .agents/skills)")
        return 0

    if only_left:
        print("only in .claude/skills:", file=sys.stderr)
        for rel in only_left:
            print(f"  {rel.as_posix()}", file=sys.stderr)
    if only_right:
        print("only in .agents/skills:", file=sys.stderr)
        for rel in only_right:
            print(f"  {rel.as_posix()}", file=sys.stderr)
    if mismatched:
        print("content differs:", file=sys.stderr)
        for rel in mismatched:
            print(f"  {rel.as_posix()}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
