Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (Tab-blocking; owner answer Q-feral-p5)
Type: bug
Origin: owner answers to Chunk 3b step 6, 2026-10-11 (Q-feral-p5)
Blocks: none
Blocked by: none
Related: 500 (Bladed Chaos Tunic), 609, 610, 613

# Sunmote upgrades come from a hand-written map that only ret has

A feral player at phase 5 never sees Bladed Chaos Tunic (34397), one of
the five items ticket 500 lists. It is a Sunmote upgrade: Sunwell
Plateau's vendor exchanges a base raid drop plus a Sunmote for the
upgraded piece. Ret's list has it because ret has a hand-written map,
`data/two-hop/ret-sunmote-upgrades.json` (3 entries, collected from the
Wowhead ret P5 list); every other spec's profile has
`sunmote_upgrades=None` (`scripts/assemble_universe.py:817`, feral, "No
feral Sunmote map collected yet."). The wowsims item database has 34397 at
phase 5 with no `sources`, so without a map it has no route in.

## The owner's words, 2026-10-11

"It's kind of yikes that this was missed, and even more yikes that it
needs to be added manually. There should be a programmatic way to check and
add such items (for example if we add more specs)"

## What a prototype showed (2026-10-11)

`vendor/atlasloot/data-tbc.lua` lists each Sunmote upgrade as a
commented-out loot row (`--{ n, id },`) directly under its base item's
live row. A throwaway prototype (`sunmote_pairs.py` in a session
scratchpad, may be gone) paired every commented row with id 34000 or
higher to the live row above it:

- 28 pairs; all 28 have the same slot type on both sides, and all are
  phase 5 on both sides in the wowsims database.
- It reproduces ret's map exactly: 34388, 34392 and 34397 pair with the
  same base ids as `ret-sunmote-upgrades.json`.
- 5 pairs have a lower item level on the "upgrade" side (164 → 159), all
  head pieces: 34244 → 34404, 34245 → 34403, 34332 → 34402,
  34243 → 34401, 34345 → 34400. A Sunmote upgrade raises the item level,
  so these 5 are probably not Sunmote pairs (hypothesis, untested); the
  pairing rule must be checked before it is trusted.
- `scripts/parse_atlasloot.py` skips every line that starts with `--`
  (`:161-162`), so it never reads these rows today.

Interaction with ticket 613 (hypothesis, untested): once ret and feral use
db-phase admission, a sourceless phase-5 item such as 34397 may enter the
list by phase alone, as it already does for the nine db-phase specs. This
ticket would then still give it its real source (the Sunwell boss of its
base item), which is what a player sees in the Source column.

## What would close this

1. Each spec's Sunmote upgrades are derived from AtlasLoot (the commented
   rows, or a better source if one is found), with a rule that rejects
   pairs that are not upgrades (such as the 5 lower-item-level head
   pairs), stated beside the code. The hand-written
   `ret-sunmote-upgrades.json` is generated or removed.
2. 34397 is in `data/universes/feral-p5.json` and its fork copy, with its
   base item's Sunwell zone as source; each changed universe's diff is
   listed in the closing note.
3. `pnpm verify` rc=0.

## Closed 2026-10-16 (stage-gate tab-blocking-finish, K4)

`scripts/parse_atlasloot.py` reads AtlasLoot's commented Sunwell Plateau rows
into `data/two-hop/sunmote-pairs.json` (c93d673f), and the builder applies the
pairs for every spec, keeping a pair only when the upgrade's item level is
not below the base's (most kept pairs are equal, 159 -> 159), with the
reason beside the code (9e17cde1; `scripts/assemble_universe.py`,
`sunmote_upgrade_pairs` docstring). The
hand-written `ret-sunmote-upgrades.json` is removed. 34397 (Bladed Chaos
Tunic) is in `data/universes/feral-p5.json` and its fork copy with source
"Sunmote + Harness of Carnal Instinct" (M'uru, Sunwell Plateau). Per the fork
lock's entry for b45e5d33f, the p5 lists changed by ret +20 entries, feral
+13, and the nine others by Sunmote token sources on existing entries only.
The completeness gate's E-sunmote rule fails when the route is off (red run
2: 36 findings, 34397 among them; `k2-red-runs.txt` in the stage folder).

Verified by: `pnpm atlasloot:regen:check` (rc 0) and
`git grep -n 'sunmote_upgrades\|ret-sunmote' -- scripts/assemble_universe.py scripts/check_policy_notes.py`
(prints nothing) at tbc-gear-prio@808f0c7f.
