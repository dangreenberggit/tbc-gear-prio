Status: open
Type: task
Origin: collecting `data/wowhead-lists/feral/p1-p2.json`, 2026-08-06
Blocks: none
Blocked by: none

# Random-suffix items ("of the Tiger") cannot be simmed from the pinned db

The feral P2 guide recommends three items by their random-suffix name:

| listed as | base id | db name |
|---|---|---|
| Ravager's Wrist-Wraps of the Tiger | 30685 | Ravager's Wrist-Wraps |
| Lurker's Grasp of the Tiger | 30676 | Lurker's Grasp |
| Glider's Boots of the Tiger | 30681 | Glider's Boots |

These drop from Karazhan raid trash. The suffix is what makes them worth
recommending — it carries the agility and crit — but the pinned db stores only
the base item, whose stat map is armor-only:

```bash
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
it=[x for x in db['items'] if x['id']==30685][0]
print(it['name'], (it.get('scalingOptions') or {}).get('0',{}).get('stats'))
print('randomSuffixOptions:', it.get('randomSuffixOptions')[:6], '...')
"
# Ravager's Wrist-Wraps {'31': 159}
# randomSuffixOptions: [-5, -6, -7, -8, -9, -10] ...
```

So the base row is in the universe already and will always score near-bottom on
EP, because the stats that justify the recommendation are not on it.

`db.json` does ship a top-level `randomSuffixes` array (75 rows), and each item
carries `randomSuffixOptions` listing the suffix ids it can roll — so the data
to reconstruct a suffixed variant is present. Upstream wowsims handles these;
**untested here** whether its approach transfers, and that is the thing to look
at before designing anything.

## Current state

`data/wowhead-lists/feral/p1-p2.json` records these three rows under the **base**
item name, deliberately: writing "of the Tiger" against id 30685 would assert
stats the row does not have. A fourth row from the same guide, "Ravager's
Wrist-Wraps of Agility", was dropped entirely — the page gives it no link and so
no stable id.

## Suggested shape of a fix

Per user steer 2026-08-06: do not try to synthesise the suffixed stats as part
of pool work. Prefer surfacing the limitation — a warning on the affected slot
saying it cannot be simmed accurately, visible to the user in the UI, rather
than a silently wrong low score. Look at how wowsims models these first.

## Done when

- A slot whose recommendation depends on a random-suffix item either sims it
  correctly or tells the user it cannot.
- The three rows above are not silently ranked on base-item stats.
