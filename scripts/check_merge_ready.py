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

Every branch: open tickets that name a source file this branch actually
changed are listed as "possibly relevant". This is the answer to tickets
piling up beside a merge instead of being addressed in it. `Blocks: phase-N`
only fires on phase-N/* branches and only when someone remembered to write
the line; most review tickets are born on feat/* and fix/* branches and carry
no Blocks: at all, so they were invisible to every gate. Relevance here is
inferred from diff overlap, so it needs no new tagging.

WARN ONLY -- this never fails the merge today. It prints so the real hit rate
can be watched before it is allowed to stop anyone. See
`relevant_tickets_are_blocking` for the one-line flip to blocking.

Self-tests for the pure functions (no git, no network):

    python scripts/check_merge_ready.py --self-test
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEWS = ROOT / "docs" / "reviews"
CARRY = ROOT / ".scratch" / "carry-forward" / "issues"

# A cell is anything but an unescaped pipe. `\|` inside a cell is content --
# `feat-drift-warner-proven.md:209` writes `pnpm verify 2>&1 \| wc -l` in a
# note, and `fix-worn-item-pool-coverage.md:203` is a `defer` whose escaped
# pipe sits before its ticket path. Under a `[^|]`-only cell both rows failed
# the pattern outright and vanished, taking the ticket path with them.
_CELL = r"(?:\\\||[^|])"

# The disposition cell carries no word list. A row whose third cell is
# anything else used to fail the whole pattern and disappear silently, which
# made the `unknown disposition` branch unreachable from a table (ticket 381):
# one mistyped row among good ones was invisible, and `deferred` -- the
# natural English spelling -- is exactly that mistake. Parse permissively,
# then validate against DISPOSITIONS so the word is named in a failure.
# Leading and trailing whitespace are tolerated because Markdown renders an
# indented table as a normal one. The row pattern used to demand `^\|` while
# the candidate scan allowed `^\s*\|`, so an indented row counted toward the
# denominator, matched neither list, and slipped through the all-clean branch
# as `merge-ready: ok` -- the silent drop this file exists to end, reintroduced
# by the fix for it.
DISPOSITION_RE = re.compile(
    rf"^[ \t]*\|\s*({_CELL}+?)\s*\|\s*({_CELL}+?)\s*\|\s*({_CELL}+?)\s*\|\s*({_CELL}*?)\s*\|[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)

# Every `## Disposition` section, not just the first, and headings carrying
# trailing text (`## Disposition (round 3)`) included. `re.search` on an
# anchor demanding a bare heading read one section and skipped the rest --
# tickets 85 and 381. A reviewer who appended a second table got a green gate
# over rows nobody checked, which is the dangerous direction to be wrong in.
SECTION_RE = re.compile(r"(?ms)^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)")

# A heading at any level whose text starts with `Disposition`. `SECTION_RE`
# only sees level 2, so this is the census that makes a `### Disposition` or a
# `## Dispositions` visible instead of silently contributing no rows. All 68
# such headings in `docs/reviews/` are level 2 today, so this fires on nothing
# now and catches the shape that would otherwise vanish.
DISPOSITION_HEADING_RE = re.compile(r"(?im)^\s{0,3}#{1,6}\s+Disposition\b")

ROW_SHAPED_RE = re.compile(r"(?m)^\s*\|.*\|\s*$")
# Bold (`**Status:** open`) and plain (`Status: open`) both parse: tickets 88
# and 89 used the bold form and the anchored pattern missed them, so both
# reported as having no status and vanished from the open count and from
# `pnpm issues:open` (ticket 147). A ticket the tooling cannot see cannot block
# a merge -- silent under-reporting, the same shape as open ticket 85.
STATUS_RE = re.compile(r"(?im)^\s*\*{0,2}Status:\*{0,2}\s*(\S+)")
# `blocked` is a sub-state of open -- work waiting on a named human, not a
# merge veto. Every scan that lists or gates on open/claimed includes it:
# hiding a ticket from the tooling is how 85, 88/89 and 147 rotted, and
# merge-veto power lives in `Blocks:`, not in the status word.
OPEN_STATUSES = ("open", "claimed", "blocked")
KNOWN_STATUSES = ("open", "claimed", "blocked", "closed", "resolved", "wontfix")

# The whole accepted disposition vocabulary. Three words, and there is no
# fourth: a Disposition row disposes of a *finding* -- fixed it, ticketed it,
# or waived it. "This axis found nothing" disposes of nothing, because there
# was no finding; it is the absence of an input, not a fourth outcome. An axis
# with no findings contributes no row and says so in its own prose.
#
# A concern that was raised and then checked and found not to be a defect IS a
# finding: it is `wontfix` with the reason.
DISPOSITIONS = ("fixed", "defer", "wontfix")
BLOCKS_RE = re.compile(r"(?im)^\s*Blocks:\s*(.+)$")
BLOCKED_BY_RE = re.compile(r"(?im)^\s*Blocked by:\s*(.+)$")
PHASE_BRANCH_RE = re.compile(r"^(phase-\d+)", re.IGNORECASE)

# ---------------------------------------------------------------------------
# Relevant-ticket check (warn only)
# ---------------------------------------------------------------------------

# THE FLIP: set this to True to make possibly-relevant tickets fail the merge
# the way `Blocks: phase-N` does. That is the whole change -- `check()` already
# routes the message to `errors` when this is on. Do not flip it until the
# printed hit rate has been watched on real merges for a while: this check
# infers relevance from a diff, so it will name tickets that only *mention* a
# file in passing, and blocking on those would train people to reach for an
# --ack flag by reflex, which is how `Blocks:` stopped being read.
relevant_tickets_are_blocking = False

# The integration branch. `merge_to_dev.py` hard-codes `dev` as the only door
# into the repo (`git checkout dev && git merge --no-ff <branch>`), so the diff
# that matters is this branch against its merge base with dev.
INTEGRATION_BRANCH = "dev"

# Directories that hold this repo's own source. Anchoring on a known set keeps
# prose like "see the rank.ts change" or a bare `sim.ts` from being read as a
# path -- an unanchored `\S+\.ts` matches most of a sentence.
SOURCE_TOP_DIRS = (
    "packages",
    "scripts",
    "src",
    "test",
    "ui",
    "data",
    "docs",
    "apps",
    "tools",
    "experiments",
)
SOURCE_EXTS = ("ts", "tsx", "py", "go", "js", "jsx", "mjs", "cjs", "mts", "cts")

# A path is <known top dir>/<anything pathlike>.<known source ext>, optionally
# written with a `./` or `/` prefix.
#
# The leading guard stops `.scratch/foo/scripts/x.py` and
# `vendor/tbc-new-fork/ui/core/sim.ts` matching on their tail: a ticket that
# means the vendored copy is not talking about a file this repo can change.
# The guard rejects `/` and `.`, so an ordinary `./scripts/x.py` was being
# dropped along with them -- silent under-reporting, the failure mode this
# file has been bitten by twice. The optional prefix group takes `./` and `/`
# back, and is stripped from the result so both spellings intersect the diff.
TICKET_PATH_RE = re.compile(
    r"(?<![\w./-])(?:\./|/)?(?P<path>(?:" + "|".join(SOURCE_TOP_DIRS) + r")/"
    r"[\w./-]*?\.(?:" + "|".join(SOURCE_EXTS) + r"))\b"
)

# A heading whose section describes work already done, or logs what people
# tried. Paths under one are history, repro commands and stack traces -- not a
# statement of what still needs fixing.
#
# The word list comes from the headings this repo's open tickets actually use,
# not from a guess. Trailing text is allowed because the real headings carry
# dates (`## Progress 2026-08-06`).
#
# `comments` is deliberately absent. Ticket 212 keeps its chosen design and a
# current acceptance decision under `## Comments`, so treating that heading as
# closed would hide live work.
CLOSED_SECTION_RE = re.compile(
    r"(?im)^(?P<hashes>\s{0,3}#{1,6})\s*"
    r"(?:resolution|resolved|progress|answer|outcome)\b"
)

# Any markdown heading, for finding where a closed section ends.
ANY_HEADING_RE = re.compile(r"(?m)^\s{0,3}(?P<hashes>#{1,6})\s")


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


@dataclass
class DispositionScan:
    """What every `## Disposition` section in a review file contains.

    `rows` is what the gate validates. The rest is what makes an under-read
    *visible*: `disposition rows: 9` reads identically whether it is 9 of 9 or
    9 of 61, and that ambiguity is how tickets 85 and 381 stayed open. A
    denominator plus the lines that did not parse turns a silent skip into a
    failure naming a line number.
    """

    rows: list[dict] = field(default_factory=list)
    sections: int = 0
    header_rows: int = 0
    candidates: int = 0
    unparsed: list[tuple[int, str]] = field(default_factory=list)
    disposition_headings: int = 0


def _row_cells(line: str) -> list[str]:
    """Cells of a pipe line, split on unescaped `|` only. See `_CELL`."""
    return [p.strip() for p in re.split(r"(?<!\\)\|", line.strip())[1:-1]]


def _is_header_or_separator(cells: list[str]) -> bool:
    """Neither is a finding, so neither counts toward the denominator."""
    if not cells:
        return True
    if cells[0].lower() in ("id", "---"):
        return True
    return all(c and set(c) <= {"-", ":"} for c in cells)


def scan_disposition(text: str) -> DispositionScan:
    """Every Disposition section's rows, plus what did not parse.

    Rows are concatenated across sections: a second `## Disposition (round 3)`
    table is part of the same review and its `defer` rows bind the same way.

    A row-shaped line the row pattern cannot read becomes an `unparsed` entry
    with its 1-based line number rather than disappearing. That is the whole
    point -- a 3- or 5-column table is exactly what a human reads as rows and
    what the parser cannot, so it must fail loudly instead of counting zero.
    """
    text = text.replace("\r\n", "\n")
    scan = DispositionScan()
    scan.disposition_headings = len(DISPOSITION_HEADING_RE.findall(text))

    for m in SECTION_RE.finditer(text):
        scan.sections += 1
        body = m.group(1)
        line_offset = text[: m.start(1)].count("\n")

        for match in DISPOSITION_RE.finditer(body):
            fid, axis, disp, note = (g.strip() for g in match.groups())
            # One classifier, shared with the candidate walk below. These were
            # two separately-worded rules and they disagreed: a row this loop
            # skipped could be a line the walk thought parseable, so it landed
            # in neither list and disappeared.
            if _is_header_or_separator([fid, axis, disp, note]):
                continue
            scan.rows.append(
                {"id": fid, "axis": axis, "disposition": disp.lower(), "note": note}
            )

        # Walk the body by line rather than searching for each matched line's
        # text: two identical rows in one section (a repeated separator, or a
        # row duplicated across rounds) both resolve to the first occurrence
        # under `str.index`, so a FAIL would name the wrong line -- the exact
        # "message names the wrong cause" defect this reporting exists to end.
        for offset, raw in enumerate(body.split("\n")):
            if not ROW_SHAPED_RE.match(raw):
                continue
            line_no = line_offset + offset + 1
            cells = _row_cells(raw)
            if _is_header_or_separator(cells):
                if cells and cells[0].lower() == "id":
                    scan.header_rows += 1
                continue
            scan.candidates += 1
            if not DISPOSITION_RE.match(raw.strip()):
                scan.unparsed.append((line_no, raw.strip()))

    return scan


def parse_disposition(text: str) -> list[dict]:
    return scan_disposition(text).rows


def invalid_disposition_rows(rows: list[dict]) -> list[dict]:
    """Rows whose disposition is not one of the three accepted words.

    Pure -- no git, no IO. An empty or whitespace-only cell counts as invalid
    rather than as a quiet pass: the row pattern accepts a whitespace-only
    cell, so stripping it to nothing must not read as "no objection".
    """
    return [r for r in rows if r["disposition"].strip() not in DISPOSITIONS]


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


def read_status(path: Path | None = None, path_text: str | None = None) -> str | None:
    """Status of a ticket, from a path or from text already in hand.

    `path_text` exists so the relevant-ticket scan can read each ticket once
    instead of once for the status and again for the body. Existing callers
    pass a path positionally and are unaffected.
    """
    if path_text is None:
        if path is None:
            raise ValueError("read_status needs a path or path_text")
        path_text = path.read_text(encoding="utf-8", errors="replace")
    m = STATUS_RE.search(path_text)
    return m.group(1).lower().strip("*_`") if m else None


def unparseable_status_tickets() -> list[tuple[Path, str]]:
    """Tickets whose status cannot be read, or reads as something unknown.

    The widened pattern above fixes the two formats that exist today; this is
    what stops the next unusual one disappearing the same way. Treating an
    unreadable status as absent is what made tickets 88 and 89 invisible to
    every gate that consumes them, so it is an error rather than a shrug.
    """
    bad = []
    for path in iter_issue_files():
        status = read_status(path)
        if status is None:
            bad.append((path, "no Status: line found"))
        elif status not in KNOWN_STATUSES:
            bad.append((path, f"unknown status {status!r}"))
    return bad


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
        if status_m.group(1).lower().strip("*_`") not in OPEN_STATUSES:
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


def extract_ticket_paths(ticket_text: str) -> set[str]:
    """Source file paths a ticket names, as posix strings. Pure -- no git, no IO.

    Deliberately generous. Under-reporting is the failure mode this file keeps
    getting bitten by (tickets 88/89 vanishing, ticket 147): a ticket the gate
    cannot see cannot warn about anything, whereas a ticket named in error
    costs one glance to dismiss -- which is why the report prints the matched
    path next to every hit.

    Not filtered:

    - Paths inside fenced code blocks or in a `python scripts/foo.py` repro
      command. Half of those are the ticket's real subject and the other half
      are how you reproduce it, and nothing in the text separates the two.
    - Paths that no longer exist on disk. A ticket about a file that a branch
      *deletes* is exactly the relevant case.

    Filtered: elided paths (`ui/.../upgrades_tab.tsx`). The `...` is prose
    standing in for a directory nobody wanted to type; it matches no real file.

    Filtered: Resolution/Progress/Answer sections, which say where a fix
    already landed. Each such section is cut only as far as the next heading
    at the same level or higher -- NOT to the end of the file. Truncating the
    tail looked simpler and was wrong: ticket 156 opens a mid-ticket aside at
    line 39 of 910 and keeps its unmet acceptance criteria below it, so a
    tail cut discarded the ticket's own live work. Under-reporting is the
    failure this file keeps getting bitten by; a section skip cannot swallow
    anything that comes after the section ends.
    """
    return {p for p in TICKET_PATH_RE.findall(open_body(ticket_text)) if "/..." not in p}


def open_body(ticket_text: str) -> str:
    """`ticket_text` with each closed section removed. Pure -- no git, no IO.

    A closed section runs from its heading to the next heading at the same
    level or higher. A deeper heading inside it (a dated `### 2026-08-14`
    under `## Progress`) belongs to the section and goes with it.
    """
    out = []
    pos = 0
    for m in CLOSED_SECTION_RE.finditer(ticket_text):
        if m.start() < pos:
            continue
        out.append(ticket_text[pos : m.start()])
        level = len(m.group("hashes").strip())
        pos = len(ticket_text)
        for nxt in ANY_HEADING_RE.finditer(ticket_text, m.end()):
            if len(nxt.group("hashes")) <= level:
                pos = nxt.start()
                break
    out.append(ticket_text[pos:])
    return "\n".join(out)


def relevant_paths(changed_files: set[str], ticket_paths: set[str]) -> list[str]:
    """Which of a ticket's paths the branch touched. Pure -- no git, no IO.

    Set intersection, so cost is O(len(ticket_paths)) per ticket rather than
    anything walking the diff; the diff is hashed once by the caller.

    Both sides are normalised to posix. `git diff --name-only` already emits
    forward slashes on Windows, but tickets are handwritten and a Windows
    backslash in one would otherwise silently never match.

    Matching is case-insensitive. Windows and macOS filesystems are, so a
    ticket writing `Packages/Core/Src/Rank.ts` means the same file git reports
    as `packages/core/src/rank.ts`. Comparing raw strings dropped that match
    silently. The reported path is the one git used, not the ticket's casing.

    Two changed files differing only by case both get reported. Keeping one
    and dropping the other would under-report a file the branch really did
    change, which is the failure this file guards against hardest.
    """
    by_fold: dict[str, list[str]] = {}
    for changed in changed_files:
        by_fold.setdefault(changed.replace("\\", "/").casefold(), []).append(changed)
    hits = set()
    for p in ticket_paths:
        hits.update(by_fold.get(p.replace("\\", "/").casefold(), ()))
    return sorted(hits)


def changed_files_vs_integration(
    branch: str, integration: str = INTEGRATION_BRANCH
) -> tuple[set[str], str | None]:
    """Files this branch changed since it forked from the integration branch.

    Returns (changed files, reason it could not be determined). Read-only: a
    `git merge-base` and a `git diff --name-only`, nothing that writes a ref,
    an index or an object.

    Diffing against the merge base rather than the branch tip is what keeps
    this honest -- a plain `git diff dev` would also list every file that
    changed *on dev* since the fork, and blame this branch for all of them.

    Every failure degrades to a reason string. This is a warn-only advisory
    bolted onto a gate people rely on; it must never be the thing that stops a
    merge working, least of all in a detached HEAD or a fresh clone with no
    local `dev`.
    """
    if not branch:
        return set(), "no current branch (detached HEAD?)"
    if branch == integration:
        return set(), f"already on {integration}"

    try:
        base = subprocess.run(
            ["git", "merge-base", integration, branch],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
    except OSError as exc:  # git missing from PATH entirely
        return set(), f"could not run git: {exc}"
    if base.returncode != 0 or not base.stdout.strip():
        # Most often: no local `dev` (fresh clone that only fetched main), or
        # the branch and dev share no history.
        return set(), (
            f"no merge base between {integration} and {branch} "
            f"(is there a local {integration}?)"
        )

    diff = subprocess.run(
        ["git", "diff", "--name-only", base.stdout.strip(), branch],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if diff.returncode != 0:
        return set(), f"git diff failed: {diff.stderr.strip()}"

    return {ln.strip() for ln in diff.stdout.splitlines() if ln.strip()}, None


def relevant_open_tickets(
    changed_files: set[str],
) -> list[tuple[Path, str, list[str]]]:
    """Open/claimed tickets naming a file in `changed_files`.

    (path, title, matched paths) so the report can show *why* each one matched.
    """
    found = []
    for path in iter_issue_files():
        text = path.read_text(encoding="utf-8", errors="replace")
        status = read_status(path_text=text)
        if status not in OPEN_STATUSES:
            continue
        matched = relevant_paths(changed_files, extract_ticket_paths(text))
        if not matched:
            continue
        title = next(
            (ln.strip("# ").strip() for ln in text.splitlines() if ln.strip()),
            path.name,
        )
        found.append((path, title, matched))
    return found


def list_open_carry_forward() -> list[tuple[Path, str, str, str]]:
    out = []
    if not CARRY.is_dir():
        return out
    for path in sorted(CARRY.glob("*.md")):
        status = read_status(path) or "?"
        if status not in OPEN_STATUSES:
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
    scan = scan_disposition(text)
    rows = scan.rows

    denominator = (
        f"disposition rows: {len(rows)} parsed of {scan.candidates} "
        f"row-shaped lines in {scan.sections} section(s)"
    )

    # See scan_disposition's docstring on why an unparsed row is reported by
    # line number rather than counted as zero.
    for line_no, raw in scan.unparsed:
        errors.append(f"line {line_no}: disposition row not parsed — {raw!r}")

    # See DISPOSITION_HEADING_RE.
    if scan.disposition_headings > scan.sections:
        errors.append(
            f"{scan.disposition_headings} heading(s) start with 'Disposition' "
            f"but only {scan.sections} '## Disposition' section(s) were parsed"
        )

    # A candidate that reached neither list is a row nobody checked. The
    # denominator would show it (`0 parsed of 1`) and every other branch would
    # still pass, so say it outright rather than trusting a reader to notice.
    leaked = scan.candidates - len(rows) - len(scan.unparsed)
    if leaked > 0:
        errors.append(
            f"{leaked} row-shaped line(s) were neither parsed nor reported — "
            f"{scan.candidates} candidate(s), {len(rows)} parsed, "
            f"{len(scan.unparsed)} reported unparsed"
        )

    if scan.sections == 0:
        errors.append(
            "review has no ## Disposition section "
            f"(rows: {'|'.join(DISPOSITIONS)}; defer must link a ticket path)"
        )
    elif scan.header_rows == 0:
        # The header row is the only signal separating "the author had nothing
        # to report" from "the author forgot the table". Keeping it mandatory
        # is what preserves the missing-table check; the template always writes
        # it, so an all-clean review costs its author nothing.
        errors.append(
            "## Disposition section has no table — write the header row "
            "(`| ID | Axis | Disposition | Ticket / note |`) and its separator "
            "even when there are no findings"
        )
    elif not rows and not scan.unparsed and scan.candidates == 0:
        # Every axis clean. A row disposes of a finding, so no findings means
        # no rows -- that is a pass, not an empty table to complain about.
        print(f"{denominator} (no findings)")
    else:
        print(denominator)
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
                if status not in OPEN_STATUSES:
                    errors.append(
                        f"{row['id']}: {rel} has Status: {status!r} "
                        f"(defer tickets must be open|claimed)"
                    )
                else:
                    print(f"  ok  {row['id']}: defer -> {rel} ({status})")
            elif disp in DISPOSITIONS:
                print(f"  ok  {row['id']}: {disp}")
            else:
                errors.append(
                    f"{row['id']}: unknown disposition {disp!r} "
                    f"(accepted: {', '.join(DISPOSITIONS)})"
                )

    unparseable = unparseable_status_tickets()
    if unparseable:
        print("\ntickets with an unreadable Status:")
        for path, why in unparseable:
            rel = path.relative_to(ROOT).as_posix()
            print(f"  - {rel} — {why}")
            errors.append(f"{rel}: {why} (a ticket the gate cannot read cannot block a merge)")

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

    # Possibly-relevant tickets: runs on EVERY branch, not just phase-N/*.
    # feat/* and fix/* branches are where most review tickets are born and
    # where none of them carry a `Blocks:` line, so this is the only check
    # that sees them.
    changed, why_not = changed_files_vs_integration(branch)
    if why_not:
        # Never an error while this is advisory -- say what is not known and
        # carry on, rather than failing a merge over a git state question.
        print(f"\nrelevant-ticket check skipped: {why_not}")
    else:
        relevant = relevant_open_tickets(changed)
        print(
            f"\nchanged vs {INTEGRATION_BRANCH} merge base: {len(changed)} file(s)"
        )
        if relevant:
            print(f"open tickets naming a file this branch changed ({len(relevant)}):")
            for path, title, matched in relevant:
                print(f"  - {path.relative_to(ROOT).as_posix()} — {title}")
                for hit in matched:
                    print(f"      matched: {hit}")
            note = (
                f"{len(relevant)} open ticket(s) name a file this branch "
                f"changed. Address them in this branch, or judge them "
                f"irrelevant and merge."
            )
            if relevant_tickets_are_blocking:
                errors.append(note)
            else:
                # Warn only. Flip `relevant_tickets_are_blocking` to change it.
                print(f"  WARN: {note}")
                print("  (advisory only — this does not block the merge)")
        else:
            print("no open tickets name a file this branch changed")

    if errors:
        print(file=sys.stderr)
        for e in errors:
            print(f"FAIL: {e}", file=sys.stderr)
        return 1

    print("\nmerge-ready: ok")
    return 0


# ---------------------------------------------------------------------------
# Self-tests for the pure functions.
#
# Follows the check_lock_merge.py / check_sync_wowsims.py convention -- a
# tuple of small checks returning problem strings, not a pytest suite (this
# repo has no pytest infra). Only the pure halves are covered:
# `extract_ticket_paths` and `relevant_paths` take text and sets, so they need
# no branch, no repo state and no git.
#
#     python scripts/check_merge_ready.py --self-test
# ---------------------------------------------------------------------------


def check_extracts_common_paths() -> list[str]:
    text = (
        "The bug is in `packages/core/src/rank.ts` and its test\n"
        "packages/core/test/rank.test.ts. Repro: python scripts/foo.py\n"
    )
    got = extract_ticket_paths(text)
    want = {
        "packages/core/src/rank.ts",
        "packages/core/test/rank.test.ts",
        "scripts/foo.py",
    }
    return [] if got == want else [f"extract: got {sorted(got)}, want {sorted(want)}"]


def check_extracts_all_source_extensions() -> list[str]:
    text = "scripts/a.py scripts/b.mjs packages/c.tsx packages/d.go ui/e.js"
    got = extract_ticket_paths(text)
    if len(got) != 5:
        return [f"extensions: expected 5 paths, got {sorted(got)}"]
    return []


def check_ignores_prose_and_bare_filenames() -> list[str]:
    """A bare `rank.ts` is prose, not a path -- matching it would flag every
    ticket that merely discusses a file by name."""
    text = "The change to rank.ts broke sim.ts; see the report.md for detail."
    got = extract_ticket_paths(text)
    return [] if not got else [f"prose: expected no paths, got {sorted(got)}"]


def check_ignores_elided_paths() -> list[str]:
    """Ticket 156 writes `ui/.../upgrades_tab.tsx`; the `...` is prose."""
    got = extract_ticket_paths("see `ui/.../upgrades_tab.tsx` for the tab")
    return [] if not got else [f"elided: expected no paths, got {sorted(got)}"]


def check_ignores_nested_and_vendored_copies() -> list[str]:
    """A path under .scratch/ or vendor/ is not a file this repo can change,
    and must not match on its tail (`vendor/x/ui/core/sim.ts` -> ui/core/...).
    vendor/ is gitignored here, so it never appears in a diff anyway."""
    text = (
        ".scratch/set-bonus-value/loop/sim_meta.py\n"
        "vendor/tbc-new-fork/ui/core/sim.ts\n"
    )
    got = extract_ticket_paths(text)
    return [] if not got else [f"nested: expected no paths, got {sorted(got)}"]


def check_relevance_matches_only_on_overlap() -> list[str]:
    changed = {"packages/core/src/rank.ts", "scripts/assemble_universe.py"}
    hit = relevant_paths(changed, {"packages/core/src/rank.ts", "ui/core/sim.ts"})
    if hit != ["packages/core/src/rank.ts"]:
        return [f"relevance: expected the rank.ts hit, got {hit}"]
    miss = relevant_paths(changed, {"packages/core/src/view.ts"})
    if miss:
        return [f"relevance: expected no hit for an untouched file, got {miss}"]
    return []


def check_relevance_reports_every_matched_path() -> list[str]:
    """The report shows why a ticket matched, so all overlaps must come back,
    sorted -- not just the first."""
    changed = {"a/x.ts", "packages/core/src/rank.ts", "scripts/foo.py"}
    got = relevant_paths(changed, {"scripts/foo.py", "packages/core/src/rank.ts"})
    want = ["packages/core/src/rank.ts", "scripts/foo.py"]
    return [] if got == want else [f"matched: got {got}, want {want}"]


def check_relevance_normalises_windows_separators() -> list[str]:
    """Tickets are handwritten; a backslash path must still match a diff."""
    got = relevant_paths({"packages/core/src/rank.ts"}, {"packages\\core\\src\\rank.ts"})
    return [] if got == ["packages/core/src/rank.ts"] else [f"winsep: got {got}"]


def check_extract_takes_dot_slash_prefix() -> list[str]:
    """`./scripts/x.py` and `/scripts/x.py` are the same file as `scripts/x.py`.

    The guard that rejects `.scratch/.../scripts/x.py` also rejected these two
    spellings, so a ticket writing either was silently invisible to the gate.
    """
    bad = []
    for text in ("./scripts/foo.py", "/scripts/foo.py", "scripts/foo.py"):
        got = extract_ticket_paths(text)
        if got != {"scripts/foo.py"}:
            bad.append(f"prefix: {text!r} gave {sorted(got)}")
    return bad


def check_extract_still_rejects_nested_copies() -> list[str]:
    """The `./` fix must not reopen the vendored/scratch tail-match hole."""
    bad = []
    for text in (
        ".scratch/wt-x/scripts/foo.py",
        "vendor/tbc-new-fork/ui/core/sim.ts",
    ):
        got = extract_ticket_paths(text)
        if got:
            bad.append(f"nested: {text!r} should match nothing, gave {sorted(got)}")
    return bad


def check_relevance_ignores_case() -> list[str]:
    """Windows and macOS filesystems are case-insensitive; matching must be too.

    The reported path is git's, not the ticket's, so the hit lines up with the
    diff a reader is about to look at.
    """
    got = relevant_paths({"packages/core/src/rank.ts"}, {"Packages/Core/Src/Rank.ts"})
    return [] if got == ["packages/core/src/rank.ts"] else [f"case: got {got}"]


def check_extract_skips_resolution_sections() -> list[str]:
    """Paths under a Resolution heading are where a fix landed, not open work.

    Every false positive measured on `feat/candidate-pool` (tickets 45, 156,
    214) came from one of these sections. Prose above the heading still counts.
    """
    text = (
        "Broken in packages/core/src/rank.ts\n"
        "## Resolution\n"
        "Fixed in scripts/already_done.py\n"
    )
    got = extract_ticket_paths(text)
    if got != {"packages/core/src/rank.ts"}:
        return [f"resolution: got {sorted(got)}"]
    if extract_ticket_paths("### Progress\nscripts/x.py"):
        return ["resolution: a Progress heading must close the ticket body too"]
    return []


def check_closed_section_does_not_swallow_the_rest() -> list[str]:
    """A closed section ends at the next same-or-higher heading, not at EOF.

    Ticket 156 opens `## Fixed along the way` at line 39 of 910 and keeps its
    unmet acceptance criteria below it. Cutting to end-of-file discarded the
    ticket's own live work -- silent under-reporting, the failure this file
    has been bitten by twice.
    """
    text = (
        "## Progress 2026-08-06\n"
        "landed in scripts/history.py\n"
        "### 2026-08-07 worker log\n"
        "also touched scripts/deeper.py\n"
        "## Acceptance criteria\n"
        "- [ ] fix packages/core/src/rank.ts\n"
    )
    got = extract_ticket_paths(text)
    if got != {"packages/core/src/rank.ts"}:
        return [f"section skip: got {sorted(got)}, want the acceptance path only"]
    return []


def check_comments_heading_stays_open() -> list[str]:
    """`## Comments` is a live decision log here, not a closing section.

    Ticket 212 records its chosen design and an acceptance decision under
    `## Comments`, so treating that heading as closed would hide open work.
    """
    got = extract_ticket_paths("## Comments\nplan: change packages/core/src/rank.ts\n")
    return [] if got == {"packages/core/src/rank.ts"} else [f"comments: got {sorted(got)}"]


def check_relevance_reports_every_case_variant() -> list[str]:
    """Two diff entries differing only by case must both be reported."""
    got = relevant_paths(
        {"packages/core/src/rank.ts", "packages/Core/src/rank.ts"},
        {"packages/core/src/rank.ts"},
    )
    want = ["packages/Core/src/rank.ts", "packages/core/src/rank.ts"]
    return [] if got == want else [f"case collision: got {got}, want {want}"]


def check_relevance_empty_sides_are_safe() -> list[str]:
    if relevant_paths(set(), {"packages/core/src/rank.ts"}):
        return ["empty diff must match nothing"]
    if relevant_paths({"packages/core/src/rank.ts"}, set()):
        return ["ticket with no paths must match nothing"]
    return []


def check_status_reads_from_text() -> list[str]:
    """Both Status forms must parse from text, same as from a path -- this is
    the bold-status bug (tickets 88/89, 147) reaching the new scan."""
    if read_status(path_text="**Status:** open\n\n# t") != "open":
        return ["read_status(path_text=) must parse the bold form"]
    if read_status(path_text="Status: claimed\n\n# t") != "claimed":
        return ["read_status(path_text=) must parse the plain form"]
    return []



def check_blocked_is_a_known_open_status() -> list[str]:
    """`blocked` must parse and must scan as open; unknown words must not.

    A ticket the gates cannot see cannot block anything (85, 88/89, 147), so
    `blocked` joins the open scans rather than hiding from them -- while the
    strictness that makes an unreadable status an error stays put.
    """
    if read_status(path_text="Status: blocked\n\n# t") != "blocked":
        return ["read_status must parse `Status: blocked`"]
    if "blocked" not in KNOWN_STATUSES:
        return ["`blocked` must be a known status"]
    if "blocked" not in OPEN_STATUSES:
        return ["`blocked` must scan as open -- it is a sub-state of open"]
    if "reopened?" in KNOWN_STATUSES:
        return ["unknown words must stay unknown"]
    return []


def check_bold_status_value_strips_to_a_known_word() -> list[str]:
    """A bold *value* (`Status: **blocked**`) must reach the membership tests
    stripped. `open_blockers_for_phase` read the raw group and would have
    silently dropped such a ticket from the phase gate (review F9)."""
    text = "Status: **blocked**\n\n# t"
    if read_status(path_text=text) != "blocked":
        return ["read_status must strip a bold status value"]
    raw = STATUS_RE.search(text)
    if raw is None:
        return ["STATUS_RE must match a bold status value"]
    if raw.group(1).lower().strip("*_`") not in OPEN_STATUSES:
        return ["a bold status value must survive the phase-gate test"]
    return []

_HEADER = "| ID | Axis | Disposition | Ticket / note |\n| --- | --- | --- | --- |\n"


def check_disposition_reads_every_section() -> list[str]:
    """Rows live in every `## Disposition` section, not just the first.

    Ticket 85: `re.search` read one section and skipped the rest, so a
    reviewer who appended a second table got a green gate over rows nobody
    checked.
    """
    text = (
        "## Disposition\n\n" + _HEADER + "| A1 | Adversarial | fixed | one |\n"
        "\n## Notes\n\n"
        "## Disposition\n\n" + _HEADER + "| A2 | Adversarial | wontfix | two |\n"
    )
    scan = scan_disposition(text)
    if scan.sections != 2:
        return [f"sections: got {scan.sections}, want 2"]
    ids = [r["id"] for r in scan.rows]
    return [] if ids == ["A1", "A2"] else [f"sections: got rows {ids}"]


def check_disposition_heading_with_trailing_text() -> list[str]:
    """`## Disposition (round 3)` is a Disposition section.

    The old anchor demanded a bare heading, so a round-numbered one matched
    nothing at all -- the whole table was invisible rather than merely
    unparsed.
    """
    text = "## Disposition (round 3)\n\n" + _HEADER + "| R3 | Domain | defer | t |\n"
    scan = scan_disposition(text)
    if scan.sections != 1:
        return [f"trailing heading: got {scan.sections} section(s), want 1"]
    ids = [r["id"] for r in scan.rows]
    return [] if ids == ["R3"] else [f"trailing heading: got rows {ids}"]


def check_single_typo_row_is_reported() -> list[str]:
    """One mistyped word among good rows is the silent case (ticket 381).

    `deferred` is the natural English spelling and does not match `defer`. It
    must parse as a row and then be named invalid -- not vanish.
    """
    text = (
        "## Disposition\n\n" + _HEADER + "| A1 | Adversarial | fixed | a |\n"
        "| A2 | Adversarial | deferred | b |\n"
        "| A3 | Domain | wontfix | c |\n"
    )
    scan = scan_disposition(text)
    if len(scan.rows) != 3:
        return [f"typo row: got {len(scan.rows)} rows, want all 3 parsed"]
    bad = [r["id"] for r in invalid_disposition_rows(scan.rows)]
    return [] if bad == ["A2"] else [f"typo row: invalid ids {bad}, want ['A2']"]


def check_all_typo_table_stays_loud() -> list[str]:
    """A wholly-broken table already failed loudly; it must keep doing so."""
    text = (
        "## Disposition\n\n" + _HEADER + "| A1 | Adversarial | nope | a |\n"
        "| A2 | Domain | nah | b |\n"
    )
    bad = [r["id"] for r in invalid_disposition_rows(scan_disposition(text).rows)]
    return [] if bad == ["A1", "A2"] else [f"all-typo: invalid ids {bad}"]


def check_five_column_table_is_counted_not_dropped() -> list[str]:
    """See scan_disposition's docstring."""
    text = (
        "## Disposition\n\n"
        "| ID | Axis | Sev | Finding | Disposition |\n"
        "| --- | --- | --- | --- | --- |\n"
        "| A1 | Adversarial | low | a thing | fixed |\n"
        "| A2 | Domain | minor | another | wontfix |\n"
    )
    scan = scan_disposition(text)
    if scan.rows:
        return [f"5-column: got {len(scan.rows)} rows, want 0"]
    if scan.candidates != 2:
        return [f"5-column: got {scan.candidates} candidates, want 2"]
    # Lines 1-2 are the heading and its blank, 3-4 the header and separator,
    # so the two body rows are 5 and 6.
    lines = [n for n, _ in scan.unparsed]
    return [] if lines == [5, 6] else [f"5-column: unparsed lines {lines}, want [5, 6]"]


def check_escaped_pipe_in_note_parses() -> list[str]:
    """`\\|` inside a cell is content, not a column break. See `_CELL`."""
    text = (
        "## Disposition\n\n" + _HEADER
        + "| A1 | Adversarial | defer | `a \\| b` — .scratch/x/issues/1-z.md |\n"
    )
    rows = scan_disposition(text).rows
    if len(rows) != 1:
        return [f"escaped pipe: got {len(rows)} rows, want 1"]
    row = rows[0]
    if row["id"] != "A1" or row["disposition"] != "defer":
        return [f"escaped pipe: got {row['id']}/{row['disposition']}"]
    return [] if "\\|" in row["note"] else [f"escaped pipe: note lost it: {row['note']!r}"]


def check_header_and_separator_are_not_candidates() -> list[str]:
    """See `_is_header_or_separator`."""
    scan = scan_disposition("## Disposition\n\n" + _HEADER)
    if scan.candidates != 0:
        return [f"header/separator: got {scan.candidates} candidates, want 0"]
    if scan.header_rows != 1:
        return [f"header/separator: got {scan.header_rows} header rows, want 1"]
    return []


def check_crlf_input_parses() -> list[str]:
    """A review file with Windows endings must read identically.

    No tracked review file has CRLF today, but nothing stops one arriving,
    and `$` would otherwise strand a `\\r` in the last cell.
    """
    text = "## Disposition\n\n" + _HEADER + "| A1 | Adversarial | fixed | note |\n"
    if scan_disposition(text).rows != scan_disposition(text.replace("\n", "\r\n")).rows:
        return ["crlf: rows differ between LF and CRLF input"]
    return []


def check_empty_disposition_cell_is_invalid() -> list[str]:
    """A whitespace-only cell must never read as "no objection".

    The row pattern accepts whitespace, so stripping it to nothing has to
    land as invalid rather than as a quiet pass.
    """
    text = "## Disposition\n\n" + _HEADER + "| X1 | Axis |   | note |\n"
    scan = scan_disposition(text)
    if not scan.rows:
        return [] if scan.unparsed else ["empty cell: neither parsed nor reported"]
    bad = [r["id"] for r in invalid_disposition_rows(scan.rows)]
    return [] if bad == ["X1"] else [f"empty cell: accepted it; invalid ids {bad}"]


def check_no_finding_spellings_are_rejected() -> list[str]:
    """There is no fourth word.

    A Disposition row disposes of a finding; "this axis found nothing"
    disposes of nothing. All four spellings the corpus reached for must fail,
    so the row is not written at all.
    """
    problems = []
    for spelling in ("n/a", "—", "no finding", "no change needed"):
        text = "## Disposition\n\n" + _HEADER + f"| S1 | Spec | {spelling} | x |\n"
        rows = scan_disposition(text).rows
        if not rows:
            problems.append(f"no-finding: {spelling!r} did not parse as a row")
            continue
        if not invalid_disposition_rows(rows):
            problems.append(f"no-finding: {spelling!r} was accepted")
    return problems


def check_all_clean_review_is_distinguishable_from_no_table() -> list[str]:
    """"Every axis clean" and "the author forgot the table" are different.

    A header with no body rows is a legitimate all-clean review and must
    pass; a heading with no table at all must still fail. The header row is
    the only signal in the file separating the two.
    """
    clean = scan_disposition("## Disposition\n\n" + _HEADER)
    if (clean.sections, clean.header_rows, clean.rows, clean.unparsed) != (1, 1, [], []):
        return [
            f"all-clean: sections={clean.sections} header_rows={clean.header_rows} "
            f"rows={len(clean.rows)} unparsed={len(clean.unparsed)}"
        ]
    bare = scan_disposition("## Disposition\n\nsome prose, no table.\n")
    if bare.sections != 1 or bare.header_rows != 0:
        return [f"no-table: sections={bare.sections} header_rows={bare.header_rows}"]
    return []


def check_indented_row_is_not_silently_dropped() -> list[str]:
    """Markdown renders an indented table normally, so the gate must too.

    The row pattern demanded `^|` while the candidate walk allowed `^\\s*|`,
    so an indented row counted toward the denominator and reached neither
    `rows` nor `unparsed` — a `defer` with no ticket passed as `ok`. Found by
    the adversarial axis of this branch's own review.
    """
    problems = []
    for label, raw in (
        ("indented", "   | A1 | Adversarial | defer | no ticket |"),
        ("trailing", "| A1 | Adversarial | defer | no ticket |   "),
    ):
        scan = scan_disposition("## Disposition\n\n" + _HEADER + raw + "\n")
        if len(scan.rows) != 1:
            problems.append(
                f"{label}: got {len(scan.rows)} rows and "
                f"{len(scan.unparsed)} unparsed, want the row parsed"
            )
    return problems


def check_every_candidate_reaches_one_list() -> list[str]:
    """No row-shaped line may fall between `rows` and `unparsed`.

    The invariant that makes the denominator trustworthy: a line counted as a
    candidate is either parsed or reported. A line in neither is invisible
    while the count still claims to have seen it.
    """
    text = (
        "## Disposition\n\n" + _HEADER
        + "| A1 | Adversarial | fixed | fine |\n"
        "   | A2 | Adversarial | defer | indented |\n"
        "| - | - | - | - | - |\n"
        "| A3 | Domain | nope | bad word |\n"
        "| B1 | Spec | x | y | five columns |\n"
    )
    scan = scan_disposition(text)
    leaked = scan.candidates - len(scan.rows) - len(scan.unparsed)
    if leaked:
        return [
            f"leak: {scan.candidates} candidates, {len(scan.rows)} parsed, "
            f"{len(scan.unparsed)} unparsed — {leaked} unaccounted"
        ]
    return []


def check_duplicate_unparsed_lines_get_distinct_numbers() -> list[str]:
    """Two identical unreadable rows must not both report the first one.

    `str.index` on the matched text collapses them; the walk is positional to
    avoid exactly this. Nothing covered it until the adversarial axis said so.
    """
    dup = "| Z1 | Adv | sev | bad | extra |"
    text = (
        "## Disposition\n\n" + _HEADER + dup + "\n"
        "| A1 | Adversarial | fixed | pad |\n" + dup + "\n"
    )
    lines = [n for n, _ in scan_disposition(text).unparsed]
    return [] if lines == [5, 7] else [f"duplicate unparsed: lines {lines}, want [5, 7]"]


CHECKS = (
    check_extracts_common_paths,
    check_extracts_all_source_extensions,
    check_ignores_prose_and_bare_filenames,
    check_ignores_elided_paths,
    check_ignores_nested_and_vendored_copies,
    check_relevance_matches_only_on_overlap,
    check_relevance_reports_every_matched_path,
    check_relevance_normalises_windows_separators,
    check_extract_takes_dot_slash_prefix,
    check_extract_still_rejects_nested_copies,
    check_relevance_ignores_case,
    check_extract_skips_resolution_sections,
    check_closed_section_does_not_swallow_the_rest,
    check_comments_heading_stays_open,
    check_relevance_reports_every_case_variant,
    check_relevance_empty_sides_are_safe,
    check_status_reads_from_text,
    check_blocked_is_a_known_open_status,
    check_bold_status_value_strips_to_a_known_word,
    check_disposition_reads_every_section,
    check_disposition_heading_with_trailing_text,
    check_single_typo_row_is_reported,
    check_all_typo_table_stays_loud,
    check_five_column_table_is_counted_not_dropped,
    check_escaped_pipe_in_note_parses,
    check_header_and_separator_are_not_candidates,
    check_crlf_input_parses,
    check_empty_disposition_cell_is_invalid,
    check_no_finding_spellings_are_rejected,
    check_all_clean_review_is_distinguishable_from_no_table,
    check_indented_row_is_not_silently_dropped,
    check_every_candidate_reaches_one_list,
    check_duplicate_unparsed_lines_get_distinct_numbers,
)


def self_test() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"check_merge_ready.py pure logic ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--ack-open-blockers",
        action="store_true",
        help="on phase-N/*: allow merging while Blocks: phase-N tickets are still open",
    )
    ap.add_argument("--list-only", action="store_true")
    ap.add_argument(
        "--self-test",
        action="store_true",
        help="run the pure-logic checks for the relevant-ticket scan and exit",
    )
    ap.add_argument("--review", type=Path)
    ap.add_argument("--branch")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

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
