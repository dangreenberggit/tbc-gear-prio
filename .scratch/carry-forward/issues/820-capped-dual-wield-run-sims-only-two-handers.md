Status: open
Type: bug
Origin: .scratch/carry-forward/issues/800-desktop-gate-goldens-for-more-specs.md (desktop-gate runs, 2026-11-06)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 363, 700, 800, 821

# A capped enhancement run spends every candidate place on weapons that lose DPS

## What the player sees

An enhancement shaman on `/tbc/shaman/enhancement/`, gear preset `P3 Preset`,
phase 4, candidates set to 40: the Upgrades list shows 40 rows, all of them
main-hand weapons, from -470.7 to -965.6 DPS, and no row above the cutoff. 33
of the 40 are two-handers; the other 7 are main-hand-only caster weapons
(Gladiator's Gavel and Spellblade, Amani Punisher, Hammer of Judgement, The
Maelstrom's Fury). No armour, ring or trinket appears in the list: the worn
items are simmed, but the list leaves owned rows out, and no other armour,
ring or trinket is in the first 40. Hand types are db.json's `handType` for
each row's name. The committed golden
`data/desktop-gate/golden-enh-p4-cap40.json` (fork `b603564ee`) holds this
run; re-run it with `pnpm desktop-gate:check --spec enh`, which builds the
pair first.

The uncapped default (`candidateCap` 0, ticket 363) prices every candidate, so
its numbers are right. A capped run shows the wrong rows: it spends its 40
places on weapons that lose DPS. The same order decides which rows fill first
and which rows a Stop leaves.

## Where (fork, at tbc-new-fork@b603564ee, read, not run)

The cap keeps the first N of the EP order
(`ui/features/upgrades/model/engine/rank.ts:1486-1491`). The order comes from
`bestEpDelta` (`model/engine/candidate-order.ts:29-47`), which compares a
candidate's EP with the worn item in each sim slot it can take. Two things
put weapons first:

- **The main cause: the EP order ignores weapon damage** (ticket 821).
  `epScore` reads the item's own stat array (`model/engine/stats.ts:29-42`,
  `model/engine/items.ts:26`), which has no weapon damage, and the tab loads
  only each weights file's `weights`, not its `pseudoWeights`
  (`model/data/data.ts:48`). So a caster weapon with spell damage can sort
  above a melee weapon. This fits the 7 caster weapons.
- **The smaller cause, this ticket: a two-hander is compared with the main
  hand alone.** A two-hander can only take the main hand
  (`model/engine/pool.ts:271-283` `itemFitsSimSlot`, `:300-327`
  `simSlotsForPoolSlot`), so for a dual-wielder its delta subtracts the worn
  main hand only, not the off-hand item it also removes. Pricing two-handers
  against both worn hands still leaves 39 weapons in the first 40, by the
  domain reviewer's rebuild of the order (`docs/reviews/feat-452-desktop-goldens.md`
  D1; not re-run for this ticket). So fixing this ticket alone leaves the
  player's view almost the same; ticket 821 is the main fix.

## Done when

A capped run for a dual-wield spec prices a two-hander against both worn
weapons, or the tab says in one plain sentence that the candidate order ranks
two-handers against the main hand alone.

The order is a ported engine file with a twin in this repo:
`packages/core/src/candidate-order.ts` beside the fork's
`model/engine/candidate-order.ts`. A change to either follows
`docs/agents/known-traps.md` § Before editing a ported engine file (parity
test, provenance row, fork commit, re-pin, `pnpm verify`).

Then, before the enhancement golden is re-recorded, re-measure
`CAPPED_ROWS["enh"][4][40]` in `scripts/check_desktop_tab.py` on the desktop
binary and explain the new count in its comment: `--update-golden` refuses to
write while check (e) fails on the old count. Then re-record the golden with
`pnpm desktop-gate:check --spec enh --update-golden` and explain its diff
(`data/desktop-gate/README.md` § Regenerating a golden).
