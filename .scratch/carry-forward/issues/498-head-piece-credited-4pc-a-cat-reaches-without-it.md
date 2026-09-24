Status: open
Type: task
Origin: SME seat, stage-gate upgrades-tab-closeout round 2b Step 7 (finding C2, 2026-09-24)
Blocks: none
Blocked by: none
Related: 467, 490

# A set head piece gets 4pc credit a cat reaches without it

At worn Thunderheart 1 (hands), Thunderheart Cover shows ON +104.7 (rank 4,
OFF −3.4) because it is credited the Thunderheart 4pc. A cat reaches that
4pc with chest, shoulders, hands and legs and keeps Wolfshead Helm, so the
head piece does not unlock the 4pc in practice. The ON credit gives every
set piece the full future value along its own path (ticket 490's rule), even
when the set's measured package does not include that piece.

This is a design note for the owner, not a defect of 490: whether a piece
outside the measured package should get the full credit, a reduced one, or
none.

Evidence: SME handoff
`.scratch/handoffs/sme-rank-judgment-490-per-future-breaks.md`;
`.scratch/stage-gate/upgrades-tab-closeout/round-2b/feral-worn1.json`
(gitignored).

## What would close this

1. An owner decision on credit for pieces outside the measured package.
2. If it changes the rule, a fixture and the view change.
