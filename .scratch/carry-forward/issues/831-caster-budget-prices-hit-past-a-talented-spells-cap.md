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

Closed by the one-note option. Fork commit `52bb752ce` on
`fix/830-831-hit-budget` adds `talentCapsSomeSpellsSooner`
(`engine/cap-profile.ts`) and, at the baseline's stats read, the note
`hitCapTalentNote` (`engine/rank.ts`): "If gems were swapped to turn
your meta gem on, hit rating was counted at full value up to 16% spell
hit, although your talents give some of your spells extra hit, so they
reach the hit cap sooner." The budget itself is unchanged.

The note shows only when the window exists, read from what the sim
uses: a school slot of the stats read (pseudo-stats 6-11) above slot 13,
which is how Arcane Focus, a mage's Elemental Precision and Shadow Focus
show (`sim/core/character_sheet.go:110-116`); or Suppression points in
the talent string the sim reads, because Suppression is a per-spell
bonus no slot holds (`sim/warlock/talents.go:75-84`). So the page's
default Destruction warlock, and a caster with no such talent, get no
note. A target that is not level 73 keeps the existing "always useful"
note instead, since then there is no budget. Only one hit-cap note can
show in a run.

Pricing hit by what the rotation's spells still gain was not workable
cleanly. It needs each cast spell's share of the damage (`SimObservation`
keeps only DPS, stdev and iteration values), each spell's own hit
(school bonuses apply only to spells with a class mask, Suppression only
to the Affliction mask; the tab holds no spell-to-mask data), and a
tiered hit value in the exact repair search in place of its single
budget. Moving the casters to full weight, as elemental was (ticket 746,
D1), would also price hit past 16% at full value, which the budget gets
right. So this follows elemental in using a note, and keeps the budget.

Tests: main-repo 831-N1 (mage, Arcane school hit above slot 13), 831-N2
(shadow, Shadow school hit), 831-N3 (warlock with Suppression in the
talent string, no school hit) each get exactly this note; 831-N4 checks
that mage, shadow and warlock with no such talent, and ret, get no
hit-cap note. All in `packages/core/test/fork-meta-repair.test.ts`; N1-N3
failed before the fork change. The fork's `SubstitutionsList.test.tsx`
checks the sentence renders as one plain sentence.

Verified by: tbc-new-fork@52bb752ce4cb5b5ff5e906457891f746b73305d2;
`node --version; pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/wowsims-fork-parity.test.ts`
(50 passed); `node --version; pnpm verify` (rc 0, 4 min 31 s; `gates:
1610 ran, 0 skipped`; its fork tests check ran 825 tests at
`tbc-new-fork@52bb752ce`).
