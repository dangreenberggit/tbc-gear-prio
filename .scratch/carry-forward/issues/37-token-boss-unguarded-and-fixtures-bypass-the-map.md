Status: closed
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

## Closed 2026-08-06

**Gap 1 (pipeline guard) was already closed** before this session, by commit
`48c6e7f` (2026-08-05), which is also the commit that filed this ticket for
gap 2. Re-verified rather than trusted: mutated 29072's `boss` in the
committed `data/universes/ret-p3.json` to `"Prince Malchezaar"` and confirmed
`pool-hardening.test.ts`'s "includes all tier pieces through phase 3 with
token zone attribution" test fails with `expected 'Prince Malchezaar' to be
'The Curator'`, then reverted with `git checkout -- data/universes/ret-p3.json`
(clean tree before and after, confirmed via `git status --short`). No code
change was needed for this half.

**Gap 2 (fixture hygiene).** Added `packages/core/test/real-source.ts`,
exporting `realPoolEntry(itemId, universe = "ret-p2")`: reads
`data/universes/<universe>.json` and returns the real `PoolEntry` via the
already-tested `poolEntryFromUniverse`, throwing if the id is not a member —
so a fixture cannot silently reference an id absent from the universe it
claims to represent.

Measured the 45-literal count with a text scan for `itemId:` near a `kind:
"<zone-bearing>"` literal, cross-checked against every committed universe's
real source for that id. That scan is necessarily approximate (it cannot
parse the surrounding object structure), and it produced two false positives
where a real id used its correct source but a *different, synthetic* item's
literal fell inside the scan window — `view.test.ts`'s "reaches a tier piece
through kind: 'token'" test, where 29072 correctly uses `source: token` and
the flagged `kind: "raid"` belongs to unrelated synthetic item `2`. Verified
by reading each flagged line in context before changing anything, not by
trusting the scan output.

Real mismatches found and fixed (real item id, fixture's invented source vs.
the universe's actual one), across `rank.test.ts`, `rank-report.test.ts`,
`view.test.ts`, `pool.test.ts`:

- 29381 Choker of Vile Intent — fixture: raid/Karazhan/Nightbane; real: badge
  (`rank.test.ts`, the case named in this ticket's origin review).
- 28530 — fixture reused this id as a fictional "Mithril Band of the
  Unscarred" (finger, badge); the real 28530 is Brooch of Unquenchable Fury
  (neck, raid/Karazhan/Moroes) — an unrelated item entirely, not just a wrong
  source. Replaced with a synthetic id (900001-range already in use nearby)
  since the test only needed a finger-slot candidate, not this specific item.
- 30834 Shapeshifter's Signet — fixture: raid/Karazhan/Prince; real: rep
  (Lower City, Exalted).
- 32526 Band of Devastation (×2) — fixture: raid/Black Temple/"Illidan" or
  "Illidan Stormrage" (neither is the boss name); real: raid/Black Temple, no
  boss on the primary source.
- 32332 Torch of the Damned — fixture: boss "Reliquary of Souls" (does not
  exist); real: "Reliquary of the Lost".
- 28773 Gorehowl (×2) — already correct (raid/Karazhan/Prince Malchezaar);
  switched to the helper anyway so it cannot drift silently later.
- 30129 Crystalforge Breastplate (`pool.test.ts`, `view.test.ts`) — fixture
  invented a token name ("Chestguard of the Forgotten Conqueror", which
  belongs to a different token set per `data/two-hop/ret-tokens.json`) and an
  invented SSC boss ("Lady Vashj"); the real item already has exactly the
  multi-zone (Tempest Keep token + Serpentshrine Cavern raid, Morogrim
  Tidewalker) shape both tests needed, so no invention was necessary at all.
- 28579 Romulo's Poison Vial, 30098 Razor-Scale Battlecloak, 30102
  Krakken-Heart Breastplate, 30101 Bloodsea Brigand's Vest, headId (32461
  Furious Gizmatic Goggles) — each had an invented zone/boss (e.g. 30098 said
  Gruul's Lair/Gruul, real is Serpentshrine Cavern/Morogrim Tidewalker; 32461
  said raid/Tempest Keep/Void Reaver, real is `{kind: "crafted", profession:
  "Engineering"}`) — all switched to `realPoolEntry`.
- The 9-candidate `neckPool()` in `rank.test.ts` mixed one mechanically
  significant real id (29381, kept and switched to `realPoolEntry`) with 8
  filler ids that happened to be real db ids (30017-30025, different slots
  entirely) carrying a shared fabricated `raid/Karazhan/Nightbane` source.
  Renumbered the 8 fillers to a synthetic block (900001-900008, confirmed
  disjoint from every committed universe) since only their distinctness from
  the worn id and from each other matters to what this test measures
  (paired-replicate SE, not item identity).

Not changed: `view-gate.test.ts`'s `POOL` (29072, 30129, 28530) was already
built exactly the way this ticket asks — copied verbatim from the universe
with a doc comment giving the re-check command — confirmed still accurate by
re-running that command. Synthetic-id fixtures (`cli-shortlist.test.ts`,
most of `view.test.ts`, `pool.test.ts`'s top-level `pool` const) were left
alone per the ticket's own exemption for ids that name no real item.

Remaining `kind: "raid"|"token"` literal count: 52 → 32 (many replacements
collapsed a 5-8 line object literal into a single `realPoolEntry(id)` call,
so literal count is not 1:1 with fixtures fixed). The remainder is entirely
synthetic-id fixtures or the two already-correct hand-verified files
(`view-gate.test.ts`, and `pool-hardening.test.ts`'s own derive-from-universe
tests).

Verified:

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
# mismatches: 0
```

`pnpm verify` green (Node 22.16.0): typecheck, lint, format, `vitest run` (383
passed / 2 skipped / 2 todo — two more than before from the new
`realPoolEntry` unit tests), `skeleton:check`, `mirrors:check`.
