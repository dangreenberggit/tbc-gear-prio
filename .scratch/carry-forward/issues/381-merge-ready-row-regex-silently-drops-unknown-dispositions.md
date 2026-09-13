Status: closed
Type: bug
Origin: independent review of the ledger-consolidation-and-merge-train stage, then a
dedicated parser investigation — `.scratch/stage-gate/ledger-consolidation-and-merge-train/logs/merge-ready-parser-review.md`
Blocks: none
Blocked by: none
Relates to: 85 (the other, distinct hole in the same parser)

# `check_merge_ready.py`'s row regex silently drops any disposition word outside `fixed|defer|wontfix`

`DISPOSITION_RE` (`scripts/check_merge_ready.py:47-50`) matches the third cell
against `(fixed|defer|wontfix)`. A row whose disposition is any other word does
not match the pattern at all, so it never becomes a parsed row — it is skipped
with no warning and no count.

The consequence worth noting: the `else` branch at line 476 that appends
`unknown disposition {disp!r}` is **unreachable from a table**. It can only fire
on a value that matched the regex and is not one of the three, which the regex
makes impossible. The error handling for this case exists and cannot run.

## This is NOT ticket 85

Filed separately on purpose. 85 is the **section anchor** (`re.search` reads
only the first `## Disposition` section); this is the **row pattern**. Different
regex, different line, different fix. Applying 85's fix leaves this one intact,
and vice versa — verified in the investigation, which built both cases:

| | 85 | this ticket |
| --- | --- | --- |
| Where | line 156, section anchor | lines 47-50, row pattern |
| Invisible | every row in the 2nd..Nth section | one row with an unexpected word |
| Trigger | a second table in the file | one bad cell in any table |

## Severity is bounded, and the bounding is the dangerous part

Measured against scratch copies:

```
lone table, ALL dispositions unknown  -> rows=0  => LOUD, `if not rows` fires
lone table, one good + one typo'd     -> rows=1  => SILENT, gate proceeds
```

A wholly-broken table fails loudly. **A single mistyped row among good ones is
silent** — and one typo is the far likelier mistake.

Note `deferred`, the natural English spelling, does **not** match: the pattern
anchors the whole cell, so `defer` matches and `deferred` does not. That is a
plausible typo with a silent outcome.

## Current exposure: one row, honest, hiding nothing

Census of the disposition column across every file in `docs/reviews/`:

```
467 fixed
225 wontfix
160 defer
  1 n/a     <- Sp1, docs/reviews/docs-fork-upstream-touchpoints.md
```

The single out-of-vocabulary value is `n/a` on a Spec row that found nothing. It
is semantically honest and conceals no finding. So this ticket is **prospective
risk**, not a live miss.

## Open question the fix cannot dodge — needs an owner decision

Making the regex permissive (`([^|]+?)`, then validate) turns the unreachable
branch on. At that moment the `Sp1 ... n/a` row becomes an error, and the
touchpoints review file fails the gate. Two ways out, and they are not
equivalent:

1. **Accept `n/a`** as a fourth, no-op disposition — "this axis found nothing".
   Keeps the row honest; widens the vocabulary the gate blesses.
2. **Rewrite `Sp1` to `wontfix`** — keeps the vocabulary at three; makes a
   no-findings row claim a disposition it does not really have.

Do not turn the validation on without picking one, or the next merge of anything
touching that review file fails on a row that was never wrong.

## What to do

- Change the third capture group to `([^|]+?)` and let line 476's existing
  `unknown disposition` branch become reachable.
- Decide the `n/a` question above first.
- Regression tests via the repo's `--self-test` convention (`CHECKS`, line 785);
  `parse_disposition` is pure, so it needs no new harness. Minimum: one typo'd
  row among good ones (must fail loudly), an all-typo'd table (must stay loud).

## Acceptance

- [x] A disposition word outside the accepted set fails the gate with a named
      row id, rather than being skipped
- [x] The `n/a` question is decided and recorded, and `docs/reviews/` is
      consistent with the decision
- [x] A self-test covers the single-typo case, which is the silent one

## Resolution 2026-09-13 — `fix/merge-ready-disposition-parser`

The row pattern's third cell no longer carries a word list. A row parses
whatever its disposition says, and `invalid_disposition_rows` then fails it
naming the id, the word, and the accepted set. The `unknown disposition`
branch is reachable from a table for the first time. Cells also accept an
escaped pipe (`\|`) as content, which was separately dropping three rows —
one of them a `defer` whose ticket path sat after the escape.

**The exposure census above is wrong and is corrected here.** This ticket says
"The single out-of-vocabulary value is `n/a`". Measured across
`docs/reviews/`: **15 out-of-vocabulary rows in 8 files**, 9 of them "no
findings" in four spellings — `n/a` 1, `—` 3, `no finding` 2, `no change
needed` 3 — and six decorated real dispositions (`fixed (proven, round
2)` 3, `fixed (follow-up)` 1, `fixed, then **superseded by measurement**` 1,
`minor, accepted` 1). The census that produced "1" could only see rows the
old pattern already matched, which is the defect measuring itself.

**The decision (owner).** The vocabulary stays at exactly three words:
`fixed`, `defer`, `wontfix`. There is no fourth. A Disposition row disposes
of a finding — fixed it, ticketed it, waived it. "This axis found nothing"
disposes of nothing, because there was no finding; it is the absence of an
input, not a fourth outcome. So an axis with no findings contributes zero
rows and says so in that axis's prose. The consequence is accepted: nothing
distinguishes "this axis ran clean" from "this axis never ran", and no
vocabulary could have — the gate reads a word in a cell.

Recorded in `.claude/skills/pre-merge-review/SKILL.md` (and its `.agents/`
mirror) as one sentence after the vocabulary line, and in
`docs/agents/known-traps.md`.

**Historical review files are not rewritten.** Every one of the eight is on a
merged branch that will not be gated again, and relabelling a no-finding row
`wontfix` would record a finding that never existed. They report their
out-of-vocabulary word whenever parsed; that is expected and permanent.

One consequence of the decision needed a code change: `check()` failed any
review with zero parsed rows, so a legitimately all-clean review would have
been rejected. A section with a header row and no body rows now passes and
prints `(no findings)`; a heading with no table at all still fails, and says
to write the header row even when there are nothing to report.

Re-run: `python scripts/check_merge_ready.py --self-test` (30 checks).
