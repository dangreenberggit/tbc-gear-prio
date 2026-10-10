#!/usr/bin/env python3
"""Make and remove a *pair*: a main-repo worktree with its own fork worktree.

Every script here finds the fork as `<repo root>/vendor/tbc-new-fork`, and
`vendor/` is gitignored, so a plain `git worktree add` gives a checkout with
no fork in it. Before this script, every session shared the one fork clone in
the main checkout, so only one fork branch could be worked on at a time. A
pair puts a fork worktree at `<pair>/vendor/tbc-new-fork`; every gate then
reads that pair's fork and that pair's lock, with no script edits. See
docs/agents/paired-worktrees.md.
"""

from __future__ import annotations

import re

NAME_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,23}")

# Windows' MAX_PATH is 260 including the terminating NUL. The deepest file a
# pair holds was 183 characters below its root on 2026-10-10 (main
# node_modules; the fork's node_modules reached 181). Past the limit,
# `git worktree remove` fails with "Filename too long" and leaves a
# half-deleted folder, as it did in the live test. The margin allows for a
# deeper dependency later.
PATH_LIMIT = 259
DEEPEST_BELOW_ROOT = 183
MARGIN = 7
MAX_ROOT_LEN = PATH_LIMIT - 1 - DEEPEST_BELOW_ROOT - MARGIN


def name_problem(name: str) -> str | None:
    """Why `name` cannot name a pair folder, or None when it can."""
    if not NAME_RE.fullmatch(name):
        return (
            f"pair name {name!r} must be 1-24 characters of a-z, 0-9 and '-', "
            "starting with a letter or digit"
        )
    return None


def parse_worktrees(porcelain: str) -> list[dict[str, str]]:
    """`git worktree list --porcelain` as one dict per worktree.

    Keys are the porcelain field names (`worktree`, `HEAD`, `branch`,
    `detached`, `locked`, ...); a bare flag maps to "".
    """
    entries: list[dict[str, str]] = []
    for block in porcelain.strip().split("\n\n"):
        entry: dict[str, str] = {}
        for line in block.splitlines():
            key, _, value = line.partition(" ")
            entry[key] = value
        if "worktree" in entry:
            entries.append(entry)
    return entries


def branch_holder(branch: str, entries: list[dict[str, str]]) -> str | None:
    """The path of the worktree that has `branch` checked out, if any."""
    for entry in entries:
        if entry.get("branch") == f"refs/heads/{branch}":
            return entry["worktree"]
    return None


def same_path(a: str, b: str) -> bool:
    return norm_path(a) == norm_path(b)


def norm_path(p: str) -> str:
    """One spelling per folder on Windows: no `\\\\?\\` prefix, backslashes,
    lower case, no trailing separator."""
    p = p.replace("/", "\\")
    if p.startswith("\\\\?\\"):
        p = p[4:]
    return p.rstrip("\\").lower()


def is_listed(path: str, entries: list[dict[str, str]]) -> bool:
    return any(same_path(path, e["worktree"]) for e in entries)


def links_outside(root: str, links: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """The (link, target) pairs whose target is not inside `root`."""
    base = norm_path(root) + "\\"
    return [(link, target) for link, target in links if not norm_path(target).startswith(base)]


def long_path(p: str) -> str:
    """`p` with the `\\\\?\\` prefix that lifts Windows' 260-character limit.

    Windows does not normalise a prefixed path, so slashes are turned into
    backslashes first.
    """
    p = p.replace("/", "\\")
    return p if p.startswith("\\\\?\\") else "\\\\?\\" + p


def node_ok(version_text: str) -> bool:
    """True when `node --version` output is at least 22.5 (package.json
    engines; `node:sqlite`)."""
    m = re.fullmatch(r"v(\d+)\.(\d+)\.\d+", version_text.strip())
    return bool(m) and (int(m[1]), int(m[2])) >= (22, 5)


def main_from_common_dir(common_dir: str) -> str | None:
    """The main checkout for a `git rev-parse --git-common-dir` answer.

    A worktree's common dir is the main checkout's `.git`, so its parent is
    the main checkout. Any other answer is a layout this script does not know.
    """
    p = common_dir.replace("\\", "/").rstrip("/")
    head, _, last = p.rpartition("/")
    if last != ".git" or not head:
        return None
    return head


def vendor_inputs(engine_tag: str, plat: str) -> list[str]:
    """The `vendor/` folders besides the fork that `pnpm verify` reads.

    `wowsimcli-<tag>-<plat>` is the binary folder packages/core/src/
    cli-wiring.ts resolveWowsimcli names from data/wowsims.lock.json.
    """
    return ["atlasloot", "wowsims", f"wowsimcli-{engine_tag}-{plat}"]


def length_problem(target: str) -> str | None:
    """Why `target` is too long a pair root, or None when it fits."""
    if len(target) > MAX_ROOT_LEN:
        return (
            f"pair path {target} is {len(target)} characters; the limit is "
            f"{MAX_ROOT_LEN}, because files sit up to {DEEPEST_BELOW_ROOT} "
            "characters below it and Windows paths stop at 260"
        )
    return None
