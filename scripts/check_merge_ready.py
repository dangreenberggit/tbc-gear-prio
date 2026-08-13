#!/usr/bin/env python3
"""
check_merge_ready.py — checks that a branch is allowed to merge to dev.

Tickets are the source of truth for deferred work. The review file is the
judgment record; its Disposition table must link every `defer` to a real
open carry-forward ticket.

Used by `pnpm merge-to-dev` (the only supported door into dev). Also:

    pnpm merge-ready              # check only, no merge
    pnpm issues:open              # list open carry-forward tickets

Phase-N branches: open tickets with `Blocks: phase-N` are listed. Merging
requires an explicit `--ack-open-blockers` (conscious opt-in), not a fake
"path mentioned in the review" check. Fix or re-block the ticket for real.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEWS = ROOT / "docs" / "reviews"
CARRY = ROOT / ".scratch" / "carry-forward" / "issues"

DISPOSITION_RE = re.compile(
    r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(fixed|defer|wontfix)\s*\|\s*([^|]*?)\s*\|$",
    re.IGNORECASE | re.MULTILINE,
)
STATUS_RE = re.compile(r"(?im)^\s*Status:\s*(\S+)")
BLOCKS_RE = re.compile(r"(?im)^\s*Blocks:\s*(.+)$")
BLOCKED_BY_RE = re.compile(r"(?im)^\s*Blocked by:\s*(.+)$")
PHASE_BRANCH_RE = re.compile(r"^(phase-\d+)", re.IGNORECASE)


def branch_name() -> str:
    out = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    name = out.stdout.strip()
    if not name:
        raise SystemExit("detached HEAD — check out a feature branch first")
    return name


def review_path(branch: str) -> Path:
    return REVIEWS / f"{branch.replace('/', '-')}.md"


def parse_disposition(text: str) -> list[dict]:
    m = re.search(r"(?ms)^## Disposition\s*\n(.*?)(?=^## |\Z)", text)
    if not m:
        return []
    rows = []
    for match in DISPOSITION_RE.finditer(m.group(1)):
        fid, axis, disp, note = (g.strip() for g in match.groups())
        if fid.lower() in ("id", "---") or set(fid) <= {"-"}:
            continue
        rows.append(
            {"id": fid, "axis": axis, "disposition": disp.lower(), "note": note}
        )
    return rows


def ticket_path_from_note(note: str) -> Path | None:
    for pat in (
        r"`((?:\.scratch/)?[^`]+/issues/\d+-[^`]+\.md)`",
        r"((?:\.scratch/)?[\w./-]+/issues/\d+-[\w.-]+\.md)",
    ):
        m = re.search(pat, note)
        if m:
            p = Path(m.group(1))
            return p if p.is_absolute() else ROOT / p
    return None


def read_status(path: Path) -> str | None:
    m = STATUS_RE.search(path.read_text(encoding="utf-8"))
    return m.group(1).lower() if m else None


def iter_issue_files() -> list[Path]:
    """Only carry-forward tickets — not nested worktree / scratch copies."""
    if not CARRY.is_dir():
        return []
    return sorted(CARRY.glob("*.md"))


def open_blockers_for_phase(phase: str) -> list[tuple[Path, str]]:
    found = []
    phase_l = phase.lower()
    for path in iter_issue_files():
        text = path.read_text(encoding="utf-8")
        status_m = STATUS_RE.search(text)
        blocks_m = BLOCKS_RE.search(text)
        if not status_m or not blocks_m:
            continue
        if status_m.group(1).lower() not in ("open", "claimed"):
            continue
        blocks = [b.strip().lower() for b in blocks_m.group(1).split(",")]
        if phase_l not in blocks:
            continue
        title = next(
            (ln.strip("# ").strip() for ln in text.splitlines() if ln.strip()),
            path.name,
        )
        found.append((path, title))
    return found


def list_open_carry_forward() -> list[tuple[Path, str, str, str]]:
    out = []
    if not CARRY.is_dir():
        return out
    for path in sorted(CARRY.glob("*.md")):
        status = read_status(path) or "?"
        if status not in ("open", "claimed"):
            continue
        text = path.read_text(encoding="utf-8")
        blocks_m = BLOCKS_RE.search(text)
        blocks = blocks_m.group(1).strip() if blocks_m else "(none)"
        blocked_m = BLOCKED_BY_RE.search(text)
        blocked_by = blocked_m.group(1).strip() if blocked_m else "(unset)"
        out.append((path, status, blocks, blocked_by))
    return out


def check(
    branch: str | None = None,
    review: Path | None = None,
    ack_open_blockers: bool = False,
) -> int:
    """Return 0 if the branch may merge to dev."""
    branch = branch or branch_name()
    review = review or review_path(branch)
    if not review.is_absolute():
        review = ROOT / review
    errors: list[str] = []

    print(f"branch: {branch}")
    print(f"review: {review.relative_to(ROOT).as_posix()}")

    if not review.is_file():
        print(
            f"FAIL: missing review — run pre-merge-review; expected "
            f"{review.relative_to(ROOT).as_posix()}",
            file=sys.stderr,
        )
        return 1

    text = review.read_text(encoding="utf-8")
    rows = parse_disposition(text)
    if not rows:
        errors.append(
            "review has no parseable ## Disposition table "
            "(fixed|defer|wontfix; defer must link a ticket path)"
        )
    else:
        print(f"disposition rows: {len(rows)}")
        for row in rows:
            disp = row["disposition"]
            if disp == "defer":
                tpath = ticket_path_from_note(row["note"])
                if not tpath:
                    errors.append(
                        f"{row['id']}: defer with no ticket path — {row['note']!r}"
                    )
                    continue
                rel = tpath.relative_to(ROOT).as_posix()
                if not tpath.is_file():
                    errors.append(f"{row['id']}: defer ticket missing: {rel}")
                    continue
                status = read_status(tpath)
                if status not in ("open", "claimed"):
                    errors.append(
                        f"{row['id']}: {rel} has Status: {status!r} "
                        f"(defer tickets must be open|claimed)"
                    )
                else:
                    print(f"  ok  {row['id']}: defer -> {rel} ({status})")
            elif disp in ("fixed", "wontfix"):
                print(f"  ok  {row['id']}: {disp}")
            else:
                errors.append(f"{row['id']}: unknown disposition {disp!r}")

    phase_m = PHASE_BRANCH_RE.match(branch)
    if phase_m:
        phase = phase_m.group(1).lower()
        blockers = open_blockers_for_phase(phase)
        if blockers:
            print(f"\nopen tickets with Blocks: {phase}:")
            for path, title in blockers:
                print(f"  - {path.relative_to(ROOT).as_posix()} — {title}")
            if not ack_open_blockers:
                errors.append(
                    f"{len(blockers)} open Blocks: {phase} ticket(s). "
                    f"Close/re-block them, or merge with --ack-open-blockers "
                    f"to proceed consciously."
                )
            else:
                print("  (--ack-open-blockers: proceeding with these still open)")
        else:
            print(f"\nno open Blocks: {phase} tickets")

    if errors:
        print(file=sys.stderr)
        for e in errors:
            print(f"FAIL: {e}", file=sys.stderr)
        return 1

    print("\nmerge-ready: ok")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--ack-open-blockers",
        action="store_true",
        help="on phase-N/*: allow merging while Blocks: phase-N tickets are still open",
    )
    ap.add_argument("--list-only", action="store_true")
    ap.add_argument("--review", type=Path)
    ap.add_argument("--branch")
    args = ap.parse_args()

    if args.list_only:
        rows = list_open_carry_forward()
        if not rows:
            print("no open carry-forward tickets")
            return 0
        print(f"{'status':<10} {'blocks':<12} {'blocked by':<40} path")
        for path, status, blocks, blocked_by in rows:
            # Keep the table readable: truncate long Blocked by lines.
            bb = blocked_by if len(blocked_by) <= 40 else blocked_by[:37] + "..."
            print(
                f"{status:<10} {blocks:<12} {bb:<40} "
                f"{path.relative_to(ROOT).as_posix()}"
            )
        return 0

    return check(
        branch=args.branch,
        review=args.review,
        ack_open_blockers=args.ack_open_blockers,
    )


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
