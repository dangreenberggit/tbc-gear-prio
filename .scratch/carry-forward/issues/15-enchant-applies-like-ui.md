Status: open
Type: task
Origin: `.scratch/handoffs/wowsims-cli-vs-ui-sim-path.md` §4–5
Blocks: none
Blocked by: none

# Copy worn enchants only when they apply to the new item (UI rules)

## Problem

On candidate swap we copy a worn enchant if `isEnchantable(newItemId)`.
wowsims UI uses `enchantAppliesToItem` (slot intersection, 2H vs 1H,
staff/shield/off-hand, ranged). We can leave an incompatible weapon enchant
on a different weapon type.

## Done when

- Generated enchant + item fields needed for the check (at least
  `enchantType`, item `handType` / `weaponType` / `rangedWeaponType`) live in
  committed indexes (extend `generate_item_gem_index.py` or sibling).
- Swap copies enchant only when the UI rule would.
- Bare worn slot still means no enchant on the candidate.
- Unit tests cover 2H Savagery not applying to a 1H (or fixture equivalent).
