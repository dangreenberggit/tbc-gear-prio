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

This is not confined to the hidden ruled-out block, which is what makes it a
bug rather than noise:

- **`Cataclysm's Edge` (item 30902) is a sword, and it printed as a ranked
  upgrade at #16 with Δ17.73** — above the fold, in the list a player acts on.
- `Twinblade of the Phoenix` is also a sword, in the below-cutoff tail.
- `Soul Cleaver` is an **axe** (`weaponType 1`), two-hand, Δ-8.93, also in the
  below-cutoff tail. Found by the second SME, who typed every ranked weapon row
  against the index rather than trusting the first SME's list.

**The rule is a proficiency list (druids: daggers, fists, maces, staves,
polearms — recalled game knowledge, confirm against a class reference), not a
sword exception.** `Soul Cleaver` is what makes this concrete: an engineer who
reads the first SME's report as "the sword case" writes a sword filter and
leaves the seven axes in.
- `Fist of Molten Fury` is an **off-hand** fist weapon; feral uses no off-hand.

A related artifact: the ~-470 to -513 DPS deltas in that slot are "no weapon
equipped", not "this item is bad". They are a slot-mismatch artifact and must
not be used to tune anything.

## Why the existing allowlist does not catch it

Distinct from ticket 25's `classAllowlist` work. That catches items locked to a
class by an explicit class restriction; these are weapon **types** a class never
trains. Nothing outside the generated proto currently reads `weaponType` for
eligibility.

## Confidence

The per-item facts (which item is which weapon type) are read from repo data and
are checkable, and two SMEs resolved them independently against the
`WeaponType`/`HandType` enums, agreeing on 40 of 78. The druid proficiency rule
itself — daggers, fists, maces, staves and polearms only; no swords, axes,
shields or held-in-off-hand — is recalled game knowledge with **no source in this repo to check
it against**, which is plausibly why the gap exists at all. Whoever writes the
filter should confirm the proficiency list against a class reference first, and
consider whether the reference belongs in the repo.

## Reproduce

The SME read the output of a throwaway script (not committed) that ranks the
feral-p3 pool offline from the committed recordings. The pool contents are the
durable part and need no script:

```
node -e "const p=require('./data/universes/feral-p3.json'); ..." # inspect the weapon slot entries
```

Cross-reference candidate weapon items against `data/items/index.json` and its
`weaponType` codes.

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
