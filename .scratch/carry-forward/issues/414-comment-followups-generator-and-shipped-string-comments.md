# 414 — Comment follow-ups: generator-internal and shipped-string comments

Status: open
Type: task
Origin: 413 execution (2026-09-17) — kill-list hits 413 found but left out of scope,
surfaced by the executor and recorded at Gate C.
Blocks: —
Blocked by: none

## What

Two small comment-cleanup leftovers from 413, both deliberately out of 413's scope,
tracked here so they are not lost. Neither is urgent; both are the same
"make comments human" work as 412/413.

### 1. Generator-internal comments in `scripts/`

413 fixed the doc-comment `scripts/generate_json_literal_types.py` *emits* (line 64,
via P3). The executor found a second kill-list hit at **generator line 51** — a
comment about the generator's own logic ("the JSON carries a per-member record"),
not part of the emitted output. 413 left it to avoid scope creep (413's Part 1 was
`packages/core/src/`, not `scripts/`). A `scripts/` comment sweep would cover this and
any siblings: run the 413 kill-list regex over `scripts/*.py` and apply the same
per-line rubric.

### 2. Comments inside shipped template-literal strings

Three kill-list hits sit inside strings the report emits as bytes, so editing them
changes emitted HTML and fails a digest/golden test — they are NOT source comments
and were correctly excluded by 412/413:
- `packages/core/src/rank-report-css.ts:175` — a CSS comment inside the `REPORT_CSS`
  template literal.
- `packages/core/src/rank-report.ts:829` — a comment inside the `setWeightScript`
  inline-`<script>` template literal (found in 413 by testing the edit: it moved the
  emitted HTML 32575→32573 bytes and failed `rank-report.test.ts`).

These are real end-user-facing comment text (they ship in the report's inline CSS/JS),
so cleaning them is legitimate — but it requires updating the affected digest/golden
in the same change, under a rule that permits the byte change. That is a different kind
of edit from 412/413 (which were strictly no-emitted-byte-change), hence a separate
ticket. Decide whether the owner wants report-inline comments cleaned at all before
doing this; they are the lowest-value of the comment work (a reader has to view report
source to see them).

## Why

413 held a strict no-behaviour-change / no-emitted-byte-change line, so these three
shipped-string comments and the one `scripts/` generator-internal comment fell outside
it. They are recorded so the "human comments" effort is complete on the record, not so
they must be done — item 2 in particular may not be worth the golden churn.

## Done when

- Either: a `scripts/*.py` comment pass (item 1) done to the 412/413 rubric with the
  prose-record + spot-check mechanism; or a decision recorded that generator-internal
  comments are out of the effort's scope.
- Either: the two shipped-string comments (item 2) cleaned with the digest/golden
  updated in the same change; or a decision recorded that report-inline comments are
  not worth cleaning.
