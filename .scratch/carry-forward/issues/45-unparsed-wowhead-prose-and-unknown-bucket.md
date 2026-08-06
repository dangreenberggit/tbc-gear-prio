Status: open
Type: task
Origin: pre-merge review of `phase-2/feral` (adversarial A2, domain, standards), 2026-08-06
Blocks: none
Blocked by: none

# 87 Wowhead rows still parse to nothing, and `unknown` shows up as a group

Two leftovers from the review of `phase-2/feral`. Both are narrower than they
were — that branch taught `parse_wowhead_source` the badge-vendor,
reputation-vendor and quest-with-zone shapes, taking feral p1-p2 from 18
unparsed rows to 7 and p3 from 20 to 2 — but neither is closed.

## 1. The remaining unparsed prose

```bash
python -c "
import json,glob,sys; sys.path.insert(0,'scripts')
from assemble_universe import parse_wowhead_source as p
for f in sorted(glob.glob('data/wowhead-lists/*/*.json')):
    d=json.load(open(f))
    u=sum(1 for e in d['entries'] if not p(e['wowheadSourceText']))
    print(f'{f}: {u} of {len(d[\"entries\"])}')
"
# 87 of 627 across all seven lists; ret/pre-raid.json is the worst at 26 of 72.
```

The shapes still dropped are zone-less quests ("Quest: Colossal Menace"), world
drops ("Random World Drop", "World Drop - Azeroth"), and free-text zone drops
("Zone Drop - Karazhan Trash Mobs", "Drop: Chess Event - Karazhan").

There is a `{kind: "world"}` variant that nothing currently emits — the world
drop rows are the obvious candidate. Zone-less quests have no variant at all;
adding `quest` would need the same union/JSON/codegen round trip `unknown`
took.

**Why it is not urgent:** unparsed prose no longer produces a *wrong* source,
only an absent one, and `pool-hardening.test.ts` now asserts an item on a
Wowhead list never ships as `unknown`. The cost is lost provenance in the UI,
not a wrong shortlist.

## 2. `unknown` is a visible group

`zoneKeyOf` (`packages/core/src/view.ts:109`) falls through to
`item.source.kind`, so `--group-by raid` now renders a literal `unknown`
bucket. It is honest but ugly, and it is the same fall-through ticket 35
describes for arbitrary zones.

## Done when

- Every collected row either parses to a source or is listed here as a shape
  we deliberately do not model.
- Grouped output does not show a raw `kind` string as though it were a zone.
