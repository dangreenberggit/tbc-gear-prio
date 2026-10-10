#!/usr/bin/env python3
"""Checks for scripts/worktree_pair.py: no git, no writes outside
a temp dir.

Follows the check_lock_merge.py convention -- a standalone script of small
checks, not a pytest suite (this repo has no pytest infra). Most checks are
pure; the delete guard and the run-log copy run on real files in a temp dir,
because the guard's whole job is reading real links. The git and install
half of worktree_pair.py is tested by live pair/unpair runs, recorded in
docs/agents/paired-worktrees.md.

    python scripts/check_worktree_pair.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import worktree_pair as wp  # noqa: E402


def check_name_accepts_a_short_slug() -> list[str]:
    problems = []
    for name in ("tab-sort", "x", "fix-585", "a1"):
        if wp.name_problem(name) is not None:
            problems.append(f"name {name!r} must be accepted: {wp.name_problem(name)}")
    return problems


def check_name_refuses_paths_and_odd_characters() -> list[str]:
    """The name becomes a folder under the pair root, so a separator or `..`
    would place the pair somewhere else."""
    problems = []
    for name in ("", "../x", "a/b", "a\\b", "Tab", "-x", "x y", "x" * 24):
        if wp.name_problem(name) is None:
            problems.append(f"name {name!r} must be refused")
    return problems


def check_target_length_budget() -> list[str]:
    """The deepest file a pair holds sits 196 characters below its root
    (measured 2026-10-10 with the command in the comment above
    worktree_pair.PATH_LIMIT), and
    git cannot delete past Windows' 260-character limit. With the margin, a
    root of 55 characters fits and 56 does not. The default root
    C:\\Users\\dgree\\Code\\lulz\\tbc-wt\\ is 32 characters, which leaves 23
    for the name: the name limit."""
    problems = []
    fits = "C:\\" + "a" * 52
    too_long = "C:\\" + "a" * 53
    if wp.length_problem(fits) is not None:
        problems.append(f"a {len(fits)}-character root must fit")
    if wp.length_problem(too_long) is None:
        problems.append(f"a {len(too_long)}-character root must be refused")
    return problems


# Modelled on `git worktree list --porcelain` (git 2.42, Windows): one block
# per worktree, blank-line separated, forward-slash paths. The third block's
# HEAD and pid are made up.
PORCELAIN = """worktree C:/Users/dgree/Code/lulz/tbc-gear-prio
HEAD 35aa31df85299aa9018f1272feda22024a799789
branch refs/heads/dev

worktree C:/Users/dgree/Code/lulz/tbc-wt/tab-sort
HEAD 316326a95928bb441a94db1c21d1501b3b0c0726
detached

worktree C:/Users/dgree/Code/lulz/tbc-wt/other
HEAD 0b358d45aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
branch refs/heads/feat/sort
locked claude agent agent-a1 (pid 1)
"""


def check_branch_holder_names_the_worktree() -> list[str]:
    entries = wp.parse_worktrees(PORCELAIN)
    problems = []
    if wp.branch_holder("dev", entries) != "C:/Users/dgree/Code/lulz/tbc-gear-prio":
        problems.append("dev is held by the main checkout")
    if wp.branch_holder("feat/sort", entries) != "C:/Users/dgree/Code/lulz/tbc-wt/other":
        problems.append("feat/sort is held by tbc-wt/other (a locked block)")
    return problems


def check_branch_holder_is_none_for_a_free_branch() -> list[str]:
    """A detached worktree holds no branch, and a branch name must match whole:
    `sort` is not `feat/sort`."""
    entries = wp.parse_worktrees(PORCELAIN)
    problems = []
    for branch in ("sort", "feat/upgrades-tab-react", "de"):
        if wp.branch_holder(branch, entries) is not None:
            problems.append(f"{branch!r} is held by no worktree")
    return problems


def check_is_locked_reads_the_locked_line() -> list[str]:
    """Claude Code locks the worktrees it runs agents in; unpair checks this
    before removing either half, so a lock never leaves a half-removed pair."""
    entries = wp.parse_worktrees(PORCELAIN)
    problems = []
    if not wp.is_locked("C:\\Users\\dgree\\Code\\lulz\\tbc-wt\\other", entries):
        problems.append("tbc-wt/other has a locked line")
    if wp.is_locked("C:/Users/dgree/Code/lulz/tbc-wt/tab-sort", entries):
        problems.append("tbc-wt/tab-sort is not locked")
    return problems


def check_is_listed_ignores_slash_and_case_spelling() -> list[str]:
    """git prints `C:/Users/...`; Python builds `C:\\Users\\...`. Both name one
    folder on Windows, so the confirmation after unpair must not miss it."""
    entries = wp.parse_worktrees(PORCELAIN)
    problems = []
    if not wp.is_listed("c:\\users\\dgree\\Code\\lulz\\tbc-wt\\tab-sort", entries):
        problems.append("a backslash, lower-case spelling must match")
    if wp.is_listed("C:/Users/dgree/Code/lulz/tbc-wt/tab", entries):
        problems.append("a prefix of a listed path is not listed")
    return problems


def check_links_outside_finds_only_escaping_links() -> list[str]:
    """pnpm fills node_modules with junctions that stay inside the pair; a
    junction into the main checkout's vendor/ (the 558 layout, ticket 572)
    escapes it, and deleting through it deletes the main checkout's files."""
    root = "C:\\Users\\dgree\\Code\\lulz\\tbc-wt\\tab-sort"
    links = [
        (root + "\\node_modules\\react", "\\\\?\\" + root + "\\node_modules\\.pnpm\\react"),
        (root + "\\apps\\web\\node_modules\\core", "c:/users/dgree/code/lulz/tbc-wt/tab-sort/packages/core"),
        (root + "\\vendor\\atlasloot", "C:\\Users\\dgree\\Code\\lulz\\tbc-gear-prio\\vendor\\atlasloot"),
        (root + "\\vendor\\x", "C:\\Users\\dgree\\Code\\lulz\\tbc-wt\\tab-sort-2\\x"),
    ]
    got = [link for link, _ in wp.links_outside(root, links)]
    want = [root + "\\vendor\\atlasloot", root + "\\vendor\\x"]
    if got != want:
        return [f"links_outside gave {got}, want {want}"]
    return []


def check_long_path_prefixes_once() -> list[str]:
    problems = []
    got = wp.long_path("C:\\a\\b")
    if got != "\\\\?\\C:\\a\\b":
        problems.append(f"a plain absolute path gets the prefix, got {got!r}")
    if wp.long_path("\\\\?\\C:\\a") != "\\\\?\\C:\\a":
        problems.append("an already-prefixed path keeps one prefix")
    if wp.long_path("C:/a/b") != "\\\\?\\C:\\a\\b":
        problems.append("the prefix needs backslashes: forward slashes are not normalised under it")
    return problems


def check_node_version_floor() -> list[str]:
    """`pnpm install` refuses below 22.5 (engine-strict), and tool shells here
    often start on Node 20 (known-traps.md), so pair checks before it makes
    anything."""
    problems = []
    for text, ok in (
        ("v22.17.1\n", True),
        ("v22.5.0", True),
        ("v23.0.0", True),
        ("v22.4.9", False),
        ("v20.18.1", False),
        ("", False),
        ("garbage", False),
    ):
        if wp.node_ok(text) != ok:
            problems.append(f"node_ok({text!r}) must be {ok}")
    return problems


def check_main_checkout_comes_from_the_common_dir() -> list[str]:
    """Run from a pair, `--git-common-dir` still names the main checkout's
    `.git`, so the main checkout is its parent. Anything else (a bare repo, a
    separate git dir) is refused rather than guessed."""
    problems = []
    got = wp.main_from_common_dir("C:/Users/dgree/Code/lulz/tbc-gear-prio/.git")
    if got is None or not wp.same_path(got, "C:\\Users\\dgree\\Code\\lulz\\tbc-gear-prio"):
        problems.append(f"the parent of .git is the main checkout, got {got!r}")
    for odd in ("C:/repos/tbc.git", "C:/x/.git/worktrees/tab-sort", ""):
        if wp.main_from_common_dir(odd) is not None:
            problems.append(f"{odd!r} must be refused")
    return problems


def check_vendor_inputs_follow_the_engine_lock_tag() -> list[str]:
    """The binary folder is named from the lock's tag, as cli-wiring.ts
    resolveWowsimcli builds it."""
    got = wp.vendor_inputs("5262ff38", "win32-x64")
    want = ["atlasloot", "wowsims", "wowsimcli-5262ff38-win32-x64"]
    if got != want:
        return [f"vendor_inputs gave {got}, want {want}"]
    return []


def check_ignored_build_output_is_not_work() -> list[str]:
    """`git status --porcelain --ignored` in a fresh pair (2026-10-10) lists
    only installs and generated files; unpair may delete those freely."""
    lines = """!! apps/web/dist-server/
!! apps/web/node_modules/
!! apps/web/tsconfig.tsbuildinfo
!! node_modules/
!! packages/core/dist/
!! scripts/__pycache__/
!! vendor/
!! sim/core/proto/api.pb.go
!! ui/generated/proto/api.ts
!! ui/generated/proto/google/
!! ui/sim/wasm/bulk_sim/constants_auto_gen.ts
!! dist/
!! binary_dist/
!! .stylelintcache
!! sim/rogue/TestRogue.results.tmp
!! coverage/
!! .claude/settings.local.json
!! .scratch/agent-runs/
!! wowsimtbc.exe
"""
    got = wp.unexpected_ignored(lines)
    if got:
        return [f"build output must not count as work, got {got}"]
    return []


def check_scratch_counts_as_work_whatever_its_folder_names() -> list[str]:
    """A stage folder named `dist` or `vendor` is still a stage record: a
    build-output name only counts where installs and builds put it. The run
    log is the exception, because unpair copies it to the main checkout."""
    lines = """!! .scratch/dist/
!! .scratch/stage-gate/vendor/
!! .scratch/agent-runs/
!! docs/node_modules/
"""
    got = wp.unexpected_ignored(lines)
    want = [".scratch/dist/", ".scratch/stage-gate/vendor/", "docs/node_modules/"]
    if got != want:
        return [f"unexpected_ignored gave {got}, want {want}"]
    return []


def check_ignored_work_is_reported() -> list[str]:
    """`.scratch/` is ignored, and a session keeps stage records there; an
    unpair that deletes it unasked loses them."""
    lines = """!! node_modules/
!! .scratch/stage-gate/x/
!! .env
!! ui/features/upgrades/adapters/local.wcl-credentials.ts
!! wowsimtbc-notes.md
!! wowsimcli-scratch/
"""
    got = wp.unexpected_ignored(lines)
    want = [
        ".scratch/stage-gate/x/",
        ".env",
        "ui/features/upgrades/adapters/local.wcl-credentials.ts",
        # The fork ignores /wowsimtbc* and /wowsimcli*; only the built
        # binaries themselves are safe to delete.
        "wowsimtbc-notes.md",
        "wowsimcli-scratch/",
    ]
    if got != want:
        return [f"unexpected_ignored gave {got}, want {want}"]
    return []


def check_leftover_is_deleted_only_once_git_let_go() -> list[str]:
    """git refuses a locked worktree, or one that gained files, before it
    deletes anything, and keeps the registration. Deleting the folder then
    would override that refusal. A leftover that git has unregistered is what
    the fallback exists for."""
    problems = []
    cases = (
        # (still registered after git's attempt, folder exists) -> action
        ((False, False), "done"),
        ((False, True), "delete"),
        ((True, True), "refuse"),
        ((True, False), "done"),
    )
    for args, want in cases:
        got = wp.leftover_action(*args)
        if got != want:
            problems.append(f"leftover_action{args} gave {got!r}, want {want!r}")
    return problems


def link_dir(link: str, target: str) -> None:
    """A junction on Windows (no admin right needed), a symlink elsewhere."""
    if os.name == "nt":
        subprocess.run(["cmd", "/c", "mklink", "/J", link, target], capture_output=True, check=True)
    else:
        os.symlink(target, link, target_is_directory=True)


def unlink_dir(link: str) -> None:
    """Remove the link itself; rmdir on a junction never touches its target."""
    if os.name == "nt":
        subprocess.run(["cmd", "/c", "rmdir", link], capture_output=True)
    elif os.path.islink(link):
        os.unlink(link)


def check_delete_guard_on_real_links() -> list[str]:
    """find_links reads real links, one level deep and nested; links_outside
    keeps only the escaping one; delete_folder refuses that tree and leaves the
    linked folder's file alone, then deletes the tree once the escaping link
    is gone. Writes only to a temp dir."""
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        root = os.path.join(td, "pair")
        outside = os.path.join(td, "outside")
        os.makedirs(os.path.join(root, "a", "b"))
        os.makedirs(outside)
        keep = os.path.join(outside, "keep.txt")
        Path(keep).write_text("main checkout file", encoding="utf-8")
        out_link = os.path.join(root, "a", "b", "out")
        in_link = os.path.join(root, "in")
        try:
            link_dir(out_link, outside)
            link_dir(in_link, os.path.join(root, "a"))
            links = wp.find_links(Path(root))
            escaping = [wp.norm_path(link) for link, _ in wp.links_outside(root, links)]
            if len(links) != 2:
                problems.append(f"find_links found {len(links)} links, want 2: {links}")
            if escaping != [wp.norm_path(out_link)]:
                problems.append(f"escaping links {escaping}, want only {out_link}")
            try:
                wp.delete_folder(Path(root))
                problems.append("delete_folder must refuse a tree with a link out of it")
            except wp.Refusal:
                pass
            if not (os.path.isdir(root) and os.path.isfile(keep)):
                problems.append("a refused delete must leave the tree and the linked file")
            unlink_dir(out_link)
            wp.delete_folder(Path(root))
            if os.path.exists(root):
                problems.append("delete_folder must delete a tree whose links stay inside it")
            if not os.path.isfile(keep):
                problems.append("deleting the pair deleted a file outside it")
        except (OSError, subprocess.CalledProcessError, wp.Refusal) as exc:
            problems.append(f"delete guard check could not run: {exc!r}")
        finally:
            for link in (out_link, in_link):
                unlink_dir(link)
    return problems


def check_run_logs_are_kept_without_overwriting() -> list[str]:
    """unpair copies a pair's run logs into the main checkout before deleting
    the pair, and a name already there keeps its file. Temp dir only."""
    problems = []
    with tempfile.TemporaryDirectory() as td:
        pair, main = Path(td, "probe"), Path(td, "main")
        (pair / ".scratch" / "agent-runs").mkdir(parents=True)
        (main / ".scratch" / "agent-runs").mkdir(parents=True)
        (pair / ".scratch" / "agent-runs" / "s1.jsonl").write_text("pair s1", encoding="utf-8")
        (pair / ".scratch" / "agent-runs" / "s2.jsonl").write_text("pair s2", encoding="utf-8")
        (main / ".scratch" / "agent-runs" / "s1.jsonl").write_text("main s1", encoding="utf-8")
        (main / ".scratch" / "agent-runs" / "s1.pair-probe.jsonl").write_text(
            "earlier pair probe", encoding="utf-8"
        )
        (pair / ".scratch" / "agent-runs" / "sub").mkdir()
        (pair / ".scratch" / "agent-runs" / "sub" / "s3.jsonl").write_text("pair sub s3", encoding="utf-8")
        wp.keep_run_logs(pair, main)
        runs = main / ".scratch" / "agent-runs"
        want = {
            "s1.jsonl": "main s1",
            "s1.pair-probe.jsonl": "earlier pair probe",
            "s1.pair-probe-2.jsonl": "pair s1",
            "s2.jsonl": "pair s2",
            "sub/s3.jsonl": "pair sub s3",
        }

        def listing() -> dict[str, str]:
            return {
                p.relative_to(runs).as_posix(): p.read_text(encoding="utf-8")
                for p in runs.rglob("*")
                if p.is_file()
            }

        if listing() != want:
            problems.append(f"main run logs after keep_run_logs: {listing()}, want {want}")
        # A rerun after a refused unpair copies nothing twice.
        wp.keep_run_logs(pair, main)
        if listing() != want:
            problems.append(f"a second keep_run_logs changed the logs: {sorted(listing())}")
    return problems


def check_other_worktrees_inside_the_pair_are_found() -> list[str]:
    """A second fork worktree under the pair's vendor/ is found; a sibling
    pair whose name starts the same is not."""
    root = "C:/Users/dgree/Code/lulz/tbc-wt/tab-sort"
    entries = wp.parse_worktrees(
        f"""worktree {root}
HEAD 1

worktree {root}/vendor/tbc-new-fork
HEAD 2

worktree {root}/vendor/tbc-new-fork-b
HEAD 3
branch refs/heads/w/b

worktree C:/Users/dgree/Code/lulz/tbc-wt/tab-sort-2
HEAD 4
"""
    )
    got = wp.other_worktrees_inside(root, [root, root + "/vendor/tbc-new-fork"], entries)
    want = [root + "/vendor/tbc-new-fork-b"]
    if got != want:
        return [f"other_worktrees_inside gave {got}, want {want}"]
    return []


def check_unknown_vendor_folders_are_found() -> list[str]:
    """`git status --ignored` reports a pair's vendor/ as one line, so a folder
    someone added there (notes, a clone) is invisible to it."""
    names = ["atlasloot", "wowsims", "wowsimcli-5262ff38-win32-x64", "wowsimcli-v0.0.101-win32-x64",
             "tbc-new-fork", "my-notes", "tbc-new-fork-b"]
    got = wp.unknown_vendor_folders(names)
    if got != ["my-notes", "tbc-new-fork-b"]:
        return [f"unknown_vendor_folders gave {got}"]
    return []


def check_unsaved_work_on_a_real_repo() -> list[str]:
    """unsaved_work, the gate before every delete, on a real git repo in a
    temp dir: a folder added under the ignored vendor/ (A13) and an untracked
    file hidden by status.showUntrackedFiles=no (A14) both count as work."""
    problems = []
    with tempfile.TemporaryDirectory() as td:
        repo = Path(td, "pair")
        repo.mkdir()

        def git(*args: str) -> None:
            subprocess.run(
                ["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t", *args],
                capture_output=True,
                check=True,
            )

        git("init", "-q")
        (repo / ".gitignore").write_text("vendor/\n", encoding="utf-8")
        git("add", ".gitignore")
        git("commit", "-q", "-m", "init")
        (repo / "vendor" / "wowsims").mkdir(parents=True)
        if wp.unsaved_work(repo) is not None:
            problems.append(f"a clean pair with a known vendor/ folder has no work: {wp.unsaved_work(repo)}")
        (repo / "vendor" / "my-notes").mkdir()
        (repo / "vendor" / "my-notes" / "plan.md").write_text("notes", encoding="utf-8")
        found = wp.unsaved_work(repo) or ""
        if "vendor/my-notes/" not in found:
            problems.append(f"a folder added under vendor/ must count as work, got {found!r}")
        shutil.rmtree(repo / "vendor" / "my-notes")
        git("config", "status.showUntrackedFiles", "no")
        (repo / "work.txt").write_text("work", encoding="utf-8")
        found = wp.unsaved_work(repo) or ""
        if "work.txt" not in found:
            problems.append(f"showUntrackedFiles=no must not hide untracked work, got {found!r}")
    return problems


def check_disposable_names_match_whole_paths() -> list[str]:
    """A backup next to settings.local.json is the user's file, not Claude
    Code's."""
    got = wp.unexpected_ignored("!! .claude/settings.local.json.bak\n!! .claude/settings.local.json\n")
    if got != [".claude/settings.local.json.bak"]:
        return [f"unexpected_ignored gave {got}"]
    return []


CHECKS = (
    check_name_accepts_a_short_slug,
    check_name_refuses_paths_and_odd_characters,
    check_target_length_budget,
    check_branch_holder_names_the_worktree,
    check_branch_holder_is_none_for_a_free_branch,
    check_is_listed_ignores_slash_and_case_spelling,
    check_is_locked_reads_the_locked_line,
    check_links_outside_finds_only_escaping_links,
    check_long_path_prefixes_once,
    check_node_version_floor,
    check_main_checkout_comes_from_the_common_dir,
    check_vendor_inputs_follow_the_engine_lock_tag,
    check_ignored_build_output_is_not_work,
    check_ignored_work_is_reported,
    check_scratch_counts_as_work_whatever_its_folder_names,
    check_leftover_is_deleted_only_once_git_let_go,
    check_delete_guard_on_real_links,
    check_run_logs_are_kept_without_overwriting,
    check_other_worktrees_inside_the_pair_are_found,
    check_disposable_names_match_whole_paths,
    check_unknown_vendor_folders_are_found,
    check_unsaved_work_on_a_real_repo,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"worktree_pair.py checks ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
