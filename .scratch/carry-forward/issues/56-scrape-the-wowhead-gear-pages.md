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

## Unknown: are the pages scrapeable at all

**Not yet investigated.** Wowhead renders a lot client-side, so a plain
`requests` + HTML parse may return an empty shell and the guide tables may need
a headless browser. Establish this first — it decides whether this ticket is a
small script or a browser-automation job, and it is cheap to check by fetching
one `sourceUrl` and looking for a known item name in the response body.

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
