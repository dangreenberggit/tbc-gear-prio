#!/usr/bin/env python3
"""Checks for scripts/sync_fork_universes.py, on files in a temp dir.

Follows the check_lock_merge.py convention -- a standalone script of small
checks, not a pytest suite (this repo has no pytest infra).

    python scripts/check_sync_fork_universes.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import sync_fork_universes as sfu  # noqa: E402

TABLE = "| `a.json` | `data/a.json` |\n"


def make_tree(base: Path, fork_files: dict[str, str]) -> tuple[Path, Path, Path]:
    """A repo root with one source, data/a.json, and a fork data dir."""
    root = base / "repo"
    data_dir = root / "fork-data"
    (root / "data").mkdir(parents=True)
    data_dir.mkdir()
    (root / "data/a.json").write_text('{"a": 1}\n', encoding="utf-8")
    provenance = root / "data.md"
    provenance.write_text(TABLE, encoding="utf-8")
    for name, text in fork_files.items():
        (data_dir / name).write_text(text, encoding="utf-8")
    return root, data_dir, provenance


def run(write: bool, root: Path, data_dir: Path, provenance: Path) -> tuple[int, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        rc = sfu.run(write, root=root, data_dir=data_dir, provenance_md=provenance)
    return rc, out.getvalue() + err.getvalue()


def check_matching_copy_passes() -> list[str]:
    """data.ts is not JSON, so it is not a copy and is ignored."""
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(Path(tmp), {"a.json": '{"a": 1}\n', "data.ts": "x\n"})
        rc, text = run(False, *tree)
    if rc != 0:
        return [f"a matching copy must pass, got rc {rc}: {text}"]
    return []


def check_extra_json_fails_check() -> list[str]:
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(
            Path(tmp), {"a.json": '{"a": 1}\n', "stray.universe.json": "{}\n"}
        )
        rc, text = run(False, *tree)
    problems = []
    if rc != 1:
        problems.append(f"an extra JSON file must fail --check with rc 1, got {rc}")
    if "stray.universe.json" not in text:
        problems.append(f"the failure must name the extra file: {text}")
    return problems


def check_extra_json_fails_write() -> list[str]:
    """--write copies the table's files but cannot make an extra file
    legitimate, so it fails too."""
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(Path(tmp), {"stray.json": "{}\n"})
        rc, text = run(True, *tree)
        copied = (tree[1] / "a.json").is_file()
    problems = []
    if rc != 1:
        problems.append(f"an extra JSON file must fail --write with rc 1, got {rc}")
    if "stray.json" not in text:
        problems.append(f"the failure must name the extra file: {text}")
    if not copied:
        problems.append("--write must still copy the files the table names")
    return problems


CHECKS = [
    check_matching_copy_passes,
    check_extra_json_fails_check,
    check_extra_json_fails_write,
]


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"sync_fork_universes.py checks ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
