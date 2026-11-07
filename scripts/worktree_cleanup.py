#!/usr/bin/env python3
"""List this repo's worktrees and, with --remove, remove the merged ones.

    pnpm wt:cleanup                          # list only; changes nothing
    pnpm wt:cleanup --files                  # also list every report file
    pnpm wt:cleanup --remove                 # archive reports, then remove
    pnpm wt:cleanup --remove --include-t3    # T3's worktrees too

Four tools make worktrees in four places (T3 under ~/.t3/worktrees, Claude
Code under .claude/worktrees, agents under .scratch/wt-*, `pnpm wt:pair`
under ../tbc-wt), and nothing removes them (ticket 835). Many hold
gitignored agent reports under `.scratch/` that exist nowhere else.

For each worktree the list shows its branch, whether `dev` contains its
HEAD, whether `git status` is clean, and the gitignored files under
`.scratch/` it holds (the reports). `--remove` copies those reports to
`<main checkout>/.scratch/worktree-archive/<worktree folder name>/`, then
runs `git worktree remove` (never `--force`) on each worktree that
`keep_reason` does not keep. It keeps the main checkout, the worktree that
holds `dev`, the one it runs from, locked ones, pairs (they need `pnpm
wt:unpair`, which also removes the fork worktree), unmerged or dirty ones,
and ones holding other ignored files it does not archive. T3 binds threads
to worktrees under ~/.t3/worktrees, and this script cannot see which, so it
keeps all of them unless --include-t3 is given.

Branches are kept; delete merged ones with `git branch -d`.
"""

from __future__ import annotations

import argparse
import filecmp
import shutil
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import worktree_pair  # noqa: E402

INTEGRATION_BRANCH = "dev"
T3_DIR = "/.t3/worktrees/"
FORK_REL = Path("vendor") / "tbc-new-fork"
REPORTS = ".scratch/"
ARCHIVE_REL = Path(".scratch") / "worktree-archive"
# Claude Code's write markers and Python's bytecode caches hold no work.
NOT_WORK_PARTS = (".cc-writes", "__pycache__")


@dataclass
class Worktree:
    path: Path
    branch: str | None
    head: str
    is_main: bool
    holds_dev: bool
    here: bool
    locked: bool
    prunable: bool
    t3: bool
    pair: bool
    merged: bool
    clean: bool
    reports: list[str] = field(default_factory=list)
    other_ignored: list[str] = field(default_factory=list)


def keep_reason(wt: Worktree, include_t3: bool) -> str | None:
    """Why --remove leaves `wt` in place, or None when it may go. Pure."""
    if wt.is_main:
        return "main checkout"
    if wt.holds_dev:
        return f"holds {INTEGRATION_BRANCH}"
    if wt.here:
        return "this script runs from it"
    if wt.prunable:
        return "its folder is missing; `git worktree prune` clears the entry"
    if wt.locked:
        return "locked (git worktree list --porcelain shows why)"
    if wt.t3 and not include_t3:
        return "T3 worktree; a T3 thread may use it (--include-t3 removes it)"
    if wt.pair:
        return f"pair: remove it with `pnpm wt:unpair {wt.path.name}`, which also removes its fork worktree"
    if not wt.merged:
        return f"not merged into {INTEGRATION_BRANCH}"
    if not wt.clean:
        return "uncommitted or untracked files"
    if wt.other_ignored:
        return "ignored files this script does not archive: " + ", ".join(wt.other_ignored[:5])
    return None


def split_ignored(listed: list[str], is_empty) -> tuple[list[str], list[str]]:
    """(report files, other ignored paths that may hold work) from `git
    status --ignored` paths and `ls-files` report paths. Pure apart from
    `is_empty(rel)`: an empty file is a sandbox stub, not work."""
    reports, other = [], []
    for rel in listed:
        if any(part in NOT_WORK_PARTS for part in rel.rstrip("/").split("/")):
            continue
        if rel.startswith(REPORTS):
            if not rel.endswith("/"):
                reports.append(rel)
        elif not worktree_pair.is_disposable(rel) and not is_empty(rel):
            other.append(rel)
    return reports, other


def git(cwd: Path, *args: str) -> str:
    r = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise SystemExit(f"FAIL: git {' '.join(args)} in {cwd}: {r.stderr.strip()}")
    return r.stdout


def git_ok(cwd: Path, *args: str) -> bool:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True).returncode == 0


def read_worktree(entry: dict[str, str], main: Path, here: Path) -> Worktree:
    path = Path(entry["worktree"])
    branch_ref = entry.get("branch", "")
    branch = branch_ref.removeprefix("refs/heads/") or None
    head = entry.get("HEAD", "")
    prunable = "prunable" in entry or not path.is_dir()
    wt = Worktree(
        path=path,
        branch=branch,
        head=head,
        is_main=worktree_pair.same_path(str(path), str(main)),
        holds_dev=branch == INTEGRATION_BRANCH,
        here=worktree_pair.same_path(str(path), str(here)),
        locked="locked" in entry,
        prunable=prunable,
        t3=T3_DIR in path.as_posix() + "/",
        pair=(path / FORK_REL).exists(),
        merged=bool(head) and git_ok(main, "merge-base", "--is-ancestor", head, f"refs/heads/{INTEGRATION_BRANCH}"),
        clean=False,
    )
    if prunable:
        return wt
    wt.clean = not git(path, "status", "--porcelain", "--untracked-files=all").strip()
    ignored = [
        line[3:]
        for line in git(path, "status", "--porcelain", "--ignored", "--untracked-files=normal").splitlines()
        if line.startswith("!! ") and not line[3:].startswith(REPORTS)
    ]
    report_files = git(
        path, "ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--", REPORTS
    ).split("\0")
    listed = [rel for rel in report_files if rel] + ignored

    def is_empty(rel: str) -> bool:
        p = path / rel
        return p.is_file() and not p.is_symlink() and p.stat().st_size == 0

    wt.reports, wt.other_ignored = split_ignored(listed, is_empty)
    return wt


def report_summary(reports: list[str]) -> str:
    """`.scratch/agent-reports/ (3 files), ...`: the reports' folders one
    level below `.scratch/`."""
    folders = Counter(
        "/".join(rel.split("/")[:2]) + ("/" if rel.count("/") > 1 else "") for rel in reports
    )
    return ", ".join(f"{name} ({n} file{'' if n == 1 else 's'})" for name, n in sorted(folders.items()))


def describe(wt: Worktree, reason: str | None, show_files: bool) -> list[str]:
    head = wt.branch or f"detached at {wt.head[:9]}"
    lines = [str(wt.path)]
    if wt.prunable:
        lines.append(f"  {head}; folder missing")
    else:
        merged = f"merged into {INTEGRATION_BRANCH}" if wt.merged else f"not merged into {INTEGRATION_BRANCH}"
        lines.append(f"  {head}; {merged}; {'clean' if wt.clean else 'has changes'}")
        kinds = [k for k, on in (("main checkout", wt.is_main), (f"holds {INTEGRATION_BRANCH}", wt.holds_dev),
                                 ("T3 worktree", wt.t3), ("pair", wt.pair)) if on]
        if kinds:
            lines.append(f"  kind: {', '.join(kinds)}")
        lines.append(f"  reports: {report_summary(wt.reports) if wt.reports else 'none'}")
        if show_files:
            lines += [f"    {rel}" for rel in wt.reports]
    action = "archives its reports, then removes it" if wt.reports else "removes it"
    lines.append(f"  --remove: {'keeps it: ' + reason if reason else action}")
    return lines


def archive_problem(wt: Worktree, archive: Path) -> str | None:
    """Copy `wt`'s reports under `archive`; why the worktree must stay, or
    None when every report has an identical copy there."""
    dest_root = archive / wt.path.name
    for rel in wt.reports:
        src, dest = wt.path / rel, dest_root / rel
        if dest.exists():
            if dest.is_file() and filecmp.cmp(src, dest, shallow=False):
                continue
            return f"the archive already has a different {dest}; move one of them, then run this again"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        if not filecmp.cmp(src, dest, shallow=False):
            return f"the copy {dest} differs from {src}"
    return None


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--remove", action="store_true", help="archive reports, then remove each worktree the list says it removes")
    ap.add_argument("--include-t3", action="store_true", help="with --remove, treat T3's worktrees like the others")
    ap.add_argument("--files", action="store_true", help="list every report file")
    args = ap.parse_args(argv)

    cwd = Path.cwd()
    main_dir = worktree_pair.main_from_common_dir(git(cwd, "rev-parse", "--path-format=absolute", "--git-common-dir").strip())
    if main_dir is None:
        raise SystemExit("FAIL: cannot find the main checkout from git rev-parse --git-common-dir")
    main_path = Path(main_dir)
    if not git_ok(main_path, "show-ref", "--verify", "--quiet", f"refs/heads/{INTEGRATION_BRANCH}"):
        raise SystemExit(f"FAIL: no local branch {INTEGRATION_BRANCH}")
    here = Path(git(cwd, "rev-parse", "--show-toplevel").strip())
    entries = [e for e in worktree_pair.parse_worktrees(git(main_path, "worktree", "list", "--porcelain")) if "bare" not in e]
    worktrees = [read_worktree(e, main_path, here) for e in entries]

    archive = main_path / ARCHIVE_REL
    removable = 0
    failed = 0
    for wt in worktrees:
        reason = keep_reason(wt, args.include_t3)
        if args.remove and reason is None:
            reason = archive_problem(wt, archive)
        print("\n".join(describe(wt, reason, args.files)))
        if reason is not None:
            print()
            continue
        removable += 1
        if args.remove:
            r = subprocess.run(["git", "-C", str(main_path), "worktree", "remove", str(wt.path)], capture_output=True, text=True)
            if r.returncode == 0:
                print(f"  removed; reports kept in {archive / wt.path.name}" if wt.reports else "  removed")
            else:
                failed += 1
                print(f"  git worktree remove failed: {r.stderr.strip()}")
        print()
    verb = "removed" if args.remove else "--remove would remove"
    print(f"{verb} {removable - failed} of {len(worktrees)} worktrees" + (f"; {failed} failed" if failed else ""))
    if not args.remove and removable:
        print(f"reports would go to {archive}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
