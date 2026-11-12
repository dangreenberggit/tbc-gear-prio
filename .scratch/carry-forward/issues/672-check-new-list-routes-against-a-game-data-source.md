Status: closed
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

2026-10-18 (stage tab-wowsims-items): what each question means for the
tab now (ADR-0038). Question 1 still reaches the tab: the fork's
`tier-exchange.json` holds both pairs, because
`scripts/generate_fork_exchange.py` keeps the pairs that
`assemble_universe.sunmote_upgrade_pairs` keeps. Question 2: the tab shows
"Source not recorded" for 34400-34404, which have no db.json source.
Questions 3 and 4: the tab takes item phases from db.json, so for the tab a
wrong phase is wowsims' data. The questions are unchanged for this repo's
builder.

2026-11-12 (closed on `fix/672-sunmote-helms`): all four answered, one fixed.
Game data is Wowhead's TBC Classic pages, fetched 2026-11-12.

1. **Two Kil'jaeden Sunmote pairs: right.** Yrma ("Transmuter of Sin'dorei
   Relics", Isle of Quel'Danas, `https://www.wowhead.com/tbc/npc=25977`)
   sells 34405 for 34339 + Sunmote (34664) and 34406 for 34342 + Sunmote.
   No change.
2. **The 5 rejected helms: fixed.** Yrma also sells 34400 for 34345, 34401
   for 34243, 34402 for 34332, 34403 for 34245 and 34404 for 34244, each
   plus one Sunmote. The bases are ilvl 164 Kil'jaeden drops and the helms
   ilvl 159, so the trade swaps a helm for another class's helm; it does
   not raise the item level. Ticket 612's item-level rule was wrong and is
   gone from `scripts/assemble_universe.py` (`sunmote_upgrade_pairs`) and
   `scripts/check_pool_completeness.py` (`_sunmote_upgrades`).
   `tier-exchange.json` has 28 Sunmote rows (was 23), 25 p5 entries in 8
   specs go from `unknown` to `Sunmote + <helm>`, and the tab shows that
   source at Kil'jaeden where it showed "Source not recorded" (fork
   `b7231a0c4`, test `item_sources.test.ts` for 34401).
3. **Ogri'la rewards in p2 lists: no change.** The CLI's p2 is right:
   Warcraft Wiki's Anniversary timeline puts Ogri'la in phase 2
   (`https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Burning_Crusade_Classic_Anniversary_Edition`,
   seen through a search result, page not opened). The tab offers them
   from db.json's phase 1; that is wowsims' own fact, kept as ticket 641
   was (ADR-0038, "match wowsims").
4. **Band of Eternity in p2 lists: right.** `tbc/item=29298` is the reward
   of quest 10462 Champion's Pledge (Scale of the Sands); the Hyjal
   attunement `tbc/quest=10445` needs Vashj's and Kael's Vial Remnants,
   phase-2 bosses. No change.

Token class groups: the "Classes:" line on `tbc/item=` 29759 Hero (Hunter,
Mage, Warlock), 29760 Champion (Paladin, Rogue, Shaman), 29761 Defender
(Warrior, Priest, Druid), 31095 Protector (Warrior, Hunter, Shaman), 31096
Vanquisher (Rogue, Mage, Druid) and 31097 Conqueror (Paladin, Priest,
Warlock) matches every group in `data/two-hop/token-groups.json` (class ids
from `data/proto/common.proto`). No change.

Verified by: `python scripts/check_pool_completeness.py --check` (25
findings with the item-level clause dropped from the gate alone, 0 after
the fix) and `tbc-new-fork@b7231a0c4`
(`npx vitest run ui/features/upgrades/utils/item_sources.test.ts`). The
Wowhead check, re-runnable: fetch `https://www.wowhead.com/tbc/npc=25977`,
take each sold item's `"cost":[[0,[],[[<base>,1],[34664,1]]]]` pair, and
compare with `data/two-hop/sunmote-pairs.json`: 28 pairs on each side,
equal.
