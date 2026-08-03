# SME judgment — junk filter (P3 ret universe)

**Date:** 2026-07-30
**Reviewing:** `.scratch/handoffs/sme-junk-filter-brief.md`
**Data:** `.scratch/ticket-18/reject-list.json`, `data/universes/ret-p3.json`,
`vendor/wowsims/db.json`

> **This file was rewritten 2026-07-30 after the first version was rejected.**
> The first version claimed Glaive of the Pit had "no stats at all" and was
> "inert", and that Hammer of the Naaru "spends a third of its budget on a stat
> ret doesn't use". Both claims were wrong — see "Retracted" at the bottom. The
> verdict has changed from `trust-with-caveats` to `do-not-trust`.

---

## Verdict

**do-not-trust** — do **not** apply the EP-floor rule to the `weapon` slot.

Rule 1 (caster-only) is fine and can be applied. Rule 2 (EP floor) is unsound
for weapons because the score it ranks on cannot see weapon damage, which is
the dominant source of a two-hander's value for ret.

---

## The defect

`curationHint` comes from `ep_score`, which sums `stats[i] * weight[i]`
(`scripts/assemble_universe.py:172`). The ret EP weights
(`data/presets/ret/p2.ep-weights.json`) contain terms for Str, Agi, spell
damage, AP, melee hit, crit, haste, armour pen and expertise — **and no term
for weapon damage or weapon speed.** There is no key it could use; weapon
damage does not live in the `stats` map at all, it lives in
`scalingOptions.0.weaponDamageMin` / `weaponDamageMax`.

So for the `weapon` slot, `curationHint` ranks two-handers on their stat line
while ignoring the largest contributor to their damage. Ret's Seal and
Judgement damage and Crusader Strike all scale from weapon damage.

Sort the 17 P3 weapons by the score the filter uses, against what they
actually swing:

| curationHint | weapon DPS | sockets | name |
|---:|---:|---:|---|
| **0.00** | 119.7 | 3 | **Glaive of the Pit** |
| **44.00** | 119.9 | 3 | **Hammer of the Naaru** |
| 50.00 | 125.5 | 0 | World Breaker |
| 50.84 | 119.9 | 0 | Axe of the Gronn Lords |
| 52.00 | 114.0 | 0 | Despair |
| 62.80 | 114.0 | 0 | Legacy |
| 73.10 | 116.9 | 3 | Ethereum Nexus-Reaver |
| 73.50 | 127.0 | 0 | Stormherald |
| 73.59 | 130.4 | 3 | Twinblade of the Phoenix |
| 81.25 | 119.9 | 0 | Gorehowl |
| 85.00 | 126.9 | 0 | Lionheart Executioner *(worn)* |
| 96.50 | 130.4 | 0 | Soul Cleaver |
| 108.50 | 138.0 | 0 | Cataclysm's Edge |
| 113.04 | 126.9 | 0 | Merciless Gladiator's Greatsword |
| 123.47 | 134.2 | 0 | Vengeful Gladiator's Greatsword |
| 138.76 | 130.4 | 0 | Torch of the Damned |
| 143.75 | 130.4 | 0 | Halberd of Desolation |

The score is close to uncorrelated with weapon DPS. Torch of the Damned and
Twinblade of the Phoenix have identical 130.4 weapon DPS and score 138.76 and
73.59. World Breaker out-damages Gorehowl and scores lower.

**Glaive of the Pit scores exactly 0.00** — last of 17 — because it has an
empty stat map. It is not a weak weapon. It has 354–532 damage at 3.7 speed
(**119.7 weapon DPS, within 5.7% of the worn Lionheart Executioner**), three
gem sockets, and a Drain Life proc at 1.33 PPM. The filter drops it for having
no stats, when for a two-hander the stat line is the smaller half of the item.

**Hammer of the Naaru** is 119.9 weapon DPS (−5.6% vs the worn weapon), Str 44,
**three sockets** against Lionheart's zero. Three epic Str gems is roughly
+24 Str, which closes much of the Str gap.

Both are within ~6% weapon DPS of a T5-level weapon and carry socket capacity
the worn weapon lacks. That is not the profile of an obviously droppable item.

---

## What is still fine

**Rule 1 (caster-only), 119 items — apply it.** I verified that none of the 119
carries Str, Agi, AP, melee hit, melee crit, melee haste, armour pen or
expertise. These are caster DPS and healing pieces (Ruby Drape of the
Mysticant, Band of Al'ar, Nadina's Pendant of Purity, Cowl of Nature's Breath).
The rule is a stat-presence test, not a magnitude test, so it does not inherit
the weapon-damage blindness — it never asks "how much", only "which kind".

Rule 1 also never touches the weapon slot in this data.

**Spell damage is handled correctly.** Stat 5 is deliberately not treated as
caster-only, which is right for ret in 2.4.3. Every spell-damage item in the
reject list also carries Int *and* Spirit, so they are rejected on those.

**Librams and trinkets must stay exempt.** All three P3 librams
(Libram of Souls Redeemed, Libram of Absolute Truth, Tome of the Lightbringer)
have **empty stat maps** — their value is entirely in effects. A stats-based
rule would delete every libram in the game. This is the same failure mode as
the Glaive, and the existing `ranged`/`trinket` exemptions are what prevent it.
That the exemption was needed at all is evidence the rule's blind spot is
general, not specific to weapons.

**The 15 non-weapon EP-floor rejects** (Ravager's Bands, Lurker's Belt,
Glider's Boots, Vambraces of Courage and similar) are low-ilvl dungeon armour.
Those slots have no damage component, so the score sees everything that
matters. Dropping them is defensible.

---

## The margin argument — still reject it

Independently of the above: the brief asked whether a 22.6 dps margin on one
character justifies the filter for all characters. It does not. A margin is
measured against one baseline; change the baseline and every number moves,
which is the concern itself. That reasoning should not be quoted whatever
happens to the filter.

Note the sim agreed both weapons were downgrades **for this character**
(−70.51 and −103.91). That is expected: slamaltman wields a stronger weapon.
It is not evidence about a ret holding something worse, and it is not what
justified the rejection — `curationHint` dropped them before the sim was
consulted.

---

## Gate

Would I trust the filtered output as a ret who knows the game? **Not with rule
2 applied to weapons.**

To get to yes, either:

1. **Exclude `weapon` from `SLOTS_WITH_EP_SIGNAL`.** One-line change, removes
   the unsound case, keeps the 15 defensible armour rejects. The weapon slot is
   17 items — filtering it saves almost nothing anyway.
2. **Or** give `ep_score` a weapon-damage term for weapon-slot items and
   re-measure. Larger change; ticket 24 already lists "weapon-damage-in-EP" as
   a known concept.

Option 1 is what I would ship now.

**What would change my answer on rule 1:** if it is ever extended from
stat-presence to a magnitude or ilvl threshold, this judgment does not carry —
that would be baseline-dependent and would need the second-character work.

---

## Notes for engineering

- `ep_score` has no weapon-damage term and cannot get one from `stats` —
  weapon damage lives in `scalingOptions.0.weaponDamageMin/Max`.
- Glaive of the Pit scores 0.00 and is last of 17 on an empty stat map, while
  swinging 119.7 weapon DPS with 3 sockets and a 1.33 PPM proc.
- Hammer of the Naaru has 3 sockets; the worn Lionheart Executioner has none.
  Socket capacity is real budget and the score ignores it too.
- The existing `ranged`/`trinket` exemptions exist for exactly this blind spot
  (librams have empty stat maps). Weapons need the same treatment or a real
  fix.
- Do not remove those exemptions.

---

## Retracted from the first version of this file

Both of these were wrong and were the basis of the earlier
`trust-with-caveats` verdict:

1. *"Glaive of the Pit — ilvl 125 polearm with no stats at all … a bare weapon
   with zero stats is not competitive for any ret at any gear level."* False.
   It has 354–532 weapon damage, three sockets and a proc. The empty `stats`
   map was read as an empty item. For a two-hander, weapon damage is the
   dominant term, and ret scales from it directly.
2. *"Hammer of the Naaru spends a third of its budget on a stat ret does not
   use."* Rhetoric, not arithmetic. The relevant question is whether the total
   contribution beats the alternative, not what fraction is wasted; neither
   side was computed. With weapon damage and three sockets counted it is within
   ~6% of the worn weapon.

Root cause of the error: the item probe read `weaponDamageMin`/`Max` from the
top level of the record, where they are absent, and printed `None`. They live
under `scalingOptions.0`. The `None` was not questioned.
