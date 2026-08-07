Status: closed — measured, premise false
Type: bug
Origin: user screenshot of the live p4 page, 2026-08-07
Blocks: none
Blocked by: none

# The Wowhead page is right; our transcription paraphrased it

> **Closed 2026-08-07 without doing the work: the premise below is false.**
>
> This ticket reads a long tail of one-off `rankLabel` values as an agent
> paraphrasing the page. Measured against the live P4 markup, 13 of the 14
> suspect rows match the page text exactly; the 14th (`32581`) differs only
> because the page cell holds a line break (`'Best - \n\nNo Expertise'`) that
> the collected file sensibly collapses.
>
> The p4 Rank column genuinely is long-tailed. Its singletons include
> `'Optional - Human'`, `'Undead Only & Demons'`, `'Best - No Expertise'` and
> `'Optional-Crafted'` — race and mechanic specifics no summariser invents — and
> the `'Optional - tier'` / `'Optional - Tier'` pair is the page author's own
> inconsistent capitalisation, not two spellings of an invented idea:
>
> ```bash
> python -c "
> import json
> from collections import Counter
> d=json.load(open('data/wowhead-lists/ret/p4.json',encoding='utf-8'))
> c=Counter(e['rankLabel'] for e in d['entries'] if e.get('rankLabel'))
> print(sorted(l for l,n in c.items() if n==1))
> "
> ```
>
> Consequences, all handled:
>
> - The `SINGLETON_BUDGET` gate this ticket asked for (suggested work 2) was
>   built, then **deleted** — it measured page vocabulary, not collection
>   defects, and was inverted: our p4 file has `rankLabel: null` on the 40
>   `alternative`-section rows the page does label, so a faithful re-scrape
>   restores labels, adds singletons, and fails the gate. That dropped-label
>   data loss is the real defect here, and it is the opposite of the paraphrase
>   story. It belongs to [[56-scrape-the-wowhead-gear-pages]].
> - Suggested work 1 (re-check the 14 rows) is the measurement above: empty.
> - Suggested work 4 (the `ret-tokens.json` note) is done, but **not** as
>   written here — see below.
>
> This ticket's own causal claim is also too broad. It says the page is right
> and collection introduced the error; that holds for P3 and is wrong for
> P4/P5, whose pages carry the bad token as bare text. See
> [[49-lightbringer-breastplate-names-a-token-paladins-cannot-use]] and
> [[50-crystalforge-breastplate-claims-a-serpentshrine-boss]] for the per-page
> split. Suggested work 3 (split collection from interpretation) survives all
> of this and lives on in [[56-scrape-the-wowhead-gear-pages]] and
> [[57-guide-prose-should-not-source-items-a-machine-input-covers]].
>
> Everything below is the original text, preserved for the record.

A screenshot of the live P4 chest table (the `sourceUrl` already recorded in
`data/wowhead-lists/ret/p4.json`) shows the page states:

```
Best      Lightbringer Breastplate    Drop: Illidan Stormrage (Black Temple)
                                      (via Chestguard of the Forgotten Conqueror)
...below the "Other Chest Armor Recommendations" fold...
Optional  Crystalforge Breastplate    Drop: Kael'thas Sunstrider (Tempest Keep)
                                      (via Chestguard of the Vanquished Champion)
```

Both are **correct**. Our transcription recorded:

```json
{"itemId": 30990, "rankLabel": "Optional - tier", "section": "headline",
 "viaTokenId": 30236, "viaTokenName": "Chestguard of the Vanquished Champion",
 "wowheadSourceText": "Drop: Chestguard of the Vanquished Champion - Illidan Stormrage (Black Temple)"}
{"itemId": 30129, "rankLabel": "Old Tier", "section": "headline",
 "viaTokenName": null,
 "wowheadSourceText": "Drop: Morogrim Tidewalker (Serpentshrine Cavern)"}
```

## This overturns the recorded cause of tickets 49 and 50

`data/two-hop/ret-tokens.json` carries the note "Wowhead Phase 3 BiS guide
mislabels Lightbringer Breastplate token as Chestguard of the Vanquished
Champion". Tickets 49 and 50 were closed on that basis — "the transcription
faithfully copied a wrong page". **The page is not wrong.** The error was
introduced during collection.

The fixes themselves stand (the values now match the page and the two-hop map).
Only the stated *cause* was wrong, and it was wrong in the direction that
matters: it blamed an upstream we cannot control instead of a step we own.

## What actually happened, and the signal that reveals it

Six of the eight tier rows in p4 are perfect. The defects are not random:

```bash
git show 103f821:data/wowhead-lists/ret/p4.json | python -c "
import json,sys
from collections import Counter
d=json.load(sys.stdin)
c=Counter(e['rankLabel'] for e in d['entries'] if e['section']=='headline')
for k,v in sorted(c.items(), key=lambda x:-x[1]): print(v,repr(k))
"
# 16 'Best'
# 16 'Optional'
#  1 'Optional - tier'
#  1 'Optional - Tier'
#  1 'Old Tier'
#  1 'T6 Option'
#  1 'Tier Option'
#  ... 12 more singletons
```

`Best` and `Optional` are the page's actual Rank values — the screenshot shows
exactly those. The 17 singleton labels are **paraphrase**: the agent wrote its
own summary of each row rather than copying the Rank cell. `"Optional - tier"`
and `"Optional - Tier"` are two spellings of one invented idea.

**All three known defects (30990, 30129, 30993) are among those 17 rows.** The
same rows where the agent stopped transcribing and started summarising are the
rows where the facts drifted.

Two further tells on the same rows:

- `section` is wrong. The screenshot puts 30129 below an "Other Chest Armor
  Recommendations" fold — a separate table — but we recorded it as `headline`,
  adjacent to 30990. Two tables were flattened into one and the boundary rows
  were mangled.
- The wrong token on 30990 (Vanquished Champion, `30236`) is the **correct
  token for 30129**, the other chest row. Content moved between adjacent rows.

`viaTokenId: 30236` is internally consistent with its `viaTokenName`, so this
was not a hallucinated ID — it is a real value attached to the wrong item.

## Why this matters more than the three items

The collection step is **not** a faithful-copy operation, and was not treated
as one. It mixed three jobs: copy the source text, resolve item IDs, and label
each row's rank. The third is interpretation, and it contaminated the first.

This also means the earlier conclusion in
[[54-transcribed-inputs-are-the-defect-source-and-cross-checks-are-the-only-detector]]
— "a scraper would have reproduced these defects, because the page itself was
wrong" — is **false**. A scraper reading the Rank cell and the Source cell
verbatim would have got all three of these right.

## Suggested work

1. **Re-check the 14 other singleton-label rows** against the live pages. They
   carry the same marker as the three known-bad rows; that makes them suspect,
   not guilty. This is a measurement, not a rewrite.
2. **Gate the label vocabulary.** `rankLabel` should come from a small closed
   set (`Best`, `Optional`, plus whatever the pages actually use). A singleton
   label is evidence of paraphrase and should fail, or at least be listed.
3. **Split collection from interpretation.** Whatever re-collects these should
   copy cells verbatim into `wowheadSourceText` / `rankLabel` and do any
   judgement in a separate, clearly-marked field. See
   [[56-scrape-the-wowhead-gear-pages]].
4. Correct the `notes` in `data/two-hop/ret-tokens.json`: the Wowhead mislabel
   it records is not present on the live page. Leaving it invites the next
   agent to trust a page-is-wrong story that is not true.

## Done when

- The 14 suspect rows are checked and any bad ones fixed.
- `rankLabel` is constrained, or singleton labels are surfaced by a gate.
- The `ret-tokens.json` note is corrected or removed with a reason.
- Tickets 49 and 50 carry a correction pointing here.
