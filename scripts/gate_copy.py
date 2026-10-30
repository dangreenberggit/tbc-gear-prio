#!/usr/bin/env python3
"""Runs dev's committed copy of scripts/check_merge_ready.py (ticket 733).

`pnpm merge-to-dev` (scripts/merge_to_dev.py) and `pnpm merge-ready`
(scripts/check_merge_ready.py) both import `merge_ready_at` from here. It
lives in its own file so that a branch which edits only
check_merge_ready.py cannot also redefine the call that merge-to-dev makes.
"""

from __future__ import annotations

import subprocess
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MERGE_READY = "scripts/check_merge_ready.py"


def merge_ready_at(
    rev: str,
    checkout: Path,
    branch: str,
    ack_open_blockers: bool,
    review: Path | None = None,
) -> int:
    """Run `rev`'s committed copy of check_merge_ready.py on `branch`, which
    is checked out at `checkout`; return its exit code.

    The branch's own copy alone could be edited to exempt the branch from
    its review (ticket 733). The copy runs with `__file__` set to the
    checkout's path, so its ROOT, and every ticket and review file it reads,
    are the checkout's.
    """
    shown = subprocess.run(
        ["git", "show", f"{rev}:{MERGE_READY}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if shown.returncode != 0:
        print(f"FAIL: cannot read {MERGE_READY} at {rev}: {shown.stderr.strip()}", file=sys.stderr)
        return 1
    name = "check_merge_ready_at_" + rev.replace("/", "_")
    module = types.ModuleType(name)
    module.__file__ = str(checkout / MERGE_READY)
    # dataclasses looks the module up in sys.modules while it builds a class.
    sys.modules[name] = module
    try:
        exec(compile(shown.stdout, f"{rev}:{MERGE_READY}", "exec"), module.__dict__)
        return module.check(branch=branch, review=review, ack_open_blockers=ack_open_blockers)
    finally:
        del sys.modules[name]
