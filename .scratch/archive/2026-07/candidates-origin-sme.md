# SME spot-check: candidates-origin game claims

Source: `.scratch/handoffs/candidates-origin.md` § **Game claims for SME spot-check**  
Scope: TBC Anniversary retribution paladin equip / loot / persistent-gear facts only.

---

## Verdict

claims-ok-with-nuances

---

## Per-claim review

### 1. Ret armor chase is normally plate; some BiS are leather (e.g. Vashj belt) — **Pass**

Ret’s armor class is plate, and body-slot chase is plate-first. Paladins can still wear leather/mail, and some physical-DPS BiS pieces are leather — Belt of One-Hundred Deaths (Lady Vashj) is the right example. Those pieces are deliberate exceptions, not the default generate path.

### 2. Ret ranged slot is a libram, not a bow/gun — **Pass**

Hard equip rule: paladin ranged/relic is a libram. Bows, guns, crossbows, and thrown are unequippable. Netherstrand Longbow (and any hunter-style ranged) must never appear as a ret upgrade.

### 3. Ret weapon ranking is 2H sticks, not 1H + shield/offhand — **Nuance**

Correct for **raid ret DPS**: the meta is two-hand weapons. Ret can equip 1H + shield/offhand, but that is not the DPS upgrade path this product should rank. Slight wording care: “for this product” is fine as scope; underneath, the game fact is “ret DPS chase = 2H,” not “ret cannot wear 1H.”

### 4. Kael legendary weapons are encounter-only; Twinblade is keepable — **Pass**

The advisor/leg weapons (Netherstrand, Warp Slicer, Devastation, Infinity Blade, Cosmic Infuser, Staff of Disintegration, Phaseshift Bulwark) exist only for the Kael’thas encounter and are not normal persistent gear. Twinblade of the Phoenix is a normal epic 2H drop from that boss and is keepable loot.

### 5. Upgrade list is relative to worn gear, not a naked BiS sheet — **Pass**

True as a game reading of “upgrade”: whether a piece is better depends on what is already equipped. A BiS sheet is a different artifact (absolute wishlist for a stage), not the same as a character-relative swap list.

---

## Other game-facing issues

- Generate table says weapons are “two-hand only; **no polearm/staff**.” **Staff** exclusion matches equip rules (paladins cannot use staves). **Polearm** exclusion is not an equip rule — ret can use 2H polearms; treating “no polearm” as a game fact would be wrong (it is a product filter if kept).
- Worked example that Netherstrand must not appear (Kael temp + not a libram) is correct on both grounds.
- Tempest of Chaos as “should not” for a 2H ret list is correct (1H caster MH, not a ret stick).

---

## Notes for engineering

- Do not document polearm exclusion as “ret cannot equip polearms.”
- Claim 3 is fine if framed as DPS ranking scope (2H), not as a hard class incapability for 1H.
