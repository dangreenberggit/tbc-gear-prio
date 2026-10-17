Status: closed
Closed: 2026-10-17, stage tab-follow-ups
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

## Resolution

The stats are confirmed; no input is wrong.

- Wowhead's TBC tooltip for 281739 gives item level 141, "Increases attack
  power by 98", and "Use: Increases attack power by 376 for 20 sec. (2 Min
  Cooldown)". This is the same stat line that `vendor/wowsims/db.json` gives
  281739, and it matches the client data that upstream extracts (research
  report R-mug § 2).
- Upstream made the change in `575becc56` "[DB] Run Brewfest at ilvl 141",
  which is on `upstream/master`
  (`git -C vendor/tbc-new-fork branch -r --contains 575becc56`).
- The warcraft.wiki.gg page is stale: it lists only the original item-level
  110 Mug.
- The original id is 38287. 38289, which the research prompt named, is
  Coren's Lucky Coin.
  `data/presets/feral/upstream-item-id-renames.json` maps 38287 to 281739.
- Nothing is corrected, so no `docs/` note is written. Ticket 660 is left as
  it is; it still waits on 676.

Verified by: `curl -s https://nether.wowhead.com/tbc/tooltip/item/281739`
and `tbc-new-fork@575becc56`; research report (gitignored, main checkout)
`C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\agent-reports\2026-10-17-general-task-677-empty-mug.md`.
