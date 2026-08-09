Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (domain axis)
Blocks: none
Blocked by: none

# Druid idols (`rangedWeaponType == 6`) are flagged `enchantable: true` in `data/items/index.json`, but idols take no enchant in TBC

All 36 items with `rangedWeaponType == 6` carry `enchantable: true`. The
`enchantable` field's docstring claims a slot-level TBC truth, and for idols
it's wrong.

No current impact: zero rows in `data/enchants/index.json` are eligible for
the idol `itemType` (14), and the only consumer that could invent one
(`rank.ts` ~1021) gates on `enchantAppliesToItem`, which fails closed today.

Filed because the field is documented as authoritative, and a future caller
trusting `enchantable` alone (without also checking `enchantAppliesToItem`)
would synthesize idol enchants that can't exist in TBC.

## What to do

Correct the `enchantable` computation (or its docstring) for ranged/idol
items, or document that `enchantable` alone is insufficient and
`enchantAppliesToItem` is the real gate.
