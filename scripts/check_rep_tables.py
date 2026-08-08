#!/usr/bin/env python3
"""Keep the reputation tables honest against ui.proto and against db.json.

`assemble_universe` resolves a db.json rep source -- which is keyed only by
`repFactionId` and `repLevel` numbers -- into a faction and a standing a player
can act on. Three things have to stay true for that resolution to be
trustworthy, and none of them is guaranteed by the code that does it:

1. Every faction id ui.proto defines has a display spelling. A missing one used
   to fall back to nothing and the whole source was discarded (ticket 65).
2. Those spellings match what the prose parser already emits for the same
   faction. `Ogri'la` and `The Consortium` are the load-bearing cases: if this
   table said "Ogrila" or "Consortium", one faction would split into two and a
   filter would show both.
3. Every `repLevel` db.json actually uses resolves to a standing name.

Re-derived here rather than asserted, so drift in ui.proto, in db.json, or in
the display table fails loudly instead of silently mislabelling a source.

Run via `pnpm verify` (`pnpm rep-tables:check`).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "vendor/wowsims/db.json"
UNIVERSES = ROOT / "data/universes"

sys.path.insert(0, str(ROOT / "scripts"))
from assemble_universe import (  # noqa: E402
    REP_FACTION_NAMES,
    REP_LEVEL_NAMES,
    rep_faction_names,
)


def db_rep_usage() -> tuple[set[int], set[int]]:
    """(faction ids, rep levels) db.json actually uses on a rep source."""
    if not DB.exists():
        return set(), set()
    db = json.loads(DB.read_text(encoding="utf-8"))
    factions: set[int] = set()
    levels: set[int] = set()
    for item in db.get("items", []):
        for source in item.get("sources") or []:
            if "rep" in source:
                rep = source["rep"] or {}
                if rep.get("repFactionId") is not None:
                    factions.add(int(rep["repFactionId"]))
                if rep.get("repLevel") is not None:
                    levels.add(int(rep["repLevel"]))
                break
    return factions, levels


def universe_rep_spellings() -> set[str]:
    """Faction spellings already shipped in a universe, whatever their origin.

    These come from the prose parser today. A db-resolved source for the same
    faction has to agree with them character for character.
    """
    spellings: set[str] = set()
    for path in sorted(UNIVERSES.glob("*.json")):
        if path.name.endswith(".report.json"):
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for entry in data.get("entries", []):
            for source in entry.get("sources") or []:
                if source.get("kind") == "rep" and source.get("faction"):
                    spellings.add(source["faction"])
    return spellings


def main() -> int:
    failures: list[str] = []

    # 1. The proto/display sync guard, invoked for its SystemExit.
    try:
        rep_faction_names()
    except SystemExit as exc:
        failures.append(str(exc))

    db_factions, db_levels = db_rep_usage()
    if not db_factions:
        failures.append(
            f"no rep sources found in {DB} -- expected db.json to ship them "
            "(run `pnpm sync:wowsims:check`)"
        )

    # 2. Every faction db.json uses must resolve.
    for faction_id in sorted(db_factions - set(REP_FACTION_NAMES)):
        failures.append(
            f"db.json uses repFactionId {faction_id}, which has no display name"
        )

    # 3. Every rep level db.json uses must resolve, and not to a placeholder.
    for level in sorted(db_levels - set(REP_LEVEL_NAMES)):
        failures.append(f"db.json uses repLevel {level}, which has no standing name")
    for level in sorted(db_levels & set(REP_LEVEL_NAMES)):
        if REP_LEVEL_NAMES[level] == "Unknown":
            failures.append(f"db.json uses repLevel {level}, which resolves to Unknown")

    # 4. Shipped spellings must agree. Only overlapping faction *names* can be
    #    compared -- a universe naming a faction db.json has no id for is the
    #    prose parser doing its job, not a defect.
    shipped = universe_rep_spellings()
    known = set(REP_FACTION_NAMES.values())
    for name in sorted(shipped):
        collapsed = name.replace("'", "").replace(" ", "").lower()
        matches = [
            k for k in known if k.replace("'", "").replace(" ", "").lower() == collapsed
        ]
        if matches and name not in matches:
            failures.append(
                f"universe ships faction {name!r} but the table spells it "
                f"{matches[0]!r} -- one faction would split into two"
            )

    if failures:
        for failure in failures:
            print(f"  FAIL: {failure}")
        return 1

    print(
        f"  rep tables ok: {len(REP_FACTION_NAMES)} factions, "
        f"{len(db_factions)} used by db.json, "
        f"{len(db_levels)} standings in use, "
        f"{len(shipped)} spellings shipped"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
