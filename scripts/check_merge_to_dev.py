#!/usr/bin/env python3
"""Checks for the pure logic in scripts/merge_to_dev.py, plus two on
throwaway git repos under the temp folder: one runs `has_changes`, and one
runs both forms of merge-to-dev with `--check-only --no-verify` (ticket 733).

Follows the check_worktree_pair.py convention -- a standalone script of
small checks, not a pytest suite (this repo has no pytest infra). The git
half of `pnpm merge-to-dev <branch>` is tested by live runs in a scratch
clone, recorded in docs/reviews/feat-merge-to-dev-arg.md.

    python scripts/check_merge_to_dev.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import merge_to_dev as m  # noqa: E402


def check_porcelain_reads_paths_and_rename_sources() -> list[str]:
    """`git status --porcelain -z` puts a rename's old path in its own
    NUL-separated field after the new one; both paths are dirty."""
    text = " M a.txt\0R  new.md\0old.md\0?? notes/x.md\0!! dist/y.js\0"
    got = m.parse_porcelain_z(text)
    want = [(" M", "a.txt"), ("R ", "new.md"), ("R ", "old.md"), ("??", "notes/x.md"), ("!!", "dist/y.js")]
    if got != want:
        return [f"parse_porcelain_z gave {got}, want {want}"]
    return []


def check_unrelated_dirty_files_do_not_block() -> list[str]:
    entries = [(" M", ".scratch/handoffs/note.md"), ("??", "scratch.txt")]
    got = m.merge_blockers(entries, {"scripts/merge_to_dev.py", "docs/x.md"})
    if got:
        return [f"unrelated dirty files must not block, got {got}"]
    return []


def check_dirty_file_the_merge_touches_blocks() -> list[str]:
    entries = [(" M", "docs/x.md"), ("??", "docs/new.md"), (" M", "other.md")]
    got = m.merge_blockers(entries, {"docs/x.md", "docs/new.md"})
    want = ["docs/x.md (modified, and the merge changes it)", "docs/new.md (untracked, and the merge writes it)"]
    if got != want:
        return [f"merge_blockers gave {got}, want {want}"]
    return []


def check_staged_change_blocks_anywhere() -> list[str]:
    """git merge refuses when the index differs from HEAD, and a merge
    commit would otherwise record the staged change too."""
    got = m.merge_blockers([("M ", "unrelated.md"), ("A ", "new.md")], {"docs/x.md"})
    want = ["unrelated.md (staged; the merge commit would record it)", "new.md (staged; the merge commit would record it)"]
    if got != want:
        return [f"merge_blockers gave {got}, want {want}"]
    return []


def check_ignored_files_never_block() -> list[str]:
    """git overwrites ignored files on merge, and today's clean check does
    not count them either."""
    got = m.merge_blockers([("!!", "dist/y.js")], {"dist/y.js"})
    if got:
        return [f"ignored files must not block, got {got}"]
    return []


def check_touched_paths_match_whatever_the_case() -> list[str]:
    """Windows checkouts are case-insensitive, so `Docs/X.md` dirty and
    `docs/x.md` merged are the same file. Refusing on a case variant is
    the safe side."""
    got = m.merge_blockers([(" M", "Docs/X.md")], {"docs/x.md"})
    if len(got) != 1:
        return [f"a case variant of a touched path must block, got {got}"]
    return []


def check_untracked_devices_are_not_work() -> list[str]:
    """The agent sandbox mounts /dev/null over denied paths that do not
    exist, and git lists each one as untracked (ticket 709). git cannot
    track a device, so the clean-tree checks must not count it; a tracked
    path that turned into a device is still a change."""
    devices = {".bashrc", ".claude/settings.local.json", "dev-typechange"}
    entries = [
        ("??", ".bashrc"),
        ("??", ".claude/settings.local.json"),
        ("??", "notes.md"),
        (" M", "a.txt"),
        (" T", "dev-typechange"),
    ]
    got = m.real_changes(entries, lambda p: p in devices)
    want = [("??", "notes.md"), (" M", "a.txt"), (" T", "dev-typechange")]
    if got != want:
        return [f"real_changes gave {got}, want {want}"]
    return []


def check_device_test_reads_the_file_type() -> list[str]:
    if os.name != "posix":
        return []
    problems = []
    if not m.is_device(Path("/dev/null")):
        problems.append("/dev/null must count as a device")
    if m.is_device(Path(__file__)):
        problems.append(f"{__file__} must not count as a device")
    if m.is_device(Path(__file__).with_name("no-such-file-709")):
        problems.append("a missing path must not count as a device")
    return problems


def check_empty_sandbox_stubs_are_not_work() -> list[str]:
    """Outside the sandbox its mount points are plain empty files, so the
    owner's terminal saw 17 of them as untracked (ticket 713). Only an
    empty file at a known stub path is skipped: a new empty file elsewhere,
    such as a `.gitkeep`, can be the change itself."""
    problems = []
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / ".claude").mkdir()
        (root / "docs").mkdir()
        (root / ".vscode").mkdir()
        for empty in (".bashrc", ".claude/settings.local.json", "docs/.gitkeep", "notes.md"):
            (root / empty).write_bytes(b"")
        (root / ".mcp.json").write_text("{}\n")
        want = {
            ".bashrc": True,
            ".claude/settings.local.json": True,
            "docs/.gitkeep": False,
            "notes.md": False,
            ".mcp.json": False,
            ".vscode": False,
            ".zshrc": False,
        }
        for rel, expected in want.items():
            got = m.holds_no_work(root, rel)
            if got != expected:
                problems.append(f"holds_no_work({rel!r}) gave {got}, want {expected}")
    if os.name == "posix" and not m.holds_no_work(Path("/"), "dev/null"):
        problems.append("a device must hold no work at any path (ticket 709)")
    return problems


def check_clean_tree_check_skips_stubs_in_a_real_repo() -> list[str]:
    """`has_changes` is what the merge runs, so drive it through git: the
    17 stubs alone are clean, and one more empty file is not.

    git hooks export GIT_DIR and friends, and `pnpm verify` runs from the
    pre-push hook; left set, they would point both this check's git calls
    and `has_changes` at the real checkout.
    """
    saved = {k: os.environ.pop(k) for k in list(os.environ) if k.startswith("GIT_")}
    try:
        return _stub_repo_problems()
    finally:
        os.environ.update(saved)


def _stub_repo_problems() -> list[str]:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / ".claude").mkdir()
        (root / ".claude" / "tracked.md").write_text("x\n")

        def git(*args: str) -> None:
            subprocess.run(
                ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
                cwd=root,
                check=True,
                capture_output=True,
            )

        git("init", "-q")
        git("add", ".")
        git("commit", "-q", "-m", "init")
        for stub in m.SANDBOX_STUBS:
            (root / stub).write_bytes(b"")
        if m.has_changes(root):
            return ["has_changes counts the 17 empty sandbox stubs as work"]
        (root / "notes.md").write_bytes(b"")
        if not m.has_changes(root):
            return ["has_changes skips an empty notes.md, which can be work"]
    return []


def check_named_merge_runs_only_on_dev() -> list[str]:
    problems = []
    if m.named_mode_problem("dev", "feat/x") is not None:
        problems.append(f"dev -> feat/x must be allowed: {m.named_mode_problem('dev', 'feat/x')}")
    for current, target in (("feat/y", "feat/x"), ("main", "feat/x"), ("dev", "dev"), ("dev", "main")):
        if m.named_mode_problem(current, target) is None:
            problems.append(f"{current} -> {target} must be refused")
    return problems


def check_gate_run_keeps_every_flag() -> list[str]:
    """The branch's checkout runs the gates, so each flag the owner gave
    must reach it; a real run asks for the gates without the merge, at the
    tip the caller will merge."""
    problems = []
    real = m.gate_argv(
        "py", "s.py", check_only=False, no_verify=True, ack_open_blockers=True, expect_head="abc123"
    )
    if real != ["py", "s.py", "--gates-only", "--expect-head", "abc123", "--no-verify", "--ack-open-blockers"]:
        problems.append(f"real run argv {real}")
    check = m.gate_argv(
        "py", "s.py", check_only=True, no_verify=False, ack_open_blockers=False, expect_head=None
    )
    if check != ["py", "s.py", "--check-only"]:
        problems.append(f"check-only argv {check}")
    return problems


# The scripts `merge_to_dev.py` imports, directly or through a sibling.
_GATE_SCRIPTS = (
    "merge_to_dev.py",
    "check_merge_ready.py",
    "check_layout_gate.py",
    "check_tab_fixtures.py",
    "worktree_pair.py",
)


def check_branch_cannot_exempt_itself_by_editing_the_gate() -> list[str]:
    """Ticket 733, on a throwaway repo: a branch adds `packages/` and
    `scripts/` to TOOLING_PATHS in its copy of check_merge_ready.py, takes
    that file and merge_to_dev.py off GATE_PATHS, and edits a product file, with no review file.
    Its own copy then needs no review file. Both forms of merge-to-dev must
    still refuse, because they also run dev's copy; with a review file, both
    pass. A second branch also makes its own merge_to_dev.py skip dev's
    copy: the named form, which is dev's merge_to_dev.py, must still refuse.
    The no-branch form runs that edited file, so nothing is asserted there."""
    here = Path(__file__).resolve().parent
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        main, wt, hooks = Path(tmp) / "main", Path(tmp) / "wt", Path(tmp) / "no-hooks"
        wt_door = Path(tmp) / "wt-door"
        hooks.mkdir()

        def git(cwd: Path, *args: str) -> None:
            subprocess.run(
                ["git", "-c", f"core.hooksPath={hooks.as_posix()}", "-c", "user.name=t",
                 "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *args],
                cwd=cwd, check=True, capture_output=True,
            )

        def run(cwd: Path, *argv: str) -> tuple[int, str]:
            out = subprocess.run(
                [sys.executable, *argv], cwd=cwd, capture_output=True, text=True,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )
            return out.returncode, out.stdout + out.stderr

        (main / "scripts").mkdir(parents=True)
        for name in _GATE_SCRIPTS:
            (main / "scripts" / name).write_bytes((here / name).read_bytes())
        (main / "packages").mkdir()
        (main / "packages" / "x.ts").write_text("export const x = 1;\n")
        (main / ".gitignore").write_text("__pycache__/\n")
        git(main, "init", "-q", "-b", "dev")
        git(main, "add", "-A")
        git(main, "commit", "-q", "-m", "base")
        branch = "chore/widen"
        git(main, "worktree", "add", "-q", "-b", branch, str(wt))

        gate = wt / "scripts" / "check_merge_ready.py"
        text = gate.read_text(encoding="utf-8")
        edited = text.replace(
            'TOOLING_PATHS = (\n', 'TOOLING_PATHS = (\n    "packages/",\n    "scripts/",\n', 1
        ).replace(
            'GATE_PATHS = (\n    "scripts/check_merge_ready.py",\n    "scripts/merge_to_dev.py",\n',
            "GATE_PATHS = (\n",
            1,
        )
        if edited.count('"packages/"') != text.count('"packages/"') + 1 or (
            edited.count('"scripts/merge_to_dev.py",') != text.count('"scripts/merge_to_dev.py",') - 1
        ):
            return ["test setup: could not edit TOOLING_PATHS and GATE_PATHS in the branch's copy"]
        gate.write_text(edited, encoding="utf-8", newline="")
        (wt / "packages" / "x.ts").write_text("export const x = 2;\n")
        git(wt, "commit", "-q", "-am", "widen")

        problems = []
        rc, out = run(wt, str(gate))
        if rc != 0 or "review not required" not in out:
            problems.append(f"test setup: the branch's own copy should exempt it; rc={rc} {out[-300:]!r}")
        forms = (
            ("named form", main, (str(main / "scripts" / "merge_to_dev.py"), branch)),
            ("no-branch form", wt, (str(wt / "scripts" / "merge_to_dev.py"),)),
        )
        for label, cwd, argv in forms:
            rc, out = run(cwd, *argv, "--check-only", "--no-verify")
            if rc == 0 or "missing review" not in out:
                problems.append(
                    f"{label} let a branch that edits the gate's lists skip its review: "
                    f"rc={rc} {out[-400:]!r}"
                )
        door = "chore/widen-door"
        git(main, "worktree", "add", "-q", "-b", door, str(wt_door), branch)
        own_door = wt_door / "scripts" / "merge_to_dev.py"
        own_door.write_text(
            own_door.read_text(encoding="utf-8").replace(
                '\nif __name__ == "__main__":',
                '\ndef dev_merge_ready(*args, **kwargs):\n    return 0\n\n\nif __name__ == "__main__":',
                1,
            ),
            encoding="utf-8", newline="",
        )
        git(wt_door, "commit", "-q", "-am", "skip dev's copy")
        rc, out = run(main, str(main / "scripts" / "merge_to_dev.py"), door, "--check-only", "--no-verify")
        if rc == 0 or "missing review" not in out:
            problems.append(
                f"named form let a branch whose own merge_to_dev.py skips dev's copy "
                f"skip its review: rc={rc} {out[-400:]!r}"
            )
        review = wt / "docs" / "reviews" / "chore-widen.md"
        review.parent.mkdir(parents=True)
        review.write_text("## Disposition\n\n| ID | Axis | Disposition | Ticket / note |\n| --- | --- | --- | --- |\n")
        git(wt, "add", "-A")
        git(wt, "commit", "-q", "-m", "review")
        for label, cwd, argv in forms:
            rc, out = run(cwd, *argv, "--check-only", "--no-verify")
            if rc != 0:
                problems.append(f"{label} refused the branch with its review file: rc={rc} {out[-400:]!r}")
        return problems


CHECKS = (
    check_branch_cannot_exempt_itself_by_editing_the_gate,
    check_named_merge_runs_only_on_dev,
    check_gate_run_keeps_every_flag,
    check_porcelain_reads_paths_and_rename_sources,
    check_unrelated_dirty_files_do_not_block,
    check_dirty_file_the_merge_touches_blocks,
    check_staged_change_blocks_anywhere,
    check_ignored_files_never_block,
    check_touched_paths_match_whatever_the_case,
    check_untracked_devices_are_not_work,
    check_device_test_reads_the_file_type,
    check_empty_sandbox_stubs_are_not_work,
    check_clean_tree_check_skips_stubs_in_a_real_repo,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"merge_to_dev.py checks ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
