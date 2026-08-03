# Sub-phase 0: four blocking decisions

**Status:** Decisions proposed with measurements. Owner should confirm or override each one.
**Scope:** ret only, matches the parent plan.
**Parent plan:** `.scratch/handoffs/raid-scoped-pool-plan.md`
**Locked direction:** `.scratch/handoffs/raid-scoped-pool-handoff.md`

All numbers below come from a script that imports `scripts/generate_pool.py`
directly, so the eligibility rule is the same code the real generator will
use, not a re-typed copy. The script is saved at
`.scratch/handoffs/subplans/00-measure.py` in this repo's scratch area (a copy
is also kept in the session scratchpad). Re-run with:

```
python .scratch/handoffs/subplans/00-measure.py
```

Eligibility used throughout (handoff D7): body slots (head, shoulder, chest,
wrist, hands, waist, legs, feet) require `armorType` in `{2, 3, 4}` (leather,
mail, plate); ranged requires `rangedWeaponType == 7` (libram); weapon
requires `handType == 4` (two-handed) and excludes `weaponType` 6 (polearm)
and 8 (staff); `quality >= 3` (rare and above); Kael'thas Tempest Keep
encounter-only legendary IDs are excluded.

Target raid zones and their `db.json` zone IDs, all nine resolved
successfully: Karazhan 3457, Gruul's Lair 3923, Magtheridon's Lair 3836, SSC
3607, Tempest Keep 3845, Black Temple 3959, Hyjal Summit 3606, Zul'Aman 3805,
Sunwell Plateau 4075.

Of the 4,212 items that pass D7 eligibility at any quality and any phase,
1,443 have a zone that can be resolved from `db.json`'s `sources` field (a
`drop` entry with a zone). The other 2,769 have no zone in `db.json` at all
(`sources` is `null`, or the source is `crafted`/`rep` rather than `drop`).
`db.json`'s `sources` field only ever contains three kinds of entry: `drop`,
`crafted`, `rep`. It never contains a badge, vendor, or PvP source. That fact
matters for decisions 2 and 3 below.

---

## Decision 1: carryover policy

**Question:** at a given maxPhase, does the loot universe include raids from
earlier phases, or only the newest raids released in that phase?

**Options:**
- **Union** — include every raid whose phase is at or below maxPhase.
- **Newest only** — include only the raids that were released in maxPhase
  itself.

**Measured, per maxPhase, using the phase-to-zone mapping already in the
handoff (§3.1):**

| maxPhase | Zones included (union) | Union total | Union per slot | Newest-only total | Newest-only per slot |
|---|---|---|---|---|---|
| 1 | Karazhan, Gruul's Lair, Magtheridon's Lair | 118 | back 12, chest 6, feet 14, finger 9, hands 10, head 8, legs 6, neck 10, ranged 1, shoulder 6, trinket 8, waist 13, weapon 5, wrist 10 | 118 | same as union (phase 1 has no earlier phase to add) |
| 2 | + Serpentshrine Cavern, Tempest Keep | 201 | back 17, chest 12, feet 22, finger 21, hands 15, head 10, legs 10, neck 14, ranged 2, shoulder 12, trinket 23, waist 19, weapon 7, wrist 17 | 83 | back 5, chest 6, feet 8, finger 12, hands 5, head 2, legs 4, neck 4, ranged 1, shoulder 6, trinket 15, waist 6, weapon 2, wrist 7 |
| 3 | + Black Temple, Hyjal Summit | 310 | back 24, chest 22, feet 35, finger 30, hands 22, head 17, legs 17, neck 20, ranged 3, shoulder 21, trinket 27, waist 33, weapon 10, wrist 29 | 109 | back 7, chest 10, feet 13, finger 9, hands 7, head 7, legs 7, neck 6, ranged 1, shoulder 9, trinket 4, waist 14, weapon 3, wrist 12 |
| 4 | + Zul'Aman | 355 | back 27, chest 29, feet 38, finger 36, hands 22, head 23, legs 19, neck 23, ranged 3, shoulder 26, trinket 32, waist 36, weapon 12, wrist 29 | 45 | back 3, chest 7, feet 3, finger 6, head 6, legs 2, neck 3, shoulder 5, trinket 5, waist 3, weapon 2 (no wrist, no ranged) |
| 5 | + Sunwell Plateau | 410 | back 31, chest 35, feet 38, finger 44, hands 29, head 29, legs 25, neck 30, ranged 3, shoulder 32, trinket 36, waist 36, weapon 13, wrist 29 | 55 | back 4, chest 6, finger 8, hands 7, head 6, legs 6, neck 7, shoulder 6, trinket 4, weapon 1 (no feet, no waist, no wrist, no ranged) |

This confirms the prior measurement cited in the parent plan (union 201 /
newest 83 at maxPhase 2, union 310 at maxPhase 3) using the actual generator
code path.

These counts only cover the 1,443 items whose zone resolves through
`db.json`. They are a lower bound. AtlasLoot (sub-phase 1) is expected to
raise them, most importantly for tier armor, since none of the 18 ret tier
pieces has a resolvable `db.json` zone today (stated as measured fact in the
parent plan §3, not re-verified here).

**Recommendation: union.** Two reasons.

1. **Newest-only produces slot gaps.** At maxPhase 4, newest-only has zero
   wrist and zero ranged candidates. At maxPhase 5, it has zero feet, zero
   waist, zero wrist, and zero ranged candidates. A pool with empty slots
   cannot rank an upgrade for that slot at all, which fails the product
   question directly ("what should I want to drop tonight" has no answer for
   wrists at maxPhase 4 under newest-only).
2. **It fits the product question as the parent plan states it.** The parent
   plan's own example is a player at maxPhase 3 who still wants the Vashj belt
   from Serpentshrine, which is a union scenario rather than a newest-only one.
   The broader claim that raiders keep attending earlier raids for gear they
   have not yet received is untested here — no log data was examined for this
   decision.

**What breaks if newest-only is chosen instead:** the pool has slots with
zero or one candidate at higher phases (see the empty cells above), so the
ranker cannot recommend anything for that slot, and a config change alone
cannot fix it — the raid has to be added back, which is the union behavior
under a different name. If newest-only is still wanted for a specific reason
(e.g. a strict "tonight's raid only" view), it should be built as a filter on
top of the union universe, not as the storage-level membership rule, so the
empty-slot problem does not become a data gap.

---

## Decision 2: badge vendors

**Question:** does the default pool include Badge of Justice gear, and if so,
how does a badge item carry a source?

**Measured:** `db.json`'s `sources` field, across every item in the file (not
just eligible ones), only ever contains the keys `drop`, `crafted`, or `rep`.
A direct search for `"badge"` or `"emblem"` anywhere inside any eligible
item's `sources` value returns zero matches. `db.json` has no representation
of badge vendors at all — not a wrong answer, an absent one.

This means **badge-sourced items cannot be identified from `db.json`.** The
only badge-sourced ret items currently in the repo come from hand-authored
data: `scripts/curate_ret_pool.py`'s `FORCE` list contains 4 items with
`source.kind == "badge"` (Libram of Avengement, Libram of Absolute Truth,
Libram of Zeal, Libram of Righteous Power), each with a `cost` field for the
badge price. There is no larger badge item list anywhere in the repo to
measure against, so "how many ret-eligible items are badge-sourced" cannot be
answered from `db.json` — it can only be answered by building a hand list
(the same shape as the existing `HAND`/`FORCE` maps), the same way tier
tokens are handled per the parent plan §5.3.

**Recommendation: include badge items by default, sourced through a small
hand-authored list**, following the existing `{"kind": "badge", "cost": N}`
shape already used in `curate_ret_pool.py`. Reasoning: badge gear is
frequently BiS-competitive in TBC (the parent plan's own framing), and a
player deciding what to chase "tonight" needs to see it alongside raid drops
to make a real comparison. Since `db.json` cannot supply this data, it has to
be a maintained hand list — the same operational cost that already exists for
tier tokens (sub-phase 2) and the existing badge libram entries, so this adds
no new kind of maintenance burden, only more rows in it.

**What breaks if badges are excluded instead:** the pool understates the
real alternative to a raid drop. A player checking "should I chase the Black
Temple belt or the badge belt" gets no answer for the badge side, which
silently reintroduces the "pool doesn't tell the whole story" problem the
redesign is meant to fix. If exclusion is chosen anyway, it should be a
stated scope cut, not an accidental omission, because badge items already
exist in the committed pool today (the 4 libram entries above) and removing
them would be a regression.

---

## Decision 3: PvP gear (arena and honor)

**Question:** does the default pool include arena/honor items, exclude them,
or bucket them separately?

**Measured:** the same string search for `"arena"`, `"honor"`, `"pvp"` inside
`db.json` `sources` values also returns zero matches — `db.json` has no
representation of PvP vendors either, for the same reason as badges.

The committed pool already contains PvP items, entirely through the hand
maps: `scripts/curate_ret_pool.py`'s `HAND` dict has 29 entries with
`kind == "pvp"`, and `FORCE` has 3 more (`Vengeful Gladiator's Libram of
Vengeance`, `Vengeful Gladiator's Libram of Justice`, `Merciless Gladiator's
Libram of Justice`). Checking the actual committed file,
`data/pools/ret.json` currently ships **28 entries** with
`source.kind == "pvp"`, split `via: "arena"` and `via: "honor"`, covering
chest, feet, hands, head, legs, ranged, shoulder, waist, weapon, and wrist.

**Recommendation: keep PvP gear, but as a separate bucket from the raid
universe, not merged into "this phase's raid loot."** Reasoning:

- PvP gear does not come from a raid zone, so folding it into the "raid
  shopping list" framing (parent plan §1, "what should I want to drop
  tonight") would misdescribe where it comes from. The `ItemSource` model
  already has a distinct `pvp` kind for exactly this reason.
- It is already real, already in the shipped pool, and removing it would cut
  28 working entries for no measured problem with them. The current
  committed pool proves the `pvp` source kind and hand-list approach already
  works end to end.
- "Separate bucket" here means: kept in the same pool file, tagged with
  `source.kind: "pvp"` as today, and given its own view/filter at rank time
  (the parent plan already plans a raid view filter using the `source`
  field — the same mechanism extends to a PvP view for free). It does not
  mean a second file or a second pipeline.

**What breaks if PvP gear is excluded instead:** 28 already-working entries
are cut, including gear that is currently the only option in some slots (for
example, the arena weapons). If PvP gear is instead merged into the raid
universe without a distinct source tag, the "membership is explainable as
drops from these raids" success criterion (parent plan S1) becomes false for
28 items, which is a regression against a stated success criterion.

---

## Decision 4: quality floor

**Question:** should eligibility require rare and above everywhere, or
require epic only at later phases?

**Measured, using the same D7 eligibility rule but without the quality
filter, restricted to items whose zone resolves inside the nine target raid
zones, per maxPhase (union policy from decision 1):**

| maxPhase | Zone-scoped items, any quality | quality == 3 (rare) | quality >= 4 (epic+) |
|---|---|---|---|
| 1 | 118 | 0 | 118 |
| 2 | 201 | 0 | 201 |
| 3 | 310 | 0 | 310 |
| 4 | 355 | 0 | 355 |
| 5 | 410 | 0 | 410 |

**Zero rare-quality items exist inside the nine target raid zones at any
maxPhase.** Every item dropped by these nine raids that passes D7 eligibility
is already epic or better.

To understand why, the check was widened: across the entire 4,212-item D7-
eligible set (any zone, any phase), 1,745 items are rare quality. Of those,
1,728 are phase 1 and the rest (16 items, phase 5) resolve to zone ID 4131,
which is **Magisters' Terrace**, a 5-player heroic dungeon, not a raid. None
of the nine target raid zones contributes a single rare-quality D7-eligible
item.

**Recommendation: keep the rare-plus floor as currently written (no change
needed), and do not add an epic-only rule for later phases.** Reasoning: the
floor is already inert for the raid-zone universe — it excludes zero items
there — so tightening it to epic-only would be a no-op inside raids and would
only risk cutting non-raid sources later (badges, PvP, tier-token
substitutes) if any of those turn out to be rare quality, which has not been
checked here since badge and PvP items are not in `db.json` at all (decisions
2 and 3). Loosening it below rare (to uncommon) was not asked for and is out
of scope for this decision.

**What breaks if epic-only is chosen instead:** nothing measurable changes
for the raid loot universe itself, since it is already all-epic. The risk is
entirely on the sources this decision cannot see from `db.json` — if a badge
or PvP item some phase's hand list needs turns out to be rare quality, an
epic-only rule would silently drop it. Since that cannot be checked here, the
safer default is to leave the floor at rare and revisit if a specific rare
item is found to matter.

---

## Summary table

| # | Decision | Recommendation | Confidence basis |
|---|---|---|---|
| 1 | Carryover | Union (all raids at or below maxPhase) | Newest-only produces zero-candidate slots at maxPhase 4 and 5, measured above |
| 2 | Badge vendors | Include, via a hand-authored source list (same pattern as tier tokens) | `db.json` has no badge source data at all; existing 4 badge entries already work |
| 3 | PvP gear | Include, tagged `source.kind: "pvp"`, shown as a separate view | `db.json` has no PvP source data at all; 28 entries already shipped and working |
| 4 | Quality floor | Keep rare-plus; no epic-only rule | Zero rare items exist in the raid-zone universe at any phase, so the floor is currently a no-op there |

## What this sub-phase did not measure

- Whether AtlasLoot (sub-phase 1) changes any of these numbers once it fills
  the 2,769-item zone-resolution gap. All figures above are lower bounds on
  the `db.json`-only universe.
- A complete list of which specific items are badge- or PvP-sourced beyond
  what is already hand-authored in `curate_ret_pool.py`. That requires a new
  source (Wowhead vendor lists or similar), not `db.json`.
- Tier token zones — covered by sub-phase 2, not this one.
