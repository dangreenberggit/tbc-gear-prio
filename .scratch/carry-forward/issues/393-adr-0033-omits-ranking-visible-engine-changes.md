Status: closed
Type: task
Origin: docs/reviews/feat-upstream-catchup-chunk1.md
Blocks: none
Blocked by: none

# ADR-0033 records one engine behaviour change and omits several ranking-visible ones

Closed 2026-09-14 by commit `2c61c723` on `feat/upstream-catchup-chunk1`.
Consequence 5 now carries a paragraph naming these changes as present but
unmeasured, with their file paths and the diff command that finds them, and no
DPS magnitude is claimed for any of them. The limitation clause no longer calls
the set bonuses talent conversions.

Two corrections to this ticket's own list, from re-reading the diff: The Twin
Blades of Azzinoth excludes `SpellFlagSuppressEquipProcs`, not
`SuppressWeaponProcs` like the other seven weapon procs; and the talent
conversions are five, not two — `applyHealingLight` and
`applyImprovedHolyShield` also move `DamageDone_Pct` → `Flat`, and
`applyPurifyingPower` also moves `PowerCost_Pct` → `PowerCost_Pct_Add`. The ADR
follows the diff.

Verified with
`grep -c -i 'seal of vengeance\|justicar\|lightbringer\|SuppressEquipProcs' docs/adr/0033-upstream-is-master-again.md`
→ 6, and `node node_modules/prettier/bin/prettier.cjs --check` on the ADR → rc 0.

`docs/adr/0033-upstream-is-master-again.md` Consequence 5 records the
Two-Handed Weapon Specialization fix (one-handed weapons no longer receive a
two-handed-only talent bonus; −80.35 DPS on a 1H main hand against a 3σ band of
2.16). The domain review verified that claim independently and found it
**correctly described and plausibly sized** — 5/5 gives 6% on most ret melee
damage, and 6% of ~1513 DPS is ~91, so an observed −80 sits sensibly just under.

That is the ADR's only behavioural note. The same upstream range
(`ec5c5f2..17a8fb28`) carries at least four more changes to items and mechanics
this project ranks, none of which the ADR mentions. Grepping the ADR for
`seal of vengeance|PPM|justicar|lightbringer|BiS|proc` returns nothing.

## What is missing

**Seal of Vengeance 15 → 20 PPM.** `sim/paladin/seals.go`:
`NewStaticLegacyPPMManager(15, core.ProcMaskMeleeWhiteHit)` becomes `(20, ...)`,
with an upstream comment citing TBC Anniversary logs (63 paladins, 6.3k landed
swings, 19.9 PPM at 1.6, 1.8 and 2.7 weapon speed alike). A 33% proc-rate
increase on a seal whose damage scales with weapon speed changes the relative
value of fast versus slow weapons for ret — directly ranking-visible.

**Justicar 2pc and Lightbringer 4pc flip `Pct` → `Flat`.**
`sim/paladin/item_sets.go` changes both from `core.SpellMod_DamageDone_Pct` to
`core.SpellMod_DamageDone_Flat`. These are **set bonuses on items this project
ranks**, not talent bookkeeping. The ADR folds them into a limitation clause
("nothing isolating the other `Pct → Flat` talent conversions"), which reads as
though they were talent-only.

**A proc-suppression pass across ranked items.** `SpellFlagSuppressEquipProcs` is
added to Seal of Righteousness, its judgement, and Seal of Blood; and
`SpellFlagsExclude: SpellFlagSuppressEquipProcs` plus `ClassSpellsOnly: true` to
Mystical Skyfire and Thundering Skyfire Diamond (`sim/common/tbc/metagems.go`),
with `SuppressWeaponProcs` exclusions added to Mongoose, Executioner, Deathfrost,
Despair, Blinkstrike, World Breaker, Syphon of the Nathrezim and Twin Blades
(`sim/common/tbc/enchants.go`, `items_weapons.go`). Every one of those is an
enchant, gem or weapon this project ranks.

**Live ret talent conversions.** `applyImprovedSealOfRighteousness`
(`DamageDone_Pct` → `DamageDone_Flat`) and `applyBenediction`
(`PowerCost_Pct` → `PowerCost_Pct_Add`) in `sim/paladin/talents.go`.

## Scope

None of this was simmed, so no DPS magnitude is claimed for any of it. The
finding is **disclosure**: the ADR presents one measured change as the engine's
behavioural story for this pin move, while the same range contains a coordinated
pass over procs and set bonuses on ranked items.

## What would fix it

Add a paragraph to ADR-0033 Consequence 5 naming these changes as unmeasured but
present, with their file paths, so a later reader chasing a ranking shift has the
candidate list. Measuring them is a separate, larger job — the engine-delta
recipe in `.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md` extends
to them (swap in an affected weapon/gem/set piece, compare the scalar across
pins), but each needs a gear set that actually triggers the mechanic.
