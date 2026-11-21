#!/usr/bin/env python3
"""Run the fork's whole unit suite and locale check, as upstream CI's `npm run test:unit` and `test:locales` do.

Since ticket 505 the tab builds its candidate pool at run time in fork code
(`pool_source.ts`, `item_sources.ts`, `settings_pool.ts`), and the pool's
tests live beside it in the fork. Nothing else in `pnpm verify` runs them:
this repo's `vitest.config.ts` excludes `**/vendor/**`, and
`fork-lint:check` only lints and type-checks. Before 505,
`universe-rebuild:check` and `fork-universes:check` checked pool content
inside verify; without this step verify passed with `pool_source.ts` broken
(pre-merge review of feat/tab-wowsims-items, finding A2).

Not scoped to the tab's own tests. Until 2026-11-20 it ran only
`ui/features/upgrades/` and the tab-body tests (906 tests), so an upstream
test our files broke went unseen: upstream's `ui/i18n/locale_keys.test.ts`
failed on the tab's plural locale keys while verify passed. The fork's
`.github/workflows/run_tests.yml` runs the whole suite on a pull request, so
this gate does too (about 45 s more than the scoped run on an idle machine).
It also runs `test-locales.mjs`, upstream's check of each locale file against
its schema in `schemas/`, which nothing else here ran (under a second).

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

# lazy_load.test.ts walks the fork's import graph and took 13 s against vitest's
# 5 s default inside a busy `pnpm verify` (ticket 692); set here, not in the fork,
# so the fix needs no fork re-pin.
TEST_TIMEOUT_MS = 60_000

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def summary_lines(output: str) -> list[str]:
    """Vitest's closing "Test Files" and "Tests" count lines, without color codes."""
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

    # The two test steps of upstream CI (`.github/workflows/run_tests.yml`): the unit
    # suite, and the locale files against their schemas.
    steps = (
        ("vitest run", ["node", str(VITEST), "run", f"--testTimeout={TEST_TIMEOUT_MS}"]),
        ("node test-locales.mjs", ["node", "test-locales.mjs"]),
    )
    outputs = {}
    for name, command in steps:
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=str(FORK_ROOT),
                check=False,
            )
        except OSError as exc:
            print(f"{CHECK_NAME}: could not launch {name}: {exc}", file=sys.stderr)
            return 2

        output = (result.stdout or "") + (result.stderr or "")
        if result.returncode != 0:
            print(output.strip() or f"({name} printed nothing)", file=sys.stderr)
            print(
                f"\n{CHECK_NAME}: {name} exited {result.returncode} at fork "
                f"commit {pin[:12]}. Fix the failures named above. An upstream "
                "test that fails here fails upstream CI on our pull request too; "
                "fix our code, not the upstream test.",
                file=sys.stderr,
            )
            return 1
        outputs[name] = output

    counts = "; ".join(summary_lines(outputs["vitest run"])) or "no count line printed"
    print(
        f"{CHECK_NAME} ok at fork commit {pin[:12]}: vitest run, whole suite ({counts}); "
        "test-locales.mjs passed"
    )
    return 0

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
