#!/usr/bin/env python3
"""
check_rename_contradictions.py — find sentences a blanket rename flattened.

    python scripts/check_rename_contradictions.py merge-to-dev
    python scripts/check_rename_contradictions.py merge-to-dev "Stage [0-9]"

A find-and-replace corrupts text wherever the OLD string appeared in a sentence
that was *about* that string -- a ban, a quote, a migration note, a changelog
row. "The command is `pnpm land`, never `pnpm merge-to-dev`" becomes "is
`pnpm merge-to-dev`, never `pnpm merge-to-dev`": a tautology that reads as
fluent prose, so no reviewer skimming a diff catches it, and no grep for the
old name finds it -- the old name is exactly what is gone.

The tell is structural, not semantic: the NEW token appearing twice across a
contrast word. This reports those lines. It does not judge them -- "a Stage 2
gate rather than a Stage 4 item" matches the same shape and is correct English.
A human reads the hits.

Exit code is always 0. This is a review aid, not a gate: the false-positive
rate is real, and a check that cries wolf gets muted.
"""

from __future__ import annotations

import re
import subprocess
import sys

CONTRAST = r"never|not|instead of|rather than|formerly|no longer|was|used to|->|→"

SKIP_PATHS = (".scratch/", "docs/reviews/", "test/fixtures/", "PLAN-REVIEW.md")


def tracked_text_files() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files"], capture_output=True, text=True, check=True
    ).stdout.splitlines()
    keep = (".md", ".ts", ".tsx", ".py", ".json", ".sh", ".yml", ".yaml")
    return [
        f
        for f in out
        if f.endswith(keep) and not any(f.startswith(s) or s in f for s in SKIP_PATHS)
    ]


def scan(token: str) -> list[tuple[str, int, str]]:
    # the token on both sides of a contrast word, within one sentence
    pattern = re.compile(
        rf"({token})(?:(?!\. ).){{0,70}}?\b(?:{CONTRAST})\b(?:(?!\. ).){{0,30}}?({token})",
        re.IGNORECASE,
    )
    hits = []
    for path in tracked_text_files():
        try:
            with open(path, encoding="utf-8") as fh:
                for n, line in enumerate(fh, 1):
                    if pattern.search(line):
                        hits.append((path, n, line.rstrip()))
        except (OSError, UnicodeDecodeError):
            continue
    return hits


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__.strip())
        return 0

    total = 0
    for token in argv[1:]:
        hits = scan(token)
        total += len(hits)
        print(f"\n=== {token!r}: {len(hits)} line(s) to eyeball ===")
        for path, n, line in hits:
            text = line.strip()
            print(f"  {path}:{n}")
            print(f"    {text[:160]}{'...' if len(text) > 160 else ''}")

    if total:
        print(
            f"\n{total} line(s) matched. Each one contrasts a token with itself.\n"
            "That is either a rename that flattened a quote, or a legitimate\n"
            "sentence contrasting two different values. Read them and decide."
        )
    else:
        print("\nNo self-contradicting lines found.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
