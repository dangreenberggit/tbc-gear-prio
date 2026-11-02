#!/usr/bin/env python3
"""Fail if a gate run from a git hook can change the repo it was pushed from.

A push from a linked worktree runs `.githooks/pre-push` with GIT_DIR set to
the worktree's gitdir, and `pnpm run verify` passes it on to every gate. Two
gates that build throwaway repos then ran git against the real repo: it set
`core.bare=true` and added commits and branches there (ticket 742).

This gate builds its own throwaway repo with a linked worktree and checks:

- `.githooks/pre-push` clears the repo-binding variables before it calls
  pnpm, and keeps GIT_CONFIG* (a stub `pnpm` on PATH records what it got);
- `check_worktree_pair.py` and `check_merge_ready.py --self-test`, run with
  GIT_DIR set to the throwaway worktree's gitdir, pass and leave the
  throwaway's refs, commits and `core.bare` as they were.

    python scripts/check_gate_git_env.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import os
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOK = ROOT / ".githooks" / "pre-push"
SCRIPTS = (
    ("check_worktree_pair.py",),
    ("check_merge_ready.py", "--self-test"),
)
# Some of the `git rev-parse --local-env-vars` list, which the hook clears.
BINDING_VARS = ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR")


def git(*argv: str, cwd: Path) -> str:
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *argv],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    ).stdout


def make_repo(tmp: Path) -> tuple[Path, Path]:
    main = tmp / "main"
    main.mkdir()
    git("init", "-q", cwd=main)
    git("commit", "-q", "--allow-empty", "-m", "base", cwd=main)
    git("worktree", "add", "-q", "-b", "wt", str(tmp / "wt"), cwd=main)
    return main, Path(git("rev-parse", "--absolute-git-dir", cwd=tmp / "wt").strip())


def snapshot(main: Path) -> dict[str, str]:
    return {
        "refs": git("for-each-ref", "--format=%(refname) %(objectname)", cwd=main),
        "commits": git("rev-list", "--all", "--count", cwd=main).strip(),
        "core.bare": git("config", "--get", "core.bare", cwd=main).strip(),
        "worktree HEAD": git("symbolic-ref", "HEAD", cwd=main.parent / "wt").strip(),
    }


def check_hook_clears_repo_binding_vars(tmp: Path, gitdir: Path) -> list[str]:
    bin_dir = tmp / "bin"
    bin_dir.mkdir()
    seen = tmp / "pnpm-saw.txt"
    stub = bin_dir / "pnpm"
    # Names only: values can hold sandbox proxy credentials.
    stub.write_text(f"#!/bin/sh\nenv | sed 's/=.*//' | grep '^GIT_' > '{seen}'\n", encoding="utf-8")
    stub.chmod(stub.stat().st_mode | stat.S_IXUSR)
    env = dict(
        os.environ,
        PATH=f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
        GIT_DIR=str(gitdir),
        GIT_WORK_TREE=str(tmp / "wt"),
        GIT_INDEX_FILE=str(gitdir / "index"),
        GIT_COMMON_DIR=str(tmp / "main" / ".git"),
        GIT_CONFIG_COUNT="1",
        GIT_CONFIG_KEY_0="safe.directory",
        GIT_CONFIG_VALUE_0="*",
    )
    done = subprocess.run(["sh", str(HOOK), "origin", "unused"], cwd=tmp / "wt", env=env,
                          stdin=subprocess.DEVNULL, capture_output=True, text=True)
    if done.returncode != 0 or not seen.exists():
        return [f"pre-push with a stub pnpm: rc={done.returncode}, stub ran={seen.exists()}, "
                f"stderr={done.stderr.strip()[-300:]!r}"]
    names = set(seen.read_text(encoding="utf-8").split())
    problems = [f"pre-push passed {v} on to pnpm" for v in BINDING_VARS if v in names]
    if "GIT_CONFIG_COUNT" not in names:
        problems.append("pre-push dropped GIT_CONFIG_COUNT; the sandbox's git settings travel in GIT_CONFIG*")
    return problems


def check_script_leaves_hook_repo_alone(tmp: Path, main: Path, gitdir: Path, argv: tuple[str, ...]) -> list[str]:
    before = snapshot(main)
    env = dict(os.environ, GIT_DIR=str(gitdir))
    done = subprocess.run([sys.executable, str(ROOT / "scripts" / argv[0]), *argv[1:]],
                          cwd=ROOT, env=env, capture_output=True, text=True)
    after = snapshot(main)
    name = " ".join(argv)
    problems = [f"{name} under GIT_DIR changed {k}: {before[k]!r} -> {after[k]!r}"
                for k in before if before[k] != after[k]]
    if done.returncode != 0:
        problems.append(f"{name} under GIT_DIR: rc={done.returncode}, stderr tail={done.stderr.strip()[-300:]!r}")
    return problems


def main() -> int:
    # This gate also runs from the hook; its own git calls must not follow
    # a GIT_DIR it inherited.
    for k in [k for k in os.environ if k.startswith("GIT_")]:
        del os.environ[k]
    problems: list[str] = []
    checks = 0
    for argv in SCRIPTS:
        with tempfile.TemporaryDirectory() as td:
            main_repo, gitdir = make_repo(Path(td))
            problems += check_script_leaves_hook_repo_alone(Path(td), main_repo, gitdir, argv)
            checks += 1
    with tempfile.TemporaryDirectory() as td:
        _, gitdir = make_repo(Path(td))
        problems += check_hook_clears_repo_binding_vars(Path(td), gitdir)
        checks += 1
    if not problems:
        print(f"gate git-env checks ok ({checks} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
