#!/usr/bin/env python3
"""Checks for the pure logic in scripts/merge_to_dev.py, plus checks on
throwaway git repos under the temp folder: one runs `has_changes`, and the
`_Scratch` ones run both forms of merge-to-dev with `--no-verify` (ticket 733).

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
                env=_scratch_env(),
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
_EMPTY_REVIEW = "## Disposition\n\n| ID | Axis | Disposition | Ticket / note |\n| --- | --- | --- | --- |\n"


def _scratch_env() -> dict[str, str]:
    """The environment for git and the gate scripts in a throwaway repo.
    `pnpm verify` runs from the pre-push hook, whose GIT_DIR and friends
    would point git at the real checkout."""
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env


class _Scratch:
    """A throwaway repo whose `main` folder has `dev` checked out, with this
    folder's gate scripts and `packages/x.ts`. Its config turns hooks off and
    sets an identity, so the gate scripts' own git calls work in it too."""

    def __init__(self, tmp: Path) -> None:
        self.tmp = tmp
        self.main = tmp / "main"
        here = Path(__file__).resolve().parent
        for name in _GATE_SCRIPTS:
            self.write(self.main, f"scripts/{name}", (here / name).read_text(encoding="utf-8"))
        self.write(self.main, "packages/x.ts", "export const x = 1;\n")
        self.write(self.main, ".gitignore", "__pycache__/\n")
        self.git(self.main, "init", "-q", "-b", "dev")
        hooks = tmp / "no-hooks"
        hooks.mkdir()
        for key, value in (
            ("core.hooksPath", hooks.as_posix()),
            ("user.name", "t"),
            ("user.email", "t@t"),
            ("commit.gpgsign", "false"),
        ):
            self.git(self.main, "config", key, value)
        self.commit(self.main, "base")

    def git(self, cwd: Path, *args: str) -> str:
        return subprocess.run(
            ["git", *args], cwd=cwd, check=True, capture_output=True, text=True,
            env=_scratch_env(),
        ).stdout.strip()

    @staticmethod
    def write(cwd: Path, rel: str, text: str) -> None:
        path = cwd / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="")

    def commit(self, cwd: Path, message: str) -> None:
        self.git(cwd, "add", "-A")
        self.git(cwd, "commit", "-q", "-m", message)

    def branch(self, name: str, start: str = "dev") -> Path:
        """A worktree with new branch `name` checked out."""
        wt = self.tmp / name.replace("/", "-")
        self.git(self.main, "worktree", "add", "-q", "-b", name, str(wt), start)
        return wt

    def merge_to_dev(self, cwd: Path, *argv: str) -> tuple[int, str]:
        """Run the copy of merge_to_dev.py in `cwd` with --no-verify."""
        out = subprocess.run(
            [sys.executable, str(cwd / "scripts" / "merge_to_dev.py"), *argv, "--no-verify"],
            cwd=cwd, capture_output=True, text=True, env=_scratch_env(),
        )
        return out.returncode, out.stdout + out.stderr

    def widen_the_gate(self, wt: Path) -> None:
        """Edit `wt`'s copy of check_merge_ready.py so that a branch changing
        `packages/` and `scripts/` needs no review file: both go on
        TOOLING_PATHS, and check_merge_ready.py and merge_to_dev.py come off
        GATE_PATHS."""
        gate = wt / "scripts" / "check_merge_ready.py"
        text = gate.read_text(encoding="utf-8")
        edited = text.replace(
            "TOOLING_PATHS = (\n", 'TOOLING_PATHS = (\n    "packages/",\n    "scripts/",\n', 1
        ).replace(
            'GATE_PATHS = (\n    "scripts/check_merge_ready.py",\n    "scripts/merge_to_dev.py",\n',
            "GATE_PATHS = (\n",
            1,
        )
        if edited.count('"packages/"') != text.count('"packages/"') + 1 or (
            edited.count('"scripts/merge_to_dev.py",') != text.count('"scripts/merge_to_dev.py",') - 1
        ):
            raise AssertionError("test setup: TOOLING_PATHS or GATE_PATHS has moved")
        self.write(wt, "scripts/check_merge_ready.py", edited)

    def skip_devs_copy(self, wt: Path) -> None:
        """Edit `wt`'s copy of merge_to_dev.py so it never runs dev's copy."""
        own = (wt / "scripts" / "merge_to_dev.py").read_text(encoding="utf-8")
        stub = '\ndef merge_ready_at(*args, **kwargs):\n    return 0\n\n\nif __name__ == "__main__":'
        self.write(wt, "scripts/merge_to_dev.py", own.replace('\nif __name__ == "__main__":', stub, 1))


def _refused(label: str, rc: int, out: str, want: str) -> list[str]:
    if rc != 0 and want in out:
        return []
    return [f"{label}: want a refusal naming {want!r}; rc={rc} {out[-400:]!r}"]


def _passed(label: str, rc: int, out: str) -> list[str]:
    return [] if rc == 0 else [f"{label}: want rc 0; rc={rc} {out[-400:]!r}"]


def check_branch_cannot_exempt_itself_by_editing_the_gate() -> list[str]:
    """Ticket 733: a branch widens its copy of the gate (`widen_the_gate`)
    and edits a product file, with no review file. Its own copy then needs
    no review file; both forms of merge-to-dev must still refuse, because
    they also run dev's copy. A second branch also makes its own
    merge_to_dev.py skip dev's copy: the named form, which is dev's
    merge_to_dev.py, must still refuse it. The no-branch form runs that
    edited file, so nothing is asserted there. With a review file, both
    forms pass."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        s = _Scratch(Path(tmp))
        wt = s.branch("chore/widen")
        s.widen_the_gate(wt)
        s.write(wt, "packages/x.ts", "export const x = 2;\n")
        s.commit(wt, "widen")
        out = subprocess.run(
            [sys.executable, str(wt / "scripts" / "check_merge_ready.py")],
            cwd=wt, capture_output=True, text=True, env=_scratch_env(),
        )
        if out.returncode != 0 or "review not required" not in out.stdout:
            return [f"test setup: the branch's own copy should exempt it: {out.stdout[-300:]!r}"]
        problems = []
        forms = (("named form", s.main, ("chore/widen",)), ("no-branch form", wt, ()))
        for label, cwd, argv in forms:
            rc, out = s.merge_to_dev(cwd, *argv, "--check-only")
            problems += _refused(label, rc, out, "missing review")
        door = s.branch("chore/widen-door", "chore/widen")
        s.skip_devs_copy(door)
        s.commit(door, "skip dev's copy")
        rc, out = s.merge_to_dev(s.main, "chore/widen-door", "--check-only")
        problems += _refused("named form, own merge_to_dev.py edited", rc, out, "missing review")
        s.write(wt, "docs/reviews/chore-widen.md", _EMPTY_REVIEW)
        s.commit(wt, "review")
        for label, cwd, argv in forms:
            rc, out = s.merge_to_dev(cwd, *argv, "--check-only")
            problems += _passed(f"{label} with its review file", rc, out)
        return problems


def check_real_named_run_runs_devs_copy_after_merging_dev() -> list[str]:
    """A real named run, with dev ahead of the branch, so it first merges dev
    into the branch. The branch widens its gate and skips dev's copy in its
    own merge_to_dev.py, so only the caller's call to dev's copy can refuse
    it. Refused with no review file and dev not moved; merged with one."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        s = _Scratch(Path(tmp))
        wt = s.branch("chore/door")
        s.widen_the_gate(wt)
        s.skip_devs_copy(wt)
        s.write(wt, "packages/x.ts", "export const x = 2;\n")
        s.commit(wt, "widen and skip dev's copy")
        s.write(s.main, "packages/y.ts", "export const y = 1;\n")
        s.commit(s.main, "dev moves on")
        dev_before = s.git(s.main, "rev-parse", "refs/heads/dev")
        rc, out = s.merge_to_dev(s.main, "chore/door")
        problems = _refused("real named run, no review file", rc, out, "missing review")
        if s.git(s.main, "rev-parse", "refs/heads/dev") != dev_before:
            problems.append("a refused real named run moved dev")
        s.write(wt, "docs/reviews/chore-door.md", _EMPTY_REVIEW)
        s.commit(wt, "review")
        rc, out = s.merge_to_dev(s.main, "chore/door")
        problems += _passed("real named run with its review file", rc, out)
        if s.git(s.main, "rev-parse", "dev^{tree}") != s.git(s.main, "rev-parse", "chore/door^{tree}"):
            problems.append("after a real named run, dev's tree is not the branch's")
        return problems


def check_ack_open_blockers_reaches_devs_copy() -> list[str]:
    """On phase-9/x with an open `Blocks: phase-9` ticket, the named form
    refuses without --ack-open-blockers and passes with it, so the flag
    reaches dev's copy as well as the branch's."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        s = _Scratch(Path(tmp))
        s.write(s.main, ".scratch/carry-forward/issues/1-t.md", "Status: open\nBlocks: phase-9\n\n# t\n")
        s.commit(s.main, "ticket")
        wt = s.branch("phase-9/x")
        s.write(wt, "packages/x.ts", "export const x = 2;\n")
        s.write(wt, "docs/reviews/phase-9-x.md", _EMPTY_REVIEW)
        s.commit(wt, "work")
        rc, out = s.merge_to_dev(s.main, "phase-9/x", "--check-only")
        problems = _refused("named form without --ack-open-blockers", rc, out, "Blocks: phase-9")
        rc, out = s.merge_to_dev(s.main, "phase-9/x", "--check-only", "--ack-open-blockers")
        return problems + _passed("named form with --ack-open-blockers", rc, out)


def check_a_tag_named_dev_does_not_move_the_merge_base() -> list[str]:
    """A tag named `dev` at the branch's product commit would make
    `git merge-base dev <branch>` start after it, leaving only a tooling
    commit to judge. Both forms must still see the product file."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        s = _Scratch(Path(tmp))
        wt = s.branch("chore/tag")
        s.write(wt, "packages/x.ts", "export const x = 2;\n")
        s.commit(wt, "product")
        s.git(wt, "tag", "dev")
        s.write(wt, "docs/agents/foo.md", "tooling\n")
        s.commit(wt, "tooling")
        problems = []
        for label, cwd, argv in (("named form", s.main, ("chore/tag",)), ("no-branch form", wt, ())):
            rc, out = s.merge_to_dev(cwd, *argv, "--check-only")
            problems += _refused(f"{label} with a tag named dev", rc, out, "missing review")
        return problems


def check_an_ignored_review_file_does_not_count() -> list[str]:
    """A review file that an ignore rule hides from git is on disk but would
    not be merged, so a real named run must refuse and leave dev alone."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        s = _Scratch(Path(tmp))
        wt = s.branch("chore/ignored")
        s.write(wt, "packages/x.ts", "export const x = 2;\n")
        s.commit(wt, "product")
        exclude = Path(s.git(s.main, "rev-parse", "--git-common-dir"))
        exclude = (exclude if exclude.is_absolute() else s.main / exclude) / "info" / "exclude"
        exclude.parent.mkdir(parents=True, exist_ok=True)
        exclude.write_text("docs/reviews/\n", encoding="utf-8")
        s.write(wt, "docs/reviews/chore-ignored.md", _EMPTY_REVIEW)
        dev_before = s.git(s.main, "rev-parse", "refs/heads/dev")
        rc, out = s.merge_to_dev(s.main, "chore/ignored")
        problems = _refused("real named run with an ignored review file", rc, out, "ignored by git")
        if s.git(s.main, "rev-parse", "refs/heads/dev") != dev_before:
            problems.append("a refused real named run moved dev")
        return problems


CHECKS = (
    check_branch_cannot_exempt_itself_by_editing_the_gate,
    check_real_named_run_runs_devs_copy_after_merging_dev,
    check_ack_open_blockers_reaches_devs_copy,
    check_a_tag_named_dev_does_not_move_the_merge_base,
    check_an_ignored_review_file_does_not_count,
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
