#!/usr/bin/env python3
"""Shared pin/vendor contract for the checks that read the fork clone.

Four checks re-derive something from `vendor/tbc-new-fork` and compare it to a
committed artifact. All four need the same three preconditions, and getting any
of them subtly wrong turns a gate into decoration:

1. **Vendor absent is not a failure.** `vendor/` is gitignored, so a fresh
   clone and CI have no fork. Absence is an ordinary state.
2. **The pin must be readable.** A lockfile that is missing, malformed, or
   carries a non-string `commit` cannot be compared against.
3. **Clone HEAD must equal the pin.** The committed artifact describes the
   pinned commit; re-deriving it from a different commit compares two different
   questions and would report drift that is really just a moved checkout.

This was copy-pasted three times and had already drifted: check_meta_conditions'
`lockfile_pin` lost the `isinstance(pin, str) and pin` guard the other two kept,
so a lockfile with `"commit": null` took a different path there than in its
siblings. Pre-merge review caught it (ST1). One implementation removes the
class.

Not a check itself -- it has no `main()` and is never wired into verify.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
LOCK_PATH = ROOT / "data/wowsims-fork.lock.json"


class ForkGateError(Exception):
    """A precondition failed. `message` is ready to print to stderr."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def lockfile_pin(lock_path: Path = LOCK_PATH) -> str | None:
    """The pinned fork commit, or None when the lockfile cannot supply one."""
    try:
        data = json.loads(lock_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    pin = data.get("commit")
    return pin if isinstance(pin, str) and pin else None


def fork_commit(fork_root: Path = FORK_ROOT) -> str | None:
    """The clone's HEAD, or None when it cannot be read."""
    try:
        result = subprocess.run(
            ["git", "-C", str(fork_root), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip() or None


def require_pinned_fork(
    check_name: str,
    fork_root: Path = FORK_ROOT,
    lock_path: Path = LOCK_PATH,
) -> str:
    """Return the pinned commit, or raise ForkGateError with a printable message.

    Callers decide what an absent fork means for them -- some skip cleanly, some
    can still check a committed-only half -- so absence is checked by the caller
    via `fork_root.is_dir()` rather than swallowed here.
    """
    pin = lockfile_pin(lock_path)
    if pin is None:
        raise ForkGateError(
            f"{check_name}: could not read the pin from "
            f"{lock_path.relative_to(ROOT)} -- the file is missing, is not valid "
            "JSON, is not a JSON object, or has no string 'commit' field."
        )

    commit = fork_commit(fork_root)
    if commit != pin:
        raise ForkGateError(
            f"{check_name}: clone HEAD is {commit or 'unknown'} but "
            f"{lock_path.relative_to(ROOT)} pins {pin}. The committed artifact "
            "describes the pinned commit, so re-deriving it from a different "
            "commit compares two different questions. Reset the clone to the "
            "pin, or bump the pin and regenerate."
        )
    return pin
