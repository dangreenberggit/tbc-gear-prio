Status: open
Type: bug
Origin: pre-merge review feat/tab-source-labels, D3
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 619, 642

# Honour PvP rows name no season, while arena rows do

## What the player sees

An arena row's Source cell names its season, for example Vengeful
Gladiator's Greatsword (33688) reads "PvP vendor · Arena, season 3". An
honour row names none: Vindicator's Dragonhide Boots (33880) and its
siblings read "PvP vendor · Honor". The input the builder reads gives the
season for these honour items.

## Evidence

- `data/wowhead-lists/feral/p3.json` lines 238, 258, 388 and 498 read
  `"wowheadSourceText": "Vendor: Honor Points (Season 3)"`; line 818 reads
  `(Season 1)`: `grep -n "Honor Points (Season" data/wowhead-lists/feral/p3.json`.
- `parse_wowhead_source` in `scripts/assemble_universe.py` appends
  `{"kind": "pvp", "via": "honor"}` for any text with "honor points" and
  reads no season (`grep -n '"via": "honor"' scripts/assemble_universe.py`).
- The fork's `sourceDetail` (`ui/features/upgrades/utils/format.ts`) prints
  the season only when the source carries one.

The owner's season ruling covers arena items only. Verbatim, 2026-10-16T00:57Z
(`.scratch/stage-gate/tab-blocking-finish/decision-log.md:28`, gitignored):
"Yeah sure arena items as a source are fine. If it's good it's good, as long
as it's the  season is open for the selected phase". Whether honour items
should name their season is not ruled; it follows the same rule as the arena
rows only if the session decides so (the honour season is in the input, so
no owner question is needed to record it).

## Done when

- The builder records the season the Wowhead text names on an honour `pvp`
  source (`season` is already a field of the `pvp` kind), universes and fork
  copies are regenerated, and an honour row's Source cell names its season
  the same way an arena row does.
- A test pins the parse of "Vendor: Honor Points (Season 3)" to
  `{"kind": "pvp", "via": "honor", "season": 3}`.
