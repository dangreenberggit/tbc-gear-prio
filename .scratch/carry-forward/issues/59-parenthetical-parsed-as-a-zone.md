Status: open
Type: bug
Origin: unfiled aside in closed ticket 57, recovered 2026-08-07
Blocks: none
Blocked by: none

# `DROP_RE` reads any trailing parenthetical as a zone

`parse_wowhead_source` treats `"<something> (<something>)"` as
`boss (zone)`. When the parenthetical is not a zone, the item's own name lands
in `boss` and a non-place lands in `zone`:

```bash
python -c "
import sys; sys.path.insert(0,'scripts')
import assemble_universe as a
print(a.parse_wowhead_source('Drop: Darkmoon Card: Crusade (Bind on Equip)'))
"
# [{'kind': 'raid', 'zone': 'Bind on Equip', 'boss': 'Darkmoon Card: Crusade'}]
```

`zone` and `boss` are both shipped `ViewOptions` filter controls, and
`formatItemSource` renders the pair directly under the item name, so this is
display-visible and filterable — the same class as
[[48-token-name-spliced-into-boss-field]] and
[[52-boss-names-conflate-encounters-and-their-units]].

## Not currently reachable, and that is the trap

The three known cases — `31856 Darkmoon Card: Crusade`, `32658 Badge of
Tenacity`, `29301 Band of the Eternal Champion` — are in **no** shipped
universe today, so nothing renders wrong right now:

```bash
python -c "
import json,glob
want={31856,32658,29301}
hits=[e['itemId'] for f in glob.glob('data/universes/*-p*.json') if 'report' not in f
      for e in json.load(open(f,encoding='utf-8-sig'))['entries'] if e['itemId'] in want]
print(hits)
"
# []
```

The parser is unchanged, so any list edit or re-scrape that admits one of these
items ships the bad row. [[56-scrape-the-wowhead-gear-pages]] is exactly such a
change. Fix this before or with 56, not after.

## Why it was nearly lost

Ticket 57 recorded these three in an aside — "worth fixing while in here, or
filing separately" — and closed without doing either. They survived only in
that closed ticket and a handoff paragraph, which is not a place work gets
picked up from. Filed here so 56 can depend on it.

## Suggested fix

`DROP_RE` should reject a parenthetical that is not a known zone. The zone
vocabulary is already machine-derived and used by two gates:
`data/atlasloot_sources.json` zones plus `data/phase_raids.json`, the same
authority `canonical_zone` and `check_boss_aliases.py` read. An unrecognised
parenthetical should fall through to `kind: unknown` rather than inventing a
raid row — a missing source is honest, a wrong one is not.

Note `Vendor: Depleted Badge (…)` and the `Exalted` case currently parse to
`[]`, so only the `DROP_RE` path demonstrably misfires today. Re-measure all
three against the real list text rather than trusting this ticket's
reconstruction of it.

## Done when

- A parenthetical outside the known zone vocabulary does not produce a
  `kind: raid` row.
- A test covers the three named shapes, verified red first.
- The gate is over the parser, not over the shipped universes — the universes
  cannot catch it while these items are absent.
