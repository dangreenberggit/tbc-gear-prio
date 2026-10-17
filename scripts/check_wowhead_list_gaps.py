#!/usr/bin/env python3
"""Fail when an item a Wowhead list names is missing from its universe (678, 173).

For each spec profile with a Wowhead list folder (`wowhead_dir`) and each phase
2-5 whose universe is committed, the list ids are the union of the stage files
`WOWHEAD_STAGE_FOR_MAX_PHASE` names for that phase. A list id is a gap when it
is absent from `data/universes/<spec>-p<N>.json`, or present with first source
`kind: unknown`. Every gap must be a row of `data/wowhead-list-gaps.json`
(reason `unknownSource` for the second case, any other reason for the first),
and every row must still be a gap, so the file only shrinks.

Ticket 173 asked for exactly this: an item that falls out of a universe (into
`excludedNoSource` or through any other cause) used to change only a count in
a report. Here it fails `pnpm verify` as `NEW GAP` naming the item.

Independence: this reads the list files and the committed universes, never a
`*.report.json` or its `wowheadListIds`, and imports only two constants from
the builder (`SPEC_PROFILES` for each spec's list folder,
`WOWHEAD_STAGE_FOR_MAX_PHASE` for which stage files a phase reads). It runs no
builder code, so a builder that drops a listed item cannot pass by
construction. Run `pnpm universe-rebuild:check` first so the universes read
here are what the builder builds. Importing the builder module still parses
`vendor/wowsims/db.json` (its `ARENA_GEAR_IDS` constant is built at import), so
a missing db exits 2 before the import instead of with a traceback.

Exit 0 no failure, 1 a failure, 2 an input is missing.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "vendor/wowsims/db.json"
UNIVERSES = ROOT / "data/universes"
GAPS = ROOT / "data/wowhead-list-gaps.json"
PHASES = (2, 3, 4, 5)
UNKNOWN_REASON = "unknownSource"

if not DB.is_file():
    print(
        f"missing {DB.relative_to(ROOT).as_posix()} -- run pnpm sync:wowsims:restore",
        file=sys.stderr,
    )
    sys.exit(2)

sys.path.insert(0, str(ROOT / "scripts"))
from assemble_universe import (  # noqa: E402
    SPEC_PROFILES,
    WOWHEAD_STAGE_FOR_MAX_PHASE,
)


def load(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def list_rows(wowhead_dir: Path, phase: int) -> dict[int, str]:
    rows: dict[int, str] = {}
    for stage in WOWHEAD_STAGE_FOR_MAX_PHASE[phase]:
        path = wowhead_dir / f"{stage}.json"
        if not path.is_file():
            continue
        data = load(path)
        assert isinstance(data, dict)
        for entry in data["entries"]:
            rows.setdefault(int(entry["itemId"]), str(entry.get("itemName", "")))
    return rows


def main() -> int:
    if not GAPS.is_file():
        print(f"missing {GAPS.relative_to(ROOT).as_posix()}", file=sys.stderr)
        return 2
    gap_file = load(GAPS)
    assert isinstance(gap_file, dict)
    reasons = gap_file["reasons"]
    failures: list[str] = []

    listed = {
        spec: profile.wowhead_dir
        for spec, profile in sorted(SPEC_PROFILES.items())
        if profile.wowhead_dir is not None
    }
    built = {
        spec: [p for p in PHASES if (UNIVERSES / f"{spec}-p{p}.json").is_file()]
        for spec in listed
    }

    # (spec, phase, itemId) -> "absent" | "unknown", from the gap file.
    expected: dict[tuple[str, int, int], str] = {}
    for row in gap_file["gaps"]:
        spec, item_id, reason = row["spec"], int(row["itemId"]), row["reason"]
        if reason not in reasons:
            failures.append(f"BAD REASON {spec} {item_id} {reason}")
            continue
        if spec not in listed:
            failures.append(
                f"BAD ROW {spec} {item_id} -- spec has no Wowhead list folder"
            )
            continue
        for phase in row["phases"]:
            if phase not in built[spec]:
                failures.append(
                    f"BAD ROW {spec} p{phase} {item_id} -- no committed universe"
                )
                continue
            kind = "unknown" if reason == UNKNOWN_REASON else "absent"
            if (spec, phase, item_id) in expected:
                failures.append(f"BAD ROW {spec} p{phase} {item_id} -- listed twice")
            expected[(spec, phase, item_id)] = kind

    list_total = 0
    found: dict[tuple[str, int, int], str] = {}
    names: dict[tuple[str, int, int], str] = {}
    for spec, wowhead_dir in listed.items():
        for phase in built[spec]:
            rows = list_rows(wowhead_dir, phase)
            list_total += len(rows)
            universe = load(UNIVERSES / f"{spec}-p{phase}.json")
            assert isinstance(universe, dict)
            entries = {int(e["itemId"]): e for e in universe["entries"]}
            for item_id, name in sorted(rows.items()):
                key = (spec, phase, item_id)
                names[key] = name
                entry = entries.get(item_id)
                if entry is None:
                    found[key] = "absent"
                elif entry["sources"] and entry["sources"][0].get("kind") == "unknown":
                    found[key] = "unknown"

    new = stale = 0
    for key in sorted(found):
        spec, phase, item_id = key
        if expected.get(key) != found[key]:
            new += 1
            what = "absent" if found[key] == "absent" else "first source unknown"
            failures.append(f"NEW GAP {spec} p{phase} {item_id} {names[key]} {what}")
    reason_of = {
        (row["spec"], int(row["itemId"])): row["reason"] for row in gap_file["gaps"]
    }
    for key in sorted(expected):
        if found.get(key) != expected[key]:
            stale += 1
            spec, phase, item_id = key
            failures.append(
                f"STALE GAP {spec} p{phase} {item_id} "
                f"{reason_of[(spec, item_id)]} -- no longer a gap, remove it"
            )

    for line in failures:
        print(line)
    print(
        f"wowhead-list-gaps: {list_total} list rows, {len(gap_file['gaps'])} "
        f"tolerated gaps, {new} new, {stale} stale"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
