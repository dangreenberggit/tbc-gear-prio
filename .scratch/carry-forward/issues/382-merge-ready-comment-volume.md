Status: closed
Type: chore
Origin: Standards axis of the `fix/merge-ready-disposition-parser` pre-merge review (S2)
Blocks: none
Blocked by: none
Relates to: 85, 381 (the branch that introduced the comments)

# `check_merge_ready.py`'s disposition parser carries comments that restate the code, and the same rationale at three sites

The parser rewrite for tickets 85 and 381 landed a lot of explanatory prose.
Most of it is load-bearing — the escaped-pipe corpus instances cited by
`file:line`, the `str.index` wrong-line hazard, the vocabulary rationale — and
`AGENTS.md` § Comment policy endorses exactly that kind. Two groups do not.

**Comments that restate their code.** Flagged by the review:

- `# A line a human reads as a table row: starts and ends with a pipe.` above
  `ROW_SHAPED_RE = re.compile(r"(?m)^\s*\|.*\|\s*$")` — the regex says this.
- The first line of `_is_header_or_separator`'s docstring restates the name
  and the body. Its second line ("Neither is a finding, so neither counts
  toward the denominator") is the load-bearing half.
- `check_header_and_separator_are_not_candidates`'s docstring duplicates that
  same sentence.
- The in-code comment above the heading-census error duplicates the comment on
  `DISPOSITION_HEADING_RE` nearly verbatim.

**The same rationale repeated at three sites.** The escaped-pipe reason appears
at `_CELL`, in `_row_cells`'s docstring, and in
`check_escaped_pipe_in_note_parses`. The "a 3- or 5-column table is exactly
what a human reads as rows and what this parser cannot" sentence appears in
`scan_disposition`'s docstring, in `check()`'s comment, and in
`check_five_column_table_is_counted_not_dropped`. One canonical statement plus
references would satisfy the policy.

## Why it was deferred rather than fixed

No correctness content. The branch it came from was closing two gate defects
and then fixing a blocker found in its own review; churning the comment body in
the same diff would have made that diff harder to read for no behavioural gain.

## What to do

Delete the four restating comments. Pick one home for each of the two repeated
rationales — the constant site is the natural one for both — and let the other
sites be silent or point at it. Do not strip the load-bearing comments: the
corpus citations and the `str.index` hazard note are why the next reader will
not reintroduce the defects.

## Acceptance

- [x] The four restating comments are gone
- [x] Each of the two rationales is stated once, at one site
- [x] `python scripts/check_merge_ready.py --self-test` still passes (33 checks)
- [x] No load-bearing comment lost: the escaped-pipe `file:line` citations and
      the positional-walk hazard note survive in some form

## Resolution — 2026-09-13

Deleted the four restating comments: the `ROW_SHAPED_RE` one-liner, the first
line of `_is_header_or_separator`'s docstring (kept the load-bearing second
line), `check_header_and_separator_are_not_candidates`'s duplicate docstring,
and the heading-census comment above the `disposition_headings` check in
`check()`.

Escaped-pipe rationale now stated once, at `_CELL` (with the `file:line`
corpus citations). `_row_cells` and `check_escaped_pipe_in_note_parses` point
at it instead of repeating it.

3-/5-column-table rationale now stated once, in `scan_disposition`'s
docstring. The comment in `check()` above the unparsed-row loop and
`check_five_column_table_is_counted_not_dropped`'s docstring point at it
instead of repeating it.

`python scripts/check_merge_ready.py --self-test` → rc 0, 33 checks, unchanged.
`git diff --stat`: 1 file changed, 8 insertions(+), 29 deletions(-).
