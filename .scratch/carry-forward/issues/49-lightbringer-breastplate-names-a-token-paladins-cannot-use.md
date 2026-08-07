Status: closed
Type: bug
Origin: ticket 44 investigation + `sme-rank-review`, 2026-08-07
Blocks: none
Blocked by: none

# 30990 Lightbringer Breastplate names a token group paladins cannot use

Lightbringer is the paladin T6 set, so its chest comes from a **Forgotten
Conqueror** token. The universe's `kind: raid` row for it names **Chestguard of
the Vanquished Champion** — the Vanquished Champion group (warrior/hunter/
shaman), which a paladin cannot redeem.

The same entry's `kind: token` row is correct, so the item contradicts itself:

```bash
python -c "
import json
for e in json.load(open('data/universes/ret-p4.json',encoding='utf-8-sig'))['entries']:
    if e['itemId']==30990:
        for s in e['sources']: print(s)
"
# {'kind': 'token', 'zone': 'Black Temple', 'token': 'Chestguard of the Forgotten Conqueror', 'boss': 'Illidan Stormrage'}
# {'kind': 'raid',  'zone': 'Black Temple', 'boss': 'Chestguard of the Vanquished Champion - Illidan Stormrage'}
```

Present in `ret-p3.json`, `ret-p4.json`, `ret-p5.json`.

## This is the only one of its kind

[[48-token-name-spliced-into-boss-field]] lists 10 items whose `boss` field has
a token name spliced in. For nine of them the embedded name **matches** their
own token row and the defect is only formatting. 30990 is the single case where
the embedded name names a different token group:

```bash
python -c "
import json,glob
tok={}; bad=[]
for f in sorted(glob.glob('data/universes/ret-p*.json')):
    if 'report' in f: continue
    for e in json.load(open(f,encoding='utf-8-sig'))['entries']:
        t=[s for s in e.get('sources',[]) if s.get('kind')=='token']
        r=[s for s in e.get('sources',[]) if s.get('kind')=='raid' and ' - ' in (s.get('boss') or '')]
        if t and r:
            emb=r[0]['boss'].rsplit(' - ',1)[0].strip()
            if emb != t[0].get('token'): bad.append((e['itemId'], emb, t[0].get('token')))
print(sorted(set(bad)))
"
# [(30990, 'Chestguard of the Vanquished Champion', 'Chestguard of the Forgotten Conqueror')]
```

## Root cause: the transcribed list, not the parser

The error is already present in the **collected input**, so fixing 48's parser
will not fix this:

```bash
python -c "
import json
d=json.load(open('data/wowhead-lists/ret/p4.json',encoding='utf-8-sig'))
print([e['wowheadSourceText'] for e in d['entries'] if e['itemId']==30990])
"
# ['Drop: Chestguard of the Vanquished Champion - Illidan Stormrage (Black Temple)']
```

The curated `data/two-hop/ret-tokens.json` row is correct
(`tokenName: "Chestguard of the Forgotten Conqueror"`, `tokenId: 31089`) and
already carries a recorded correction for a Wowhead mislabel on this exact
item. **Hypothesis, unverified:** the same upstream Wowhead mislabel was
transcribed into `data/wowhead-lists/ret/p3-p5.json` without the correction.
Check the live Wowhead page and the two-hop file's correction note before
deciding whether to fix the transcription or teach the pipeline to prefer the
two-hop map.

## Why it matters more than 48

48 is wrong text on screen. This one tells a paladin the wrong token to look
for, and the tool is supposed to answer exactly that question. The two-hop map
carries `assertTokenIdDiffers: True` for this row, which shows the correct
value was already known and separately verified — and the bad value still
reached the universe.

## Done when

- 30990's sources agree with each other and with `data/two-hop/ret-tokens.json`.
- A gate fails when an item's `raid`-row token name disagrees with its own
  `token` row — a cross-check between the two, so a future transcription slip
  cannot land silently. Prefer this over correcting the one string.
- Whether the transcription or the pipeline was corrected is stated here, with
  the command that shows the universes agree afterwards.

## Resolution (2026-08-07)

**The transcription was corrected**, not the pipeline.

The ticket asked whether the live Wowhead page or the transcription was wrong.
That was answerable from the repo without fetching anything:
`data/two-hop/ret-tokens.json` already records the answer in its own `notes` —
"Wowhead Phase 3 BiS guide mislabels Lightbringer Breastplate token as
Chestguard of the Vanquished Champion; corrected to Forgotten Conqueror
(31089) via item page + AtlasLoot Illidan BT drop."

So the transcription faithfully copied a genuinely-wrong upstream page. The
correction is now recorded in a `corrections` array in each of
`data/wowhead-lists/ret/p3.json`, `p4.json` and `p5.json`, so a future
re-transcription does not silently reintroduce it.

```bash
python -c "
import json
for e in json.load(open('data/universes/ret-p4.json',encoding='utf-8-sig'))['entries']:
    if e['itemId']==30990:
        for s in e['sources']: print(s)
"
# {'kind': 'token', 'zone': 'Black Temple', 'token': 'Chestguard of the Forgotten Conqueror', 'boss': 'Illidan Stormrage'}
# {'kind': 'raid',  'zone': 'Black Temple', 'boss': 'Illidan Stormrage'}
```

The requested cross-check gate exists — see [[51-tier-source-rows-are-unguarded-past-sources0]].

**Correction to this ticket:** "This is the only one of its kind" holds for the
*token* half only. 30993 had the same class of defect in the *boss* half, which
this ticket's own measurement command could not see because it compared only
the embedded token name. Recorded in ticket 51.

## Correction (2026-08-07, same day) — itself superseded, see below

**The stated cause above is wrong.** A screenshot of the live P4 page shows it
reads `(via Chestguard of the Forgotten Conqueror)` — correct. The page does
not carry the mislabel that `ret-tokens.json`'s note describes, so the error
was introduced during collection, not copied from a wrong source.

The fix stands; only the diagnosis was wrong, and it was wrong in the direction
that matters — it blamed an upstream we do not control instead of a step we
own. See [[55-wowhead-page-is-correct-transcription-paraphrased-it]].

## Second correction (2026-08-07, same day) — the cause is per page

The correction above is also too broad. It generalised one screenshot to every
page; checked against the live guide markup, the pages **disagree with each
other** on this token:

| Page | How the token is recorded | Correct? |
|---|---|---|
| p1-p2 | `[item=30236]` link | yes |
| p3 | `[item=31089]` link | yes |
| p4 | bare text "Chestguard of the Vanquished Champion" | **no** |
| p5 | bare text "Chestguard of the Vanquished Champion" | **no** |

So **both** stories are true, on different pages. P3 links the right token and
our `p3.json` collection introduced the error — the correction above holds
there. P4 and P5 type the wrong token as prose, and our collection copied them
faithfully — the original "wrong upstream" cause holds there.

The `[item=]`/bare-text split is the whole signal: a structured id is a strong
witness, prose is a weak one. That is the durable lesson, not a verdict about
which side is usually at fault — these three items were *selected because they
were already known broken*, so the sample proves less than it looks like it
does.

The item data is correct and the fix stands, unchanged through both
corrections. `data/two-hop/ret-tokens.json`'s note now records this per-page
split. See [[57-guide-prose-should-not-source-items-a-machine-input-covers]],
which removes prose as a source for items a machine input already covers and
so makes this class unreachable.
[[55-wowhead-page-is-correct-transcription-paraphrased-it]] is closed as
premise-false and should not be read as support for the first correction.
