#!/usr/bin/env python3
"""Keep the reputation tables honest against ui.proto and against db.json.

`assemble_universe` resolves a db.json rep source -- which is keyed only by
`repFactionId` and `repLevel` numbers -- into a faction and a standing a player
can act on. Three things have to stay true for that resolution to be
trustworthy, and none of them is guaranteed by the code that does it:

1. Every faction id ui.proto defines has a display spelling. A missing one used
   to fall back to nothing and the whole source was discarded (ticket 65).
2. No faction prints two ways. Checked *by id*, not by comparing strings to each
   other: every faction has an id (Wowhead puts it in the URL), prose rows now
   resolve one via `data/faction_ids.json`, and the id survives an edit to the
   spelling that a string comparison cannot see. This is a *presentation*
   invariant -- `faction` has a single consumer, `rank-report.ts` interpolating
   it into a label (`.scratch/carry-forward/notes/65-faction-ids.md`).
3. Every `repLevel` db.json actually uses resolves to a standing name.

Rows whose faction we cannot resolve to an id still ship -- a guide is the only
witness for some vendor items -- and are reported as unchecked rather than
counted as passing.

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
    FACTION_IDS,
    REP_FACTION_NAMES,
    REP_LEVEL_NAMES,
    _faction_key,
    rep_faction_names,
)


def _atlasloot_factions() -> dict[str, int]:
    """AtlasLoot's CamelCase faction name -> id, as parsed into the repo."""
    if not FACTION_IDS.is_file():
        return {}
    data = json.loads(FACTION_IDS.read_text(encoding="utf-8"))
    return {str(k): int(v) for k, v in (data.get("factions") or {}).items()}


def _atlasloot_ids_by_key() -> dict[str, int]:
    """Normalised faction key -> id. The lookup `rep_source` actually uses."""
    return {_faction_key(name): fid for name, fid in _atlasloot_factions().items()}


# id -> the exact display spelling a shipped row must use. Only the ten wowsims
# models have one; AtlasLoot carries no English display text (it localises
# through `ALIL[]`), so for the other ten there is no authority on punctuation
# or articles and an exact test would be inventing one. Those fall back to the
# normalised-key check below.
FACTION_NAMES_BY_ID = dict(REP_FACTION_NAMES)


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


def universe_rep_rows() -> list[tuple[str, str, int | None]]:
    """(universe, faction spelling, faction id) for every shipped rep source."""
    rows: list[tuple[str, str, int | None]] = []
    for path in sorted(UNIVERSES.glob("*.json")):
        if path.name.endswith(".report.json"):
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for entry in data.get("entries", []):
            for source in entry.get("sources") or []:
                if source.get("kind") == "rep" and source.get("faction"):
                    fid = source.get("factionId")
                    rows.append(
                        (path.name, source["faction"], int(fid) if fid is not None else None)
                    )
    return rows


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

    # 4. The faction id lookup must stay unambiguous. It joins a display string
    #    to an id by collapsing to letters, which is only safe while no two
    #    factions collapse to the same key.
    collisions: dict[str, list[str]] = {}
    for name in _atlasloot_factions():
        collisions.setdefault(_faction_key(name), []).append(name)
    for key, names in sorted(collisions.items()):
        if len(names) > 1:
            failures.append(
                f"faction names {sorted(names)} both normalise to {key!r} -- "
                "the display-string lookup can no longer identify a faction"
            )

    # 5. Every shipped spelling must be exactly the one its id names. Keyed on
    #    the id, so a dropped article or a typo fails: unlike the spelling
    #    itself, the id survives an edit to the string.
    rows = universe_rep_rows()
    if not rows:
        failures.append(
            f"no rep sources found under {UNIVERSES} -- this check would pass "
            "vacuously (run `pnpm universe:assemble`)"
        )
    unresolved: set[str] = set()
    names_seen: dict[int, set[str]] = {}
    keys_by_id = {fid: key for key, fid in _atlasloot_ids_by_key().items()}
    for universe, name, faction_id in rows:
        if faction_id is None:
            unresolved.add(name)
            continue
        names_seen.setdefault(faction_id, set()).add(name)
        expected = FACTION_NAMES_BY_ID.get(faction_id)
        if expected is not None and name != expected:
            failures.append(
                f"{universe} ships faction {name!r} for id {faction_id}, but that id "
                f"is {expected!r} -- the same faction would print two ways"
            )
        elif expected is None:
            # No display authority for this id, but the id still fixes identity:
            # the spelling must at least be the same faction, letter for letter
            # once punctuation is set aside.
            key = keys_by_id.get(faction_id)
            if key is None:
                failures.append(
                    f"{universe} ships faction id {faction_id} ({name!r}), which is "
                    "in no faction table -- data/faction_ids.json is stale"
                )
            elif _faction_key(name) != key:
                failures.append(
                    f"{universe} ships faction {name!r} for id {faction_id}, but that "
                    f"id is {key!r} -- the name and the id disagree"
                )

    # Two rows may not spell one id two ways, whether or not we have a display
    # authority for it. This is the invariant the docstring promises.
    for faction_id, names in sorted(names_seen.items()):
        if len(names) > 1:
            failures.append(
                f"faction id {faction_id} ships under {sorted(names)} -- one faction, "
                "two spellings"
            )

    if failures:
        for failure in failures:
            print(f"  FAIL: {failure}")
        return 1

    print(
        f"  rep tables ok: {len(REP_FACTION_NAMES)} factions, "
        f"{len(db_factions)} used by db.json, "
        f"{len(db_levels)} standings in use, "
        f"{len(rows)} rep rows shipped "
        f"({len(rows) - len(unresolved)} id-checked)"
    )
    if unresolved:
        # Not a failure: the guide is the only witness for some vendor items, so
        # a row we cannot resolve still ships. It is unchecked, and saying so is
        # the difference between a gate and a green light.
        print(
            f"  note: {len(unresolved)} faction spelling(s) carry no id and are "
            f"unchecked: {', '.join(sorted(unresolved))}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
