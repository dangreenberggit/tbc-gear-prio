# 08 — sequential-swap gem mechanism under TypeSimple (iteration 8)

Subagent `08-sequential-gems-typesimple`. Read-only on production source and
`data/`. All throwaway artefacts under
`.scratch/set-bonus-value/loop-103-106/` (sim dir `sims-08/`). Branch
`feat/set-bonus-value` unchanged, nothing committed, nothing under `packages/`
or `data/` modified.

## What I was asked

1. **Part 1** — re-price the sequential-swap gem mechanism under the owner's
   `TypeSimple` rotation on the corrected owner gear. Build `PKG_PROD` (exact
   production payload), `PKG_KEEPGEMS` (what a wowsims UI user would end up
   with — **decide and document what that means concretely**, investigating
   what the web UI actually does on equip), and an intermediate isolating
   *which* of the four sequential swaps diverges. Report how much of the
   **−16.42** residue each explains.
2. **Part 2** — if the gem mechanism is not it, test set-bonus double-counting /
   the T6 4pc-2pc interaction, the T6 item ids, and the provenance of the
   owner's +97.
3. **Part 3** — bound the honest conclusion; do not manufacture a closing story.

## Headline

**The gem mechanism explains 10.43 of the 16.42 DPS residue — 64% of it — and
it is one gem in one slot.** The remaining **−5.99** is not explained, and I
did not force it. Separately I overturned a premise this iteration was
dispatched on: **iteration 03 did not falsify this mechanism under APL.** It
never tested it. The mechanism is worth **−7.76 under APL too**.

| arm (corrected owner gear, TypeSimple) | delta vs baseline | vs owner's +97 |
|---|---|---|
| `PKG_PROD` — exact production payload | **+113.42** | −16.42 |
| `PKG_FILL24028` — fill with the gem the owner actually wears | +111.72 | −14.72 |
| `PKG_UIMIGRATE` — **wowsims web UI semantics** | **+102.99** | **−5.99** |
| owner's ground truth | +97 | — |

`PKG_PROD` reproduces iteration 07's +113.42 **to the digit** on an independent
run, and its request payload is **byte-identical** to 07's `OWNER2_PKG`
(verified below) — the harness is validated and the comparison is like-for-like.

## Part 0 — what "what a UI user gets" means concretely

I did not guess this. I read upstream's own source at the pinned commit.

```
curl -sSL "https://raw.githubusercontent.com/wowsims/tbc-new/8aa378b3671a0923fd11fb34b4b3753e53f20c9b/ui/core/proto_utils/equipped_item.ts" -o .scratch/set-bonus-value/loop-103-106/upstream-src/equipped_item.ts
wc -l .scratch/set-bonus-value/loop-103-106/upstream-src/equipped_item.ts
```
```
378 .scratch/set-bonus-value/loop-103-106/upstream-src/equipped_item.ts
```

`EquippedItem.withItem` at `:138-168`, verbatim from the fetched file:

```ts
	/**
	 * Replaces the item and tries to keep the existing enchants/gems if possible.
	 */
	withItem(item: Item): EquippedItem {
		let newEnchant = null;
		if (this._enchant && enchantAppliesToItem(this._enchant, item)) newEnchant = this._enchant;
		// Reorganize gems to match as many colors in the new item as possible.
		const newGems = new Array(item.gemSockets.length).fill(null);
		this._gems
			.slice(0, this._item.gemSockets.length)
			.filter(gem => gem != null)
			.forEach(gem => {
				const firstMatchingIndex = item.gemSockets.findIndex((socketColor, socketIdx) => !newGems[socketIdx] && gemMatchesSocket(gem!, socketColor));
				const firstEligibleIndex = item.gemSockets.findIndex(
					(socketColor, socketIdx) => !newGems[socketIdx] && gemEligibleForSocket(gem!, socketColor),
				);
				if (firstMatchingIndex != -1) {
					newGems[firstMatchingIndex] = gem;
				} else if (firstEligibleIndex != -1) {
					newGems[firstEligibleIndex] = gem;
				}
			});
		return new EquippedItem({ item, enchant: newEnchant, gems: newGems });
	}
```

**Answer, with high confidence** (this is a direct read of the code that runs on
equip, not an inference about UI behaviour):

- The web UI **migrates** gems from the old item to the new one — colour-matched
  socket first, then any eligible socket.
- Gems beyond the new item's socket count are **dropped**.
- **Leftover sockets stay `null` — the UI does NOT auto-fill them.** There is no
  EP-fill and no `repairMeta` equivalent anywhere on this path. `asSpec()` at
  `:285-292` serialises a null gem as `0`, which is exactly what the sim
  receives for an empty socket.

So "what a UI user gets by clicking four items" = **migrate, then leave empties
empty**. That is `PKG_UIMIGRATE`.

**Our `migrateGemsToItem` is a faithful port of `withItem`.** I read
`packages/core/src/migrate-gems.ts:15-52` against the upstream block above:
same slice-to-worn-socket-count, same colour-match-then-eligible two-pass,
same drop-on-overflow, same zero-fill of leftovers. Its own docstring says so.
**The divergence from the UI is not in migration** — it is the step our code
runs *afterwards*, `fillEmptyCandidateGems`
(`packages/core/src/candidate-gems.ts:118-134`), which has no upstream
counterpart on the equip path.

## Part 1 — the measurement

### Build

`.scratch/set-bonus-value/loop-103-106/build-uigems-arms.ts`, adapted from
07's `build-corrected-gear-arms.ts`. Baseline is the corrected owner export
(`owner-settings-export-v2.json`), unmodified.

- `PKG_PROD` — four sequential calls to the **real, imported**
  `equipmentForCandidateSwap`, mirroring `rank.ts:1063-1074`.
- `PKG_UIMIGRATE` — four sequential `uiSwap` calls. **This is a labelled
  reimplementation** of one swap under UI semantics: it calls the **real
  exported `migrateGemsToItem`** and then stops — no `fillEmptyCandidateGems`,
  no `repairMeta`. Only the two steps upstream does not have are suppressed.
- `PKG_UIONLY_<slot>` — swap `<slot>` under UI semantics, the other three under
  production semantics. This is the intermediate that isolates *which* swap
  diverges.

The repairMeta trap is not in play here and I confirmed it rather than assuming:
no slot is hand-substituted, and none of the four T6 pieces carries a meta
socket (sockets are yellow/blue only, dumped below), so `repairMeta` has nothing
to repair and rewrites nothing. Verified empirically — `PKG_PROD` differs from
the baseline in **exactly the four T6 slots and no others** (dump below).

```
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-uigems-arms.ts
```

Raw output:

```
OWNER2_BASE            gems= 11  T6slots= 29100:[24028,24028] 29096:[24028,24028,24028] 29947:[] 28741:[24028,24028,24028]
PKG_PROD               gems= 10  T6slots= 31048:[24028,24028] 31042:[24028,24028,24028] 31034:[32194] 31044:[24028]
PKG_UIMIGRATE          gems=  9  T6slots= 31048:[24028,24028] 31042:[24028,24028,24028] 31034:[0] 31044:[24028]
PKG_UIONLY_shoulder    gems= 10  T6slots= 31048:[24028,24028] 31042:[24028,24028,24028] 31034:[32194] 31044:[24028]
PKG_UIONLY_chest       gems= 10  T6slots= 31048:[24028,24028] 31042:[24028,24028,24028] 31034:[32194] 31044:[24028]
PKG_UIONLY_hands       gems=  9  T6slots= 31048:[24028,24028] 31042:[24028,24028,24028] 31034:[0] 31044:[24028]
PKG_UIONLY_legs        gems= 10  T6slots= 31048:[24028,24028] 31042:[24028,24028,24028] 31034:[32194] 31044:[24028]
```

**This is the whole finding in one table.** Three of the four swaps are
*identical* under production and UI semantics — migration alone fills their
sockets, and there is nothing left for `fillEmptyCandidateGems` to do:

| slot | worn item (sockets) | T6 item (sockets) | migrated | production fills |
|---|---|---|---|---|
| shoulder | 29100 (2 gems) | 31048 (2) | 2 | — |
| chest | 29096 (3 gems) | 31042 (3) | 3 | — |
| **hands** | **29947 (0 sockets, 0 gems)** | **31034 (1)** | **0** | **1 × 32194** |
| legs | 28741 (3 gems) | 31044 (1) | 1 (2 dropped) | — |

Only **hands** diverges, and for a structural reason: the owner's worn gloves
(`Gloves of the Searing Grip` 29947) have **no sockets at all**, so migration
has nothing to carry forward and leaves 31034's single socket empty. Production
then EP-fills it. The socket-capacity *loss* on legs (3 gems → 1) is symmetric
— both arms eat it identically, which is why iteration 03's socket-capacity
line correctly priced ~0.

Validation that the reimplementation is faithful:

```
python -c "
import json
a=json.load(open('.scratch/set-bonus-value/loop-103-106/uigems-arms/PKG_PROD.req.json'))['raid']['parties'][0]['players'][0]['equipment']['items']
b=json.load(open('.scratch/set-bonus-value/loop-103-106/corrected-arms/OWNER2_PKG.req.json'))['raid']['parties'][0]['players'][0]['equipment']['items']
print('PKG_PROD (08) == OWNER2_PKG (07):', a==b)
u=json.load(open('.scratch/set-bonus-value/loop-103-106/uigems-arms/PKG_UIMIGRATE.req.json'))['raid']['parties'][0]['players'][0]['equipment']['items']
for i,(x,y) in enumerate(zip(a,u)):
    if x!=y: print('  slot',i,'PROD',json.dumps(x),'| UIMIGRATE',json.dumps(y))
"
```
```
PKG_PROD (08) == OWNER2_PKG (07): True

  slot 6 PROD {"id": 31034, "enchant": 2564, "gems": [32194]} | UIMIGRATE {"id": 31034, "enchant": 2564, "gems": [0]}
```

`PKG_PROD` reproduces iteration 07's arm **byte-identically**, and the entire
production-vs-UI divergence across all four sequential swaps is **one gem in
one socket**.

Rotation port (only `player.rotation` replaced, verbatim from the v2 export,
same method as 07):

```
python -c "
import json, pathlib
root=pathlib.Path('.scratch/set-bonus-value/loop-103-106')
owner=json.load(open(root/'owner-settings-export-v2.json'))
rot=owner['player']['rotation']
src=root/'uigems-arms'; dst=root/'uigems-arms-simplerot'; dst.mkdir(exist_ok=True)
n=0
for f in sorted(src.glob('*.req.json')):
    r=json.load(open(f)); r['raid']['parties'][0]['players'][0]['rotation']=rot
    json.dump(r, open(dst/f.name,'w'), indent=2); n+=1
print('ported', n, 'requests to TypeSimple')
"
```
```
ported 7 requests to TypeSimple
```

### Run A — owner's TypeSimple rotation

Pinned CLI resolved from `data/wowsims.lock.json` tag `v0.0.101`; seeds
[11,22,33,44,55]; 3000 iterations. Log:
`sim_uigems_simplerot.stdout.log`.

```
python .scratch/set-bonus-value/loop-103-106/sim_uigems.py simplerot
```

```
MODE=simplerot CLI=C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\wowsimcli-v0.0.101-win32-x64\wowsimcli-windows.exe
  OWNER2_BASE             2219.84   2219.84   2219.71   2219.79   2219.90   mean=  2219.82
  PKG_PROD                2333.09   2333.11   2333.28   2333.32   2333.39   mean=  2333.24
  PKG_UIMIGRATE           2322.71   2322.68   2322.87   2322.90   2322.91   mean=  2322.81
  PKG_UIONLY_shoulder     2333.09   2333.11   2333.28   2333.32   2333.39   mean=  2333.24
  PKG_UIONLY_chest        2333.09   2333.11   2333.28   2333.32   2333.39   mean=  2333.24
  PKG_UIONLY_hands        2322.71   2322.68   2322.87   2322.90   2322.91   mean=  2322.81
  PKG_UIONLY_legs         2333.09   2333.11   2333.28   2333.32   2333.39   mean=  2333.24

  baseline =   2219.82   (07 measured 2219.82 under simplerot)
  PKG_PROD               delta =  +113.42   per-seed ['113.25', '113.27', '113.56', '113.53', '113.49']
  PKG_UIMIGRATE          delta =  +102.99   per-seed ['102.87', '102.84', '103.15', '103.11', '103.01']
  PKG_UIONLY_shoulder    delta =  +113.42   per-seed ['113.25', '113.27', '113.56', '113.53', '113.49']
  PKG_UIONLY_chest       delta =  +113.42   per-seed ['113.25', '113.27', '113.56', '113.53', '113.49']
  PKG_UIONLY_hands       delta =  +102.99   per-seed ['102.87', '102.84', '103.15', '103.11', '103.01']
  PKG_UIONLY_legs        delta =  +113.42   per-seed ['113.25', '113.27', '113.56', '113.53', '113.49']

  PKG_UIMIGRATE - PKG_PROD =   -10.43   (residue to explain: -16.42)
```

Baseline 2219.82 and `PKG_PROD` +113.42 reproduce 07 exactly. The
`PKG_UIONLY_*` intermediates confirm the isolation cleanly: shoulder, chest and
legs land on `PKG_PROD` to the hundredth (identical payloads, so identical
sims), **`PKG_UIONLY_hands` lands exactly on `PKG_UIMIGRATE`**. The whole
mechanism is the hands swap.

### The intermediate: fill with the gem the owner actually wears

Our fill picks **32194 Delicate Crimson Spinel** — a `phase: 3`, quality-4
(epic) +10-agility gem. The owner wears **no 32194 anywhere**: every gem in
their export is 24028 (+8 agi) or 24058.

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
for g in db['gems']:
    if g['id'] in (32194,24028):
        print(json.dumps({k:g.get(k) for k in ('id','name','phase','quality','unique','color','requiredProfession')}))
"
```
```
{"id": 24028, "name": "Delicate Living Ruby", "phase": 1, "quality": 3, "unique": null, "color": 2, "requiredProfession": null}
{"id": 32194, "name": "Delicate Crimson Spinel", "phase": 3, "quality": 4, "unique": null, "color": 2, "requiredProfession": null}
```

So I simmed the third rung: production's fill behaviour, but with the gem the
owner demonstrably owns.

```
python -c "... slot6 gems 32194 -> 24028 ..."   # full text in sim_uigems_simplerot.stdout.log
```
```
  PKG_FILL24028     2331.41   2331.40   2331.56   2331.63   2331.71  mean=  2331.54

  PKG_FILL24028 delta vs base =  +111.72
```

### Run B — our APL rotation (control), and an overturned premise

```
python .scratch/set-bonus-value/loop-103-106/sim_uigems.py apl
```

```
MODE=apl CLI=C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\wowsimcli-v0.0.101-win32-x64\wowsimcli-windows.exe
  OWNER2_BASE             2169.98   2169.89   2170.06   2169.98   2170.12   mean=  2170.01
  PKG_PROD                2232.09   2232.55   2232.86   2232.64   2232.51   mean=  2232.53
  PKG_UIMIGRATE           2224.52   2224.92   2224.95   2224.80   2224.67   mean=  2224.77
  PKG_UIONLY_shoulder     2232.09   2232.55   2232.86   2232.64   2232.51   mean=  2232.53
  PKG_UIONLY_chest        2232.09   2232.55   2232.86   2232.64   2232.51   mean=  2232.53
  PKG_UIONLY_hands        2224.52   2224.92   2224.95   2224.80   2224.67   mean=  2224.77
  PKG_UIONLY_legs         2232.09   2232.55   2232.86   2232.64   2232.51   mean=  2232.53

  baseline =   2170.01   (07 measured 2219.82 under simplerot)
  PKG_PROD               delta =   +62.52   per-seed ['62.11', '62.65', '62.80', '62.66', '62.39']
  PKG_UIMIGRATE          delta =   +54.77   per-seed ['54.54', '55.03', '54.89', '54.81', '54.56']
  ...
  PKG_UIMIGRATE - PKG_PROD =    -7.76   (residue to explain: -16.42)
```

**Iteration 03 did not falsify this mechanism under APL — it never tested it.**
03's arms were `PKG_PROD` (+64.48), `PKG_FILLER` (32194 everywhere, +80.80) and
`PKG_BESTGEMS` (24028 everywhere, +64.43). **All three fill the hands socket.**
03 varied *which* gem goes in, and correctly concluded gem *choice*, not socket
*count*, drove its spread. It never built an arm with the socket left **empty**,
which is the only thing the UI actually does. The director's brief records 03 as
having "priced this same mechanism ... and got ~0"; that is not what 03
measured, and this is a correction to the loop's record, not a new nuance.

Measured here, the mechanism is worth **−7.76 under APL** and **−10.43 under
TypeSimple**. The rotation-dependence the director hypothesised is real
(+2.67, ~9× the seed spread) but it is a modifier, not the mechanism — the
mechanism was simply never measured before.

### How much of the −16.42 does each variant explain?

| variant | delta | residue vs +97 | share of −16.42 explained |
|---|---|---|---|
| `PKG_PROD` (production today) | +113.42 | −16.42 | — |
| `PKG_FILL24028` (fill, owner's gem) | +111.72 | −14.72 | 1.70 (**10%**) |
| `PKG_UIMIGRATE` (**true UI semantics**) | +102.99 | **−5.99** | **10.43 (64%)** |

Seed spread on `PKG_UIMIGRATE` is 0.31 (102.84–103.15), so the −10.43 is ~34×
noise and resolvable on every paired seed.

**64% of the residue is the gem mechanism.** The remaining **−5.99** is ~19× the
seed spread and still needs a mechanism.

## Part 2 — the other candidates

### Set bonuses / the T6 4pc-2pc interaction — cleared

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json'))
byid={i['id']:i for i in db['items']}
base=[8345,278827,29100,278819,29096,29966,29947,29247,28741,28545,30834,30052,28034,29383,28658,0,29390]
pkg =[8345,278827,31048,278819,31042,29966,31034,29247,31044,28545,30834,30052,28034,29383,28658,0,29390]
def sets(ids):
    c={}
    for i in ids:
        it=byid.get(i)
        if it and it.get('setName'): c[it['setName']]=c.get(it['setName'],0)+1
    return c
print('BASE sets:', sets(base))
print('PKG  sets:', sets(pkg))
"
```
```
BASE sets: {'Malorne Harness': 2}
PKG  sets: {'Thunderheart Harness': 4}
```

The package correctly **breaks a Malorne (T4) 2pc** and **gains a Thunderheart
(T6) 4pc**. Crucially for this iteration: `PKG_PROD` and `PKG_UIMIGRATE` have
**identical set membership** — the only difference between them is one gem — so
no set-bonus effect, double-counted or otherwise, can contribute to the −10.43
*or* to the surviving −5.99. Whatever the set-break accounting does, both arms
do it identically.

Empirical probe (the `resources`-length trick from
`measure_shredzepelin_t6.py`):

```
python -c "
import json
for tag in ('OWNER2_BASE','PKG_PROD','PKG_UIMIGRATE'):
    d=json.load(open(f'.scratch/set-bonus-value/loop-103-106/sims-08/simplerot/{tag}-11.json'))
    pl=d['raidMetrics']['parties'][0]['players'][0]
    print(tag, 'resources n=', len(pl.get('resources',[])), 'auras n=', len(pl.get('auras',[])))
"
```
```
OWNER2_BASE resources n= 19 auras n= 28
PKG_PROD resources n= 18 auras n= 28
PKG_UIMIGRATE resources n= 18 auras n= 28
```

Base and package differ (19→18 resources); the two package arms are identical.
I attempted to read aura **names** to confirm which set bonus fires, but the
CLI emits them empty (`['?', '?', ...] × 28`), so this probe distinguishes arms
without naming effects. **Untested**: whether the T6 4pc effect specifically
fires. It is not needed for this iteration's question, because the mechanism
under test is a within-package comparison where set state is provably constant.

### The T6 item ids — correct, no alternates in play

```
python -c "... grep Thunderheart/Malorne/Nordrassil from db ..."
```
Relevant rows:
```
31034 Thunderheart Gauntlets  type 7 ilvl 146 phase 3 setName Thunderheart Harness setId 676
31042 Thunderheart Chestguard type 5 ilvl 146 phase 3 setName Thunderheart Harness setId 676
31044 Thunderheart Leggings   type 9 ilvl 146 phase 3 setName Thunderheart Harness setId 676
31048 Thunderheart Pauldrons  type 3 ilvl 146 phase 3 setName Thunderheart Harness setId 676
```

All four are `Thunderheart Harness` (setId **676**) — one coherent set, one
piece per slot. Druid T6 has three token variants (Harness 676 = feral/tank,
Raiment 678, Regalia 677); Harness is unambiguously the feral one, and it is
the set whose T4 counterpart (`Malorne Harness` 640) the owner already wears
two pieces of. **We and the owner mean the same four pieces**, and there is no
plausible alternate a feral would have chosen. This candidate is dead.

Socket colours and socket bonuses, which also matter here:

```
31048 Thunderheart Pauldrons sockets= ['blue', 'yellow'] socketBonus(nonzero idx)= {0: 3}
31042 Thunderheart Chestguard sockets= ['yellow', 'blue', 'red'] socketBonus(nonzero idx)= {0: 4}
31034 Thunderheart Gauntlets sockets= ['yellow'] socketBonus(nonzero idx)= {0: 2}
31044 Thunderheart Leggings sockets= ['yellow'] socketBonus(nonzero idx)= {0: 2}
24028 Delicate Living Ruby color red
32194 Delicate Crimson Spinel color red
```

Every T6 socket is yellow or blue; every migrated gem is **red**. So the socket
bonus is **unmet in every arm** — production's and the UI's alike. It cannot
contribute to the residue in either direction, and no meta socket exists on any
of the four pieces (confirming `repairMeta` is inert here).

### The owner's +97 provenance — a live possibility, and I want to say this plainly

**We have never seen the owner's +97 run.** We have only their *settings*
export, and it carries no results and no iteration count:

```
python -c "... dump owner-settings-export-v2.json keys, walk for iterations/seed ..."
```
```
top keys: ['apiVersion', 'raidBuffs', 'debuffs', 'partyBuffs', 'player', 'encounter']
player keys: ['apiVersion', 'name', 'race', 'class', 'equipment', 'consumables', 'bonusStats', 'itemSwap', 'buffs', 'feralCatDruid', 'talentsString', 'profession1', 'profession2', 'cooldowns', 'rotation', 'reactionTimeMs', 'healingModel']
simOptions/iterations anywhere?
(no matches)
```

`bonusStats` is all zeros and `itemSwap` is empty, so neither is a hidden
confound. But the export is a *settings* snapshot: it does not tell us what
baseline the +97 was measured against, at what iteration count, or whether the
gear it encodes is the gear that was equipped when +97 was read off.

This loop has already been burned once by exactly this: the v1 export carried
gear the owner did not have, and iteration 06's confident close was withdrawn
because of it. The +97 predates the settings export. **It is a real possibility
— not a rhetorical hedge — that +97 was read off a UI state that differs from
the v2 export in some way we cannot see**, in the same way the v1 equipment
did. I flag this as a genuine candidate for the surviving −5.99, and I note it
is **untested and untestable from our side** with what we currently hold.

Two concrete sub-possibilities, both **hypothesis**:
- The owner may have had a gem in their gloves socket, or a different gem
  somewhere in the four T6 pieces, when they read +97. Our `PKG_UIMIGRATE`
  assumes an empty gloves socket; a user who noticed the empty socket and
  clicked a gem into it would land nearer `PKG_FILL24028` (+111.72), i.e. the
  *opposite* direction, which argues against this.
- "+97" is a round number. If the true figure were 100 the residue is −2.99; if
  it were 103 the residue is 0. Iteration 07 established the seed spread is
  0.31 and 25000 iterations would shrink it to ~0.1, so **noise cannot explain
  −5.99** — but *reporting precision* is not noise, and a value quoted to two
  significant figures carries ±0.5 at best and plausibly more if read off a
  changing UI.

## Part 3 — the bounded conclusion

### What is explained

**10.43 DPS of the 16.42 (64%)** is a real, localised, reproducible mechanism:

> When a candidate item introduces a socket that the worn item did not have,
> `equipmentForCandidateSwap` EP-fills it via `fillEmptyCandidateGems`
> (`candidate-gems.ts:118`), giving the candidate arm a gem the player does not
> own and would not automatically receive. wowsims' web UI
> (`EquippedItem.withItem`) migrates gems and leaves the leftover socket empty.
> Here that is one socket on `Thunderheart Gauntlets` 31034, filled with a
> phase-3 epic 32194 (+10 agi) the owner wears nowhere, worth **+10.43 DPS
> under TypeSimple** and **+7.76 under APL**.

Three secondary results, each measured rather than argued:

1. **The mechanism is confined to one of the four sequential swaps.** The
   `PKG_UIONLY_*` intermediates put shoulder/chest/legs exactly on `PKG_PROD`
   and hands exactly on `PKG_UIMIGRATE`. "Sequential re-gemming across slots"
   is **not** what is happening — no cross-slot rewrite occurs at all (no meta
   socket, so `repairMeta` is inert). It is a single new-socket fill.
2. **Iteration 03's falsification never covered this case** and the loop's
   record should be corrected. 03 compared three *filled* arms; the empty-socket
   arm was never built. The mechanism is worth −7.76 under APL, not ~0.
3. **Set bonuses, the T6 ids, socket bonuses and `repairMeta` are all cleared**
   for this comparison by construction, not by inference: `PKG_PROD` and
   `PKG_UIMIGRATE` differ in exactly one gem, so everything else is provably
   constant between them.

### What is not explained

**−5.99 DPS** (+102.99 measured vs the owner's +97). This is ~19× the 3000-iter
seed spread of 0.31 and would shrink further at 25000 iterations, so **iteration
count and seed do not cover it**. I did not find a mechanism for it and I am not
going to invent one.

I want to be explicit that I am **not** claiming `PKG_UIMIGRATE` is what
production *should* do. That is a spec question (PLAN.md §2.2's byte-identical
gem policy, and the §9 policy items) and out of this iteration's scope. What I
measured is that production's arm and a UI user's arm differ by 10.43 DPS on
this comparison, in the direction that explains most of the overshoot.

### What evidence would settle the remainder

In decreasing order of strength — all of it from the owner's side, none of it
obtainable locally:

1. **The owner's exported sim *result*** (not settings) for both the baseline
   and the four-piece arm, at a stated iteration count. That gives an absolute
   baseline DPS to compare against our 2219.82 and turns "+97" from a quoted
   round number into two measured endpoints. This single artifact would close
   or localise the entire −5.99.
2. **The owner's gloves socket state after equipping 31034** — a screenshot or
   the re-exported settings *with the T6 pieces equipped*. This directly
   confirms or refutes the `PKG_UIMIGRATE` assumption that the socket was left
   empty, which is the load-bearing premise of the 10.43.
3. **The wowsims web build string** from the page footer, versus tag `v0.0.101` /
   commit `8aa378b`. Iteration 07 left this open for the Ahune ids; it would
   also confirm the `withItem` source I read is the code the owner's session
   ran.
4. Failing all of the above: **the precision of "+97"** — whether it was read as
   a whole number off a delta display or computed from two DPS figures. If the
   true value is ≥100, the residue is within reporting precision and there is
   nothing left to explain.

**Posture.** This is the third mechanism this loop has priced and the first one
that landed. It explains most but not all of the residue, and the honest state
is a partially-closed ticket with a named, testable remainder — not a close.
Given that two confident closes have already been overturned here, I am
deliberately leaving the −5.99 open rather than attaching it to the most
convenient of the candidates above.

## Artefacts

- `build-uigems-arms.ts` — arm builder (labels its one reimplementation)
- `sim_uigems.py` — sim harness
- `sim_uigems_simplerot.stdout.log`, `sim_uigems_apl.stdout.log`
- `uigems-arms/`, `uigems-arms-simplerot/` — request payloads
- `sims-08/simplerot/`, `sims-08/apl/` — per-seed requests + results, `per-seed.json`
- `upstream-src/equipped_item.ts` — upstream source at the pinned commit
