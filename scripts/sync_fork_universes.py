#!/usr/bin/env python3
"""Keep the fork's bundled universe/EP-weight copies equal to their sources.

The Upgrades tab in `vendor/tbc-new-fork` cannot fetch anything at runtime --
it ranks from JSON bundled into its own dist (`upgrades/data/data.ts` static
imports). Those bundled files are verbatim copies of artifacts this repo owns
under `data/`, and nothing regenerates them, so they go stale the moment a
universe is reassembled and nothing notices. That already happened: the
2026-08-16 refresh recorded in the fork's `upgrades/data/PROVENANCE.md` fixed
the data but not the mechanism, and ticket 211 was left open for the
mechanism. This script is that mechanism.

The file list is not written out here a second time: it is parsed from the
mapping table in the fork's own `upgrades/data/PROVENANCE.md`, so a copy
added to the tab without a PROVENANCE row shows up as an unchecked file
rather than being silently skipped by a hardcoded list that nobody updated.

Comparison is byte-for-byte, not `json.load` equality. The copies are
declared verbatim, and a byte check also catches a reformat or an encoding
change that a parsed comparison would call equal while the bundle shipped
different bytes.

  --check   exit 1 naming every drifted file and its per-file delta.
  --write   copy each source over its fork counterpart.

Skips cleanly (exit 0, with a message) when `vendor/tbc-new-fork` is absent.
The clone is gitignored and is NOT restored in CI, so absence is an ordinary
state -- the same reasoning, and the same exit-0-with-a-message shape, as
`scripts/check_engine_port_drift.py`.

Run via `pnpm verify` (`pnpm fork-universes:check`); refresh with
`python scripts/sync_fork_universes.py --write`.

Exit 0 ok (including "nothing to check"), 1 drifted, 2 could not parse.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
DATA_DIR = FORK_ROOT / "ui/core/components/individual_sim_ui/upgrades/data"
PROVENANCE_MD = DATA_DIR / "PROVENANCE.md"

# One row per copied file in PROVENANCE.md's mapping table, e.g.
# | `ret-p3.universe.json` | `data/universes/ret-p3.json` |
ROW = re.compile(
    r"^\|\s*`([\w.-]+\.json)`\s*\|\s*`(data/[\w./-]+\.json)`\s*\|\s*$",
    re.MULTILINE,
)


def parse_provenance(text: str) -> dict[str, str]:
    rows = ROW.findall(text)
    if not rows:
        print(
            f"no copied-file rows found in {PROVENANCE_MD} -- table format "
            "changed, or the file is empty",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return dict(rows)


def describe_delta(source: Path, copy: Path) -> str:
    """A one-line, checkable summary of how a copy differs from its source.

    Universe artifacts are keyed by `itemId`, so membership is the delta
    worth naming first -- membership is what the upstream commits behind the
    recorded drifts actually changed. A file that parses but has no
    `entries` (the EP-weight files) reports content inequality instead of
    pretending to a membership diff it cannot compute.
    """
    try:
        a = json.loads(source.read_text(encoding="utf-8"))
        b = json.loads(copy.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return f"bytes differ; could not parse for a delta ({exc})"

    if (
        isinstance(a, dict)
        and isinstance(b, dict)
        and "entries" in a
        and "entries" in b
    ):
        by_id_a = {e["itemId"]: e for e in a["entries"]}
        by_id_b = {e["itemId"]: e for e in b["entries"]}
        local_only = sorted(set(by_id_a) - set(by_id_b))
        fork_only = sorted(set(by_id_b) - set(by_id_a))
        shared_differ = sum(
            1
            for item_id in set(by_id_a) & set(by_id_b)
            if by_id_a[item_id] != by_id_b[item_id]
        )
        return (
            f"{len(local_only)} local-only {local_only or ''}".rstrip()
            + f"; {len(fork_only)} fork-only {fork_only or ''}".rstrip()
            + f"; {shared_differ} shared entries differ in content"
        )

    return f"bytes differ; parsed content equal: {a == b}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="compare, exit 1 on drift")
    mode.add_argument(
        "--write", action="store_true", help="copy each source over its fork copy"
    )
    args = parser.parse_args()

    if not FORK_ROOT.is_dir():
        print(
            "fork universes check: skipped -- vendor/tbc-new-fork is absent "
            "(the clone is gitignored and is not restored in CI). Nothing to "
            "check in this checkout."
        )
        return 0
    if not PROVENANCE_MD.is_file():
        print(
            f"fork universes check: skipped -- {PROVENANCE_MD.relative_to(ROOT)} "
            "does not exist. The fork clone is present but the tab's data "
            "directory has not been written here yet."
        )
        return 0

    mapping = parse_provenance(PROVENANCE_MD.read_text(encoding="utf-8"))

    # Checked before any copy is written, so --write is all-or-nothing. A
    # partial refresh that still exits nonzero leaves the fork in a state
    # nobody can name: some copies new, some stale, and an error code that
    # does not say which.
    absent = sorted(
        f"{copy_name} <- {source_rel}"
        for copy_name, source_rel in mapping.items()
        if not (ROOT / source_rel).is_file()
    )
    if args.write and absent:
        for line in absent:
            print(f"  missing source: {line}", file=sys.stderr)
        print(
            f"\n{len(absent)} of {len(mapping)} sources named by PROVENANCE.md "
            "do not exist in this repo. Nothing was written -- refusing a "
            "partial refresh. Restore the missing sources, or fix the "
            "PROVENANCE.md table if a file was renamed.",
            file=sys.stderr,
        )
        return 1

    missing_source: list[str] = []
    drifted: list[tuple[str, str, str]] = []
    same: list[str] = []
    written: list[str] = []

    for copy_name, source_rel in sorted(mapping.items()):
        source = ROOT / source_rel
        copy = DATA_DIR / copy_name
        if not source.is_file():
            missing_source.append(f"{copy_name} <- {source_rel}")
            continue
        if copy.is_file() and source.read_bytes() == copy.read_bytes():
            same.append(copy_name)
            continue
        if args.write:
            shutil.copyfile(source, copy)
            written.append(f"{copy_name} <- {source_rel}")
        elif not copy.is_file():
            drifted.append(
                (
                    copy_name,
                    source_rel,
                    "the fork copy PROVENANCE.md names is not on disk",
                )
            )
        else:
            drifted.append((copy_name, source_rel, describe_delta(source, copy)))

    if args.write:
        for line in written:
            print(f"  wrote: {line}")
        print(
            f"fork universes: {len(written)} refreshed, {len(same)} already "
            f"matching, {len(mapping)} listed in PROVENANCE.md"
        )
        return 0

    if not drifted and not missing_source:
        print(
            f"fork universes check ok: {len(same)} bundled copies byte-match "
            "their data/ sources"
        )
        return 0

    for line in missing_source:
        print(
            f"  missing source: {line} (PROVENANCE.md names a file this repo "
            "does not have)",
            file=sys.stderr,
        )
    for copy_name, source_rel, delta in drifted:
        print(f"  drifted: {copy_name} vs {source_rel}\n    {delta}", file=sys.stderr)
    print(
        f"\n{len(drifted)} of {len(mapping)} bundled copies no longer match "
        "their data/ sources. The tab ranks from the bundled copy, so the page "
        "serves a pool this repo no longer produces. Refresh with:\n"
        "\n"
        "    python scripts/sync_fork_universes.py --write\n"
        "\n"
        "then record the refresh and its cause in the fork's "
        "upgrades/data/PROVENANCE.md before committing the fork.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
