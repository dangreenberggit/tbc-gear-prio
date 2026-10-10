#!/usr/bin/env python3
"""How far the fork sits behind upstream `master`, and what a merge would cost.

ADR-0036 has the fork branch follow upstream `master` by ordinary merges,
whenever a merge would have content conflicts only. This prints the numbers
that decision needs:

  - commits behind `upstream/master`, and the date of the merge-base
  - the conflicts of a dry-run merge, by type, from `git merge-tree`
  - the upstream files the fork modified since the fork lock's `branchedFrom`,
    and which of them upstream changed since the merge-base

`git merge-tree --write-tree` is a dry run: it writes objects but touches no
branch and no working tree. The one ref this moves is `upstream/master`, by the
fetch, and it moves for every checkout that shares the fork's object store.

A dry run cannot see a merge that applies cleanly but stops compiling, such as
an upstream API rename our feature folder calls. The routine in
docs/agents/upstream-catch-up.md checks the merged tree for that.

Not a `pnpm verify` step: it needs network for the fetch, and verify may not
(`warn_upstream_drift.py`). Always exits 0 unless git itself fails.

    pnpm fork:upstream-status
    python scripts/fork_upstream_status.py --fork <fork checkout> --lock <fork lock>
    python scripts/fork_upstream_status.py --no-fetch --json
    python scripts/fork_upstream_status.py --self-test
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FORK = ROOT / "vendor/tbc-new-fork"
DEFAULT_LOCK = ROOT / "data/wowsims-fork.lock.json"
UPSTREAM = "upstream/master"

# `git merge-tree` prints one informational line per conflict, prefixed
# `CONFLICT (<type>):`. These three types are the ones ADR-0036's rule reads;
# any other type is counted under its own name rather than guessed into one.
KIND_BY_TYPE = {
    "content": "content",
    "file location": "location",
    "modify/delete": "modify/delete",
}
CONFLICT_RE = re.compile(r"^CONFLICT \(([^)]+)\):", re.MULTILINE)


class GitError(Exception):
    pass


def classify_conflicts(merge_tree_output: str) -> dict[str, int]:
    """Count `CONFLICT (<type>):` lines, keyed content / location / modify/delete."""
    counts = {kind: 0 for kind in KIND_BY_TYPE.values()}
    for conflict_type in CONFLICT_RE.findall(merge_tree_output):
        kind = KIND_BY_TYPE.get(conflict_type, conflict_type)
        counts[kind] = counts.get(kind, 0) + 1
    return counts


def git(fork: Path, *args: str, ok_codes: tuple[int, ...] = (0,)) -> str:
    result = subprocess.run(
        ["git", "-C", str(fork), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode not in ok_codes:
        raise GitError(
            f"git {' '.join(args)} exited {result.returncode}: "
            f"{result.stderr.strip() or '(no stderr)'}"
        )
    return result.stdout


def lines(text: str) -> list[str]:
    return [line for line in text.splitlines() if line.strip()]


def status(fork: Path, lock: Path, fetch: bool) -> dict[str, object]:
    base = json.loads(lock.read_text(encoding="utf-8"))["branchedFrom"]
    if fetch:
        git(fork, "fetch", "upstream", "master")
    head = git(fork, "rev-parse", "HEAD").strip()
    upstream = git(fork, "rev-parse", UPSTREAM).strip()
    behind = int(git(fork, "rev-list", "--count", f"HEAD..{UPSTREAM}").strip())
    merge_base = git(fork, "merge-base", "HEAD", UPSTREAM).strip()
    merge_base_date = git(fork, "log", "-1", "--format=%cs", merge_base).strip()
    # Exit 1 means the dry run found conflicts; only other codes are failures.
    dry_run = git(
        fork,
        "merge-tree",
        "--write-tree",
        "--name-only",
        "HEAD",
        UPSTREAM,
        ok_codes=(0, 1),
    )
    conflicts = classify_conflicts(dry_run)
    ours = lines(git(fork, "diff", "--name-only", "--diff-filter=M", base, "HEAD"))
    touched = (
        lines(git(fork, "diff", "--name-only", f"HEAD...{UPSTREAM}", "--", *ours))
        if ours
        else []
    )
    return {
        "fork": str(fork),
        "lock": str(lock),
        "head": head,
        "upstream": upstream,
        "branchedFrom": base,
        "behind": behind,
        "mergeBase": merge_base,
        "mergeBaseDate": merge_base_date,
        "conflicts": conflicts,
        "conflictTotal": sum(conflicts.values()),
        "modifiedUpstreamFiles": ours,
        "modifiedFilesUpstreamTouched": touched,
    }


def report(s: dict[str, object]) -> str:
    conflicts = s["conflicts"]
    assert isinstance(conflicts, dict)
    ours = s["modifiedUpstreamFiles"]
    touched = s["modifiedFilesUpstreamTouched"]
    assert isinstance(ours, list) and isinstance(touched, list)
    by_kind = ", ".join(f"{n} {kind}" for kind, n in conflicts.items())
    out = [
        f"fork {s['fork']} at {str(s['head'])[:12]}",
        f"{s['behind']} commits behind {UPSTREAM} ({str(s['upstream'])[:12]}); "
        f"merge-base {str(s['mergeBase'])[:12]} from {s['mergeBaseDate']}",
        f"dry-run merge: {s['conflictTotal']} conflicts ({by_kind})",
        f"upstream files the fork modified since {str(s['branchedFrom'])[:12]}: "
        f"{len(ours)}; upstream changed {len(touched)} of them since the merge-base",
    ]
    out += [f"  {path}" for path in touched]
    routine = all(n == 0 for kind, n in conflicts.items() if kind != "content")
    if s["behind"] == 0:
        out.append("up to date: nothing to merge")
    elif routine:
        out.append("no conflicts beyond content: a routine merge (upstream-catch-up.md)")
    else:
        out.append(
            "location or other conflicts: upstream moved something the fork "
            "builds on; plan it, not a routine merge (ADR-0036)"
        )
    return "\n".join(out)


SAMPLE = """\
e0aa4e8a29234686f9f0dc59529c7b574ef4e7f4
package.json
ui/core/components/base_modal.tsx

Auto-merging package.json
CONFLICT (content): Merge conflict in package.json
CONFLICT (content): Merge conflict in sim/rogue/talents_combat.go
CONFLICT (modify/delete): ui/core/components/base_modal.tsx deleted in upstream/master and modified in HEAD.  Version HEAD of ui/core/components/base_modal.tsx left in tree.
CONFLICT (file location): ui/core/a.ts added in HEAD inside a directory that was renamed in upstream/master, suggesting it should perhaps be moved to ui/sim/a.ts.
CONFLICT (file location): ui/core/b.ts added in HEAD inside a directory that was renamed in upstream/master, suggesting it should perhaps be moved to ui/sim/b.ts.
CONFLICT (add/add): Merge conflict in tools/x.ts
"""


def self_test() -> int:
    checks = [
        (classify_conflicts(SAMPLE), {"content": 2, "location": 2, "modify/delete": 1, "add/add": 1}),
        (classify_conflicts("e0aa4e8a\n"), {"content": 0, "location": 0, "modify/delete": 0}),
        # A file name containing the word must not count: only line starts do.
        (
            classify_conflicts("x\n\nAuto-merging docs/CONFLICT (content): x.md\n"),
            {"content": 0, "location": 0, "modify/delete": 0},
        ),
    ]
    failed = [(got, want) for got, want in checks if got != want]
    for got, want in failed:
        print(f"self-test FAIL: got {got}, want {want}", file=sys.stderr)
    if failed:
        return 1
    print(f"fork_upstream_status.py classifier ok ({len(checks)} checks)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fork", type=Path, default=DEFAULT_FORK, help="fork checkout (default: this repo's vendor/tbc-new-fork)")
    parser.add_argument("--lock", type=Path, default=DEFAULT_LOCK, help="fork lock whose branchedFrom is the base (default: this repo's)")
    parser.add_argument("--no-fetch", action="store_true", help="skip `git fetch upstream master` (offline)")
    parser.add_argument("--json", action="store_true", help="print JSON instead of text")
    parser.add_argument("--self-test", action="store_true", help="check the conflict classifier on a fixed sample")
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    try:
        result = status(args.fork, args.lock, fetch=not args.no_fetch)
    except GitError as exc:
        print(f"fork upstream status: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2) if args.json else report(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
