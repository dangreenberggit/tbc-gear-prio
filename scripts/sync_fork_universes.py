#!/usr/bin/env python3
"""Keep the fork's bundled data copies equal to their sources, and keep any
other JSON out of the fork's data folder.

The Upgrades tab in `vendor/tbc-new-fork` bundles a few JSON files into its
own dist (`upgrades/model/data/data.ts` static imports): EP-weight copies
and the tier exchange file. (The per-spec universe copies it also held left
with ticket 505.) Each is a verbatim copy of an artifact this repo owns under `data/`,
and nothing regenerates it, so it goes stale the moment its source changes
and nothing notices. That already happened: the 2026-08-16 refresh recorded
in `docs/fork-provenance/data.md` fixed the data but not the mechanism, and
ticket 211 was left open for the mechanism. This script is that mechanism.

The file list is not written out here a second time: it is parsed from the
mapping table in `docs/fork-provenance/data.md`. Any other `*.json` in the
fork's data folder fails the run, because the tab is meant to take its item
facts from wowsims (ticket 505), and a JSON file without a data.md row is an
item list nobody declared.

Comparison is byte-for-byte, not `json.load` equality. The copies are
declared verbatim, and a byte check also catches a reformat or an encoding
change that a parsed comparison would call equal while the bundle shipped
different bytes.

Both sides are kept in the fork formatter's JSON layout (`oxfmt_json`), so the
copies pass upstream's `oxfmt --check` and stay byte-equal to their sources
(ticket 885: the owner chose this over an ignore entry in the fork's
`.oxfmtrc.json`). `scripts/check_fork_lint.py` runs oxfmt itself on the fork,
which catches a source whose shape `oxfmt_json` lays out differently.

  --check   exit 1 naming every drifted file and its per-file delta, every
            source not in oxfmt's layout, and every JSON file in the fork's
            data folder that data.md does not list.
  --write   rewrite each source in oxfmt's layout, then copy it over its
            fork counterpart; still exit 1 when an unlisted JSON file is
            present, since a copy cannot fix that.

Skips cleanly (exit 0, with a message) when `vendor/tbc-new-fork` is absent.
The clone is gitignored and is NOT restored in CI, so absence is an ordinary
state -- the same reasoning, and the same exit-0-with-a-message shape, as
`scripts/check_engine_port_drift.py`. The record,
`docs/fork-provenance/data.md`, is tracked in this repo, so a missing record
is always an error (exit 2).

Run via `pnpm verify` (`pnpm fork-universes:check`); refresh with
`python <repo>/scripts/sync_fork_universes.py --write`, where `<repo>` is the
checkout whose fork copies you are refreshing (ROOT comes from this file's
location, so the working directory does not matter). Tested by
`scripts/check_sync_fork_universes.py`.

Exit 0 ok (including "nothing to check"), 1 drifted or unlisted, 2 could not
parse.
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
DATA_DIR = FORK_ROOT / "ui/features/upgrades/model/data"
# The record lives in this repo, not the fork (moved out of the fork's
# model/data/ folder so the fork carries no tooling of ours).
PROVENANCE_MD = ROOT / "docs/fork-provenance/data.md"

# One row per copied file in data.md's mapping table, e.g.
# | `ret-p2.ep-weights.json` | `data/presets/ret/p2.ep-weights.json` |
ROW = re.compile(
    r"^\|\s*`([\w.-]+\.json)`\s*\|\s*`(data/[\w./-]+\.json)`\s*\|\s*$",
    re.MULTILINE,
)


def oxfmt_json(text: str) -> str:
    """`text` in the JSON layout oxfmt writes under the fork's `.oxfmtrc.json`
    (`useTabs`) for the copies' shapes: tab indent, objects and arrays
    expanded, non-ASCII kept, one trailing newline. oxfmt keeps an array on
    one line when it fits, and writes a number such as `1e-5` as written where
    this writes `1e-05`, so either would differ; no copy has one, and the
    fork's oxfmt check in `scripts/check_fork_lint.py` would catch it."""
    return json.dumps(json.loads(text), indent="\t", ensure_ascii=False) + "\n"


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
    """A one-line, checkable summary of how a copy differs from its source:
    whether the parsed content is equal, so a reformat or an encoding change
    reads apart from a real edit."""
    try:
        a = json.loads(source.read_text(encoding="utf-8"))
        b = json.loads(copy.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return f"bytes differ; could not parse for a delta ({exc})"
    return f"bytes differ; parsed content equal: {a == b}"


def unlisted_json(data_dir: Path, mapping: dict[str, str]) -> list[str]:
    """JSON files in the fork's data folder that data.md does not list."""
    return sorted(
        path.name
        for path in data_dir.glob("*.json")
        if path.is_file() and path.name not in mapping
    )


def report_unlisted(unlisted: list[str], data_dir: Path, provenance_md: Path) -> None:
    for name in unlisted:
        print(f"  unlisted: {name}", file=sys.stderr)
    print(
        f"\n{len(unlisted)} JSON file(s) in {data_dir.as_posix()} have no row in "
        f"{provenance_md.as_posix()}. The tab takes its item facts from "
        "wowsims (ticket 505); a bundled JSON file needs a data.md row naming "
        "its data/ source, or it should not be in the fork. Delete the file "
        "in the fork, or add its row.",
        file=sys.stderr,
    )


def run(write: bool, *, root: Path, data_dir: Path, provenance_md: Path) -> int:
    """Compare (or, with `write`, refresh) the fork copies; see the module doc."""
    mapping = parse_provenance(provenance_md.read_text(encoding="utf-8"))

    # Checked before any copy is written, so --write is all-or-nothing. A
    # partial refresh that still exits nonzero leaves the fork in a state
    # nobody can name: some copies new, some stale, and an error code that
    # does not say which.
    absent = sorted(
        f"{copy_name} <- {source_rel}"
        for copy_name, source_rel in mapping.items()
        if not (root / source_rel).is_file()
    )
    if write and absent:
        for line in absent:
            print(f"  missing source: {line}", file=sys.stderr)
        print(
            f"\n{len(absent)} of {len(mapping)} sources named by data.md "
            "do not exist in this repo. Nothing was written -- refusing a "
            "partial refresh. Restore the missing sources, or fix the "
            "data.md table if a file was renamed.",
            file=sys.stderr,
        )
        return 1

    # Every source is read and laid out before anything is written, so a
    # source that does not parse stops --write with nothing changed. Bytes are
    # decoded as they are, without newline translation, so a CRLF source reads
    # as out of layout: oxfmt rejects CRLF.
    laid_by_source: dict[str, tuple[str, str]] = {}
    for source_rel in sorted(set(mapping.values())):
        source = root / source_rel
        if not source.is_file():
            continue
        text = source.read_bytes().decode("utf-8")
        try:
            laid_by_source[source_rel] = (text, oxfmt_json(text))
        except json.JSONDecodeError as exc:
            print(f"  could not parse {source_rel}: {exc}", file=sys.stderr)
            return 2

    missing_source: list[str] = []
    drifted: list[tuple[str, str, str]] = []
    out_of_layout: list[str] = []
    same: list[str] = []
    written: list[str] = []
    laid_out: list[str] = []

    for copy_name, source_rel in sorted(mapping.items()):
        source = root / source_rel
        copy = data_dir / copy_name
        if not source.is_file():
            missing_source.append(f"{copy_name} <- {source_rel}")
            continue
        text, laid = laid_by_source[source_rel]
        if laid != text:
            if write:
                with source.open("w", encoding="utf-8", newline="\n") as handle:
                    handle.write(laid)
                laid_out.append(source_rel)
            else:
                out_of_layout.append(source_rel)
        if copy.is_file() and source.read_bytes() == copy.read_bytes():
            same.append(copy_name)
            continue
        if write:
            shutil.copyfile(source, copy)
            written.append(f"{copy_name} <- {source_rel}")
        elif not copy.is_file():
            drifted.append(
                (
                    copy_name,
                    source_rel,
                    "the fork copy data.md names is not on disk",
                )
            )
        else:
            drifted.append((copy_name, source_rel, describe_delta(source, copy)))

    unlisted = unlisted_json(data_dir, mapping)

    if write:
        for line in laid_out:
            print(f"  laid out: {line}")
        for line in written:
            print(f"  wrote: {line}")
        print(
            f"fork data copies: {len(written)} refreshed, {len(same)} already "
            f"matching, {len(mapping)} listed in data.md"
        )
        if unlisted:
            report_unlisted(unlisted, data_dir, provenance_md)
            return 1
        return 0

    if not drifted and not missing_source and not unlisted and not out_of_layout:
        print(
            f"fork data copies check ok: {len(same)} bundled copies byte-match "
            "their data/ sources; no unlisted JSON"
        )
        return 0

    for line in missing_source:
        print(
            f"  missing source: {line} (data.md names a file this repo "
            "does not have)",
            file=sys.stderr,
        )
    for copy_name, source_rel, delta in drifted:
        print(f"  drifted: {copy_name} vs {source_rel}\n    {delta}", file=sys.stderr)
    for source_rel in out_of_layout:
        print(f"  not in oxfmt's layout: {source_rel}", file=sys.stderr)
    if out_of_layout:
        print(
            f"\n{len(out_of_layout)} source(s) are not in the fork formatter's "
            "JSON layout, so their copies would fail upstream's `oxfmt --check`. "
            "Lay out both sides with:\n"
            "\n"
            f"    python \"{root.as_posix()}/scripts/sync_fork_universes.py\" --write\n",
            file=sys.stderr,
        )
    if drifted or missing_source:
        print(
            f"\n{len(drifted)} of {len(mapping)} bundled copies no longer match "
            "their data/ sources. The tab reads the bundled copy, so the page "
            "serves data this repo no longer produces. Refresh with:\n"
            "\n"
            f"    python \"{root.as_posix()}/scripts/sync_fork_universes.py\" --write\n"
            "\n"
            "then record the refresh and its cause in "
            f"{provenance_md.as_posix()} before committing the fork.",
            file=sys.stderr,
        )
    if unlisted:
        report_unlisted(unlisted, data_dir, provenance_md)
    return 1


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
            "fork data copies check: skipped -- vendor/tbc-new-fork is absent "
            "(the clone is gitignored and is not restored in CI). Nothing to "
            "check in this checkout."
        )
        return 0
    if not PROVENANCE_MD.is_file():
        print(
            f"fork data copies check: {PROVENANCE_MD.relative_to(ROOT)} does not "
            "exist. It is a tracked file in this repo, so it should never be "
            "missing.",
            file=sys.stderr,
        )
        return 2

    return run(args.write, root=ROOT, data_dir=DATA_DIR, provenance_md=PROVENANCE_MD)


if __name__ == "__main__":
    raise SystemExit(main())
