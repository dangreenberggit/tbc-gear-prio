Status: closed
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

## Resolved 2026-08-02 (`09a8f06`)

All four "done when" boxes:

- **Fields in committed indexes.** `generate_item_gem_index.py` now emits
  `itemType`, `handType`, `weaponType`, `rangedWeaponType` on every item row,
  plus a third output `data/enchants/index.json` (137 records) carrying
  `type` and `enchantType`.
- **Keyed by `effectId`**, which is what `SimItemSpec.enchant` holds. Verified
  rather than assumed: of the 65 distinct `permanentEnchant` values in
  `test/fixtures/slamaltman.raw.json`, 64 resolve as `effectId` and **0** as
  `spellId`. `enchantType` is absent on 127 of 137 upstream records and is
  normalized to 0 (Normal) at generation, so the rule never reads a missing
  field.
- **Swap copies only when the UI rule would.** `rank.ts:481` calls
  `enchantAppliesToItem` (`packages/core/src/enchants.ts`) instead of
  `isEnchantable`. Ported branch-for-branch from
  `ui/core/proto_utils/utils.ts`; upstream runs the same check from
  `EquippedItem.withItem`, which is exactly this situation.
- **Bare worn slot still means no enchant** — the `spec.enchant &&` guard is
  untouched, and ticket 14 pins it in `compose.test.ts`.

The shield / staff / off-hand branches cannot fire for ret (the universe is
two-handers and librams only). Kept anyway so the rule reads as a port of
upstream rather than encoding today's pool as an invariant.

### Tests

`packages/core/test/enchants.test.ts`, 9 cases on real committed ids —
including the one the ticket named: **2667 "Enchant 2H Weapon - Savagery"
does not apply to 32262 Syphon of the Nathrezim** (a one-hander), while
`isEnchantable(32262)` is `true`, so the test states the difference between
the old gate and the new one directly.
