# 04-artifact-vs-direct — the ~15 DPS artifact-vs-direct-sim displacement

## What I was asked

Iteration 3 of the combined 103/106 loop. Subagent 02 simmed what it believed
were the exact production swap payloads for two helms and got deltas vs
baseline of **−185.46** (Cursed Vision 32235) and **−188.30** (Vengeful
Gladiator 33672), while the stored artifact
`.scratch/rank-reports/shredzepelin-p3.json` records **−202.13** and
**−202.05**. Find the specific mechanism producing the ~15 DPS displacement,
named at file:line, with the demonstrating experiment. Diagnose, do not fix.
Read-only on `packages/`.

## Answer up front

**Subagent 02's harness never applied the production regem.** Its script
substituted only the *head* slot (hardcoded `HELM_GEMS = [32409, 32194]`) and
left every other slot at the baseline's `24028` gems. Production's
`equipmentForCandidateSwap` (`packages/core/src/rank.ts:1424`) also **rewrites
four gems on shoulder and chest** to satisfy the newly-introduced meta gem's
colour condition, downgrading four 8-agility red gems to 5-agility
orange/purple gems.

There is **no pipeline defect and no baseline mismatch**. The stored artifact
figures are correct for the payload production builds; subagent 02 simmed a
*different, better-gemmed* arm and the ~15 DPS is the real cost of the meta
regem. Ticket 106's collapsed ordering is a **genuine measurement** of the
production arms, not an artifact.

## Commands run, verbatim

All from repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio`, branch
`feat/set-bonus-value`.

### 1. Read the loop state and priors

```
Read .scratch/set-bonus-value/loop-103-106/DIRECTOR.md
Read .scratch/set-bonus-value/loop-103-106/01-payload-dump.md
Read .scratch/set-bonus-value/loop-103-106/02-helm-ab.md
Read .scratch/set-bonus-value/loop-103-106/03-package-gap.md
```

### 2. How `deltaDps` is actually computed

```
Grep "deltaDps|baselineDps|iterations|simSeed|randomSeed" packages/core/src/rank.ts -n
Read packages/core/src/rank.ts (470-590, 590-750, 855-965)
Grep "DEFAULT_ITERATIONS|DEFAULT_SEEDS|PAIRED_REPLICATE_TOP_N" packages/core/src -n
```

Findings, at file:line:

- `rank.ts:603` — `const baselineDps = observation.dps;` — the baseline is one
  sim of the composed baseline request at `runOpts = { seed: seeds[0],
  iterations }` (`rank.ts:494-495`), i.e. **seed 11, 3000 iterations**
  (`DEFAULT_SEEDS = [11,22,33,44,55]` at `rank.ts:368`, `DEFAULT_ITERATIONS =
  3000` at `rank.ts:355`).
- `rank.ts:697` — `const deltaDps = candObs.dps - baselineDps;` — arm minus
  baseline, **same seed, same iteration count**. Not a stored constant.
- `rank.ts:882-931` — `replicateTopItems` overwrites `deltaDps` with a 5-seed
  paired mean, **but only for `!item.belowCutoff` rows** (`rank.ts:889-891`).
  Both helms are `belowCutoff: true` in the artifact, so their `deltaDps` is
  the **single-seed (seed 11) figure from line 697**, and their `seMethod` is
  `"independent"` — which the artifact confirms.

So production uses **1 seed** where subagent 02 used a 5-seed mean. That is a
real methodological difference, but it is worth well under 1 DPS here (see §5),
not 15.

### 3. Confirmed the artifact field is the plain single-swap delta

```bash
node -e "
const d=JSON.parse(require('fs').readFileSync('.scratch/rank-reports/shredzepelin-p3.json','utf-8'));
const r = d.ranking||d;
console.log('top keys', Object.keys(r));
console.log('baseline', JSON.stringify(r.baseline));
const it=(r.items||[]).filter(i=>i.itemId===32235||i.itemId===33672);
console.log(JSON.stringify(it,null,1));
"
```

Output (abridged to the load-bearing fields):

```
top keys [ 'contentHash','cutoff','fight','baseline','assumptions','caps',
           'substitutions','items','setBonuses','plausibilityWarnings' ]
baseline {"dps":2152.099805582717,"stdev":128.1817223820647,"metaAdjusted":false}

itemId 33672  deltaDps -202.0497000465648  se 3.4553881524263477  seMethod "independent"  belowCutoff true
itemId 32235  deltaDps -202.13357422161994 se 3.615261362016318   seMethod "independent"  belowCutoff true
```

`deltaDps` is the only delta field on these entries — no weighted, EP-adjusted,
or view-mode variant. There is no `prospectiveBonusDps` on either. **Ruled out:
"the report is showing a different field."**

Also note `baseline.dps = 2152.0998`, exactly the guard subagent 02 hit
(2152.10 at seed 11). **The baseline agrees; the displacement is in the arm.**

### 4. The decisive experiment — field-level diff of the two request JSONs

Wrote `.scratch/set-bonus-value/loop-103-106/dump-requests.ts`: builds the
production request for BASE / CURSED / VENG through the **real, unmodified
exported** `equipmentForCandidateSwap` (`rank.ts:1424`) and the **real**
`compose` (`packages/core/src/compose.ts:21`), with race resolved the way
`rank.ts:447` does (`raceFromSkeleton`, `rank.ts:1376`) and the same skeleton
`data/presets/feral/p2.raid-sim-skeleton.json` that `cli.ts:282` hardcodes.
Baseline equipment reconstructed exactly as `rank.ts:472-475` does (the
`applyRepairedGems` copy is verbatim, and is used for the *baseline only* —
both swap arms go through the real exported function).

```bash
pnpm exec tsx .scratch/set-bonus-format/loop-103-106/dump-requests.ts
```
(actual command, verbatim:)
```bash
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/dump-requests.ts
```
Output:
```
BASE written
CURSED written
VENG written
race used: "RaceNightElf"
```

Then diffed production's CURSED request against subagent 02's harness CURSED
request leaf-by-leaf:

```bash
node -e "
const fs=require('fs');
function load(p){return JSON.parse(fs.readFileSync(p,'utf-8'));}
const prod=load('.scratch/set-bonus-value/loop-103-106/prod-requests/CURSED.req.json');
const harn=load('.scratch/set-bonus-value/loop-103-106/sims-106-helms/3k-CURSED-11.req.json');
function flat(o,pre,out){out=out||{};for(const k in o){const v=o[k];const kk=pre?pre+'.'+k:k;if(v&&typeof v==='object'){flat(v,kk,out);}else out[kk]=v;}return out;}
const a=flat(prod,''),b=flat(harn,'');
const keys=new Set([...Object.keys(a),...Object.keys(b)]);
let n=0;
for(const k of [...keys].sort()){if(JSON.stringify(a[k])!==JSON.stringify(b[k])){console.log(k,'PROD=',JSON.stringify(a[k]),'HARNESS=',JSON.stringify(b[k]));n++;}}
console.log('total differing leaves:',n);
"
```

Output, verbatim — **every** differing leaf in the entire request:

```
raid.parties.0.players.0.equipment.items.2.gems.0 PROD= 32220 HARNESS= 24028
raid.parties.0.players.0.equipment.items.2.gems.1 PROD= 32220 HARNESS= 24028
raid.parties.0.players.0.equipment.items.4.gems.0 PROD= 30549 HARNESS= 24028
raid.parties.0.players.0.equipment.items.4.gems.1 PROD= 32212 HARNESS= 24028
raid.parties.0.players.0.name PROD= "shredzepelin" HARNESS= "feral"
simOptions.debugFirstIteration PROD= undefined HARNESS= false
simOptions.iterations PROD= undefined HARNESS= 3000
simOptions.randomSeed PROD= undefined HARNESS= "11"
```

The `simOptions` rows are expected (`compose` deletes `simOptions`,
`compose.ts:26`; the runner adds them). `name` is cosmetic. **The only
substantive difference is four gems.**

Per-item view:

```bash
node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('.scratch/set-bonus-value/loop-103-106/prod-requests/CURSED.req.json','utf-8'));
const h=JSON.parse(fs.readFileSync('.scratch/set-bonus-value/loop-103-106/sims-106-helms/3k-CURSED-11.req.json','utf-8'));
const pi=p.raid.parties[0].players[0].equipment.items, hi=h.raid.parties[0].players[0].equipment.items;
for(let i=0;i<pi.length;i++){const a=JSON.stringify(pi[i]),b=JSON.stringify(hi[i]);if(a!==b)console.log(i,'PROD',a,'\n  HARN',b);}
"
```
```
2 PROD {"id":29100,"enchant":2983,"gems":[32220,32220]}
  HARN {"id":29100,"enchant":2983,"gems":[24028,24028]}
4 PROD {"id":29096,"enchant":2661,"gems":[30549,32212,24028]}
  HARN {"id":29096,"enchant":2661,"gems":[24028,24028,24028]}
```

Gem stats from the vendored db (`stats` index 1 = agility, index 2 = stamina,
index 20 = crit rating):

```bash
node -e "
const db=JSON.parse(require('fs').readFileSync('vendor/wowsims/db.json','utf-8'));
const g={};for(const x of db.gems||[])g[x.id]=x;
for(const id of [24028,32220,30549,32212,32194,32409]) console.log(id, g[id]&&g[id].name, g[id]&&g[id].color, JSON.stringify(g[id]&&g[id].stats));
"
```
```
24028 Delicate Living Ruby           color 2  agi 8
32220 Glinting Pyrestone             color 6  agi 5, crit 5
30549 Shifting Tanzanite             color 7  agi 5, sta 6
32212 Shifting Shadowsong Amethyst   color 7  agi 5, sta 7
32194 Delicate Crimson Spinel        color 2  agi 10
32409 Relentless Earthstorm Diamond  color 1  (meta) agi 12
```

**Net stat cost of the production regem: −12 agility** (4 gems × 3 agi), traded
for +5 crit rating and +13 stamina. On a feral cat that is a straight DPS loss
of the right order.

### 5. Confirming the mechanism reproduces the artifact exactly

Wrote `.scratch/set-bonus-value/loop-103-106/sim_prod_requests.py`, which sims
the three request JSONs dumped in step 4 **byte-for-byte as dumped** (only
`simOptions` added), seeds 11/22/33/44/55, 3000 iterations, same `resolve_cli`
pattern as the established scripts. Sim outputs under
`.scratch/set-bonus-value/loop-103-106/sims-04/`.

```bash
python .scratch/set-bonus-value/loop-103-106/sim_prod_requests.py
```

Full output, verbatim:

```
  BASE      2152.10   2152.02   2152.16   2152.07   2152.31   mean=  2152.13  seed11=  2152.10
  CURSED    1949.97   1949.78   1950.23   1950.37   1950.38   mean=  1950.15  seed11=  1949.97
  VENG      1950.05   1950.18   1950.12   1949.96   1949.68   mean=  1950.00  seed11=  1950.05

  CURSED delta vs BASE (5-seed mean) =  -201.98
  CURSED delta vs BASE (seed 11 only) =  -202.13
  VENG delta vs BASE (5-seed mean) =  -202.13
  VENG delta vs BASE (seed 11 only) =  -202.05

  CURSED - VENG (5-seed) =    +0.15
```

**Exact reproduction of the stored artifact, to two decimal places, on the
single-seed figure production actually stores:**

| item | artifact `deltaDps` | this run, seed 11 | this run, 5-seed mean | subagent 02 |
|---|---|---|---|---|
| CURSED 32235 | **−202.13357** | **−202.13** | −201.98 | −185.46 |
| VENG 33672 | **−202.04970** | **−202.05** | −202.13 | −188.30 |

The seed-11 match is not approximate — it lands on the stored value's first two
decimals for both items independently. That closes the loop: the pipeline's
stored numbers are exactly what you get by simming the payload production
builds. The ~15 DPS was entirely subagent 02's harness.

Note also the 5-seed means (−201.98 / −202.13) sit within 0.15 DPS of the
seed-11 figures, which **prices the single-seed methodology at well under
1 DPS** on these arms — the seeds-vs-mean question was a real candidate and is
now ruled out as an explanation for anything at this magnitude.

## Where the mechanism lives, at file:line

The regem is not a bug — it is `repairMeta` doing its job inside the swap
builder. Chain, all in `packages/core/src/rank.ts`:

- `rank.ts:663` — the candidate loop calls
  `equipmentForCandidateSwap(equipment, slotIndex, entry.itemId, gems)`.
- `rank.ts:1424` — `equipmentForCandidateSwap`, whose documented pipeline is
  `migrateGemsToItem` → `fillEmptyCandidateGems` → `repairMeta`
  (`rank.ts:1376-1452`).
- The helm introduces a **meta socket the baseline did not have** (worn
  Wolfshead Helm 8345 has no `gemSockets` at all — `01-payload-dump.md` §6),
  filled with `32409` Relentless Earthstorm Diamond, whose condition is
  `minRed:2, minYellow:2, minBlue:2` (`data/gems/meta-conditions.json`).
- shredzepelin's baseline is **all-red** (11× `24028`, `03-package-gap.md`), so
  the yellow and blue minimums are unmet. `repairMeta`
  (`packages/core/src/meta-repair.ts`) therefore recolours four gems on
  shoulder (29100) and chest (29096) to orange/purple hybrids to switch the
  meta on — paying 12 agility to do it.
- Both helms carry the **same** meta socket layout `[1,4]`, so **both arms pay
  the identical 12-agi tax**. That is why both were displaced by the same ~15
  DPS in subagent 02's comparison, and why the displacement cancelled out of
  the CURSED−VENG difference in 02's numbers but not in the report's.

## Does this explain ticket 106's collapsed ordering?

**Yes — and it reframes the ticket.** The report's CURSED−VENG = −0.084 is a
correct measurement of the arms production builds. My 5-seed run of the same
production requests gives CURSED − VENG = **+0.15**, equally flat. The two
helms genuinely sim within noise of each other **once the meta regem is
applied to both**.

Subagent 02's +2.84 / +4.97 gap favouring Cursed Vision is a measurement of a
*different pair of arms* — ones where the meta is socketed but its colour
condition is **not** satisfied, i.e. the meta gem is dead. So:

- 02's arms: meta present but inactive, all-red gems retained (8 agi each).
- Production's arms: meta active, four gems downgraded to 5 agi.

Both helms are better off with the meta active in absolute terms only if the
meta's value exceeds 12 agility; the sims say the reverse here — 02's
meta-inactive arms scored **~15 DPS higher**. **Hypothesis (untested):** on
this gear, `repairMeta` is turning the meta on at a net DPS *loss*, i.e. the
repair is not checking whether activation is worth its recolouring cost. That
is a distinct, potentially significant finding and I did not measure it
head-to-head (a proper test is: production CURSED arm vs the same arm with
`24028` restored on shoulder/chest and the meta left dead — that is precisely
02's arm, and it won by ~15 DPS, so the evidence already leans this way, but 02
was not running it as a controlled meta-value experiment).

What ticket 106 should now be about is **not** "why do the helms sim equal" —
they do sim equal, correctly — but either (a) the owner's ~+10 expectation
being measured on gear without this meta tax, or (b) whether `repairMeta`
should be activating a meta that costs more than it returns.

## Does it touch ticket 103's +64.07 vs +97 gap?

**Only weakly, and probably not.** The T6 package arm touches
shoulder/chest/hands/legs and **not the head**, so it introduces no new meta
socket; `01-payload-dump.md` confirms the package arm carries no meta at all
and `03-package-gap.md` measured `PKG_PROD` at +64.48 against the stored
+64.07 — already a match within noise. There is no ~15 DPS displacement to
find on the 103 side: the artifact and the direct sim already agreed there.

However, one real connection exists: the **baseline** shredzepelin's gear is
all-red `24028`, and 103's owner comparison is against a wowsims run the owner
gemmed themselves. If the owner's run has an active meta (with its own
recolouring already paid for in *both* arms), then their baseline and package
arm both differ from ours, and the +64 vs +97 gap could partly sit in that
baseline difference rather than in the package arm. **Untested.** The
displacement mechanism found here does not itself appear in 103's numbers.

## What I ruled out

- **The artifact showing a different/adjusted field.** `deltaDps` is the only
  delta on those entries; no weighted or EP-adjusted variant exists there.
- **A baseline mismatch.** Stored `baseline.dps` 2152.0998; my BASE seed-11 sim
  2152.10. Identical.
- **Single-seed vs 5-seed methodology.** Worth <0.2 DPS on these arms
  (measured, §5), not 15.
- **Sim settings / skeleton / iterations divergence.** The full leaf-level
  request diff in §4 shows *zero* differing fields outside the four gems, the
  cosmetic player name, and the runner-supplied `simOptions`.
- **Any transformation between `equipmentForCandidateSwap` and the SimRunner.**
  `compose` (`compose.ts:21-51`) only sets name/race/equipment and strips
  `simOptions`/`requestId`. Nothing else touches the payload.

## Suggested fix, for the director to decide on

**There is nothing to fix in the delta computation** — it is correct. The open
question the evidence raises is whether `repairMeta` should activate a meta gem
unconditionally, or only when activation is a net EP/DPS gain over leaving the
condition unmet. That is a design question, not a bug fix, and it is squarely
what the ~15 DPS is. Recommend a new ticket for it rather than folding it into
103 or 106.

Subagent 02's `02-helm-ab.md` conclusions about "a ~15 DPS report-vs-direct-sim
gap" should be marked **resolved — harness error**, and its +2.84/+4.97
CURSED−VENG figure re-labelled as a meta-inactive-arms measurement, not a
measurement of production's arms.
