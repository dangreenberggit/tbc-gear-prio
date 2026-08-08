#!/usr/bin/env python3
"""Guide prose must not restate a locus a machine input already supplies.

The Wowhead BiS guides are an *editorial* input -- which items matter for a
spec, an opinion no database carries. Their Source cell is the author restating
drop facts db.json / AtlasLoot / the two-hop maps already hold machine-parsed,
and every defect in carry-forward tickets 48-52 was in that restatement rather
than in the underlying fact. `assemble_universe.build` therefore drops a parsed
Wowhead source that names a boss or a raid/dungeon zone when a machine input
already places the item. See carry-forward ticket 57.

Two halves, because each catches a different way of getting it wrong:

  1. The rule, on constructed inputs. The design constraint is that suppression
     keys on "does a machine input actually supply a locus for this id", never
     on "is this id known to a machine input" -- AtlasLoot records heroic
     dungeon drops with an *empty* zone list, and the looser test would strike
     those items' only zone claim. On the shipped data the two keys are
     observationally identical (668 ids are present-without-locus, but none of
     them carries a Wowhead locus row), so no data-driven check can tell them
     apart. Only a constructed case can, which is why these are here.

  2. The emitted universes. Nothing with `origin: "wowhead"` may carry a locus
     on an item some other origin also places.

Run via `pnpm verify` (`pnpm wowhead-prose:check`).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNIVERSES = ROOT / "data/universes"

sys.path.insert(0, str(ROOT / "scripts"))
from assemble_universe import carries_locus  # noqa: E402


def check_predicate() -> list[str]:
    """`carries_locus` is the whole rule; pin what does and does not trip it."""
    failures: list[str] = []

    carries = [
        ({"kind": "raid", "zone": "Black Temple"}, "a raid zone"),
        ({"kind": "raid", "zone": "Hyjal Summit", "boss": "Azgalor"}, "zone + boss"),
        ({"kind": "token", "zone": "Tempest Keep", "token": "Chestguard"}, "a token's raid"),
        # The locus rides in `dungeon` rather than `zone` for this variant, and
        # missing that would let heroic prose through as if it named nowhere.
        ({"kind": "heroic", "dungeon": "Sethekk Halls"}, "a heroic dungeon"),
        ({"kind": "badge", "cost": 75, "boss": "Anybody"}, "a boss on any kind"),
    ]
    for source, why in carries:
        if not carries_locus(source):
            failures.append(f"carries_locus missed {why}: {source!r}")

    # The 94 kept rows are these kinds. vendor/atlasloot/ holds only the addon's
    # instance loot tables, so the guide is the only witness for many vendor and
    # quest items here and they must survive suppression unconditionally.
    does_not = [
        ({"kind": "crafted", "profession": "Blacksmithing"}, "crafted"),
        ({"kind": "pvp", "via": "arena"}, "pvp"),
        ({"kind": "badge", "cost": 75}, "badge"),
        ({"kind": "rep", "faction": "The Scale of the Sands", "standing": "Exalted"}, "rep"),
        ({"kind": "world"}, "world drop"),
        # A raid kind with no zone places nothing, so it cannot be redundant
        # with anything and must not count as machine coverage.
        ({"kind": "raid"}, "a raid row with no zone"),
        ({"kind": "heroic"}, "a heroic row with no dungeon"),
    ]
    for source, why in does_not:
        if carries_locus(source):
            failures.append(
                f"carries_locus treats {why} as a locus claim: {source!r}. "
                f"Non-locus kinds must survive suppression -- that is the 94."
            )

    return failures


def check_emitted() -> list[str]:
    """No wowhead locus row may sit on an item another origin also places."""
    failures: list[str] = []
    checked = 0

    paths = [p for p in sorted(UNIVERSES.glob("*-p*.json"))
             if not p.name.endswith(".report.json")]
    if not paths:
        return ["no universe files found -- this check would pass vacuously"]

    for path in paths:
        doc = json.loads(path.read_text(encoding="utf-8-sig"))
        entries = doc.get("entries")
        if not entries:
            failures.append(f"{path.name} has no `entries` -- shape changed, check is blind")
            continue
        for entry in entries:
            sources = entry.get("sources") or []
            machine_locus = [
                s for s in sources
                if s.get("origin") != "wowhead" and carries_locus(s)
            ]
            if not machine_locus:
                continue
            for s in sources:
                if s.get("origin") != "wowhead" or not carries_locus(s):
                    continue
                checked += 1
                failures.append(
                    f"{path.name} {entry['itemId']} {entry.get('name')!r} keeps a "
                    f"wowhead locus row {s!r} while {machine_locus[0]!r} already "
                    f"places it. Regenerate the universes."
                )

    if not failures:
        print(f"  emitted: {len(paths)} universes, 0 redundant wowhead locus rows")
    return failures


def main() -> int:
    failures = check_predicate() + check_emitted()
    if failures:
        for line in failures:
            print(f"wowhead-prose check FAILED: {line}", file=sys.stderr)
        return 1
    print("wowhead prose suppression ok: prose never restates a machine-supplied locus")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
