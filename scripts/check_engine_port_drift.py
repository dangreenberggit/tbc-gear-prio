#!/usr/bin/env python3
"""Re-hash the fork's ported engine files against engine/PROVENANCE.md.

The wowsims-tab detour (docs/plans/wowsims-tab/plan.md) ports packages/core's
ranking engine into vendor/tbc-new-fork/ui/core/components/individual_sim_ui/
upgrades/engine/. E-W3 (the fixture-parity test,
packages/core/test/wowsims-fork-parity.test.ts) is the only thing that proves
the port still *behaves* like packages/core. Per plan §8's "E-W3 runs here,
not in the fork" decision, E-W3 lives in this repo rather than travelling
with the fork, so a fork-only edit to a ported file could change its
behaviour with nothing inside the fork noticing.

This script is the compensating control named there: it re-hashes every file
PROVENANCE.md lists and fails loudly the moment a file's content no longer
matches its recorded hash. Read that sentence carefully -- a hash match is
NOT proof of correct behaviour. It only proves nobody has touched the file's
bytes since the hash was recorded. Someone can still break the port while
staying byte-identical to a *stale but wrong* hash (if the hash itself was
never regenerated after the last real edit), and this script cannot see
that. Only E-W3 tests behaviour; this only tests "did anything change
without anyone re-running E-W3 and updating the table."

Two failure modes this script distinguishes, matching PROVENANCE.md's job:

  - A ported file's hash no longer matches the table -> the file was edited
    (in the fork, or the table is stale) and PROVENANCE.md was not updated.
    This is the drift the whole mechanism exists to catch.
  - A file the table lists is missing from disk -> the port regressed or the
    table references a file that was since deleted/renamed.

Skips cleanly (exit 0, explaining why) when vendor/tbc-new-fork is absent
(gitignored -- plan D1) or PROVENANCE.md itself is missing, the same two
independent conditions packages/core/test/wowsims-fork-parity.test.ts (E-W3)
gates on. Absence is an ordinary state -- a fresh clone, or before slice 2
ever ran -- not a failure.

Run via `pnpm verify` (`pnpm engine-port-drift:check`).

Exit 0 ok (including "nothing to check"), 1 drifted, 2 could not parse.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
ENGINE_DIR = (
    FORK_ROOT
    / "ui/core/components/individual_sim_ui/upgrades/engine"
)
PROVENANCE_MD = ENGINE_DIR / "PROVENANCE.md"

# One row per ported file: `| `fork/relative/path.ts` | ... | ... | `<hash>` |`
# Anchored on a leading backtick-quoted path ending in `.ts` and a trailing
# backtick-quoted 64-hex-char sha256, so the "Not ported" and "Data files"
# tables below the ported-files table (which have no hash column) cannot be
# picked up by accident.
ROW = re.compile(
    r"^\|\s*`([\w./-]+\.ts)`\s*\|.*\|\s*`([0-9a-f]{64})`\s*\|\s*$",
    re.MULTILINE,
)


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_provenance(text: str) -> dict[str, str]:
    rows = ROW.findall(text)
    if not rows:
        print(
            f"no ported-file rows found in {PROVENANCE_MD} -- table format "
            "changed, or the file is empty",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return dict(rows)


# --- Semantic union compare (ticket 296) -------------------------------------
#
# The hash table above proves a ported file's bytes have not moved. It cannot
# say anything about the three unions the fork hand-writes because packages/core
# generates them and the fork has no generator: `ItemSlot` and
# `ITEM_SOURCE_KINDS` in upgrades/engine/pool.ts, and `SIM_ORDER` in
# upgrades/engine/slots.ts. Both files' own headers say they are "kept in sync
# by inspection", which is the failure mode ticket 296 names -- a hash gate
# passes happily while the two sides mean different things.
#
# So compare the members, not the bytes. A fork union that gains, loses or
# reorders a member against this repo's source fails here with the delta named.

SLOTS_TABLE = ROOT / "packages/core/src/slots-table.json"
ITEM_SOURCE_KINDS_JSON = ROOT / "packages/core/src/item-source-kinds.json"
CORE_ITEMS_TS = ROOT / "packages/core/src/items.ts"
FORK_POOL_TS = ENGINE_DIR / "pool.ts"
FORK_SLOTS_TS = ENGINE_DIR / "slots.ts"

# `export type ItemSlot =` followed by `| "member"` alternatives, to the `;`.
TS_UNION = r'export type {name} =\s*(?P<body>[^;]+);'
# `export const NAME = [ "a", "b" ] as const;`
TS_ARRAY = r'export const {name}\s*(?::[^=]+)?=\s*\[(?P<body>[^\]]*)\]'
QUOTED = re.compile(r'"([^"]*)"')


def ts_union_members(text: str, name: str, where: Path) -> list[str]:
    m = re.search(TS_UNION.format(name=name), text)
    if not m:
        print(f"could not find `export type {name}` in {where}", file=sys.stderr)
        raise SystemExit(2)
    return QUOTED.findall(m.group("body"))


def ts_array_members(text: str, name: str, where: Path) -> list[str]:
    m = re.search(TS_ARRAY.format(name=name), text)
    if not m:
        print(f"could not find `export const {name}` in {where}", file=sys.stderr)
        raise SystemExit(2)
    return QUOTED.findall(m.group("body"))


def compare_union(label: str, ours: list[str], theirs: list[str]) -> list[str]:
    """Order-sensitive compare. Returns human-readable problems, empty if equal.

    Order matters for all three: SIM_ORDER indexes a 17-slot gear array, and
    the other two are read as ordered literals on both sides, so a reorder is
    a real divergence rather than cosmetics.
    """
    if ours == theirs:
        return []
    problems = []
    missing = [m for m in ours if m not in theirs]
    extra = [m for m in theirs if m not in ours]
    if missing:
        problems.append(f"{label}: the fork is missing {', '.join(missing)}")
    if extra:
        problems.append(f"{label}: the fork has extra {', '.join(extra)}")
    if not missing and not extra:
        problems.append(
            f"{label}: same members, different order\n"
            f"      ours:      {', '.join(ours)}\n"
            f"      the fork:  {', '.join(theirs)}"
        )
    return problems


def check_unions() -> list[str]:
    for path in (SLOTS_TABLE, ITEM_SOURCE_KINDS_JSON, CORE_ITEMS_TS, FORK_POOL_TS, FORK_SLOTS_TS):
        if not path.is_file():
            print(
                f"union compare: {path} is missing -- cannot compare the fork's "
                "hand-written unions against their source.",
                file=sys.stderr,
            )
            raise SystemExit(2)

    pool_ts = FORK_POOL_TS.read_text(encoding="utf-8")
    slots_ts = FORK_SLOTS_TS.read_text(encoding="utf-8")
    slots_table = json.loads(SLOTS_TABLE.read_text(encoding="utf-8"))
    kinds_json = json.loads(ITEM_SOURCE_KINDS_JSON.read_text(encoding="utf-8"))
    core_items = CORE_ITEMS_TS.read_text(encoding="utf-8")

    problems: list[str] = []
    problems += compare_union(
        "ItemSlot (packages/core/src/items.ts vs fork engine/pool.ts)",
        ts_union_members(core_items, "ItemSlot", CORE_ITEMS_TS),
        ts_union_members(pool_ts, "ItemSlot", FORK_POOL_TS),
    )
    problems += compare_union(
        "ITEM_SOURCE_KINDS (packages/core/src/item-source-kinds.json vs fork engine/pool.ts)",
        list(kinds_json["kinds"]),
        ts_array_members(pool_ts, "ITEM_SOURCE_KINDS", FORK_POOL_TS),
    )
    problems += compare_union(
        "SIM_ORDER (packages/core/src/slots-table.json vs fork engine/slots.ts)",
        list(slots_table["simOrder"]),
        ts_array_members(slots_ts, "SIM_ORDER", FORK_SLOTS_TS),
    )
    return problems


def main() -> int:
    if not FORK_ROOT.is_dir():
        print(
            "engine port drift check: skipped -- vendor/tbc-new-fork is absent "
            "(vendor/ is gitignored, plan D1). Nothing to check in this checkout."
        )
        return 0
    if not PROVENANCE_MD.is_file():
        print(
            f"engine port drift check: skipped -- {PROVENANCE_MD.relative_to(ROOT)} "
            "does not exist. The fork clone is present but the engine has not "
            "been ported here yet (or PROVENANCE.md was not written)."
        )
        return 0

    recorded = parse_provenance(PROVENANCE_MD.read_text(encoding="utf-8"))

    drifted: list[tuple[str, str, str]] = []
    missing: list[str] = []
    for rel_path, expected_hash in sorted(recorded.items()):
        file_path = ENGINE_DIR / rel_path
        if not file_path.is_file():
            missing.append(rel_path)
            continue
        actual_hash = sha256_of(file_path)
        if actual_hash != expected_hash:
            drifted.append((rel_path, expected_hash, actual_hash))

    union_problems = check_unions()

    if not drifted and not missing and not union_problems:
        print(
            f"engine port drift check ok: {len(recorded)} ported files match "
            "PROVENANCE.md; ItemSlot, ITEM_SOURCE_KINDS and SIM_ORDER match "
            "their sources member-for-member"
        )
        return 0

    if union_problems:
        print(
            "the fork's hand-written unions no longer match their source in "
            "packages/core:\n",
            file=sys.stderr,
        )
        for problem in union_problems:
            print(f"  - {problem}", file=sys.stderr)
        print(
            "\npackages/core generates these from JSON (`pnpm codegen:json-types`); "
            "the fork has no generator, so its copies are hand-written and this "
            "is the only thing that catches a divergence (ticket 296). A hash "
            "match cannot: both sides can be byte-stable and still disagree.\n"
            "Edit the fork's literal to match, then follow the ported-file cycle "
            "in docs/agents/known-traps.md.",
            file=sys.stderr,
        )
        if not drifted and not missing:
            return 1

    for rel_path in missing:
        print(f"  missing: {rel_path} (listed in PROVENANCE.md, not found on disk)", file=sys.stderr)
    for rel_path, expected_hash, actual_hash in drifted:
        print(
            f"  drifted: {rel_path}\n"
            f"    PROVENANCE.md hash: {expected_hash}\n"
            f"    actual file hash:   {actual_hash}",
            file=sys.stderr,
        )
    print(
        "\nengine/PROVENANCE.md is stale against the fork's ported files. This "
        "means a ported file changed without E-W3 (packages/core/test/"
        "wowsims-fork-parity.test.ts) being re-run and PROVENANCE.md's hash "
        "being updated to match -- exactly the silent-drift scenario this "
        "check exists to catch. Re-run E-W3, confirm it still passes (or fix "
        "what broke), then recompute the sha256 for each changed file and "
        "update its row in PROVENANCE.md.\n"
        "\n"
        "Reminder: a hash match proves nothing about behaviour by itself -- "
        "only E-W3 does. Do not update a hash without re-running E-W3 first.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
