#!/usr/bin/env python3
"""
merge_to_dev.py — the only supported door from a feature/phase branch into dev.

    pnpm merge-to-dev
    pnpm merge-to-dev --ack-open-blockers   # phase-N/* with open Blocks: still open
    pnpm merge-to-dev --check-only          # verify + merge-ready, no merge
    pnpm merge-to-dev --no-verify           # skip pnpm verify (escape hatch; not for real merges)
    pnpm merge-to-dev <branch>              # from a folder on dev; see "Named branch" below

Steps (no branch argument, run from the branch's own checkout):
  1. Refuse detaching / merging from dev or main
  2. Require a clean working tree
  3. pnpm verify
  4. merge-ready check (review + deferred tickets filed; no review file is
     needed when every changed file is agent tooling, see TOOLING_PATHS in
     scripts/check_merge_ready.py), run twice: by the branch's copy of
     check_merge_ready.py and by dev's copy (`merge_ready_at`). Both must
     pass. See "Which copy of the gate code runs" below for the limits
     this does and does not give (ticket 733).
  5. layout gate (Upgrades tab) -- runs only if the fork's tab source changed
     since the last green run, and only when its prereqs are present; skips
     cleanly otherwise (ticket 325). See scripts/check_layout_gate.py.
  6. git checkout dev && git merge --no-ff <branch>

Named branch (`pnpm merge-to-dev <branch>`, run from the folder that has dev
checked out, such as the main folder while <branch> sits in a pair):
  1. Find the worktree that has <branch> checked out; it must be clean.
     Refuse a branch dev already contains.
  2. If dev has commits <branch> lacks, merge dev into <branch> in that
     worktree (a conflict is aborted there and reported). Refuse instead
     when dev's fork lock changed since <branch> forked: the worktree's fork
     would no longer match the lock (docs/agents/paired-worktrees.md). After this, dev is
     an ancestor of <branch>, so the merge into dev produces exactly
     <branch>'s tree, and the gates below check the merge result. That merge
     commit stays on <branch> even when a later gate fails.
  3. Dev's copy of check_merge_ready.py, as committed at dev's tip, checks
     the worktree (`merge_ready_at`). Then steps 2-5 above run in that
     worktree, by its own copy of this script (`--gates-only`). They read
     its fork, lock, review file and tickets. Afterwards the worktree must
     still be clean and at the checked tip.
  4. git merge --no-ff <branch's tip> here. Dirty files in this folder block
     only when the merge writes them, or when they are staged; the rest stay
     as they are.
`--check-only` with a branch skips step 2, reports blocking dirty files
instead of refusing, and merges nothing.

Why the gates run in the branch's worktree, not in a temporary worktree at
the merge result: a plain `git worktree add` has no vendor/ fork, no
node_modules and no wowsims copies, so verify cannot run there. Providing
them takes what `pnpm wt:pair` does: a fork worktree, an install and the
fork's proto build. The branch's worktree already has them, and step 2
makes its tip's tree the merge result.

Which copy of the gate code runs: the named form is dev's copy of this
script, so a branch cannot edit away its call to dev's merge-ready check.
The no-branch form is the branch's own copy of this script, and a branch
that also edits this file can drop the call there (ticket 733). Both forms
also run code from the branch: `pnpm verify`, its gates, and its git hooks
(`core.hooksPath` is the relative `.githooks`, so the named form's merge of
dev into the branch runs the branch's hooks before dev's check). So the
door stops a branch that changes the gate's rules. It does not stop code
in the branch that is written to get around the door.

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
from collections.abc import Callable
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Import sibling check module without packaging it.
sys.path.insert(0, str(ROOT / "scripts"))
import check_layout_gate  # noqa: E402
import check_merge_ready  # noqa: E402
# The sandbox stub rule lives in check_merge_ready, whose changed-file read
# leaves the stubs out too; check_merge_to_dev.py tests it through here.
from check_merge_ready import SANDBOX_STUBS, holds_no_work, is_device  # noqa: E402,F401
from check_merge_ready import merge_ready_at  # noqa: E402
import worktree_pair  # noqa: E402

# pre-commit on `dev` refuses merge commits unless this is set (see .githooks/pre-commit).
ALLOW_DEV_MERGE = "TBC_ALLOW_DEV_MERGE"
LAYOUT_LOCK = "data/wowsims-fork-layout.lock.json"
FORK_LOCK = "data/wowsims-fork.lock.json"


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


def parse_porcelain_z(text: str) -> list[tuple[str, str]]:
    """`git status --porcelain -z` as (XY status, path) pairs.

    A rename or copy entry is followed by a field holding its old path; that
    path is returned as its own pair with the same status, since both paths
    differ from HEAD.
    """
    fields = text.split("\0")
    out: list[tuple[str, str]] = []
    i = 0
    while i < len(fields):
        entry = fields[i]
        i += 1
        if len(entry) < 4:
            continue
        xy, path = entry[:2], entry[3:]
        out.append((xy, path))
        if "R" in xy or "C" in xy:
            if i < len(fields) and fields[i]:
                out.append((xy, fields[i]))
            i += 1
    return out


def real_changes(
    entries: list[tuple[str, str]], no_work: Callable[[str], bool]
) -> list[tuple[str, str]]:
    """`no_work` is a parameter so check_merge_to_dev.py can test this without
    real sandbox mounts; `has_changes` passes `holds_no_work`."""
    return [(xy, path) for xy, path in entries if not (xy == "??" and no_work(path))]


def has_changes(cwd: Path) -> bool:
    status = git_out("status", "--porcelain", "-z", cwd=cwd)
    return bool(real_changes(parse_porcelain_z(status), lambda p: holds_no_work(cwd, p)))


def merge_blockers(entries: list[tuple[str, str]], touched: set[str]) -> list[str]:
    """Why the main folder's dirty files stop a merge, one line per file.

    A staged change blocks wherever it is: git merge refuses when the index
    differs from HEAD. A modified or untracked file blocks only when the
    merge writes that path. Ignored files never block. Paths compare
    case-insensitively, because a Windows checkout treats them as one file.
    """
    touched_folded = {p.casefold() for p in touched}
    out = []
    for xy, path in entries:
        if xy == "!!":
            continue
        if xy[0] not in " ?":
            out.append(f"{path} (staged; the merge commit would record it)")
        elif path.casefold() in touched_folded:
            if xy == "??":
                out.append(f"{path} (untracked, and the merge writes it)")
            else:
                out.append(f"{path} (modified, and the merge changes it)")
    return out


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


def named_mode_problem(current: str, target: str) -> str | None:
    """Why `pnpm merge-to-dev <target>` cannot run from a folder on `current`."""
    if target in ("dev", "main"):
        return f"refuse to merge {target!r} into dev — name a feature/phase branch"
    if current != "dev":
        return (
            "pnpm merge-to-dev <branch> runs from the folder that has dev checked out; "
            f"this folder has {current!r}. To merge {current!r}, run pnpm merge-to-dev "
            "with no branch"
        )
    return None


def gate_argv(
    python: str,
    script: str,
    *,
    check_only: bool,
    no_verify: bool,
    ack_open_blockers: bool,
    expect_head: str | None,
) -> list[str]:
    """The command that runs steps 2-5 in the branch's own checkout."""
    argv = [python, script, "--check-only" if check_only else "--gates-only"]
    if expect_head:
        argv += ["--expect-head", expect_head]
    if no_verify:
        argv.append("--no-verify")
    if ack_open_blockers:
        argv.append("--ack-open-blockers")
    return argv


def git_out(*args: str, cwd: Path = ROOT) -> str:
    r = subprocess.run(
        _resolve_cmd(["git", *args]),
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if r.returncode != 0:
        die(f"git {' '.join(args)} failed in {cwd}: {r.stderr.strip()}")
    return r.stdout


def is_ancestor(a: str, b: str) -> bool:
    r = subprocess.run(_resolve_cmd(["git", "merge-base", "--is-ancestor", a, b]), cwd=ROOT)
    return r.returncode == 0


def rev_parse(ref: str, cwd: Path = ROOT) -> str:
    return git_out("rev-parse", ref, cwd=cwd).strip()


def main_folder_blockers(dev_sha: str, tip: str) -> list[str]:
    """Dirty files in this folder that stop merging `tip` into `dev_sha`.

    `dev...tip` lists the files the branch changed since it forked, which is
    what the merge writes here; a plain `dev tip` diff would also list every
    file dev changed since then.
    """
    out = git_out("diff", "--name-only", "--no-renames", "-z", f"{dev_sha}...{tip}")
    touched = {p for p in out.split("\0") if p}
    status = git_out("status", "--porcelain", "-z", "--untracked-files=all")
    return merge_blockers(parse_porcelain_z(status), touched)


def refuse_blockers(blockers: list[str], check_only: bool = False) -> None:
    if not blockers:
        return
    listing = "\n  ".join(blockers)
    if check_only:
        print(f"note: a real run would refuse on these dirty files in this folder:\n  {listing}")
        return
    die(f"dirty files in this folder block the merge — commit or stash these:\n  {listing}")


def worktree_problem(wt: Path, target: str, head: str) -> str | None:
    """Why `wt` is not a clean checkout of `target` at `head`, or None.

    A pair's fork worktree sits under the gitignored vendor/, so the main
    tree's status does not show its edits; the fork gates read it, so it
    must be clean too.
    """
    if has_changes(wt):
        return f"{wt} has uncommitted or untracked files; commit them there first"
    fork = wt / "vendor" / "tbc-new-fork"
    if (fork / ".git").exists() and has_changes(fork):
        return f"{fork} has uncommitted or untracked files; commit them there first"
    if git_out("branch", "--show-current", cwd=wt).strip() != target:
        return f"{wt} no longer has {target} checked out"
    if rev_parse("HEAD", wt) != head:
        return f"{wt} is not at {target}'s tip {head[:9]}"
    return None


def merge_named(args: argparse.Namespace) -> int:
    """`pnpm merge-to-dev <branch>`: see "Named branch" in the module doc."""
    target = args.branch
    problem = named_mode_problem(check_merge_ready.branch_name(), target)
    if problem:
        die(problem)
    if run(["git", "show-ref", "--verify", "--quiet", f"refs/heads/{target}"]).returncode != 0:
        die(f"no local branch {target!r}")
    branch_ref = f"refs/heads/{target}"

    holder = worktree_pair.branch_holder(
        target, worktree_pair.parse_worktrees(git_out("worktree", "list", "--porcelain"))
    )
    if holder is None:
        die(
            f"{target!r} is not checked out in any worktree (a worktree in the middle "
            "of a rebase counts as detached). The gates run in the branch's own "
            "checkout: check it out in a pair or worktree, or check it out here and "
            "run pnpm merge-to-dev with no branch"
        )
    wt = Path(holder)
    script = wt / "scripts" / "merge_to_dev.py"
    if not script.is_file():
        die(f"{script} does not exist; is the worktree folder missing?")
    dev_sha = rev_parse("HEAD")
    tip = rev_parse(branch_ref)
    problem = worktree_problem(wt, target, tip)
    if problem:
        die(problem)
    if is_ancestor(tip, dev_sha):
        die(f"dev already contains {target} ({tip[:9]}); there is nothing to merge")
    print(f"{target} is checked out at {wt}; the gates run there")
    # Checked before the gates too, so a blocked merge fails in seconds, not
    # after a verify run of several minutes.
    refuse_blockers(main_folder_blockers(dev_sha, tip), args.check_only)

    if not is_ancestor(dev_sha, tip):
        base = git_out("merge-base", dev_sha, tip).strip()
        if git_out("diff", "--name-only", base, dev_sha, "--", FORK_LOCK).strip():
            msg = (
                f"dev's {FORK_LOCK} changed since {target} forked, so the fork in {wt} "
                "no longer matches dev's pin; see docs/agents/paired-worktrees.md, "
                '"When dev has a new fork pin"'
            )
            if not args.check_only:
                die(msg)
            print(f"note: a real run refuses: {msg}")
        if args.check_only:
            print(
                f"note: dev has commits {target} lacks, so this checks {target}'s tip, "
                "not the merge result; a real run merges dev into it first"
            )
        else:
            print(f"\n=== merge dev into {target} (in {wt}) ===")
            if run(["git", "-C", str(wt), "merge", "--no-edit", "refs/heads/dev"]).returncode != 0:
                run(["git", "-C", str(wt), "merge", "--abort"])
                die(
                    f"merging dev into {target} failed in {wt}, and was aborted. "
                    f"Resolve it there (git -C {wt} merge refs/heads/dev) and run this again"
                )
            tip = rev_parse(branch_ref)

    kept = f"{target} keeps its commits up to {tip[:9]}, including the merge of dev made in this run, if any"
    kept_note = "" if args.check_only else f" {kept}."
    print(f"\n=== merge-ready, by dev's copy ({dev_sha[:9]}) ===")
    ready = merge_ready_at(dev_sha, wt, target, args.ack_open_blockers)
    if ready != 0:
        die("dev's copy of the merge-ready check failed." + kept_note, ready)

    print(f"\n=== gates in {wt} ===")
    argv = gate_argv(
        sys.executable,
        str(script),
        check_only=args.check_only,
        no_verify=args.no_verify,
        ack_open_blockers=args.ack_open_blockers,
        expect_head=None if args.check_only else tip,
    )
    print("+", " ".join(argv))
    gates = subprocess.run(argv, cwd=wt)
    if gates.returncode != 0:
        die(f"gates failed in {wt}." + kept_note, gates.returncode)
    if args.check_only:
        return 0

    # The gates checked `tip`. A green layout gate may add one commit holding
    # only its lock; any other movement means the checked tree is not the one
    # about to be merged.
    after = rev_parse(branch_ref)
    if after != tip:
        changed = git_out("diff", "--name-only", tip, after).splitlines()
        if rev_parse(f"{after}^") != tip or changed != [LAYOUT_LOCK]:
            die(f"{target} moved from {tip[:9]} to {after[:9]} while the gates ran; {kept}; run this again")
    # An edit or a branch switch in the worktree during the gates would mean
    # verify checked files that are not in `after`.
    problem = worktree_problem(wt, target, after)
    if problem:
        die(f"after the gates: {problem}; {kept}; run this again")
    # A `git switch -c` here keeps HEAD's sha, so the branch name and the dev
    # ref are both checked; the merge would otherwise go onto the new branch.
    if check_merge_ready.branch_name() != "dev" or rev_parse("HEAD") != dev_sha:
        die(f"this folder left dev, or dev moved, while the gates ran; {kept}; run this again")
    if rev_parse("refs/heads/dev") != dev_sha:
        die(f"dev moved while the gates ran; {kept}; run this again")
    refuse_blockers(main_folder_blockers(dev_sha, after))

    print("\n=== merge into dev ===")
    msg = f"Merge branch '{target}' into dev"
    env = os.environ.copy()
    env[ALLOW_DEV_MERGE] = "1"
    merge = run(["git", "merge", "--no-ff", "-m", msg, after], env=env)
    if merge.returncode != 0:
        print(
            "Merge failed (dev is an ancestor of the branch, so this is not a "
            "content conflict). Check `git status`; if a merge is in progress: "
            "git merge --abort",
            file=sys.stderr,
        )
        return merge.returncode

    new_dev = rev_parse("refs/heads/dev")
    if new_dev != rev_parse("HEAD") or rev_parse(f"{new_dev}^1") != dev_sha:
        die(f"the merge commit is not on dev on top of {dev_sha[:9]}; inspect `git log -3 --all --graph`")
    if rev_parse("HEAD^{tree}") != rev_parse(f"{after}^{{tree}}"):
        die(
            f"dev's new tree differs from {target}'s, which the gates checked; "
            "the merge commit is made, so inspect it before pushing"
        )
    print(f"\nmerged {target} -> dev; {target} is still checked out at {wt}")
    print("next: push dev when ready (`git push origin dev`); main stays gated")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "branch",
        nargs="?",
        help="branch to merge, from a folder on dev; it may be checked out in another worktree",
    )
    ap.add_argument(
        "--gates-only",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    ap.add_argument("--expect-head", help=argparse.SUPPRESS)
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

    if args.branch is not None:
        if args.gates_only:
            die("--gates-only takes no branch; it checks the branch this folder has checked out")
        return merge_named(args)

    branch = check_merge_ready.branch_name()
    if branch in ("dev", "main"):
        die(
            f"refuse to merge from {branch!r} — check out a feature/phase branch, "
            "or name one: pnpm merge-to-dev <branch>"
        )

    dirty = has_changes(ROOT)
    if dirty and not args.check_only:
        die("working tree not clean — commit or stash first")
    if dirty and args.check_only:
        print("(working tree dirty — allowed for --check-only)")
    if args.expect_head:
        head = rev_parse("HEAD")
        if head != args.expect_head:
            die(f"HEAD is {head[:9]}, not the {args.expect_head[:9]} the caller asked to check")

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
    # Under --gates-only the named form has already run dev's copy.
    if not args.gates_only:
        print("\n=== merge-ready, by dev's copy ===")
        ready = merge_ready_at("refs/heads/dev", ROOT, branch, args.ack_open_blockers)
        if ready != 0:
            return ready

    # The Upgrades-tab layout gate. Runs only when the fork's tab source changed
    # since the last green run AND the fork, its built dist/, and a Chromium are
    # all present; skips cleanly (returns 0) otherwise. A real assertion failure
    # returns 1 and blocks the merge. A tab digest it cannot compute (a missing
    # tracked file, or no Chromium build because Node 22 or `playwright` is
    # missing) returns 2 and blocks it too. See scripts/check_layout_gate.py and
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
    if layout_rc == 2:
        die("layout gate could not run — the cause is printed above", layout_rc)
    if layout_rc != 0:
        die("layout gate failed — Upgrades tab layout is broken", layout_rc)

    if args.check_only:
        print("\ncheck-only: ok (not merging)")
        return 0
    if args.gates_only:
        print("\ngates: ok (not merging)")
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
        # Line buffering keeps this script's lines in order with the output of
        # the gate run it starts, when stdout is a pipe or a log file.
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
