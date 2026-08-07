#!/usr/bin/env python3
"""Keep BOSS_UNIT_TO_ENCOUNTER honest against AtlasLoot's boss vocabulary.

A TBC encounter can be several killable units (the Illidari Council is four;
M'uru becomes Entropius). Wowhead sometimes credits a drop to the unit and
AtlasLoot always to the encounter, so without folding, one real drop reaches
the universe under two names and `boss` -- a shipped filter control -- lists a
boss that is not an encounter.

The table is only trustworthy while each value is a real AtlasLoot encounter
and each key is not. Both halves are re-derived here rather than asserted, so a
table entry cannot quietly start naming an encounter that no longer exists.

Run via `pnpm verify` (`pnpm boss-aliases:check`).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ATLASLOOT = ROOT / "data/atlasloot_sources.json"
UNIVERSES = ROOT / "data/universes"

sys.path.insert(0, str(ROOT / "scripts"))
from assemble_universe import BOSS_UNIT_TO_ENCOUNTER, canonical_boss  # noqa: E402


def atlasloot_boss_names() -> set[str]:
    names: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if key == "boss" and isinstance(value, str):
                    names.add(value)
                else:
                    walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(json.loads(ATLASLOOT.read_text(encoding="utf-8-sig")))
    return names


def emitted_boss_names() -> dict[str, set[int]]:
    out: dict[str, set[int]] = {}
    for path in sorted(UNIVERSES.glob("*-p*.json")):
        if path.name.endswith(".report.json"):
            continue
        doc = json.loads(path.read_text(encoding="utf-8-sig"))
        for entry in doc["entries"]:
            for source in entry.get("sources") or []:
                boss = source.get("boss")
                if isinstance(boss, str):
                    out.setdefault(boss, set()).add(entry["itemId"])
    return out


def main() -> int:
    known = atlasloot_boss_names()
    failures: list[str] = []

    for unit, encounter in BOSS_UNIT_TO_ENCOUNTER.items():
        if encounter not in known:
            failures.append(
                f"BOSS_UNIT_TO_ENCOUNTER maps {unit!r} onto {encounter!r}, "
                f"which is not a boss AtlasLoot names. The target must be a "
                f"real encounter."
            )
        # `Trash` is a genuine AtlasLoot bucket rather than a unit, so a key
        # matching a known name is only wrong when it is not the target itself.
        if unit in {n.lower() for n in known} and unit != encounter.lower():
            failures.append(
                f"BOSS_UNIT_TO_ENCOUNTER folds {unit!r}, but AtlasLoot lists "
                f"it as an encounter in its own right — folding it would erase "
                f"a real boss."
            )

    for boss, item_ids in sorted(emitted_boss_names().items()):
        if canonical_boss(boss) != boss:
            failures.append(
                f"{boss!r} reached the universe unfolded (items "
                f"{sorted(item_ids)[:5]}); canonical_boss maps it to "
                f"{canonical_boss(boss)!r}. Regenerate the universes."
            )
        elif boss not in known:
            failures.append(
                f"{boss!r} is not in AtlasLoot's boss vocabulary (items "
                f"{sorted(item_ids)[:5]}). Either it is a sub-unit that "
                f"belongs in BOSS_UNIT_TO_ENCOUNTER, or AtlasLoot is missing "
                f"an encounter and this check needs widening — decide which, "
                f"do not silence it."
            )

    if failures:
        for line in failures:
            print(f"boss-alias check FAILED: {line}", file=sys.stderr)
        return 1

    print(
        f"boss aliases ok: {len(BOSS_UNIT_TO_ENCOUNTER)} folded, "
        f"every emitted boss is one of AtlasLoot's {len(known)} encounters"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
