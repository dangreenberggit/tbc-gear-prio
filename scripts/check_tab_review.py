#!/usr/bin/env python3
"""Run the per-ticket visual + a11y capture (test-review.mjs) on demand.

The layout gate (check_layout_gate.py) asserts fixed structural facts on every
merge. This wrapper is different: it runs test-review.mjs against a
manifest the executor writes from a plan step's Visual acceptance block, so a
`gate-visual` seat can judge the captured PNGs, facts and a11y against each
ticket's acceptance sentence. It is invoked by hand inside stage-gate execution
(`pnpm tab-review <manifest>`), never in CI and never by pnpm merge-to-dev.

Reuses check_layout_gate's fork/dist/Chromium/Node-22 machinery rather than
copying it: same FORK_ROOT, same _find_chromium, same _node_command Node-22
selection, same TBC_A11Y_BASELINE wiring.

Exit codes -- and why 2 is an error here, unlike the layout gate's skip:
  0 = captured; test-review.mjs ran and every entry captured cleanly.
  1 = the script measured but a capture failed (a selector was absent, a run
      timed out); the index.json errors array names each one.
  2 = a prereq is missing (fork absent, test-review.mjs absent, dist not built,
      no Chromium, no Node 22, manifest unreadable) OR the run was unmeasured.
      The layout gate turns a missing prereq into a SKIP because it runs
      unattended on every merge and an absent clone must not veto one. This
      runs on demand, inside an execution the operator is watching, so a
      missing prereq is a real error to fix now, not a silent pass.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

# Import, do not copy: one source of truth for the fork path, the dist prereqs,
# the browser search, the Node-22 selection and the a11y baseline path.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_layout_gate import (  # noqa: E402
    A11Y_BASELINE_PATH,
    DIST_ASSETS,
    DIST_WASM_CANDIDATES,
    FIXTURE_DIR,
    FORK_ROOT,
    HARNESS_DIR,
    ROOT,
    _find_chromium,
    _node_command,
)

REVIEW_TEST = HARNESS_DIR / "test-review.mjs"

# The tagged verdict line test-review.mjs prints just before it exits, the
# capture-side analogue of the layout gate's LAYOUT_GATE_VERDICT: outcome
# "captured" (with an errors count) or "unmeasured" (crashed before any capture).
VERDICT_TAG_REVIEW = "TAB_REVIEW_VERDICT"


def _parse_review_verdict(stdout: str) -> dict | None:
    """The last TAB_REVIEW_VERDICT line in `stdout`, parsed, or None if absent."""
    found = None
    for line in stdout.splitlines():
        line = line.strip()
        if not line.startswith(VERDICT_TAG_REVIEW):
            continue
        try:
            parsed = json.loads(line[len(VERDICT_TAG_REVIEW) :].strip())
        except ValueError:
            continue
        if isinstance(parsed, dict):
            found = parsed
    return found


def _error(msg: str) -> int:
    print(f"tab-review: {msg}", file=sys.stderr)
    return 2


def run(manifest: str, out: str | None) -> int:
    manifest_path = Path(manifest).resolve()
    if not manifest_path.is_file():
        return _error(f"manifest not found: {manifest_path}")
    out_dir = Path(out).resolve() if out else manifest_path.parent

    if not FORK_ROOT.is_dir():
        return _error(
            "vendor/tbc-new-fork is absent -- the capture harness lives only on "
            "the main checkout with the fork clone."
        )
    if not REVIEW_TEST.is_file():
        return _error(
            f"{REVIEW_TEST.relative_to(ROOT).as_posix()} is absent from this repo."
        )
    if not any(p.is_file() for p in DIST_WASM_CANDIDATES) or not DIST_ASSETS.is_dir():
        return _error(
            "the fork's built dist/ is absent (no prior `make host`). test-review "
            "builds the bundle on top of it and cannot run without it."
        )
    if _find_chromium() is None:
        return _error(
            "no Playwright Chromium found under ~/AppData/Local/ms-playwright "
            "(chromium-*/chrome-win64/chrome.exe). The capture drives a headless "
            "Chromium and cannot run without one."
        )

    cmd = _node_command(
        REVIEW_TEST, ["--manifest", str(manifest_path), "--out", str(out_dir)]
    )
    if cmd is None:
        return _error(
            "no Node >= 22 and no `fnm` to select it. test-review.mjs needs Node "
            "22 (global WebSocket); refusing to run it on an older Node."
        )
    argv, how = cmd

    # Same env wiring as the layout gate: hand the a11y baseline down so the
    # captured a11y.json is classified against known debt, not strict.
    env = dict(os.environ)
    if A11Y_BASELINE_PATH.is_file():
        env["TBC_A11Y_BASELINE"] = str(A11Y_BASELINE_PATH)
    # Where a manifest entry's `"fixture": "<name>"` resolves (ticket 504).
    env["TBC_TAB_FIXTURE_DIR"] = str(FIXTURE_DIR)

    print(f"tab-review: running `{' '.join(argv)}` in {ROOT} ({how})")
    print("(builds the bundle, runs the manifest headless; ~2-3 min)")
    # Tee stdout so a long run shows progress while the verdict line is kept.
    stdout_lines: list[str] = []
    with subprocess.Popen(
        argv,
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    ) as proc:
        assert proc.stdout is not None
        for line in proc.stdout:
            stdout_lines.append(line)
            print(line, end="", flush=True)
    captured = "".join(stdout_lines)

    v = _parse_review_verdict(captured)
    if v is None:
        return _error(
            f"test-review.mjs printed no {VERDICT_TAG_REVIEW} line "
            f"(exit {proc.returncode}) -- treating as unmeasured."
        )
    outcome = v.get("outcome")
    errors = v.get("errors") if isinstance(v.get("errors"), int) else None
    index = out_dir / "index.json"
    if outcome == "captured" and errors == 0:
        print(f"\ntab-review: captured cleanly. See {index}")
        return 0
    if outcome == "captured":
        print(
            f"\ntab-review: captured with {errors} error(s) -- a selector was "
            f"absent or a run timed out. See the errors array in {index}.",
            file=sys.stderr,
        )
        return 1
    return _error(
        f"unmeasured (outcome={outcome!r}) -- the run crashed before capturing "
        "anything. Read the output above."
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("manifest", help="path to the capture manifest JSON")
    ap.add_argument(
        "--out",
        default=None,
        help="output directory (default: the manifest's own directory)",
    )
    args = ap.parse_args()
    return run(args.manifest, args.out)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
