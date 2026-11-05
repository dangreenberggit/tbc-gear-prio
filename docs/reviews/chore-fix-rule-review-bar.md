# Instruction review — chore/fix-rule-review-bar

Reviewed change: the text the owner approved on 2026-11-04 ("SURE.
APPROVED."), commit `c3902cf` in the gitignored work repo
`.scratch/round-limits-r16/review-bar/` on the main checkout, applied here
on `dev` at `cf8e37a1`. It adds a fix rule to `docs/agents/home/AGENTS.md`
§ Findings and fixes (when a fix seems to need more words or code,
rewrite first and say why a rewrite is not enough), and changes the
`instruction-review` skill: a fix path, what counts as a finding, Notes
for unclear sentences that still need a rewrite, and a findings table
that states how each problem can happen and what it costs.

Why: 16 review rounds on the round-limits change never reached zero
findings, and each fix round added more text than it removed. The study
is `.scratch/round-limits-r16/2026-11-04-review-rounds-why-recurring.md`
on the main checkout.

Dispatch: every file this branch changes is agent tooling
(`docs/agents/` and `docs/reviews/` sit under `TOOLING_PATHS` or are
review records, `scripts/check_merge_ready.py:177`), so the review is the
`instruction-review` skill in place of `pre-merge-review`.

## Review passes

Both passes ran the full path as one `general-task` agent on Opus, with
cold readers and no old/new trial. The reports are gitignored files on
the main checkout, under `.scratch/round-limits-r16/review-bar/`.

1. `review-1.md`, on the first draft `b24f841`: 1 blocks (no trial run),
   3 should fix (F-1 to F-3). All three were fixed by the redraft.
2. `review-2.md`, on `68a87e7`: 1 blocks (no trial run), 2 should fix
   (R2-1, R2-2), 1 minor (R2-3). The stop rule applied after it.

After review 2, the owner's later corrections (unclear text is still bad
writing; fewer, shorter rules) and a plain-English rewrite produced the
approved text. That text removes R2-1 to R2-3 by deleting the sentences
behind them. No review read the approved text in its final form; the
owner saw that stated and approved it as shown.

## Open

- No old/new trial run (review 1 and review 2 blocking item). The owner
  approved without one. The first real use is the rework of the
  round-limits change.
