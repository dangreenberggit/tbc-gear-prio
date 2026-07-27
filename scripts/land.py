#!/usr/bin/env python3
"""
land.py — the only supported door from a feature/phase branch into dev.

    pnpm land
    pnpm land --ack-open-blockers   # phase-N/* with open Blocks: still open
    pnpm land --check-only          # verify + merge-ready, no merge
    pnpm land --no-verify           # skip pnpm verify (escape hatch; not for real landings)

Steps:
  1. Refuse detaching / landing from dev or main
  2. Require a clean working tree
  3. pnpm verify
  4. merge-ready check (review + deferred tickets filed)
  5. git checkout dev && git merge --no-ff <branch>

Does not push. Does not touch main.

Merges into `dev` are also refused by `.githooks/pre-commit` unless
`TBC_ALLOW_DEV_MERGE=1` (this script sets that). Escape hatch for a raw
merge: `TBC_ALLOW_DEV_MERGE=1 git merge --no-ff <branch>`.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Import sibling check module without packaging it.
sys.path.insert(0, str(ROOT / "scripts"))
import check_merge_ready  # noqa: E402

# pre-commit on `dev` refuses merge commits unless this is set (see .githooks/pre-commit).
ALLOW_DEV_MERGE = "TBC_ALLOW_DEV_MERGE"


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    print("+", " ".join(cmd))
    return subprocess.run(cmd, cwd=ROOT, **kwargs)


def die(msg: str, code: int = 1) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(code)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--ack-open-blockers",
        action="store_true",
        help="pass through to merge-ready (phase-N open Blocks: tickets)",
    )
    ap.add_argument(
        "--check-only",
        action="store_true",
        help="run verify + merge-ready only; do not merge",
    )
    ap.add_argument(
        "--no-verify",
        action="store_true",
        help="skip pnpm verify (spike escape hatch)",
    )
    args = ap.parse_args()

    branch = check_merge_ready.branch_name()
    if branch in ("dev", "main"):
        die(f"refuse to land from {branch!r} — check out a feature/phase branch")

    dirty = run(["git", "status", "--porcelain"], capture_output=True, text=True)
    if dirty.returncode != 0:
        die("git status failed")
    if dirty.stdout.strip() and not args.check_only:
        die("working tree not clean — commit or stash first")
    if dirty.stdout.strip() and args.check_only:
        print("(working tree dirty — allowed for --check-only)")

    if not args.no_verify:
        print("\n=== verify ===")
        v = run(["pnpm", "run", "verify"])
        if v.returncode != 0:
            die("pnpm verify failed", v.returncode)
    else:
        print("\n=== verify skipped (--no-verify) ===")

    print("\n=== merge-ready ===")
    ready = check_merge_ready.check(
        branch=branch,
        ack_open_blockers=args.ack_open_blockers,
    )
    if ready != 0:
        return ready

    if args.check_only:
        print("\ncheck-only: ok (not merging)")
        return 0

    print("\n=== merge into dev ===")
    # Ensure local dev exists
    show = run(["git", "show-ref", "--verify", "--quiet", "refs/heads/dev"])
    if show.returncode != 0:
        die("local branch 'dev' does not exist")

    if run(["git", "checkout", "dev"]).returncode != 0:
        die("checkout dev failed")

    msg = f"Merge branch '{branch}' into dev"
    env = os.environ.copy()
    env[ALLOW_DEV_MERGE] = "1"
    merge = run(["git", "merge", "--no-ff", branch, "-m", msg], env=env)
    if merge.returncode != 0:
        print(
            "Merge failed. You are on dev with a conflict (or the merge aborted).\n"
            "Fix up, or: git merge --abort && git checkout " + branch,
            file=sys.stderr,
        )
        return merge.returncode

    print(f"\nlanded {branch} -> dev")
    print("next: push dev when ready (`git push origin dev`); main stays gated")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
