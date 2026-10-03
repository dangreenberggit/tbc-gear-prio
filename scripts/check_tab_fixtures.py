#!/usr/bin/env python3
"""Check the Upgrades tab's recorded fixtures (ticket 504) and report staleness.

A fixture under `data/tab-fixtures/` is a finished `Ranking` recorded from a
real tab run at one fork commit (`forkSha`). The layout gate and
`pnpm tab-review` render it instead of running the sim. See
`data/tab-fixtures/README.md` for the schema and the re-record commands.

Two kinds of problem, treated differently:

  - A fixture that cannot be read -- a schema error, or a `forkSha` the fork
    clone does not know -- exits 1. Nothing can say what that file shows.
  - A fixture recorded before a change to the code that produces a Ranking
    prints a warning and exits 0. The owner chose warn-only: a stale figure
    in a layout fixture still lays out, and a blocking rule would force a
    ~5-minute re-record per fixture on every engine edit.

The inputs are the fork paths that can change a Ranking: the engine
(`upgrades/engine/**`, except `view.ts`, which only shapes a recorded Ranking
for display, `PROVENANCE.md` and the engine's own test `fixtures/`), the
adapters, the pool data, and `upgrades_tab.tsx` (its `run()` builds the
engine's input). What this cannot see -- the Go sim / WASM, the item
database, the proto sources -- is named in the README.

Skips with a note (exit 0) when the fork clone is absent, like the other
fork-derived checks: `vendor/` is gitignored, so CI and fresh clones have
none.

Usage: python scripts/check_tab_fixtures.py
Run by `pnpm verify` as `pnpm tab-fixtures:check`.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
FIXTURE_DIR = ROOT / "data/tab-fixtures"
SCHEMA_VERSION = 1

_UPGRADES = "ui/core/components/individual_sim_ui/upgrades"
ENGINE = f"{_UPGRADES}/engine"
INPUT_PATHS = (
    ENGINE,
    f"{_UPGRADES}/adapters",
    f"{_UPGRADES}/data",
    "ui/core/components/individual_sim_ui/upgrades_tab.tsx",
)
ENGINE_EXCLUDED = (
    f"{ENGINE}/view.ts",
    f"{ENGINE}/PROVENANCE.md",
)
ENGINE_EXCLUDED_DIRS = (f"{ENGINE}/fixtures/",)

_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def schema_errors(data: object) -> list[str]:
    """Every way `data` fails the fixture schema; empty when it is valid."""
    if not isinstance(data, dict):
        return ["not a JSON object"]
    errors: list[str] = []
    if data.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"schemaVersion is {data.get('schemaVersion')!r}, expected {SCHEMA_VERSION}")
    sha = data.get("forkSha")
    if not isinstance(sha, str) or not _SHA_RE.match(sha):
        errors.append("forkSha is not a 40-hex commit sha")
    if data.get("forkDirty") is not False:
        errors.append("forkDirty is not false (recorded from an uncommitted fork tree)")
    for key in ("spec", "recordedAt"):
        if not isinstance(data.get(key), str) or not data.get(key):
            errors.append(f"{key} missing")
    for key in ("phase", "iterations"):
        if not isinstance(data.get(key), int) or isinstance(data.get(key), bool):
            errors.append(f"{key} is not an integer")
    has_preset = isinstance(data.get("preset"), str)
    has_url = isinstance(data.get("gearUrl"), str)
    if has_preset == has_url:
        errors.append("exactly one of preset / gearUrl must be set")
    if not isinstance(data.get("gear"), dict):
        errors.append("gear missing")
    ranking = data.get("ranking")
    if not isinstance(ranking, dict) or not isinstance(ranking.get("items"), list):
        errors.append("ranking.items missing")
    return errors


def _git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(FORK_ROOT), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def _is_input(path: str) -> bool:
    if path in ENGINE_EXCLUDED:
        return False
    return not any(path.startswith(d) for d in ENGINE_EXCLUDED_DIRS)


def changed_inputs(fork_sha: str) -> list[str]:
    """Input paths that differ between `fork_sha` and the clone's HEAD."""
    res = _git("diff", "--name-only", fork_sha, "HEAD", "--", *INPUT_PATHS)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or f"git diff exited {res.returncode}")
    return [p for p in res.stdout.split() if _is_input(p)]


def check_fixture(path: Path) -> tuple[bool, str]:
    """(readable, line) for one fixture. `line` is what gets printed.

    readable is False for a schema error or an unknown forkSha -- the two
    blocking cases. A stale fixture is readable; its line names the inputs.
    """
    name = path.stem
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        return False, f"fixture {name}: ERROR unreadable ({err})"
    errors = schema_errors(data)
    if errors:
        return False, f"fixture {name}: ERROR schema: {'; '.join(errors)}"
    sha = data["forkSha"]
    if _git("cat-file", "-e", f"{sha}^{{commit}}").returncode != 0:
        return False, (
            f"fixture {name}: ERROR forkSha {sha[:12]} is not a commit in "
            "vendor/tbc-new-fork -- re-record it (see data/tab-fixtures/README.md)"
        )
    try:
        changed = changed_inputs(sha)
    except RuntimeError as err:
        return False, f"fixture {name}: ERROR could not diff inputs ({err})"
    listed = ", ".join(changed) if changed else "none"
    return True, f"fixture {name}: recorded at {sha[:12]}; inputs changed since: {listed}"


def fixture_paths() -> list[Path]:
    return sorted(FIXTURE_DIR.glob("*.json")) if FIXTURE_DIR.is_dir() else []


def main() -> int:
    paths = fixture_paths()
    if not FORK_ROOT.is_dir():
        print(
            f"tab-fixtures: skipped -- vendor/tbc-new-fork is absent, so the "
            f"{len(paths)} fixture(s) cannot be checked against the fork."
        )
        return 0
    if not paths:
        print("tab-fixtures: FAILED -- no fixtures found in data/tab-fixtures.")
        return 1
    rc = 0
    for path in paths:
        ok, line = check_fixture(path)
        print(line)
        if not ok:
            rc = 1
    stale = "warning only; see data/tab-fixtures/README.md to re-record"
    print(f"tab-fixtures: {len(paths)} fixtures checked ({stale})")
    return rc


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
