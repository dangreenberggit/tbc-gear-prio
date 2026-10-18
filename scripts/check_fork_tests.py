#!/usr/bin/env python3
"""Run the fork's Upgrades tab tests (`vitest run` over `TEST_PATHS`).

Since ticket 505 the tab builds its candidate pool at run time in fork code
(`pool_source.ts`, `item_sources.ts`, `settings_pool.ts`), and the pool's
tests live beside it in the fork. Nothing else in `pnpm verify` runs them:
this repo's `vitest.config.ts` excludes `**/vendor/**`, and
`fork-lint:check` only lints and type-checks. Before 505,
`universe-rebuild:check` and `fork-universes:check` checked pool content
inside verify; without this step verify passed with `pool_source.ts` broken
(pre-merge review of feat/tab-wowsims-items, finding A2).

Scoped to `ui/features/upgrades/` and the two tab-body tests the fork adds
under `ui/app/tabs/`, for the reason `check_fork_lint.py` gives: everything
else in the fork is upstream's, and its tests are not ours to gate on.

Skips cleanly (exit 0, saying why) when the fork clone is absent, or is
present without `node_modules`, the same contract as `check_fork_lint.py`.
Refuses (exit 2) when the clone's HEAD is not the commit
`data/wowsims-fork.lock.json` pins.

Run via `pnpm verify` (`pnpm fork-tests:check`).

Exit 0 ok (including "nothing to check"), 1 a failing test, 2 could not run.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _fork_gate import ForkGateError, require_pinned_fork  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
FORK_MODULES = FORK_ROOT / "node_modules"
VITEST = FORK_MODULES / "vitest/vitest.mjs"

CHECK_NAME = "fork tests check"

# Fork-relative; each must exist, so a moved path fails loudly instead of running no tests.
TEST_PATHS = (
    "ui/features/upgrades",
    "ui/app/tabs/UpgradesTabBody.test.tsx",
    "ui/app/tabs/UpgradesTabBody.unopened.test.tsx",
)

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def summary_lines(output: str) -> list[str]:
    """Vitest's closing "Test Files" and "Tests" count lines, without colour codes."""
    plain = _ANSI_RE.sub("", output)
    return [
        line.strip()
        for line in plain.splitlines()
        if line.strip().startswith(("Test Files", "Tests "))
    ]


def main() -> int:
    if not FORK_ROOT.is_dir():
        print(
            f"{CHECK_NAME}: skipped -- vendor/tbc-new-fork is absent "
            "(vendor/ is gitignored, so a fresh clone and CI have none). "
            "No fork tests to run in this checkout."
        )
        return 0

    if not FORK_MODULES.is_dir():
        print(
            f"{CHECK_NAME}: skipped -- the fork clone is present but has no "
            "node_modules, so its vitest is not installed. Run `npm install` "
            "in vendor/tbc-new-fork to enable this gate."
        )
        return 0

    try:
        pin = require_pinned_fork(CHECK_NAME, FORK_ROOT)
    except ForkGateError as exc:
        print(exc.message, file=sys.stderr)
        return 2

    if not VITEST.is_file():
        print(
            f"{CHECK_NAME}: the fork has node_modules but "
            f"{VITEST.relative_to(FORK_ROOT)} is missing. Re-run `npm install` "
            "in vendor/tbc-new-fork.",
            file=sys.stderr,
        )
        return 2

    absent = [p for p in TEST_PATHS if not (FORK_ROOT / p).exists()]
    if absent:
        print(
            f"{CHECK_NAME}: {', '.join(absent)} missing from the fork at "
            f"{pin[:12]}. Update TEST_PATHS in scripts/check_fork_tests.py to "
            "the new names.",
            file=sys.stderr,
        )
        return 1

    tested = " ".join(TEST_PATHS)
    try:
        result = subprocess.run(
            ["node", str(VITEST), "run", *TEST_PATHS],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(FORK_ROOT),
            check=False,
        )
    except OSError as exc:
        print(f"{CHECK_NAME}: could not launch vitest: {exc}", file=sys.stderr)
        return 2

    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        print(output.strip() or "(vitest printed nothing)", file=sys.stderr)
        print(
            f"\n{CHECK_NAME}: vitest run {tested} exited "
            f"{result.returncode} at fork commit {pin[:12]}. Fix the failing "
            "tests named above -- they are ours.",
            file=sys.stderr,
        )
        return 1

    counts = "; ".join(summary_lines(output)) or "no count line printed"
    print(f"{CHECK_NAME} ok at fork commit {pin[:12]}: vitest run {tested} ({counts})")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
