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

Closed by the one-note option. Fork commits `52bb752ce` and `ae2c8afc1`
on `fix/830-831-hit-budget` add `someSpellsCapSooner`
(`engine/cap-profile.ts`) and, at the baseline's stats read, the note
`hitCapTalentNote` (`engine/rank.ts`): "If gems were swapped to turn
your meta gem on, hit rating was counted at full value up to 16% spell
hit, although some of your spells get extra hit and reach the hit cap
sooner." The budget itself is unchanged.

The note shows only when some spells get more hit than slot 13, read
from what the sim uses: a school slot of the stats read (pseudo-stats
6-11) above slot 13, which is how Arcane Focus, a mage's Elemental
Precision, Shadow Focus and school hit in the bonus stats show
(`sim/core/character_sheet.go:110-116`, `sim/core/character.go:149-160`);
or points in a per-spell hit talent, which no slot holds, read from the
talent string the sim reads: Suppression for the warlock
(`sim/warlock/talents.go:75-84`) and Focused Power for the priest
(`sim/priest/talents.go:64-73`), the only `SpellMod_BonusHit_Percent`
users under `sim/mage`, `sim/priest` and `sim/warlock`. So the page's
default Destruction warlock, and a caster with no such bonus, get no
note. A target that is not level 73 keeps the existing "always useful"
note instead, since then there is no budget. Only one hit-cap note can
show in a run. The note names no source, because bonus stats can give
the school hit too (review round 1, D3).

A known limit, found by review round 1 (A1/D1): only a Night Elf priest
has Starshards (`sim/priest/priest.go:58-62`), and the page's default
shadow priest is a Troll (`ui/specs/priest/dps/presets.ts`,
`OtherDefaults`). For it every damage spell the default APL casts gets
Shadow Focus's 10%, so hit from 6% to 16% is priced at full value though
none of those spells gains from it. The note shows for it and is true;
the pricing stays.

Pricing hit by what the rotation's spells still gain was not done here.
It needs to know which spells the run cast and how much each dealt, from
the sim's action metrics (`ActionMetrics.spell_school` and its damage,
`proto/api.proto:142-157`), which `SimObservation` does not keep (it
keeps DPS, stdev and iteration values); each spell's own hit, which the
tab cannot work out (school bonuses apply only to spells with a class
mask, per-spell talents only to their mask); and a tiered hit value in
the exact repair search in place of its single budget. Moving the
casters to full weight, as elemental was (ticket 746, D1), would also
price hit past 16% at full value, which the budget gets right. So this
follows elemental in using a note, and keeps the budget.

Tests, all in `packages/core/test/fork-meta-repair.test.ts`: 831-N1
(mage, Arcane school hit above slot 13), 831-N2 (shadow, Shadow school
hit), 831-N3 (warlock with Suppression in the talent string) and 831-N5
(shadow priest with Focused Power) each get exactly this note; 831-N4
checks that mage, shadow and warlock with no such bonus, and ret, get no
hit-cap note; 831-N6 checks that a caster against a target that is not
level 73 gets only the "always useful" note. N1-N3 failed before
`52bb752ce`, N5 before `ae2c8afc1`. The fork's
`SubstitutionsList.test.tsx` checks the sentence renders as one plain
sentence.

Verified by: tbc-new-fork@ae2c8afc148d6331660557716d4085c14c4e8d1c;
`node --version; pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/wowsims-fork-parity.test.ts`
(52 passed); `node --version; pnpm verify` (rc 0, 4 min 52 s; `gates:
1612 ran, 0 skipped`; its fork tests check ran 825 tests at
`tbc-new-fork@ae2c8afc1`).
