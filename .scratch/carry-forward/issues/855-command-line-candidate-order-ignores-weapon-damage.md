Status: open
Type: bug
Origin: .scratch/carry-forward/issues/821-ep-order-ignores-weapon-damage.md (2026-11-07 comment, "Owner decision: the core twins")
Blocks: none
Blocked by: none
Related: 820, 821

# The command-line candidate order ignores weapon damage

## Scope

The Upgrades tab is the product in scope (ADR-0027), and its order is fixed
(fork `6cc79f742`). This ticket is for the command-line tool only: its ranking
engine is the core twin of the tab's, and it still orders candidates the old
way.

## What the command-line order does

`packages/core/src/candidate-order.ts` (with `packages/core/src/stats.ts`)
scores each candidate by its item stats alone: `epScore` multiplies the item's
own stat array by the weights, and that array holds no weapon damage or weapon
speed. So a weapon gets no credit for its damage, and a two-hander is compared
with the worn main hand alone, not with the off-hand item the sim would also
remove (tickets 820, 821 describe the same two faults on the tab side).

Two inputs keep it that way:

- The command line reads only each weights file's `.weights`, never its
  `pseudoWeights` (`packages/core/src/cli-wiring.ts:133`), so the weapon-DPS
  pseudo-weights never reach the order.
- The core item data, `data/items/index.json`, has no weapon-damage or
  weapon-speed field for any of its 8249 items (checked 2026-11-07; the items
  do carry `handType`):

  ```sh
  python3 -I -c "import json; d=json.load(open('data/items/index.json')); ks=set().union(*(i.keys() for i in d.values())); print(len(d), sorted(k for k in ks if 'dam' in k.lower() or 'peed' in k.lower()) or 'none')"
  ```

  Its generator `scripts/generate_item_gem_index.py` reads the wowsims
  `vendor/wowsims/db.json`, which has both: each weapon's `scalingOptions`
  carry `weaponDamageMin`/`weaponDamageMax`, and the item carries
  `weaponSpeed`.

## What the tab does instead

Since fork `6cc79f742` (branch `fix/821-weapon-damage-order`, not yet on
`dev`) the tab scores each candidate per slot with wowsims' own code —
`new EquippedItem({item}).calcStats(slot).computeEP(Stats.fromMap(weights,
pseudoWeights))` in `ui/features/upgrades/model/item_ep.ts`, passed to the
engine as `Deps.itemEp` — so a weapon's damage per second counts at the
main-hand, off-hand or ranged weight of its slot, and a two-hander is charged
the worn off hand. The tab's ported `epScore` remains only as the fallback
when `itemEp` is absent. The core twin is unchanged.

## Done when

The core order ranks a two-hander against the worn main hand and the worn off
hand, and counts weapon DPS, with a test covering both. Adding weapon damage
to `data/items/index.json` through `scripts/generate_item_gem_index.py` is the
path that keeps the twins at parity; record the outcome in the
`candidate-order.ts` provenance row (`docs/fork-provenance/engine.md`), which
now points here.
