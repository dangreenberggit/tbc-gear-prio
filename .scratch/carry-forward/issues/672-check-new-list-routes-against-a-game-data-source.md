Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, follow-on of 612 and 613 (scope bucket for the orchestrator to set)
Type: task
Origin: pre-merge review of feat/tab-item-lists (docs/reviews/feat-tab-item-lists.md, findings U1-U4), 2026-10-16
Blocks: none
Blocked by: none
Related: 612, 613, 641, 643

# Check four item-list results against a game-data source

The review's domain and adversarial axes raised four questions they could
not settle from committed sources. Each is a hypothesis, untested. Each
changes which items a list holds or what source the tab shows for them.

1. **Two Kil'jaeden Sunmote pairs.** 34339 -> 34405 and 34342 -> 34406 come
   from the same block of commented AtlasLoot rows
   (`vendor/atlasloot/data-tbc.lua:3969-3987`, gitignored, restored by
   `pnpm sync:atlasloot:restore`; lines as the domain axis read
   it) as the 5 pairs the builder rejects for a lower item level. They pass
   only because their item levels are equal. Both upgrades are in all 11 p5
   lists with a Sunmote token source. Are they real Sunmote upgrades?
2. **The 5 rejected helms.** 34400-34404 (item level 164 -> 159 pairs)
   ship in the p5 lists with source `unknown`. What source should the tab
   show for them? Ticket 643 covers other items with an unknown source.
3. **Ogri'la rewards in p2 lists.** The unlisted-faction rep route
   (c346071c) admits Ogri'la rewards (32645-32651), which have db.json
   phase 1, into the p2 lists. Ogri'la was patch 2.1 content. Is p2 right
   for them on the phase plan the site follows? Ticket 641 is the same
   question for another item.
4. **Band of Eternity in p2 lists.** 29298 and 29302 have db.json phase 2
   and are in the balance, hunter, mage and warlock p2 lists (also on dev,
   so this branch did not add them). The ring ladder is a Scale of the
   Sands (Mount Hyjal) reward. Is p2 right for them?

Also unsourced: the class groups in `data/two-hop/token-groups.json`
cite no source. The generator's `classAllowlist` check limits the damage
if one is wrong.

Done when: each of the four has an answer with a cited source (wowsims,
AtlasLoot, or a primary game-data page), and any wrong one has its own
ticket or fix.

## Comments
