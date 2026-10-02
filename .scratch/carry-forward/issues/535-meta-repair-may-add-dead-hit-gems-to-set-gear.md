Status: open
Type: investigation
Origin: pre-merge review round 10 of feat/tab-signoff-followups, finding D3 (`docs/reviews/feat-tab-signoff-followups.md`), 2026-10-02
Blocks: none
Blocked by: none
Related: 511, 521, 516

# Meta-gem repair may put hit gems on set gear that is already at the hit cap

This ticket is a record of a hypothesis. Nobody ran a sim to file it.

## What was found

The F1 check on ticket 511 notes that the choice of a Rigid Dawnstone
(+8 hit) was not checked. For ret, candidate socket fills score melee hit
at 0 (`packages/core/src/candidate-gems.ts` about lines 335-344,
`cap-profile.ts` about line 125), so a fill should never pick Rigid
there. The domain reviewer's hypothesis, untested: meta-gem repair keeps
full EP weights (`candidate-gems.ts` about line 326, fork `rank.ts` about
line 3815), so a repair can choose hit gems that add nothing on a
character already at the hit cap.

If true, the package and step gear the set rows are valued by can hold
dead hit gems, and set totals read low by the value of the stats those
sockets could have held.

## What would close this

1. Find which path chose the Rigid Dawnstone in the F1 gear, from the
   code or a logged repair (record the command).
2. If meta repair is the cause, either make repair use the capped
   weights, or record here why it stays (with the size of the effect
   from a sim, and the command).
