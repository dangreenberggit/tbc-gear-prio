Status: closed
Closed: a1d3ef6
Type: task
Origin: docs/reviews/feat-set-bonus-value.md round 5 (process P3)
Blocks: none
Blocked by: none

# Ticket 100 is used twice, and one of the two is uncommitted

Two files claim id 100 — the only collision across the issues directory
(verified; next free id at the time of filing was 139):

- `100-set-potential-panel-is-default-off-....md` — **tracked**,
  `Status: closed`, `Closed: b51f08c`. Disposition row 2-S1 refers to this one
  and is accurate.
- `100-p3-curated-list-pinned-to-p2-set.md` — **untracked**, `Status: open`,
  filed 2026-08-12 from a human review of a ret artifact.

Not a duplicate and not a conflict — a numbering accident. Two problems:

1. The untracked file is ~117 lines of real work, including three `gh api`
   probes that establish upstream has no ret p3 gear set on any ref. A
   `git clean -fdx` destroys it.

2. It substantially overlaps open ticket **121**
   (`no-upstream-ret-p3-curated-gear-set-to-pin`) while adding material 121
   lacks: a critique of `bisStale`'s placement (it sits below the checkbox it
   corrects), and the observation that `bisStale` can detect *older* but never
   *absent*.

## Fix

Renumber to 139+ (pick a free id at the time) and fold the non-overlapping
material into 121 with a cross-link, or commit it as its own ticket and
cross-link both ways. Either is fine; leaving it untracked at id 100 is not.

## CLOSED, 2026-08-13

`git mv`'d the untracked file to
`.scratch/carry-forward/issues/153-p3-curated-list-pinned-to-p2-set.md`
(commit `016b019`), then cross-linked it with ticket 121 both ways (commit
`a1d3ef6`) rather than merging — each keeps material the other lacks. The
`docs/reviews/feat-set-bonus-value.md` Disposition row 2-S1 was checked and
already points at the closed `100-set-potential-panel-...` ticket (its cited
sha `b51f08c` matches that ticket's own `Closed:` line), so it needed no
change. Two other references to the old `100-p3-curated-list-pinned-to-p2-set`
filename remain outside this pass's edit scope:
`docs/reviews/feat-set-bonus-value.md:710` and
`.scratch/handoffs/set-bonus-value-remaining-work.md:317` — both should be
updated to `153-` but neither file was in this task's allowed-edit list.

Verify: `git log --oneline -1 -- .scratch/carry-forward/issues/153-p3-curated-list-pinned-to-p2-set.md`
