# 10 — baseline offset attribution (iteration 10)

Subagent `10-baseline-offset`. Read-only on production source and `data/`. All
throwaway artefacts under `.scratch/set-bonus-value/loop-103-106/` (sim dir
`sims-10/`). Branch `feat/set-bonus-value` unchanged, nothing committed, nothing
under `packages/` or `data/` modified.

## What I was asked

1. **Part 1** — leaf-level diff of the owner's exported package payload against
   our `PKG_UIMIGRATE` payload; price whatever differs.
2. **Part 2** — attribute the 25.78 DPS absolute baseline offset. Candidates in
   the director's priority order: (1) Ahune item stat resolution vs wowhead,
   (2) ring enchants 2929, (3) build drift.
3. **Part 3** — bound the conclusion; state whether anything found also moves
   the 4.82 package gap. Do not manufacture a closing story.

## Headline

**Nothing in the inputs is wrong.** Both directed candidates are eliminated by
measurement, the payloads are identical, and two long-open settings leads are
now priced at exactly zero.

The substantive result is structural rather than attributive, and it **reframes
the two open quantities as one**: the offset is **+25.78 on the baseline arm and
+20.96 on the package arm**. It is neither constant (which would cancel in
deltas) nor proportional. "The 4.82 package gap" and "the 25.78 baseline offset"
are not two discrepancies — they are one arm-dependent offset measured at two
points, and 4.82 is exactly the amount it shrinks.

I also found an **error in iteration 09's error bars**: they used a
per-iteration stdev of 126.4 where the sim actually reports **74.78**. Correcting
it makes the package gap **more** significant, not less (z 2.8 → **3.8**).

## Part 1 — leaf-level payload diff: IDENTICAL

The owner's exported package payload
(`owner-web-results-2026-08-11.md` step 2) against our
`uigems-arms/PKG_UIMIGRATE.req.json`, built by iteration 08's
`build-uigems-arms.ts`:

```
python -c "
import json
u=json.load(open('.scratch/set-bonus-value/loop-103-106/uigems-arms/PKG_UIMIGRATE.req.json'))['raid']['parties'][0]['players'][0]['equipment']['items']
owner=[ ...the 17 slots pasted verbatim from owner-web-results-2026-08-11.md... ]
def norm(d): return {'id':d.get('id',0),'enchant':d.get('enchant',0),'gems':tuple(d.get('gems',[]))}
diffs=0
for i,(a,b) in enumerate(zip(u,owner)):
    if norm(a)!=norm(b): diffs+=1; print('slot',i,'OURS',json.dumps(a),'| OWNER',json.dumps(b))
print('DIFFS',diffs)"
```

```
len ours 17 owner 17
DIFFS 0
```

Our payload dumped slot by slot, for the record:

```
0 {"id": 8345, "enchant": 3003}
1 {"id": 278827}
2 {"id": 31048, "enchant": 2986, "gems": [24028, 24028]}
3 {"id": 278819, "enchant": 368}
4 {"id": 31042, "enchant": 2661, "gems": [24028, 24028, 24028]}
5 {"id": 29966, "enchant": 2647, "gems": [24028]}
6 {"id": 31034, "enchant": 2564, "gems": [0]}
7 {"id": 29247}
8 {"id": 31044, "enchant": 3012, "gems": [24028]}
9 {"id": 28545, "enchant": 2939, "gems": [24028, 24058]}
10 {"id": 30834, "enchant": 2929}
11 {"id": 30052, "enchant": 2929}
12 {"id": 28034}
13 {"id": 29383}
14 {"id": 28658, "enchant": 2670}
15 {}
16 {"id": 29390}
```

**Byte-identical, slot for slot, in the same order** — every id, every enchant,
every gem, including the empty gloves socket `[0]` on 31034 and the empty slot
15. Not "identical modulo ordering": identical outright.

**This localizes the 4.82 to the engine/build rather than the inputs**, exactly
as the director's brief anticipated for this branch. There is nothing to price
because nothing differs.

## Part 2 — attributing the 25.78

### Candidate 1 — Ahune item stat resolution: ELIMINATED

Our pinned db (`vendor/wowsims/db.json`):

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
byid={i['id']:i for i in db['items']}
for iid in (278827,278819): print(json.dumps(byid[iid],indent=1))"
```

```
278827 Amulet of Bitter Hatred    ilvl 128 quality 4 phase 2
       stats {"1":22, "2":20, "17":48, "18":48, "20":20}
278819 The Frost Lord's War Cloak ilvl 128 quality 4 phase 2 armorType 1
       stats {"1":25, "2":24, "17":56, "18":56, "31":108}
```

Stat indices anchored empirically off gems whose stats are known, rather than
assumed:

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
for g in db['gems']:
    if g['id'] in (24028,24058,32194,32409):
        print('GEM',g['id'],g['name'],[(i,v) for i,v in enumerate(g['stats']) if v])"
```

```
GEM 24028 Delicate Living Ruby          [(1, 8)]
GEM 24058 Inscribed Noble Topaz         [(0, 4), (21, 4)]
GEM 32194 Delicate Crimson Spinel       [(1, 10)]
GEM 32409 Relentless Earthstorm Diamond [(1, 12)]
```

Delicate = +8 agility → index **1 = agility**; Inscribed Noble Topaz = +4 str
/+4 crit → **0 = strength**, **21 = crit rating**. Index 2 = stamina, 17/18 =
melee/ranged AP, 20 = hit rating, 31 = armor, confirmed against known items
(28034 Hourglass of the Unraveller is `{'21': 32}` = its +32 crit; 28545
Edgewalker Longboots `{'31': 250}` armor).

Wowhead, fetched from the owner's own links (the `?xml` and nether tooltip
endpoints — the plain HTML page renders stats via JS and returns nothing):

```
WebFetch https://www.wowhead.com/tbc/item=278827?xml
WebFetch https://nether.wowhead.com/tbc/tooltip/item/278819
```

278827 raw:
```
<level>128</level>  <quality id="4">Epic</quality>
<span><!--stat3-->+22 Agility</span>
<span><!--stat7-->+20 Stamina</span>
Equip: Improves hit rating by <!--rtg31-->20.
Equip: Increases attack power by 48.
jsonEquip: "agi":22,"mleatkpwr":48,"mlehitrtng":20,"reqlevel":70,
           "rgdatkpwr":48,"rgdhitrtng":20,"slotbak":2,"sta":20
```

278819 raw:
```
Item Level <!--ilvl-->128   class="q4"  Back
<span><!--amr-->108 Armor</span>
<span><!--stat3-->+25 Agility</span>
<span><!--stat7-->+24 Stamina</span>
Equip: Increases attack power by 56.
```

**Side by side:**

| 278827 Amulet of Bitter Hatred | ours | wowhead | |
|---|---|---|---|
| item level | 128 | 128 | match |
| quality | 4 (epic) | 4 (epic) | match |
| agility | 22 | 22 | match |
| stamina | 20 | 20 | match |
| melee attack power | 48 | 48 | match |
| ranged attack power | 48 | 48 | match |
| melee hit rating | 20 | 20 | match |

| 278819 The Frost Lord's War Cloak | ours | wowhead | |
|---|---|---|---|
| item level | 128 | 128 | match |
| quality | 4 (epic) | 4 (epic) | match |
| agility | 25 | 25 | match |
| stamina | 24 | 24 | match |
| melee attack power | 56 | 56 | match |
| ranged attack power | 56 | 56 | match |
| armor | 108 | 108 | match |

**Every leaf matches.** The director's leading candidate is dead: there is no
stat difference to force, so the "sim our baseline with the Ahune slots forced
to wowhead values" experiment has a null input and was not run. This also
re-confirms iteration 07's falsification of ticket 108 against an **external**
source rather than only against the db itself.

### Candidate 2 — ring enchants 2929: ELIMINATED

Our baseline payload does carry them, and the character has the profession:

```
python -c "
import json
b=json.load(open('.scratch/set-bonus-value/loop-103-106/uigems-arms/OWNER2_BASE.req.json'))
p=b['raid']['parties'][0]['players'][0]
print('rings:', json.dumps(p['equipment']['items'][10]), json.dumps(p['equipment']['items'][11]))
print('prof1',p.get('profession1'),'prof2',p.get('profession2'))"
```

```
rings: {"id": 30834, "enchant": 2929} {"id": 30052, "enchant": 2929}
prof1 Engineering prof2 Enchanting
```

Whether the **sim honors them** is the part that needed measuring, not reading.
`base-variants/` + `sim_base_variants.py`, pinned CLI v0.0.101, seeds
[11,22,33,44,55] @ 3000 iters:

```
python .scratch/set-bonus-value/loop-103-106/sim_base_variants.py
```

```
CLI=C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\wowsimcli-v0.0.101-win32-x64\wowsimcli-windows.exe
  B0_BASE                 2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82
  B1_NORINGENCH           2208.23   2208.22   2208.10   2208.18   2208.28   mean=  2208.20
  B2_NOENCHPROF           2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82

  B0_BASE =   2219.82   (07/08 measured 2219.82)
  B1_NORINGENCH          delta vs B0 =   -11.62   per-seed ['-11.62','-11.62','-11.62','-11.62','-11.62']
  B2_NOENCHPROF          delta vs B0 =    +0.00   per-seed ['0.00','0.00','0.00','0.00','0.00']
```

- `B0_BASE` reproduces 2219.82 exactly — **third independent reproduction** of
  the baseline, harness validated.
- The enchants **are** honored: removing them costs **−11.62** (07 measured
  +11.59 building up from the other side; agreement to 0.03).
- The sim does **not** gate them on the Enchanting profession (`B2` = +0.00),
  which is worth recording but is not a discrepancy channel here since the owner
  has the profession anyway.

Critically, the sign is wrong for this to be the offset: the enchants are
**already applied on our side**, so they can only make us higher, not the 25.78
lower that we are. Candidate 2 cannot explain an offset in this direction.

### Two long-open settings leads, now priced at exactly zero

The `consumables.drumsId` double-drums question and `canCrush` have been carried
as "unpriced" since iteration 06. Both are in our request and neither has a
counterpart in the owner's export format, so both are live offset candidates.
`base-variants2/` + `sim_settings_variants.py`, same CLI/seeds/iters:

```
python .scratch/set-bonus-value/loop-103-106/sim_settings_variants.py
```

```
  C0_BASE                 2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82
  C1_NODRUMSID            2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82
  C2_NOCRUSH              2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82
  C3_BOTH                 2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82

  C1_NODRUMSID           delta vs B0 =    +0.00
  C2_NOCRUSH             delta vs B0 =    +0.00
  C3_BOTH                delta vs B0 =    +0.00
```

**Bit-identical per seed** in all four arms. `drumsId` atop a party-level
`drums` is ignored, and `canCrush` is inert against this target. Both leads are
**dead**, and the loop can stop carrying them.

### Iteration count: worth ~+1.3, not 25.78

The owner ran 12500 iterations; we run 3000×5. Sweeping the baseline on seed 11:

```
python -c "... iterations in (3000,12500,25000), seed 11, pinned CLI ..."
```

```
iters=  3000  avg=2219.84  stdev=74.77
iters= 12500  avg=2220.98  stdev=73.99
iters= 25000  avg=2221.12  stdev=74.37
```

Iteration count moves our baseline **+1.30** going to the owner's 12500 and
**+1.28** at 25000 (converged). So ~5% of the offset, at most, is iteration
count. It is not the mechanism, but it is a real small term and should be
carried rather than rounded away.

### An error in iteration 09's error bars

09 used a per-iteration stdev of **126.4**, sourced as
`sims-08/.../OWNER2_BASE-11.json` `raidMetrics.dps.stdev`. Reading that field
directly:

```
python -c "
import json
for tag in ('OWNER2_BASE','PKG_PROD','PKG_UIMIGRATE'):
    d=json.load(open(f'.scratch/set-bonus-value/loop-103-106/sims-08/simplerot/{tag}-11.json'))
    print(tag, {k:round(v,3) for k,v in d['raidMetrics']['dps'].items() if isinstance(v,(int,float))})"
```

```
OWNER2_BASE   {'avg': 2219.843, 'stdev': 74.775, 'max': 2457.125, 'min': 1969.253}
PKG_PROD      {'avg': 2333.094, 'stdev': 76.222, 'max': 2638.180, 'min': 2084.103}
PKG_UIMIGRATE {'avg': 2322.710, 'stdev': 75.757, 'max': 2613.432, 'min': 2080.840}
```

The field is **74.775**, not 126.4. I could not reproduce 126.4 from any dps
stdev in that file. Correcting it:

```
python -c "... SE arithmetic with stdev 74.775/75.757 at n=15000 ..."
```

```
owner delta 98.17 SE 0.936
engine delta 102.99 SE 0.869
PACKAGE GAP 4.82  SE 1.277  z=3.77   95% CI 2.32 .. 7.32
BASELINE OFFSET 25.78  SE 0.894  z=28.84
```

| quantity | 09's figure | corrected |
|---|---|---|
| package gap | 4.82 ± 1.73, z = 2.8 | **4.82 ± 1.28, z = 3.8** |
| baseline offset | 25.78, z = 21.1 | **25.78, z = 28.8** |

The correction **strengthens** both. 09's qualitative verdicts are unaffected
(the package gap still does not close; the offset is still real), and its helm
A/B z = 1.3 conclusion is if anything more robust since a smaller SE there still
leaves 2.08 within ~1.8 SE. **I am not claiming 09's conclusions were wrong** —
only that its error bars were conservative by ~1.7× and the true significance is
higher.

## Part 3 — the bounded conclusion

### The two quantities are one quantity

This is the finding that matters, and it falls straight out of the arithmetic
once both arms are put side by side:

```
python -c "
ob,op=2245.60,2343.77   # owner baseline, owner package
eb,ep=2219.82,2322.81   # ours
print('baseline offset', ob-eb); print('package  offset', op-ep)
print('difference     ', (op-ep)-(ob-eb))"
```

```
baseline offset (owner-ours): +25.78
package  offset (owner-ours): +20.96
  difference of offsets      : -4.82
```

| arm | owner | ours | absolute offset | relative offset |
|---|---|---|---|---|
| baseline | 2245.60 | 2219.82 | **+25.78** | +1.161% |
| package | 2343.77 | 2322.81 | **+20.96** | +0.902% |

The offset is **neither constant nor proportional**:

- **Constant** would mean 25.78 in both arms. It is not — it shrinks by 4.82.
- **Proportional** would mean equal percentages. It is not — 1.161% vs 0.902%
  (this is 09's finding, that scaling makes the residual *worse*, restated from
  the other direction).

**So "the 4.82 package gap" and "the 25.78 baseline offset" are not two
independent discrepancies. They are one arm-dependent offset sampled at two
points, and 4.82 is precisely the amount by which it shrinks between them.**
09 concluded the two were "distinct"; on this arithmetic they are better read as
**coupled** — the same unknown, differenced. This does not close either one, but
it means a single mechanism can account for both, and any future candidate must
explain an offset that is *smaller on the arm carrying T6 4pc* rather than two
unrelated stories.

### Does the offset cancel in deltas?

**No — and this is the practically important half of the answer.** The tempting
disposition, that a known absolute offset cancels when you take differences, is
**falsified by measurement here**: if it cancelled, the package deltas would
agree, and they disagree by exactly the 4.82. The offset survives differencing
at ~19% of its magnitude.

The honest framing for downstream consumers: our engine sits **~1% low against
the wowsims web alpha on this character**, and that ~1% does **not** fully
cancel in a delta — roughly **80% of it cancels and 20% does not**, on the one
package comparison where we have like-for-like arms at both ends. With n = 2
points I cannot say whether the 80/20 split generalises, and I am not going to
extrapolate it.

### Did anything found move the 4.82?

**No.** Every candidate tested came back null or wrong-signed:

| candidate | result | moves 4.82? |
|---|---|---|
| package payload leaf diff | **identical**, 0 diffs | no — nothing to price |
| Ahune 278827/278819 vs wowhead | **every leaf matches** | no |
| ring enchants 2929 | present, honored (−11.62 to remove), wrong sign | no |
| `consumables.drumsId` double drums | **+0.00**, bit-identical | no |
| `canCrush` | **+0.00**, bit-identical | no |
| iteration count | +1.30 on the baseline | ~1.3 of the 25.78; ~0 of the 4.82 |

The 4.82 is **unchanged** by this iteration. What changed is its error bar
(±1.73 → ±1.28, z 2.8 → 3.8) and its interpretation (coupled to the offset
rather than distinct from it).

### What is attributed, and what is not

**Attributed: ~1.3 of 25.78 (5%)** — iteration count, measured.

**Not attributed: ~24.5 of 25.78 (95%).** With the payload proven identical and
every representable input difference now priced at zero or matched against an
external source, the inputs are exhausted. Both engines receive the same
equipment, the same buffs, the same encounter, the same rotation, and resolve
the same item stats.

**That leaves build drift** — candidate 3 — as the residual explanation by
elimination. Per the director's instruction I will say plainly what its status
is rather than asserting it: **it is not testable from our side.** The web is an
unversioned alpha ("tbc new", no version number in the footer per the owner's
step 0); ours is pinned wowsimcli v0.0.101 at commit `8aa378b`. We cannot diff a
build we cannot identify. Calling it "build drift" is a **hypothesis reached by
elimination**, not a measurement, and elimination is weaker evidence than this
loop has been holding itself to — iteration 08 explicitly declined to attach the
residue to the most convenient candidate, and the same discipline applies here.

An arm-dependent offset is at least **consistent** with a Go-side combat-model
difference (the arms differ in set bonuses — Malorne 2pc broken, Thunderheart
4pc gained, confirmed unchanged from 08's check below) in a way a flat data
difference is not, since a data difference would tend to move both arms
together. That is a **hypothesis** and I did not test it; naming it is meant to
point the next iteration, not to close anything.

```
python -c "... set membership of the two arms ..."
BASE {'Malorne Harness': (2, [29100, 29096])}
PKG  {'Thunderheart Harness': (4, [31048, 31042, 31034, 31044])}
```

### What would settle it, in decreasing order of strength

1. **The web build string / commit.** Without it, candidate 3 is permanently
   unfalsifiable, and this loop cannot progress past elimination. This is now
   the single highest-value artifact — it was already asked for at iteration 07
   (Ahune) and 08 (equip semantics) and remains unanswered; it is now
   **load-bearing** rather than merely nice to have.
2. **A third like-for-like arm pair from the web** — any gear change touching
   neither neck/back nor a set bonus, run on both sides. Two points cannot
   distinguish "offset shrinks with T6 4pc" from "offset shrinks with DPS"; a
   third would. This is a cheap ask of the owner and directly tests the coupling
   claim above.
3. **A web run with the set bonus deliberately broken** (e.g. 3 of the 4 T6
   pieces). If the offset returns to ~25.78 that implicates set-bonus handling;
   if it tracks DPS it implicates something scaling.

## Conclusion

- **Part 1: the payloads are identical.** 17/17 slots, every id, enchant and gem,
  same order, including the empty gloves socket. The 4.82 is **localized to the
  engine/build, not the inputs.**
- **Part 2: both directed candidates are eliminated.** The Ahune items match
  wowhead leaf for leaf (ilvl 128, 22/20/48/48/20 and 25/24/56/56/108). The ring
  enchants are present, honored at −11.62, and wrong-signed for this offset.
  Two long-open settings leads (`drumsId`, `canCrush`) are now priced at exactly
  **+0.00** and can be closed.
- **~1.3 DPS (5%) of the 25.78 is attributed** — iteration count. **~24.5 (95%)
  is not**, and build drift is a hypothesis by elimination, **not testable from
  our side** without the web build string.
- **The 4.82 did not move**, but its error bar tightened (z 2.8 → **3.8**) after
  correcting iteration 09's stdev from 126.4 to the sim's actual **74.78**.
- **The headline reframing**: the offset is **+25.78 baseline / +20.96 package**
  — neither constant nor proportional. The two open quantities are **one
  arm-dependent offset**, and it does **not** cleanly cancel in deltas: ~80%
  cancels, ~20% does not. Treating the offset as a "known constant that cancels"
  would be wrong on this data.

I am deliberately **not** closing anything. Three named quantities remain open
(the ~24.5 unattributed offset, the 4.82, and whether the coupling generalises),
and the decisive evidence for all three is the same artifact we do not have.

## Artefacts

- `base-variants/`, `base-variants2/` — request payloads
- `sim_base_variants.py`, `sim_settings_variants.py` — harnesses
- `sim_base_variants.stdout.log`, `sim_settings_variants.stdout.log`
- `sims-10/`, `sims-10/settings/`, `sims-10/iters/` — per-seed requests +
  results, `per-seed.json`
