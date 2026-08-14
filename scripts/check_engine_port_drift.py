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

    if not drifted and not missing:
        print(f"engine port drift check ok: {len(recorded)} ported files match PROVENANCE.md")
        return 0

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
