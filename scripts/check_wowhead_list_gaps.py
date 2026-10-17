#!/usr/bin/env python3
"""Fail when an item a Wowhead list names is missing from its universe (678, 173).

For each spec profile with a Wowhead list folder (`wowhead_dir`) and each phase
2-5 whose universe is committed, the list ids are the union of the folder's
list files that phase reads. A list id is a gap when it is absent from
`data/universes/<spec>-p<N>.json`, or present with first source
`kind: unknown`. Every gap must be a row of `data/wowhead-list-gaps.json`
(reason `unknownSource` for the second case, any other reason for the first),
and every row must still be a gap, so the file only shrinks.

Which phases read a file comes from the file's own name, not from the
builder: `p3.json` and `p1-p2.json` hold the guides for phases 3 and 2, so
they are read at that phase and every later one. A file whose name states no
phase (`pre-raid.json`) fails as `UNPLACED LIST` unless the gap file's
`unreadLists` names it with the ticket that owns the choice; an `unreadLists`
row whose file is gone, or that the builder reads after all, fails as
`STALE UNREAD`. So a builder that stops reading a list file makes that file's
items gaps here, and a list file nobody placed cannot go unchecked.

Ticket 173 asked for exactly this: an item that falls out of a universe (into
`excludedNoSource` or through any other cause) used to change only a count in
a report. Here it fails `pnpm verify` as `NEW GAP` naming the item.

Independence: this reads the list files and the committed universes, never a
`*.report.json` or its `wowheadListIds`, and imports only two constants from
the builder (`SPEC_PROFILES` for each spec's list folder,
`WOWHEAD_STAGE_FOR_MAX_PHASE` only for the `STALE UNREAD` test). Run
`pnpm universe-rebuild:check` first so the universes read here are what the
builder builds.

Exit 0 no failure, 1 a failure, 2 an input is missing.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNIVERSES = ROOT / "data/universes"
GAPS = ROOT / "data/wowhead-list-gaps.json"
PHASES = (2, 3, 4, 5)
UNKNOWN_REASON = "unknownSource"
# "p3" or "p1-p2": the guide is for the last phase it names.
STAGE_PHASE_RE = re.compile(r"^p(?:\d+-p)?(?P<phase>\d+)$")

sys.path.insert(0, str(ROOT / "scripts"))
from _vendored_inputs import exit_if_missing  # noqa: E402

exit_if_missing()

from assemble_universe import (  # noqa: E402
    SPEC_PROFILES,
    WOWHEAD_STAGE_FOR_MAX_PHASE,
)


def load(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def first_phase(path: Path) -> int | None:
    m = STAGE_PHASE_RE.match(path.stem)
    return int(m["phase"]) if m else None


def list_rows(files: list[tuple[int, Path]], phase: int) -> dict[int, str]:
    rows: dict[int, str] = {}
    for start, path in files:
        if start > phase:
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

    unread = {
        str(row["path"]): row for row in gap_file.get("unreadLists") or []
    }
    builder_stages = {s for stages in WOWHEAD_STAGE_FOR_MAX_PHASE.values() for s in stages}
    placed: dict[str, list[tuple[int, Path]]] = {}
    seen_unread: set[str] = set()
    for spec, wowhead_dir in listed.items():
        placed[spec] = []
        for path in sorted(wowhead_dir.glob("*.json")):
            rel = path.relative_to(ROOT).as_posix()
            start = first_phase(path)
            if rel in unread:
                seen_unread.add(rel)
                if start is not None or path.stem in builder_stages:
                    failures.append(
                        f"STALE UNREAD {rel} -- a phase reads it, remove it "
                        "from unreadLists"
                    )
                continue
            if start is None:
                failures.append(
                    f"UNPLACED LIST {rel} -- its name states no phase; name it "
                    "in unreadLists with the ticket that owns it, or rename it"
                )
                continue
            placed[spec].append((start, path))
    for rel in sorted(set(unread) - seen_unread):
        failures.append(f"STALE UNREAD {rel} -- no such list file")

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
    for spec in listed:
        for phase in built[spec]:
            rows = list_rows(placed[spec], phase)
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
