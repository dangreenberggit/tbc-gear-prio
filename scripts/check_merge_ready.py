#!/usr/bin/env python3
"""
check_merge_ready.py — checks that a branch is allowed to merge to dev.

Tickets are the source of truth for deferred work. The review file is the
judgment record; its Disposition table must link every `defer` to a real
open carry-forward ticket.

Agent-tooling branches: when every file the branch changed is on
`TOOLING_PATHS`, the review file is not required, because the product review
does not apply to agent-tooling files. A review file that exists is still checked. The
ticket checks below run on every branch. A branch that deletes a ticket that
was open at the merge base needs the review file, because the deleted ticket
drops out of every ticket check (`deleted_open_tickets`).

Used by `pnpm merge-to-dev` (the only supported door into dev). Also:

    pnpm merge-ready              # check only, no merge
    pnpm issues:open              # list open carry-forward tickets

Phase-N branches: open tickets with `Blocks: phase-N` are listed. Merging
requires an explicit `--ack-open-blockers` (conscious opt-in), not a fake
"path mentioned in the review" check. Fix or re-block the ticket for real.

Every branch: a carry-forward ticket that this branch flips to `closed` or
`resolved` must have a `Verified by:` line after its Status line that names a
command, `<repo>@<sha>` or a `docs/reviews/` file, or the check fails
(docs/agents/issue-tracker.md, "Closing a ticket").

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
# A ticket flipped to one of these on a branch must say how the close was
# checked (docs/agents/issue-tracker.md, "Closing a ticket"). `wontfix` is
# left out: it records a decision not to act, which has nothing to verify.
CLOSED_STATUSES = ("closed", "resolved")
# The value may sit on the label's line or below it -- tickets 409 and 425 put
# a command block, after a blank line, under a bare `Verified by:`. It counts
# only when it names evidence in one of the three accepted forms, so the check
# needs no list of ways to be empty (ticket 624 found that list leaking twice).
VERIFIED_BY_RE = re.compile(r"(?im)^[ \t]*\*{0,2}Verified by:\*{0,2}[ \t]*(.*)$")
MARKDOWN_HEADING_RE = re.compile(r"^#{1,6}(\s|$)")
REPO_AT_SHA_RE = re.compile(r"\b[A-Za-z0-9][\w.-]*@[0-9a-f]{7,40}\b")
REVIEW_FILE_RE = re.compile(r"\bdocs/reviews/[\w.-]+\.md\b")
CODE_SPAN_RE = re.compile(r"`([^`\n]+)`")
# Backticks around a placeholder do not make it a command.
VERIFIED_BY_PLACEHOLDERS = frozenset({"todo", "tbd", "none", "n/a", "na", "pending"})
PLACEHOLDER_STRIP = " \t\r\n`*_-–—()[]<>.…?"

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

# Agent-tooling paths: the one list of files that are an exception to this
# repo's product review (AGENTS.md, "Commits and merges"). An entry ending in
# `/` covers everything under it; any other entry is one file. A branch needs
# no review file to merge when each file it changed is on this list or is the
# branch's own review file. The owner approves every change to this list.
#
# The list lives here and not in a doc under docs/agents/ because that folder
# is on the list: a branch could then widen the list and exempt itself in the
# same diff. This file is not on the list, so a change to it gets the product
# review. The list and GATE_PATHS stop a mistake, not a deliberate edit: the
# gate runs the branch's own copy of this file, so a branch that edits both
# lists here can exempt itself (ticket 733).
TOOLING_PATHS = (
    ".claude/skills/",
    ".agents/skills/",
    ".claude/agents/",
    ".agents/reviews/",
    ".claude/hooks/",
    ".claude/settings.json",
    ".claude/launch.json",
    "docs/agents/",
    "docs/workflow.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".scratch/carry-forward/issues/",
    ".scratch/carry-forward/notes/",
    ".scratch/carry-forward/plans/",
    ".scratch/carry-forward/map.md",
)

# The gate's own code. Never tooling, whatever TOOLING_PATHS says, so adding
# `scripts/` to the list by mistake cannot exempt a change to the gate.
GATE_PATHS = (
    "scripts/check_merge_ready.py",
    "scripts/merge_to_dev.py",
    "scripts/check_merge_to_dev.py",
    "scripts/check_layout_gate.py",
    "scripts/run_verify.mjs",
    ".githooks/",
    "package.json",
)

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


def closed_without_verification(old_text: str | None, new_text: str) -> bool:
    """True when a ticket flips to closed/resolved with no `Verified by:` line
    after its Status line. Pure -- no git, no IO.

    `old_text` is the ticket at the merge base, or None when the branch adds
    it. Only the flip is judged: a ticket already closed at the base predates
    the rule, and failing every branch over it would make the gate noise.
    """
    new_status = read_status(path_text=new_text)
    if new_status not in CLOSED_STATUSES:
        return False
    if old_text is not None and read_status(path_text=old_text) in CLOSED_STATUSES:
        return False
    status_m = STATUS_RE.search(new_text)
    assert status_m is not None  # new_status was read from this match
    return not any(
        _names_evidence(_verified_by_lines(new_text, m))
        for m in VERIFIED_BY_RE.finditer(new_text, status_m.end())
    )


def _names_evidence(value: list[str]) -> bool:
    """True when a `Verified by:` value holds a command (text in backticks or
    a code block), `<repo>@<sha>`, or a review file under `docs/reviews/`. A
    command that is only a placeholder word or punctuation does not count."""
    prose: list[str] = []
    commands: list[str] = []
    block: list[str] | None = None
    for line in value:
        if line.startswith("```"):
            if block is None:
                block = []
                continue
            commands.append("\n".join(block))
            block = None
        elif block is not None:
            block.append(line)
        else:
            prose.append(line)
    if block is not None:
        commands.append("\n".join(block))  # a fence the value never closed
    text = "\n".join(prose)
    commands += CODE_SPAN_RE.findall(text)
    if REPO_AT_SHA_RE.search(text) or REVIEW_FILE_RE.search(text):
        return True
    for command in commands:
        word = command.strip(PLACEHOLDER_STRIP).casefold()
        if word and word not in VERIFIED_BY_PLACEHOLDERS:
            return True
    return False


def _verified_by_lines(text: str, label: re.Match[str]) -> list[str]:
    """The text a `Verified by:` label holds: the rest of its own line, then
    the lines below it up to a blank line or a heading. When its own line is
    empty, blank lines before the first line below are skipped. A code block
    is read to its closing fence, blank lines and all. A header line -- any
    line before the file's first blank line -- is never part of the value."""
    lines = [line.rstrip("\r") for line in text.split("\n")]
    blanks = [i for i, line in enumerate(lines) if not line.strip()]
    header_end = blanks[0] if blanks else len(lines)
    rest = label.group(1).strip(" \t\r*")
    out = [rest] if rest else []
    i = text.count("\n", 0, label.start()) + 1
    if not rest:
        while i < len(lines) and not lines[i].strip():
            i += 1
    if i < header_end:
        return out  # the lines below are other headers, with their own values
    while i < len(lines):
        s = lines[i].strip()
        if not s or MARKDOWN_HEADING_RE.match(s):
            break
        out.append(s)
        i += 1
        if s.startswith("```"):
            while i < len(lines):
                out.append(lines[i].strip())
                i += 1
                if out[-1].startswith("```"):
                    break
    return out


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


def _merge_base(branch: str, integration: str, root: Path) -> tuple[str, str | None]:
    """(merge base sha of `branch` and `integration`, reason it is unknown)."""
    if not branch:
        return "", "no current branch (detached HEAD?)"
    if branch == integration:
        return "", f"already on {integration}"
    try:
        base = subprocess.run(
            ["git", "merge-base", integration, branch],
            cwd=root,
            capture_output=True,
            text=True,
        )
    except OSError as exc:  # git missing from PATH entirely
        return "", f"could not run git: {exc}"
    if base.returncode != 0 or not base.stdout.strip():
        # Most often: no local `dev` (fresh clone that only fetched main), or
        # the branch and dev share no history.
        return "", (
            f"no merge base between {integration} and {branch} "
            f"(is there a local {integration}?)"
        )
    return base.stdout.strip(), None


def changed_files_vs_integration(
    branch: str, integration: str = INTEGRATION_BRANCH, root: Path = ROOT
) -> tuple[set[str], str | None]:
    """Files this branch changed since it forked from the integration branch.

    Returns (changed files, reason it could not be determined). Read-only: a
    `git merge-base` and a `git diff --name-only`, nothing that writes a ref,
    an index or an object.

    Diffing against the merge base rather than the branch tip is what keeps
    this honest -- a plain `git diff dev` would also list every file that
    changed *on dev* since the fork, and blame this branch for all of them.

    `--no-renames` lists both sides of a rename. With rename detection on (the
    git default), moving `packages/x.ts` to `docs/agents/x.md` lists only the
    new path, and every caller would miss the product file the branch deleted.

    Every failure degrades to a reason string, and callers fail closed on it:
    `check()` then requires the review file, and skips the relevant-ticket
    scan, which stays warn-only. A git failure, as in a detached HEAD or a
    fresh clone with no local `dev`, never fails the merge by itself.
    """
    base, why = _merge_base(branch, integration, root)
    if why:
        return set(), why

    diff = subprocess.run(
        ["git", "diff", "--name-only", "--no-renames", base, branch],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if diff.returncode != 0:
        return set(), f"git diff failed: {diff.stderr.strip()}"

    return {ln.strip() for ln in diff.stdout.splitlines() if ln.strip()}, None


def deleted_open_tickets(
    branch: str, integration: str = INTEGRATION_BRANCH, root: Path = ROOT
) -> tuple[set[str], str | None]:
    """Carry-forward tickets that this branch deletes and that were not
    closed at the merge base. Returns (repo-relative paths, reason unknown).

    Every ticket check reads the tickets that exist, so deleting an open
    ticket removes it from all of them, a `Blocks: phase-N` ticket included,
    and the review file is the only check left. So such a deletion counts as
    a product change (`product_files`). A ticket whose status at the merge
    base cannot be read counts as open.
    """
    base, why = _merge_base(branch, integration, root)
    if why:
        return set(), why
    carry_rel = CARRY.relative_to(ROOT).as_posix()
    diff = subprocess.run(
        ["git", "diff", "--name-only", "--no-renames", "--diff-filter=D",
         base, branch, "--", carry_rel],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if diff.returncode != 0:
        return set(), f"git diff failed: {diff.stderr.strip()}"
    found = set()
    for rel in (ln.strip() for ln in diff.stdout.splitlines() if ln.strip()):
        # Same set iter_issue_files() scans: top-level .md files only.
        if not rel.endswith(".md") or Path(rel).parent.as_posix() != carry_rel:
            continue
        status = read_status(path_text=_git_show(root, base, rel) or "")
        if status not in (*CLOSED_STATUSES, "wontfix"):
            found.add(rel)
    return found, None


def _on_list(path: str, entries: tuple[str, ...]) -> bool:
    return any(path == e or (e.endswith("/") and path.startswith(e)) for e in entries)


def is_tooling_path(path: str, tooling: tuple[str, ...] = TOOLING_PATHS) -> bool:
    """True when `path` is on `tooling` and is not gate code. Pure."""
    return _on_list(path, tooling) and not _on_list(path, GATE_PATHS)


def review_exemption_reason(
    changed: set[str],
    why_unknown: str | None,
    review_rel: str,
    deleted_open: set[str] = frozenset(),
) -> str | None:
    """Why this branch may merge with no review file, or None when it needs one.

    Pure. Fails closed: when the changed files are unknown, or there are none,
    the review file is required as before. `review_rel` is the branch's own
    review file, which counts as tooling so that a review record does not turn
    a tooling branch into a mixed one. `deleted_open` is the
    `deleted_open_tickets` result.
    """
    if why_unknown or not changed:
        return None
    if not product_files(changed, review_rel, deleted_open):
        return (
            f"every one of the {len(changed)} changed file(s) is agent tooling "
            f"(TOOLING_PATHS in scripts/check_merge_ready.py)"
        )
    return None


def product_files(
    changed: set[str], review_rel: str, deleted_open: set[str] = frozenset()
) -> list[str]:
    """The changed files that are not agent tooling, sorted. Pure.

    A ticket in `deleted_open` is listed although its folder is tooling: see
    `deleted_open_tickets`.
    """
    return sorted(
        p for p in changed
        if p in deleted_open or not (is_tooling_path(p) or p == review_rel)
    )


def _git_show(root: Path, ref: str, rel: str) -> str | None:
    out = subprocess.run(
        ["git", "show", f"{ref}:{rel}"],
        cwd=root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return out.stdout if out.returncode == 0 else None


def tickets_closed_without_verification(
    branch: str, root: Path = ROOT
) -> tuple[list[str], str | None]:
    """Carry-forward tickets this branch flips to closed/resolved with no
    `Verified by:` line. Returns (repo-relative paths, reason not checked).

    When `branch` is the checked-out branch, the new side is the working
    tree, as every other ticket scan here reads it, so an uncommitted or
    untracked ticket counts: `--check-only` should see what the author is
    about to commit. For any other branch (`--branch X` from another
    checkout) the new side is that branch's tip, since the working tree
    holds some other branch's tickets. The old side is the merge base with
    dev; a ticket absent there is new on this branch.
    """
    if not branch:
        return [], "no current branch (detached HEAD?)"
    if branch == INTEGRATION_BRANCH:
        return [], f"already on {INTEGRATION_BRANCH}"
    try:
        base = subprocess.run(
            ["git", "merge-base", INTEGRATION_BRANCH, branch],
            cwd=root,
            capture_output=True,
            text=True,
        )
    except OSError as exc:
        return [], f"could not run git: {exc}"
    if base.returncode != 0 or not base.stdout.strip():
        return [], f"no merge base between {INTEGRATION_BRANCH} and {branch}"
    base_sha = base.stdout.strip()
    carry_rel = CARRY.relative_to(ROOT).as_posix()
    current = subprocess.run(
        ["git", "branch", "--show-current"], cwd=root, capture_output=True, text=True
    ).stdout.strip()
    from_tree = branch == current

    if from_tree:
        listings = (
            ["git", "diff", "--name-only", base_sha, "--", carry_rel],
            ["git", "ls-files", "--others", "--exclude-standard", "--", carry_rel],
        )
    else:
        listings = (["git", "diff", "--name-only", base_sha, branch, "--", carry_rel],)
    names: set[str] = set()
    for argv in listings:
        out = subprocess.run(argv, cwd=root, capture_output=True, text=True)
        if out.returncode != 0:
            return [], f"{' '.join(argv[:2])} failed: {out.stderr.strip()}"
        names.update(ln.strip() for ln in out.stdout.splitlines() if ln.strip())

    flagged = []
    for rel in sorted(names):
        # Same set iter_issue_files() scans: top-level .md files only.
        if not rel.endswith(".md") or Path(rel).parent.as_posix() != carry_rel:
            continue
        if from_tree:
            path = root / rel
            new_text = (
                path.read_text(encoding="utf-8", errors="replace")
                if path.is_file()
                else None
            )
        else:
            new_text = _git_show(root, branch, rel)
        if new_text is None:
            continue  # deleted on the branch
        if closed_without_verification(_git_show(root, base_sha, rel), new_text):
            flagged.append(rel)
    return flagged, None


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


def review_file_errors(review: Path) -> list[str]:
    """Check the review file's Disposition table: print what was parsed and
    return the errors. `review` must exist."""
    errors: list[str] = []
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
    return errors


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

    review_rel = review.relative_to(ROOT).as_posix()
    print(f"branch: {branch}")
    print(f"review: {review_rel}")

    # The changed files decide whether a review file is required, so read
    # them before the review. Later checks reuse this result.
    changed, why_not = changed_files_vs_integration(branch)
    deleted_open, why_not_deleted = deleted_open_tickets(branch)
    exemption = review_exemption_reason(
        changed, why_not or why_not_deleted, review_rel, deleted_open
    )

    if not review.is_file() and not exemption:
        for rel in sorted(deleted_open):
            print(f"open ticket deleted on this branch, so it needs the review: {rel}")
        print(
            f"FAIL: missing review — run pre-merge-review; expected "
            f"{review_rel}",
            file=sys.stderr,
        )
        return 1
    if review.is_file():
        errors.extend(review_file_errors(review))
    else:
        print(f"review not required: {exemption}")

    unparseable = unparseable_status_tickets()
    if unparseable:
        print("\ntickets with an unreadable Status:")
        for path, why in unparseable:
            rel = path.relative_to(ROOT).as_posix()
            print(f"  - {rel} — {why}")
            errors.append(f"{rel}: {why} (a ticket the gate cannot read cannot block a merge)")

    closed_bare, why_not_closed = tickets_closed_without_verification(branch)
    if why_not_closed:
        print(f"\nticket-closing check skipped: {why_not_closed}")
    elif closed_bare:
        print("\ntickets closed on this branch with no Verified by: evidence:")
        for rel in closed_bare:
            print(f"  - {rel}")
            errors.append(
                f"{rel}: Status flipped to closed/resolved with no `Verified by:` "
                f"line after it naming a command in backticks, <repo>@<sha> or a "
                f"docs/reviews/ file (docs/agents/issue-tracker.md)"
            )
    else:
        print("\nno ticket closed on this branch without Verified by: evidence")

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
    # that sees them. `changed` was read at the top of this function.
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


def check_closing_without_verified_by_is_flagged() -> list[str]:
    """A ticket flipped to closed on the branch needs a `Verified by:` line
    after its Status line (docs/agents/issue-tracker.md)."""
    old = "Status: open\nType: bug\n\n# t\n"
    bare = "Status: closed\nType: bug\n\n# t\n"
    verified = "Status: closed\nVerified by: `git log -1 abc1234`\nType: bug\n\n# t\n"
    problems = []
    if not closed_without_verification(old, bare):
        problems.append("open -> closed with no Verified by: line must be flagged")
    if closed_without_verification(old, verified):
        problems.append("open -> closed with a Verified by: line must pass")
    return problems


def check_closing_rule_edges() -> list[str]:
    """Which flips count, and what counts as a `Verified by:` line."""
    open_t = "Status: open\n\n# t\n"
    cases = [
        # (old, new, want flagged, label)
        (None, "Status: closed\n\n# t\n", True, "a ticket added closed"),
        (open_t, "Status: resolved\n\n# t\n", True, "open -> resolved"),
        (open_t, "Status: wontfix\n\n# t\n", False, "open -> wontfix"),
        ("Status: closed\n\n# t\n", "Status: closed\n\n# t\nedit\n", False,
         "a ticket already closed at the base"),
        (open_t, "Verified by: x\nStatus: closed\n\n# t\n", True,
         "Verified by: above the Status line"),
        (open_t, "Status: closed\n\n# t\n\nVerified by:\n", True,
         "an empty Verified by: at the end of the file"),
        (open_t, "Status: closed\nVerified by:   \n\n# t\n", True,
         "a Verified by: line holding only spaces, then a blank line"),
        (open_t, "Status: closed\n\n## Closed\n\nVerified by:\n`pnpm verify` -> 0\n",
         False, "a Verified by: whose value is on the next line"),
        (open_t, "Status: closed\n\nVerified by:\n\n```\nls x\n```\n", False,
         "a Verified by: with a blank line before its code block (ticket 409)"),
        (open_t, "**Status:** closed\n**Verified by:** `abc1234`\n", False,
         "the bold form"),
        (open_t, "**Status:** closed\n**Verified by:**\n\n# t\n", True,
         "an empty bold Verified by:"),
        (open_t, "Status: closed\nVerified by:\nType: bug\n", True,
         "an empty Verified by: directly above a header line"),
        (open_t, "Status: closed\r\nVerified by:\r\nType: bug\r\n", True,
         "an empty Verified by: above a header line, CRLF"),
        (open_t, "**Status:** closed\n**Verified by:**\n**Type:** bug\n", True,
         "an empty bold Verified by: above a bold header line"),
        # Ticket 624 R1: any line in the header block is a header, whatever
        # its key -- tickets use keys no fixed list kept up with.
        (open_t, "Status: closed\nVerified by:\nSeverity: major\n", True,
         "an empty Verified by: above Severity: (624 R1)"),
        (open_t, "Status: closed\nVerified by:\nBranch: feat/x\n\n# t\n", True,
         "an empty Verified by: above Branch: (624 R1)"),
        (open_t, "Status: closed\nVerified by:\nProgress: 3 of 4 done\n", True,
         "an empty Verified by: above Progress: (624 R1)"),
        (open_t, "Status: closed\nVerified by:\nNote: see the review\n", True,
         "an empty Verified by: above Note: (624 R1)"),
        # Ticket 624 R2: a value counts only when it names evidence in one of
        # the three forms (docs/agents/issue-tracker.md, "Closing a ticket").
        (open_t, "Status: closed\n\nVerified by:\n\n```\n```\n", True,
         "an empty code block (624 R2)"),
        (open_t, "Status: closed\n\nVerified by:\n\n```sh\n\n```\n", True,
         "a code block holding only a blank line (624 R2)"),
        (open_t, "Status: closed\n\nVerified by:\n\n```\nTODO\n```\n", True,
         "a code block holding only TODO (624 R2)"),
        (open_t, "Status: closed\nVerified by: ---\n", True, "a lone --- (624 R2)"),
        (open_t, "Status: closed\nVerified by: —\n", True, "a lone em dash (624 R2)"),
        (open_t, "Status: closed\nVerified by: (none)\n", True, "(none) (624 R2)"),
        (open_t, "Status: closed\nVerified by: `(none)`\n", True,
         "(none) in backticks (624 R2)"),
        # Ticket 624 R3: below the header block, a `Key:` line or a line that
        # starts with `#` but is no heading can be the value.
        (open_t, "Status: closed\n\nVerified by:\n#409's command `ls x` -> 0\n", False,
         "a value line starting with # that is no heading (624 R3)"),
        (open_t, "Status: closed\n\nVerified by:\nVerified: `pnpm verify` -> 0\n", False,
         "a value line starting with Verified: (624 R3)"),
        (open_t, "Status: closed\n\nVerified by:\nResolution: tbc-gear-prio@abc1234\n",
         False, "a value line starting with Resolution: (624 R3)"),
        (open_t, "Status: closed\n\nVerified by:\n#### Notes\n`ls x`\n", True,
         "a heading below an empty label ends it"),
        (open_t, "Status: closed\nVerified by: TODO\n", True, "a TODO placeholder"),
        (open_t, "Status: closed\nVerified by: n/a\n", True, "an n/a placeholder"),
        (open_t, "Status: closed\nVerified by: `none`\n", True, "a none placeholder"),
        (open_t, "Status: closed\nVerified by:\nType: bug\n\nVerified by: `abc1234`\n",
         False, "an empty label, then a filled one further down"),
        # Prose alone names none of the three forms (ticket 624); whether a
        # value in one of them is real evidence is the reviewer's call.
        (open_t, "Status: closed\nVerified by:\n\nThe tab rendered it.\n", True,
         "prose below the label, with no command, repo@sha or review file"),
        (open_t, "Status: closed\nVerified by: owner, on tbc-new-fork@316326a95\n",
         False, "<repo>@<sha> in prose"),
        (open_t, "Status: closed\nVerified by: review docs/reviews/feat-x.md\n",
         False, "a docs/reviews/ path in prose"),
        (open_t, "Status: closed\n\nVerified by: owner observation; string read\n"
         "at `vendor/x/translation.json:893`.\n", False,
         "a command on the line after a filled label (ticket 330)"),
        (open_t, "Status: closed\n\nVerified by: owner observation\n\n`ls x`\n", True,
         "a command after a blank line below a filled label is not its value"),
    ]
    problems = []
    for old, new, want, label in cases:
        if closed_without_verification(old, new) != want:
            problems.append(f"{label}: flagged should be {want}")
    return problems


def check_closing_rule_reads_git() -> list[str]:
    """The git side of the closing rule, on a throwaway repo: committed,
    uncommitted and untracked closes are judged; a subfolder is ignored; and
    `--branch X` from another checkout reads X's tip, not the working tree."""
    import tempfile

    carry_rel = CARRY.relative_to(ROOT).as_posix()
    bare = "Status: closed\n\n# t\n"
    good = "Status: closed\nVerified by: `pnpm verify`\n\n# t\n"
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        root = Path(tmp)
        hooks = root / "no-hooks"
        hooks.mkdir()

        def git(*argv: str) -> None:
            subprocess.run(
                ["git", "-c", f"core.hooksPath={hooks.as_posix()}",
                 "-c", "user.name=t", "-c", "user.email=t@t",
                 "-c", "commit.gpgsign=false", *argv],
                cwd=root, check=True, capture_output=True,
            )

        def put(name: str, text: str) -> None:
            p = root / carry_rel / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8", newline="")

        try:
            git("init", "-q", "-b", INTEGRATION_BRANCH)
            for name in ("1-a.md", "2-b.md", "4-d.md", "sub/5-e.md"):
                put(name, "Status: open\n\n# t\n")
            git("add", "-A")
            git("commit", "-q", "-m", "base")
            git("checkout", "-q", "-b", "feat")
            put("1-a.md", bare)
            put("4-d.md", good)
            put("sub/5-e.md", bare)
            git("add", "-A")
            git("commit", "-q", "-m", "close")
            put("2-b.md", "Status: closed\r\nVerified by:\r\nType: bug\r\n")
            put("3-c.md", bare)
        except (OSError, subprocess.CalledProcessError) as exc:
            return [f"closing rule git test could not build its repo: {exc}"]

        want = [f"{carry_rel}/{n}" for n in ("1-a.md", "2-b.md", "3-c.md")]
        problems = []
        got, why = tickets_closed_without_verification("feat", root)
        if why or got != want:
            problems.append(f"working tree: got {got} ({why}), want {want}")
        git("add", "-A")
        git("commit", "-q", "-m", "rest")
        git("checkout", "-q", INTEGRATION_BRANCH)
        got, why = tickets_closed_without_verification("feat", root)
        if why or got != want:
            problems.append(f"--branch from another checkout: got {got} ({why}), want {want}")
        return problems


def _scratch_git(root: Path):
    """A `git` runner for a throwaway repo at `root`, with no hooks and a
    fixed identity, so a test never runs this repo's pre-commit."""
    hooks = root / "no-hooks"
    hooks.mkdir()

    def git(*argv: str) -> None:
        subprocess.run(
            ["git", "-c", f"core.hooksPath={hooks.as_posix()}",
             "-c", "user.name=t", "-c", "user.email=t@t",
             "-c", "commit.gpgsign=false", *argv],
            cwd=root, check=True, capture_output=True,
        )

    return git


def _scratch_branch(root: Path, git, name: str, writes: dict, deletes=()) -> None:
    """Make branch `name` off dev with the given file writes and deletions."""
    git("checkout", "-q", INTEGRATION_BRANCH)
    git("checkout", "-q", "-b", name)
    for rel in deletes:
        git("rm", "-q", rel)
    for rel, text in writes.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8", newline="")
    git("add", "-A")
    git("commit", "-q", "-m", name)


_OWN_REVIEW = "docs/reviews/chore-x.md"


def check_review_requirement_by_changed_files() -> list[str]:
    """Which changed-file sets need a review file. None means required."""
    cases = [
        ("tooling only", {".claude/skills/a/SKILL.md", "AGENTS.md"}, None, False),
        ("tooling and its own review", {"docs/agents/x.md", _OWN_REVIEW}, None, False),
        ("tooling and its tickets",
         {".claude/agents/g.md", ".scratch/carry-forward/issues/9-t.md",
          ".scratch/carry-forward/map.md"}, None, False),
        ("hooks and harness config",
         {".claude/hooks/h.py", ".claude/settings.json", ".claude/launch.json"},
         None, False),
        ("mixed", {"AGENTS.md", "packages/core/src/rank.ts"}, None, True),
        ("another branch's review", {"AGENTS.md", "docs/reviews/feat-y.md"}, None, True),
        ("gate script", {"AGENTS.md", "scripts/check_merge_ready.py"}, None, True),
        ("other doc", {"docs/stage0-findings.md"}, None, True),
        ("a prefix that is not a folder", {"AGENTS.md.bak"}, None, True),
        ("carry-forward notes and plans are tooling",
         {".scratch/carry-forward/notes/n.md", ".scratch/carry-forward/plans/p.md"},
         None, False),
        ("nothing changed", set(), None, True),
        ("changed files unknown", {"AGENTS.md"}, "no merge base", True),
    ]
    problems = []
    for name, changed, why, want_required in cases:
        got_required = review_exemption_reason(changed, why, _OWN_REVIEW) is None
        if got_required != want_required:
            problems.append(
                f"review requirement, {name}: required={got_required}, want {want_required}"
            )
    got = product_files(
        {"AGENTS.md", _OWN_REVIEW, "packages/core/src/rank.ts", "scripts/merge_to_dev.py"},
        _OWN_REVIEW,
    )
    want = ["packages/core/src/rank.ts", "scripts/merge_to_dev.py"]
    if got != want:
        problems.append(f"product files of a mixed branch: got {got}, want {want}")
    ticket = ".scratch/carry-forward/issues/9-t.md"
    got = product_files({"AGENTS.md", ticket}, _OWN_REVIEW, {ticket})
    if got != [ticket]:
        problems.append(f"a deleted open ticket is not a product file: got {got}")
    if review_exemption_reason({"AGENTS.md", ticket}, None, _OWN_REVIEW, {ticket}):
        problems.append("a branch deleting an open ticket needs no review file")
    return problems


def check_gate_paths_win_over_tooling_paths() -> list[str]:
    """Adding `scripts/` to TOOLING_PATHS still leaves the gate's own code
    needing the product review."""
    widened = TOOLING_PATHS + ("scripts/", ".githooks/")
    problems = [
        f"gate path {p} counted as tooling"
        for p in ("scripts/check_merge_ready.py", "scripts/merge_to_dev.py",
                  "scripts/run_verify.mjs", ".githooks/pre-commit")
        if is_tooling_path(p, widened)
    ]
    if not is_tooling_path("scripts/other.py", widened):
        problems.append("widened list not applied to a non-gate script")
    return problems


def check_review_requirement_reads_git() -> list[str]:
    """On a throwaway repo: a tooling-only branch needs no review file, and a
    mixed branch and a branch that moves product code into a tooling path
    both do. The move is listed under both names: with rename detection on,
    git lists only the new one, and the product file would be missed."""
    import tempfile

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        root = Path(tmp)
        git = _scratch_git(root)
        try:
            git("init", "-q", "-b", INTEGRATION_BRANCH)
            (root / "packages").mkdir()
            (root / "packages" / "x.ts").write_text("export const x = 1;\n" * 20)
            (root / "AGENTS.md").write_text("# rules\n")
            git("add", "-A")
            git("commit", "-q", "-m", "base")
            _scratch_branch(root, git, "tooling", {
                "AGENTS.md": "# rules\nnew rule\n",
                ".claude/skills/s/SKILL.md": "skill\n",
                _OWN_REVIEW: "review\n",
            })
            _scratch_branch(root, git, "mixed", {
                "AGENTS.md": "# rules\nnew rule\n",
                "packages/x.ts": "export const x = 2;\n",
            })
            _scratch_branch(root, git, "move", {
                "docs/agents/x.ts": "export const x = 1;\n" * 20,
            }, deletes=("packages/x.ts",))
        except (OSError, subprocess.CalledProcessError) as exc:
            return [f"review requirement git test could not build its repo: {exc}"]
        problems = []
        got, why = changed_files_vs_integration("move", root=root)
        want = {"packages/x.ts", "docs/agents/x.ts"}
        if why or got != want:
            problems.append(f"rename: got {sorted(got)} ({why}), want {sorted(want)}")
        for branch, want_required in (("tooling", False), ("mixed", True), ("move", True)):
            changed, why = changed_files_vs_integration(branch, root=root)
            got_required = review_exemption_reason(changed, why, _OWN_REVIEW) is None
            if got_required != want_required:
                problems.append(
                    f"branch {branch}: required={got_required}, want {want_required} "
                    f"(changed {sorted(changed)}, {why})"
                )
        return problems


def _run_gate_copy(root: Path, *argv: str) -> tuple[int, str, str]:
    """Run the copy of this file at `root/scripts/` as a CLI; (rc, stdout, stderr)."""
    out = subprocess.run(
        [sys.executable, str(root / "scripts" / Path(__file__).name), *argv],
        cwd=root, capture_output=True, text=True,
    )
    return out.returncode, out.stdout, out.stderr


def check_gate_cli_on_a_scratch_repo() -> list[str]:
    """End to end, through `main()` and `check()`: a copy of this file runs as
    the CLI in a throwaway repo, so the "review not required" decision and the
    `--product-files` output are tested where they are made, not only in the
    pure helpers they call."""
    import shutil
    import tempfile

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        root = Path(tmp)
        git = _scratch_git(root)
        try:
            git("init", "-q", "-b", INTEGRATION_BRANCH)
            (root / "scripts").mkdir()
            shutil.copy(Path(__file__), root / "scripts" / Path(__file__).name)
            (root / "packages").mkdir()
            (root / "packages" / "x.ts").write_text("export const x = 1;\n")
            (root / "AGENTS.md").write_text("# rules\n")
            carry = root / CARRY.relative_to(ROOT)
            carry.mkdir(parents=True)
            (carry / "1-open.md").write_text("Status: open\nBlocks: phase-9\n\n# t\n")
            (carry / "2-closed.md").write_text(
                "Status: closed\nVerified by: `pnpm verify`\n\n# t\n"
            )
            git("add", "-A")
            git("commit", "-q", "-m", "base")
            _scratch_branch(root, git, "tooling", {
                "AGENTS.md": "# rules\nnew rule\n",
                ".claude/skills/s/SKILL.md": "skill\n",
            })
            _scratch_branch(root, git, "mixed", {
                "AGENTS.md": "# rules\nnew rule\n",
                "packages/x.ts": "export const x = 2;\n",
            })
            open_rel = f"{CARRY.relative_to(ROOT).as_posix()}/1-open.md"
            closed_rel = f"{CARRY.relative_to(ROOT).as_posix()}/2-closed.md"
            for name, rel in (("drop-open", open_rel), ("phase-9/drop", open_rel),
                              ("drop-closed", closed_rel)):
                _scratch_branch(root, git, name, {"AGENTS.md": "# rules\nx\n"},
                                deletes=(rel,))
            git("branch", "empty", INTEGRATION_BRANCH)
            git("checkout", "-q", INTEGRATION_BRANCH)
        except (OSError, subprocess.CalledProcessError) as exc:
            return [f"gate CLI test could not build its repo: {exc}"]

        problems = []
        # (branch, gate rc, text the gate prints, --product-files rc, its stdout)
        cases = (
            ("tooling", 0, "review not required", 0, ""),
            ("mixed", 1, "missing review", 0, "packages/x.ts\n"),
            # Deleting an open ticket drops it from every ticket check, and a
            # phase blocker with it, so the deletion needs the product review.
            ("drop-open", 1, "missing review", 0, f"{open_rel}\n"),
            ("phase-9/drop", 1, "missing review", 0, f"{open_rel}\n"),
            ("drop-closed", 0, "review not required", 0, ""),
            # No changed file is not "every changed file is tooling": the gate
            # requires the review, so --product-files must not say to skip it.
            ("empty", 1, "missing review", 1, ""),
        )
        for branch, want_rc, want_text, want_pf_rc, want_pf in cases:
            # The gate reads tickets and the review file from the working
            # tree, as it does when a branch's author runs it.
            git("checkout", "-q", branch)
            rc, out, err = _run_gate_copy(root, "--branch", branch)
            if rc != want_rc or want_text not in out + err:
                problems.append(
                    f"gate on {branch} with no review file: rc={rc}, want {want_rc} "
                    f"and {want_text!r}; output {(out + err)[-300:]!r}"
                )
            rc, out, err = _run_gate_copy(root, "--product-files", "--branch", branch)
            if rc != want_pf_rc or out != want_pf:
                problems.append(
                    f"--product-files on {branch}: rc={rc} stdout={out!r}, "
                    f"want rc={want_pf_rc} stdout={want_pf!r} (stderr {err[-200:]!r})"
                )
            if branch == "empty" and "no file changed" not in err:
                problems.append(f"--product-files on empty: stderr {err!r}")
        return problems


CHECKS = (
    check_closing_without_verified_by_is_flagged,
    check_closing_rule_edges,
    check_closing_rule_reads_git,
    check_review_requirement_by_changed_files,
    check_gate_paths_win_over_tooling_paths,
    check_review_requirement_reads_git,
    check_gate_cli_on_a_scratch_repo,
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
    ap.add_argument(
        "--product-files",
        action="store_true",
        help="print the files this branch changed that are not agent tooling, "
        "one per line, for the product review's diff; exit 1 when the changed "
        "files cannot be read or there are none",
    )
    ap.add_argument("--review", type=Path)
    ap.add_argument("--branch")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if args.product_files:
        branch = args.branch or branch_name()
        changed, why = changed_files_vs_integration(branch)
        deleted_open, why_deleted = deleted_open_tickets(branch)
        if why or why_deleted:
            print(f"changed files unknown: {why or why_deleted}", file=sys.stderr)
            return 1
        if not changed:
            # Empty output means "every changed file is tooling, skip the
            # review"; with no changed file the gate requires the review file.
            print(
                f"no file changed since the {INTEGRATION_BRANCH} merge base, so "
                f"the review file is required: review the whole branch",
                file=sys.stderr,
            )
            return 1
        own_review = review_path(branch).relative_to(ROOT).as_posix()
        for rel in product_files(changed, own_review, deleted_open):
            print(rel)
        return 0

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
