Status: open
Type: task
Origin: discussion after ticket 55, 2026-08-07
Blocks: none
Blocked by: none

# Replace agent transcription of the Wowhead gear pages with a scraper

`data/wowhead-lists/**` is currently produced by an agent reading a rendered
guide page and writing JSON (`collectedBy: delegator-agent` /
`claude-opus-5`). [[55-wowhead-page-is-correct-transcription-paraphrased-it]]
established that the pages are **correct** and the errors were introduced
during that step — specifically by paraphrasing the Rank column instead of
copying it, and by flattening two tables into one.

A scraper copying the Rank and Source cells verbatim would not have made any of
those three errors. This is the durable fix for that failure mode.

## Scope

The seven files under `data/wowhead-lists/`, each with its `sourceUrl` already
recorded in the file. Per row the page gives: Rank cell, item link (name +
item id), Source cell prose, and — for tier rows — a `(via <token>)` link
carrying the token's own item id.

## Requirements

- **Copy, do not summarise.** `rankLabel` and `wowheadSourceText` must be the
  cell contents. Any judgement (is this a tier row, which token, which boss)
  belongs in separate fields derived from the copied text, so a later reader
  can tell what the page said from what we concluded.
- **Preserve table structure.** `section` must distinguish the headline table
  from the collapsed "Other <Slot> Recommendations" table. Ticket 55's 30129
  defect is exactly this boundary being lost.
- Keep the existing schema otherwise — `assemble_universe.py` reads
  `wowheadSourceText`, and the gates added in this branch read `rankLabel` and
  the `via*` fields.
- Emit the same provenance block (`sourceUrl`, `pageAuthor`, `pageUpdated`,
  `collectedDate`) plus a `collectedBy` naming the script.
- **Restore the 40 dropped rank labels.** Inherited from ticket 55, and the real
  defect behind it: every `alternative`-section row in `ret/p4.json` has
  `rankLabel: null`, while the page labels them. A faithful scrape fixes it, and
  there is no longer a singleton gate to fight — that gate was deleted in
  `530711f` precisely because it penalised this fix.

  ```bash
  python -c "
  import json
  from collections import Counter
  d=json.load(open('data/wowhead-lists/ret/p4.json',encoding='utf-8'))
  print(Counter((e.get('section'), e.get('rankLabel') is None) for e in d['entries']))
  "
  # ('alternative', True): 40   ('headline', False): 56
  ```
- **Do [[59-parenthetical-parsed-as-a-zone]] first, or with this.** The parser
  turns any trailing parenthetical into a zone. Three known items are absent
  from every shipped universe today, so the bug is dormant — a re-scrape that
  admits one of them ships a wrong `zone`/`boss` pair straight to a filter
  control.

## Answered: the pages are scrapeable, but access is rate-limited

**The guide body is not HTML.** It ships as one `WH.markup.printHtml("...")` JS
string holding Wowhead's own BBCode — `[table]`, `[tr]`, `[td]`,
`[item=30905]`, `[npc=17968]` — so extraction is: pull the `printHtml` argument
as a JS string literal, `json.loads` it, then walk the BBCode. Item ids and rank
labels are both structured there (`[item=NNNNN]` and a plain `[td]`), which is
all this ticket needs. NPC and item names resolve from `WH.Gatherer.addData(...)`
payloads in the same response.

**Access is the unsettled part.** An earlier session recorded that `urllib` with
browser-like headers returns 200. On 2026-08-07 that stopped being true from
this machine — every URL 403s, including one that had worked minutes earlier —
so the 200 was a property of that attempt, not a durable fact. The in-app
browser reads the pages fine but began returning CDN errors after roughly eight
loads, and cleared on its own within the hour.

So: **budget the fetches, expect to resume across sessions, and do not tune
request headers to defeat the block.** Plan for ~30 page loads (7 lists, plus
re-reads), not one clean pass.

## Value, honestly stated

The gear lists are near-static: TBC is a finished expansion and these guides
change rarely. The exception the user named is **event-related items**, whose
power varies with in-game world events during the year, so those rows do
genuinely churn.

So the payoff is mostly **cheap, safe re-collection** — refreshing a page
becomes a command rather than an agent session that can paraphrase again — plus
closing the failure mode in ticket 55 permanently. It is not urgent.

## Done when

- Whether the pages are scrapeable without a headless browser is answered and
  written down.
- A script regenerates at least one list file, and its output matches the
  committed file except for rows a human confirms the script got *more* right.
- The singleton-label budget in `pool-hardening.test.ts` drops for any
  re-collected file (see [[55-wowhead-page-is-correct-transcription-paraphrased-it]]).
