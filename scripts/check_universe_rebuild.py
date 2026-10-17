#!/usr/bin/env python3
"""Check that the committed universes are what the builder builds (ticket 679).

For every committed `data/universes/<spec>-p<N>.json` this calls the builder's
`assemble()` in this process, serialises the universe and its report the way
`assemble_universe.py`'s `main()` writes them, and byte-compares both with the
committed files. It then has the builder write its weapon-type exclusions
manifest to a temporary file and byte-compares that with
`data/weapon-type-exclusions.json`. A builder edit committed without the
regeneration, or a hand edit to a universe, fails here by file name.

Why in memory: running the builder 44 times as processes and then
`git diff --exit-code` would rewrite the tree on every `pnpm verify`; one
process parses `vendor/wowsims/db.json` once and takes a few seconds.

Every gitignored file the builder reads is under `vendor/wowsims/` and is a key
of `data/wowsims.lock.json` `files`, which CI restores with
`pnpm run sync:wowsims:restore` before `pnpm verify`, so this check has no CI
skip. Whether CI's Linux Python writes the same bytes as Windows is a
hypothesis, untested, until the branch's first CI run (ticket 679).

Exit 0 every file matches, 1 a mismatch, 2 an input is missing.
"""

from __future__ import annotations

import contextlib
import io
import json
import re
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNIVERSES = ROOT / "data/universes"
UNIVERSE_NAME_RE = re.compile(r"^(?P<spec>[a-z]+)-p(?P<phase>\d)\.json$")

sys.path.insert(0, str(ROOT / "scripts"))
import assemble_universe as A  # noqa: E402


def serialise(obj: object) -> bytes:
    # The same text main() writes with encoding="utf-8", newline="\n".
    return (json.dumps(obj, indent=2) + "\n").encode("utf-8")


def main() -> int:
    if not A.DB.is_file():
        print(
            f"missing {A.DB.relative_to(ROOT).as_posix()} -- run "
            "pnpm sync:wowsims:restore",
            file=sys.stderr,
        )
        return 2

    started = time.perf_counter()
    checked = 0
    mismatches: list[str] = []

    for path in sorted(UNIVERSES.glob("*.json")):
        if path.name.endswith(".report.json"):
            continue
        m = UNIVERSE_NAME_RE.match(path.name)
        if m is None or m["spec"] not in A.SPEC_PROFILES:
            print(
                f"UNKNOWN data/universes/{path.name} -- no builder profile "
                "makes this file",
                file=sys.stderr,
            )
            mismatches.append(path.name)
            continue
        spec, phase = m["spec"], int(m["phase"])
        report_path = path.with_name(f"{spec}-p{phase}.report.json")
        rerun = f"pnpm universe:assemble --spec {spec} --max-phase {phase}"

        # The builder prints diagnostics (for example `sunmote: rejected ...`)
        # on every call; keep them for a mismatch only.
        captured = io.StringIO()
        with contextlib.redirect_stderr(captured):
            payload, report = A.assemble(
                phase,
                hold_out_wowhead=False,
                apply_junk_filter=False,
                spec=spec,
            )

        file_failed = False
        for target, obj in ((path, payload), (report_path, report)):
            checked += 1
            if not target.is_file() or target.read_bytes() != serialise(obj):
                print(f"MISMATCH data/universes/{target.name} -- run {rerun}")
                mismatches.append(target.name)
                file_failed = True
        if file_failed and captured.getvalue():
            print(captured.getvalue(), end="", file=sys.stderr)

    with tempfile.TemporaryDirectory() as tmp:
        built = Path(tmp) / A.EXCLUSIONS_MANIFEST.name
        A.write_exclusions_manifest(built)
        checked += 1
        if (
            not A.EXCLUSIONS_MANIFEST.is_file()
            or A.EXCLUSIONS_MANIFEST.read_bytes() != built.read_bytes()
        ):
            print(
                "MISMATCH "
                f"{A.EXCLUSIONS_MANIFEST.relative_to(ROOT).as_posix()} "
                "-- run pnpm universe:assemble"
            )
            mismatches.append(A.EXCLUSIONS_MANIFEST.name)

    elapsed = time.perf_counter() - started
    print(
        f"universe-rebuild: {checked} files checked, {len(mismatches)} "
        f"mismatches, {elapsed:.1f} s"
    )
    return 1 if mismatches else 0


if __name__ == "__main__":
    sys.exit(main())
