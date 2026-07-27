Status: open
Type: task
Origin: docs/reviews/phase-0-close-gates.md
Blocks: phase-1

# Disclose temporaryEnchant omission (no effectId→itemId table)

## Decision (2026-07-27)

**Drop the imbue** for Phase 1 and disclose it as a standing assumption — do
not invent a conversion.

Measured facts (compose handoff §8):

- WCL `temporaryEnchant` is an enchant **effect id** (slamaltman MH = `2639`).
- The sim wants `ConsumesSpec.mhImbue_id` / `ohImbue_id` — an **item id**.
- `2639` appears nowhere as an exact value in `db.json`; there are **zero**
  `ConsumableTypeImbue` (`type: 8`) records.
- Same namespace mismatch shape as R14/R19, but without `db.json` to resolve it.

Dropping is defensible under the PLAN.md §9 symmetry invariant: the imbue is
constant across baseline and candidates, so *deltas* survive. Absolute DPS is
already not the player's (preset professions, assumed race).

`scripts/compose_slamaltman_raid_sim.py` already omits `temporaryEnchant`.

## Done when

- R7 disclosure drawer lists weapon imbue omission under **standing
  assumptions** (alongside professions / assumed race).
- Normalize/compose keep omitting `temporaryEnchant` until an external
  effectId→itemId source is pinned — do not wire a guessed mapping.
- Optional later: find/pin that source and apply imbues symmetrically.

## Not done when

- Wiring a guessed `2639 → ???` table from memory or a wiki scrape.
