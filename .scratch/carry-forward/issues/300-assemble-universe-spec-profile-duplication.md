# assemble_universe.py: spec profiles repeat comment/constant lines

Status: open
Origin: pre-merge review feat/upgrades-all-dps-specs (standards axis)
Blocks: none

The nine new `*_TIER_PIECE_IDS` frozensets and `SpecProfile` blocks repeat
byte-identical comment triplets and `_ep_weights_map` pairs. A table + loop
(spec -> setIds, gear-set globs) would state each WHY once.
Judgement-call refactor; behavior must stay byte-identical (universes cmp).

## Re-scoped 2026-08-25 (branch `feat/upgrades-dedup-wowsims`)

Ticket 301's work removed the larger half of this surface. The equip-rule
constants and their comment blocks — `armor_types`, `ranged_type`,
`allow_one_hand`, `excluded_weapon_types`, `two_hand_weapon_types` — are gone
from all 53 call sites, because equip legality is now looked up from the fork's
own `canEquipItem` answer instead of being restated per spec.

Measured, not estimated:

```
python -c "
def block(p):
    s=open(p,encoding='utf-8').read()
    i=s.index('SPEC_PROFILES: dict[str, SpecProfile] = {'); j=s.index('\n}\n',i)
    return s[i:j].count('\n')
print(block('scripts/assemble_universe.py'))"
```

`SPEC_PROFILES` block: **443 lines before, 374 after** (69 removed). The whole
file is down 182 lines against 74 added.

What remains is the part 301 never touched, and it is the original complaint
minus its equip half:

- The nine `*_TIER_PIECE_IDS` frozensets.
- Repeated `_ep_weights_map` fallback/by-phase pairs, one per spec.
- Repeated comment triplets on `gear_sets`, `wowhead_dir` and `two_hop`, which
  say the same thing in each profile.

Still a judgement-call refactor with no behavioral component, and still
"universes must stay byte-identical" as its acceptance. Two new fields exist
that a table-and-loop rewrite must carry through rather than flatten:
`policy_excluded_weapon_types` and `policy_two_hand_only`, each paired with a
mandatory `policy_exclusion_note` (see ADR-0029). Their whole value is being
visible and justified per spec, so they are not candidates for defaulting away
in a loop.
