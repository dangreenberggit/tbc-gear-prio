#!/usr/bin/env python3
"""Re-run the fork's equip-eligibility exporter and diff it against the commit.

`data/equip-eligibility.json` records, per spec, every item id the fork's own
`canEquipItem` says that spec can equip. `scripts/assemble_universe.py` looks
items up in it instead of re-implementing the equip rules in Python. The
re-implementation it replaced drifted and offered a rogue a two-handed sword
the sim's own gear picker refuses (ticket 301), so the committed file is only
as trustworthy as the guarantee that it still matches the fork.

This script is that guarantee. It runs the exporter
(`ui/features/upgrades/tools/export_equip_eligibility.mts` in the fork) and
compares the result to the committed JSON. A fork-side change
to `canEquipItem`, to `capabilities_auto_gen.ts`, or to `db.json` shows up here
as a diff on the next `pnpm verify` rather than as a wrong pool listing.

It also checks the one hand-written thing this mechanism still needs: the
slug -> fork-spec-name map, written in packages/core/src/spec-registry.json and
bound as SLUG_TO_FORK_SPEC by assemble_universe.py, which is what this reads.
The outer repo predates the fork and speaks its own slugs (`ret`, `feral`), so
eleven rows of correspondence are unavoidable. What makes them safe is that the
map must be **total** (every profile slug names a spec the JSON actually has)
and **injective** (no two slugs claim the same fork spec). A rename or a typo in
either vocabulary fails here.

Skips cleanly (exit 0, explaining why) when vendor/tbc-new-fork is absent --
it is gitignored, so a fresh clone has no fork -- matching the contract
scripts/check_engine_port_drift.py and the E-W3 parity test already use.

Refuses (exit 2) when the clone's HEAD is not the commit
data/wowsims-fork.lock.json pins: the committed JSON describes the pinned
commit, so re-deriving it from some other commit compares two different
questions. Same rule as scripts/generate_sim_implemented_effects.py.

Run via `pnpm verify` (`pnpm equip-eligibility:check`).

Exit 0 ok (including "nothing to check"), 1 drifted, 2 could not run.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _fork_gate import ForkGateError, require_pinned_fork  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
TOOLS_DIR = FORK_ROOT / "ui/features/upgrades/tools"
EXPORTER = TOOLS_DIR / "export_equip_eligibility.mts"
REGISTER = TOOLS_DIR / "register.mjs"
TSX_LOADER = ROOT / "node_modules/tsx/dist/loader.mjs"
COMMITTED = ROOT / "data/equip-eligibility.json"
ASSEMBLE = ROOT / "scripts/assemble_universe.py"

# How many differing ids to name before summarising. A real drift is usually a
# handful; a rule change is hundreds and the count is the useful part.
MAX_LISTED = 15


def run_exporter(out_path: Path) -> str | None:
    """Run the fork exporter, writing JSON to out_path. Returns None on success."""
    cmd = [
        "node",
        "--import",
        TSX_LOADER.as_uri(),
        "--import",
        REGISTER.as_uri(),
        str(EXPORTER),
        str(out_path),
    ]
    # cwd is the fork root because tsx resolves the fork's `@sim/...` and
    # `@generated/...` imports from the tsconfig.json `paths` of its cwd; from
    # this repo's root they fail with ERR_MODULE_NOT_FOUND (ticket 558 K1).
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, cwd=str(FORK_ROOT), check=False
        )
    except OSError as exc:
        return f"could not launch node: {exc}"
    if result.returncode != 0:
        return (
            f"exporter exited {result.returncode}\n"
            f"{result.stderr.strip() or '(no stderr)'}"
        )
    return None


def compare(committed: dict, fresh: dict) -> list[str]:
    """Human-readable descriptions of every way the two payloads disagree."""
    problems: list[str] = []

    c_specs = committed.get("specs")
    f_specs = fresh.get("specs")
    if not isinstance(c_specs, dict) or not isinstance(f_specs, dict):
        return ["one of the payloads has no 'specs' object -- format changed"]

    if committed.get("itemCount") != fresh.get("itemCount"):
        problems.append(
            f"item count: committed {committed.get('itemCount')}, "
            f"fork now has {fresh.get('itemCount')} -- db.json changed"
        )

    only_committed = sorted(set(c_specs) - set(f_specs))
    only_fresh = sorted(set(f_specs) - set(c_specs))
    if only_committed:
        problems.append(
            f"specs in the committed file but not in the fork: {', '.join(only_committed)}"
        )
    if only_fresh:
        problems.append(
            f"specs the fork now exports but the committed file lacks: {', '.join(only_fresh)}"
        )

    for spec in sorted(set(c_specs) & set(f_specs)):
        c_ids = set(c_specs[spec])
        f_ids = set(f_specs[spec])
        added = sorted(f_ids - c_ids)
        removed = sorted(c_ids - f_ids)
        if not added and not removed:
            continue
        detail = []
        if added:
            shown = ", ".join(str(i) for i in added[:MAX_LISTED])
            more = f" (+{len(added) - MAX_LISTED} more)" if len(added) > MAX_LISTED else ""
            detail.append(f"now eligible: {shown}{more}")
        if removed:
            shown = ", ".join(str(i) for i in removed[:MAX_LISTED])
            more = (
                f" (+{len(removed) - MAX_LISTED} more)"
                if len(removed) > MAX_LISTED
                else ""
            )
            detail.append(f"no longer eligible: {shown}{more}")
        problems.append(f"{spec}: {'; '.join(detail)}")

    return problems


def check_slug_map(spec_keys: set[str]) -> list[str]:
    """SLUG_TO_FORK_SPEC must be total and injective.

    Written in packages/core/src/spec-registry.json and bound by
    assemble_universe.py, which is where this reads it from. Imported rather
    than re-parsed: the bound dict is the artifact under test, and a regex over
    either file could disagree with what Python actually binds.
    """
    sys.path.insert(0, str(ROOT / "scripts"))
    try:
        import assemble_universe  # noqa: PLC0415 -- deliberate late import
    except Exception as exc:  # noqa: BLE001 -- any import failure is a real failure here
        return [f"could not import assemble_universe.py to read the slug map: {exc}"]

    slug_map = getattr(assemble_universe, "SLUG_TO_FORK_SPEC", None)
    profiles = getattr(assemble_universe, "SPEC_PROFILES", None)
    if not isinstance(slug_map, dict) or not isinstance(profiles, dict):
        return [
            "assemble_universe.py must define SLUG_TO_FORK_SPEC and SPEC_PROFILES "
            "as dicts -- one of them is missing or is not a dict"
        ]

    problems: list[str] = []

    missing = sorted(set(profiles) - set(slug_map))
    if missing:
        problems.append(
            "SLUG_TO_FORK_SPEC is not total: these SPEC_PROFILES slugs have no "
            f"fork spec: {', '.join(missing)}"
        )

    stray = sorted(set(slug_map) - set(profiles))
    if stray:
        problems.append(
            "SLUG_TO_FORK_SPEC maps slugs that are not in SPEC_PROFILES: "
            f"{', '.join(stray)}"
        )

    unknown = sorted(
        f"{slug} -> {name}" for slug, name in slug_map.items() if name not in spec_keys
    )
    if unknown:
        problems.append(
            "SLUG_TO_FORK_SPEC names fork specs that data/equip-eligibility.json "
            f"does not have: {', '.join(unknown)}"
        )

    seen: dict[str, str] = {}
    for slug, name in sorted(slug_map.items()):
        if name in seen:
            problems.append(
                "SLUG_TO_FORK_SPEC is not injective: "
                f"'{seen[name]}' and '{slug}' both map to {name}"
            )
        else:
            seen[name] = slug

    return problems


def slug_map_only() -> int:
    """The half that needs no fork: the slug map against the committed JSON.

    Split out because it must run everywhere. Both inputs -- the slug map in
    packages/core/src/spec-registry.json and data/equip-eligibility.json -- are
    committed, so skipping this when vendor/ is absent left a broken map passing
    verify on every fresh clone and every CI run, which is where verify runs
    unattended. Only the fork-diff half genuinely needs the clone.
    """
    if not COMMITTED.is_file():
        print(
            f"equip eligibility check: {COMMITTED.relative_to(ROOT)} is missing. "
            "Regenerate it with the fork exporter (see the fork's "
            "upgrades/tools/README.md).",
            file=sys.stderr,
        )
        return 2
    try:
        committed = json.loads(COMMITTED.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"equip eligibility check: could not read JSON: {exc}", file=sys.stderr)
        return 2

    problems = check_slug_map(set(committed.get("specs") or {}))
    if problems:
        print("the slug map that reads data/equip-eligibility.json is wrong:\n", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    return 0


def main() -> int:
    if not FORK_ROOT.is_dir():
        rc = slug_map_only()
        if rc == 0:
            print(
                "equip eligibility check: slug map total and injective. Fork diff "
                "skipped -- vendor/tbc-new-fork is absent (it is gitignored, so a "
                "fresh clone has none). Clone the fork to check the committed "
                "data/equip-eligibility.json against it."
            )
        return rc

    if not EXPORTER.is_file():
        print(
            f"equip eligibility check: {EXPORTER.relative_to(ROOT)} is missing from "
            "the fork clone. The exporter is the only thing that can re-derive "
            "the committed JSON, so it cannot be checked without it.",
            file=sys.stderr,
        )
        return 2

    if not TSX_LOADER.is_file():
        print(
            "equip eligibility check: node_modules/tsx is missing -- run "
            "`pnpm install` first. The fork ships no TypeScript runner of its "
            "own, so the exporter runs under this repo's tsx.",
            file=sys.stderr,
        )
        return 2

    try:
        pin = require_pinned_fork("equip eligibility check", FORK_ROOT)
    except ForkGateError as exc:
        print(exc.message, file=sys.stderr)
        return 2

    if not COMMITTED.is_file():
        print(
            f"equip eligibility check: {COMMITTED.relative_to(ROOT)} is missing. "
            "Regenerate it with the fork exporter (see the fork's "
            "upgrades/tools/README.md).",
            file=sys.stderr,
        )
        return 2

    tmp_path = COMMITTED.with_suffix(".check.tmp.json")
    try:
        failure = run_exporter(tmp_path)
        if failure is not None:
            print(f"equip eligibility check: {failure}", file=sys.stderr)
            return 2
        try:
            fresh = json.loads(tmp_path.read_text(encoding="utf-8"))
            committed = json.loads(COMMITTED.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            print(f"equip eligibility check: could not read JSON: {exc}", file=sys.stderr)
            return 2
    finally:
        if tmp_path.exists():
            os.unlink(tmp_path)

    problems = compare(committed, fresh)
    spec_keys = set(committed.get("specs") or {})
    problems.extend(check_slug_map(spec_keys))

    if problems:
        print(
            "data/equip-eligibility.json disagrees with the fork at the pinned "
            "commit, or the slug map that reads it is wrong:\n",
            file=sys.stderr,
        )
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print(
            "\nIf the fork's equip rules or item database genuinely changed, "
            "regenerate the committed JSON with the fork exporter (see the "
            "fork's upgrades/tools/README.md) and re-run the universe sweep -- "
            "pool membership moves with it.",
            file=sys.stderr,
        )
        return 1

    spec_count = len(committed.get("specs") or {})
    print(
        f"equip eligibility check ok: {spec_count} specs match the fork at "
        f"{pin[:12]}; slug map total and injective"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
