# 05-meta-tax — is `repairMeta` activating the meta at a net loss?

## What I was asked

Iteration 4 of the combined 103/106 loop. Subagent 04 established that
production's `repairMeta` recolours four gems on shoulder 29100 and chest 29096
(four 8-agi `24028` → 5-agi `32220/32220/30549/32212`, net **−12 agility**) to
satisfy meta gem 32409's colour condition when a candidate helm introduces a
meta socket. 02's arms *without* that recolouring simmed ~15 DPS higher.

Test the hypothesis that `repairMeta` activates the meta unconditionally without
checking whether activation is worth its recolouring cost. Three parts:
controlled sims (META_ACTIVE / META_DEAD / NO_META), a file:line answer on
whether `repairMeta` weighs the trade, and the blast radius. Diagnose only.

## Answer up front

**The hypothesis is confirmed in its narrow form and refuted in its important
form, and the real defect is a different and worse one.**

1. **`repairMeta` does not weigh activation against its cost.** It decides to
   activate at `meta-repair.ts:67-70` on `initial.kind === "inactive"` alone,
   before any cost is considered. Its cost function
   (`meta-repair.ts:150-212`) only ever *ranks recolouring moves against each
   other* — it never compares "repair" against "don't repair". Confirmed at
   file:line.

2. **But this is mandated, not accidental.** PLAN.md line 37 and §9 policy item
   1 state the meta is "Always kept active". This is a deliberate design
   decision, so a fix needs a **spec amendment**, not a bug fix.

3. **The decisive finding, which was not the one I was sent to look for:** the
   ~15 DPS is **not** the price of a bad activation decision. `META_DEAD`
   outscores `META_ACTIVE` by +16.52 DPS **because the Go sim applies 32409's
   +3% crit-damage effect unconditionally, whether or not the colour condition
   is met.** I isolated this: a *dead* 32409 beats the best ordinary red gem by
   **+39.25 DPS** when its own 2 extra agility is worth only ~3.7. So
   `META_DEAD` is not a legal configuration — it is a configuration that cheats,
   collecting the meta's headline effect for free while paying none of the
   colour cost. PLAN.md §9 opens by naming exactly this ("The Go sim does not
   enforce meta gem activation... Drive it naively and you get impossible stats
   and a confidently wrong ranking").

4. **Against the only legal alternative, activation is a clear net WIN:**
   `META_ACTIVE` beats `NO_META` by **+22.40 DPS**. Production is making the
   right call on this gear. The helm deltas are **not** being depressed by a bad
   meta decision.

So the meta-tax hypothesis, as a source of error in our report, is **dead**. 04's
"~15 DPS higher" arms were higher only because they were exploiting the Go sim's
missing activation enforcement.

## Commands run, verbatim

All from repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio`, branch
`feat/set-bonus-value`. Read-only on `packages/`.

### 1. Context and source

```
Read .scratch/set-bonus-value/loop-103-106/DIRECTOR.md
Read .scratch/set-bonus-value/loop-103-106/04-artifact-vs-direct.md
Read .scratch/set-bonus-value/loop-103-106/sim_prod_requests.py
Read .scratch/set-bonus-value/loop-103-106/dump-requests.ts
Read packages/core/src/meta.ts
Read packages/core/src/meta-repair.ts
```

```bash
cat .scratch/carry-forward/issues/04-meta-activation-check.md
cat .scratch/carry-forward/issues/20-meta-gem-ep-model-blind-to-proc-effects.md
grep -rn -i "repairMeta\|meta repair\|meta activation\|minimum-EP-loss\|meta gem" spec.md PLAN.md docs/adr/
sed -n '640,700p' PLAN.md
```

### 2. Building the three controlled arms

Wrote `.scratch/set-bonus-value/loop-103-106/build-meta-arms.ts`. It starts from
04's **production** `CURSED.req.json` (built through the real, unmodified
`equipmentForCandidateSwap`) and mutates only gems, then reports each arm's
status through the **real production `metaStatus`** from
`packages/core/src/meta.ts`.

```bash
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-meta-arms.ts
```

Output, verbatim:

```
META_ACTIVE:
  head 32235 sockets [1,4]
  head gems [32409,32194]
  shoulder 29100 gems [32220,32220]
  chest 29096 gems [30549,32212,24028]
  metaStatus = {"kind":"active","metaId":32409,"counts":{"red":12,"yellow":2,"blue":2}}
META_DEAD:
  head 32235 sockets [1,4]
  head gems [32409,32194]
  shoulder 29100 gems [24028,24028]
  chest 29096 gems [24028,24028,24028]
  metaStatus = {"kind":"inactive","metaId":32409,"counts":{"red":12,"yellow":0,"blue":0},"description":"Requires at least 2 Red Gems, at least 2 Yellow Gems, and at least 2 Blue Gems."}
NO_META:
  head 32235 sockets [1,4]
  head gems [32194,32194]
  shoulder 29100 gems [24028,24028]
  chest 29096 gems [24028,24028,24028]
  metaStatus = {"kind":"no-meta-gem"}
```

**All three arms verified with the real `metaStatus` as required**: ACTIVE,
INACTIVE (condition genuinely unmet — 0 yellow, 0 blue against a
`minRed:2 minYellow:2 minBlue:2` requirement), and no-meta-gem.

**Why 32194 for `NO_META`.** It is the best ordinary red agility gem available:

```bash
node -e "
const db=JSON.parse(require('fs').readFileSync('vendor/wowsims/db.json','utf-8'));
for(const g of db.gems||[]){
  if(g.color!==2) continue;
  const s=g.stats||[];
  if((s[1]||0)>=8) console.log(g.id, g.name, 'phase',g.phase, 'unique',!!g.unique, 'agi',s[1], 'req',g.requiredProfession);
}"
```
```
24028 Delicate Living Ruby phase 1 unique false agi 8 req undefined
32194 Delicate Crimson Spinel phase 3 unique false agi 10 req undefined
```

32194 is the only red agi gem above 24028 in the whole db, is phase-3 (in
palette), non-unique, and profession-free — and it is already the gem production
itself picks for the helm's *other* socket. No better ordinary red exists.

### 3. The controlled sim — 4 arms, seeds [11,22,33,44,55], 3000 iterations

Wrote `.scratch/set-bonus-value/loop-103-106/sim_meta_arms.py`, reusing
`sim_prod_requests.py`'s `resolve_cli` / `run_sim` pattern verbatim. Sim outputs
under `.scratch/set-bonus-value/loop-103-106/sims-05/`. BASE is 04's
`prod-requests/BASE.req.json` unmodified.

```bash
python .scratch/set-bonus-value/loop-103-106/sim_meta_arms.py
```

Full output, verbatim:

```
  BASE          2152.10   2152.02   2152.16   2152.07   2152.31   mean=  2152.13  seed11=  2152.10
  META_ACTIVE   1949.97   1949.78   1950.23   1950.37   1950.38   mean=  1950.15  seed11=  1949.97
  META_DEAD     1966.70   1966.40   1966.55   1966.87   1966.83   mean=  1966.67  seed11=  1966.70
  NO_META       1927.80   1927.47   1927.63   1927.94   1927.90   mean=  1927.75  seed11=  1927.80

  META_ACTIVE  delta vs BASE: 5-seed mean  -201.98   seed11  -202.13
  META_DEAD    delta vs BASE: 5-seed mean  -185.46   seed11  -185.40
  NO_META      delta vs BASE: 5-seed mean  -224.38   seed11  -224.30

  META_ACTIVE - META_DEAD (5-seed) =   -16.52   (conditional meta bonus MINUS recolouring cost)
  META_ACTIVE - NO_META    (5-seed) =   +22.40   (whole meta-gem decision vs best ordinary red)
  META_DEAD   - NO_META    (5-seed) =   +38.92   (dead meta's own unconditional stats vs 32194)

  paired per-seed META_ACTIVE - META_DEAD:  -16.74   -16.61   -16.31   -16.49   -16.45
  paired per-seed META_ACTIVE - NO_META   :  +22.17   +22.31   +22.60   +22.43   +22.48
```

Both comparisons are **resolvable on every matched seed** — the paired spreads
are ~0.4 DPS wide against effects of 16.5 and 22.4. These are not noise.

`META_ACTIVE` seed-11 delta **−202.13** reproduces the stored artifact
`deltaDps` **−202.13357** exactly, and `META_DEAD` **−185.46** reproduces
subagent 02's **−185.46** exactly. Both anchors confirm the harness is building
the arms 04 and 02 respectively described.

### 4. The isolation that overturns the interpretation

`META_DEAD − NO_META = +38.92` was the number that did not fit. A dead 32409
(12 agi) versus 32194 (10 agi) is a 2-agility difference; 39 DPS is impossible
for 2 agility. So I isolated the head socket alone, holding shoulder/chest at
baseline `24028` in all three variants:

```bash
python -c "
import json,subprocess,sys,statistics
from pathlib import Path
ROOT=Path('.').resolve()
tag=json.loads((ROOT/'data/wowsims.lock.json').read_text())['tag']
cli=ROOT/'vendor'/f'wowsimcli-{tag}-win32-x64'/'wowsimcli-windows.exe'
OUT=ROOT/'.scratch/set-bonus-value/loop-103-106/sims-05'
base=json.loads((ROOT/'.scratch/set-bonus-value/loop-103-106/meta-arms/META_DEAD.req.json').read_text())
def sim(req,name,seed):
    req=json.loads(json.dumps(req))
    req['simOptions']={'iterations':3000,'randomSeed':seed,'debugFirstIteration':False}
    rp=OUT/f'{name}-{seed}.req.json'; op=OUT/f'{name}-{seed}.json'
    rp.write_text(json.dumps(req))
    subprocess.run([str(cli),'sim','--infile',str(rp),'--outfile',str(op)],check=True,capture_output=True)
    return json.loads(op.read_text())['raidMetrics']['dps']['avg']
variants={'ISO_META':[32409,24028],'ISO_32194':[32194,24028],'ISO_24028':[24028,24028]}
for n,gems in variants.items():
    r=json.loads(json.dumps(base))
    r['raid']['parties'][0]['players'][0]['equipment']['items'][0]['gems']=gems
    vals=[sim(r,n,s) for s in ('11','22','33','44','55')]
    print(f'{n:12s} head_gems={gems}', '  '.join(f'{v:8.2f}' for v in vals), f'mean={statistics.mean(vals):9.2f}')
"
```

Output, verbatim:

```
ISO_META     head_gems=[32409, 24028]  1964.83   1964.48   1964.64   1964.96   1964.92 mean=  1964.77
ISO_32194    head_gems=[32194, 24028]  1925.65   1925.32   1925.48   1925.60   1925.57 mean=  1925.52
ISO_24028    head_gems=[24028, 24028]  1921.99   1921.66   1921.82   1921.93   1921.93 mean=  1921.86
```

All three of these have the meta condition **unmet** (shoulder/chest are all-red
`24028`; counts would be `{red:12, yellow:0, blue:0}`).

**Calibrating the agility exchange rate from this repo's own sim:**
`ISO_32194 − ISO_24028 = +3.66 DPS` for **+2 agility** ⇒ **1 agi ≈ 1.83 DPS**.

**Then the anomaly:** `ISO_META − ISO_32194 = +39.25 DPS` for **+2 agility**
(12 vs 10), which the exchange rate says should be **~+3.7 DPS**. The unexplained
**~+35.5 DPS** is 32409's **+3% critical damage** effect being applied by the Go
sim with the colour condition unmet.

Corroborating that 32409's db record carries no other stats that could account
for it:

```bash
node -e "
const db=JSON.parse(require('fs').readFileSync('vendor/wowsims/db.json','utf-8'));
const g={};for(const x of db.gems||[])g[x.id]=x;
for(const id of [32409,32194,24028]){
  const x=g[id];
  console.log(id, x.name, 'color',x.color, 'phase',x.phase);
  console.log('   stats:', JSON.stringify((x.stats||[]).map((v,i)=>[i,v]).filter(p=>p[1])));
}"
```
```
32409 Relentless Earthstorm Diamond color 1 phase 1
   stats: [[1,12]]
32194 Delicate Crimson Spinel color 2 phase 3
   stats: [[1,10]]
24028 Delicate Living Ruby color 2 phase 1
   stats: [[1,8]]
```

32409's stat vector is agility 12 and **nothing else**. The +3% crit damage is
implemented inside the Go sim keyed on the gem id, not in the stat table — which
is precisely why our `epScore`-based EP model cannot see it (ticket 20) and why
the sim applies it regardless of activation (PLAN.md §9's opening line).

This is a **direct measurement**, not an inference: the effect size is isolated
to a single gem substitution in one socket, and the exchange rate used to net out
the agility is measured on the adjacent substitution in the same socket.

## Part 1 answer — what is meta 32409 worth here, net of recolouring?

Each arm isolates a different thing, and being precise about this is what
overturns the hypothesis.

| comparison | value | what it prices |
|---|---|---|
| `META_ACTIVE − META_DEAD` | **−16.52** | the conditional portion **plus** the −12 agi recolouring — but the baseline of the comparison is an **illegal** arm |
| `META_ACTIVE − NO_META` | **+22.40** | **the whole meta decision** against the best legal alternative |
| `META_DEAD − NO_META` | **+38.92** | the dead meta's own stats **plus** the illegitimately-granted crit-damage effect |

**`META_DEAD` is not a valid comparator.** A dead meta gem does contribute its
own non-conditional stats (12 agi) and does occupy a socket — that part of the
brief's framing is right. But in this sim it *also* contributes ~35 DPS of
conditional crit-damage that it has not earned, because the Go sim does not gate
the effect on the colour condition. So `META_ACTIVE − META_DEAD = −16.52` does
**not** price "the conditional portion plus recolouring". It prices
"recolouring cost (−12 agi ≈ −22 DPS) minus a crit-damage bonus the active arm
also has, plus the same bonus the dead arm should not have". The −16.52 is an
artefact of the sim's missing enforcement.

Decomposing it against the measured exchange rate: the recolouring costs 12 agi
≈ **−22.0 DPS**, and `META_ACTIVE − META_DEAD` is only −16.52, so the four
recoloured gems' +5 crit rating and +13 stamina return ~5.5 DPS of the loss.
Both arms hold the crit-damage effect, so it cancels — consistent with the
−16.52 being pure recolouring cost. **Hypothesis (arithmetic, not separately
simmed):** the recolour costs ≈16.5 DPS net.

**The legitimate question is `META_ACTIVE` vs `NO_META`, and activation wins by
+22.40 DPS.** Socketing 32409 and paying 12 agility to switch it on beats
socketing the best ordinary red gem, decisively and on every seed.

**So: activation is a net GAIN of +22.40 DPS here, not a loss.** `repairMeta` is
making the correct decision on this gear, and it is not depressing the helm
deltas. The premise of iteration 4's hypothesis — "on this agility-stacked feral
gear it is not [worth it]" — is **false as measured**.

## Part 2 answer — does `repairMeta` have a choice?

### Does it evaluate whether activating is worth the recolouring?

**No.** `packages/core/src/meta-repair.ts:67-70`:

```ts
const initial = metaStatus(headItem.sockets, allGemIds(items));
if (initial.kind !== "inactive") {
  return { items, metaAdjusted: false, swaps: [] };
}
```

The **only** gate on repairing is "is the meta currently inactive". If it is,
the loop at `meta-repair.ts:75-100` recolours until active or it throws
`MetaUnsolvableError`. There is no branch anywhere that compares the accumulated
repair cost against the benefit of activation, and no early exit on cost.

`bestRepairMove` (`meta-repair.ts:150-212`) computes a `cost` at
`meta-repair.ts:193-197`:

```ts
let cost =
  gemEp(from, opts.epWeights) - gemEp(candidate.id, opts.epWeights);
if (matchedBefore && !socketsMatch(slot.itemId, trialGems)) {
  cost += socketBonusEp(slot.itemId, opts.epWeights);
}
```

but that cost is used **only** at `meta-repair.ts:206` —
`if (!best || move.cost < best.cost) best = move;` — to pick the cheapest move
*among recolours*. It is never compared against a "do nothing" option, and it is
never summed and tested against a threshold. The function's contract is
"minimum-EP-loss repair", not "repair if worthwhile". `bestRepairMove` also
cannot express "don't repair": it returns `Move | null`, and `null` is treated
as unsolvable and **throws** (`meta-repair.ts:85-89`), not as "leave it dead".

### What objective does it optimise? Does EP price the meta's conditional bonus?

It optimises **EP loss of the recolouring**, via `epScore(gem.stats, weights)`
(`meta-repair.ts:129-134`) against `data/presets/feral/p1.ep-weights.json`.

**The EP model cannot price the meta's conditional bonus at all**, and this is
already a known, closed finding. Ticket 20
(`.scratch/carry-forward/issues/20-meta-gem-ep-model-blind-to-proc-effects.md`)
records it: 32409's headline effect is **+3% critical damage**, which is
multiplicative and **absent from a purely additive stat-EP model**. My
measurement above quantifies exactly what ticket 20 describes qualitatively:
that invisible effect is worth **~35 DPS** on this character, while the EP model
sees only its 12 agility.

This is the deeper structural point. **Even if you wanted `repairMeta` to weigh
activation against its cost, it could not do so correctly with the tools it
has** — the benefit side of that trade is exactly the term its EP model is blind
to. It would systematically under-value activation and, on this gear, would
reach the *wrong* answer (declining a repair that is worth +22.40 DPS). A naive
"only repair if EP-positive" fix would make the report worse, not better.

Ticket 20's own resolution line records that this was faced and settled:
`Resolution: PREFERRED_META_IDS in candidate-gems.ts; activation deliberately
not checked. 2026-07-30.`

### Is there an existing decision mandating always-activate?

**Yes, in PLAN.md, in two places.**

- **PLAN.md:37**, the policy summary table:
  `| Meta gems | Always kept active, via minimum-EP-loss repair — not re-optimization |`
- **PLAN.md §9 "Gem and enchant policy"**, the numbered policy, opening
  "**Policy** — applied identically to baseline and every candidate, which is
  the part that actually matters:"
  1. "If the head has a meta socket, assume the player keeps the meta active."
  2. "If baseline or a candidate would deactivate it, repair by **minimum EP
     loss** from the *current* gem layout. Repair, not re-optimization..."

§9's opening paragraph gives the reason: "The Go sim does **not** enforce meta
gem activation. Drive it naively and you get impossible stats and a confidently
wrong ranking." PLAN.md:897's risk table repeats it: `| Go sim ignores meta
activation | Impossible stats | Own solver; identical policy on baseline and
candidates |`.

My `META_DEAD` arm is a live demonstration of the "impossible stats" that policy
exists to prevent — it scores +38.92 DPS over the legal alternative by holding a
crit-damage bonus it does not qualify for.

Ticket `04-meta-activation-check.md` (Status: resolved) implemented this policy
and its "Done when" boxes are the always-activate behaviour:
"Inactive meta is repaired at minimum EP loss (PLAN §9), disclosed as a
substitution". No ADR under `docs/adr/` revisits it; the grep found only
`0019-contenthash-hashes-what-moves-a-number.md:74` noting EP weights "drive
meta repair and candidate gem fill, so they move numbers today."

**So current behaviour is spec-mandated. Changing it requires a PLAN.md §9
amendment, not a bug fix.**

## Part 3 answer — blast radius

```bash
node -e "
const fs=require('fs');
const d=JSON.parse(fs.readFileSync('.scratch/rank-reports/shredzepelin-p3.json','utf-8'));
const r=d.ranking||d;
const idx=JSON.parse(fs.readFileSync('data/items/index.json','utf-8'));
const META=1;
const rows=r.items||[];
const meta=rows.filter(it=>((idx[String(it.itemId)]||{}).sockets||[]).includes(META));
console.log('total candidate rows:', rows.length);
console.log('rows introducing a META socket:', meta.length);
console.log('slots:', JSON.stringify([...new Set(meta.map(m=>m.slot))]));
console.log('belowCutoff:', meta.filter(m=>m.belowCutoff).length, '/', meta.length);
meta.sort((a,b)=>b.deltaDps-a.deltaDps);
for(const m of meta) console.log('  ', m.itemId, String((idx[String(m.itemId)]||{}).name).padEnd(34), 'delta', m.deltaDps.toFixed(2).padStart(9), 'belowCutoff', m.belowCutoff);
"
```

Output, verbatim:

```
total candidate rows: 407
rows introducing a META socket: 8
slots: ["head"]
belowCutoff: 8 / 8

all meta-socket rows (best->worst stored deltaDps):
   33672 Vengeful Gladiator's Dragonhide Helm delta   -202.05 belowCutoff true
   32235 Cursed Vision of Sargeras          delta   -202.13 belowCutoff true
   31039 Thunderheart Cover                 delta   -211.95 belowCutoff true
   29098 Stag-Helm of Malorne               delta   -222.98 belowCutoff true
   30228 Nordrassil Headdress               delta   -225.86 belowCutoff true
   32240 Guise of the Tidal Lurker          delta   -260.32 belowCutoff true
   32329 Cowl of Benevolence                delta   -264.60 belowCutoff true
   32525 Cowl of the Illidari High Lord     delta   -275.00 belowCutoff true
```

The baseline genuinely has no meta socket, so all 8 truly *introduce* one:

```bash
node -e "
const idx=JSON.parse(require('fs').readFileSync('data/items/index.json','utf-8'));
const w=idx['8345'];
console.log('baseline head 8345', w.name, 'sockets', JSON.stringify(w.sockets), 'phase', w.phase);
const d=JSON.parse(require('fs').readFileSync('.scratch/rank-reports/shredzepelin-p3.json','utf-8'));
const r=d.ranking||d;
const head=(r.items||[]).filter(i=>i.slot==='head');
console.log('total head candidate rows:', head.length);
console.log('substitutions in report:', JSON.stringify(r.substitutions||[]));
"
```
```
baseline head 8345 Wolfshead Helm sockets [] phase 1
total head candidate rows: 18
substitutions in report: []
```

**Blast radius: 8 of 407 candidate rows (2.0%), all in the head slot, 8 of 18
head candidates, and all 8 already below cutoff.**

And since the measurement says activation is a **+22.40 DPS gain**, these 8 rows
are not being *undervalued* by the meta decision — the brief's "systematically
undervalued" framing does not hold. The 8 rows are far below cutoff (−202 to
−275) because Wolfshead Helm is a very strong feral baseline for reasons
unrelated to gems, not because of a meta tax.

**One disclosure gap worth flagging, and it is real:** `substitutions` is
**empty** in the stored report, yet production recolours four gems on every one
of these 8 arms. PLAN.md §9 policy item 5 requires "Every adjustment is recorded
as a `Substitution` and shown", and ticket 04's Done-when box claims
`substitutionsFromMetaRepair` delivers this. Either candidate-arm repairs are
not being disclosed (only baseline ones are), or disclosure is dropping. I did
not chase this — **out of scope for iteration 4, and worth its own ticket.**

## What I ruled out

- **"`repairMeta` activates the meta at a net DPS loss."** Refuted by direct
  measurement: `META_ACTIVE − NO_META = +22.40`, resolvable on all 5 seeds.
- **"The 8 meta-socket rows are systematically undervalued."** Refuted — they
  would be *worse* without the repair. Below-cutoff placement is not meta-driven.
- **"04's ~15 DPS is the price of a bad activation decision."** Refuted — it is
  the price of `META_DEAD` illegitimately collecting 32409's crit-damage effect
  with the condition unmet.
- **"A cheaper recolour exists that `repairMeta` missed."** Not tested
  end-to-end, but note the exchange-rate arithmetic accounts for the full −16.52
  as the 12-agi cost less the crit/stam return, leaving nothing unexplained that
  a better move would have to recover. **Hypothesis, not measured.**

## Is a fix warranted?

**Not the one iteration 4 was chasing.** Current behaviour is spec-mandated
(PLAN.md:37, §9 policy 1) *and* correct on this gear (+22.40 DPS). Making
`repairMeta` weigh the trade would require a PLAN.md §9 amendment **and** would
be actively harmful with today's EP model, because the benefit side of that
trade is exactly the term ticket 20 proves EP is blind to (~35 DPS here, seen as
0). **Recommend: no change to `repairMeta`'s activate/don't-activate decision,
and close the meta-tax hypothesis as refuted.**

Two things that *are* worth tickets, both out of scope here:

1. **Undisclosed candidate-arm substitutions.** `substitutions: []` in
   `.scratch/rank-reports/shredzepelin-p3.json` while 8 candidate arms silently
   recolour four gems each. PLAN.md §9 policy item 5 requires disclosure. This
   is a spec-compliance gap with no measurement risk but a real trust cost —
   exactly the "we changed your gems to make this legal" case §9 calls out.
   **Needs no spec amendment** — the spec already requires the disclosure.
2. **EP blindness to the meta's conditional effect (ticket 20, currently
   closed).** My isolation puts a number on it for the first time: **~35 DPS on
   this character**, versus an EP model that sees 12 agility. Ticket 20 was
   closed with `PREFERRED_META_IDS` hardcoding the right meta, which sidesteps
   the valuation problem rather than solving it. That workaround is load-bearing
   for more than it looks: **any** future code path that tries to reason about
   meta value in EP terms will be wrong by ~35 DPS. Worth recording the measured
   magnitude on ticket 20 so the next agent does not re-derive it.

## Bearing on tickets 103 and 106

- **106**: the meta tax is not the answer. Both helms pay an identical, and
  *correct*, activation cost; 04 already showed they sim within noise of each
  other once both pay it. The owner's ~+10 expectation remains unexplained, and
  the meta line of enquiry is now closed. **The remaining candidate is that the
  owner's arms differ from ours in something other than gems.**
- **103**: untouched, as 04 predicted — the T6 package arm never touches head
  and introduces no meta socket. The +64 → +97 gap still sits with
  `exposeWeaknessHunterAgility` phase pinning and the talent preset.
