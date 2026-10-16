Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (Tab-blocking; owner answer Q-feral-p5)
Type: task
Origin: owner answers to Chunk 3b step 6, 2026-10-11 (Q-feral-p5)
Blocks: none
Blocked by: none
Related: 609, 611, 612, 613, 500, 505, 173 (no detector for the next dropped item), 17, 89, ADR-0028

# No check proves each spec's item list is complete

Feral at phase 5 was missing three tier pieces and two other items
(ticket 500), and nothing noticed. The owner wants a check that would
catch the next one, for every spec.

## The owner's words, 2026-10-11

"It's kind of yikes that this was missed, and even more yikes that it
needs to be added manually. There should be a programmatic way to check and
add such items (for example if we add more specs)"

## What exists today

- `scripts/list_phase_pool.py` (`pnpm pool-listings:check`) is the
  completeness audit ADR-0028 describes: it diffs a list against the
  wowsims item database and classifies each difference. It covers phase 3
  only (`MAX_PHASE`) and ret and feral only (`:547`), and it counts a tier
  piece with no source as explained through the hand-written
  `*_TIER_PIECE_IDS` constants, so a missing T6 piece does not show
  (ticket 609).
- `packages/core/test/pool-hardening.test.ts:1052-1064` checks that the
  wowsims `setId` pieces match the token table, for ret only.

## What a prototype measured (2026-10-11)

A throwaway prototype (`completeness.py`, `phase_slice.py` and
`unique_gaps.py` in a session scratchpad, may be gone) compared each
spec's phase-5 list with every epic-or-better item in
`vendor/wowsims/db.json` that the spec can wear at phase 5 (the
assembler's own `eligible_d7`). Counting only items whose own phase is 2
or later, the missing items fall in these groups (unique item ids across
the 11 specs):

- 3 tier pieces with no token row, feral only (ticket 609).
- 82 crafted items (ticket 611).
- 27 items with a commented-out AtlasLoot row, the Sunmote shape, ret and
  feral only (ticket 612).
- 294 badge, PvP (not arena), quest or world items with no db source, ret
  and feral only (ticket 613); 117 more are arena items, also ret and
  feral only.
- 56 items whose only effect is a stub the sim does not implement.
- 6 Magisters' Terrace normal-mode drops.

Not every missing item is a gap: some are out of scope on purpose
(arena gear, stub-only effects, normal-mode dungeon drops). The gate's
job is to make each of those a stated rule.

## What would close this

1. A check, beside or in place of `scripts/list_phase_pool.py`, runs for
   all 11 DPS specs and every phase 1–5 that has a list, and fails when a
   wowsims item the spec can wear at that phase (epic or better) is
   neither in the list nor covered by a stated reason. Reasons are rules
   (for example "arena gear", "stub-only effect") rather than id lists
   wherever a rule exists; any id list says why no rule fits.
2. The check runs in `pnpm verify` and passes. It can be built before
   609, 611, 612 and 613 land, as a report that prints the open gaps; this
   ticket closes when it is a passing gate.
3. The `pool-hardening.test.ts:1052-1064` token-table check covers all 11
   specs, not ret only.

## Closed 2026-10-16 (stage-gate tab-blocking-finish, K2)

`scripts/check_pool_completeness.py` replaces `scripts/list_phase_pool.py`
(deleted). It runs for all 11 DPS specs at every phase that has a list
(2-5), imports nothing from the builder, and classifies every wearable epic
by a named rule or policy; an item no rule names is `uncovered` and fails the
gate. It writes `data/pool-listings/<spec>-p<P>.md` (44 files) and runs in
`pnpm verify` as `pnpm pool-listings:check`. On `feat/tab-item-lists` it
reports 0 findings and 0 uncovered items in all 44 lists. The token-table
check in `packages/core/test/pool-hardening.test.ts` now loops over
`data/two-hop/tier-sets.json` for all 11 specs.

Red runs, each a scratch copy of the builder writing to a temp folder and the
gate run with `--universes-dir` (script and output:
`.scratch/stage-gate/tab-blocking-finish/k2_red.py`, `k2-red-runs.txt` in the
main checkout, gitignored): (1) feral's Sunwell token rows removed -> 3 E-token
findings, 34444, 34556, 34573; (2) Sunmote route off -> 36 E-sunmote findings
in ret-p5 and feral-p5, 34397 among them; (3) `in_recipe_phase` off -> 32
E-recipe findings in feral-p5, 34370 among them; (4) arena route off -> 98
E-arena findings, every arena id of feral-p5; (5) arena phase gate off -> 63
P-season-closed findings in ret-p2 and feral-p4.

Verified by: `pnpm pool-listings:check` (rc 0, "44 lists, 0 findings, 0
drifted listings") at tbc-gear-prio@d74d5fcc, and the five red runs above.
