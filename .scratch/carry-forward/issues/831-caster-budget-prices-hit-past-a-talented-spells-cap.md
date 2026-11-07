Status: open
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
