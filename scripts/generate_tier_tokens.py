#!/usr/bin/env python3
"""Generate the tier-token maps from AtlasLoot and the wowsims database.

Writes `data/two-hop/tier-sets.json` (spec -> its tier set ids), the eleven
`data/two-hop/<spec>-tokens.json` maps (tier piece -> the token that buys it,
with the token's raid and boss), and `data/two-hop/tank-healer-tokens.json`,
the same map for the tank and healer sets (`labels` null). No spec ranks those
sets, but the fork's Upgrades tab offers every tier piece a class can wear, so
it needs their token rows too (ticket 688). Inputs:

- `vendor/atlasloot/data-tbc.lua`: the `T4_SET`/`T5_SET`/`T6_SET` tables (set
  id and a class/spec label per row) and the instance loot tables, whose row
  comments name each token. Zone and boss come from `parse_atlasloot.parse_lua`,
  the same parse that writes `data/atlasloot_sources.json`.
- `vendor/wowsims/db.json`: set pieces by `setId`, with slot (`type`) and
  `classAllowlist`.
- `data/two-hop/token-groups.json`: the hand tables neither source states.

A piece is paired with the token of its own tier word, slot word and class
group; exactly one token must match, or the run fails.

The maps were hand-made before this script existed (ticket 609). Their
`collectedDate`, `notes` and row order are kept from the committed file, so a
regen moves only rows; a row the committed file lacks is appended in tier and
slot order. Run `pnpm atlasloot:regen:check` to compare a fresh run with the
committed files.

Usage:
    python scripts/generate_tier_tokens.py
    python scripts/generate_tier_tokens.py --out-dir <dir>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import parse_atlasloot as pa  # noqa: E402

DEFAULT_LUA = ROOT / "vendor" / "atlasloot" / "data-tbc.lua"
DEFAULT_DB = ROOT / "vendor" / "wowsims" / "db.json"
GROUPS = ROOT / "data" / "two-hop" / "token-groups.json"
COMMITTED_DIR = ROOT / "data" / "two-hop"
# The map for the sets whose `labels` entry is null: tank and healer sets.
TANK_HEALER = "tank-healer"

SET_TABLE_RE = re.compile(r"^local T(\d)_SET\s*=\s*\{", re.MULTILINE)
SET_ROW_RE = re.compile(r"^\s*\{\s*\d+\s*,\s*(\d+)\s*\}\s*,\s*--\s*(.+?)\s*$")


def token_row_re(groups: dict) -> re.Pattern[str]:
    slots = "|".join(map(re.escape, groups["slots"]))
    tiers = "|".join(map(re.escape, groups["tiers"]))
    stems = "|".join(map(re.escape, groups["groups"]))
    return re.compile(
        r"^\s*\{\s*\d+\s*,\s*(\d+)\s*\}\s*,\s*--\s*"
        rf"(({slots}) of the ({tiers}) ({stems}))\s*$"
    )


def parse_tier_sets(lua_text: str, labels: dict) -> list[dict]:
    """Rows of the three `T<n>_SET` tables: {tier, setId, label, spec}."""
    rows: list[dict] = []
    for m in SET_TABLE_RE.finditer(lua_text):
        tier = int(m.group(1))
        block = pa.extract_brace_block(lua_text, m.end() - 1)
        for line in block.splitlines():
            if line.strip().startswith("--"):
                continue
            rm = SET_ROW_RE.match(line)
            if not rm:
                continue
            label = rm.group(2)
            if label not in labels:
                raise SystemExit(
                    f"T{tier}_SET label {label!r} is not in {GROUPS.name} `labels`; "
                    "add it (spec slug, or null for a tank or healer set)"
                )
            rows.append(
                {"tier": tier, "setId": int(rm.group(1)), "label": label, "spec": labels[label]}
            )
    if not rows:
        raise SystemExit("no T<n>_SET rows found in data-tbc.lua; the table shape changed")
    return rows


def parse_tokens(lua_text: str, groups: dict) -> dict[int, dict]:
    """Token id -> {name, slotType, tier, classes}, from live loot-row comments."""
    row_re = token_row_re(groups)
    tokens: dict[int, dict] = {}
    for line in lua_text.splitlines():
        if line.strip().startswith("--"):
            continue
        m = row_re.match(line)
        if not m:
            continue
        tid = int(m.group(1))
        tok = {
            "name": m.group(2),
            "slotType": groups["slots"][m.group(3)],
            "tier": groups["tiers"][m.group(4)],
            "classes": set(groups["groups"][m.group(5)]),
        }
        prev = tokens.get(tid)
        if prev is not None and prev["name"] != tok["name"]:
            raise SystemExit(f"token {tid} is named both {prev['name']!r} and {tok['name']!r}")
        tokens[tid] = tok
    return tokens


def token_drop(sources: dict, tid: int) -> tuple[str, str]:
    raids = [s for s in sources.get(str(tid)) or [] if s.get("kind") == "raid"]
    if len(raids) != 1 or not raids[0].get("boss"):
        raise SystemExit(f"token {tid}: expected one raid source with a boss, got {raids}")
    return str(raids[0]["zone"]), str(raids[0]["boss"])


def build(lua_text: str, db: dict, groups: dict) -> tuple[dict, dict[str, list[dict]]]:
    """Spec -> its tier sets, and map name -> its token entries.

    The map name is the spec slug, or `TANK_HEALER` for a set whose label is
    null; those sets go in no spec's `tier-sets.json` row.
    """
    set_rows = parse_tier_sets(lua_text, groups["labels"])
    tokens = parse_tokens(lua_text, groups)
    zones_by_id = {int(z["id"]): str(z["name"]) for z in db.get("zones") or [] if "id" in z}
    npcs_by_id = {int(n["id"]): str(n["name"]) for n in db.get("npcs") or [] if "id" in n}
    npc_zone_by_id = {
        int(n["id"]): int(n["zoneId"]) for n in db.get("npcs") or [] if "id" in n and "zoneId" in n
    }
    sources, _ = pa.parse_lua(
        lua_text,
        zones_by_id=zones_by_id,
        npcs_by_id=npcs_by_id,
        npc_zone_by_id=npc_zone_by_id,
    )
    pieces_by_set: dict[int, list[dict]] = defaultdict(list)
    for it in db.get("items") or []:
        if it.get("setId"):
            pieces_by_set[int(it["setId"])].append(it)

    tier_sets: dict[str, list[dict]] = defaultdict(list)
    entries: dict[str, list[tuple[tuple, dict]]] = defaultdict(list)
    for row in set_rows:
        spec = row["spec"]
        pieces = pieces_by_set.get(row["setId"])
        if not pieces:
            raise SystemExit(f"set {row['setId']} ({row['label']}) has no pieces in db.json")
        if spec is not None:
            tier_sets[spec].append(
                {"setId": row["setId"], "tier": row["tier"], "name": str(pieces[0].get("setName"))}
            )
        map_name = spec if spec is not None else TANK_HEALER
        for piece in pieces:
            classes = set(piece.get("classAllowlist") or [])
            matches = [
                tid
                for tid, tok in tokens.items()
                if tok["tier"] == row["tier"]
                and tok["slotType"] == piece.get("type")
                and classes
                and classes <= tok["classes"]
            ]
            if len(matches) != 1:
                raise SystemExit(
                    f"piece {piece['id']} {piece['name']!r} (set {row['setId']}, type "
                    f"{piece.get('type')}, classes {sorted(classes)}): {len(matches)} tokens "
                    f"match {matches}; expected exactly one"
                )
            tid = matches[0]
            zone, boss = token_drop(sources, tid)
            entry = {
                "pieceId": int(piece["id"]),
                "pieceName": str(piece["name"]),
                "tokenId": tid,
                "tokenName": tokens[tid]["name"],
                "zone": zone,
                "boss": boss,
                "assertTokenIdDiffers": True,
            }
            entries[map_name].append(((row["tier"], piece.get("type"), entry["pieceId"]), entry))

    out_sets = {spec: sorted(rows, key=lambda r: (r["tier"], r["setId"])) for spec, rows in sorted(tier_sets.items())}
    out_entries = {spec: [e for _, e in sorted(rows, key=lambda r: r[0])] for spec, rows in entries.items()}
    return out_sets, out_entries


def token_file(map_name: str, entries: list[dict], committed: dict | None) -> dict:
    if committed is None:
        head = (
            {"sets": "tank and healer (token-groups.json `labels` null)"}
            if map_name == TANK_HEALER
            else {"spec": map_name}
        )
        return {
            **head,
            "kind": "token-map",
            "notes": [
                f"Generated by scripts/generate_tier_tokens.py (ticket {688 if map_name == TANK_HEALER else 609})."
            ],
            "entries": entries,
        }
    order = {int(e["pieceId"]): i for i, e in enumerate(committed.get("entries") or [])}
    kept = sorted((e for e in entries if e["pieceId"] in order), key=lambda e: order[e["pieceId"]])
    added = [e for e in entries if e["pieceId"] not in order]
    out = {k: v for k, v in committed.items() if k != "entries"}
    out["entries"] = kept + added
    return out


def write_json(path: Path, data: object) -> None:
    # newline="" keeps LF on Windows; the committed files are LF and the regen
    # check compares bytes (same reason as parse_atlasloot.py).
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lua", type=Path, default=DEFAULT_LUA)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--out-dir", type=Path, default=COMMITTED_DIR)
    args = ap.parse_args()

    missing = [p for p in (args.lua, args.db) if not p.is_file()]
    if missing:
        for p in missing:
            print(f"missing {p} (run `pnpm sync:atlasloot:restore` / `pnpm sync:wowsims:restore`)", file=sys.stderr)
        return 2

    groups = json.loads(GROUPS.read_text(encoding="utf-8"))
    lua_text = args.lua.read_text(encoding="utf-8")
    db = json.loads(args.db.read_text(encoding="utf-8"))
    tier_sets, entries = build(lua_text, db, groups)

    write_json(args.out_dir / "tier-sets.json", tier_sets)
    for spec in sorted(entries):
        committed_path = COMMITTED_DIR / f"{spec}-tokens.json"
        committed = (
            json.loads(committed_path.read_text(encoding="utf-8")) if committed_path.is_file() else None
        )
        write_json(args.out_dir / f"{spec}-tokens.json", token_file(spec, entries[spec], committed))
        print(f"  {spec}: {len(entries[spec])} pieces, {len(tier_sets.get(spec, []))} sets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
