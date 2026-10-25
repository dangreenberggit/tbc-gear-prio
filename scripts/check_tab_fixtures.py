#!/usr/bin/env python3
"""Check the Upgrades tab's made-up fixtures and its frozen recordings.

A fixture under `data/tab-fixtures/` is a small made-up `Ranking` written by
`packages/core/test/tab-fixtures/make-mock-fixtures.ts`
(`pnpm tab-fixtures:mock`), one per UI difference between specs. The layout
gate, `pnpm tab-review` and `pnpm tab-fixtures:smoke` render these files, so
no page check needs a sim recording (stage tab-checks-without-sims).

A recording under `packages/core/test/fixtures/tab-recordings/` is a real run,
frozen as engine test data. It must not be marked `madeUp`, and must name a
committed fork tree (`forkDirty: false`, a 40-hex `forkSha`), so a recording
of uncommitted fork code cannot become test data (ticket 708). Whether that
SHA is a commit in the fork is not checked: CI has no fork clone.

This checks the schema only, and needs neither git nor the fork clone.
`pnpm tab-fixtures:check` first runs the generator's `--check`, which compares
each made-up file with what the generator writes; without the fork clone that
compare is skipped, so CI checks the schema only.

Exits 1 when a file fails the schema, when a made-up file is not marked
`madeUp: true` or a recording is, or when `data/tab-fixtures/` holds no
fixture.

Usage: python scripts/check_tab_fixtures.py
Run by `pnpm verify` as part of `pnpm tab-fixtures:check`.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DIR = ROOT / "data/tab-fixtures"
RECORDING_DIR = ROOT / "packages/core/test/fixtures/tab-recordings"
SCHEMA_VERSION = 1
GEAR_SLOTS = 17

# The recorder's own refusal (record.mjs) says where recordings go instead.
NOT_MADE_UP = "not marked madeUp: true; only pnpm tab-fixtures:mock writes here"
MADE_UP_RECORDING = "marked madeUp: true; this folder holds real recordings"

_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def _is_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def schema_errors(data: object, made_up: bool = True) -> list[str]:
    """Every way `data` fails the fixture schema; empty when it is valid.

    `made_up` says which folder it came from: a made-up fixture must be marked
    `madeUp: true`, and a recording must not be.
    """
    if not isinstance(data, dict):
        return ["not a JSON object"]
    if made_up and data.get("madeUp") is not True:
        return [NOT_MADE_UP]
    if not made_up and "madeUp" in data:
        return [MADE_UP_RECORDING]
    errors: list[str] = []
    if data.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"schemaVersion is {data.get('schemaVersion')!r}, expected {SCHEMA_VERSION}")
    sha = data.get("forkSha")
    if not isinstance(sha, str) or not _SHA_RE.match(sha):
        errors.append("forkSha is not 40 hex characters")
    if data.get("forkDirty") is not False:
        errors.append("forkDirty is not false")
    if not isinstance(data.get("spec"), str) or not data.get("spec"):
        errors.append("spec missing")
    for key in ("phase", "iterations"):
        if not _is_int(data.get(key)):
            errors.append(f"{key} is not an integer")
    gear = data.get("gear")
    items = gear.get("items") if isinstance(gear, dict) else None
    if not isinstance(items, list) or len(items) != GEAR_SLOTS:
        errors.append(f"gear.items is not a list of {GEAR_SLOTS}")
    ranking = data.get("ranking")
    if not isinstance(ranking, dict) or not isinstance(ranking.get("items"), list):
        errors.append("ranking.items missing")
    has_preset = isinstance(data.get("preset"), str)
    has_url = isinstance(data.get("gearUrl"), str)
    if has_preset == has_url:
        errors.append("exactly one of preset / gearUrl must be set")
    return errors


def check_fixture(path: Path, made_up: bool = True) -> tuple[bool, str]:
    """(readable, line) for one fixture. `line` is what gets printed."""
    kind = "fixture" if made_up else "recording"
    name = path.stem
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        return False, f"{kind} {name}: ERROR unreadable ({err})"
    errors = schema_errors(data, made_up)
    if errors:
        return False, f"{kind} {name}: ERROR schema: {'; '.join(errors)}"
    rows = len(data["ranking"]["items"])
    return True, f"{kind} {name}: ok ({data['spec']}, {rows} rows)"


def fixture_paths() -> list[Path]:
    return sorted(FIXTURE_DIR.glob("*.json")) if FIXTURE_DIR.is_dir() else []


def recording_paths() -> list[Path]:
    return sorted(RECORDING_DIR.glob("*.json")) if RECORDING_DIR.is_dir() else []


def main() -> int:
    paths = fixture_paths()
    if not paths:
        print(
            "tab-fixtures: FAILED -- no fixtures in data/tab-fixtures "
            "(run pnpm tab-fixtures:mock)."
        )
        return 1
    rc = 0
    checks = [(p, True) for p in paths] + [(p, False) for p in recording_paths()]
    for path, made_up in checks:
        ok, line = check_fixture(path, made_up)
        print(line)
        if not ok:
            rc = 1
    return rc


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
