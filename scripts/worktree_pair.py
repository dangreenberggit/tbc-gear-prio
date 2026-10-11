#!/usr/bin/env python3
"""Make and remove a *pair*: a main-repo worktree with its own fork worktree.

Every script here finds the fork as `<repo root>/vendor/tbc-new-fork`, and
`vendor/` is gitignored, so a plain `git worktree add` gives a checkout with
no fork in it. Before this script, every session shared the one fork clone in
the main checkout, so only one fork branch could be worked on at a time. A
pair puts a fork worktree at `<pair>/vendor/tbc-new-fork`; every gate then
reads that pair's fork and that pair's lock, with no script edits. See
docs/agents/paired-worktrees.md.

    pnpm wt:pair <name> <main-branch> <fork-branch> [-b] [--base REF]
                 [--new-fork-branch] [--build]
    pnpm wt:pair <name> <main-branch> --fork-detached [-b] [--build]
    pnpm wt:unpair <name> [--force]

The pair goes to `<parent of the main checkout>/tbc-wt/<name>`: outside the
repo, so the main checkout's git status, eslint and prettier never see it,
and short, so its deepest file stays under Windows' path limit.

`-b` creates <main-branch> from --base (default `dev`); without it the branch
must already exist. `--new-fork-branch` creates <fork-branch> at the commit
the pair's fork lock pins; without it the fork branch must already exist.
`--fork-detached` checks the fork out at that commit with no branch, for
main-only work.

The main checkout and its fork clone are found from `git rev-parse
--git-common-dir`, so the commands work the same when run from inside a
pair. `vendor/` inputs are copied from the main checkout, never linked: a
junction into the main checkout makes any recursive delete in the pair
delete the main checkout's files (ticket 572).
"""

from __future__ import annotations

import argparse
import filecmp
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import TypedDict

# 23 characters: what the default pair root leaves under MAX_ROOT_LEN.
NAME_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,22}")

# Windows' MAX_PATH is 260 including the terminating NUL. The deepest file a
# pair holds was 196 characters below its root on 2026-10-10, in the main
# worktree's node_modules (the fork's reached 181). Past the limit,
# `git worktree remove` fails with "Filename too long" and leaves a
# half-deleted folder, as it did in a scratch test. The margin allows for a
# deeper dependency later. Re-measure from a pair's root in Git Bash:
#   find node_modules vendor/tbc-new-fork/node_modules -printf '%p\n' |
#     awk '{ if (length($0) > m) m = length($0) } END { print m }'
PATH_LIMIT = 259
DEEPEST_BELOW_ROOT = 196
MARGIN = 7
MAX_ROOT_LEN = PATH_LIMIT - 1 - DEEPEST_BELOW_ROOT - MARGIN


def name_problem(name: str) -> str | None:
    """Why `name` cannot name a pair folder, or None when it can."""
    if not NAME_RE.fullmatch(name):
        return (
            f"pair name {name!r} must be 1-23 characters of a-z, 0-9 and '-', "
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


def is_locked(path: str, entries: list[dict[str, str]]) -> bool:
    return any(same_path(path, e["worktree"]) and "locked" in e for e in entries)


def leftover_action(still_registered: bool, exists: bool) -> str:
    """What unpair does with a folder after `git worktree remove` ran.

    "refuse" while git still registers it: git refused before deleting
    anything (a locked worktree, or files that appeared after the clean-tree
    check), and deleting the folder would override that, `--force` or not.
    "delete" once git has let go of a folder it left behind. Callers reach
    this for an unregistered folder only after unregistered_problem allowed it.
    """
    if not exists:
        return "done"
    if still_registered:
        return "refuse"
    return "delete"


def unregistered_problem(path: str, repo: str, force: bool, started: bool, own_repo: bool) -> str | None:
    """Why unpair must not delete a folder at a pair path that git does not
    register, or None when it may.

    git checks no work in a folder it does not register. `started` means an
    earlier unpair of this pair ran its work checks, wrote its mark, and then
    stopped part-way after git had dropped a registration, as when a locked
    file stops the delete. The folder is then what that run was removing, so
    a rerun finishes it without --force. `own_repo` means the folder holds a
    `.git` folder: a separate clone, never what is left of a worktree (a
    worktree's `.git` is a file), so the mark does not cover it.
    """
    if force:
        return None
    if own_repo:
        return (
            f"{path} is not a worktree of {repo} but holds its own .git folder, so it is a separate "
            "repository whose work cannot be checked. Move it away, or rerun with --force to delete it"
        )
    if started:
        return None
    return (
        f"{path} is not a worktree of {repo}, and no earlier unpair of this pair started removing it, "
        "so its work cannot be checked. If it is what is left of a pair, rerun with --force to delete it"
    )


def mark_still_needed(halves: list[tuple[bool, bool]]) -> bool:
    """Whether a failed unpair keeps its mark, from (exists, registered) for
    each half after the failure.

    The mark lets a rerun delete a half that git no longer registers. When
    every half that is still there is still registered, the rerun checks them
    all again, so the mark is cleared: a mark left by a run that removed
    nothing would let a later rerun delete an unregistered folder unchecked.
    """
    return any(exists and not registered for exists, registered in halves)


GIT_BASH_DRIVE = re.compile(r"(?<![\w:/\\])/([a-z])/")


class ProcessRow(TypedDict, total=False):
    """A Get-CimInstance Win32_Process row as running_processes reads it.
    Windows leaves some fields empty (System has no program path), so any
    field may be missing or None."""

    ProcessId: int
    ParentProcessId: int
    Name: str
    ExecutablePath: str | None
    CommandLine: str | None
    Created: int | None


def processes_using(root: str, procs: list[ProcessRow], own_pid: int) -> list[ProcessRow]:
    """The processes that may hold files under `root` open.

    `procs` are Get-CimInstance Win32_Process rows. A process counts when its
    program sits under `root` (tsc.exe in node_modules, the backend) or its
    command line names `root`, in Windows or Git Bash (`/c/...`) spelling.
    This run and the processes that started it are left out: their command
    lines may name the pair without using it. A parent counts as a starter
    only when it was created before its child, because Windows reuses the id
    of a process that has exited. Missed: a process whose current folder is
    inside `root` and whose command line does not name it, a path in 8.3
    short form, and, seen from a shell that is not elevated, an elevated
    process, whose program and command line read as empty (hypothesis,
    untested). The rerun after a failed delete covers what is missed.
    """
    by_pid = {p["ProcessId"]: p for p in procs}
    own: set[int] = set()
    pid: int | None = own_pid
    while pid is not None and pid not in own:
        own.add(pid)
        child = by_pid.get(pid)
        parent_pid = child.get("ParentProcessId") if child else None
        parent = by_pid.get(parent_pid)
        if parent and parent.get("Created") is not None and child.get("Created") is not None:
            if parent["Created"] > child["Created"]:
                break
        pid = parent_pid
    names_root = re.compile(re.escape(norm_path(root)) + r"(?=[\\\"'\s]|$)")
    found = []
    for p in procs:
        if p["ProcessId"] in own:
            continue
        exe_path = p.get("ExecutablePath") or ""
        cmd = GIT_BASH_DRIVE.sub(r"\1:/", (p.get("CommandLine") or "").lower())
        cmd = re.sub(r"\\+", r"\\", cmd.replace("/", "\\"))
        if (exe_path and is_inside(exe_path, root)) or names_root.search(cmd):
            found.append(p)
    return found


def describe_processes(procs: list[ProcessRow]) -> str:
    """Shows the name when the program path is empty, as it is for System
    and, seen from a shell that is not elevated, for an elevated process
    (hypothesis, untested)."""
    return "\n".join(
        f"  pid {p['ProcessId']} {p.get('ExecutablePath') or p.get('Name')}: {p.get('CommandLine') or ''}"
        for p in procs
    )


def is_inside(path: str, root: str) -> bool:
    """True when `path` is `root` or a path below it."""
    return (norm_path(path) + "\\").startswith(norm_path(root) + "\\")


def links_outside(root: str, links: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """The (link, target) pairs whose target is not inside `root`."""
    return [(link, target) for link, target in links if not is_inside(target, root)]


# What a pair's installs, builds and sessions write: ignored, and safe for
# unpair to delete. Taken from `git status --porcelain --ignored` in both
# worktrees of a fresh pair on 2026-10-10, the fork's .gitignore build
# entries, and `coverage/` (vitest's report folder). A folder name counts only
# at the top level or one package down (apps/web/, packages/core/), where
# installs and builds put it.
DISPOSABLE_DIRS = {"node_modules", "dist", "dist-server", "binary_dist", "__pycache__", "vendor", "coverage"}
DISPOSABLE_SUFFIXES = (".tsbuildinfo", ".pb.go", "_auto_gen.ts", ".results.tmp", ".stylelintcache")
DISPOSABLE_PREFIXES = ("ui/generated/", "scripts/__pycache__/")
PACKAGE_DIRS = ("apps", "packages")
RUN_LOGS = ".scratch/agent-runs"
# The run logs are copied to the main checkout before the pair is removed
# (keep_run_logs). Claude Code saves a worktree session's permission
# approvals in settings.local.json (code.claude.com/docs/en/worktrees, "What
# worktrees share with the main checkout"); other keys a user put there by
# hand would be lost too (hypothesis, untested).
# wowsimtbc.exe / wowsimtbc: the backend binary that launch.json's
# `wowsims-backend` entry and the makefile's `devserver` target build in the
# fork root (`go build -o wowsimtbc$(BIN_EXT)`); seen in a pair 2026-10-10.
# Exact names, because the fork ignores all of `/wowsimtbc*`, so a prefix
# match would also delete a user's `wowsimtbc-notes.md`.
DISPOSABLE_FILES = {".claude/settings.local.json", "wowsimtbc.exe", "wowsimtbc"}


def is_disposable(path: str) -> bool:
    if path in DISPOSABLE_FILES or path.startswith(DISPOSABLE_PREFIXES + (RUN_LOGS + "/",)):
        return True
    if path.startswith(".scratch/"):
        return False
    parts = path.rstrip("/").split("/")
    if parts[-1] in DISPOSABLE_DIRS:
        return len(parts) == 1 or (len(parts) == 3 and parts[0] in PACKAGE_DIRS)
    return path.endswith(DISPOSABLE_SUFFIXES)


def unexpected_ignored(porcelain_ignored: str) -> list[str]:
    """Ignored paths from `git status --porcelain --ignored` that a pair's own
    setup did not write. `git status --porcelain` alone never lists them, and
    `.scratch/` (stage records) is one of them."""
    return [
        line[3:]
        for line in porcelain_ignored.splitlines()
        if line.startswith("!! ") and not is_disposable(line[3:])
    ]


def unknown_vendor_folders(names: list[str]) -> list[str]:
    """Folders in a pair's vendor/ that pair setup did not put there.

    `git status --ignored` reports vendor/ as one line, so the work check
    cannot see a folder someone added (notes, a clone). Setup puts in the
    fork worktree, atlasloot, wowsims and one wowsimcli-<tag>-<platform>.
    """
    known = {"tbc-new-fork", "atlasloot", "wowsims"}
    return [n for n in names if n not in known and not n.startswith("wowsimcli-")]


def other_worktrees_inside(root: str, own: list[str], entries: list[dict[str, str]]) -> list[str]:
    """Worktrees registered inside `root` besides the pair's own two.

    `git status --ignored` folds a pair's vendor/ into one line, so a second
    fork worktree made in there is invisible to the work check, and removing
    the pair would delete it.
    """
    return [
        e["worktree"]
        for e in entries
        if is_inside(e["worktree"], root) and not any(same_path(e["worktree"], p) for p in own)
    ]


LONG_PREFIX = "\\\\?\\"


def long_path(p: str) -> str:
    """`p` with the `\\\\?\\` prefix that lifts Windows' 260-character limit.

    Windows does not normalise a prefixed path, so slashes are turned into
    backslashes first.
    """
    p = p.replace("/", "\\")
    return p if p.startswith(LONG_PREFIX) else LONG_PREFIX + p


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


PAIR_DIR = "tbc-wt"
FORK_REL = Path("vendor") / "tbc-new-fork"
FORK_LOCK = "data/wowsims-fork.lock.json"
ENGINE_LOCK = "data/wowsims.lock.json"
FILE_ATTRIBUTE_REPARSE_POINT = 0x400
TOOLS = ("git", "node", "corepack", "npm", "make", "go", "protoc", "protoc-gen-go")


class Refusal(Exception):
    """A precondition or a step failed; the message says what to do."""


def say(msg: str) -> None:
    print(f"[wt] {msg}", flush=True)


def run(cmd: list[str], env: dict[str, str] | None = None) -> None:
    """Run one setup step with its output shown, and time it."""
    say("$ " + " ".join(cmd))
    started = time.monotonic()
    rc = subprocess.run(cmd, env=env).returncode
    say(f"  rc={rc} in {time.monotonic() - started:.0f}s")
    if rc != 0:
        raise Refusal(f"step failed (rc={rc}): {' '.join(cmd)}")


def git(repo: Path | str, *args: str) -> str:
    r = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise Refusal(f"git -C {repo} {' '.join(args)} failed: {r.stderr.strip()}")
    return r.stdout.strip()


def git_ok(repo: Path | str, *args: str) -> bool:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True).returncode == 0


def has_branch(repo: Path, branch: str) -> bool:
    return git_ok(repo, "rev-parse", "--verify", "--quiet", f"refs/heads/{branch}")


def find_checkouts() -> tuple[Path, Path]:
    """The main checkout and its fork clone, wherever this script runs from."""
    common = git(Path(__file__).resolve().parent, "rev-parse", "--path-format=absolute", "--git-common-dir")
    main = main_from_common_dir(common)
    if main is None:
        raise Refusal(
            f"git's common dir is {common}, not <main checkout>/.git; this script only knows that layout"
        )
    main_dir = Path(main)
    fork = main_dir / FORK_REL
    if not fork.is_dir():
        raise Refusal(f"no fork clone at {fork}; a pair's fork worktree is made from that clone")
    fork_common = git(fork, "rev-parse", "--path-format=absolute", "--git-common-dir")
    if not same_path(fork_common, str(fork / ".git")):
        raise Refusal(
            f"{fork} is not the fork clone itself (its git dir is {fork_common}); "
            "the main checkout must hold the real clone"
        )
    return main_dir, fork


def worktrees(repo: Path) -> list[dict[str, str]]:
    return parse_worktrees(git(repo, "worktree", "list", "--porcelain"))


def free_branch_problem(repo: Path, branch: str, new: bool, flag: str) -> str | None:
    if new:
        if has_branch(repo, branch):
            return f"branch {branch!r} already exists in {repo}; drop {flag} to use it"
        return None
    if not has_branch(repo, branch):
        return f"no local branch {branch!r} in {repo}; pass {flag} to create it"
    holder = branch_holder(branch, worktrees(repo))
    if holder is not None:
        return f"branch {branch!r} is already checked out at {holder}; git allows one checkout per branch"
    return None


def preflight_tools() -> None:
    missing = [t for t in TOOLS if shutil.which(t) is None]
    if missing:
        raise Refusal(f"not on PATH: {', '.join(missing)} (needed for install and make proto)")
    version = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout
    if not node_ok(version):
        raise Refusal(
            f"node {version.strip() or '(none)'} is below 22.5; put Node 22 first on PATH "
            '(docs/agents/known-traps.md, "Before running node / pnpm / test commands")'
        )


def exe(name: str) -> str:
    """The runnable file for `name`.

    Node's install dir holds both `corepack` (a sh script) and
    `corepack.cmd`; Python 3.12's shutil.which can return the sh script,
    which Windows cannot start ("[WinError 193] %1 is not a valid Win32
    application", seen in the live test).
    """
    if os.name == "nt":
        for ext in (".exe", ".cmd"):
            found = shutil.which(name + ext)
            if found:
                return found
    return shutil.which(name) or name


def make_env() -> dict[str, str]:
    """The environment the fork's makefile needs.

    Its recipes call sh, uname, realpath and GNU find. A Git Bash shell has
    them on PATH; PowerShell and cmd (which pnpm uses) do not, and Windows'
    own find.exe answers "FIND: Parameter format not correct" (live test).
    Git for Windows ships them in usr/bin, three levels above `git
    --exec-path`.
    """
    env = dict(os.environ)
    if os.name != "nt":
        return env
    usr_bin = Path(git(".", "--exec-path")).parents[2] / "usr" / "bin"
    if not (usr_bin / "sh.exe").is_file():
        raise Refusal(f"no sh.exe in {usr_bin}; make proto needs Git for Windows' usr/bin tools")
    env["PATH"] = str(usr_bin) + os.pathsep + env.get("PATH", "")
    return env


def wowsimcli_platform() -> str:
    """The suffix cli-wiring.ts resolveWowsimcli uses."""
    return "win32-x64" if platform.system() == "Windows" else "linux-x64"


def pair(args: argparse.Namespace) -> int:
    main_dir, fork = find_checkouts()
    target = main_dir.parent / PAIR_DIR / args.name
    fork_target = target / FORK_REL
    problem = name_problem(args.name) or length_problem(str(target))
    if problem:
        raise Refusal(problem)
    if target.exists():
        raise Refusal(f"{target} already exists; pick another name or run: pnpm wt:unpair {args.name}")
    if args.fork_detached == bool(args.fork_branch):
        raise Refusal("give exactly one of <fork-branch> or --fork-detached")
    if args.new_fork_branch and args.fork_detached:
        raise Refusal("--new-fork-branch needs a <fork-branch>, not --fork-detached")

    problem = free_branch_problem(main_dir, args.main_branch, args.b, "-b")
    if not problem and not args.fork_detached:
        problem = free_branch_problem(fork, args.fork_branch, args.new_fork_branch, "--new-fork-branch")
    if problem:
        raise Refusal(problem)
    ref = args.base if args.b else args.main_branch
    if args.b and not git_ok(main_dir, "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"):
        raise Refusal(f"--base {ref!r} is not a commit in {main_dir}")
    pin = json.loads(git(main_dir, "show", f"{ref}:{FORK_LOCK}"))["commit"]
    engine_tag = json.loads(git(main_dir, "show", f"{ref}:{ENGINE_LOCK}"))["tag"]
    if not git_ok(fork, "cat-file", "-e", f"{pin}^{{commit}}"):
        raise Refusal(
            f"the fork lock on {ref} pins {pin}, which the fork clone does not have; fetch it first"
        )
    preflight_tools()
    env = make_env()
    clear_unpair_mark(main_dir, args.name)

    started = time.monotonic()
    warnings: list[str] = []
    target.parent.mkdir(exist_ok=True)
    try:
        if args.b:
            run(["git", "-C", str(main_dir), "worktree", "add", "-b", args.main_branch, str(target), ref])
        else:
            run(["git", "-C", str(main_dir), "worktree", "add", str(target), args.main_branch])
        if args.fork_detached:
            run(["git", "-C", str(fork), "worktree", "add", "--detach", str(fork_target), pin])
        elif args.new_fork_branch:
            run(["git", "-C", str(fork), "worktree", "add", "-b", args.fork_branch, str(fork_target), pin])
        else:
            run(["git", "-C", str(fork), "worktree", "add", str(fork_target), args.fork_branch])

        copied = []
        for name in vendor_inputs(engine_tag, wowsimcli_platform()):
            src = main_dir / "vendor" / name
            if not src.is_dir():
                warnings.append(
                    f"{src} is missing and was not copied; restore it in the pair "
                    "(pnpm sync:wowsims:restore, pnpm sync:atlasloot:restore or pnpm fetch:wowsimcli)"
                )
                continue
            shutil.copytree(src, target / "vendor" / name, symlinks=True)
            copied.append(name)
        say(f"copied into vendor/: {', '.join(copied) or 'nothing'}")
        main_tag = json.loads((main_dir / ENGINE_LOCK).read_text(encoding="utf-8"))["tag"]
        if main_tag != engine_tag:
            warnings.append(
                f"vendor/wowsims came from the main checkout, whose engine lock names {main_tag[:9]}, "
                f"but {ref} names {engine_tag[:9]}; run pnpm sync:wowsims:restore in the pair"
            )

        run([exe("corepack"), "pnpm", "-C", str(target), "install", "--frozen-lockfile"])
        run([exe("npm"), "--prefix", str(fork_target), "ci"])
        make = exe("make")
        run([make, "-C", str(fork_target), "proto"], env)
        # Without the *_auto_gen.ts files the fork's whole-project tsc fails,
        # and with it `pnpm fork-lint:check` (seen in the 2026-10-10 live test).
        run([make, "-C", str(fork_target), "go-to-ts"], env)
        if args.build:
            run([make, "-C", str(fork_target), "dist/tbc/.dirstamp"], env)
    except (Refusal, OSError, ValueError, KeyError) as exc:
        for warning in warnings:
            say(f"WARNING: {warning}")
        say(f"FAILED: {exc}")
        say(f"the pair is partly made at {target}; remove it with: pnpm wt:unpair {args.name} --force")
        return 1

    fork_head = git(fork_target, "rev-parse", "HEAD")
    say(f"pair ready in {time.monotonic() - started:.0f}s")
    say(f"  main  {target}  {args.main_branch} at {git(target, 'rev-parse', '--short', 'HEAD')}")
    fork_ref = "detached" if args.fork_detached else args.fork_branch
    say(f"  fork  {fork_target}  {fork_ref} at {fork_head[:9]}")
    if fork_head != pin:
        say(
            f"  note: the fork is at {fork_head[:9]} but {FORK_LOCK} pins {pin[:9]}; the fork gates "
            "exit 2 until the lock names the fork's HEAD (docs/agents/known-traps.md)"
        )
    for warning in warnings:
        say(f"  WARNING: {warning}")
    say(f"open a session in {target} (desktop app: pick that folder; terminal: run `claude` there)")
    say("that session starts with no memory notes: memory is kept per folder")
    say(f"remove the pair with: pnpm wt:unpair {args.name}")
    return 0


def find_links(root: Path) -> list[tuple[str, str]]:
    """Every symlink or junction under `root`, with its absolute target.

    Does not descend into links, and walks the `\\\\?\\` form so a path past
    260 characters is still read.
    """
    found: list[tuple[str, str]] = []
    stack = [long_path(str(root)) if os.name == "nt" else str(root)]
    while stack:
        with os.scandir(stack.pop()) as entries:
            for entry in entries:
                attrs = getattr(entry.stat(follow_symlinks=False), "st_file_attributes", 0)
                if entry.is_symlink() or attrs & FILE_ATTRIBUTE_REPARSE_POINT:
                    try:
                        target = os.readlink(entry.path)
                    except OSError:
                        target = "<unreadable>"
                    if target != "<unreadable>" and not os.path.isabs(target.replace("\\\\?\\", "")):
                        target = os.path.normpath(os.path.join(os.path.dirname(entry.path), target))
                    found.append((entry.path, target))
                elif entry.is_dir(follow_symlinks=False):
                    stack.append(entry.path)
    return found


FILES_SHOWN = 5


def files_still_under(root: Path) -> list[str]:
    """Up to FILES_SHOWN files still under `root` after a failed delete; when
    no file is left, the innermost folders instead.

    The delete goes on past what it cannot remove, so what is left is what
    something held: a file a process has open, or a folder that is some
    process's current folder.
    """
    files: list[str] = []
    innermost: list[str] = []
    top = long_path(str(root)) if os.name == "nt" else str(root)
    for folder, subdirs, names in os.walk(top):
        files += [os.path.join(folder, n) for n in names]
        if not subdirs:
            innermost.append(folder)
        if len(files) >= FILES_SHOWN:
            break
    return [p.replace(LONG_PREFIX, "", 1) for p in (files or innermost)[:FILES_SHOWN]]


def delete_folder(path: Path, rerun: str) -> None:
    """Delete what `git worktree remove` left behind, if nothing escapes.

    git drops the registration first and then can fail on a path past 260
    characters ("Filename too long"), with "Directory not empty", or on a
    file a process holds open ("Invalid argument"), leaving a half-deleted
    folder. All three happened on 2026-10-10.
    """
    escaping = links_outside(str(path), find_links(path))
    if escaping:
        listed = "; ".join(f"{link} -> {target}" for link, target in escaping)
        raise Refusal(f"not deleting {path}: these links point outside it: {listed}")
    say(f"deleting what git left of {path} (no link inside points outside it)")
    if os.name == "nt":
        r = subprocess.run(
            ["cmd", "/c", "rmdir", "/s", "/q", long_path(str(path))], capture_output=True, text=True, errors="replace"
        )
        delete_error = r.stderr.strip()
    else:
        try:
            shutil.rmtree(path)
            delete_error = ""
        except OSError as exc:
            delete_error = str(exc)
    if path.exists():
        left = "\n  ".join(files_still_under(path))
        first_error_line = delete_error.splitlines()[0].replace(LONG_PREFIX, "") if delete_error else ""
        error_shown = f"\nThe delete said: {first_error_line}" if first_error_line else ""
        holders = "a dev server, tsc, an editor, or a terminal whose current folder is inside"
        if "being used by another process" in delete_error:
            cause = f"A process holds them open: {holders}. Stop that process"
        else:
            cause = (
                "The line above gives the reason. If a process holds them open "
                f"({holders}), stop that process; otherwise fix the cause"
            )
        raise Refusal(
            f"could not delete all of {path}. These are still there:\n  {left}{error_shown}\n"
            f"{cause}, then run `{rerun}` again; it finishes the removal."
        )


UNPAIR_MARKS = "tbc-wt-unpair"


def unpair_mark(main_dir: Path, name: str) -> Path:
    """Where unpair records that it started removing pair `name`.

    In the main checkout's .git, so removing the pair never deletes it, and
    no git command reads it.
    """
    return main_dir / ".git" / UNPAIR_MARKS / name


def mark_unpair_started(main_dir: Path, name: str, target: Path, force: bool) -> None:
    mark = unpair_mark(main_dir, name)
    mark.parent.mkdir(exist_ok=True)
    checks = "with --force, which skips the work checks" if force else "after its work checks passed"
    mark.write_text(
        f"unpair of {target} started removing it at {time.strftime('%Y-%m-%dT%H:%M:%S')}, {checks}\n",
        encoding="utf-8",
    )


def unpair_started(main_dir: Path, name: str) -> bool:
    return unpair_mark(main_dir, name).is_file()


def clear_unpair_mark(main_dir: Path, name: str) -> None:
    unpair_mark(main_dir, name).unlink(missing_ok=True)


def running_processes() -> list[ProcessRow] | None:
    """Every running process as a Win32_Process row, or None when they
    cannot be listed (not Windows, or the query failed)."""
    if os.name != "nt":
        return None
    query = (
        "[Console]::OutputEncoding = [Text.Encoding]::UTF8; "
        "@(Get-CimInstance Win32_Process | "
        "Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,"
        "@{n='Created';e={if ($_.CreationDate) { $_.CreationDate.ToFileTimeUtc() }}}) | ConvertTo-Json -Compress"
    )
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", query],
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        rows = json.loads(r.stdout) if r.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    return rows if isinstance(rows, list) else None


def unsaved_work(repo: Path) -> str | None:
    """Why removing this checkout could lose work, or None."""
    # --untracked-files=normal: a status.showUntrackedFiles=no in the repo
    # config would otherwise hide untracked files from both calls.
    status = git(repo, "status", "--porcelain", "--untracked-files=normal")
    if status:
        return f"{repo} has uncommitted changes; commit or stash them:\n{status}"
    ignored = unexpected_ignored(git(repo, "status", "--porcelain", "--untracked-files=normal", "--ignored"))
    vendor = repo / "vendor"
    if vendor.is_dir():
        ignored += [f"vendor/{n}/" for n in unknown_vendor_folders(sorted(p.name for p in vendor.iterdir()))]
    if ignored:
        return (
            f"{repo} has ignored files that pair setup did not write; move them out "
            "(for example into the main checkout):\n" + "\n".join(ignored)
        )
    if git(repo, "rev-parse", "--abbrev-ref", "HEAD") == "HEAD":
        if not git(repo, "branch", "--all", "--contains", "HEAD"):
            return f"{repo} is detached at a commit no branch contains; branch it first"
    return None


def keep_run_logs(pair_root: Path, main_dir: Path) -> None:
    """Copy the pair's agent run logs into the main checkout's.

    .claude/hooks/log-agent-run.py writes them under the session's project
    folder, and for a session opened in a pair that is the pair.
    """
    src = pair_root / RUN_LOGS
    if not src.is_dir():
        return
    for log in sorted(p for p in src.rglob("*") if p.is_file()):
        rel = log.relative_to(src)
        folder = (main_dir / RUN_LOGS / rel).parent
        folder.mkdir(parents=True, exist_ok=True)
        candidates = [log.name] + [
            f"{log.stem}.pair-{pair_root.name}{'' if n == 1 else f'-{n}'}{log.suffix}" for n in range(1, 100)
        ]
        for name in candidates:
            out = folder / name
            if not out.exists():
                shutil.copy2(log, out)
                say(f"kept run log {out}")
                break
            if filecmp.cmp(log, out, shallow=False):
                break  # already copied by an earlier unpair of this pair
        else:
            raise Refusal(f"no free name for run log {log} in {folder}")


def remove(repo: Path, path: Path, listed: bool, force: bool, rerun: str) -> None:
    git_said = ""
    if listed:
        cmd = ["git", "-C", str(repo), "worktree", "remove", *(["--force"] if force else []), str(path)]
        say("$ " + " ".join(cmd))
        r = subprocess.run(cmd, capture_output=True, text=True)
        git_said = r.stderr.strip()
        if r.returncode != 0:
            say(f"  git: {git_said}")
    action = leftover_action(is_listed(str(path), worktrees(repo)), path.exists())
    if action == "refuse":
        raise Refusal(
            f"git kept {path} registered and refused to remove it ({git_said or 'no message'}); "
            "this script deleted nothing in it. Fix what git's message names, then rerun"
        )
    if action == "delete":
        delete_folder(path, rerun)


def unpair(args: argparse.Namespace) -> int:
    main_dir, fork = find_checkouts()
    problem = name_problem(args.name)
    if problem:
        raise Refusal(problem)
    target = main_dir.parent / PAIR_DIR / args.name
    fork_target = target / FORK_REL
    for here in (Path.cwd(), Path(__file__).resolve()):
        if is_inside(str(here), str(target)):
            raise Refusal(
                f"this command is running from inside {target}; run it from the main checkout or another pair"
            )
    main_list, fork_list = worktrees(main_dir), worktrees(fork)
    in_main = is_listed(str(target), main_list)
    in_fork = is_listed(str(fork_target), fork_list)
    for path, entries, repo in ((target, main_list, main_dir), (fork_target, fork_list, fork)):
        if is_locked(str(path), entries):
            raise Refusal(
                f"{path} is locked (git worktree list --porcelain shows why); "
                f"run `git -C {repo} worktree unlock {path}` once nothing uses it"
            )
    if not target.exists() and not in_main and not in_fork:
        clear_unpair_mark(main_dir, args.name)
        say(f"nothing to remove: no folder {target} and no worktree registered there")
        return 0
    others = other_worktrees_inside(str(target), [str(target), str(fork_target)], main_list + fork_list)
    if others:
        raise Refusal(
            f"other worktrees are registered inside {target}: {', '.join(others)}. "
            "Removing the pair would delete them; remove them first with git worktree remove"
        )
    started = unpair_started(main_dir, args.name)
    for path, listed, repo in ((target, in_main, main_dir), (fork_target, in_fork, fork)):
        if path.exists() and not listed:
            problem = unregistered_problem(str(path), str(repo), args.force, started, (path / ".git").is_dir())
            if problem:
                raise Refusal(problem)
    if not args.force:
        for repo, listed in ((fork_target, in_fork), (target, in_main)):
            if listed and repo.exists():
                problem = unsaved_work(repo)
                if problem:
                    raise Refusal(
                        f"{problem}\nTo remove the pair anyway and lose those files, rerun with --force."
                    )
    rerun = f"pnpm wt:unpair {args.name}" + (" --force" if args.force else "")
    procs = running_processes()
    busy = processes_using(str(target), procs, os.getpid()) if procs is not None else []
    if busy:
        shown = describe_processes(busy)
        if not args.force:
            raise Refusal(
                f"these processes run from inside {target} or name it on their command line, so they "
                f"may hold files there open and stop the removal part-way:\n{shown}\n"
                f"Stop them, then rerun `{rerun}`. Nothing was removed. "
                "--force skips this check."
            )
        say(f"WARNING: --force given; removing although these processes may hold files open:\n{shown}")
    elif procs is None and os.name == "nt":
        say("could not list running processes; removing without checking for processes that use the pair")

    mark_unpair_started(main_dir, args.name, target, args.force)
    try:
        if target.exists():
            keep_run_logs(target, main_dir)
        remove(fork, fork_target, in_fork, args.force, rerun)
        remove(main_dir, target, in_main, args.force, rerun)
    except Refusal:
        halves = [
            (target.exists(), is_listed(str(target), worktrees(main_dir))),
            (fork_target.exists(), is_listed(str(fork_target), worktrees(fork))),
        ]
        if not mark_still_needed(halves):
            clear_unpair_mark(main_dir, args.name)
        raise
    git(fork, "worktree", "prune")
    git(main_dir, "worktree", "prune")
    if is_listed(str(target), worktrees(main_dir)) or is_listed(str(fork_target), worktrees(fork)):
        raise Refusal("a worktree is still registered after removal; see `git worktree list` in both repos")
    if target.exists():
        raise Refusal(f"{target} still exists")
    clear_unpair_mark(main_dir, args.name)
    say(f"removed {args.name}: neither repo lists it, and {target} is gone")
    say("branches are kept; delete them with git branch -d when merged")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="worktree_pair.py", description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("pair", help="make a main worktree with its own fork worktree")
    p.add_argument("name")
    p.add_argument("main_branch")
    p.add_argument("fork_branch", nargs="?")
    p.add_argument("-b", action="store_true", help="create <main-branch> from --base")
    p.add_argument("--base", default="dev", help="start point for -b (default dev)")
    p.add_argument("--new-fork-branch", action="store_true", help="create <fork-branch> at the lock's commit")
    p.add_argument("--fork-detached", action="store_true", help="fork at the lock's commit, no branch")
    p.add_argument("--build", action="store_true", help="also build the fork's dist/")
    u = sub.add_parser("unpair", help="remove a pair made by `pair`")
    u.add_argument("name")
    u.add_argument("--force", action="store_true", help="discard uncommitted work; delete leftovers")
    args = ap.parse_args(argv)
    try:
        return pair(args) if args.cmd == "pair" else unpair(args)
    except Refusal as exc:
        print(f"[wt] refused: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
