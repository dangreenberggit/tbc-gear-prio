Status: open
Type: investigation
Origin: owner, 2026-09-28, about option 4 of Q-no-list-cost in stage-gate 511-512-set-credit (`.scratch/stage-gate/511-512-set-credit/scripts/q-no-list-cost/draft-v5.md`; gitignored)
Blocks: none
Blocked by: none
Related: 511, 512, 505

# Level-60 set items sit in TBC candidate pools and cost sims

This is an investigation ticket. It records a question and the facts
known so far. Do not start a fix from this ticket.

## The owner's words

Recorded 2026-09-28. The owner was answering the Q-no-list-cost decision,
whose option 4 was "Remove level-60 sets from the candidate items".
Verbatim:

> Separate potential ticket for item 4 -- i don't know if I super love hardcoding one set, but it's a less relevant set (lower level) and seems to come with steep cost despite it basically never being worth it afaik once a character is advanced enough to get any new tier sets

Our reading, not the owner's words: "one set" is Cryptstalker Armor. The
draft said that hunters lose it under option 4, and named it as the only
Naxxramas set with sim bonuses.

## The kind of scenario

A spec's candidate pool holds items from outside the game version the
player is on: level-60 items from before TBC, including other classes'
sets. Every item in the pool can cost sims. The planned no-list set
measurement in stage-gate 511-512-set-credit makes this worse, because it
sims every piece count of every set in the pool. The warrior at phase 5
is the example below. The same kind of item is in other specs' pools, so
the question is general: `data/universes/hunter-p5.json` has all eight
pieces of seven of the same Naxxramas sets (521, 524 to 527, 529, 530).
To see this, run the command below with `warrior-p5` changed to
`hunter-p5`. Other specs and phases have not been listed.

## What is known

### The warrior phase-5 pool holds level-60 sets

`data/universes/warrior-p5.json` has set items from 36 sets. All eight
pieces of nine Naxxramas tier-3 sets are there: the warrior's own
Dreadnaught's Battlegear (set 523) and eight sets for other classes,
Dreamwalker Raiment (521), Bonescythe Armor (524), Vestments of Faith
(525), Frostfire Regalia (526), The Earthshatterer (527), Redemption Armor
(528), Plagueheart Raiment (529) and Cryptstalker Armor (530). The pool
also has level-60 dungeon sets (for example Darkmantle Armor, Feralheart
Raiment, The Five Thunders), Conqueror's Battlegear and Battlegear of
Unyielding Strength, and the classic PvP sets Warlord's Battlegear and
Field Marshal's Battlegear. Which class each of these non-Naxxramas sets
is for has not been checked against item data.

Command (Git Bash, repo root). It prints each set's id, name, piece
count, and each piece's (phase, source kinds):

```
python -c "
import json,collections as C;I=json.load(open('data/items/index.json',encoding='utf8'))
s=C.defaultdict(list)
for e in json.load(open('data/universes/warrior-p5.json',encoding='utf8'))['entries']:
  it=I.get(str(e['itemId']),{})
  if it.get('setId'): s[it['setId']].append((e.get('phase'),tuple(sorted({x.get('kind') for x in e.get('sources') or []}))))
for k in sorted(s): print(k, I[[i for i in I if I[i].get('setId')==k][0]]['setName'], len(s[k]), sorted(set(s[k])))
"
```

The pool the tab reads in the fork holds them too. All eight Plagueheart
pieces (22504 to 22511) appear once each in
`ui/core/components/individual_sim_ui/upgrades/data/warrior-p5.universe.json`
at fork commit `02d0ea2a` (the `commit` in `data/wowsims-fork.lock.json`
on 2026-09-28). One check:
`git -C vendor/tbc-new-fork show 02d0ea2a:ui/core/components/individual_sim_ui/upgrades/data/warrior-p5.universe.json | grep -c '"itemId": *22504\b'`
prints 1. Whether the fork pool and `data/universes/warrior-p5.json`
hold the same set items overall has not been compared.

### "Phase 1, source unknown" does not pick them out

Every level-60 set piece above is phase 1 with source kind `unknown`. So
is Warbringer Armor (set 654), a TBC tier-4 set. The command above shows
this. A rule built on phase and source alone would drop Warbringer Armor
too.

The cost analysis (`options2.py`) instead treats every set with an id
below 552 as level-60. That is a heuristic. Nobody has checked that it
matches item level for every set, in this pool or in others.

### The sim defines bonuses for one of the Naxxramas sets

At fork commit `02d0ea2a`, the Go sim defines a set named "Cryptstalker
Armor" (`sim/hunter/item_sets.go:11-12`) and none of the other eight
Naxxramas set names. Command:

```
git -C vendor/tbc-new-fork grep -n -E "Cryptstalker|Bonescythe|Dreadnaught|Redemption Armor|Earthshatterer|Dreamwalker|Frostfire|Plagueheart|Vestments of Faith" 02d0ea2a -- sim
```

The other matches are the spell school `SpellSchoolFrostfire` and the
mage `FrostfireOrb` spell, which are not set definitions.

### These sets cause most of the wasted sims in the planned measurement

These figures come from the Q-no-list-cost analysis. Its scripts are in
gitignored scratch (`.scratch/stage-gate/511-512-set-credit/scripts/q-no-list-cost/`:
`draft-v5.md`, `options2.py`, `breakdown.py`), so a fresh checkout cannot
re-run them. They are estimates from item data, not timed runs.

- For warrior at phase 5, the planned measurement adds about 317 sims per
  run. 224 of them test a piece count where the sim has no bonus, so both
  sims of the pair return the same DPS. That zero difference is read from
  the sim's code, not measured.
- 184 of those 224 come from sets with an id below 552. The nine
  Naxxramas sets alone give 118 of the 184 (59 counts at two sims each,
  from the per-set list that `breakdown.py` prints).
- The draft estimates that removing the Naxxramas sets leaves about 175
  extra sims, and removing every set with an id below 552 leaves about
  109.

### Not checked

- Whether these items belong in a TBC pool at all, and for which class.
- How they got into the pool.
- Whether any of them ranks, or changes a ranking, today.

## What to investigate

1. **How the pools are built.** `data/universes/warrior-p5.json` names its
   builder in `generatedBy` (`scripts/assemble_universe.py`) and has
   `carryoverPolicy: "union"`. Read that builder and whatever builds the
   fork's `*.universe.json` files. Find why a spec's pool gets other
   classes' items and level-60 sets. Ticket 505 records
   the owner's direction that the fork's pool should come from wowsims'
   own item source; say how this question fits that.
2. **A general rule, not a list of sets.** Find a rule that excludes items
   a TBC player would not wear, without naming sets by hand. Candidates:
   item level, the expansion the item comes from, class restrictions, and
   armor type. On 2026-09-28, no entry in `data/items/index.json` had a
   field for item level, expansion or class, so say where each would come
   from. Pool entries do carry `armorType`. For
   each rule, list what it removes and what it wrongly keeps or removes,
   with Warbringer Armor as the test case for a TBC set that looks old.
3. **Whether any level-60 set piece is worth keeping.** Cryptstalker Armor
   for hunters is the only Naxxramas set with sim bonuses. The owner's
   view is that such sets are "basically never … worth it … once a
   character is advanced enough to get any new tier sets". Treat that as
   a hypothesis and check it: for example, sim hunter at each phase from 2
   to 5 on the previous phase's preset gear, with and without the
   Cryptstalker pieces in the pool, and see whether any piece ranks.
4. **The effect.** For each rule, give the change in sims per run for
   each spec and phase (with a re-runnable command), and whether any
   ranking changes.

## What would close this

A written finding, linked here, that answers items 1 to 4 with a
re-runnable command for each figure, and either a follow-up ticket for a
fix or a recorded decision to keep the pools as they are.

## Comments
