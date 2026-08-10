Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (domain axis)
Blocks: none
Blocked by: none
Resolution: documented (option 2), not recomputed. Scope was wider than
  filed -- all 104 relics, not 36 idols. Pinned by a test that sweeps every
  relic against every enchant. 2026-08-09.

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


## What was done (2026-08-09)

**Scope correction.** The ticket names idols (`rangedWeaponType` 6, 36 items).
Measured against `data/items/index.json`, the same is true of librams (7, 33)
and totems (8, 35) -- **104 relics**, all `enchantable: true`. Idols are not
special; the whole relic class is affected. Types 1-5 (bow/crossbow/gun/thrown/
wand) are correctly enchantable via scopes.

**Chose option 2 (document), not option 1 (recompute).** `enchantable` is
computed as `slot not in NOT_ENCHANTABLE_SLOTS` and that constant is *derived
from db.json at generation time and asserted equal* to the observed set, so a
db revision that moves an enchant type fails the build rather than drifting
(`generate_item_gem_index.py:65-84`). Special-casing relics would put an
item-level exception inside a deliberately slot-level invariant and break that
assertion. The flag is not false at the granularity it claims -- the `ranged`
slot really does have enchant recipes, they just only fit shootables.

Instead the `ItemEntry.enchantable` docstring (`items.ts`) now separates the
two reasons it is insufficient -- profession-gating (rings) and granularity
(relics) -- and states plainly that `enchantAppliesToItem` is the real gate.

Test added (`enchants.test.ts`, "says no for every relic, though `enchantable`
says yes"): sweeps all 104 relics against every effectId in
`data/enchants/index.json` and asserts `isEnchantable` is true while
`enchantAppliesToItem` is false for every pair. Because this characterizes
existing behaviour rather than fixing it, it was mutation-checked -- pointing
`RELIC_RANGED_TYPES` at shootable types 1-3 makes it fail, so it is not
passing vacuously.

The ticket's "no current impact" holds and is now enforced rather than
observed.

## Pre-merge review correction (2026-08-09)

The domain axis (D1) caught a false claim in the first version of this
work's docstring: it said `enchantAppliesToItem` "fails closed for relics
today because db.json ships no enchant whose type is 14". That is wrong --
`data/enchants/index.json` ships **four** type-14 scopes (2523 Biznicks
247x128 Accurascope, 2722 Adamantite, 2723 Khorium, 2724 Stabilitzed
Eternium). The actual gate is an explicit *shootable* allowlist in
`enchants.ts` (bow/crossbow/gun only). Corrected in `items.ts`; the outcome
the test pins was always right, only the stated cause was wrong.

The same review found that the shootable allowlist's constants are
themselves off by one against `common.proto` -- filed as ticket 83. That
does not change this ticket's conclusion (relics sit outside both the wrong
and the right shootable sets, so they are rejected either way), but it does
mean the relic test here would pass even if the shootable branch were
broken, which it currently is.
