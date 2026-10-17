Status: open
Type: task
Origin: stage tab-source-labels (deferred part P4), branch feat/tab-source-labels
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 660, 640

# Confirm the Empty Mug of Direbrew (281739) ilvl-141 stats

This is ticket 660 part 2 on its own. Ticket 660 points here and carries
`Blocked by: 676, 677`; close 660 when 676 (part 1) and this ticket are
done.

## Owner's words (verbatim, handoff § Owner rulings)

Empty Mug of Direbrew, 2026-10-15T21:21Z: ""Empty Mug of Direbrew now tops
most trinket lists" this is fine." This rules on the rank, not the stats.

## What is unverified

`vendor/wowsims/db.json` gives 281739 ilvl-141 stats (98 AP, use 376 AP);
the wiki lists only the original ilvl-110 version (ticket 660, from
`.scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md` F1).

## Why it is deferred

It needs an outside source (Wowhead tooltip for the renumbered id, or an
in-game check) that no agent has read. Nothing in the repo settles it.

## Done when

The stat line is confirmed or corrected with the source cited. If
corrected, the fix is upstream's (`db.json` is wowsims' item source,
ADR-0029): record the discrepancy in `docs/` and do not patch the db
locally.
