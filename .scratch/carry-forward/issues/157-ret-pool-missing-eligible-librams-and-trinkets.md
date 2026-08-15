Status: resolved
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md (SME review of feat/ret-p3-data @ 9004654)
Blocks: none
Blocked by: none

# Ret pool excludes eligible librams and known TBC trinkets

The 2026-08-14 SME review of the ret P3 refresh (verdict:
trust-with-caveats) found two medium findings, both pool-membership, both
predating the `feat/ret-p3-data` branch. Evidence is in
`data/universes/ret-p3.report.json` under `wowheadRecall.missedItems`
(18 misses, 17 `d7Eligible: true`).

## Finding 1 — relic slot roughly half-empty

The P3 universe offers 4 ranged-slot items. Three more librams are
`d7Eligible: true` yet absent from the pool:

- 27484 Libram of Avengement — the 16th populated slot of upstream's
  curated P3 set, and the reason the tag match is 15/16
- 31033 Libram of Righteous Power
- 22401 Libram of Hope

Three of four missing relics are librams — one apparent cause. P2's relic
slot is thinner still (3 items), so this predates the P3 refresh.

## Finding 2 — known TBC ret trinkets missing

- 31856 Darkmoon Card: Crusade
- 28034 Hourglass of the Unraveller
- 28288 Abacus of Violent Odds

The other five misses are pre-TBC raid trinkets (Mark of the Champion,
Slayer's Crest, Drake Fang Talisman, Kiss of the Spider, Scrolls of
Blinding Light); excluding those is defensible.

## Done when

The pool-construction cause of the libram/trinket exclusions is identified
(hypothesis: one shared filter drops them), the eligible items above enter
the ret universes, and the affected universes regenerate with a recall
re-measure. The SME review's "would a ret trust this?" gate re-opens on the
result.

## Comments (2026-08-14)

Root cause was not one filter but two failure modes that both land on the
same six items — the "one shared filter" hypothesis was close but not
exact:

- 27484 (Blood Furnace, heroic), 22401 (Dire Maul, normal), 28034 (The
  Black Morass, normal), 28288 (The Mechanar, normal) each have a real
  `sources[]` entry in `vendor/wowsims/db.json`, but every one names a
  five-man zone that is neither a `phase_raids.json` raid nor listed in
  `PHASE_HEROIC_DUNGEONS` (which deliberately holds only Magisters'
  Terrace, per ticket 17's scope decision). Their Wowhead prose also
  mis-parses: `WOWHEAD_HEROIC_ZONE_RE` expects a `"Heroic X"` prefix, but
  27484's page reads `"X - Heroic"` (suffix), so the parser falls through
  to the generic raid branch and produces an equally unusable zone.
- 31033 and 31856 carry no `sources[]` at all in db.json; their only
  witness is Wowhead quest prose (`"Quest: News of Victory"`,
  `"Quest: Darkmoon Blessings Deck (Bind on Equip)(via Blessings Deck)"`),
  which the parser also cannot turn into a real source (the second one
  invents a bogus "Bind on Equip" zone from the parenthetical).

Widening `PHASE_HEROIC_DUNGEONS` to cover Blood Furnace/Dire
Maul/Mechanar/Black Morass would also admit the ~280 other phase-1 items
those dungeons drop — exactly the broader question ticket 17 named and
deferred as its own project. Fix scope stayed at the six named items:
`TICKET_157_FORCE_INCLUDE` in `scripts/assemble_universe.py` force-admits
them with `{"kind": "unknown"}` / `origin: "curated"` (the same shape
`curated_unsourced` already uses for a wowsims-equipped item with no
resolvable source), and the db/Wowhead loops skip adding those items'
unusable raw source rows so the build's per-row validation guard
(PLAN.md §8.3.2) never has to reject them.

All six items now ship in every ret universe. Verified:

```
python scripts/assemble_universe.py --spec ret --max-phase 3 \
  --out data/universes/ret-p3.json --report data/universes/ret-p3.report.json
python -c "import json; r=json.load(open('data/universes/ret-p3.report.json')); print(r['ticket157ForceIncluded'])"
# [22401, 27484, 28034, 28288, 31033, 31856]
```

Recall re-measured on ret-p3: `wowheadRecall.recalled` went from 105/123
(85.4%) to 111/123 (90.2%) — a gain of exactly the six force-included
items. `missedItems` after the fix still lists the five pre-TBC trinkets
this ticket named as defensibly excluded (Scrolls of Blinding Light,
Drake Fang Talisman, Kiss of the Spider, Slayer's Crest, Mark of the
Champion) plus items outside this ticket's scope. Command:

```
python -c "import json; r=json.load(open('data/universes/ret-p3.report.json')); print(r['wowheadRecall']['recalled'], '/', r['wowheadRecall']['listTotal']); print([m['itemId'] for m in r['wowheadRecall']['missedItems']])"
```

P2's relic slot (also affected — three of the six items are phase 1)
regenerated the same way and grew from 3 to 6 candidates (gaining 22401,
27484, 31033); its previous three (23203, 28592, 30063) are unchanged.

All four affected universes (`ret-p2`, `ret-p3`, `ret-p4`, `ret-p5`)
regenerated and re-checked byte-stable against a second run:

```
python scripts/assemble_universe.py --spec ret --max-phase 3 --out <scratch> --report <scratch>.report
cmp data/universes/ret-p3.json <scratch>   # identical
```

`git diff --numstat -- data/universes/` touches only the four `ret-*`
pairs — the two `feral-*` universes are untouched.

`packages/core/test/pool.test.ts` (ret-p2 entry count 241 -> 247) and
`packages/core/test/pool-hardening.test.ts` (ret-p3 entry count 394 ->
400) are repinned with explanatory comments pointing back here.

The SME review's "would a ret trust this?" gate re-opens on this result
per the ticket's own instruction — that call belongs to the user/SME
reviewer, not this worker; left untouched here.

Commit: (recorded in the branch's commit for this ticket, see `git log`).
