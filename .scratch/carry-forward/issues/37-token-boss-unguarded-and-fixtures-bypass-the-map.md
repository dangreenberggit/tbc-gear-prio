Status: open
Type: task
Origin: `docs/reviews/phase-2-apply-view.md` D1/D2; user review 2026-08-05
Blocks: none
Blocked by: none

# Tier-token `boss` is unguarded, and test fixtures bypass the token map entirely

Filed after a review found a test fixture pairing `Gloves of the Fallen
Champion` with `Prince Malchezaar`. The correct boss is **The Curator**.
Malchezaar is a real Karazhan token boss — he drops `Helm of the Fallen
Champion` (29073 Justicar Crown) — so this was a right-raid, real-boss,
wrong-slot pairing, which is the kind that survives a casual read.

**The curated data was never the problem, and that is the useful finding.**
`data/two-hop/ret-tokens.json` is exactly the setup this needs: 18 entries with
`pieceId`, `tokenId`, `tokenName`, `zone`, `boss`, sourced from an AtlasLoot
parse of token drop IDs, cross-checked against Wowhead item pages, carrying an
`assertTokenIdDiffers` guard and a recorded correction for a Wowhead mislabel
(Lightbringer Breastplate → Forgotten Conqueror 31089). `assemble_universe.py`
merges it into the universes. Verified clean 2026-08-05 — all 15 tier pieces in
`ret-p3.json` agree with the map on zone, boss **and** token name:

```bash
python -c "
import json
tw={e['pieceId']:e for e in json.load(open('data/two-hop/ret-tokens.json'))['entries']}
bad=[]
for e in json.load(open('data/universes/ret-p3.json'))['entries']:
    m=tw.get(e['itemId'])
    if not m: continue
    for s in [s for s in e['sources'] if s.get('kind')=='token']:
        if (s.get('boss'),s.get('zone'),s.get('token'))!=(m['boss'],m['zone'],m['tokenName']):
            bad.append((e['itemId'],s))
print('mismatches:',len(bad))"
```

## The two actual gaps

**1. The pipeline guard never checks `boss`.** `pool-hardening.test.ts:564`
("includes all tier pieces through phase 3 with token zone attribution")
asserts `source.kind === "token"` and `source.zone === map.zone` for all 15
pieces — but never `source.boss` or `source.token`. The universe happens to be
correct today; nothing would catch a regeneration that scrambled bosses within
the right zone. That is the same failure mode as the fixture bug, one layer down
and load-bearing, since the boss filter is a shipped `ViewOptions` control.

**2. Test fixtures hand-write `ItemSource` literals with no cross-check.** 45
`kind: "raid"` / `kind: "token"` literals across `packages/core/test/*.test.ts`,
each free to invent a zone/boss/token triple. They are correctly *typed* —
`ItemSource` is a real union — so ticket 34 (tests are never typechecked) would
not catch this class either. Only a data check does. Two of the three bad
fixtures in the `phase-2/apply-view` review were of this kind: 29381 Choker of
Vile Intent written as a Tempest Keep drop when it is `{"kind":"badge"}`, and
28530 written as Tempest Keep / Al'ar when it is Karazhan / Moroes.

## Done when

- The tier-piece hardening test asserts `boss` and `token` against the two-hop
  map, not just `zone`.
- Fixtures that name a real item id derive their `source` from the committed
  universe rather than hand-writing it, or a test asserts that any fixture
  source naming a real id matches that id's universe entry. A helper that reads
  `ret-p2.json` once and hands back a real `PoolEntry` would remove the whole
  class; hand-written sources stay fine for synthetic ids that name no real
  item.
