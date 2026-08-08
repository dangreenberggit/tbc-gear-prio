Status: open
Type: bug
Origin: user correction during ticket 54 fixture-gate work, 2026-08-07
Blocks: none
Blocked by: none

# Only AtlasLoot's instance tables are vendored, and five sites call that an AtlasLoot limitation

`vendor/atlasloot/data-tbc.lua` is a single file holding 25 `data[...]` tables:
the TBC dungeons, raids and world bosses. Nothing else.

```bash
grep -oE 'data\["[A-Za-z0-9_]+"\]' vendor/atlasloot/data-tbc.lua | sort -u | wc -l
# 25 -- all instances/world bosses
grep -c "29381\|30834" vendor/atlasloot/data-tbc.lua
# 0 -- a badge reward and a rep reward, both absent
```

The real addon also ships badge-vendor, reputation, PvP and crafted modules.
Those were never vendored.

## The wrong claim

Five sites explained the resulting gap as a property of AtlasLoot itself —
"AtlasLoot does not cover vendor and quest items". It does; **this repo's copy
does not**. Corrected in place at all five:

- `scripts/assemble_universe.py` (the suppression comment)
- `scripts/check_wowhead_prose_suppression.py` (the kept-kinds comment)
- `packages/core/test/real-source.ts` (the fixture gate's rationale)
- `.scratch/carry-forward/issues/57-*.md`
- `.scratch/handoffs/wowhead-collection-integrity.md`

The distinction matters because the first phrasing reads as a permanent fact of
the world and closes off an option, while the second names a fixable state of
this repo. Ticket 57's "94 load-bearing rows" figure is downstream of it: those
94 are load-bearing *given what was vendored*, not inherently.

## Why this is worth acting on

Every kept guide row is a transcription with no second witness — the exact
channel every defect in tickets 48-53 arrived through. Vendoring the badge and
reputation modules would give a machine witness to a chunk of the 94 and let
57's suppression cover them, shrinking the prose-only surface rather than
documenting it.

Unmeasured: how many of the 94 the badge/rep modules would actually cover.
Measure before committing to the work — the 148/94/11 split came from
`.scratch/carry-forward/notes/57-impact.py` and that script is the place to
extend.

## Done when

- The badge and reputation loot tables are vendored under `vendor/atlasloot/`
  with the same pinning discipline as `data-tbc.lua`, or a note records why not.
- `scripts/parse_atlasloot.py` reads them into `data/atlasloot_sources.json`.
- The 94 is re-measured and 57's figures updated wherever they are quoted.
- `KNOWN_UNCORROBORATED` and the `real-source.ts` fixture gate are re-checked:
  both should get strictly easier to satisfy, never harder.
