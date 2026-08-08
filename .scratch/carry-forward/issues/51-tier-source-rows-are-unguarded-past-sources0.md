Status: closed
Type: bug
Origin: tickets 48/49/50 measurement, 2026-08-07
Blocks: none
Blocked by: none

# Nothing validates a tier piece's sources past `sources[0]`

Tickets 48, 49 and 50 are all defects in a **non-first** `sources[]` row. The
ticket-37 tier guard reads `entry.source` — singular — and
`poolFromUniverse` sets that from `entry.sources[0]`
(`packages/core/src/pool.ts:109`). For every tier piece the curated two-hop
`token` row sorts first, so the guard inspects the good row and the bad
`raid` row rides along unchecked.

## Measured by mutation, on `103f821`

Planting obvious junk on the non-first raid row of a tier piece, consistently
across all three ret universes so the cross-tier consistency test cannot fire:

```bash
python -c "
import json
for p in ['data/universes/ret-p3.json','data/universes/ret-p4.json','data/universes/ret-p5.json']:
    d=json.load(open(p,encoding='utf-8-sig'))
    for e in d['entries']:
        if e['itemId']==30990:
            for s in e['sources']:
                if s.get('kind')=='raid':
                    s['boss']='MUTANT NOT A BOSS'; s['zone']='Karazhan'
    json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
"
npx vitest run
# Test Files 32 passed (32)
# Tests 386 passed | 2 todo (388)
git checkout data/universes/
```

The whole suite passes on data asserting a Black Temple tier chest drops from
`MUTANT NOT A BOSS` in Karazhan. This is the gap that let 48, 49 and 50 sit in
committed data, and it is wider than any of the three: it admits **any** junk
in any non-first row.

Mutating only `ret-p3.json` does fail, but at
`pool-hardening.test.ts:845` — the cross-tier consistency test — which catches
*disagreement between tiers*, not wrongness. A defect transcribed uniformly
into p3/p4/p5, which is exactly how 49 and 50 got here, is invisible to it.

## A fourth defect this sweep found: 30993

Cross-checking every tier row against `data/two-hop/ret-tokens.json` turns up
one case neither 49 nor 50 records. After 48's splice is undone, 30993
Lightbringer Greaves still names the wrong boss:

```bash
python -c "
import json,glob
m={e['pieceId']:e for e in json.load(open('data/two-hop/ret-tokens.json',encoding='utf-8-sig'))['entries']}
bad=set()
for f in sorted(glob.glob('data/universes/ret-p*.json')):
    if 'report' in f: continue
    for e in json.load(open(f,encoding='utf-8-sig'))['entries']:
        row=m.get(e['itemId'])
        if not row: continue
        for s in e.get('sources',[]):
            if s.get('kind')=='raid' and ' - ' in (s.get('boss') or ''):
                tok,boss=s['boss'].rsplit(' - ',1)
                if tok.strip()!=row['tokenName'] or boss.strip()!=row['boss']:
                    bad.add((e['itemId'],e.get('name'),boss.strip(),row['boss']))
print(sorted(bad))
"
# (30990, 'Lightbringer Breastplate', 'Illidan Stormrage', 'Illidan Stormrage')   <- token half, ticket 49
# (30993, 'Lightbringer Greaves', 'Gathios the Shatterer', 'The Illidari Council') <- boss half, unrecorded
```

Ticket 49's "this is the only one of its kind" is correct for the *token* half
and wrong for the *boss* half.

`Gathios the Shatterer` is a member of the Illidari Council encounter, so this
is a member-vs-encounter naming split rather than a wrong raid. It still
matters because `boss` is a shipped filter control and the repo's boss
vocabulary is `The Illidari Council` everywhere else:

```bash
grep -rn "Illidari Council" --include=*.json .scratch/heldout/ | head -3
```

So after 48 splits the field, 30993 would carry a `boss` value matching no
boss the filter offers.

## Done when

- A gate cross-checks **every** `kind: raid` row of a tier piece against
  `data/two-hop/ret-tokens.json` / `feral-tokens.json` on zone and boss, not
  just `sources[0]`.
- That gate is verified by mutation — plant junk uniformly across p3/p4/p5 and
  watch it fail — not merely by passing on good data.
- 30993 resolves to the repo's encounter name, or the map is corrected if the
  member name is judged right. State which and why.

## Resolution (2026-08-07)

Two gates added to `packages/core/test/pool-hardening.test.ts`, both iterating
**every** universe file (read from disk, so a newly assembled universe is
covered without anyone remembering to add it):

- "tier piece sources agree with the curated two-hop map" — every `kind: raid`
  row of a tier piece, both specs, checked on zone and boss.
- "no boss field carries a spliced item name" — every source row, every file.

**Verified by mutation, three ways.** The mutation that previously passed all
386 tests now fails in all three ret universes; so does a re-introduced splice;
so does a swap to a *real* boss in the *right* zone (Illidan → Mother Shahraz),
which no string-shape check could catch.

30993 was resolved to `The Illidari Council`, the encounter name used
everywhere else in this repo and in the two-hop map. `Gathios the Shatterer` is
a council member, so the drop attribution was not wrong in game terms, but
`boss` is a shipped filter control and the member name appeared in no other
boss field — it would have been a filter entry of one.

Feral was swept and is clean: 0 defects across all 10 tier pieces. This
corrects the handoff's note that feral "has no two-hop token map that I found"
— `data/two-hop/feral-tokens.json` exists and the same cross-check applies.
