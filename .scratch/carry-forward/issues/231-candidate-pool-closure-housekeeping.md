Status: open
Type: task (process record; needs a user decision)
Origin: pre-merge review of feat/candidate-pool round 3, 2026-08-18 — spec axis
Blocks: none
Blocked by: none

# candidate-pool.md §10 REPORT.md was never written, and ticket 219 closed over its own blockers

Two spec-axis findings that are the user's call, not an executor's:

1. `docs/plans/wowsims-tab/candidate-pool.md` §10 requires
   `.scratch/handoffs/wowsims-tab/candidate-pool/REPORT.md` with items 1–6
   (including verbatim open disagreements). The branch added `HANDOFF-NEXT.md`
   at that path instead. Either write REPORT.md from the review files and
   handoffs already on the branch, or amend §10 to name HANDOFF-NEXT.md as the
   artifact.
2. Ticket 219 is `Status: resolved`, but its 2026-08-17 comment says boxes 1
   and 2 are "unsatisfiable as written" and "rewording acceptance criteria is
   the user's call", and the 2026-08-18 comment ticks all four with no record of
   that call. Ticket 156 likewise has ticked ACs while `Status: open` and its
   own "What remains" concedes the restated table does not exist for the
   20-candidate cells.

## Acceptance criteria

- [ ] The user records a decision on 219's two boxes in the ticket (accept as
      reworded, or reopen), and 156's ticked-but-open ACs are either unticked
      or the ticket is closed with the concession recorded.
- [ ] §10's REPORT.md exists, or §10 is amended to point at HANDOFF-NEXT.md.
