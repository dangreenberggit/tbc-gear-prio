#!/usr/bin/env python3
"""
merge_to_dev.py — the only supported door from a feature/phase branch into dev.

    pnpm merge-to-dev
    pnpm merge-to-dev --ack-open-blockers   # phase-N/* with open Blocks: still open
    pnpm merge-to-dev --check-only          # verify + merge-ready, no merge
    pnpm merge-to-dev --no-verify           # skip pnpm verify (escape hatch; not for real merges)

Steps:
  1. Refuse detaching / merging from dev or main
  2. Require a clean working tree
  3. pnpm verify
  4. merge-ready check (review + deferred tickets filed)
  5. layout gate (Upgrades tab) -- runs only if the fork's tab source changed
     since the last green run, and only when its prereqs are present; skips
     cleanly otherwise (ticket 325). See scripts/check_layout_gate.py.
  6. git checkout dev && git merge --no-ff <branch>

Does not push. Does not touch main.

Merges into `dev` are also refused by `.githooks/pre-commit` unless
`TBC_ALLOW_DEV_MERGE=1` (this script sets that). Escape hatch for a raw
merge: `TBC_ALLOW_DEV_MERGE=1 git merge --no-ff <branch>`.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Import sibling check module without packaging it.
sys.path.insert(0, str(ROOT / "scripts"))
import check_layout_gate  # noqa: E402
import check_merge_ready  # noqa: E402

# pre-commit on `dev` refuses merge commits unless this is set (see .githooks/pre-commit).
ALLOW_DEV_MERGE = "TBC_ALLOW_DEV_MERGE"


def _resolve_cmd(cmd: list[str]) -> list[str]:
    """On Windows, prefer *.cmd shims — bare 'pnpm' is often a non-PE script."""
    if not cmd or os.name != "nt":
        return cmd
    exe = cmd[0]
    if exe in ("pnpm", "npx", "npm"):
        for candidate in (f"{exe}.CMD", f"{exe}.cmd"):
            found = shutil.which(candidate)
            if found:
                return [found, *cmd[1:]]
        found = shutil.which(exe)
        if found:
            return [found, *cmd[1:]]
    if exe == "git":
        found = shutil.which("git")
        if found:
            return [found, *cmd[1:]]
    return cmd


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    cmd = _resolve_cmd(cmd)
    print("+", " ".join(cmd))
    return subprocess.run(cmd, cwd=ROOT, **kwargs)


def die(msg: str, code: int = 1) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(code)


def _commit_layout_baseline(lock_path: Path, digest: str) -> None:
    """Commit a green-run layout-gate baseline advance onto the feature branch.

    Called by check_layout_gate.run() only after a green gate run rewrites the
    lock to a new digest, and before this script's `git checkout dev`. Commits
    ONLY the lock file, so the advance enters the merge and the tree is clean at
    checkout (review finding A2). Scoping to the lock alone matters because the
    pre-commit `lint-staged` runs against `*`; the tree was verified clean
    before the gate ran, so the lock is the only dirty path here, but the
    explicit pathspec keeps that true even if that assumption ever weakens.
    """
    rel = os.path.relpath(lock_path, ROOT)
    add = run(["git", "add", "--", rel])
    if add.returncode != 0:
        die("layout gate advanced the baseline but `git add` of the lock failed")
    msg = (
        f"Advance Upgrades-tab layout baseline to {digest[:12]}\n\n"
        "The layout gate ran green against changed tab source and rewrote\n"
        "data/wowsims-fork-layout.lock.json. Commit the advance on the feature\n"
        "branch so it enters this merge and the next qualifying merge skips the\n"
        "~2m19s re-test of the same source."
    )
    commit = run(["git", "commit", "-m", msg, "--", rel])
    if commit.returncode != 0:
        die("layout gate advanced the baseline but committing the lock failed")
    print(f"committed layout baseline advance ({rel}) onto {ROOT.name}'s branch")


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
        die(f"refuse to merge from {branch!r} — check out a feature/phase branch")

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

    # The Upgrades-tab layout gate. Runs only when the fork's tab source changed
    # since the last green run AND the fork, its built dist/, and a Chromium are
    # all present; skips cleanly (returns 0) otherwise. A real assertion failure
    # returns nonzero and blocks the merge. See scripts/check_layout_gate.py and
    # ticket 325.
    #
    # A green run advances data/wowsims-fork-layout.lock.json. That write lands
    # AFTER the clean-tree check above, so without this callback it would ride
    # onto dev uncommitted or trip a merge conflict, and the ~2m19s re-test would
    # be re-paid on the next qualifying merge (review finding A2). The callback
    # commits the advance onto the feature branch BEFORE `git checkout dev`, so
    # the tree is clean at checkout and the new digest enters the merge.
    print("\n=== layout gate (Upgrades tab) ===")
    layout_rc = check_layout_gate.run(
        on_baseline_advanced=_commit_layout_baseline if not args.check_only else None
    )
    if layout_rc != 0:
        die("layout gate failed — Upgrades tab layout is broken", layout_rc)

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

    print(f"\nmerged {branch} -> dev")
    print("next: push dev when ready (`git push origin dev`); main stays gated")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
