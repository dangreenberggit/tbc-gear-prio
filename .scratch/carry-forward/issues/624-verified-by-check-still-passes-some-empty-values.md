Status: open
Type: bug
Origin: docs/reviews/feat-tab-stage-3t.md
Blocks: none
Blocked by: none

# The `Verified by:` check still passes some empty values

The pre-merge review of `feat/tab-stage-3t` stopped at round 2 on these
findings (R1, R2, R3 in `docs/reviews/feat-tab-stage-3t.md`, section
"Focused check (round 2)"). R1 and R2 make the check pass when it should
fail, so the review lists them as blocking that branch's merge until the
owner decides how they are handled. The `Blocks:` line says `none` because
no phase gate applies; the merge block is recorded in the review file.

The check is `_verified_by_value` and `TICKET_HEADER_RE` in
`scripts/check_merge_ready.py` (commit `fa0900ff`, which fixed round-1
finding A1 only in part).

## R1 — an empty label borrows a header the key list leaves out

`TICKET_HEADER_RE` names a fixed list of keys. Tickets in this repo also
use `Severity:`, `Branch:`, `Progress:`, `Note:`, `Plan:`, `Tab-scope:` and
`Verified live:` in their header block. An empty `Verified by:` directly
above one of those takes it as its value and passes.

Reproduce (the round-2 reviewer's probe):

```
python -c "import sys; sys.path.insert(0,'scripts'); import check_merge_ready as c; print(c.closed_without_verification('Status: open\n', 'Status: closed\nVerified by:\nSeverity: major\n'))"
```

prints `False`; it should print `True`. `docs/agents/issue-tracker.md`
("another header line such as `Type:`") claims more than the code checks.

## R2 — an empty code block or a dash counts as a value

A value that starts with three backticks is accepted without reading the
block, so an empty fenced block, or one holding only `TODO`, passes. The
placeholder set leaves out `---`, `—` and `(none)`, which also pass.

## R3 — some genuine values are rejected (loud)

With the label's own line empty, a next line starting with `#` (for
example `#409's command …`) or with a listed key (`Verified: …`,
`Resolution: …`) is rejected. The gate fails, so the author sees it.

## Suggested fix (from the reviewer; untested)

- Treat any `Key:`-shaped line in the header block (before the first
  blank line) as a header, not a fixed key list; add a `Severity:`
  self-test case.
- For a code block, read to the closing fence and apply the empty and
  placeholder test to its contents; strip dashes and brackets before the
  placeholder comparison.
- Test for a heading with `^#{1,6}\s`, not `startswith("#")`.

## Done when

Each probe above gives the right answer, each has a self-test case in
`check_closing_rule_edges`, and `python scripts/check_merge_ready.py
--self-test` passes.
