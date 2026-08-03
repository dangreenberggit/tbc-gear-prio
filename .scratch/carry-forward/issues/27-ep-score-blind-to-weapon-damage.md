Status: closed
Type: bug
Origin: SME review of the junk filter, `.scratch/handoffs/sme-junk-filter-judgment.md`, 2026-07-30
Blocks: none
Blocked by: none

# `ep_score` cannot see weapon damage, so `curationHint` misranks weapons

## Problem

`ep_score` (`scripts/assemble_universe.py`) is:

```python
def ep_score(stats: list[float], weights: dict[str, float]) -> float:
    total = 0.0
    for k, w in weights.items():
        i = int(k)
        if i < len(stats):
            total += stats[i] * w
    return total
```

It can only value things that appear in an item's `stats` map. **Weapon damage
is not there** — it lives at `scalingOptions.0.weaponDamageMin` /
`weaponDamageMax` — and `data/presets/ret/p2.ep-weights.json` has no
weapon-damage term to weight it with even if it were.

For ret this is a large omission. Seal and Judgement damage and Crusader Strike
all scale from weapon damage, and on a two-hander it is the dominant term.

The result is that `curationHint` ranks weapons on their stat line alone. The
17 P3 weapons, by the score against what they actually swing:

| curationHint | weapon DPS | sockets | name |
|---:|---:|---:|---|
| 0.00 | 119.7 | 3 | Glaive of the Pit |
| 44.00 | 119.9 | 3 | Hammer of the Naaru |
| 50.00 | 125.5 | 0 | World Breaker |
| 73.59 | 130.4 | 3 | Twinblade of the Phoenix |
| 85.00 | 126.9 | 0 | Lionheart Executioner *(worn)* |
| 108.50 | 138.0 | 0 | Cataclysm's Edge |
| 138.76 | 130.4 | 0 | Torch of the Damned |
| 143.75 | 130.4 | 0 | Halberd of Desolation |

(abridged; full table in the SME handoff)

The score is close to uncorrelated with weapon DPS. Torch of the Damned and
Twinblade of the Phoenix both swing 130.4 and score 138.76 vs 73.59.

**Glaive of the Pit scores exactly 0.00**, last of 17, because its stat map is
empty — while carrying 354-532 damage at 3.7 speed (119.7 weapon DPS, within
5.7% of the worn Lionheart Executioner), three gem sockets and a Drain Life
proc at 1.33 PPM.

Reproduce:

```bash
python -c "import json;d=json.load(open('vendor/wowsims/db.json'));\
i=[x for x in d['items'] if x['id']==28774][0];\
print(i['scalingOptions']['0'], i['weaponSpeed'], i['gemSockets'])"
```

## Sockets are a second, smaller blind spot

`ep_score` also ignores `gemSockets`. Hammer of the Naaru and Glaive of the Pit
each have three; the worn Lionheart Executioner has none. Three epic Str gems
is roughly +24 Str — real budget the score does not count. Lower priority than
the weapon-damage gap but the same class of problem.

## Immediate mitigation already applied

`weapon` was removed from `SLOTS_WITH_EP_SIGNAL` (2026-07-30) so the junk
filter's EP-floor rule no longer drops weapons on this score. That stops the
bleeding; it does not fix the score.

Note the existing `ranged` / `trinket` exemptions in `is_caster_junk` exist for
the same blind spot from the other direction — the three P3 librams also have
empty stat maps and would all be rejected without the exemption.

## Done when

- `curationHint` for a weapon-slot item reflects weapon damage, either by
  adding a synthetic weapon-DPS stat before scoring or by scoring weapons on a
  separate path.
- The 17-weapon ordering above is sane: no weapon with competitive weapon DPS
  sits at the bottom on an empty stat line.
- Ideally sockets contribute too, at least as a flat per-socket estimate.
- Decide whether `weapon` can then return to `SLOTS_WITH_EP_SIGNAL`.

## Resolved 2026-08-02

**The weight was not missing upstream — it was dropped in transcription.**
`ui/paladin/retribution/presets.ts` `P2_EP_PRESET` carries a second
`Stats.fromMap` argument, the pseudo-stat block, holding
`PseudoStatMainHandDps: 5.34`. Our `p2.ep-weights.json` copied all nine stat
terms from the first argument and none of the second. So this is a restored
upstream term, not a locally-invented approximation.

Checked against the wowsims clone before implementing:

- **Weapon DPS is a PseudoStat, not `StatPhysicalDamage`.** Stat 41 is a flat
  per-hit physical bonus from gems/enchants (`sim/core/spell_result.go`
  `BonusDamage`; the metagem at `sim/common/tbc/metagems.go` grants 3). It is
  never populated from item base stats — `MapBonusStatIndexToStat` in
  `tools/database/dbc/maps.go` has no case for it. Routing weapon damage
  through index 41 would double-count against presets that weight both.
- **Formula, copied exactly** from `ui/core/proto_utils/equipped_item.ts`
  `getWeaponDPS`: `(weaponDamageMin + weaponDamageMax) / 2 / weaponSpeed`.
- **It is slot-dependent upstream** (MH/OH/Ranged are separate pseudo-stats
  with separate weights). Our `weapon` slot is two-handers only, so main-hand
  is the only applicable one; `ep_score` applies it only for `slot == "weapon"`.
- Confirmed `weapon_damage_min/max` are siblings of the `stats` map in
  `ScalingItemProperties` (`proto/common.proto`), never inside it — so the
  original diagnosis was right about the mechanism.

`PseudoStatMainHandDps = 0` verified against the committed
`data/proto/common.proto`, not just the clone.

### Result

`pseudoWeights` is a new sibling key in `p2.ep-weights.json`. Every existing
consumer reads `.weights` (the stat record) and is untouched — checked
`cli.ts:191` and the five tests. That is deliberate: gems grant no weapon
damage, so the gem/sim path must not pick this term up.

Regenerated both universes. **Membership is unchanged** — 230 (p2) and 354
(p3), identical id sets, and *only* `curationHint` on the 10/17 weapon rows
differs. The pinned counts in `pool.test.ts` and `pool-hardening.test.ts`
stay valid.

P3 weapon ordering, before → after:

| was | now | wdps | name |
|---:|---:|---:|---|
| 0.00 (17th) | 639.36 | 119.7 | Glaive of the Pit |
| 108.50 (6th) | 845.42 (1st) | 138.0 | Cataclysm's Edge |
| 73.59 | 770.01 | 130.4 | Twinblade of the Phoenix |
| 138.76 | 835.07 | 130.4 | Torch of the Damned |

Torch and Twinblade swing identically and now score within 8% of each other
(was 138.76 vs 73.59).

### `weapon` stays out of `SLOTS_WITH_EP_SIGNAL`

Measured rather than assumed. The EP-floor rule drops the bottom 10% *within
a slot*, which presumes the bottom is junk. Across the 17 P3 two-handers the
corrected scores span 639–845 — a 1.3x spread — so re-enabling it would evict
**Glaive of the Pit and Despair**, at 114–120 weapon dps. The comment at
`SLOTS_WITH_EP_SIGNAL` now records this instead of the old blind-spot reason.

### Sockets — still open, deliberately

`ep_score` still ignores `gemSockets`; Glaive and Hammer of the Naaru have
three each. Not folded in here because a per-socket estimate is a magnitude
this ticket has no measurement for, and handoff ground-rule 4 says not to
encode magnitudes that cannot be defended. It is the remaining half of the
"lower priority" item in the original text.

### Tests

Three in `pool-hardening.test.ts`, asserting the *ordering* property rather
than magnitudes so regeneration under different weights does not re-pin them:
every weapon scores above zero; the lowest-scoring weapon is within 20% of
the best weapon dps; and hint-order vs dps-order has Spearman > 0.5.

Mutation-checked — disabling the weapon term and regenerating fails with
`28774 Glaive of the Pit: expected 0 to be greater than 0`.

## Notes

Ticket 24 already lists "weapon-damage-in-EP" among terms not to teach
externally; this is the concrete defect behind that phrase.

Anything else that consumes `curationHint` for weapons inherits this bug. Audit
before relying on it.
