#!/usr/bin/env python3
"""Pin what `parse_wowhead_source` reads from a Wowhead Source cell.

The builder has no Python unit-test runner, so the parse cases a universe
depends on are pinned here and run by `pnpm verify`
(`pnpm wowhead-parse:check`). A universe row would only show a wrong parse
after a regeneration, and a reader could not tell which input caused it.

The honour cases are ticket 681: an honour vendor row that names a season
must carry it, as an arena row does, so the tab can print "Honor, season 3".
The badge cases pin the two badge forms the cross-spec index (ticket 676)
chooses between: a priced row and the cost-0 "Badges of Justice" row.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(ROOT / "scripts"))
from _vendored_inputs import exit_if_missing  # noqa: E402

exit_if_missing()

from assemble_universe import parse_wowhead_source  # noqa: E402

CASES: list[tuple[str, list[dict]]] = [
    (
        "Vendor: Honor Points (Season 3)",
        [{"kind": "pvp", "via": "honor", "season": 3}],
    ),
    (
        "Vendor: Honor Points (Season 1)",
        [{"kind": "pvp", "via": "honor", "season": 1}],
    ),
    ("Honor Points - Arena Vendor", [{"kind": "pvp", "via": "honor"}]),
    ("Vendor: G'eras (25 Badges of Justice)", [{"kind": "badge", "cost": 25}]),
    ("Vendor: G'eras (Badges of Justice)", [{"kind": "badge", "cost": 0}]),
]


def main() -> int:
    failures: list[str] = []
    for text, expected in CASES:
        got = parse_wowhead_source(text)
        if got != expected:
            failures.append(f"{text!r}: expected {expected!r}, got {got!r}")
    if failures:
        for line in failures:
            print(f"wowhead-parse check FAILED: {line}", file=sys.stderr)
        return 1
    print(f"wowhead parse ok: {len(CASES)} source texts parse as pinned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
