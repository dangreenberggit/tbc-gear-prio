#!/usr/bin/env python3
"""Checks for how scripts/check_layout_gate.py reads the harness verdict and
when it writes the baseline: no fork, no browser.

Follows the check_merge_to_dev.py convention -- a standalone script of small
checks, not a pytest suite. A stub harness prints one verdict line and exits
with a chosen code; `run()` is pointed at it with every prerequisite present
and the lock file moved to a temporary folder. The real gate run is
`pnpm layout-gate:check`.

    python scripts/check_layout_gate_verdict.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import contextlib
import io
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_layout_gate as g  # noqa: E402

DIGEST = "d" * 64
STUB = """\
import os, sys
print("LAYOUT_GATE_VERDICT " + os.environ["STUB_VERDICT"])
sys.exit(int(os.environ["STUB_RC"]))
"""

# (name, verdict, harness exit, --fixture?, want rc, want baseline written)
CASES = [
    ("green full run advances the baseline (A2)",
     {"outcome": "measured", "pass": True, "failed": 0}, 0, False, 0, True),
    ("green --fixture run leaves the baseline (A2)",
     {"outcome": "measured", "pass": True, "failed": 0}, 0, True, 0, False),
    ("unmeasured with no failure is a skip",
     {"outcome": "unmeasured", "reason": "stub"}, 1, False, 0, False),
    ("unmeasured with failures is a FAIL (A1)",
     {"outcome": "unmeasured", "reason": "stub", "failed": 2}, 1, False, 1, False),
    ("measured a11y failure is a FAIL",
     {"outcome": "measured", "pass": False, "failed": 0, "a11yFailed": 1},
     1, False, 1, False),
]


def run_case(
    tmp: Path, verdict: dict, harness_rc: int, one_fixture: bool
) -> tuple[int, bool]:
    lock = tmp / "layout.lock.json"
    lock.unlink(missing_ok=True)
    fixture = tmp / "mock.json"
    g.LOCK_PATH = lock
    os.environ["STUB_VERDICT"] = json.dumps(verdict)
    os.environ["STUB_RC"] = str(harness_rc)
    quiet = io.StringIO()
    with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
        rc = g.run(fixture=fixture if one_fixture else None)
    return rc, g.read_baseline() == DIGEST


def main() -> int:
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        stub = tmp / "stub_harness.py"
        stub.write_text(STUB, encoding="utf-8")
        wasm = tmp / "lib.wasm"
        wasm.write_bytes(b"")
        (tmp / "mock.json").write_text("{}", encoding="utf-8")
        g.FORK_ROOT = tmp
        g.LAYOUT_TEST = stub
        g.DIST_WASM_CANDIDATES = (wasm,)
        g.DIST_ASSETS = tmp
        g.compute_tab_hash = lambda: (DIGEST, [])
        g._chromium_problem = lambda: None
        g.fixture_paths = lambda: [tmp / "mock.json"]
        g.check_fixture = lambda p: (True, f"{p.name} ok")
        g._layout_command = lambda: ([sys.executable, str(stub)], "stub")
        for name, verdict, harness_rc, one_fixture, want_rc, want_written in CASES:
            rc, written = run_case(tmp, verdict, harness_rc, one_fixture)
            if (rc, written) != (want_rc, want_written):
                problems.append(
                    f"{name}: rc {rc}, baseline written {written}; "
                    f"want rc {want_rc}, written {want_written}"
                )
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    if problems:
        return 1
    print(f"check_layout_gate_verdict.py ok ({len(CASES)} cases)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
