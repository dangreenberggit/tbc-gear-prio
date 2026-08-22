# SME rank judgment — stage-2 close, three shortlists

Seat: SME (gate-sme), stage-gate run `stage-2-close-shortlist-box`.
Audience: engineering team (gate and bugs), not player loot advice.
Written: 2026-08-21.

## Reading order — declared

The input note asked that each character's findings table and verdict be
completed **before opening the next character's report**, in the fixed order
slamaltman → shredzepelin → nexess.

**I followed that order and I honoured it.** slamaltman's table and verdict
below were written to this file before I read any shredzepelin artifact, and
shredzepelin's were written before I read any nexess artifact. Where a later
character's finding is the *same* defect as an earlier one, I say so
explicitly rather than presenting it as an independent discovery — that
cross-calibration is real, and naming it is the point of the fixed order.

## What was reviewed

| character | spec | maxPhase | pool | above cutoff | baseline DPS | artifacts |
| --- | --- | --- | --- | --- | --- | --- |
| slamaltman | ret | 3 | 391 | 44 | 2003.0 | `.scratch/rank-reports/stage2-close-slamaltman.{html,json,stdout.txt}` |
| shredzepelin | feral | 2 | 228 | 14 | 2266.9 | `.scratch/rank-reports/stage2-close-shredzepelin.{html,json,stdout.txt}` |
| nexess | feral | 2 | 228 | 12 | 2302.5 | `.scratch/rank-reports/stage2-close-nexess.{html,json,stdout.txt}` |

Engine per `.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md`:
wowsims-tbc `v0.0.119`, commit `3267f8d`, binary sha256
`4b60235dcbb0088c9644ba464223fc9f65fcb3fccb2710cfc37fa3c752db97b1`. I did not
re-verify the digest; I read the provenance file as the note instructed.

Item facts below were read from repo data unless labelled **recalled,
unverified**. The two data sources used:

- `data/items/index.json` — slot, phase, stat line.
- `vendor/wowsims/db.json` — `type`, `armorType`, `weaponType`, `handType`,
  `classAllowlist`, `itemEffects`, `scalingOptions`. This file is present in
  this checkout (`ls -la vendor/wowsims/db.json`), though `vendor/` is
  gitignored, so a fresh worktree must run `pnpm sync:wowsims` first.

---

# 1. slamaltman (ret, p3)

## Findings

| # | finding | severity | evidence |
| --- | --- | --- | --- |
| S1 | The cutoff (3.4 DPS) is smaller than the typical per-row standard error (~2.18), so shortlist **membership at the boundary is not resolved by the measurement**. Rows #38–#44 (Δ3.25–4.53) are statistically indistinguishable from rows just below the line. Fifteen below-cutoff rows sit within 2·se of the cutoff, including Helm of the Illidari Shatterer (Δ2.85) and Band of Eternity (Δ2.77). | high | see command C1 below |
| S2 | Two rows are **kept above cutoff while their delta is below the nominal cutoff**: #43 Ring of Deceitful Intent (Δ3.28 vs cutoff 3.4) and #44 Lightbringer Breastplate (Δ3.25 vs 3.4). Either `belowCutoff` is decided on a quantity other than `deltaDps`, or the boundary is off by a row or two. This is a reproducible internal inconsistency in the artifact, not a noise complaint. | high | command C1; `ranking.cutoff.absDps` is 3.4 and both rows carry `belowCutoff: false` |
| S3 | Only **8 of 390 rows** use the low-variance `seMethod: "paired-replicate"` (se 0.02–1.57); the other 382 use `"independent"` with se ~2.18. The precise method covers exactly ranks 1–8. Everything from rank 9 down — the entire cutoff boundary and all the ordering the shortlist presents — is measured with the coarse method. | high | command C2 |
| S4 | Ranks #9–#44 are separated by gaps far smaller than their own se (e.g. #12 Δ14.38 vs #13 Δ14.37, se ~2.19). The transcript marks these `(tied)`, which is honest, but 36 of 44 rows carry the marker — below rank 8 this is an unordered bag presented as a ranking. | medium | `grep -c '(tied)' .scratch/rank-reports/stage2-close-slamaltman.stdout.txt` |
| S5 | One candidate was dropped by an **engine crash**, not by a game rule: candidate 30892 Beast-tamer's Shoulders panics with `interface conversion: *retribution.RetributionPaladin is not hunter.HunterAgent: missing method GetHunter` at `sim/hunter/item_sets.go:244`. The engine applies a hunter set-bonus item effect to a paladin. The item is mail (`armorType: 3`) with no `classAllowlist`, so a paladin equipping it is legal in game; the crash is an engine bug and the row is absent from the ranking rather than scored. | medium | `ranking.substitutions[0]`; item record via command C3 |
| S6 | **Weapon proficiency is not enforced.** Halberd of Desolation (32248) is a polearm (`weaponType: 6`) and is ranked at Δ-33.87. *Recalled, unverified: retribution paladins in TBC have no polearm proficiency* — paladin two-hand proficiencies are sword, mace and axe. I could find no paladin weapon-proficiency table anywhere in this repo to check against, so this finding rests on game knowledge, not on repo data. The row is far below cutoff so the shortlist itself is not corrupted, but the equip filter is leaking. | medium | command C4 |
| S7 | The hit-cap line reads "~23 rating under the hit cap" while the JSON carries `gap: 22.62` with `capUncertainty: 15.77` — the uncertainty is ~70% of the gap. The CLI's own follow-up ("The real shortfall could run either way") is correct, but the headline number is stated with a precision the data does not support. Separately `caps.expertise.capRating` is `null`, so no expertise cap is computed at all while `rating: 70` is still reported. | medium | command C5 |
| S8 | Cosmetic but user-visible: the transcript prints unrounded floats in the hit-gap annotations — "widening the gap above to 41.615397999999985" — on 14 rows. | low | `grep -c 'widening the gap above to 4' .scratch/rank-reports/stage2-close-slamaltman.stdout.txt` |

### Commands referenced above

```
# C1 — rows within 2*se of the cutoff, both sides
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-slamaltman.json'))['ranking'];cut=r['cutoff']['absDps'];print([(i['name'],round(i['deltaDps'],2),round(i.get('se') or 0,2),i['belowCutoff']) for i in r['items'] if abs(i['deltaDps']-cut)<2*(i.get('se') or 0)])"

# C2 — seMethod distribution and which ranks get the precise one
python -c "import json,collections;r=json.load(open('.scratch/rank-reports/stage2-close-slamaltman.json'))['ranking'];print(collections.Counter(i['seMethod'] for i in r['items']));print([(i['rank'],i['seMethod'],round(i['se'],3)) for i in r['items'][:10]])"

# C3 — the crashed candidate's item record
python -c "import json;db={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']};print(db[30892])"

# C4 — the polearm row
python -c "import json;db={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']};i=db[32248];print(i['name'],'weaponType',i['weaponType'],'handType',i['handType'],'classAllowlist',i.get('classAllowlist'))"

# C5 — caps block
python -c "import json;print(json.load(open('.scratch/rank-reports/stage2-close-slamaltman.json'))['ranking']['caps'])"
```

## Rows that look fine

The game-facing core of this shortlist is believable for a p3 ret paladin.

- **Every worn item scores exactly Δ0.00 and sits below cutoff** — all 16 of
  them. The basic in-game sanity check ("my own gear shown as an upgrade")
  passes cleanly:

  ```
  python -c "import json;d=json.load(open('test/fixtures/slamaltman.raw.json'));e=[x for x in d['combatant_info_events'] if x['sourceID']==11][0];worn=set(g['id'] for g in e['gear']);r=json.load(open('.scratch/rank-reports/stage2-close-slamaltman.json'))['ranking'];print([(i['name'],i['deltaDps'],i['belowCutoff']) for i in r['items'] if i['itemId'] in worn])"
  ```

- **The right actor was read.** The character is actor id 11 in report
  `VGjFb3mtX9xHgyav`; his `combatant_info` shows Crystalforge Breastplate
  (paladin-only, `classAllowlist: [2]`), Lionheart Executioner (two-hand
  sword) and Libram of Avengement in the ranged slot, with an empty off-hand.
  That is a coherent ret paladin and it matches the report's own `setBonuses`
  entry (Crystalforge Battlegear, `piecesWorn: 1`).

  Note for anyone re-checking: `combatant_info_events[0]` is a **different
  raider** — a warrior in T5 Destroyer Battlegear (`classAllowlist: [1]`)
  dual-wielding. Index 0 is not the subject, and reading it as such produces
  a false "wrong class gear" alarm. I made exactly that mistake first and
  withdrew it once I matched on `sourceID`.

- **Ranged slot is correct.** All four ranged-slot rows are librams; no bow or
  gun appears. Both ret-relevant librams (Avengement, worn; Righteous Power)
  are in the pool. Libram of Absolute Truth is absent but its
  `itemEffects[0].buffName` is "Reduced Holy Light Cost" — a healing relic,
  correctly excluded from a ret DPS pool.
- **All 17 weapon rows are two-handed** (`handType: 4`). No 1H or dual-wield
  contamination.
- **Armor types are legal.** The leather and mail rows (Cursed Vision of
  Sargeras, Shadowmaster's Boots, Bow-stitched Leggings, Forest Prowler's
  Helm) are all equippable by a paladin, who has no restriction against lower
  armor classes. The two Lightbringer (T6 paladin) rows carry
  `classAllowlist: [2]`, correctly.
- **The top of the list is game-plausible.** Belt of One-Hundred Deaths
  (BiS-tagged), Torch of the Damned and Cataclysm's Edge as the two largest
  weapon gains, and Band of Devastation / Cursed Vision of Sargeras inside the
  top six, are what a p3 ret in a mixed T5 set should see. These are also the
  rows carrying the precise se, so their ordering is genuinely supported.

## Verdict

`trust-with-caveats`

The game content is right: right character, right class rules, right slots,
worn gear behaves correctly, and the top eight rows are both plausible and
precisely measured. What I cannot endorse is the **boundary and the ordering
below rank 8**. The cutoff is smaller than the measurement error on the rows
it is cutting, two rows sit on the wrong side of their own stated cutoff (S2),
and 36 of 44 rows are self-declared ties. As a product gate: the top eight is
usable; the "44 above cutoff" figure is not a defensible set-membership claim.

## What evidence would have flipped this verdict

- **To `trust`:** the boundary rows re-measured with `paired-replicate` so
  that se at the cutoff is well under the 3.4 DPS cutoff, **plus** either a
  fix for S2 or documentation of why `belowCutoff` is decided on a quantity
  other than `deltaDps`. Fixing S2 alone would not be enough — S1 and S3
  would still leave the boundary inside the noise.
- **To `do-not-trust`:** a worn item appearing as a nonzero gain, a bow or gun
  in the ranged slot, a one-hand weapon ranked for a ret, or the polearm leak
  (S6) landing *above* the cutoff instead of at Δ-33.87. None of those
  happened.
- **On S6 specifically:** a paladin weapon-proficiency table in the repo
  showing polearms are permitted would retract that finding outright. I could
  not find such a table either way.

---

# 2. shredzepelin (feral, p2)

## Findings

| # | finding | severity | evidence |
| --- | --- | --- | --- |
| Z1 | **10 of the 14 shortlist rows are in slots the report itself declares unmeasured.** The run emits three `dead-slot` / `worn-unrankable` warnings (neck, back, waist) saying every row in those slots was scored against an *empty slot* rather than against the worn item. Ranks #2, #3, #5, #6, #7, #8, #9, #11, #12 and #14 are all in those three slots. Only four rows (#1 weapon, #4 legs, #10 trinket, #13 finger) are measured against real worn gear. The warnings are honest and prominent, but the shortlist is still presented as a 14-row ranking with those rows interleaved by delta, so the headline "14 above cutoff" overstates what was actually measured by better than 3x. | high | command Z-C1 |
| Z2 | Root cause of two of the three dead slots is an **item-ID range gap**. The worn neck (Amulet of Bitter Hatred) and back (The Frost Lord's War Cloak) have item IDs `278827` and `278819` — far outside the TBC range. All 11 such high-ID items in `db.json` are Ahune / Midsummer Fire Festival loot (Frostscythe of Lord Ahune, Icebound Cloak, Hailstone Pendant, Shroud of Winter's Chill, and others), and **none of them enters any pool in any of the three runs** (pool max itemId is 33058 for both feral runs, 34012 for ret). This is one systematic defect, not two coincidences: holiday-event loot is invisible to pool construction, so any character wearing a piece of it gets a permanently dead slot. | high | command Z-C2 |
| Z3 | The third dead slot has a **different** cause. The worn waist, Girdle of the Deathdealer (`29247`), is an ordinary phase-1 TBC leather belt present in *both* `data/items/index.json` and `db.json`, ilvl 110, with real feral stats (agi 28, str 28, AP 56/56, crit 20). It is a heroic-dungeon drop (`sources[0].drop.difficulty: 2`) and it is simply not in the candidate pool, while raid belts are. So the pool's inclusion bar drops heroic-dungeon loot even when it is the item the player is currently wearing — which is precisely when it must be present. Waist is also the most contaminated slot in the shortlist: 5 of the 14 rows. | high | command Z-C3 |
| Z4 | **Weapon proficiency is not enforced — same defect as slamaltman's S6, much larger here.** 17 of the 37 weapon rows are types a druid cannot use: daggers (`weaponType: 2`), fist weapons (`weaponType: 3`), and held-in-off-hand items (`weaponType: 5`, `handType: 3`, no weapon damage at all — Jewel of Infinite Possibilities, Fathomstone, Karaborian Talisman, Talisman of Nightbane, and others). *Recalled, unverified: TBC druid weapon proficiencies are staff, one- and two-hand mace, and polearm only.* The enum values themselves are read from repo data (`packages/core/src/proto/common_pb.ts`, `WeaponTypeDagger = 2`, `WeaponTypeFist = 3`). | medium | command Z-C4 |
| Z5 | Same statistical shape as slamaltman: **8 of 228 rows use `paired-replicate`** (se 0.14–0.56) and the other 220 use `independent` (se ~1.35). The precise method again covers exactly ranks 1–8. Here the cutoff is 3.6 DPS against se ~1.35, so the boundary is ~2.7 se out — tighter than slamaltman's, but rows #13 (Δ3.92) and #14 (Δ3.77) still sit within one se of the cutoff and cannot be separated from rows just below it. | medium | command Z-C5 |
| Z6 | Candidate items are priced with their **meta socket left empty** (`substitutions[0]`, `gems.meta-preference`: no meta preference recorded for feral), while worn gems are kept. This biases every meta-socketed candidate downward. Bounded in practice: only two pool rows have a meta socket (Nordrassil Headdress Δ-208.3, Stag-Helm of Malorne Δ-213.7), both helms, both already deeply negative from displacing Wolfshead Helm. It does not touch the shortlist, but the head slot's "no positive candidate" warning is partly self-inflicted. | medium | command Z-C6 |
| Z7 | Same hit-cap presentation issue as slamaltman (S7): the line reads "~17 rating under the hit cap" while `caps.hit.gap` is 16.92 with `capUncertainty` 15.77 — the uncertainty is 93% of the gap here, so "under the cap" is very nearly a coin flip, and the CLI's softener ("may be smaller than this") only points one way. `caps.expertise.capRating` is again `null` while `rating: 38` is reported. Unrounded floats appear in the transcript again ("36.923096999999984"). | medium | command Z-C7 |

### Commands referenced above

```
# Z-C1 — how many shortlist rows sit in a declared-unmeasured slot
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];dead=set(w['slot'] for w in r['plausibilityWarnings'] if w.get('cause')=='worn-unrankable');ab=[i for i in r['items'] if not i['belowCutoff']];print('dead',dead);print('contaminated',[(i['rank'],i['name'],i['slot']) for i in ab if i['slot'] in dead]);print('clean',[(i['rank'],i['name'],i['slot']) for i in ab if i['slot'] not in dead])"

# Z-C2 — high-ID (holiday) items and their total absence from every pool
python -c "import json;db=json.load(open('vendor/wowsims/db.json'))['items'];print([(i['id'],i['name']) for i in db if i['id']>100000])"
for f in slamaltman shredzepelin nexess; do python -c "import json;p=set(i['itemId'] for i in json.load(open('.scratch/rank-reports/stage2-close-$f.json'))['ranking']['items']);db=json.load(open('vendor/wowsims/db.json'))['items'];print('$f high-ID in pool:',[i['name'] for i in db if i['id']>100000 and i['id'] in p] or 'NONE','| pool max id',max(p))"; done

# Z-C3 — the worn waist exists in both data sources but is not in the pool
python -c "import json;db={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']};print(db[29247])"
python -c "import json;print(json.load(open('data/items/index.json'))['29247'])"
python -c "import json;p=set(i['itemId'] for i in json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking']['items']);print('29247 in pool:',29247 in p)"

# Z-C4 — weapon rows a druid cannot use
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];db={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']};w=[i for i in r['items'] if i['slot']=='weapon'];bad=[i for i in w if db.get(i['itemId'],{}).get('weaponType') in (2,3,5)];print(len(bad),'of',len(w));print('max delta among them',round(max(i['deltaDps'] for i in bad),2))"

# Z-C5 — seMethod split and cutoff-adjacent rows
python -c "import json,collections;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];print(collections.Counter(i['seMethod'] for i in r['items']));cut=r['cutoff']['absDps'];print([(i['rank'],i['name'],round(i['deltaDps'],2),round(i['se'],2)) for i in r['items'] if not i['belowCutoff'] and i['deltaDps']-cut < 2*i['se']])"

# Z-C6 — meta-socketed candidates
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];idx=json.load(open('data/items/index.json'));m=[i for i in r['items'] if 1 in (idx.get(str(i['itemId']),{}).get('sockets') or [])];print([(i['name'],round(i['deltaDps'],1)) for i in m])"

# Z-C7 — caps
python -c "import json;print(json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking']['caps'])"
```

## Rows that look fine

- **All 13 worn items score exactly Δ0.00 and sit below cutoff.** The
  self-swap sanity check passes, exactly as it did for slamaltman.
- **The right actor and a coherent feral cat set.** Shredzepelin is actor 21
  in report `YwahQLgv2jBrZGn6`, a Druid, wearing Wolfshead Helm, Mantle and
  Breastplate of Malorne (all `classAllowlist: [11]` = Druid),
  Terestian's Stranglestaff (two-hand staff) and Everbloom Idol in the relic
  slot. That is what a p2 feral cat looks like.
- **The relic slot is correct** — one `ranged` row, and it is an idol, not a
  bow or a libram.
- **The four measured rows are game-plausible.** Merciless Gladiator's Maul at
  the top is the well-known p2 feral weapon (a big two-hand mace is the right
  shape for cat DPS), and it carries the precise `se` of 0.56, so its lead is
  real. Leggings of Murderous Intent and Tsunami Talisman are both BiS-tagged
  and land where a feral would expect them.
- **The illegal weapon rows never reach the shortlist.** All 17 sit between
  Δ-243 and Δ-585 — the engine is pricing them as effectively "no weapon", so
  the leak is a pool-hygiene problem rather than a wrong-answer problem.
- **The three non-`worn-unrankable` warnings are good engineering.** The
  head / chest / shoulder "no positive candidate" notes correctly identify a
  unique effect (Wolfshead Helm) and a set-break toll (Malorne Harness) rather
  than silently showing an empty slot, and the `setBonuses` block quantifies
  the Nordrassil-vs-Malorne trade with its own `se`. That is the report doing
  the right thing.

## Verdict

`do-not-trust`

Not because the numbers are wrong — the engine looks like it computed exactly
what it was asked to — but because **the shortlist as presented is not usable
as a shortlist**. Ten of fourteen rows were scored against an empty slot, and
they are interleaved with the four real rows by delta, so a reader sorting by
Δ gets a ranking in which most entries do not mean what the column header
says. The report discloses this in prose above the table, which is why this is
a `do-not-trust` on the artifact rather than a correctness alarm on the
engine — but a gate cannot pass an output whose majority of rows carry "do not
read any of them as an upgrade or a loss".

The two pool gaps behind it (Z2 holiday-loot IDs, Z3 heroic-dungeon loot) are
both concrete and fixable, and Z2 in particular is a single class of bug
affecting every character who wears an event item.

`contested:` the input note's summary table states shredzepelin has
**14 above cutoff** and presents that as a figure comparable with the other
two characters. On the evidence above, only **4** of those 14 are measured
against the character's actual gear. The count is arithmetically correct
against `belowCutoff`, but it is not a count of usable rows, and the plan and
ticket should not carry it as one.

## What evidence would have flipped this verdict

- **To `trust-with-caveats`:** the three worn items added to their slots'
  candidate pools and the run repeated, so neck / back / waist are scored
  against real gear. That alone would move it, even with Z4–Z7 unfixed —
  those are hygiene and presentation, not correctness.
- **Also to `trust-with-caveats`:** if the report *suppressed* rows in
  `worn-unrankable` slots from the ranked list, or rendered them in a separate
  "unmeasured" block instead of interleaving them by delta, the remaining four
  rows would be a small but honest shortlist.
- **To `trust`:** the above, plus the boundary rows (#13, #14) re-measured
  with `paired-replicate`.
- **What would have kept it at `do-not-trust` even after a pool fix:** an
  illegal weapon (dagger, fist, off-hand) surfacing above the cutoff, or a
  worn item showing a nonzero delta. Neither happened.

---

# 3. nexess (feral, p2)

This is the healthiest of the three shortlists. Same engine, same pool, same
spec as shredzepelin, but the character happens to wear gear the pool can see,
and the difference in output quality is large.

## Findings

| # | finding | severity | evidence |
| --- | --- | --- | --- |
| N1 | **One dead slot: wrist.** The worn Shackles of Quagmirran (`27712`) is not in the candidate pool, so all three wrist rows (#3 Vambraces of Ending Δ17.68, #7 Veteran's Leather Bracers Δ10.79, #9 Shard-bound Bracers Δ10.27) were scored against an *empty wrist*, not against the worn bracers. Three of twelve rows are affected, including rank #3. This is the same class of defect as shredzepelin's Z1/Z3, at a quarter of the scale. | high | command N-C1 |
| N2 | N1's root cause is now **measured rather than inferred**, and it confirms Z3. Shackles of Quagmirran is a heroic-dungeon drop (`sources[0].drop.difficulty: 2`), present in both `data/items/index.json` and `db.json`. Counting the whole pool by drop difficulty: **177 items at difficulty 1 (normal/raid), exactly 1 item at difficulty 2 (heroic)**. Quality is *not* the filter — 9 quality-3 (blue) items are in the pool. So the pool systematically excludes heroic-dungeon loot, and any character wearing a heroic piece gets that slot silently deadened. Two of the three characters reviewed here hit it (shredzepelin's waist, nexess's wrist). | high | command N-C2 |
| N3 | Rank #12 Band of the Ranger-General (Δ4.81, se 1.43) sits 1.21 DPS above the 3.6 cutoff — **inside its own disclosed spread**. Six below-cutoff rows sit within 2·se on the other side (Pendant of the Perilous Δ3.38, Gloves of the Searing Grip Δ2.59, and others). So the last row of this shortlist is not separable from the first rows below it. Unlike slamaltman, this is a *single* ambiguous row rather than a whole ambiguous tail, and no row is kept on the wrong side of its own cutoff. | medium | command N-C3 |
| N4 | **Same weapon-proficiency leak as Z4**, identical magnitude: 17 of 37 weapon rows are daggers, fist weapons, or held-in-off-hand items a druid cannot use. All sit at Δ-248 or worse, so none reaches the shortlist. Reported here only to record that the leak is a property of the pool, not of one character. *Recalled, unverified: TBC druid weapon proficiencies are staff, one- and two-hand mace, and polearm only.* | medium | command N-C4 |
| N5 | **Same meta-socket substitution as Z6** (`gems.meta-preference`: no meta preference recorded for feral). Same bounded impact — it does not touch this shortlist, but it contributes to the head slot's "no positive candidate" warning. | medium | `ranking.substitutions[0]` in the nexess JSON |
| N6 | `caps.expertise` reports `rating: 0` with `capRating: null` and `gap: null` — no expertise cap is computed. Same gap as S7/Z7. Unrounded floats again in the transcript ("64.92309699999998"). Note that unlike the other two characters, the **hit-cap line here is sound**: `gap: 47.92` against `capUncertainty: 15.77`, so "~48 rating under the hit cap" is a claim the data actually supports. | low | command N-C5 |

### Commands referenced above

```
# N-C1 — dead slot and which shortlist rows it contaminates
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-nexess.json'))['ranking'];dead=set(w['slot'] for w in r['plausibilityWarnings'] if w.get('cause')=='worn-unrankable');ab=[i for i in r['items'] if not i['belowCutoff']];print('dead',dead);print('contaminated',[(i['rank'],i['name'],i['slot']) for i in ab if i['slot'] in dead]);print('clean',len([i for i in ab if i['slot'] not in dead]),'of',len(ab))"

# N-C2 — the pool excludes heroic-dungeon drops; quality is not the filter
python -c "import json,collections;db=json.load(open('vendor/wowsims/db.json'))['items'];pool=set(i['itemId'] for i in json.load(open('.scratch/rank-reports/stage2-close-nexess.json'))['ranking']['items']);q=collections.Counter(i['quality'] for i in db if i['id'] in pool);d=collections.Counter(tuple(sorted(set(x['drop'].get('difficulty') for x in (i.get('sources') or []) if 'drop' in x))) for i in db if i['id'] in pool);print('by quality',dict(q));print('by drop difficulty',dict(d))"
python -c "import json;db={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']};print(db[27712])"

# N-C3 — rows within 2*se of the cutoff, both sides
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-nexess.json'))['ranking'];cut=r['cutoff']['absDps'];print([(i.get('rank'),i['name'],round(i['deltaDps'],2),round(i['se'],2),i['belowCutoff']) for i in r['items'] if abs(i['deltaDps']-cut)<2*i['se']])"

# N-C4 — weapon rows a druid cannot use
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-nexess.json'))['ranking'];db={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']};w=[i for i in r['items'] if i['slot']=='weapon'];bad=[i for i in w if db.get(i['itemId'],{}).get('weaponType') in (2,3,5)];print(len(bad),'of',len(w),'max delta',round(max(i['deltaDps'] for i in bad),2))"

# N-C5 — caps
python -c "import json;print(json.load(open('.scratch/rank-reports/stage2-close-nexess.json'))['ranking']['caps'])"
```

## Rows that look fine

- **All 15 rankable worn items score exactly Δ0.00 and sit below cutoff.**
  The only worn item absent from the ranking is the wrist piece behind N1.
- **Nine of twelve rows are measured against real worn gear**, including the
  top two. That is the inverse of shredzepelin's ratio on an identical pool
  and spec.
- **Genuinely a different character, not a duplicated fixture.** Nexess is
  actor 5 in report `4C2fJrMvcjaXL3KN` (Fathom-Lord Karathress) and the worn
  set differs from shredzepelin's in neck, waist, legs, back, hands, both
  rings and both trinkets. Only the Malorne/Wolfshead/Stranglestaff/Everbloom
  core is shared, which is what two feral druids in the same guild would
  actually look like.
- **Better `se` coverage than the other two runs.** Seven of the twelve
  shortlist rows carry `paired-replicate` (se 0.19–1.02), and — unlike
  slamaltman and shredzepelin — the precise method is *not* simply ranks 1–8:
  rank 8 is `independent` while rank 9 is `paired-replicate`. Whatever selects
  the method is tracking something other than rank order here, which is worth
  an engineering look, but the effect is that most of this shortlist is
  well-measured.
- **The hit-cap annotation is sound for this character** — 47.9 gap against
  15.8 uncertainty, so the headline is supportable, in contrast to S7 and Z7.
- **Game-plausible content.** Merciless Gladiator's Maul on top (se 0.41),
  Belt of One-Hundred Deaths second, Telonicus's Pendant of Mayhem and
  Ancestral Ring of Conquest in the middle — all the right shape for a p2
  feral cat sitting well under the hit cap.
- **The head / chest / shoulder "no positive candidate" warnings** are the
  same well-formed unique-effect and set-break-toll notes as shredzepelin's,
  and the `setBonuses` block again quantifies the Nordrassil-vs-Malorne trade
  with its own `se`.

## Verdict

`trust-with-caveats`

Nine of twelve rows are measured against real gear, every worn item behaves
correctly, the top of the list is game-plausible and precisely measured, and
the one place the report is uncertain (wrist) it says so in plain language
before the table. The caveats are real and must be carried: **do not read the
three wrist rows at all** (that includes rank #3, the third-largest number on
the page), and treat rank #12 as inside the noise.

This is the same engine and the same pool that produced a `do-not-trust` for
shredzepelin. The difference is entirely in how much of the character's worn
gear the pool could see. That is the useful signal for the gate: output
quality here is a function of pool coverage of *worn* items, and it varies
per character on the same code.

## What evidence would have flipped this verdict

- **To `trust`:** Shackles of Quagmirran added to the wrist pool and the run
  repeated, so the three wrist rows are scored against real gear — plus rank
  #12 either re-measured with `paired-replicate` or dropped. The heroic-drop
  pool gap (N2) is the single fix that does the first part.
- **To `do-not-trust`:** if the contaminated share had been the majority, as
  it was for shredzepelin. Three of twelve with the top two rows clean is a
  caveat; ten of fourteen is a broken artifact. I applied the same standard to
  both and it separated them.
- **What did not move it:** N4 and N5. Illegal weapon rows at Δ-248 and an
  empty meta socket on two deeply-negative helms are pool hygiene, and neither
  changes a row a reader would act on.

---

# Summary across the three

| character | verdict | measured rows / shortlist rows |
| --- | --- | --- |
| slamaltman | `trust-with-caveats` | 44 / 44 slots measured, but only ranks 1–8 precisely |
| shredzepelin | `do-not-trust` | 4 / 14 |
| nexess | `trust-with-caveats` | 9 / 12 |

Three defects are shared by all three runs and are the highest-value
engineering targets, in order:

1. **Pool coverage of worn items.** Two independent gaps produce dead slots:
   holiday-event loot is invisible because its item IDs sit outside the TBC
   range (Z2 — no item with `id > 100000` enters any pool in any run), and
   heroic-dungeon drops are excluded wholesale (Z3/N2 — 177 pool items at
   drop difficulty 1, exactly 1 at difficulty 2). Between them these account
   for every `worn-unrankable` warning across all three characters, and they
   are the sole reason shredzepelin's shortlist is unusable while nexess's is
   not.
2. **`se` coverage of the cutoff boundary.** Only 8 rows per run get
   `paired-replicate`; the rest carry se ~1.35–2.18 against cutoffs of
   3.4–3.6. Boundary membership is therefore inside the noise in all three
   runs, and for slamaltman two rows are kept above a cutoff their own
   `deltaDps` sits below (S2).
3. **Equip-rule filtering.** The pool contains items the class cannot use — a
   polearm for the paladin, and 17 daggers / fist weapons / off-hand items for
   each druid. All rank far below cutoff, so no shortlist is corrupted today,
   but the filter is not enforcing weapon proficiency, and one candidate
   (Beast-tamer's Shoulders, S5) crashes the engine outright by applying a
   hunter set effect to a paladin.

A note on my own process, since the input note asked for it: I opened the
three reports in the required order and wrote each verdict before the next.
Reading them in sequence did calibrate me — nexess's `trust-with-caveats`
is explicitly graded against shredzepelin's `do-not-trust`, and I have said so
in nexess's verdict rather than pretending the two judgments were independent.
The three shared defects above were each found on the first character that
exhibited them and then confirmed by measurement on the others; N2 in
particular is stronger than Z3 because the second character let me count the
whole pool instead of citing one item.
