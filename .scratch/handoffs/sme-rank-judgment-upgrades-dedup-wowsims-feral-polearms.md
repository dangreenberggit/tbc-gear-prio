# SME rank judgment — should polearms be feral cat pool members?

Ticket: upgrades-dedup-wowsims (borrow the fork's `canEquipItem` instead of the
hand mirror). Branch `feat/upgrades-dedup-wowsims`. Audience: engineering team.

## Verdict

**trust-with-caveats — answer B.** Excluding polearms from the feral cat pool is
a correct domain call, not an error in the hand mirror. Keep exactly one named
policy exclusion (`FERAL_POLEARM_POLICY`) and let feral's universe stay
byte-identical. The caveats are in "Confidence and caveats" below: the
justification rests on TBC itemisation as it stands in the pinned db, and the
exclusion should be written so it is cheap to delete if that ever changes.

## What was reviewed

The question, not a rank report: whether weaponType 6 (Polearm) belongs in the
feral cat DPS upgrade universe for TBC phases 1-5.

Inputs judged:

- `vendor/wowsims/db.json` (pinned) — weapon types, and the fork's capability
  table saying druids can equip polearms.
- `data/items/index.json` — the 42-slot `stats` array for every candidate.
- The 39 druid-equippable, quality>=3 polearms supplied in the task prompt.

Stat indices were derived empirically, not recalled. Cursed Vision of Sargeras
(id 32235) reads `[(1,39),(2,46),(17,108),(18,108),(20,21),(21,38)]` and is
known to be 39 Agi / 46 Sta / 108 AP / 21 hit / 38 crit, which fixes index 1 =
Agility, 2 = Stamina, 17 = attack power, 20 = hit, 21 = crit; index 0 =
Strength and index 19 = feral attack power follow from Pillar of Ferocity and
Earthwarden below.

Command that read every stat line quoted here:

```
python -c "
import json
d=json.load(open('data/items/index.json'))
for iid in IDS:
    it=d[iid]
    print(iid, it['name'], [(i,v) for i,v in enumerate(it['stats']) if v])
"
```

## Findings

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| F1 | The two canonical "famous feral polearms" are not polearms. Earthwarden id 29171 is `weaponType 4` (Mace); Pillar of Ferocity id 30883 is `weaponType 8` (Staff). | Info — confirms the prompt's cite-check | Read from `vendor/wowsims/db.json`; both also `handType 4`. |
| F2 | **No polearm in the game carries feral attack power.** Exactly 49 items in `data/items/index.json` have a nonzero index-19 (feral AP) value, and they split `weaponType 4` (Mace) 10 and `weaponType 8` (Staff) 39. Polearms: zero. | **High — this is the decisive fact** | `python -c "...; byt={}; [byt.setdefault(it['weaponType'],0) ...] for items where stats[19]"` → `{4: 10, 8: 39}`. |
| F3 | The best polearm loses to a same-phase feral staff by a margin no ranking is going to reverse. Shivering Felspine (34183, p5): 52 Agi, 120 AP, 0 feral AP. Stanchion of Primal Instinct (34198, p5): 47 Str, 75 Agi, 50 Sta, **1197 feral AP**. Halberd of Desolation (32248, p3): 51 Agi, 57 Sta, 100 AP, 30 hit vs Pillar of Ferocity (30883, p3): 47 Str, 96 Sta, **1059 feral AP**. | High | Stat lines read from `data/items/index.json` as above. |
| F4 | The 39 are overwhelmingly not TBC-era cat itemisation. 30 of the 39 sit at `phase 1` in the db and most are vanilla-era drops (Blackhand Doomsaw 12583, Thunderstrike 17223, Barb of the Sand Reaver 21635, The Eye of Nerub 23039). Nine of them have a **completely empty stat array** — Glaive of the Pit 28774, Halberd of Smiting 19874, Darkspear 12802 / 30418, Pitchfork of Madness 19963, Thunderstrike 17223, Shadowstrike 17074, Chillpike 13148, The Needler 13060. For a polearm on a cat, where weapon damage is discarded entirely, an empty stat map really does mean nothing at all — this is the one item class where the skill's "empty stat line never means weak" caution does **not** rescue the item. | Medium | Stat arrays read as above. |
| F5 | Of the remaining stat-bearing polearms, the flavour is Strength-plate, not cat. Plasma Rat's Hyper-Scythe (28253): 42 Str, 45 Sta, 26 crit. Lantresor's Warblade (25603/25608): 42 Str, 27 Agi. Hellreaver (24044): 30 Str, 27 Sta, 25 crit. Trident of the Outcast Tribe (30830): 37 Str, 54 Sta, 36 hit. These are warrior/paladin quest and dungeon rewards. | Medium | Stat arrays read as above. |
| F6 | The existing arena-name filter removes only **4 of the 39**: Brutal Gladiator's Painsaw (35064), Vengeful Gladiator's Painsaw (33727), Merciless Gladiator's Painsaw (32025), Gladiator's Painsaw (28300). It does **not** match "Grand Marshal's" or "High Warlord's", so Grand Marshal's Painsaw (28949), High Warlord's Painsaw (28923), High Warlord's Pig Sticker (18871), Grand Marshal's Glaive (18869) and Chancellor's Painsaw (32184) all survive into the pool. 35 of 39 would land in feral's universe. | Medium | Prefix match run against the four prefixes named in the task; result `arena-filtered: 4`. |
| F7 | Admitting the 39 would add roughly 35 entries to a universe of 228-486, i.e. a 7-15% inflation, every one of which is a weapon a cat provably cannot use well. Feral p5 currently carries 486 entries with 21 staves and 24 maces. | Low — sizing, not correctness | Universe histograms supplied in the task prompt; not independently re-run. |
| F8 | This is a cat-vs-bear distinction only in degree, not in direction. The mechanic (weapon is a stat stick, weapon damage discarded) and the itemisation gap (feral AP appears only on maces and staves) are identical for both forms, so the exclusion is right for bear too. Bear additionally wants the Armor value that Earthwarden and the feral staves carry (Earthwarden 500, Pillar 550) and no polearm has. | Info | `stats[31]` (Armor) read for 29171 and 30883. |

## The domain reasoning

In cat form a druid's weapon damage is discarded — the weapon is a pure stat
stick, so "can equip" and "is a sensible candidate" are genuinely different
questions, and the prompt is right that this needed a domain call.

The domain answer is that TBC's itemisation settled it. Blizzard put the feral
bonus — feral attack power, the stat that exists solely to make a stat-stick
weapon worth wearing — on staves and maces and on nothing else. That is not an
accident of the sample; it holds across all 49 items in the pinned db that carry
the stat (F2). A druid *can* equip a polearm, and there is no polearm that was
ever built for a druid to equip. The gap is not close: the best cat-flavoured
polearm in the game gives about 52 agility and 120 attack power, while its
same-phase staff competitor gives 1197 feral attack power on top of comparable
stats (F3).

Is "the sim will rank it low" sufficient? No, and this is the case where D5
stops applying. D5 earns its keep when the sim is doing an evaluation the
domain cannot do by hand — junk that *might* surprise you, close calls, items
whose value lives in a proc or a socket. Here the evaluation is already
finished before the sim runs: nine of the candidates have literally no stats at
all (F4), and for a cat, whose weapon damage is thrown away, that is a genuine
zero rather than the usual "value lives outside the stat map". Feeding a known
zero to a ranker to have it report zero is not letting the sim decide anything.

And presence in the list is itself the harm. This project already accepted that
principle at the prior F3 gate, ruling rating-gated arena gear out of a PvE pool
because a reader cannot act on it. Nine no-stat polearms and a run of Strength
plate quest rewards in a feral weapon list do not read as "correctly ranked
last" — they read as a bug in the tool, and they cost the reader trust in the
rows above them. The arena filter would not save the appearance either: it
catches only 4 of the 39 (F6).

## contested

`contested:` the plan (or its framing) treats the hand mirror's extra
strictness at weaponType 6 as a candidate **error** to be corrected by borrowing
the fork wholesale. It is not an error. The fork's `capabilities_auto_gen.ts` is
a **capability** table — it answers "can this class equip this", which is the
right question for the sim's gear picker and the wrong question for an upgrade
pool. Both statements are true at once: druids can equip polearms, and polearms
do not belong in a feral upgrade pool. Borrowing the fork's decision function is
still the right engineering move; it just does not subsume this one call.

## Paste-ready justification for `FERAL_POLEARM_POLICY`

> Druids can equip polearms, but TBC never itemised one for them: of the 49
> items carrying feral attack power, 39 are staves and 10 are maces, and no
> polearm carries any. In cat form the weapon is a pure stat stick — its damage
> is discarded — so a polearm with no feral attack power is not a low-ranked
> candidate, it is a non-candidate, and nine of the 39 druid-equippable
> polearms have an entirely empty stat line. They are excluded from the pool
> because their presence in a feral weapon list reads as a tool bug rather than
> as a correct last place.

## Confidence and caveats

- **High confidence** on F2, F3, F4, F5, F6 — every number was read from
  `data/items/index.json` or `vendor/wowsims/db.json` by the commands quoted
  above, not recalled.
- **Recalled, unverified**: that cat form discards weapon damage and uses the
  weapon as a stat stick; that feral attack power was TBC's designed vehicle for
  making a druid weapon competitive; that Painsaw / Pig Sticker / Warblade items
  are warrior-and-paladin-facing rewards. These are the mechanical premises the
  verdict sits on. The itemisation evidence (F2) is independent of them and
  points the same way, so the verdict survives even if a premise is imprecise.
- **Not independently verified**: the feral universe histograms in F7 were taken
  from the task prompt as given.
- The stat-index mapping was derived from one known item (32235) plus
  corroboration from 29171 and 30883. It is consistent across every item read
  here, but it is an inference, not a schema I found written down. No stat
  enum for these 42 slots appears in the repo (`grep -rn "STAT_AGILITY"`
  returns nothing).
- **The exclusion should be written to be cheap to delete.** It is a claim about
  TBC itemisation as the pinned db records it, scoped to phases 1-5. If a later
  phase or a db bump ever produces a polearm carrying feral attack power, the
  reasoning above inverts and the constant should go. A one-line test that fails
  when any `weaponType 6` item has nonzero feral AP would make that automatic,
  but that is an engineering call, not mine.
