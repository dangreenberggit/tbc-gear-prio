#!/usr/bin/env python3
"""Warn-only upstream drift notice for `pnpm verify`.

`sync_wowsims.py --check` is the real drift detector. It is not wired into
verify directly for three reasons, each of which would turn a green build red
for a reason unrelated to the change under test:

  - it exits 2 when `vendor/` is absent, which is the normal state of a fresh
    clone and of CI before `sync:wowsims:restore`
  - it exits 1 on drift, and upstream tagging a release is not a defect in
    the commit being verified
  - it needs network and `gh` auth, neither of which verify may have

So this wrapper runs it, prints whatever it said, and **always exits 0**.

Why it exists at all: `feature/backend-reforge` gained `timeToNextEnergyTick`
and nobody noticed for weeks, because the tripwire that reports it
(`sync:wowsims:check`) was a script no gate ran. Ticket 244 was written on the
premise the field was simply unavailable. `do_check`'s own comment already
records the first instance of this exact failure -- "the optimizer that
'didn't exist' was live on feature/backend-reforge the whole time"
(sync_wowsims.py:443). This is the second. A tripwire wired to nothing is not
a tripwire.

    python scripts/warn_upstream_drift.py

Always exits 0. Run `pnpm sync:wowsims:check` for the real exit code.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECK = ROOT / "scripts" / "sync_wowsims.py"


def main() -> int:
    try:
        out = subprocess.run(
            [sys.executable, str(CHECK), "--check"],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(ROOT),
        )
    except subprocess.TimeoutExpired:
        print("upstream drift: check timed out (network?) -- skipped, not a failure")
        return 0
    except Exception as exc:  # noqa: BLE001 - a warner must never break the build
        print(f"upstream drift: check could not run ({exc}) -- skipped, not a failure")
        return 0

    body = (out.stdout or "") + (out.stderr or "")
    drift_lines = [ln for ln in body.splitlines() if "DRIFT:" in ln]

    if out.returncode == 2:
        print("upstream drift: vendor/ absent -- skipped (run pnpm sync:wowsims:restore)")
        return 0

    if not drift_lines:
        print("upstream drift check ok: in sync with the pin")
        return 0

    print("upstream drift (warning only -- does not fail the build):")
    for ln in drift_lines:
        print(f"  {ln.strip()}")
    print("  a watched ref that moved may have gained a feature we treat as absent;")
    print("  see .scratch/carry-forward/issues/244-engine-pin-predates-timetonextenergytick.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
