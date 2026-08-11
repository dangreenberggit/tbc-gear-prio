Status: open
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
