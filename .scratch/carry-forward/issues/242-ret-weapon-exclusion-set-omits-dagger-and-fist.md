Status: open
Type: defect (latent; masked by `allow_one_hand=False`)
Origin: pre-merge review round 4 of `feat/candidate-pool`, 2026-08-20 (domain axis)
Blocks: none
Blocked by: none

# The ret weapon-exclusion set omits dagger and fist

## The finding

`scripts/assemble_universe.py:286` gives the ret profile
`excluded_weapon_types=frozenset({WEAPON_STAFF})` — staff (8) only.

Upstream lists six eligible types for paladin, and staff is not the only
omission:

```
grep -n -A12 "static weaponTypes" vendor/tbc-new-fork/ui/core/player_classes/paladin.ts
```

returns Axe, Mace, OffHand, Polearm, Shield, Sword (lines 26-33). **Dagger (2)
and Fist (3) are absent from that list exactly as Staff (8) is.** The profile
excludes one of the three omissions and the comment names only the staff half
of the source it cites.

`data/weapon-type-exclusions.json` therefore publishes `"ret": [8]` where the
cited source supports `[2, 3, 8]`.

## Why it is latent today, not an active defect

The ret profile sets `allow_one_hand=False` (`assemble_universe.py:282`), and
the hand-type gate at `:621` runs before the weapon-type check at `:625`. Every
TBC dagger and fist weapon is one-hand, so the hand gate removes them first.

Confirmed against the committed universes — no type 2 or 3 in any ret universe:

```
python -c "
import json,glob,os
from collections import Counter
by={int(k):v for k,v in json.load(open('data/items/index.json')).items()}
for f in sorted(glob.glob('data/universes/*.json')):
    if 'report' in f: continue
    u=json.load(open(f)); ids=[e['itemId'] for e in u['entries']]
    c=Counter(by[i].get('weaponType') for i in ids if i in by and by[i].get('weaponType'))
    print(os.path.basename(f),'n=',len(ids),dict(sorted(c.items())))
"
```

Observed 2026-08-20 at `88c1c1e`:

```
feral-p2.json n= 228 {2: 7, 3: 3, 4: 11, 5: 7, 8: 9}
feral-p3.json n= 365 {2: 12, 3: 5, 4: 16, 5: 11, 8: 14}
ret-p2.json   n= 240 {1: 4, 4: 2, 9: 5}
ret-p3.json   n= 390 {1: 5, 4: 4, 6: 1, 9: 7}
ret-p4.json   n= 437 {1: 6, 4: 4, 6: 1, 9: 8}
ret-p5.json   n= 518 {1: 8, 4: 4, 6: 2, 9: 9}
```

## The exposure

Two ways this becomes live:

1. **`allow_one_hand` flips for ret.** Dual-wield or one-hand-plus-shield
   ranking would admit daggers and fists silently — the same class of defect as
   ticket 228 (pool admits weapons the class cannot equip), which was a blocker.
2. **The manifest certifies ret as clean against an incomplete rule.**
   `packages/core/test/weapon-type-exclusion.test.ts` is deliberately written to
   cover *any* spec from the manifest, so it will pass ret while the rule it
   checks is missing two types. The test is not wrong; its input is.

## Acceptance

- [ ] `WEAPON_DAGGER = 2` and `WEAPON_FIST = 3` defined beside `WEAPON_STAFF`
      (`assemble_universe.py:103`), and the ret profile excludes all three.
- [ ] The profile comment quotes all three omissions against `paladin.ts:26-33`,
      not just staff.
- [ ] `data/weapon-type-exclusions.json` regenerates to `"ret": [2, 3, 8]`.
- [ ] The universe histogram above is byte-unchanged — this fix must move no
      universe membership, because the hand gate already removed these items.
      A membership change means the hand-gate reasoning above is wrong.
- [ ] `pnpm verify` green.
