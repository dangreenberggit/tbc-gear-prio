#!/usr/bin/env python3
"""The committed AtlasLoot parse must reproduce from the vendored Lua.

`data/atlasloot_sources.json`, `data/two-hop/raid-recipes.json` and
`data/faction_ids.json` are generated output committed to the tree, while their
source (`vendor/atlasloot/`) is gitignored. Nothing else re-derives them, so
between one `--update` and the next a committed file can drift from the Lua it
claims to come from -- a hand edit, a bad merge, or a parser change shipped
without a regen -- and every gate downstream keeps reporting green.

`faction_ids.json` is why this is worth a gate rather than a convention. It
feeds `rep_source()` in `assemble_universe.py`, so a wrong id there does not
merely mislabel a source: `check_rep_tables.py` resolves the shipped spelling
through the *same* map that produced the id, so both sides agree and the check
still passes. A corrupted map weakens the gate silently (ticket 69).

This re-runs the parser into a temp directory and byte-compares. It does not
rewrite the committed files -- a gate that fixes what it measures cannot fail.

Needs `vendor/atlasloot/`, which is gitignored; skips cleanly when it is absent
so a fresh worktree is not blocked, and CI restores it first. Pair with
`pnpm sync:atlasloot:verify-local`, which checks the Lua against the lockfile:
this gate proves output matches input, that one proves input matches the pin.

Run via `pnpm atlasloot:regen:check`.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARSER = ROOT / "scripts/parse_atlasloot.py"
VENDOR_LUA = ROOT / "vendor/atlasloot/data-tbc.lua"
FACTIONS_LUA = ROOT / "vendor/atlasloot/factions-tbc.lua"

# committed path -> the parser flag that writes it
OUTPUTS = {
    ROOT / "data/atlasloot_sources.json": "--out",
    ROOT / "data/two-hop/raid-recipes.json": "--recipes-out",
    ROOT / "data/faction_ids.json": "--factions-out",
}


def main() -> int:
    missing = [p for p in (VENDOR_LUA, FACTIONS_LUA) if not p.is_file()]
    if missing:
        print(
            "  vendor/atlasloot absent -- skipping regen check "
            "(run `pnpm sync:atlasloot:restore`)"
        )
        return 0

    with tempfile.TemporaryDirectory() as tmp:
        args = [sys.executable, str(PARSER)]
        for committed, flag in OUTPUTS.items():
            args += [flag, str(Path(tmp) / committed.name)]
        proc = subprocess.run(args, capture_output=True, text=True)
        if proc.returncode != 0:
            print(f"  parser failed (exit {proc.returncode}):", file=sys.stderr)
            print(proc.stdout[-2000:], file=sys.stderr)
            print(proc.stderr[-2000:], file=sys.stderr)
            return 2

        failures = []
        for committed in OUTPUTS:
            if not committed.is_file():
                failures.append(f"{committed.relative_to(ROOT)} is not committed")
                continue
            regenerated = Path(tmp) / committed.name
            if regenerated.read_bytes() != committed.read_bytes():
                failures.append(
                    f"{committed.relative_to(ROOT)} differs from a fresh parse of "
                    "vendor/atlasloot -- rerun `python scripts/parse_atlasloot.py` "
                    "and commit, or find out who edited it by hand"
                )

    if failures:
        for f in failures:
            print(f"  FAIL: {f}", file=sys.stderr)
        return 1

    print(f"  atlasloot parse reproduces: {len(OUTPUTS)} committed outputs match.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
