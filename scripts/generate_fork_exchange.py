#!/usr/bin/env python3
"""Write the one non-wowsims item file the fork's Upgrades tab bundles.

The tab builds its candidate pool from wowsims' own item database at run
time (ticket 505), but db.json has no fact that links a tier piece
to the token it is bought with, nor a Sunmote upgrade to its base item. Those
links come from AtlasLoot through this repo's per-spec token maps and the
Sunmote pair map. This script reduces them to one spec-independent file,
`data/two-hop/tier-exchange.json`, which `scripts/sync_fork_universes.py`
copies into the fork.

Inputs: the `<spec>-tokens.json` of every spec in
`packages/core/src/spec-registry.json`, `data/two-hop/tank-healer-tokens.json`
(the tank and healer sets, which the tab's pool offers too: ticket 688),
`data/two-hop/sunmote-pairs.json`, and `vendor/wowsims/db.json`. The token
rows are the union of those maps, sorted by piece id; two maps that disagree
on a piece fail the run, because the tab has one row per piece. The Sunmote rows are the pairs
`assemble_universe.sunmote_upgrade_pairs` keeps, so the tab and the builder
agree on which pairs are upgrades.

  --write   write the file.
  --check   exit 1 when the committed file differs from a fresh build.

Skips cleanly (exit 0, with a message) when `vendor/wowsims/db.json` is
absent: the vendor tree is gitignored, and CI restores it before `verify`.

Run via `pnpm verify` (`pnpm fork-exchange:check`).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from assemble_universe import sunmote_upgrade_pairs  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TWO_HOP = ROOT / "data/two-hop"
SPEC_REGISTRY = ROOT / "packages/core/src/spec-registry.json"
SUNMOTE_PAIRS = TWO_HOP / "sunmote-pairs.json"
VENDOR_DB = ROOT / "vendor/wowsims/db.json"
OUT = TWO_HOP / "tier-exchange.json"
TANK_HEALER = "tank-healer"

TOKEN_FIELDS = ("pieceId", "tokenId", "tokenName", "zone", "boss")


def load(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def token_rows(token_maps: dict[str, object]) -> list[dict]:
    """Union of the token maps, one row per piece.

    Raises ValueError naming both specs when two maps give one piece
    different token facts.
    """
    by_piece: dict[int, tuple[str, dict]] = {}
    for spec, token_map in sorted(token_maps.items()):
        for entry in token_map["entries"]:
            row = {field: entry[field] for field in TOKEN_FIELDS}
            row["pieceId"] = int(row["pieceId"])
            row["tokenId"] = int(row["tokenId"])
            seen = by_piece.get(row["pieceId"])
            if seen is None:
                by_piece[row["pieceId"]] = (spec, row)
            elif seen[1] != row:
                raise ValueError(
                    f"piece {row['pieceId']}: {seen[0]}-tokens.json gives "
                    f"{seen[1]}, {spec}-tokens.json gives {row}"
                )
    return [row for _, (_, row) in sorted(by_piece.items())]


def build() -> str:
    specs = sorted(load(SPEC_REGISTRY)["specs"])
    token_maps = {name: load(TWO_HOP / f"{name}-tokens.json") for name in [*specs, TANK_HEALER]}
    db = load(VENDOR_DB)
    db_by_id = {int(item["id"]): item for item in db["items"]}
    doc = {
        "kind": "tier-exchange",
        "generatedBy": "scripts/generate_fork_exchange.py",
        "tokens": token_rows(token_maps),
        "sunmote": sunmote_upgrade_pairs(load(SUNMOTE_PAIRS), db_by_id),
    }
    return json.dumps(doc, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="write the file")
    mode.add_argument(
        "--check", action="store_true", help="exit 1 when the file is stale"
    )
    args = parser.parse_args()

    if not VENDOR_DB.is_file():
        print(
            "fork exchange: skipped -- vendor/wowsims/db.json is absent (the "
            "vendor tree is gitignored; restore it with "
            "`pnpm sync:wowsims:restore`)."
        )
        return 0

    try:
        text = build()
    except ValueError as exc:
        print(f"fork exchange: conflicting token maps: {exc}", file=sys.stderr)
        return 1

    if args.write:
        with OUT.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print(f"fork exchange: wrote {OUT.relative_to(ROOT).as_posix()}")
        return 0

    if not OUT.is_file() or OUT.read_bytes() != text.encode("utf-8"):
        print(
            f"fork exchange: {OUT.relative_to(ROOT).as_posix()} does not match "
            "a fresh build from the token maps, the Sunmote pairs and db.json. "
            "Refresh with:\n\n"
            f'    python "{ROOT.as_posix()}/scripts/generate_fork_exchange.py" '
            "--write\n\n"
            "then run `scripts/sync_fork_universes.py --write` to copy it "
            "into the fork.",
            file=sys.stderr,
        )
        return 1
    print(f"fork exchange check ok: {OUT.relative_to(ROOT).as_posix()} is current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
