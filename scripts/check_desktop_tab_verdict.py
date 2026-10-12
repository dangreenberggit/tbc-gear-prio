#!/usr/bin/env python3
"""Checks for the verdict of scripts/check_desktop_tab.py: no server, no build.

Follows the check_merge_to_dev.py convention -- a standalone script of small
checks, not a pytest suite. The rest of the desktop gate needs go, make and
Chrome, so it is run by hand (`pnpm desktop-gate:check`), not here.

    python scripts/check_desktop_tab_verdict.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_desktop_tab as g  # noqa: E402

# (bytes_rc, gate_ok, golden_rc) -> expected verdict
CASES = [
    ((0, True, 0), True),
    ((1, True, 0), False),  # ticket 627: a byte mismatch printed PASS
    ((0, False, 0), False),
    ((0, True, 1), False),
]


def main() -> int:
    problems = [
        f"gate_passed{args} gave {got}, want {want}"
        for args, want in CASES
        if (got := g.gate_passed(*args)) != want
    ]
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    if problems:
        return 1
    print(f"check_desktop_tab_verdict.py ok ({len(CASES)} cases)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
