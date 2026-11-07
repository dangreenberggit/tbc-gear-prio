#!/usr/bin/env python3
"""Checks for scripts/worktree_cleanup.py: the pure keep rule, then both
modes on a throwaway repo under the temp folder (ticket 835). Follows the
check_worktree_pair.py convention -- a standalone script of small checks,
not a pytest suite.

    python scripts/check_worktree_cleanup.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import worktree_cleanup as c  # noqa: E402

SCRIPT = Path(__file__).resolve().with_name("worktree_cleanup.py")


def _wt(**kw) -> c.Worktree:
    fields = dict(
        path=Path("/x/wt"), branch="feat/x", head="a" * 40, is_main=False, holds_dev=False,
        here=False, locked=False, prunable=False, t3=False, pair=False, merged=True,
        clean=True, reports=[], other_ignored=[],
    )
    fields.update(kw)
    return c.Worktree(**fields)


def check_keep_rule() -> list[str]:
    cases = (
        ("merged and clean", _wt(), False, None),
        ("main checkout", _wt(is_main=True), False, "main checkout"),
        ("holds dev", _wt(holds_dev=True, branch="dev"), False, "holds dev"),
        ("runs from it", _wt(here=True), False, "runs from"),
        ("folder missing", _wt(prunable=True), False, "folder is missing"),
        ("locked", _wt(locked=True), False, "locked"),
        ("T3 without the flag", _wt(t3=True), False, "T3"),
        ("T3 with the flag", _wt(t3=True), True, None),
        ("pair", _wt(pair=True), False, "wt:unpair"),
        ("not merged", _wt(merged=False), False, "not merged"),
        ("dirty", _wt(clean=False), False, "uncommitted"),
        ("other ignored files", _wt(other_ignored=[".env"]), False, ".env"),
        ("a session runs there", _wt(processes=["pid 7: claude"]), False, "pid 7"),
        ("processes cannot be listed", _wt(processes=None), False, "cannot list"),
        ("main checkout, even with the flag", _wt(is_main=True, t3=True), True, "main checkout"),
    )
    problems = []
    for label, wt, include_t3, want in cases:
        got = c.keep_reason(wt, include_t3)
        if (want is None) != (got is None) or (want and want not in got):
            problems.append(f"keep rule, {label}: got {got!r}, want {want!r}")
    return problems


def check_report_and_ignored_split() -> list[str]:
    """`.scratch/` files are reports; build output, run caches and empty
    sandbox stubs are not work; anything else ignored keeps the worktree."""
    listed = [
        ".scratch/agent-reports/r.md", ".scratch/x/.cc-writes/a", ".claude/.cc-writes/b",
        "node_modules/", "vendor/", "scripts/__pycache__/", "docs/x/__pycache__/",
        "packages/core/dist/", "apps/web/tsconfig.tsbuildinfo", ".env", ".claude/settings.local.json",
        ".scratch/inner/",
    ]
    reports, other = c.split_ignored(listed, is_empty=lambda rel: False)
    problems = []
    if reports != [".scratch/agent-reports/r.md"]:
        problems.append(f"reports: got {reports}")
    # `ls-files` lists a git repo nested under `.scratch/` as one folder
    # path; it is work the archive cannot copy.
    if other != [".env", ".scratch/inner/"]:
        problems.append(f"other ignored: got {other}")
    _, other = c.split_ignored([".gitmodules"], is_empty=lambda rel: True)
    if other:
        problems.append(f"an empty sandbox stub counted as work: {other}")
    return problems


def _env() -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env


class _Repo:
    """A throwaway main checkout on branch `home`, with `dev` held by a
    linked worktree, so the script must find dev's holder itself."""

    def __init__(self, tmp: Path) -> None:
        self.tmp = tmp
        self.main = tmp / "main"
        self.main.mkdir()
        self.write(self.main, ".gitignore", ".scratch/*\nvendor/\n.env\n__pycache__/\nnode_modules\n")
        self.write(self.main, "a.txt", "a\n")
        hooks = tmp / "no-hooks"
        hooks.mkdir()
        self.git(self.main, "init", "-q", "-b", "dev")
        for key, value in (
            ("core.hooksPath", hooks.as_posix()), ("user.name", "t"), ("user.email", "t@t"),
            ("commit.gpgsign", "false"),
        ):
            self.git(self.main, "config", key, value)
        self.git(self.main, "add", "-A")
        self.git(self.main, "commit", "-q", "-m", "base")
        self.git(self.main, "switch", "-q", "-c", "home")
        self.dev = self.add("wt-dev", "dev", new=False)

    def git(self, cwd: Path, *args: str) -> str:
        return subprocess.run(
            ["git", *args], cwd=cwd, check=True, capture_output=True, text=True, env=_env()
        ).stdout.strip()

    @staticmethod
    def write(cwd: Path, rel: str, text: str) -> None:
        path = cwd / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def add(self, rel: str, branch: str, new: bool = True) -> Path:
        path = self.tmp / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        args = ["-b", branch, str(path), "dev"] if new else [str(path), branch]
        self.git(self.main, "worktree", "add", "-q", *args)
        return path

    def run(self, *argv: str) -> tuple[int, str]:
        out = subprocess.run(
            [sys.executable, str(SCRIPT), *argv], cwd=self.main, capture_output=True,
            text=True, env=_env(),
        )
        return out.returncode, out.stdout + out.stderr

    def listed(self) -> list[str]:
        return [
            line.removeprefix("worktree ")
            for line in self.git(self.main, "worktree", "list", "--porcelain").splitlines()
            if line.startswith("worktree ")
        ]


def _build(tmp: Path) -> tuple[_Repo, dict[str, Path]]:
    r = _Repo(tmp)
    report = ".scratch/agent-reports/r.md"
    wts = {}
    wts["merged"] = r.add("merged", "feat/merged")
    r.write(wts["merged"], report, "merged report\n")
    # The 452 sessions linked the main checkout's node_modules into T3
    # worktrees; removing the worktree must not delete through the link.
    r.write(tmp, "shared/node_modules/keep.txt", "shared\n")
    (wts["merged"] / "node_modules").symlink_to(tmp / "shared" / "node_modules")
    wts["unmerged"] = r.add("unmerged", "feat/unmerged")
    r.write(wts["unmerged"], "b.txt", "b\n")
    r.git(wts["unmerged"], "add", "-A")
    r.git(wts["unmerged"], "commit", "-q", "-m", "work")
    wts["dirty"] = r.add("dirty", "feat/dirty")
    r.write(wts["dirty"], "untracked.txt", "x\n")
    wts["t3"] = r.add(".t3/worktrees/proj/t3-1", "t3/one")
    r.write(wts["t3"], report, "t3 report\n")
    wts["pair"] = r.add("tbc-wt/pair", "feat/pair")
    r.write(wts["pair"], "vendor/tbc-new-fork/README", "fork\n")
    wts["env"] = r.add("env", "feat/env")
    r.write(wts["env"], ".env", "SECRET_NAME=\n")
    # Two worktrees with one folder name: the second one's report would
    # overwrite the first one's in the archive.
    wts["same-a"] = r.add("a/same", "feat/same-a")
    r.write(wts["same-a"], report, "first\n")
    wts["same-b"] = r.add("b/same", "feat/same-b")
    r.write(wts["same-b"], report, "second\n")
    # Review finding A1: a repo nested under .scratch/ with uncommitted work.
    wts["nested"] = r.add("nested", "feat/nested")
    r.write(wts["nested"], ".scratch/inner/work.txt", "uncommitted\n")
    r.git(wts["nested"] / ".scratch" / "inner", "init", "-q")
    # Review finding A3: a folder under vendor/ that pair setup does not make.
    wts["vendor"] = r.add("vendor-work", "feat/vendor")
    r.write(wts["vendor"], "vendor/mywork/notes.txt", "notes\n")
    r.write(wts["vendor"], "vendor/wowsims/x.json", "{}\n")
    # Review finding A2: a session still runs there.
    wts["busy"] = r.add("busy", "feat/busy")
    return r, wts


def check_list_mode_changes_nothing() -> list[str]:
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        r, wts = _build(Path(tmp))
        before = r.listed()
        rc, out = r.run()
        problems = [] if rc == 0 else [f"list mode: rc={rc} {out[-400:]!r}"]
        if r.listed() != before or (r.main / ".scratch" / "worktree-archive").exists():
            problems.append("list mode removed a worktree or wrote the archive")
        for want in (
            str(wts["merged"]), "feat/merged", "not merged", "has changes", "holds dev",
            "T3 worktree", ".scratch/agent-reports/ (1 file)", "main checkout",
        ):
            if want not in out:
                problems.append(f"list mode output lacks {want!r}: {out[-600:]!r}")
        return problems


def check_remove_mode_keeps_all_but_clean_merged() -> list[str]:
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        r, wts = _build(Path(tmp))
        session = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(120)"], cwd=wts["busy"])
        try:
            rc, out = r.run("--remove")
        finally:
            session.kill()
            session.wait()
        problems = [] if rc == 0 else [f"remove mode: rc={rc} {out[-600:]!r}"]
        listed = r.listed()
        gone = {"merged", "same-a"}
        for name, path in wts.items():
            if (str(path) in listed) == (name in gone):
                problems.append(f"remove mode: {name} {'kept' if name in gone else 'removed'}: {out[-600:]!r}")
        for path in (r.main, r.dev):
            if str(path) not in listed:
                problems.append(f"remove mode removed {path}")
        archive = r.main / ".scratch" / "worktree-archive"
        for rel, text in (
            ("merged/.scratch/agent-reports/r.md", "merged report\n"),
            ("same/.scratch/agent-reports/r.md", "first\n"),
        ):
            got = (archive / rel).read_text(encoding="utf-8") if (archive / rel).is_file() else None
            if got != text:
                problems.append(f"archive {rel}: got {got!r}, want {text!r}")
        if not (r.tmp / "shared" / "node_modules" / "keep.txt").is_file():
            problems.append("removing a worktree deleted the target of its node_modules link")
        if (archive / "t3-1").exists():
            problems.append("remove mode archived a T3 worktree it keeps")
        if not (wts["nested"] / ".scratch" / "inner" / "work.txt").is_file():
            problems.append("remove mode deleted a repo nested under .scratch/")
        if "running process" not in out:
            problems.append(f"remove mode did not say why it kept busy: {out[-600:]!r}")
        if "archive already has" not in out:
            problems.append(f"remove mode did not say why it kept b/same: {out[-600:]!r}")
        rc, out = r.run("--remove", "--include-t3")
        if str(wts["t3"]) in r.listed():
            problems.append(f"--include-t3 kept the T3 worktree: {out[-400:]!r}")
        got = archive / "t3-1" / ".scratch" / "agent-reports" / "r.md"
        if not got.is_file() or got.read_text(encoding="utf-8") != "t3 report\n":
            problems.append("--include-t3 did not archive the T3 worktree's report")
        return problems


CHECKS = (
    check_keep_rule,
    check_report_and_ignored_split,
    check_list_mode_changes_nothing,
    check_remove_mode_keeps_all_but_clean_merged,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"worktree_cleanup.py checks ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
