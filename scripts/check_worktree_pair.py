#!/usr/bin/env python3
"""Pure-logic checks for scripts/worktree_pair.py: no git, no writes.

Follows the check_lock_merge.py convention -- a standalone script of small
checks, not a pytest suite (this repo has no pytest infra). The IO half of
worktree_pair.py (git, installs, deletes) is tested by a live pair/unpair
run, recorded in docs/agents/paired-worktrees.md.

    python scripts/check_worktree_pair.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import sys
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
    for name in ("", "../x", "a/b", "a\\b", "Tab", "-x", "x y", "x" * 25):
        if wp.name_problem(name) is None:
            problems.append(f"name {name!r} must be refused")
    return problems


def check_target_length_budget() -> list[str]:
    """The deepest file a pair holds sits 183 characters below its root
    (measured 2026-10-10), and git cannot delete past Windows' 260-character
    limit. A root of 68 characters fits; 69 does not."""
    problems = []
    fits = "C:\\" + "a" * 65
    too_long = "C:\\" + "a" * 66
    if wp.length_problem(fits) is not None:
        problems.append(f"a {len(fits)}-character root must fit")
    if wp.length_problem(too_long) is None:
        problems.append(f"a {len(too_long)}-character root must be refused")
    return problems


# Shape of `git worktree list --porcelain` from git 2.42 on Windows: one
# block per worktree, blank-line separated, forward-slash paths.
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


CHECKS = (
    check_name_accepts_a_short_slug,
    check_name_refuses_paths_and_odd_characters,
    check_target_length_budget,
    check_branch_holder_names_the_worktree,
    check_branch_holder_is_none_for_a_free_branch,
    check_is_listed_ignores_slash_and_case_spelling,
    check_links_outside_finds_only_escaping_links,
    check_long_path_prefixes_once,
    check_node_version_floor,
    check_main_checkout_comes_from_the_common_dir,
    check_vendor_inputs_follow_the_engine_lock_tag,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"worktree_pair.py pure logic ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
