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
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import sync_fork_universes as sfu  # noqa: E402

TABLE = "| `a.json` | `data/a.json` |\n"
# data/a.json in oxfmt's layout (tab indent), and the same content as
# json.dumps(indent=2) writes it.
LAID_OUT = '{\n\t"a": 1\n}\n'
TWO_SPACE = '{\n  "a": 1\n}\n'


def make_tree(
    base: Path, fork_files: dict[str, str], source: str = LAID_OUT
) -> tuple[Path, Path, Path]:
    """A repo root with one source, data/a.json, and a fork data dir."""
    root = base / "repo"
    data_dir = root / "fork-data"
    (root / "data").mkdir(parents=True)
    data_dir.mkdir()
    (root / "data/a.json").write_text(source, encoding="utf-8", newline="\n")
    provenance = root / "data.md"
    provenance.write_text(TABLE, encoding="utf-8")
    for name, text in fork_files.items():
        (data_dir / name).write_text(text, encoding="utf-8", newline="\n")
    return root, data_dir, provenance


def run(write: bool, root: Path, data_dir: Path, provenance: Path) -> tuple[int, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        rc = sfu.run(write, root=root, data_dir=data_dir, provenance_md=provenance)
    return rc, out.getvalue() + err.getvalue()


def check_matching_copy_passes() -> list[str]:
    """data.ts is not JSON, so it is not a copy and is ignored."""
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(Path(tmp), {"a.json": LAID_OUT, "data.ts": "x\n"})
        rc, text = run(False, *tree)
    if rc != 0:
        return [f"a matching copy must pass, got rc {rc}: {text}"]
    return []


def check_extra_json_fails_check() -> list[str]:
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(
            Path(tmp), {"a.json": LAID_OUT, "stray.universe.json": "{}\n"}
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


# The shapes the copies have: nested objects, an array too long for one
# 160-column line, a float, non-ASCII text, and string arrays that fit on one
# line (as most ep-weights `notes` do). oxfmt counts a tab as 4 columns and
# the trailing comma: "f" fills exactly 160 columns and stays on one line,
# "g" needs 161 and breaks (measured with the fork's oxfmt, 2026-11-20).
LONG = "x" * 150
FITS = "x" * 141
OVER = "x" * 142
SAMPLE = '{"a": {"b": ["%s", "\u00e9"]}, "f": ["a", "%s"], "g": ["a", "%s"], "c": 1.0}' % (LONG, FITS, OVER)
SAMPLE_LAID_OUT = (
    '{\n\t"a": {\n\t\t"b": [\n\t\t\t"%s",\n\t\t\t"\u00e9"\n\t\t]\n\t},\n'
    '\t"f": ["a", "%s"],\n'
    '\t"g": [\n\t\t"a",\n\t\t"%s"\n\t],\n'
    '\t"c": 1.0\n}\n' % (LONG, FITS, OVER)
)


def check_layout_is_tab_indented_json() -> list[str]:
    """Tab indent, objects and long arrays expanded, arrays that fit on one
    line, non-ASCII kept, one trailing newline."""
    got = sfu.oxfmt_json(SAMPLE)
    if got != SAMPLE_LAID_OUT:
        return [f"oxfmt_json gave {got!r}, want {SAMPLE_LAID_OUT!r}"]
    return []


def check_layout_passes_the_forks_oxfmt() -> list[str]:
    """The expected layout above is what the fork's own oxfmt accepts. Runs
    only where the fork and its node_modules are present."""
    oxfmt = sfu.FORK_ROOT / "node_modules/.bin/oxfmt"
    if not oxfmt.is_file():
        print("  (skipped: no fork oxfmt in this checkout)")
        return []
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "sample.json"
        path.write_text(SAMPLE_LAID_OUT, encoding="utf-8", newline="\n")
        result = subprocess.run(
            [str(oxfmt), "-c", str(sfu.FORK_ROOT / ".oxfmtrc.json"), "--check", str(path)],
            capture_output=True,
            text=True,
            check=False,
        )
    if result.returncode != 0:
        return [f"the fork's oxfmt rejects the layout oxfmt_json writes: {result.stdout}{result.stderr}"]
    return []


def check_crlf_source_fails_check() -> list[str]:
    """oxfmt rejects CRLF, so a CRLF source and its byte-equal copy fail."""
    crlf = LAID_OUT.replace("\n", "\r\n")
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(Path(tmp), {"a.json": crlf}, source=crlf)
        rc, text = run(False, *tree)
    if rc != 1:
        return [f"a CRLF source must fail --check with rc 1, got {rc}: {text}"]
    return []


def check_write_is_all_or_nothing_on_a_parse_error() -> list[str]:
    """A source that does not parse stops --write before any file moves."""
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(Path(tmp), {"a.json": TWO_SPACE}, source=TWO_SPACE)
        root, data_dir, provenance = tree
        (root / "data/b.json").write_text("{not json\n", encoding="utf-8", newline="\n")
        provenance.write_text(TABLE + "| `b.json` | `data/b.json` |\n", encoding="utf-8")
        rc, text = run(True, *tree)
        source = (root / "data/a.json").read_text(encoding="utf-8")
        copy = (data_dir / "a.json").read_text(encoding="utf-8")
    problems = []
    if rc != 2:
        problems.append(f"a source that does not parse must stop --write with rc 2, got {rc}: {text}")
    if source != TWO_SPACE or copy != TWO_SPACE:
        problems.append(f"--write must change nothing when a source does not parse: source {source!r}, copy {copy!r}")
    return problems


def check_source_out_of_layout_fails_check() -> list[str]:
    """A byte-equal copy still fails when both sides are out of oxfmt's
    layout, because upstream CI runs oxfmt --check on the copy."""
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(Path(tmp), {"a.json": TWO_SPACE}, source=TWO_SPACE)
        rc, text = run(False, *tree)
    problems = []
    if rc != 1:
        problems.append(f"a source out of layout must fail --check with rc 1, got {rc}")
    if "data/a.json" not in text or "layout" not in text:
        problems.append(f"the failure must name the source and the layout: {text}")
    return problems


def check_write_lays_out_both_sides() -> list[str]:
    with tempfile.TemporaryDirectory() as tmp:
        tree = make_tree(Path(tmp), {"a.json": TWO_SPACE}, source=TWO_SPACE)
        rc, text = run(True, *tree)
        source = (tree[0] / "data/a.json").read_bytes()
        copy = (tree[1] / "a.json").read_bytes()
        rc_after, text_after = run(False, *tree)
    problems = []
    if rc != 0:
        problems.append(f"--write must succeed, got rc {rc}: {text}")
    if source != LAID_OUT.encode() or copy != LAID_OUT.encode():
        problems.append(f"--write must lay out both sides: source {source!r}, copy {copy!r}")
    if rc_after != 0:
        problems.append(f"--check after --write must pass, got rc {rc_after}: {text_after}")
    return problems


CHECKS = [
    check_layout_is_tab_indented_json,
    check_layout_passes_the_forks_oxfmt,
    check_crlf_source_fails_check,
    check_write_is_all_or_nothing_on_a_parse_error,
    check_source_out_of_layout_fails_check,
    check_write_lays_out_both_sides,
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
