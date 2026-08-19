Status: open
Type: bug (candidate pool; ranking correctness)
Origin: `sme-rank-review` verdict during ticket 224, 2026-08-18 — handoffs at
  `.scratch/handoffs/sme-rank-judgment-ticket-224-screened-presentation.md` and
  `.scratch/handoffs/sme-rank-judgment-ticket-224-second-opinion.md`
  (the second SME confirmed the counts independently and found the third
  druid-illegal ranked row)
Blocks: none
Blocked by: none

# The feral pool admits weapons a druid cannot equip, and one reaches the ranked list

## The finding

The SME review of ticket 224's presentation change read the feral-p3 weapon
slot and found that **40 of the 78 ruled-out "weapons" are items a druid cannot
equip** — 11 shields, 11 held-in-off-hand items, 11 swords, 7 axes. The reviewer
verified the item types against `data/items/index.json` using the type codes
from the `WeaponType` enum rather than from memory.

Corrected on 2026-08-18 against `druid.ts` (see Confidence): the 11
held-in-off-hand items **are** druid-equippable, so the inequippable count is
**29 of 78** — 11 shields, 11 swords, 7 axes. The three ranked rows below are
unaffected.

This is not confined to the hidden ruled-out block, which is what makes it a
bug rather than noise:

- **`Cataclysm's Edge` (item 30902) is a sword, and it printed as a ranked
  upgrade at #16 with Δ17.73** — above the fold, in the list a player acts on.
- `Twinblade of the Phoenix` is also a sword, in the below-cutoff tail.
- `Soul Cleaver` is an **axe** (`weaponType 1`), two-hand, Δ-8.93, also in the
  below-cutoff tail. Found by the second SME, who typed every ranked weapon row
  against the index rather than trusting the first SME's list.

**The rule is a proficiency list, not a sword exception.**
`vendor/tbc-new-fork/ui/core/player_classes/druid.ts` lines 25-31 is the
source:

```ts
	static weaponTypes: EligibleWeaponType[] = [
		{ weaponType: WeaponType.WeaponTypeDagger },
		{ weaponType: WeaponType.WeaponTypeFist },
		{ weaponType: WeaponType.WeaponTypeMace, canUseTwoHand: true },
		{ weaponType: WeaponType.WeaponTypeOffHand },
		{ weaponType: WeaponType.WeaponTypeStaff, canUseTwoHand: true },
	];
```

Dagger, Fist, Mace, OffHand, Staff. Two corrections to the SME's recalled
list follow from it: **polearm is not druid-equippable** (the SME named it;
upstream does not), and **off-hand is**. `Soul Cleaver` is what makes the
proficiency framing concrete: an engineer who reads the first SME's report as
"the sword case" writes a sword filter and leaves the seven axes in.

Off-hand fist weapons such as `Fist of Molten Fury` are legal per druid.ts and
are **not** part of this defect; whether the sim credits an off-hand on a feral
build is a separate question this ticket does not answer.

A related artifact: the ~-470 to -513 DPS deltas in that slot are "no weapon
equipped", not "this item is bad". They are a slot-mismatch artifact and must
not be used to tune anything.

## Why the existing filter does not catch it

Distinct from ticket 25's `classAllowlist` work. That catches items locked to a
class by an explicit class restriction; these are weapon **types** a class never
trains.

The mechanism to exclude them already exists and is simply unpopulated for
feral. `scripts/assemble_universe.py` line ~582 filters on it:

```python
        if it.get("weaponType") in profile.excluded_weapon_types:
            return False
```

but the feral profile (~line 315) leaves the set empty, while its own comment
two lines above (~312-313) names the correct upstream list:

```python
        # Dagger, Fist, Mace (1H and 2H), Off-hand and Staff -- so unlike ret,
        # one-handers are eligible and staves are the signature weapon.
        allow_one_hand=True,
        excluded_weapon_types=frozenset(),
```

So the profile already knows the rule in prose and does not apply it.

## Confidence

The per-item facts (which item is which weapon type) are read from repo data and
are checkable, and two SMEs resolved them independently against the
`WeaponType`/`HandType` enums, agreeing on 40 of 78.

The proficiency rule is **not** recalled game knowledge, contrary to how this
ticket first stated it. The repo does carry a source:
`vendor/tbc-new-fork/ui/core/player_classes/druid.ts` lines 25-31, quoted
above, which is the same upstream list the sim itself enforces. Druids equip
Dagger, Fist, Mace, OffHand and Staff; swords, axes, shields and polearms are
inequippable. The shields and swords the SMEs found are real defects; the
held-in-off-hand items are not.

## Reproduce

The SME read the output of a throwaway script (not committed) that ranks the
feral-p3 pool offline from the committed recordings. The pool contents are the
durable part and need no script:

```
node -e "const p=require('./data/universes/feral-p3.json'); ..." # inspect the weapon slot entries
```

Cross-reference candidate weapon items against `data/items/index.json` and its
`weaponType` codes.

## The fix

Populate the feral profile's `excluded_weapon_types` with the types druid.ts
omits, using the `WeaponType` enum names from `data/proto/common.proto`
(lines 338-349):

- `WeaponTypeSword`
- `WeaponTypeAxe`
- `WeaponTypeShield`
- `WeaponTypePolearm`

Note the enum has no separate two-hand members — two-handed swords, axes and
polearms carry the same `weaponType` and are distinguished by `HandType`, so
excluding the four types above covers both hand types at once. `allow_one_hand`
stays `True`.

Then regenerate `data/universes/feral-p2.json` and `data/universes/feral-p3.json`
under the `data-pipeline-work` rules (regenerate from committed sources with the
pinned toolchain; working tree must match `HEAD` before the commit, or document
which side is wrong). **The regeneration is this ticket's job** — it was
deliberately not done in the pre-merge-review batch that corrected this text on
2026-08-18, because it changes committed generated artifacts and the recorded
fixtures keyed to them.

## Acceptance

- [ ] The proficiency rule for each supported spec is written down with a source.
- [ ] The pool no longer admits weapon types the spec cannot equip.
- [ ] `Cataclysm's Edge` (30902, sword) and `Soul Cleaver` (axe) are both
      absent from the feral candidate pool — the axe case is the one a
      sword-only filter would miss.
- [ ] A test covers at least one inequippable type per supported spec.

## Also worth a look

`Bloodlust Brooch` and `Hourglass of the Unraveller` both scored exactly
Δ0.00 in that run. Plausible for an unfired on-use and a non-proccing proc, but
confirm they were simulated rather than silently skipped.
