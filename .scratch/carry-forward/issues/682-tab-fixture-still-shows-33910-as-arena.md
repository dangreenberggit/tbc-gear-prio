Status: open
Type: task
Origin: pre-merge review feat/tab-source-labels, P4
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 619

# The tab fixture still shows Vindicator's Scaled Bracers as an arena item

## What the player sees

Nothing wrong on a live run is known. On the committed fixture page,
Vindicator's Scaled Bracers (33910) reads "PvP vendor · Arena", while its
honour siblings read "PvP vendor · Honor". feat/tab-source-labels corrected
33910 to honour in the data, so the fixture is out of date and no committed
fixture or recorded run shows the fix on the tab.

## Evidence

- `data/tab-fixtures/ret-p3-p2.json` `ranking.items[89]` gives 33910
  `{"kind": "pvp", "via": "arena", "origin": "wowhead"}`; no other committed
  fixture holds the item (`grep -c 33910 data/tab-fixtures/*.json`; the one
  hit in `feral-p3-nordrassil4.json` is inside the number
  `-0.8339100925613697`).
- `data/universes/ret-p3.json`, `ret-p4.json` and `ret-p5.json` give 33910
  `{"kind": "pvp", "via": "honor", "origin": "wowhead"}` (ticket 619,
  "Resolved, step 15").
- Ticket 619's closing note says a live run "should then show" honour and
  that this is untested.

## Done when

- `data/tab-fixtures/ret-p3-p2.json` is re-recorded on the current universes
  (or a live ret P3 run is captured), and its 33910 row reads
  "PvP vendor · Honor".
- The capture or the fixture's row is cited in this ticket, and
  `pnpm tab-fixtures:check` passes.
