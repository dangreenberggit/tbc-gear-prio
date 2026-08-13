Status: open
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
