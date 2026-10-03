Status: closed
Type: task
Origin: owner feedback on the 494 popover proposal, 2026-09-25 (`.scratch/stage-gate/494-popover-proposal/owner-feedback-1.md`, gitignored)
Blocks: none
Blocked by: 494
Related: 494

# Hide the popover's "Item stats" line when it equals the DPS figure

The 494 set-bonus popover proposal opens with a line labelled "Item stats"
(`proposal.md` in the same folder). The owner, verbatim:

> "item stats" should only display if thats not the same as the dps figure. That seems dependent on the toggle so we can save it for a minor future ticket.

The owner links this to the Set potential toggle. Which toggle states
make the two figures equal is not checked here.

## Depends on

494 landing. The proposal is
`.scratch/stage-gate/494-popover-proposal/proposal.diff`, which is not
committed yet. Build this on whatever 494 ships, not on that diff.

## 2026-09-27 — closed

Landed with 494 in fork `c2cb48f81` ("Lay out the set-bonus popover as a
receipt"), re-pinned in main `3b44bc21` ("Re-pin fork for the 494 popover
and logging"). A plain "Item stats" line equal to the figure is dropped.
When that leaves the popover with only its Total, the row has no popover
and no "set detail" hint. The rule applies in each toggle state
separately. A folded first line ("Item stats + {set} {n}pc" or "Item stats
− {set} {n}pc") is kept even when it equals the figure, because it is the
only place that bonus is named.

The owner tied this ticket to case 2 of the proposal: "it seems like the
ticket 517 "gap" is addressed by my comments on 2."
(`.scratch/handoffs/494-set-hover-redo/final/owner-feedback-3.md`). The
per-case record is `proposal-cases.md` in the same folder.
