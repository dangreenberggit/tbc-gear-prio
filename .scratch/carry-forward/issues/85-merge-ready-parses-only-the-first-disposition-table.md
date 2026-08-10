Status: open
Type: bug
Origin: found while running `pnpm land --check-only` on fix/75-82-review-tickets (second-pass review of 6fb9f1c)
Blocks: none
Blocked by: none
Relates to: 83, 84

# `check_merge_ready.py` parses only the first `## Disposition` table, so a review file with two silently under-checks

`scripts/check_merge_ready.py:60` scopes disposition parsing to a single
section:

```python
m = re.search(r"(?ms)^## Disposition\s*\n(.*?)(?=^## |\Z)", text)
```

`re.search` returns the **first** match and the lookahead stops at the next
`## `, so any second `## Disposition` section is never read. Every row in it —
including `defer` rows, the ones the gate exists to validate against open
tickets — is skipped without a warning. The gate prints its parsed row count
and then `merge-ready: ok`, which reads as "all rows checked".

## How it was hit

A branch got a second review pass after gaining a commit past its original
review, and the reviewer appended a second `## Disposition` table rather than
editing the historical one. The gate reported `disposition rows: 14` and
`merge-ready: ok` while nine rows, one of them a `defer` pointing at a ticket,
went unchecked.

Reproduce against any review file with two such sections:

```bash
python -c "import io,sys;sys.path.insert(0,'scripts');from check_merge_ready import parse_disposition;print(len(parse_disposition(io.open('docs/reviews/<file>.md',encoding='utf-8').read())))"
```

Worked around on that branch by merging the rows into one table, so the file
in `docs/reviews/` no longer reproduces it — use a scratch copy with two
`## Disposition` headings to see it.

## Why it matters

The failure is silent and points the wrong way: a reviewer who appends a table
gets a green gate, and the more diligent the second pass, the more rows go
unchecked. The gate's contract is that a `defer` row points at open work; here
it can pass by not looking. `pnpm land` is the only supported door to `dev`, so
this is the last automated check before a merge.

## What to do

Parse **all** `## Disposition` sections, not the first — `re.finditer` over the
same pattern, concatenating the row sets. Consider also failing when two rows
share an id, since a second table naturally reuses `A1`, `D1`, and so on
(the fix on the origin branch prefixed them `2-` by hand).

Cheap and worth it: a regression test with a two-section fixture asserting both
tables' rows are returned.
