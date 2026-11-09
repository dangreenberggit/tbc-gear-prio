Status: closed
Type: bug
Origin: docs/reviews/feat-452-meta-repair-hit-cap.md (round 1, I2)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 746

# The caster hit budget values hit past a talented spell's cap at full weight, with no note

## What is wrong

Mage, shadow and warlock repair hit gems against a budget read from
pseudo-stat 13 (`PseudoStatSpellHitPercent`), cap 16 (fork
`ui/features/upgrades/model/engine/cap-profile.ts`, the `repair` doc
comment). Slot 13 holds only the hit every spell shares. A spell with a
talent bonus reaches the 1% miss floor earlier, so hit between that
spell's cap and 16 is priced at full weight although only the other
spells still gain from it. The ranking shows no note about it.

- Mage (Arcane talents): Arcane spells 6-16, Frostbolt 10-16, Fire
  Blast 13-16.
- Shadow: Shadow spells 6-16.
- Warlock with Affliction talents: the Affliction spells that
  Suppression's per-spell bonus caps earlier
  (`sim/warlock/talents.go:75-84`). The page's default talents are
  Destruction, which take no Suppression.
- Elemental had the same window (Nature and Fire spells 10-16) until
  the review moved it to full weight with the note (ticket 746, D1).

The per-school slots 6-11 are no fix: each undervalues a spell the
default APL casts (the mage Arcane APL casts Frostbolt and Fire Blast;
the shadow APL casts Starshards, Arcane school), and the same doc comment
gives a budget only where it never undervalues hit the sim rewards.

Whether this window is a defect or an accepted estimate for mage and
shadow is a domain judgment (pre-merge review round 1, I2).

## Done when

One of: the caster budget prices hit by what the spells the rotation
casts still gain (for example a per-spell or cast-weighted budget), or
the ranking says in one note that hit up to 16% was valued at full
weight, or the owner rules the window an accepted estimate and this
ticket records the ruling with its date.

## Comments

## Closing note (2026-11-09)

Closed by pricing hit by what the spells the rotation casts still gain.
Owner, 2026-11-09, choosing this over a note: "a sounds ok." Fork commit
`4903b8cee` on `fix/830-831-hit-budget` (after `52bb752ce` and
`ae2c8afc1`, whose note it removes):

- The tab's sim runner now keeps, from every sim result, the first
  player's spell damage by school (`SimObservation.spellDamageBySchool`,
  from the sim's `ActionMetrics.spell_school` and damage; melee actions
  and pets left out; `adapters/worker_pool_sim_runner.ts`).
- For mage, shadow priest and warlock, the repair hit budget
  (`hitCapBudgetFrom`, `engine/cap-profile.ts`) splits that damage into
  one group per school hit: a spell's hit is slot 13 plus its school's
  bonus, which the stats read gives as the school's slot 6-11
  (`sim/core/spell_result.go:241-249`,
  `sim/core/character_sheet.go:110-116`). Hit is worth each group's share
  of the spell damage until that group reaches 16% (`meta-repair.ts`,
  `valueModel`). The baseline sim gives the groups; a caster whose worn
  meta gem is off sims its un-repaired gear first, so the worn repair is
  priced the same way.
- So the page's default shadow priest, a Troll with no Starshards
  (`sim/priest/priest.go:58-62`), whose spells are all Shadow, values no
  hit past the point where Shadow Focus caps them. A Night Elf priest
  values hit past that point only by Starshards' share of the damage.
  An Arcane mage values hit for Fire Blast and Frostbolt by their shares
  after Arcane spells cap.
- A caster whose sim result has no spell damage by school fails the run
  (`the sim result has no spell damage by school, so spell hit cannot be
  priced`), so no caster is priced without it.

The note "If gems were swapped to turn your meta gem on, hit rating was
counted at full value up to 16% spell hit, although some of your spells
get extra hit and reach the hit cap sooner." is gone: the price now
counts school hit. One player-facing note remains, for the one state the
sim result does not show: a talent that adds hit to some spells only
(Suppression for the warlock, `sim/warlock/talents.go:75-84`; Focused
Power for the priest, `sim/priest/talents.go:64-73`; the only
`SpellMod_BonusHit_Percent` users under `sim/mage`, `sim/priest` and
`sim/warlock`). It shows when the player has points in one of them and
every target is level 73: "If gems were swapped to turn your meta gem
on, hit rating was valued as if your Suppression talent added no hit, so
it may be valued too high." (or "Focused Power").

One estimate remains with no note: a damage spell with no class mask, as
an item proc is, gets no school bonus in the sim but is priced at its
school's hit, so hit is valued too low for its share of the damage. The
sim result does not say which spells have a class mask. How often this
moves a ranking is unmeasured.

Tests, in `packages/core/test/fork-meta-repair.test.ts`: 831-G1 to G3
(the groups, physical and two-school damage, and the error),
831-P1 (a shadow priest whose damage is all Shadow places no Great
Dawnstone past the Shadow cap; with the damage in Arcane it does),
831-W1 (the same for the worn repair, after a sim of the un-repaired
gear), 831-F1 (no spell damage fails the run), 831-N1 (school hit gets
no note), 831-N3 and N5 (the talent note for Suppression and Focused
Power), 831-N4 (no note without such a talent) and 831-N6 (only the
level-73 note against a level-72 target). G1-G3, P1, W1, F1, N1, N3 and
N5 failed on the fork code before `4903b8cee`. Fork:
`worker_pool_sim_runner.test.ts` ("gives the first player's spell damage
by school"), `SubstitutionsList.test.tsx` (the note renders as one
sentence).

Verified by: tbc-new-fork@4903b8cee8a2df6011a8e457168048406096e127;
`node --version; pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/wowsims-fork-parity.test.ts`
(57 passed); `node --version; pnpm verify` (rc 0, 4 min 39 s; `gates:
1617 ran, 0 skipped`; its fork tests check ran 826 tests at
`tbc-new-fork@4903b8cee`).
