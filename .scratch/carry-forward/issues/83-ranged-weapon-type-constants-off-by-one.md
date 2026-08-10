Status: closed
Type: bug
Origin: docs/reviews/fix-75-82-review-tickets.md (domain axis, D2)
Blocks: none
Blocked by: none
Relates to: 81
Resolution: fixed all three steps. The hand-copied constants were replaced by
  imports from `packages/core/src/proto/common_pb.ts` (already generated from
  data/proto by `pnpm proto:generate`), so there is no second copy left to
  drift -- EnchantType, WeaponType, HandType and ItemType were switched over
  with them. `packages/core/test/enchants.test.ts` now pins one real item of
  every rangedWeaponType 1-8 against Adamantite Scope; it failed on the bow
  before the fix and passes after. `pnpm verify` green. 2026-08-09.

# `enchants.ts`'s `RangedWeaponType` constants are off by one, so bows are denied scopes and thrown weapons are granted them

`packages/core/src/enchants.ts:35-38` declares:

```ts
const RANGED_WEAPON_TYPE_BOW = 2;
const RANGED_WEAPON_TYPE_CROSSBOW = 3;
const RANGED_WEAPON_TYPE_GUN = 4;
const RANGED_WEAPON_TYPE_WAND = 5;
```

`data/proto/common.proto:359-369` — the source of truth — says:

```
RangedWeaponTypeBow = 1;
RangedWeaponTypeCrossbow = 2;
RangedWeaponTypeGun = 3;
RangedWeaponTypeThrown = 4;
RangedWeaponTypeWand = 5;
```

The three shootable constants are each shifted up by one. `WAND = 5` is
correct only by coincidence — the shift happens to land on it.

## Measured effect

Probed at runtime with Adamantite Scope (2722) against one real item of each
`rangedWeaponType` from `data/items/index.json`:

| type | example | scope applies | correct? |
|---|---|---|---|
| 1 bow | Polished Shortbow | false | **wrong** — 66 bows denied |
| 2 crossbow | Stoneshatter | true | right by luck |
| 3 gun | Willey's Portable Howitzer | true | right by luck |
| 4 thrown | Standard Thrown Weapon | true | **wrong** — 42 thrown granted |
| 5 wand | Banshee Finger | false | right |
| 6/7/8 relics | idol / libram / totem | false | right |

Reproduce by calling `enchantAppliesToItem(2722, <itemId>)` for one item of
each type.

## Why it is not currently visible

No shipped universe contains a bow, gun, or thrown weapon. Counted across
all six committed universes, the only `rangedWeaponType` values present are
6 (idols, feral) and 7 (librams, ret):

```bash
python -c "import json,glob;idx=json.load(open('data/items/index.json',encoding='utf-8'));[print(f,{k:v for k,v in sorted(__import__('collections').Counter(idx[str(e['itemId'])]['rangedWeaponType'] for e in json.load(open(f,encoding='utf-8')).get('entries',[]) if idx.get(str(e['itemId'])) and idx[str(e['itemId'])].get('rangedWeaponType') is not None).items())}) for f in sorted(glob.glob('data/universes/*.json'))]"
```

So nothing is mis-scored today. This is a latent bug that bites the moment a
hunter spec, or any pool admitting ranged weapons, is added.

## Why it survived

The constants are a **hand-copied second source** of an enum the repo already
vendors as a proto. That is the drift `scripts/generate_json_literal_types.py`
exists to prevent elsewhere. The relic test added by carry-forward 81 passes
either way, because relics (6/7/8) sit outside both the wrong and the right
shootable sets — it pins the relic outcome, not the shootable one.

## What to do

1. Correct the three constants to 1/2/3, keeping `WAND = 5`.
2. Prefer deriving them from the proto rather than re-typing them, so the
   next enum change cannot silently drift again.
3. Add a test that pins one real item of **each** `rangedWeaponType` against
   a scope, so a future shift fails rather than passing on relics alone.
   Bows and thrown must be in that test — they are the two the current
   constants get wrong.
