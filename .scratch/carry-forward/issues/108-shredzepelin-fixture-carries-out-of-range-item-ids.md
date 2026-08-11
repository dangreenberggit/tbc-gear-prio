Status: closed
Type: bug
Origin: combined 103/106 diagnostic loop, 2026-08-10 (`.scratch/set-bonus-value/loop-103-106/06-owner-settings-diff.md`)
Blocks: none
Blocked by: none

# The shredzepelin fixture carries two item ids outside the TBC range

`test/fixtures/shredzepelin-cat.raw.json` records two worn items whose ids sit
well above the TBC range, in the neck and back slots:

```
python -c "
import json
raw=json.load(open('test/fixtures/shredzepelin-cat.raw.json'))
actors={a['id']:a for a in raw['actors']}
for ev in raw['combatant_info_events']:
    a=actors.get(ev['sourceID'])
    if a and a['name'].lower()=='shredzepelin':
        for i,s in enumerate(ev['gear']):
            if (s.get('id') or 0)>100000: print('slot',i,s.get('id'))
"
```

gives `slot 1 278827` and `slot 14 278819`. Resolved against the pinned db:

```
python -c "
import json
db={i['id']:i['name'] for i in json.load(open('vendor/wowsims/db.json'))['items']}
for iid in (278827,278819): print(iid,'->',db.get(iid,'NOT IN DB'))
"
```

gives `278827 -> Amulet of Bitter Hatred` and
`278819 -> The Frost Lord's War Cloak` — both **Wrath-era** items, not TBC.

## Why it matters

This is the fixture the whole ranking pipeline treats as shredzepelin's real
worn gear (`cli.ts:340`), so it is the baseline every candidate delta is
measured against, and the gear the 103/106 loop's numbers were computed on.

Two possibilities, and this ticket does not distinguish them (**untested**):

1. **An id-mapping bug** — the WCL ids are being carried through unmapped, and
   these two happen to collide with real Wrath ids in the pinned db, so they
   resolve silently to plausible-looking items instead of failing loudly. That
   would mean the sim is being fed two wrong items with wrong stats.
2. **Genuinely logged gear from a non-TBC source**, in which case the fixture is
   mislabelled rather than the mapping broken.

Possibility 1 is the concerning one precisely because it **fails silently**:
resolution succeeds and returns a well-formed item, so nothing downstream
notices. A guard that rejects ids outside the expected phase/expansion range
when building the equipment payload would turn a silent wrong answer into an
error.

## Scope note

The 103/106 loop's conclusions do **not** depend on this. Those numbers are all
*deltas* against a fixed baseline, and both these slots are untouched by every
arm the loop simmed (four T6 tier slots and the head). But the absolute baseline
DPS (~2152) does depend on it, and so would any future candidate in the neck or
back slot.

Found incidentally while diffing the owner's settings export against ours; not
investigated further because it was outside that loop's scope.

## Owner context, 2026-08-10 — the neck/back are Ahune holiday items

The current neck and back are Midsummer (Ahune) event items. Their item
levels and stats shift depending on which phase they are re-released in, so
some databases will not carry their exact ids at a given item level. The
out-of-range ids may be a symptom of that rather than fixture corruption —
any fix here must handle "real item, phase-shifted variant id our pinned db
lacks" as a legitimate case (map to the nearest same-name variant and
disclose, or warn), not just reject the id. Silent resolution to a Wrath
item remains the bug.

## WITHDRAWN, 2026-08-10 — the premise was wrong

**These are legitimate TBC items and the fixture is correct.** Measured in
`.scratch/set-bonus-value/loop-103-106/07-corrected-gear.md`.

The ids resolve to `phase: 2`, `quality: 4` (epic) entries, and all the
out-of-range ids in the pinned db form one coherent block:

```
python -c "
import json
for i in json.load(open('vendor/wowsims/db.json'))['items']:
    if i['id']>100000: print(i['id'],'|',i['name'],'| phase',i.get('phase'),'| quality',i.get('quality'))
"
```

gives `278774 Cloak of the Frigid Winds`, `278819 The Frost Lord's War Cloak`,
`278823 Icebound Cloak`, `278827 Amulet of Bitter Hatred`,
`278833 Choker of the Arctic Flow`, `278838 Amulet of Glacial Tranquility`,
`278847 Hailstone Pendant`, `278953 Frostscythe of Lord Ahune`,
`279240 Shroud of Winter's Chill` — an upstream **Ahune / Midsummer
re-release at TBC Phase-2 item levels**, not a Wrath id collision.

The two "possibilities" above are therefore both wrong. Resolution is not
silent or accidental: each name is unique in the db, the items carry full stat
vectors, and the sim pays them — emptying both slots costs **~96 DPS**
(`07-corrected-gear.md`). And the owner's own corrected settings export
(`owner-settings-export-v2.json`) carries these same two ids as their real neck
and back, which independently confirms the fixture rather than impugning it.

The proposed "guard against out-of-range ids" remediation would have **rejected
the player's actual gear**, and the "map to the nearest same-name variant"
remediation had nothing to map to.

**Closing as invalid.** The one thing worth keeping: our vendored db is
upstream's own `assets/database/db.json` at the pinned commit, but we still
cannot confirm from local data alone what a given wowsims *web deployment*
resolves these ids to — that would need the owner's tooltip stats or their web
build string. Recorded in tickets 103/106 as a (small, near-cancelling)
discrepancy channel rather than carried here.

## External confirmation, 2026-08-11

The owner verified both ids on wowhead (matching wowsims and in-game tooltips),
recorded in `.scratch/set-bonus-value/loop-103-106/owner-web-results-2026-08-11.md`:

- 278827 Amulet of Bitter Hatred —
  https://www.wowhead.com/tbc/item=278827/amulet-of-bitter-hatred
- 278819 The Frost Lord's War Cloak —
  https://www.wowhead.com/tbc/item=278819/the-frost-lords-war-cloak

Independently, `10-baseline-offset.md` fetched those pages (via the `?xml` and
`nether.wowhead.com/tbc/tooltip/` endpoints — the plain pages render stats in JS
and return nothing) and compared them against our pinned db field by field:

| 278827 | ours | wowhead |
|---|---|---|
| ilvl / quality | 128 / epic | 128 / epic |
| agi / sta | 22 / 20 | 22 / 20 |
| melee + ranged AP | 48 / 48 | 48 / 48 |
| hit rating | 20 | 20 |

| 278819 | ours | wowhead |
|---|---|---|
| ilvl / quality | 128 / epic | 128 / epic |
| agi / sta | 25 / 24 | 25 / 24 |
| melee + ranged AP | 56 / 56 | 56 / 56 |
| armor | 108 | 108 |

**Every leaf matches.** Our db resolves these items correctly, the fixture is
right, and the "silent resolution to a Wrath item" premise is falsified from an
external source as well as internally. Stays closed as invalid.
