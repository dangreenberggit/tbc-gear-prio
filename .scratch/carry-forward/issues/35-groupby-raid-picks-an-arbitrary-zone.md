Status: open
Type: task
Origin: `.scratch/phase-2/issues/03-apply-view.md` (branch `phase-2/apply-view`)
Blocks: none
Blocked by: none

# `groupBy: 'raid'` buckets a multi-zone item under an arbitrary zone

`zoneKeyOf` in `packages/core/src/view.ts` returns the **first** zone-bearing
source it finds:

```ts
for (const s of sourcesOf(item)) {
  if ("zone" in s) return s.zone;
}
```

For an item carrying one zone that is correct and complete. For an item whose
`sources` span two zones it is arbitrary — the bucket depends on array order in
`data/universes/ret-p*.json` rather than on anything the user chose.

This is real in the committed data, not hypothetical — though **not yet at the
current default tier**. Measured 2026-08-05 with the command below:
`ret-p2.json` has **0** multi-zone entries, and `ret-p3/p4/p5.json` have **5**
each (e.g. 32590 Nethervoid Cloak — Black Temple + Hyjal Summit; 30129
Crystalforge Breastplate — Serpentshrine Cavern + Tempest Keep). So the bug is
unreachable at `maxPhase: 2` and appears the moment anyone ranks at P3+, which
is why it is filed rather than left unrecorded.

```bash
python -c "
import json
d=json.load(open('data/universes/ret-p2.json'))
for e in d['entries']:
    zs={s['zone'] for s in e.get('sources',[]) if 'zone' in s}
    if len(zs)>1: print(e['itemId'], e.get('name'), sorted(zs))
"
```

Note the `raid` **filter** is not affected — `matchesZone` checks every source,
so a multi-zone item correctly appears under either zone's filter. Only the
`groupBy: 'raid'` bucketing has to choose one, and today it chooses badly.

## Why it was deferred rather than fixed

The honest fix is to decide a product question that Phase 2 does not need to
answer: does a two-zone item appear **twice** (once per zone, which makes the
group counts stop summing to the row count) or **once** under a rule the user
can predict (say, the earliest-phase zone)? That is a display decision worth
making with the Phase 3 UI in front of us, not guessing now.

## Done when

`groupBy: 'raid'` places multi-zone items by a stated rule rather than by
source order, with a test naming a real multi-zone item from the universe.
