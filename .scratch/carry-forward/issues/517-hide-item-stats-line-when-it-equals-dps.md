Status: open
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
