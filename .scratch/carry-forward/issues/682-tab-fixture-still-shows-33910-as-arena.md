Status: closed
Closed: 2026-10-17, stage tab-follow-ups
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

## Resolution (2026-10-17, stage tab-follow-ups)

Both fixtures were re-recorded with `pnpm tab-fixtures:record` on fork
`3bdacb8c6` and committed in `7de8a2c2`; `forkSha` is `3bdacb8c6` in both.
Re-run from the repo root:

```
python -I -c "import json;r=json.load(open('data/tab-fixtures/ret-p3-p2.json',encoding='utf-8'))['ranking']['items'];print([x['sources'] for x in r if x['itemId'] in (33910,22401)])"
```

It prints 33910 as `{'kind': 'pvp', 'via': 'honor', 'season': 3, 'origin': 'wowhead'}`
and 22401 as `{'kind': 'raid', 'zone': 'Dire Maul', 'boss': 'Isalien', 'origin': 'db'}`.
On the fixture page the 33910 row (Wrist) reads "PvP vendor · Honor,
season 3". In `feral-p5-th4pc` the 33880 row carries `season: 3`.

- Wall times: `ret-p3-p2` 214 s (the tab reported "Took 183.5s");
  `feral-p5-th4pc` "Took 383.2s", but the recorder process exited only after
  2767 s. It wrote the file at about 391 s and then hung for about 38
  minutes before it exited with rc 0 (cause not investigated; hypothesis,
  untested, that the browser or keep-awake shutdown hung).
- Beyond `sources` nothing moved. A Python compare of the old and new
  fixtures gave the same `itemId` order (794 and 928 items) and no change in
  any other field except each changed row's shown `source`, `durationMs`,
  `forkSha` and `recordedAt`. Ret: 5 rows changed source (27484, 33910,
  22401, 28034, 28288). Feral: 8 rows (33881, 33893, 28034, 32814, 33880,
  33296, 32087, 33879). So the figures that `fork-meta-repair.test.ts` and
  `fork-set-fixtures.test.ts` pin did not move; `pnpm verify` passed at
  `7de8a2c2` with them unchanged.
- `pnpm tab-fixtures:check` rc 0 (both fixtures: "inputs changed since:
  none"); `pnpm tab-fixtures:smoke` 6 ok, 0 failed.

Verified by: the command above at `tbc-gear-prio@7de8a2c2`, and
`pnpm tab-fixtures:check`.
