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


def logical_lines(text: str) -> list[tuple[int, str]]:
    """Join hard-wrapped prose back into the sentences it was written as.

    Markdown here wraps at ~80 columns, so a flattened sentence usually straddles
    a line break -- which a per-line scan cannot see, and which is therefore the
    common case rather than the exotic one. Blank lines, headings, fences and
    list/table markers end a block; everything else in a paragraph joins with a
    space. The reported line number is the block's first line.
    """
    blocks: list[tuple[int, str]] = []
    start, buf, fence = 0, [], False
    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.rstrip()
        if line.lstrip().startswith("```"):
            fence = not fence
        breaks = not line.strip() or fence or line.lstrip().startswith(("#", "|", "- ", "* ", ">"))
        if breaks:
            if buf:
                blocks.append((start, " ".join(buf)))
                buf = []
            if line.strip():
                blocks.append((n, line))
            continue
        if not buf:
            start = n
        buf.append(line.strip())
    if buf:
        blocks.append((start, " ".join(buf)))
    return blocks


def scan(token: str) -> list[tuple[str, int, str]]:
    # the token on both sides of a contrast word, within one sentence
    pattern = re.compile(
        rf"({token})(?:(?!\. ).){{0,70}}?\b(?:{CONTRAST})\b(?:(?!\. ).){{0,30}}?({token})",
        re.IGNORECASE,
    )
    tok = re.compile(token, re.IGNORECASE)

    def flattened_row(block: str) -> bool:
        """A before/after row whose two cells now say the same thing.

        Both cells merely *mentioning* the token is normal in a banned-words
        table ("it lands in Stage 2" -> "it ships in Stage 2"). The bug is when
        the cells became indistinguishable.
        """
        if not block.startswith("|"):
            return False
        cells = [c.strip() for c in block.strip().strip("|").split("|")]
        cells = [c for c in cells if tok.search(c)]
        return len(cells) >= 2 and len(set(cells)) == 1

    def contradicts(block: str) -> bool:
        """True only when the two sides matched the SAME text.

        `token` may be a pattern -- "Stage [0-9]" matches both halves of "a
        Stage 2 gate rather than a Stage 4 item", which is correct English
        contrasting two different values. Comparing what each side actually
        matched keeps those out.
        """
        for a, b in pattern.findall(block):
            if a.strip().lower() == b.strip().lower():
                return True
        return False

    hits = []
    for path in tracked_text_files():
        try:
            text = open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError):
            continue
        for n, block in logical_lines(text):
            if contradicts(block) or flattened_row(block):
                hits.append((path, n, block))
    return hits


def main(argv: list[str]) -> int:
    # hits carry the repo's em-dashes and section marks; a cp1252 console would
    # mangle them, and a redirected one would raise mid-scan
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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
