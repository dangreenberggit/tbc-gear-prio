Status: closed
Type: bug
Origin: ticket 44 investigation + `sme-rank-review`, 2026-08-07
Blocks: none
Blocked by: none

# 30129 Crystalforge Breastplate claims a Serpentshrine boss that does not drop it

Crystalforge is the paladin T5 set. Its chest comes from **Chestguard of the
Vanquished Champion**, dropped by **Kael'thas Sunstrider in Tempest Keep**. The
universe carries a third source saying **Morogrim Tidewalker in Serpentshrine
Cavern**, who does not drop that token.

```bash
python -c "
import json
for e in json.load(open('data/universes/ret-p4.json',encoding='utf-8-sig'))['entries']:
    if e['itemId']==30129:
        for s in e['sources']: print(s)
"
# {'kind': 'token', 'zone': 'Tempest Keep', 'token': 'Chestguard of the Vanquished Champion', 'boss': "Kael'thas Sunstrider"}
# {'kind': 'raid',  'zone': 'Tempest Keep', 'boss': "Kael'thas Sunstrider"}
# {'kind': 'raid',  'zone': 'Serpentshrine Cavern', 'boss': 'Morogrim Tidewalker'}
```

Present in `ret-p3.json`, `ret-p4.json`, `ret-p5.json`.

## The repo already disagrees with itself

The same item is transcribed two different ways across the collected lists —
`p1-p2` is right, `p3`/`p4`/`p5` are wrong:

```bash
python -c "
import json,glob
for f in sorted(glob.glob('data/wowhead-lists/ret/*.json')):
    d=json.load(open(f,encoding='utf-8-sig'))
    for e in d['entries']:
        if e['itemId']==30129: print(f,'->',e['wowheadSourceText'])
"
# p1-p2.json -> Drop: Kael'thas Sunstrider (Tempest Keep)(via Chestguard of the Vanquished Champion)
# p3.json    -> Drop: Morogrim Tidewalker (Serpentshrine Cavern)
# p4.json    -> Drop: Morogrim Tidewalker (Serpentshrine Cavern)
# p5.json    -> Drop: Morogrim Tidewalker (Serpentshrine Cavern)
```

`data/two-hop/ret-tokens.json` agrees with the `p1-p2` version:
`{"pieceId": 30129, "zone": "Tempest Keep", "boss": "Kael'thas Sunstrider",
"tokenName": "Chestguard of the Vanquished Champion", "tokenId": 30236}`.

So two of the three inputs are right and the p3+ transcription is the outlier.
That is stronger evidence than a domain argument alone, and it is why this is
filed as a bug rather than a question.

**Hypothesis, untested:** the p3+ rows were transcribed from a Wowhead guide row
that listed a *different* item on the same line, or the wrong row was copied.
Confirm against the live page before editing.

## Why this one is the worst of the three

[[48-token-name-spliced-into-boss-field]] shows wrong text.
[[49-lightbringer-breastplate-names-a-token-paladins-cannot-use]] names the
wrong token. This one **sends a player to the wrong raid** for an item they
cannot get there. A Serpentshrine zone filter surfaces a tier chest that no
Serpentshrine boss drops.

Note this is *not* the same as the legitimate multi-zone case. 32589, 32590,
32591, 32592 and 34009 are T6-era trash drops that genuinely drop in both Black
Temple and Hyjal Summit, and both zones are true for them (that display question
is ticket 35's). 30129 is not a second true zone — it is a wrong one, and must
not be folded in as an equal alternative.

## Done when

- 30129 no longer claims Serpentshrine Cavern.
- A gate fails when a tier piece's `raid` row disagrees with
  `data/two-hop/ret-tokens.json` on zone or boss. Ticket 37 added a boss/token
  guard for tier pieces — check whether extending it to the `raid` rows (not
  just `token` rows) catches this, rather than writing a new gate.
- The other six ret/feral universes are checked for the same shape of
  disagreement, since this was found by accident and nothing was scanning for it.

## Resolution (2026-08-07)

**The transcription was corrected**, not the pipeline. `p3/p4/p5.json` now
carry `Drop: Kael'thas Sunstrider (Tempest Keep)`, agreeing with `p1-p2.json`
and `data/two-hop/ret-tokens.json`, with the reason recorded in a `corrections`
array in each file.

```bash
python -c "
import json
for e in json.load(open('data/universes/ret-p4.json',encoding='utf-8-sig'))['entries']:
    if e['itemId']==30129:
        for s in e['sources']: print(s)
"
# {'kind': 'token', 'zone': 'Tempest Keep', 'token': 'Chestguard of the Vanquished Champion', 'boss': \"Kael'thas Sunstrider\"}
# {'kind': 'raid',  'zone': 'Tempest Keep', 'boss': \"Kael'thas Sunstrider\"}
```

The Serpentshrine row is gone. Note the edit had to be scoped **by item id**:
30098 and 30081 are genuine Morogrim Tidewalker drops in the same files, and a
text-wide replace of that phrase corrupted them on the first attempt.

**Two tests were pinning this bug in place.** `pool.test.ts` and
`view.test.ts` both used 30129's Serpentshrine row as their multi-zone fixture,
asserting in a comment that it "really does carry" both zones. Both now use
32590 Nethervoid Cloak, a T6-era trash drop that genuinely drops in Hyjal
Summit and Black Temple — the legitimate multi-zone case this ticket named.
Both were re-verified by mutation (collapsing `sourcesOf`/`filterByZone` to the
primary source makes each fail), so they still catch the regression they exist
for.

The other five universes were swept: zero remaining defects of this class.

## Correction (2026-08-07, same day)

**The stated cause above is wrong.** The live P4 page lists Crystalforge
Breastplate under "Other Chest Armor Recommendations" as
`Optional | Drop: Kael'thas Sunstrider (Tempest Keep) (via Chestguard of the
Vanquished Champion)` — correct, and matching `p1-p2.json` and the two-hop map.

So this was never an upstream transcription of a wrong guide row. The
collection step dropped the token, took a boss from elsewhere, and flattened
the below-the-fold table into `headline`. See
[[55-wowhead-page-is-correct-transcription-paraphrased-it]].
