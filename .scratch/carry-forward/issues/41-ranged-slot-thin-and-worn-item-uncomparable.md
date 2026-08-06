Status: open
Type: bug
Origin: sme-rank-review on phase-2/feral (ticket 05, gate box 2)
Blocks: none

# The ranged slot offers two items, and the worn one is not among them

Found by `sme-rank-review` on shredzepelin's feral cat shortlist
(`.scratch/handoffs/sme-rank-judgment-feral-shredzepelin.md`). It is a **pool**
problem, not a feral problem — ret has the same shape — so it is filed as
carry-forward rather than against ticket 05.

## What a player sees

Both shipping universes offer exactly **two** items for the whole ranged slot:

```bash
python -c "import json;u=json.load(open('data/universes/feral-p2.json'));print([e['itemId'] for e in u['entries'] if e['slot']=='ranged'])"
# feral: 28568 Idol of the Avian Heart, 30051 Idol of the Crescent Goddess
# ret:   28592 Libram of Souls Redeemed, 30063 Libram of Absolute Truth
```

Two things make this worse than a small number:

1. **The item the character is wearing is not in the pool.** shredzepelin wears
   Everbloom Idol (29390). It never appears as a candidate, so the engine cannot
   say whether either offered idol beats it — the player gets a recommendation
   with no basis for comparison.
2. **One of the two is for the wrong role.** Idol of the Avian Heart boosts
   healing spells. Offering it to a feral cat is noise.

## Why 29390 cannot enter the pool

It has no source records in the pinned wowsims db:

```bash
python -c "import json;db=json.load(open('vendor/wowsims/db.json'));i=[x for x in db['items'] if x['id']==29390][0];print(i.get('sources'))"
# None
```

`data/atlasloot_sources.json` has nothing for it either. Pool membership
requires an origin, so a sourceless item is dropped. **Hypothesis, untested:**
other worn items may be invisible for the same reason, and the general defect is
that a character's *equipped* gear is not guaranteed to be comparable.

## The best cat idol for this tier is also absent

Idol of Feral Shadows (28372) boosts Rip and is the idol a feral cat wants at
P2. It drops in **The Arcatraz**, a five-man:

```bash
python -c "import json;d=json.load(open('data/atlasloot_sources.json'));print(d['28372'])"
# [{'dungeon': 'The Arcatraz', 'kind': 'heroic'}]
```

The universes are raid-scoped, so it is excluded by construction. This overlaps
ticket 17 (the pre-raid / heroic-dungeon remainder) but is narrower and sharper:
for the ranged slot specifically, raid-only scoping removes the item that
matters most.

## Suggested shape of a fix

Not prescribed, but the options look like:

- Always admit the character's **currently equipped** item as a candidate,
  regardless of source data. This fixes the "cannot compare" half on its own and
  is independent of pool scoping.
- Admit five-man loot for slots where raid loot is thin — probably ranged only,
  which keeps it away from ticket 17's broader question.
- Emit a low-count warning when a slot has fewer than N candidates, so this is
  caught by the product rather than by a domain review.

## Done when

- A character's worn item is comparable in every slot, or there is a recorded
  reason it cannot be.
- The ranged slot either carries the tier's real contenders or discloses that it
  does not.
