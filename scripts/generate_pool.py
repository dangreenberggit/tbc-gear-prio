#!/usr/bin/env python3
"""
generate_pool.py — EP-rank equippable items into data/pools/<spec>.generated.json
(PLAN.md §8.3).

db.json is a build input only. The generated file is the starting point for
human curation into data/pools/<spec>.json; re-runs should diff, never clobber
curation (diff mode lands in a follow-up).

Equippability is armor type + weapon type (R11) — classAllowlist is empty on
most items. Ret: plate; weapons exclude polearm and staff.

    python scripts/generate_pool.py --spec ret

Exit 0 ok, 2 missing db.json.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "vendor/wowsims/db.json"
EP_WEIGHTS = ROOT / "data/presets/ret/p2.ep-weights.json"

# Same slot map as scripts/generate_item_gem_index.py
ITEM_TYPE_SLOT = {
    1: "head",
    2: "neck",
    3: "shoulder",
    4: "back",
    5: "chest",
    6: "wrist",
    7: "hands",
    8: "waist",
    9: "legs",
    10: "feet",
    11: "finger",
    12: "trinket",
    13: "weapon",
    14: "ranged",
}

ARMOR_PLATE = 4
WEAPON_POLEARM = 6
WEAPON_STAFF = 8
# Top-N per slot before curation trims toward ~8 (PLAN.md §8.3.3).
TOP_N = 12
MIN_QUALITY = 3  # rare+


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def item_stats(it: dict) -> list[float]:
    """Dense stats array; prefer scalingOptions['0'] map when present."""
    scaling = (it.get("scalingOptions") or {}).get("0") or {}
    raw_map = scaling.get("stats")
    if isinstance(raw_map, dict) and raw_map:
        out = [0.0] * 42
        for k, v in raw_map.items():
            i = int(k)
            if 0 <= i < len(out):
                out[i] = float(v)
        return out
    arr = it.get("stats") or []
    return [float(x) for x in arr]


def ep_score(stats: list[float], weights: dict[str, float]) -> float:
    total = 0.0
    for k, w in weights.items():
        i = int(k)
        if i < len(stats):
            total += stats[i] * w
    return total


def map_source(raw: object) -> dict | None:
    """Best-effort db.json sources[] → ItemSource. Unresolved → None."""
    if not isinstance(raw, list) or not raw:
        return None
    first = raw[0]
    if not isinstance(first, dict):
        return None
    if "crafted" in first:
        prof = (first["crafted"] or {}).get("profession")
        return {"kind": "crafted", "profession": str(prof)} if prof is not None else None
    if "drop" in first:
        drop = first["drop"] or {}
        zone = drop.get("zone") or drop.get("zoneName")
        if zone:
            return {"kind": "raid", "zone": str(zone), "boss": drop.get("npcName")}
    if "rep" in first or "faction" in first:
        return {"kind": "rep", "faction": "unknown", "standing": "unknown"}
    return None


def ret_equippable(it: dict) -> bool:
    t = it.get("type")
    if t is None:
        return False
    slot = ITEM_TYPE_SLOT.get(t)
    if slot is None:
        return False
    if it.get("quality", 0) < MIN_QUALITY:
        return False
    # Armor slots (not neck/finger/trinket/back/weapon/ranged) require plate.
    if slot in {
        "head",
        "shoulder",
        "chest",
        "wrist",
        "hands",
        "waist",
        "legs",
        "feet",
    }:
        return it.get("armorType") == ARMOR_PLATE
    if slot == "weapon":
        wt = it.get("weaponType")
        if wt in (WEAPON_POLEARM, WEAPON_STAFF):
            return False
        return True
    return True


def generate(spec: str) -> dict:
    if not DB.is_file():
        print(f"missing {DB} — run pnpm sync:wowsims", file=sys.stderr)
        sys.exit(2)
    db = load_json(DB)
    assert isinstance(db, dict)
    weights = load_json(EP_WEIGHTS)
    assert isinstance(weights, dict)
    w = weights["weights"]
    assert isinstance(w, dict)

    by_slot: dict[str, list[dict]] = defaultdict(list)
    for it in db["items"]:
        if not ret_equippable(it):
            continue
        slot = ITEM_TYPE_SLOT[it["type"]]
        stats = item_stats(it)
        score = ep_score(stats, w)
        if score <= 0:
            continue
        entry = {
            "itemId": it["id"],
            "name": it["name"],
            "slot": slot,
            "phase": it.get("phase"),
            "ep": round(score, 3),
            "source": map_source(it.get("sources")),
        }
        by_slot[slot].append(entry)

    pool: list[dict] = []
    for slot, entries in sorted(by_slot.items()):
        entries.sort(key=lambda e: e["ep"], reverse=True)
        pool.extend(entries[:TOP_N])

    return {
        "spec": spec,
        "epPreset": "data/presets/ret/p2.ep-weights.json",
        "topN": TOP_N,
        "entries": pool,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", default="ret")
    args = ap.parse_args()
    if args.spec != "ret":
        print("only --spec ret is implemented", file=sys.stderr)
        return 2

    out = generate(args.spec)
    path = ROOT / "data" / "pools" / f"{args.spec}.generated.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    null_sources = sum(1 for e in out["entries"] if e["source"] is None)
    print(
        f"wrote {path.relative_to(ROOT)} — {len(out['entries'])} entries, "
        f"{null_sources} null sources (curation gap)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
