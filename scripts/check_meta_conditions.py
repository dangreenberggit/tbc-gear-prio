#!/usr/bin/env python3
"""Diff data/gems/meta-conditions.json against the fork's meta-gem table.

`data/gems/meta-conditions.json` says when each TBC meta gem's bonus is active
-- "Requires at least 2 Blue Gems", and so on. The fork owns the same facts in
`ui/sim/proto/gems.ts`, and the copy here was made by hand.

The plan for this branch left "gate it or justify it" to the executor, on the
criterion of whether the fork's conditions are data-shaped or code-shaped. They
are data: every entry is one call to `MetaGemCondition.fromMinColors(id,
description, minRed, minYellow, minBlue)` or
`MetaGemCondition.fromCompareColors(id, description, greater, lesser)`, and the
JSON's fields mirror those arguments one for one. So it is gated rather than
justified.

Both forms are compared, including the description strings -- those reach the
UI, and a stale description is a wrong answer to the user even when the numbers
are right. GemColor numbers come from the fork's own generated proto rather
than being written here.

Skips cleanly (exit 0) when vendor/tbc-new-fork is absent. Refuses (exit 2)
when the clone's HEAD is not the commit data/wowsims-fork.lock.json pins --
same contract as the other fork-derived checks.

Run via `pnpm verify` (`pnpm meta-conditions:check`).

Exit 0 ok (including "nothing to check"), 1 drifted, 2 could not run.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _fork_gate import ForkGateError, require_pinned_fork  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
GEMS_TS = FORK_ROOT / "ui/sim/proto/gems.ts"
PROTO_COMMON = FORK_ROOT / "ui/generated/proto/common.ts"
CONDITIONS = ROOT / "data/gems/meta-conditions.json"

GEM_COLOR_RE = re.compile(r"^\s*(?P<name>GemColor\w+)\s*=\s*(?P<value>\d+),?\s*$", re.MULTILINE)
MIN_COLORS_RE = re.compile(
    r"MetaGemCondition\.fromMinColors\(\s*(?P<id>\d+)\s*,\s*"
    r"(?P<desc>'(?:[^'\\]|\\.)*')\s*,\s*"
    r"(?P<red>\d+)\s*,\s*(?P<yellow>\d+)\s*,\s*(?P<blue>\d+)\s*,?\s*\)",
    re.DOTALL,
)
COMPARE_COLORS_RE = re.compile(
    r"MetaGemCondition\.fromCompareColors\(\s*(?P<id>\d+)\s*,\s*"
    r"(?P<desc>'(?:[^'\\]|\\.)*')\s*,\s*"
    r"GemColor\.(?P<greater>\w+)\s*,\s*GemColor\.(?P<lesser>\w+)\s*,?\s*\)",
    re.DOTALL,
)


def unquote(literal: str) -> str:
    """A TS single-quoted string literal -> its value."""
    return literal[1:-1].replace("\\'", "'").replace("\\\\", "\\")


def fork_conditions(text: str, colors: dict[str, int]) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for m in MIN_COLORS_RE.finditer(text):
        out[int(m.group("id"))] = {
            "description": unquote(m.group("desc")),
            "minRed": int(m.group("red")),
            "minYellow": int(m.group("yellow")),
            "minBlue": int(m.group("blue")),
        }
    for m in COMPARE_COLORS_RE.finditer(text):
        greater, lesser = m.group("greater"), m.group("lesser")
        if greater not in colors or lesser not in colors:
            raise SystemExit(
                f"gems.ts names GemColor.{greater}/{lesser}, which the fork's "
                "proto does not define -- the enum changed shape."
            )
        out[int(m.group("id"))] = {
            "description": unquote(m.group("desc")),
            "compareGreater": colors[greater],
            "compareLesser": colors[lesser],
        }
    return out


def main() -> int:
    if not FORK_ROOT.is_dir():
        print(
            "meta conditions check: skipped -- vendor/tbc-new-fork is absent (it "
            "is gitignored, so a fresh clone has none)."
        )
        return 0
    for path in (GEMS_TS, PROTO_COMMON, CONDITIONS):
        if not path.is_file():
            print(f"meta conditions check: {path} is missing.", file=sys.stderr)
            return 2

    try:
        require_pinned_fork("meta conditions check", FORK_ROOT)
    except ForkGateError as exc:
        print(exc.message, file=sys.stderr)
        return 2

    colors = {
        m.group("name"): int(m.group("value"))
        for m in GEM_COLOR_RE.finditer(PROTO_COMMON.read_text(encoding="utf-8"))
    }
    if not colors:
        print(
            "meta conditions check: parsed no GemColor members from the fork's "
            "proto -- the generated enum's shape changed.",
            file=sys.stderr,
        )
        return 2

    theirs = fork_conditions(GEMS_TS.read_text(encoding="utf-8"), colors)
    if not theirs:
        print(
            "meta conditions check: parsed no conditions from gems.ts -- the "
            "MetaGemCondition table's shape changed.",
            file=sys.stderr,
        )
        return 2

    ours = {int(e["id"]): e for e in json.loads(CONDITIONS.read_text(encoding="utf-8"))}

    problems: list[str] = []
    for gem_id in sorted(set(ours) | set(theirs)):
        a, b = ours.get(gem_id), theirs.get(gem_id)
        if a is None:
            problems.append(f"gem {gem_id}: in the fork, absent from the committed JSON")
            continue
        if b is None:
            problems.append(f"gem {gem_id}: in the committed JSON, absent from the fork")
            continue
        for field, want in sorted(b.items()):
            got = a.get(field)
            if got != want:
                problems.append(f"gem {gem_id} {field}: committed {got!r}, the fork has {want!r}")
        for field in sorted(set(a) - set(b) - {"id"}):
            problems.append(f"gem {gem_id}: committed JSON has extra field {field!r}")

    if problems:
        print(
            "data/gems/meta-conditions.json disagrees with the fork's meta-gem "
            "table (ui/sim/proto/gems.ts):\n",
            file=sys.stderr,
        )
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print(
            "\nThe fork owns these facts. Re-copy from gems.ts; do not edit the "
            "fork to match the committed file.",
            file=sys.stderr,
        )
        return 1

    print(f"meta conditions check ok: {len(theirs)} meta gems match the fork's table")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
