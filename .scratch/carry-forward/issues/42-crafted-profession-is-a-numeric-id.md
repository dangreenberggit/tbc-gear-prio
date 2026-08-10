Status: closed
Type: bug
Origin: investigation while collecting `data/wowhead-lists/feral/p1-p2.json`, 2026-08-06
Blocks: none
Blocked by: none

# `crafted` sources from db.json carry a numeric profession id, not a name

`map_db_source` in `scripts/assemble_universe.py` reads
`sources[].crafted.profession` straight out of the pinned db and stringifies it.
The pinned db stores that field as a **proto enum number**, so the emitted
source is `{"kind": "crafted", "profession": "2"}`.

```bash
python -c "
import json,sys; sys.path.insert(0,'scripts')
from assemble_universe import map_db_source
db=json.load(open('vendor/wowsims/db.json'))
it=[x for x in db['items'] if x['id']==28430][0]   # Lionheart Executioner
print(it['name'], map_db_source(it.get('sources'), zones_by_id={}, npcs_by_id={}))
"
# Lionheart Executioner {'kind': 'crafted', 'profession': '2'}
```

The `ItemSource` union types `profession` as `string`, so this passes every
gate — the build check only validates the `kind` discriminant, not the field
contents. It reaches the UI as a literal `2`.

Wowhead-sourced crafted rows are unaffected: `CRAFTED_RE` captures the real
profession name out of the page text, so the same item can carry both a good
row and a numeric one depending on which input produced it.

## Why it has not been noticed

`profession` is not read by the ranking path, only displayed. And the affected
items are largely ones that never reach the universe for other reasons — see
[41](41-ranged-slot-thin-and-worn-item-uncomparable.md), where the same
crafted rows show up in the curated-but-missing list.

## Done when

- `crafted.profession` is a profession name in every emitted source, whichever
  input produced it.
- The enum mapping is taken from upstream rather than hand-typed, or there is a
  recorded reason it cannot be.

## Closed 2026-08-06

Cause confirmed exactly as filed: `map_db_source` stringified the raw proto
enum ordinal from `db.json`'s `crafted.profession` instead of resolving it to
a name.

Fix: added `profession_names_from_proto()` to `scripts/assemble_universe.py`,
which parses the `Profession` enum straight out of the vendored
`data/proto/common.proto` (same pattern as the existing `stat_array_len()`
reader for the `Stat` enum) and builds `PROFESSION_NAMES = {0: "ProfessionUnknown",
1: "Alchemy", ..., 11: "Tailoring"}`. `map_db_source` now looks the ordinal up
in that table instead of calling `str()` on it. This satisfies "taken from
upstream rather than hand-typed" directly — no hardcoded id-to-name table.

Verified:

```bash
python -c "
import json,sys; sys.path.insert(0,'scripts')
from assemble_universe import map_db_source
db=json.load(open('vendor/wowsims/db.json'))
it=[x for x in db['items'] if x['id']==28430][0]
print(it['name'], map_db_source(it.get('sources'), zones_by_id={}, npcs_by_id={}))
"
# Lionheart Executioner {'kind': 'crafted', 'profession': 'Blacksmithing'}
```

Regenerated all six committed universes (`ret-p2..p5`, `feral-p2..p3`) via
`python scripts/assemble_universe.py --spec <spec> --max-phase <n> --report
data/universes/<spec>-p<n>.report.json`. The diff is entirely rows where a
db-sourced `{"kind":"crafted","profession":"<digit>"}` record is removed —
because it now renders identically to the Wowhead-parsed `profession` name
already present on the same item and gets deduped by the existing
`json.dumps(s, sort_keys=True)` source-dedup in `add_source` — plus the
matching `wowhead`/`itemHasOrigin:wowhead` counts in the `.report.json`
sidecars dropping by the same amount. No other diff shape appears; confirmed
with `git diff --stat data/universes/` and full per-file `git diff`.

`pnpm verify` green after regeneration (Node 22.16.0).
