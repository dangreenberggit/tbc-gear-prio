#!/usr/bin/env python3
"""Lint and type-check the files we own inside the wowsims fork clone.

The Upgrades tab and our ported ranking engine live in
`vendor/tbc-new-fork`, not in this repo's own source tree. Nothing in
`pnpm verify` reached them: `pnpm lint` runs eslint over this repo, and
`pnpm typecheck` runs `tsc --build` over this repo's projects. Neither
one has ever opened `upgrades_tab.tsx`. A defect could reach our fork
code -- a type error, a duplicate import, an unused binding -- and no
gate would notice. The ticket-350 executor flagged exactly that hole.

This script closes it, scoped to **our** files only:

  - `ui/core/components/individual_sim_ui/upgrades/` -- the ported
    engine, its adapters, tools and fixtures.
  - `ui/core/components/individual_sim_ui/upgrades_tab.tsx` -- the tab.
  - `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` --
    the tab's style partial.

**Why the scope is narrow, and must stay narrow.** Everything else in
the fork is upstream wowsims code. Upstream does not write to our lint
rules and has no reason to: `ui/core/components/gear_picker` alone
carries four `simple-import-sort` warnings today, so a whole-fork
`oxlint --deny-warnings` would fail this repo's build over code we do
not own and must not reformat. Rearranging upstream's files to satisfy
our gate would also poison the next upstream merge, which already
conflicted once on a single file (ticket 369). So the gate reads our
paths and nothing else, and upstream lint findings can never fail
`pnpm verify`.

**The type-check is the exception, deliberately.** It runs the fork's
own whole-project `tsc --noEmit` (the fork's `type-check` script)
rather than a scoped subset, because a type error in our tab usually
*surfaces* as an error in the file that imports it, and tsc has no
supported way to check one file with its dependencies. That whole-project
run passes today, measured at 21 seconds, which is why it sits in the
verify chain rather than in a separate opt-in script. If upstream ever
introduces a type error of their own, this gate goes red for a reason that is
not ours -- that is the one place the narrow-scope promise does not
hold, and the fix then is to pin the check to our files, not to edit
upstream.

Skips cleanly (exit 0, saying why) when the fork clone is absent, or is
present without `node_modules`. `vendor/` is gitignored, so a fresh
clone and CI have neither, and absence is an ordinary state -- the same
contract `check_engine_port_drift.py`, `check_equip_eligibility.py` and
`check_meta_conditions.py` already use.

Refuses (exit 2) when the clone's HEAD is not the commit
`data/wowsims-fork.lock.json` pins, like every other fork-derived
check: linting a different commit than the one this repo's state pairs
with answers a question nobody asked.

Run via `pnpm verify` (`pnpm fork-lint:check`).

Exit 0 ok (including "nothing to check"), 1 a real finding, 2 could not
run.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _fork_gate import ForkGateError, require_pinned_fork  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
FORK_MODULES = FORK_ROOT / "node_modules"
BIN_DIR = FORK_MODULES / ".bin"
TSC = FORK_MODULES / "typescript/bin/tsc"

CHECK_NAME = "fork lint check"

# Fork-relative. oxlint and stylelint are given these verbatim, so the
# gate can never read a path we do not own.
TS_PATHS = (
    "ui/core/components/individual_sim_ui/upgrades",
    "ui/core/components/individual_sim_ui/upgrades_tab.tsx",
)
SCSS_PATH = "ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss"


def binary(name: str) -> Path:
    """A fork `node_modules/.bin` entry, `.cmd` on Windows.

    The bare extensionless file there is a shell script: Windows cannot
    execute it through subprocess without a shell, and the `.cmd`
    shim next to it is what npm itself invokes.
    """
    if sys.platform == "win32":
        return BIN_DIR / f"{name}.cmd"
    return BIN_DIR / name


def run(cmd: list[str], label: str) -> tuple[int, str]:
    """Run a fork tool from the fork root. Returns (returncode, output)."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(FORK_ROOT),
            check=False,
        )
    except OSError as exc:
        return 2, f"could not launch {label}: {exc}"
    return result.returncode, (result.stdout or "") + (result.stderr or "")


def report(label: str, output: str) -> None:
    """Print a failing tool's own output, which names file and rule."""
    print(f"\n{CHECK_NAME}: {label} failed.\n", file=sys.stderr)
    text = output.strip()
    print(text if text else "(the tool printed nothing)", file=sys.stderr)


def main() -> int:
    if not FORK_ROOT.is_dir():
        print(
            f"{CHECK_NAME}: skipped -- vendor/tbc-new-fork is absent "
            "(vendor/ is gitignored, so a fresh clone and CI have none). "
            "Nothing to lint in this checkout."
        )
        return 0

    if not FORK_MODULES.is_dir():
        print(
            f"{CHECK_NAME}: skipped -- the fork clone is present but has no "
            "node_modules, so its oxlint, stylelint and tsc are not "
            "installed. Run `npm install` in vendor/tbc-new-fork to enable "
            "this gate."
        )
        return 0

    try:
        pin = require_pinned_fork(CHECK_NAME, FORK_ROOT)
    except ForkGateError as exc:
        print(exc.message, file=sys.stderr)
        return 2

    oxlint = binary("oxlint")
    stylelint = binary("stylelint")
    missing = [p for p in (oxlint, stylelint, TSC) if not p.is_file()]
    if missing:
        names = ", ".join(str(p.relative_to(FORK_ROOT)) for p in missing)
        print(
            f"{CHECK_NAME}: the fork has node_modules but these tools are "
            f"missing: {names}. Re-run `npm install` in vendor/tbc-new-fork.",
            file=sys.stderr,
        )
        return 2

    failures = 0

    # --deny-warnings because every rule our files trip is configured as a
    # warning in the fork's .oxlintrc.json (simple-import-sort/imports,
    # import/no-duplicates). Without it oxlint exits 0 on a real finding and
    # the gate is decoration.
    rc, output = run(
        [str(oxlint), "--deny-warnings", *TS_PATHS], "oxlint"
    )
    if rc == 2:
        print(f"{CHECK_NAME}: {output}", file=sys.stderr)
        return 2
    if rc != 0:
        report("oxlint (our TypeScript/TSX)", output)
        failures += 1

    rc, output = run([str(stylelint), SCSS_PATH], "stylelint")
    if rc == 2 and "could not launch" in output:
        print(f"{CHECK_NAME}: {output}", file=sys.stderr)
        return 2
    if rc != 0:
        report("stylelint (the tab's SCSS partial)", output)
        failures += 1

    rc, output = run(["node", str(TSC), "--noEmit"], "tsc")
    if rc != 0:
        report("tsc --noEmit (the fork's whole project)", output)
        failures += 1

    if failures:
        print(
            f"\n{CHECK_NAME}: {failures} of 3 checks failed at fork commit "
            f"{pin[:12]}. Fix the files named above -- they are ours. If a "
            "failure names a path outside "
            "ui/core/components/individual_sim_ui/upgrades*, it came from "
            "the whole-project type-check and belongs to upstream: say so "
            "rather than editing their file.",
            file=sys.stderr,
        )
        return 1

    print(
        f"{CHECK_NAME} ok at fork commit {pin[:12]}: oxlint clean over "
        "upgrades/ and upgrades_tab.tsx (--deny-warnings), stylelint clean "
        "over _upgrades_tab.scss, fork type-check clean"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
