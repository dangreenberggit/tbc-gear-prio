#!/usr/bin/env python3
"""Exit 2 before a check imports the universe builder without its inputs.

`assemble_universe` parses `vendor/wowsims/db.json` at import (its
`ARENA_GEAR_IDS` constant is built then), so a check that imports it with the
file absent dies with a traceback and rc 1, which reads as a failed check
rather than a missing input. Each vendored file is a key of
`data/wowsims.lock.json` `files`, restored by `pnpm sync:wowsims:restore`.

Not a check itself -- it has no `main()` and is never wired into verify.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT / "vendor/wowsims"
LOCK = ROOT / "data/wowsims.lock.json"


def exit_if_missing(*, every_locked_file: bool = False) -> None:
    """Exit 2 naming each absent file: db.json, or with `every_locked_file`
    every file the lock pins (the builder skips an absent gear-set file
    without a word, so a rebuild check would report a false MISMATCH)."""
    names = ["db.json"]
    if every_locked_file:
        lock = json.loads(LOCK.read_text(encoding="utf-8"))
        names = sorted(lock["files"])
    missing = [name for name in names if not (VENDOR / name).is_file()]
    if not missing:
        return
    for name in missing:
        print(f"missing {(VENDOR / name).relative_to(ROOT).as_posix()}", file=sys.stderr)
    print("run pnpm sync:wowsims:restore", file=sys.stderr)
    sys.exit(2)
