# SME rank judgment — ret P3 refresh (slice 6 / 6b)

## Verdict

**trust-with-caveats**

The refreshed P3 gear tags are the right items for a Tier 6 era retribution
paladin, and the EP preset behaves like a real ret preset under two
independent in-game consistency checks. Two slots are under-stocked in a way
a ret player would notice: the relic (libram) slot and the trinket slot.
Neither is a tagging mistake — the items never reach the list at all.

One scope point that limits this verdict: **no ranking was reviewed.** See
"What was reviewed".

## What was reviewed

- **Character / spec:** retribution paladin (`spec: "ret"`), phase 3 (Black
  Temple / Hyjal era), `carryoverPolicy: "union"`, `maxPhase: 3`.
- **Baseline gear:** none supplied. There is no equipped set in these files.
- **Files** (worktree `C:\Users\dgree\Code\lulz\tbc-gear-prio-wt-ret-p3-data`,
  branch `feat/ret-p3-data`, tip `9004654`):
  - `data/universes/ret-p3.json` — 394 items, 15 carrying `bisSets: ["p3"]`
  - `data/universes/ret-p3.report.json`
  - `data/universes/ret-p2.json`, `ret-p4.json`, `ret-p5.json` (comparison)
  - `data/presets/ret/p3.ep-weights.json`

**These are not rank results.** They are a candidate item list plus BiS
labels plus a stat-weight preset. There is no ordered list, no equipped set,
and no gain/loss numbers. So the checks that need those could not be run:
whether an item the character already wears shows up as an upgrade, whether
any gain or loss is an absurd size, and whether the ordering near the top is
sensible. Anyone reading this verdict as "the P3 ranking is sound" is reading
more than it says.

## Game problems

### 1. The paladin relic slot is roughly half empty (medium)

A paladin equips a libram in the ranged slot. It is normal, permanent,
equipped gear that a ret cares about and hunts for.

The P3 list offers **four** relics: Libram of Fervor, Libram of Souls
Redeemed, Libram of Absolute Truth, and Tome of the Lightbringer. The
report's own `wowheadRecall.missedItems` names three more paladin librams
that were expected and did not make it, all marked `d7Eligible: true`:

| Item | Id |
| --- | --- |
| Libram of Avengement | 27484 |
| Libram of Righteous Power | 31033 |
| Libram of Hope | 22401 |

Libram of Avengement is the exact relic the reference P3 set picks — it is
the one populated slot of that set's sixteen that our list cannot show. A ret
looking at this output sees the sim authors' chosen relic simply not offered.

Two things make this worse than a single missing row. First, it is a pattern,
not an accident: three of the four missing relics are librams. Second, the P2
list is thinner still — three relics, no Tome — so the gap is not new to P3.

The earlier note that this is "a pool-membership question, not a tagging bug"
is correct about the mechanism and understates the effect. From inside the
game, an equipment slot that is missing about half its real options, including
the one the reference set names, is a defect in what the product shows.

### 2. Well-known ret trinkets are missing (medium)

The trinket slot carries 21 items at P3. The same `missedItems` list drops
eight trinkets. Three of them are TBC-era pieces a ret genuinely wore in this
tier:

- **Darkmoon Card: Crusade** (31856) — a top-tier melee trinket of the era
- **Hourglass of the Unraveller** (28034) — Karazhan, Terestian Illhoof
- **Abacus of Violent Odds** (28288) — heroic dungeon, a haste trinket ret used

The other five (Mark of the Champion, Slayer's Crest, Drake Fang Talisman,
Kiss of the Spider, Scrolls of Blinding Light) are pre-TBC raid trinkets.
Excluding them from a TBC phase list is defensible, and I would not call that
a fault — **stated with lower confidence** than the three above.

### 3. No plate and no tier in the P3 set, a sharp break from P2 (informational)

The P2 set carries three plate pieces — Crystalforge Breastplate (tier 5
chest), Bladespire Warbands, Furious Gizmatic Goggles. The P3 set carries
**zero plate pieces and zero tier pieces**, while the report confirms all 15
tier pieces are present in the list (`tierPiecesMissing: []`).

**This is very probably not a bug.** Retribution in this expansion is
well known for wearing leather and mail off-set gear, because the plate
available to them is itemized with stats they do not want. Several tagged
pieces are famous real ret choices, not mistakes:

- Cursed Vision of Sargeras (leather head)
- Belt of One-Hundred Deaths (leather waist)
- Dragonspine Trophy, Bloodlust Brooch (trinkets)
- Pendant of the Perilous (neck)
- Torch of the Damned (two-hand mace)

The reference source also ships a separate "Bulwark" variant of this set whose
only difference is a plate chest, which shows the chest slot is contested
rather than settled.

The consequence worth naming for engineering is narrower: because the P3
reference set uses no tier pieces at all, **any set-bonus value the product
computes at P3 has nothing in the reference set to check it against.** That
should be a deliberate acceptance, not something discovered later.

## Rows that look fine

- **All 15 tagged items are equippable by a paladin.** A plate class can wear
  cloth, leather, and mail. Nothing in the set is barred to the class.
- **The tagged weapon is a two-hander** (`handType: 4`, Torch of the Damned),
  which is what ret uses. No one-hand-plus-shield confusion, and every weapon
  in the list is a two-hander.
- **No special or temporary loot is treated as normal gear.** The list holds
  no legendary items at all (no quality above 4), and nothing that exists only
  inside an encounter.
- **Raid and arena loot stay separated.** Four Gladiator-series pieces sit in
  the list and **none** is tagged as a BiS item, so PvP gear is not being
  mistaken for raid gear.
- **The phase guard behaves.** Item 32574 is a phase 3 item and is correctly
  absent from the P2 list while present at P3; the phase 1 crafted cloak 33122
  stays available across both. Long-lived phase 1 and phase 2 pieces holding
  their place in a phase 3 set — the crafted cloak, the Lower City ring, the
  Gruul trinket — is normal for this expansion and reads correctly.
- **The stat weights behave like real ret weights**, on two checks that are
  independent of each other:
  - Attack power sits at 0.42 and strength at 1.00. Two attack power per
    strength gives 0.84, and the class's strength talent plus the raid's
    strength blessing lift that to about 1.0. It lands.
  - Agility sits at 0.73 and crit rating at 0.80. A paladin needs about 25
    agility for one percent crit and about 22.1 crit rating for the same one
    percent, so agility is worth roughly 0.88 crit rating, giving 0.70. It
    lands, and it explains why the agility-heavy leather pieces win slots.
  - Hit and expertise at 2.15 each against strength at 1.00 is the expected
    shape for this spec.
- **Weapon damage is carried outside the stat map**, as `pseudoWeights` main
  hand DPS at 5.43. Two-handers are therefore not being judged on an empty
  stat line, which is the usual way a good weapon gets buried.

## Gate

**Not yet — but the remaining distance is short and specific.**

As a ret who knows the game, I would trust the P3 item tags and the stat
weights. I would not yet trust the product's output for two slots, and I
cannot speak to the ranking at all.

Before yes:

1. The relic slot must offer the librams a ret can actually get, including
   Libram of Avengement. A relic slot missing about half its options fails a
   basic in-game sanity check.
2. The trinket slot should account for Darkmoon Card: Crusade, Hourglass of
   the Unraveller, and Abacus of Violent Odds — either include them or record
   why this tier excludes them.
3. An actual ranked result with a stated equipped set has to be reviewed. The
   Phase 1 "would a ret trust this?" gate asks about ordering, gain sizes, and
   already-worn gear. None of those questions can be answered from a candidate
   list, and this review did not answer them.

Items 1 and 2 do not block the branch on their own — the tags on it are an
improvement over what they replaced. They block the gate.

## Notes for engineering

- The relic gap and the trinket gap show up together in one place the code
  already prints: `wowheadRecall.missedItems` in `ret-p3.report.json`, 18
  rows, 17 of them marked eligible. Recall is 85.4%. Whatever drops those 17
  is one thing, not several.
- Three of the four missing relics are librams. That looks like one cause.
- The reference P3 set has 16 filled slots; we tag 15. The 16th is the libram.
- P2's relic slot is thinner than P3's, so this predates the P3 refresh.
- Nothing here contradicts the slice 6b verification. The tag work is right.
  The problem is what never arrived to be tagged.
