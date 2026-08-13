# 07 — corrected owner gear (iteration 7)

Subagent `07-corrected-gear`. Read-only on production source and `data/`. All
throwaway artefacts under `.scratch/set-bonus-value/loop-103-106/`. Branch
`feat/set-bonus-value`, nothing committed, no branch switch, nothing under
`packages/` or `data/` modified.

## What I was asked

1. **Part 1** — re-price the two decisive comparisons on the CORRECTED owner
   gear (`owner-settings-export-v2.json`), every arm built through the real
   `equipmentForCandidateSwap`, pinned wowsimcli v0.0.101, seeds [11,22,33,44,55]
   @ 3000 iters, under the owner's `TypeSimple` rotation. Verify (do not assume)
   whether the numbers land on iteration 06's "our gear under TypeSimple" column
   (+113.73 package, +6.75 helm gap). Report the corrected-gear baseline DPS.
2. **Part 2** — determine how ids **278827** / **278819** (the Ahune neck/back)
   resolve in our pinned db, what wowsims **web** would resolve them to, and
   whether the sim actually pays out their stats. Say plainly if the web side
   cannot be determined locally.
3. **Part 3** — state what residue remains against +97 / ~+10.

## Headline

| | corrected owner gear (v2) | our fixture | ground truth |
|---|---|---|---|
| baseline DPS (TypeSimple) | **2219.82** | 2202.38 | — |
| baseline DPS (our APL) | **2170.01** | 2152.13 | stored 2152.0998 |
| **(a) T6 4pc package** (TypeSimple) | **+113.42** | +113.73 | **+97** |
| **(b) CURSED − VENG** (TypeSimple) | **+8.61** | +6.75 | **~+10** |

Iteration 06's "our gear under TypeSimple" column **is** substantially the
corrected-gear answer, as the director hypothesised — but **not exactly**, and
the helm gap moves in the useful direction. The package figure is
indistinguishable (+113.42 vs +113.73). The helm gap is **+8.61, not +6.75** —
+1.86 higher, and materially closer to the owner's ~+10.

**Iteration 06's withdrawn owner-gear figures (+87.63 / +7.78) are replaced by
+113.42 / +8.61.** The package figure moved *away* from +97 (+87.63 → +113.42);
the helm figure moved *toward* ~+10 (+7.78 → +8.61).

**A third trim difference the director's diff did not list**: the owner's two
rings both carry `enchant: 2929` (Enchant Ring – Striking) and ours carry **no
ring enchant at all**. Worth +11.59 DPS on the baseline. It is not merely a
"swapped order" pair.

## Part 0 — verifying the corrected export

### v1 vs v2 identical apart from equipment

```
python -c "
import json
v1=json.load(open('.scratch/set-bonus-value/loop-103-106/owner-settings-export.json'))
v2=json.load(open('.scratch/set-bonus-value/loop-103-106/owner-settings-export-v2.json'))
def strip(d):
    d=json.loads(json.dumps(d)); d['player']['equipment']=None; return d
print('identical apart from equipment:', json.dumps(strip(v1),sort_keys=True)==json.dumps(strip(v2),sort_keys=True))
for i,(a,b) in enumerate(zip(v1['player']['equipment']['items'], v2['player']['equipment']['items'])):
    if a!=b: print(i,'v1',a,'| v2',b)
print('rotation type:', v2['player'].get('rotation',{}).get('type'))
"
```

Raw output:

```
identical apart from equipment: True
1 v1 {'id': 30017} | v2 {'id': 278827}
3 v1 {'id': 29994, 'enchant': 368} | v2 {'id': 278819, 'enchant': 368}
7 v1 {'id': 30106, 'gems': [24028, 30549]} | v2 {'id': 29247}
8 v1 {'id': 29995, 'enchant': 3012} | v2 {'id': 28741, 'enchant': 3012, 'gems': [24028, 24028, 24028]}
9 v1 {'id': 28545, 'enchant': 2939, 'gems': [24028, 24028]} | v2 {'id': 28545, 'enchant': 2939, 'gems': [24028, 24058]}
10 v1 {'id': 29997, 'enchant': 2929} | v2 {'id': 30834, 'enchant': 2929}
12 v1 {'id': 30627} | v2 {'id': 28034}
14 v1 {'id': 32014, 'enchant': 2670} | v2 {'id': 28658, 'enchant': 2670}
16 v1 {'id': 32387} | v2 {'id': 29390}
```

Confirms the director's claim exactly: v1/v2 differ **only** in equipment, and
the rotation is `TypeSimple` in both.

### v2 vs our composed baseline — the true diff, with a correction

```
python -c "
import json
v2=json.load(open('.scratch/set-bonus-value/loop-103-106/owner-settings-export-v2.json'))
base=json.load(open('.scratch/set-bonus-value/loop-103-106/owner-arms/OURS_BASE.req.json'))
ours=base['raid']['parties'][0]['players'][0]['equipment']['items']
own=v2['player']['equipment']['items']
for i,(a,b) in enumerate(zip(own,ours)):
    if a!=b: print(i,'DIFF','owner',a,'| ours',b)
"
```

Raw output:

```
2 DIFF owner {'id': 29100, 'enchant': 2986, 'gems': [24028, 24028]} | ours {'id': 29100, 'enchant': 2983, 'gems': [24028, 24028]}
9 DIFF owner {'id': 28545, 'enchant': 2939, 'gems': [24028, 24058]} | ours {'id': 28545, 'enchant': 2939, 'gems': [24028, 24028]}
10 DIFF owner {'id': 30834, 'enchant': 2929} | ours {'id': 30052}
11 DIFF owner {'id': 30052, 'enchant': 2929} | ours {'id': 30834}
```

15 of 17 slots identical by id, and slots 10/11 are the same two rings in
swapped order — the director's reading holds. **But the rings are not otherwise
identical**: the owner's carry `enchant: 2929`, ours carry none. So there are
**three** trim differences, not two:

| # | slot | owner | ours | resolved |
|---|---|---|---|---|
| T1 | 2 shoulder | enchant `2986` | `2983` | Greater Inscription of Vengeance (+30 AP, +30 crit-ish, +10) vs Inscription of Vengeance (+26/+26) |
| T2 | 9 feet | gems `[24028, 24058]` | `[24028, 24028]` | Inscribed Noble Topaz (+4 str, +4 crit) vs a 2nd Delicate Living Ruby (+8 agi) |
| T3 | 10+11 rings | both `enchant: 2929` | **no enchant** | Enchant Ring – Striking (+2 weapon damage, requires Enchanting) |

Enchant/gem/ring stat vectors read from the pinned db:

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
for e in db['enchants']:
    if e.get('effectId') in (2983,2986,2929): print('ENCH', json.dumps(e))
for g in db['gems']:
    if g['id'] in (24028,24058): print(g['id'], g['name'], g.get('color'), g.get('stats'))
byid={i['id']:i for i in db['items']}
for iid in (30052,30834):
    it=byid[iid]; print(iid, it['name'], list(it['scalingOptions'].values())[0]['stats'])
"
```

```
ENCH {"effectId": 2983, "itemId": 28885, "name": "Inscription of Vengeance", "stats": [.. idx17:26, idx18:26 ..], "quality": 2}
ENCH {"effectId": 2986, "itemId": 28888, "name": "Greater Inscription of Vengeance", "stats": [.. idx17:30, idx18:30, idx21:10 ..], "quality": 3}
ENCH {"effectId": 2929, "itemId": 22535, "name": "Enchant Ring - Striking", "stats": [.. idx41:2 ..], "quality": 1, "requiredProfession": 3}
24028 Delicate Living Ruby 2 [0, 8, 0, ...]
24058 Inscribed Noble Topaz 6 [4, 0, ..., idx21:4, ...]
30052 Ring of Lethality {'1': 24, '2': 19, '17': 50, '18': 50, '20': 19}
30834 Shapeshifter's Signet {'1': 25, '2': 18, '24': 20}
```

Note `Enchant Ring - Striking` has `requiredProfession: 3` (Enchanting), and the
owner's export declares Enchanting as a profession — so it is legitimately
available to them, and our fixture simply never recorded it.

## Part 1 — the re-priced comparisons

### Build

`.scratch/set-bonus-value/loop-103-106/build-corrected-gear-arms.ts`, adapted
from `build-owner-gear-arms.ts`. **Every candidate arm goes through the real
`equipmentForCandidateSwap`** imported from `packages/core/src/rank.js`; the T6
package applies its four swaps sequentially, mirroring `rank.ts:1066-1074`. No
slot is hand-substituted on any candidate arm, so `repairMeta` runs — the trap
from iterations 02/04/05 is avoided by construction.

```
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-corrected-gear-arms.ts
```

Raw output:

```
OURS_BASE written; ids= 8345,278827,29100,278819,29096,29966,29947,29247,28741,28545,30052,30834,28034,29383,28658,0,29390 gems= 11
OURS_PKG written; ids= 8345,278827,31048,278819,31042,29966,31034,29247,31044,28545,30052,30834,28034,29383,28658,0,29390 gems= 10
OURS_CURSED written; ids= 32235,278827,29100,278819,29096,29966,29947,29247,28741,28545,30052,30834,28034,29383,28658,0,29390 gems= 13
OURS_VENG written; ids= 33672,278827,29100,278819,29096,29966,29947,29247,28741,28545,30052,30834,28034,29383,28658,0,29390 gems= 13
OWNER2_BASE written; ids= 8345,278827,29100,278819,29096,29966,29947,29247,28741,28545,30834,30052,28034,29383,28658,0,29390 gems= 11
OWNER2_PKG written; ids= 8345,278827,31048,278819,31042,29966,31034,29247,31044,28545,30834,30052,28034,29383,28658,0,29390 gems= 10
OWNER2_CURSED written; ids= 32235,278827,29100,278819,29096,29966,29947,29247,28741,28545,30834,30052,28034,29383,28658,0,29390 gems= 13
OWNER2_VENG written; ids= 33672,278827,29100,278819,29096,29966,29947,29247,28741,28545,30834,30052,28034,29383,28658,0,29390 gems= 13
OWNER2_BASE_NOAHUNE written; ids= 8345,0,29100,0,29096,29966,29947,29247,28741,28545,30834,30052,28034,29383,28658,0,29390 gems= 11
OURS_BASE_NOAHUNE written; ids= 8345,0,29100,0,29096,29966,29947,29247,28741,28545,30052,30834,28034,29383,28658,0,29390 gems= 11
```

Gem counts match iteration 06's `OURS_*` exactly (11/10/13/13), confirming the
builder path is the same one.

Rotation port (only `player.rotation` changed, verbatim from v2):

```
python -c "
import json, pathlib
root=pathlib.Path('.scratch/set-bonus-value/loop-103-106')
owner=json.load(open(root/'owner-settings-export-v2.json'))
rot=owner['player']['rotation']
src=root/'corrected-arms'; dst=root/'corrected-arms-simplerot'; dst.mkdir(exist_ok=True)
for f in sorted(src.glob('*.req.json')):
    r=json.load(open(f)); r['raid']['parties'][0]['players'][0]['rotation']=rot
    json.dump(r, open(dst/f.name,'w'), indent=2)
"
```

The ported rotation, verbatim:

```
{"type": "TypeSimple", "simple": {"specRotationJson": "{\"biteweave\":true,\"ripMinComboPoints\":5,\"biteMinComboPoints\":5,\"mangleTrick\":true,\"maintainFaerieFire\":true}"}, "priorityList": [{"action": {"catOptimalRotationAction": {"biteweave": true, "ripMinComboPoints": 5, "biteMinComboPoints": 5, "mangleTrick": true, "maintainFaerieFire": true}}}]}
```

### Run A — owner's TypeSimple rotation

```
python .scratch/set-bonus-value/loop-103-106/sim_corrected_arms.py simplerot
```

(pinned CLI resolved from `data/wowsims.lock.json` tag `v0.0.101` →
`vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe`; seeds 11/22/33/44/55;
3000 iterations. Log: `sim_corrected_simplerot.stdout.log`.)

```
MODE=simplerot CLI=C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\wowsimcli-v0.0.101-win32-x64\wowsimcli-windows.exe
  OURS_BASE               2202.35   2202.39   2202.34   2202.37   2202.43   mean=  2202.38
  OURS_PKG                2316.07   2315.98   2316.11   2316.17   2316.22   mean=  2316.11
  OURS_CURSED             2047.90   2047.85   2047.74   2047.89   2047.86   mean=  2047.85
  OURS_VENG               2041.21   2041.13   2041.01   2041.04   2041.08   mean=  2041.10
  OWNER2_BASE             2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82
  OWNER2_PKG              2333.09   2333.11   2333.28   2333.32   2333.39   mean=  2333.24
  OWNER2_CURSED           2070.45   2070.35   2070.18   2070.28   2070.19   mean=  2070.29
  OWNER2_VENG             2061.74   2061.73   2061.51   2061.73   2061.71   mean=  2061.68
  OWNER2_BASE_NOAHUNE     2122.73   2122.77   2122.43   2122.49   2122.64   mean=  2122.61
  OURS_BASE_NOAHUNE       2106.26   2106.31   2105.98   2105.98   2106.13   mean=  2106.13

  [OURS] baseline         =   2202.38
  [OURS] T6 4pc pkg delta =  +113.73   (ground truth +97)
           per-seed ['113.72', '113.59', '113.76', '113.80', '113.79']
  [OURS] CURSED - VENG    =    +6.75   (ground truth ~+10)
           per-seed ['6.68', '6.72', '6.73', '6.85', '6.78']
  [OURS] Ahune neck+back worth =   +96.25  (base 2202.38 vs stripped 2106.13)

  [OWNER2] baseline         =   2219.82
  [OWNER2] T6 4pc pkg delta =  +113.42   (ground truth +97)
           per-seed ['113.25', '113.27', '113.56', '113.53', '113.49']
  [OWNER2] CURSED - VENG    =    +8.61   (ground truth ~+10)
           per-seed ['8.71', '8.62', '8.67', '8.55', '8.48']
  [OWNER2] Ahune neck+back worth =   +97.20  (base 2219.82 vs stripped 2122.61)
```

**Harness validation**: `OURS_*` reproduces iteration 06's simplerot column to
the digit — baseline 2202.38, +113.73, +6.75. Same three figures, independent
run. The harness is sound and the comparison is like-for-like.

### Run B — our skeleton's APL rotation (control)

```
python .scratch/set-bonus-value/loop-103-106/sim_corrected_arms.py apl
```

(Log: `sim_corrected_apl.stdout.log`.)

```
MODE=apl CLI=C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\wowsimcli-v0.0.101-win32-x64\wowsimcli-windows.exe
  OURS_BASE               2152.10   2152.02   2152.16   2152.07   2152.31   mean=  2152.13
  OURS_PKG                2216.17   2216.62   2216.90   2216.74   2216.63   mean=  2216.61
  OURS_CURSED             1949.97   1949.78   1950.23   1950.37   1950.38   mean=  1950.15
  OURS_VENG               1950.05   1950.18   1950.12   1949.96   1949.68   mean=  1950.00
  OWNER2_BASE             2169.98   2169.89   2170.06   2169.98   2170.12   mean=  2170.01
  OWNER2_PKG              2232.09   2232.55   2232.86   2232.64   2232.51   mean=  2232.53
  OWNER2_CURSED           1979.21   1978.87   1978.32   1978.35   1978.25   mean=  1978.60
  OWNER2_VENG             1972.11   1971.97   1972.26   1972.06   1971.77   mean=  1972.03
  OWNER2_BASE_NOAHUNE     2074.63   2074.66   2074.84   2074.82   2074.82   mean=  2074.76
  OURS_BASE_NOAHUNE       2058.32   2058.41   2058.61   2058.57   2058.52   mean=  2058.49

  [OURS] baseline         =   2152.13
  [OURS] T6 4pc pkg delta =   +64.48   (ground truth +97)
           per-seed ['64.07', '64.60', '64.74', '64.67', '64.32']
  [OURS] CURSED - VENG    =    +0.15   (ground truth ~+10)
           per-seed ['-0.08', '-0.39', '0.12', '0.41', '0.70']
  [OURS] Ahune neck+back worth =   +93.64  (base 2152.13 vs stripped 2058.49)

  [OWNER2] baseline         =   2170.01
  [OWNER2] T6 4pc pkg delta =   +62.52   (ground truth +97)
           per-seed ['62.11', '62.65', '62.80', '62.66', '62.39']
  [OWNER2] CURSED - VENG    =    +6.57   (ground truth ~+10)
           per-seed ['7.10', '6.90', '6.06', '6.30', '6.48']
  [OWNER2] Ahune neck+back worth =   +95.25  (base 2170.01 vs stripped 2074.76)
```

`OURS_BASE` under APL = 2152.13, reproducing the stored artifact baseline
**2152.0998** that iteration 04 established. Second independent validation.

### The 2x2 on corrected gear

**(a) T6 four-piece package** (ground truth **+97**):

| | our APL | owner's TypeSimple |
|---|---|---|
| our fixture gear | +64.48 *(= stored +64.07)* | +113.73 |
| **corrected owner gear** | +62.52 | **+113.42** |

**(b) CURSED (32235) − VENG (33672)** (ground truth **~+10**):

| | our APL | owner's TypeSimple |
|---|---|---|
| our fixture gear | +0.15 *(= stored −0.084)* | +6.75 |
| **corrected owner gear** | +6.57 | **+8.61** |

Every helm delta is resolvable per-seed (CURSED wins all 5 seeds in all four
cells except our-gear/APL, which straddles zero as previously established).

### Did the corrected numbers match iteration 06's "our gear" column?

**(a) Yes, within noise.** +113.42 vs +113.73 — a −0.31 shift, against per-seed
spreads of ~0.2. The gear trim is worth essentially nothing on the package
delta, which is expected: T6 replaces shoulder/chest/hands/legs, and none of the
three trim differences touches those slots except T1 (shoulder enchant), which
the package arm **overwrites** anyway.

**(b) No — +8.61, not +6.75.** A **+1.86** shift, far outside the per-seed
spread (~0.2), and it moves toward the owner's ~+10. This needed explaining, so
I priced the three trim differences individually rather than assuming.

### Attributing the +1.86 helm-gap shift

`build-trim-arms.ts` applies each trim difference **alone** to our fixture
baseline and builds CURSED/VENG arms through the real
`equipmentForCandidateSwap`, all under the owner's TypeSimple rotation.

```
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-trim-arms.ts
```

then the sim (inline python, full text in `sim_trim.stdout.log`; same pinned
CLI, seeds, 3000 iters):

```
  T1_BASE       2212.00   2212.00   2211.89   2211.93   2212.07   mean=  2211.98
  T1_CURSED     2055.69   2055.54   2055.42   2055.57   2055.58   mean=  2055.56
  T1_VENG       2048.58   2048.60   2048.48   2048.49   2048.44   mean=  2048.52
  T2_BASE       2200.16   2200.21   2200.16   2200.19   2200.25   mean=  2200.19
  T2_CURSED     2051.18   2051.09   2050.94   2051.07   2051.08   mean=  2051.07
  T2_VENG       2043.00   2042.91   2042.63   2042.73   2042.73   mean=  2042.80
  T3_BASE       2213.94   2213.98   2213.94   2213.96   2214.03   mean=  2213.97
  T3_CURSED     2058.98   2058.93   2058.82   2058.98   2058.94   mean=  2058.93
  T3_VENG       2052.33   2052.24   2052.13   2052.16   2052.20   mean=  2052.21

  reference OURS_BASE(simplerot) 2202.38  CURSED-VENG +6.75
  [T1] base=  2211.98 (vs 2202.38 = +9.60)   CURSED-VENG= +7.04 (vs +6.75 = +0.29)  per-seed ['7.11', '6.94', '6.94', '7.08', '7.14']
  [T2] base=  2200.19 (vs 2202.38 = -2.19)   CURSED-VENG= +8.27 (vs +6.75 = +1.52)  per-seed ['8.18', '8.19', '8.30', '8.34', '8.35']
  [T3] base=  2213.97 (vs 2202.38 = +11.59)  CURSED-VENG= +6.72 (vs +6.75 = -0.03)  per-seed ['6.64', '6.68', '6.69', '6.82', '6.74']
```

| trim | baseline effect | helm-gap effect |
|---|---|---|
| T1 shoulder enchant 2983→2986 | **+9.60** | +0.29 |
| T2 feet gem 24028→24058 | **−2.19** | **+1.52** |
| T3 ring enchants (none→2929 ×2) | **+11.59** | −0.03 |
| **sum** | **+19.00** | **+1.78** |
| **measured together (OWNER2 − OURS)** | **+17.44** | **+1.86** |

Both superpose acceptably (baseline −1.56 of ~19 nonlinear; helm gap +0.08).
The helm-gap shift is **dominated by the single feet gem**: swapping a
+8-agility Delicate Living Ruby for an Inscribed Noble Topaz (+4 str, +4 crit)
*lowers* baseline DPS by 2.19 but *widens* the CURSED−VENG gap by 1.52.

**Hypothesis** (untested mechanism): Cursed Vision of Sargeras carries hit
rating where Vengeful Gladiator's helm carries resilience-flavoured stats, so
the two helms sit at different points on the hit/crit curve; shifting the
baseline's crit/hit mix changes which helm's stat profile is worth more. I did
not decompose the helms' stat vectors to confirm this, and the +1.52 figure
stands on the measurement regardless of the mechanism.

The ring pair is therefore **not** an inert reordering: it is worth **+11.59
DPS** to the baseline, entirely from the ring enchants our fixture lacks. It
contributes ~nothing to either delta because both arms carry it.

## Part 2 — the Ahune-id resolution channel

### What our pinned db resolves them to

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
byid={i['id']:i for i in db['items']}
for iid in (278827,278819): print(iid,'->',json.dumps(byid.get(iid),indent=1))
"
```

```
278827 -> {"id": 278827, "name": "Amulet of Bitter Hatred", "icon": "inv_jewelry_necklace_18",
           "type": 2, "phase": 2, "quality": 4,
           "scalingOptions": {"0": {"randPropPoints": 44,
             "stats": {"1": 22, "2": 20, "17": 48, "18": 48, "20": 20}, "ilvl": 128}}}

278819 -> {"id": 278819, "name": "The Frost Lord's War Cloak", "icon": "inv_misc_cape_16",
           "type": 4, "armorType": 1, "phase": 2, "quality": 4,
           "scalingOptions": {"0": {"randPropPoints": 44,
             "stats": {"1": 25, "2": 24, "17": 56, "18": 56, "31": 108}, "ilvl": 128}}}
```

Full stat vectors, as stored (stat indices per wowsims' `Stat` enum):

| | 278827 Amulet of Bitter Hatred | 278819 The Frost Lord's War Cloak |
|---|---|---|
| type | 2 (neck) | 4 (back), armorType 1 (cloth) |
| ilvl | 128 | 128 |
| phase | **2** | **2** |
| quality | 4 (epic) | 4 (epic) |
| stat 1 | 22 | 25 |
| stat 2 | 20 | 24 |
| stat 17 | 48 | 56 |
| stat 18 | 48 | 56 |
| stat 20 | 20 | — |
| stat 31 | — | 108 |

### Ticket 108's "Wrath-era items" premise is **falsified**

The db marks both `phase: 2` at `ilvl 128` — TBC Phase 2 values, not Wrath.
Checking the whole out-of-range block:

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
byid={i['id']:i for i in db['items']}
ids=[i['id'] for i in db['items']]
print('items:',len(db['items']),'max id:',max(ids))
big=sorted(i for i in ids if i>200000); print('count ids>200000:',len(big)); print(big)
for iid in big:
    it=byid[iid]; so=list(it['scalingOptions'].values())[0]
    print(f\"{iid}  phase={it.get('phase')}  ilvl={so.get('ilvl')}  q={it.get('quality')}  {it['name']}\")
"
```

```
items: 8257 max id: 279240
count ids>200000: 9
[278774, 278819, 278823, 278827, 278833, 278838, 278847, 278953, 279240]
278774  phase=2  ilvl=128  q=4  Cloak of the Frigid Winds
278819  phase=2  ilvl=128  q=4  The Frost Lord's War Cloak
278823  phase=2  ilvl=128  q=4  Icebound Cloak
278827  phase=2  ilvl=128  q=4  Amulet of Bitter Hatred
278833  phase=2  ilvl=128  q=4  Choker of the Arctic Flow
278838  phase=2  ilvl=128  q=4  Amulet of Glacial Tranquility
278847  phase=2  ilvl=128  q=4  Hailstone Pendant
278953  phase=2  ilvl=128  q=4  Frostscythe of Lord Ahune
279240  phase=2  ilvl=128  q=4  Shroud of Winter's Chill
```

**All nine out-of-range ids are Ahune / Frost Lord items, all `phase: 2`, all
ilvl 128, all epic.** `Frostscythe of Lord Ahune` is Ahune's signature drop.
This is a *deliberate, coherent block* upstream added for the Midsummer event
re-release at TBC Phase 2 item levels — exactly the "phase-shifted variant id"
case the owner described in ticket 108's addendum. It is **not** an id-mapping
collision with Wrath items, and it is **not** fixture corruption.

Name-uniqueness check (rules out a same-name TBC duplicate the mapping should
have preferred):

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
for i in db['items']:
    if i['name'] in (\"The Frost Lord's War Cloak\",'Amulet of Bitter Hatred'):
        so=list(i['scalingOptions'].values())[0]
        print('NAME MATCH', i['id'], i['name'], 'phase',i.get('phase'),'ilvl',so.get('ilvl'))
"
```

```
NAME MATCH 278819 The Frost Lord's War Cloak phase 2 ilvl 128
NAME MATCH 278827 Amulet of Bitter Hatred phase 2 ilvl 128
```

**Each name appears exactly once.** There is no alternative id to map to, so the
"map to the nearest same-name variant" remediation ticket 108 contemplates has
nothing to map to — because nothing is broken.

### Does the sim actually pay out their stats?

Yes, and substantially. The `*_NOAHUNE` arms empty slots 1 and 3 entirely:

| rotation | gear | base | Ahune slots emptied | **worth** |
|---|---|---|---|---|
| TypeSimple | owner v2 | 2219.82 | 2122.61 | **+97.20** |
| TypeSimple | ours | 2202.38 | 2106.13 | **+96.25** |
| APL | owner v2 | 2170.01 | 2074.76 | **+95.25** |
| APL | ours | 2152.13 | 2058.49 | **+93.64** |

The two items are worth **~+94 to +97 DPS** together. They are emphatically
**not** silently zero — the pinned CLI resolves both ids and applies their full
stat vectors. Ticket 108's "fails silently, feeding two wrong items" concern is
**not what is happening**; resolution succeeds and returns the correct TBC-phase
items.

### What would the wowsims WEB app resolve them to?

**I cannot determine this from data available locally, and I am not going to
guess.** Here is what the local evidence does and does not establish.

**What it does establish:**

- The vendored db **is** upstream's own database file: `data/wowsims.lock.json`
  pins `repo: wowsims/tbc-new`, `tag: v0.0.101`, `commit: 8aa378b…`, and records
  `db.json` at `assets/database/db.json` with a sha256. That is the same path
  the web app builds its client database from, in the same repo at the same
  commit.
- The owner's v2 export carries these ids **bare** — `{'id': 278827}` and
  `{'id': 278819, 'enchant': 368}` — with **no embedded stat information**
  whatsoever. wowsims' `IndividualSimSettings` stores item *references*, not
  resolved stats. So the export cannot tell us what the web app displayed for
  them.
- Therefore the owner's web session must have resolved these ids against
  *whatever database that deployment shipped*, and their presence in the export
  proves the web UI accepted and rendered them (a user cannot equip an id its
  own item picker does not carry).

**What it does not establish:** whether the *deployed* wowsims web app the owner
used is at commit `8aa378b` or some other version. If the owner's deployment is
newer or older, its `db.json` could carry different `ilvl`/stat values for the
same Ahune ids — precisely because these are event items upstream re-tunes per
phase, which is the mechanism ticket 108's addendum describes.

**Evidence that would settle it**, in decreasing order of strength:

1. The owner reading the **tooltip stats** for their equipped neck and back off
   the wowsims web UI and reporting them — directly comparable to the vectors
   tabulated above.
2. The **version/build string** from the wowsims web page footer, compared
   against tag `v0.0.101` / commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`.
3. The owner exporting a **sim result** (not settings) whose baseline DPS can be
   compared to our 2219.82 — a match implies identical resolution.

**Sizing the channel.** Because both ids sit in the **baseline arm of every
comparison**, a resolution difference shifts the baseline but largely cancels in
the deltas (neither the T6 package nor either helm touches neck or back).
Quantitatively: the two items are worth ~+96 DPS in total, so **hypothesis** —
even a fairly large mis-resolution (say a 10% stat difference, ~10 DPS on the
baseline) would move the *deltas* by well under 1 DPS, since the package and
helm arms carry the identical neck/back. The Ahune channel is a real risk to the
**absolute baseline** (~2220) and a **negligible** one to the +113 / +8.6
figures this loop is chasing. That is a bound from the structure of the
comparison plus the +96 measurement, not a direct measurement of a
mis-resolution.

## Part 3 — implications

### Does the residue reduce to rotation + iterations + Ahune resolution?

**Partly, and the shape of the residue has changed — it is now worse on (a) and
better on (b).**

| | our stored | corrected gear + TypeSimple | owner | residue |
|---|---|---|---|---|
| (a) T6 4pc | +64.07 | **+113.42** | **+97** | **−16.42** (we now *overshoot*) |
| (b) CURSED−VENG | −0.084 | **+8.61** | **~+10** | **+1.39** (we undershoot) |

- **Gear is no longer an explanation for anything.** The corrected gear is our
  gear plus three trim items worth +17.44 baseline DPS, +1.86 on the helm gap
  and ~0 on the package. Iteration 06's "different character" story is dead, and
  with it the −7.9 / +4.49 gear attributions.
- **Rotation remains the dominant lever**, and it is entirely ours: +49.25 on
  our gear (64.48→113.73), +50.90 on the corrected gear (62.52→113.42) for the
  package; +6.60 / +2.04 for the helm gap.
- **(b) is essentially closed.** +8.61 against a round "~+10" reported off a UI
  is within what iteration count, seed, and rounding plausibly cover.
- **(a) is NOT closed, and it inverted.** We now produce **+113.42 against the
  owner's +97** — a 16.4 DPS *overshoot*. Iteration 06's +87.63 undershoot was
  an artefact of the wrong gear. This is a **new, unexplained residue in the
  opposite direction**, and it is the single most important open fact from this
  iteration. Nothing measured here explains it.

**Untested candidates for the (a) overshoot**, none of which I priced:

- The owner's `+97` may be against a different baseline than the one their
  settings export encodes (e.g. read off a UI comparing to a differently-gemmed
  or partially-tiered arm rather than a clean 4-slot package swap).
- Our T6 package applies **four sequential swaps through
  `equipmentForCandidateSwap`**, which re-gems as it goes; the owner clicking
  four items in the web UI would keep their own gems. Iteration 03 priced a
  variant of this (`PKG_BESTGEMS` +64.43 vs `PKG_PROD` +64.48) under the *APL*
  rotation, where it was worth ~0 — **it was never re-priced under TypeSimple**,
  and the rotation demonstrably changes how much stat mixes are worth (see T2
  above). **Hypothesis**: worth re-running.
- The two unpriced settings differences iteration 06 left open (`canCrush`, the
  double `drumsId`) remain unpriced.

### Iteration count — does 25000 iterations plausibly cover the residue?

**No for (a); comfortably yes for (b).** My five seeds at 3000 iterations give:

| figure | per-seed spread | max−min |
|---|---|---|
| OWNER2 package delta (TypeSimple) | 113.25, 113.27, 113.56, 113.53, 113.49 | **0.31** |
| OWNER2 helm gap (TypeSimple) | 8.71, 8.62, 8.67, 8.55, 8.48 | **0.23** |

Seed-to-seed variation at 3000 iterations is **~0.3 DPS**. Going to 25000
iterations *reduces* variance further (roughly by √(25000/3000) ≈ 2.9×, so
~0.1 DPS). So:

- **(b)'s +1.39 residue is ~6× the 3000-iteration spread** — larger than pure
  seed noise, but "~+10" is a round number a user read off a UI, and if the true
  value were 9.5 the residue is 0.9. Plausibly closed by rounding alone; iteration
  count contributes almost nothing.
- **(a)'s −16.42 residue is ~53× the spread.** Iteration count and seed cannot
  account for it in any form. **It is a real, structural disagreement** and needs
  a mechanism, not more samples.

## Conclusion

1. **Corrected-gear baseline DPS: 2219.82** (TypeSimple) / **2170.01** (our
   APL). Against our stored **2152.0998**: the corrected gear is +17.9 higher
   under the same APL rotation, all of it trim (ring enchants +11.59, shoulder
   enchant +9.60, feet gem −2.19). Against iteration 06's wrong-gear **2264**:
   that figure is withdrawn — it was a genuinely different, better-geared
   character; the real owner baseline is ~94 DPS lower.
2. **(a) T6 four-piece = +113.42** vs owner **+97**. **Matches** iteration 06's
   "our gear" column (+113.73) within noise, but **overshoots the owner by
   16.4 DPS** — a new residue, opposite in sign to iteration 06's, unexplained.
3. **(b) CURSED − VENG = +8.61** vs owner **~+10**. Does **not** match iteration
   06's +6.75 — it is **+1.86 higher**, and I attributed that shift by isolated
   measurement: the feet gem 24028→24058 is worth +1.52 of it, the shoulder
   enchant +0.29, the ring enchants ~0. This residue is plausibly closed.
4. **Ahune ids are correctly resolved and are not a defect.** Both are TBC
   `phase: 2` ilvl-128 event items in a coherent 9-id upstream block; each name
   is unique in the db; the sim pays out their full stats, worth **~+96 DPS**
   together. Ticket 108's "Wrath-era" premise is falsified. The web-side
   resolution **cannot be determined locally** — the export carries bare ids with
   no stats — but the channel is **negligible for the deltas** (both ids sit in
   every arm) even though it matters for the absolute baseline.
5. **A third trim difference was missed by the director's diff**: the owner's
   rings both carry `enchant: 2929` (Enchant Ring – Striking) and our fixture
   carries none — worth **+11.59 DPS** on the baseline. The slots 10/11 pair is
   not merely swapped order.
