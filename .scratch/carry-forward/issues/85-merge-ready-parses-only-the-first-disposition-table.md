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

## Correction 2026-09-12 — the scale above is understated, and the fix above is incomplete

Re-derived by a dedicated investigation; full working in
`.scratch/stage-gate/ledger-consolidation-and-merge-train/logs/merge-ready-parser-review.md`.
This ticket's diagnosis is right and the defect is still live — line 156 is
unchanged across all seven commits to the file. Two corrections matter to
whoever fixes it.

**The scale.** This ticket says "nine rows, one of them a `defer`". Measured
across `docs/reviews/` today, comparing `parse_disposition()` against every row
matching `DISPOSITION_RE` file-wide:

```
feat-upgrades-dedup-wowsims.md    parsed=9    file-wide=61   MISSED=52  (15 defer)
feat-candidate-pool.md            parsed=36   file-wide=56   MISSED=20  ( 6 defer)
fix-75-82-review-tickets.md       parsed=23   file-wide=32   MISSED= 9  ( 1 defer)
feat-reforge-catchup-leftovers.md parsed=9    file-wide=17   MISSED= 8  ( 0 defer)
```

The worst case is **9 rows of 61**, not nine rows total. Three of those four
branches are ancestors of `dev`, so this has already happened rather than being
a hazard. One row is worth a human look regardless of timing: `Sp3` in the dedup
review is a `defer` with **no resolvable ticket path** (it names ticket 315 in
prose), so it would have hard-failed the gate whenever it was parsed.

**The fix direction is incomplete.** Swapping `re.search` for `re.finditer` on
the same pattern does not close the defect, because the anchor also requires
`## Disposition` followed immediately by a newline. Any trailing text on the
heading breaks the match entirely, and two real files already have that form:

```
feat-candidate-pool.md        '## Disposition (round 3)'                 -> NOT matched
fix-75-82-review-tickets.md   '## Disposition (second pass - rows ...)'  -> NOT matched
```

So the anchor needs to tolerate trailing heading text as well —
`^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)` or similar — under `finditer`. A fix
that only changes `search` to `finditer` would test green against
`feat-reforge-catchup-leftovers.md` and still under-read `feat-candidate-pool.md`.

**Against the duplicate-id suggestion above.** Multi-round files legitimately
reuse `A1`/`D1` per round — `feat-upgrades-dedup-wowsims.md` has two `A1` and
two `A2` rows across rounds — so failing on a shared id would fail nearly every
existing review file. Scope ids per section if it is wanted at all.

**Adjacent, and only a test-matrix line:** a 5-column table (severity column)
matches no row and returns 0, which fails loudly where it is the only table but
is silently absent where it sits beside a 4-column one. The census shows such
tables exist here (`major` 19, `minor` 14, `blocker` 6).

**Not this ticket:** the row regex dropping unknown disposition words is a
separate hole in the same parser — ticket 381.

## Acceptance

- [ ] Every `## Disposition` section in a review file is parsed, including
      headings carrying trailing text
- [ ] The gate prints a denominator, so an under-read is visible rather than
      silent (`disposition rows: 9` reads identically whether it is 9 of 9 or
      9 of 61)
- [ ] Self-tests cover: two plain sections; a `(round 3)`-style heading; a
      5-column table
- [ ] `docs/agents/known-traps.md` matches the code's real behaviour
