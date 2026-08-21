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

It also reports the **relationship** between the pin and each watched ref, not
just whether the ref moved. `tag` and `watchedRefs` are separate lockfile keys
with no stated connection, so both failures read them as two independent facts
-- "we build from v0.0.101" and "we watch some branch" -- and never asked
whether one contained the other. It does: the pin is an ancestor of
`feature/backend-reforge` (ahead 154, behind 0), so every feature on that
branch is reachable by fast-forward, not absent. A fresh value in a stale
schema would not have prevented either mistake; naming the containment does.

    python scripts/warn_upstream_drift.py

Always exits 0. Run `pnpm sync:wowsims:check` for the real exit code.
"""

from __future__ import annotations

import json
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
    warn_pin_behind_watched_refs()
    return 0


def warn_pin_behind_watched_refs() -> None:
    """Report how the build pin sits relative to each watched ref.

    Movement alone was never the missed signal -- containment was. When the pin
    is an ancestor of a watched ref, that ref's features are reachable by
    fast-forward and must not be described as unavailable. Prints nothing it
    cannot establish; never raises.
    """
    try:
        lock = json.loads((ROOT / "data/wowsims.lock.json").read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return
    watched = lock.get("watchedRefs") or {}
    pin = lock.get("commit")
    repo = lock.get("repo")
    if not (watched and pin and repo):
        return

    for name in watched:
        try:
            raw = subprocess.run(
                ["gh", "api", f"repos/{repo}/compare/{pin}...{name}",
                 "--jq", ".status + \" \" + (.ahead_by|tostring) + \" \" + (.behind_by|tostring)"],
                capture_output=True, text=True, timeout=30,
            )
            if raw.returncode != 0:
                continue
            status, ahead, behind = raw.stdout.strip().split()
        except Exception:  # noqa: BLE001
            continue

        if behind == "0" and ahead != "0":
            print(
                f"  NOTE: the pin is an ANCESTOR of watched ref {name} "
                f"({ahead} commits ahead, 0 behind)."
            )
            print(
                "        Features on that branch are reachable by fast-forward -- "
                "do not call them absent."
            )
        elif status == "diverged":
            print(f"  NOTE: the pin has DIVERGED from watched ref {name} "
                  f"(ahead {ahead}, behind {behind}) -- not a fast-forward.")


if __name__ == "__main__":
    raise SystemExit(main())
