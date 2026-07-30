Status: open
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

## Notes

Ticket 24 already lists "weapon-damage-in-EP" among terms not to teach
externally; this is the concrete defect behind that phrase.

Anything else that consumes `curationHint` for weapons inherits this bug. Audit
before relying on it.
