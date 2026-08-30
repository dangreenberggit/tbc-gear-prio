# Trustworthiness probe: can the fork's healer/tank sims rank gear?

**Status:** empirical probe complete. No production code changed.
**Question (from `options.md` §Recommendation):** do the fork's healer and tank
sims produce **stable, meaningful** non-DPS numbers, and are the **EP presets
real**? This gates the whole A/B/C decision — if the numbers are noisy or
degenerate, healers/tanks fail regardless of the §3 objective refactor.

**Method:** real `wowsimcli sim` runs against `RaidSimRequest` protojson
assembled from the fork's own presets, plus source inspection of the fork's Go
sim and the six specs' `presets.ts`/`sim.ts`. Every number below names the
command that produced it. Sim inputs and outputs are under `.scratch/probe/`;
the assembler scripts are in the session scratchpad (not committed).

**Pinned CLI:** `./vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe`
(commands `decodelink`, `sim` only — no `statweights`).

**Headline verdict:** **Tanks TRUSTWORTHY, healers UNTRUSTWORTHY.** The tank
survival metrics (TMI, DTPS, threat, chance-of-death) are populated, remarkably
stable, and sensitive to gear across two independent tank classes. **Every one
of the three healer specs is a non-functional stub in this fork build** — the
sim cannot produce a non-zero HPS for any of them, for three distinct reasons.

---

## How the sims were assembled

The cheapest route worked: adapt `data/presets/ret/p2.raid-sim-skeleton.json`
by replacing the player object with the target spec's class, race,
spec-options, gear (from the fork's `gear_sets/*.json`), talents string, and
APL (from the fork's `apls/*.json`), then set `raid.tanks = [{type:Player,
index:0}]` for tanks. This produces a valid `RaidSimRequest` with no share link
and no `decodelink` needed. Assemblers: `build_protwarr.py`, `build_bear.py`,
`build_holypal.py`, `build_pw_gear.py` (scratchpad).

The sim output proto keys (protojson camelCase) come from
`vendor/tbc-new-fork/proto/api.proto:300-360`:
`UnitMetrics` carries `dps, threat, dtps, tmi, hps, tto` (each a
`DistributionMetrics{avg,stdev,max,min,...}`) plus scalar `chanceOfDeath` and
`secondsOomAvg`. `RaidMetrics` (`api.proto:347`) carries only `dps` and `hps`;
**all tank survival metrics are per-unit only**, read from
`raidMetrics.parties[0].players[0]`.

---

## Q1 — Can a non-DPS sim run, and does it emit HPS / TMI-DTPS?

### Tanks: YES, cleanly.

Prot warrior, P2-BIS gear, 5000 iterations:

```
wowsimcli sim --infile .scratch/probe/protwarr_s1.req.json --outfile .scratch/probe/protwarr_s1.out.json
# → "All 20 sims finished successfully."
```

Player `UnitMetrics` (`.scratch/probe/protwarr_s1.out.json`):

| metric        | avg     | stdev (per-iter)     |
| ------------- | ------- | -------------------- |
| tmi           | 97.76   | 11.29                |
| dtps          | 1603.46 | 176.50               |
| threat        | 1461.18 | 50.03                |
| chanceOfDeath | 0.5096  | —                    |
| hps           | 0       | (tank does not heal) |
| tto           | 0       | (healer-only metric) |

Bear druid (P1 gear, 5000 iters, `build_bear.py` → `bear_p1.out.json`) runs
identically clean: `tmi=113.64 dtps=1807.2 threat=1878.0 cod=0.798`. Two
independent tank classes both produce the full survival metric set.

**Finding:** tank sims run on the CLI and populate TMI, DTPS, threat, and
chance-of-death with non-degenerate values. No blocker.

### Healers: NO — the sim cannot produce a non-zero HPS for any of the three.

Holy paladin, geared, APL = spam Holy Light rank 11 (`castFriendlySpell`,
target Self):

```
wowsimcli sim --infile .scratch/probe/holypal_s1.req.json --verbose
# → Thread had an error. Cancelling all sims!
# error: "runtime error: invalid memory address or nil pointer dereference"
#   core.(*Spell).CritDamageMultiplier ... spell.go:753
#   core.(*Spell).outcomeHealingCrit  ... spell_outcome.go:150
#   paladin.registerHolyLight.func1   ... paladin/healing.go:68
```

This is an **engine crash on the first healing crit**, not a bad input. The
gear and talents loaded fine; the panic fires inside `CalcAndDealHealing`.
Root cause (`sim/core/spell_outcome.go:138-150`): `OutcomeHealingCrit` calls
`spell.outcomeHealingCrit(sim, result, nil, true)` — it passes `attackTable =
nil` — and `CritDamageMultiplier` (`spell.go:753`) dereferences
`at.CritMultiplier`. **Any healing crit dereferences nil.** Every paladin and
shaman heal routes through `OutcomeHealingCrit`
(`grep -rn "OutcomeHealingCrit" sim/` → `paladin/healing.go:68,121,176`,
`paladin/holy_shock.go:81`, `shaman/_heals.go:...`), so this is not
holy-paladin-specific.

The other two healers never even get that far — see Q3/Q4.

**Finding:** no healer produces HPS through the CLI. The holy paladin blocks at
`sim/core/spell.go:753` (nil attack table on healing crit).

---

## Q2 — Are the numbers stable across seeds?

Tanks only (healers produce no number to measure). Prot warrior, 5 distinct
random seeds. `simOptions.randomSeed` genuinely reseeds the RNG (values differ
across seeds at low iteration counts, converge at high — confirmed below).

**500 iterations, seeds {11,22,33,44,55}** (`pw_lo_*.out.json`):

| metric        | mean    | across-seed SE(mean) | relative SE |
| ------------- | ------- | -------------------- | ----------- |
| tmi           | 97.31   | 0.059                | **0.06 %**  |
| dtps          | 1599.57 | 1.47                 | **0.09 %**  |
| threat        | 1459.65 | 0.19                 | **0.01 %**  |
| chanceOfDeath | 0.502   | 0.005                | **1.0 %**   |

**5000 iterations, seeds {1..5}** (`protwarr_s{1..5}.out.json`): all metrics
converge to a cross-seed SE below 0.02 in absolute terms (tmi mean 97.762, SE
0.001).

**Comparison to the DPS floor.** The DPS cutoff exists because DPS has a ~1.7
DPS five-seed SE (`foundation.md` §4; `cutoff.ts` records ret SE≈1.678,
feral≈1.774 at 5000 iters — a relative SE of roughly 0.2-0.5 % on a ~350-800
DPS mean). **TMI's and DTPS's relative spread (0.06-0.09 % at only 500 iters) is
comparable to or tighter than DPS's**, contradicting the `options.md`
_hypothesis_ that TMI would be a spiky, noise-dominated tail index. In this fork
build TMI is a well-behaved mean. `chanceOfDeath` is the noisiest of the four
(≈1 % relative at 500 iters, a tail probability) but still usable and it tightens
with iterations.

**Finding:** tank metrics are stable. TMI and DTPS need no more iterations than
DPS to reach a usable noise floor; chance-of-death is noisier but serviceable.

---

## Q3 — Are the EP presets real?

Inspected all six `presets.ts` + `sim.ts`. **None are stubbed, empty, all-zero,
or copied from DPS.** All ship a real weight vector with a role-appropriate
`epReferenceStat`, and tanks declare `tankRefStat = StatStamina`.

**Tanks — rich, survival-weighted vectors:**

Prot warrior (`ui/warrior/protection/presets.ts:37-62`; `sim.ts:44-45`,
`epReferenceStat=StatStrength`, `tankRefStat=StatStamina`):

```
Stamina 1.15, Defense 0.41, BlockValue 0.57, Parry 0.51, Expertise 2.01,
Agility 0.83, Strength 0.61, MeleeHit 0.35, MeleeCrit 0.5, MeleeHaste 0.41,
Block 0.01, Resilience 0.02, Armor 0.06, BonusArmor 0.06, ArmorPen 0.09,
AttackPower 0.25, + MainHandDps 3.15 (pseudo)
```

Prot warrior also ships `epRatios: [0,0,0.6,0,1.15,0]` (`sim.ts:21`) — a
survival/threat _blend_ — and full `statCaps` including a **crit-immunity cap**
(`sim.ts:84-87`), plus a shipped `HealingModel` (hps 2200) in `OtherDefaults`.

Bear druid (`ui/druid/feralbear/presets.ts:57-75`): 17-stat vector, Stamina
1.025, Defense 0.326, Dodge 0.228, Expertise 2.147, Resilience 0.388, etc.
Prot paladin (`ui/paladin/protection/presets.ts:69-92`): 19-stat vector,
Stamina 1.5, Defense 0.8, Dodge 0.7, Parry 0.65, Block 0.5, BlockValue 0.4, etc.

**Healers — real but thin (spell/mana stats only):**

| spec         | EP weights                                    | reference                                |
| ------------ | --------------------------------------------- | ---------------------------------------- |
| Holy paladin | Int 1.375, Spirit 1.125, SpellDmg 1.0         | `ui/paladin/holy/presets.ts:20-24`       |
| Resto shaman | Int 0.22, Spirit 0.05, SpellDmg 1.0, MP5 0.08 | `ui/shaman/restoration/presets.ts:25-29` |
| Resto druid  | Int 0.38, Spirit 0.34, SpellDmg 1.0, MP5 0.0  | `ui/druid/restoration/presets.ts:23-27`  |

**Finding:** EP presets are transcribable (like the DPS specs). Tank presets are
substantial; healer presets are real but minimal. **Caveat:** a healer EP preset
is only meaningful against a working healing sim — and the healing sim does not
work (Q1/Q4). The healer EP numbers are hand-authored constants, _not_ validated
against this build's sim, and cannot be, because the sim crashes/no-ops.

---

## Q4 — Sanity of the objective per role (what's actually populated)

### Tank: which survival metrics are non-degenerate, and which to rank by?

All four survival metrics are populated and **respond coherently to gear**. Prot
warrior across three gear tiers, 5000 iters (`pw_preraid` / `protwarr_s1` /
`pw_p5` `.out.json`):

| gear     | tmi    | dtps   | threat | chanceOfDeath |
| -------- | ------ | ------ | ------ | ------------- |
| Pre-raid | 120.71 | 1733.9 | 1184.3 | 0.895         |
| P2-BIS   | 97.76  | 1603.5 | 1461.2 | 0.510         |
| P5-BIS   | 56.03  | 1244.0 | 1578.4 | 0.001         |

Bear echoes this (P1→P5: tmi 113.6→67.8, dtps 1807→1325, cod 0.80→0.01).

The signal-to-noise is enormous: a gear tier moves TMI by 20-40 units against a
cross-seed SE of ~0.06. **TMI and DTPS are both clean ranking objectives.**
`threat` moves the _opposite_ way (rises with better gear — it is a throughput
concern, not survival), so it is a valid selectable metric but the wrong
default. `chanceOfDeath` is a coherent survival summary but saturates (0.001 at
P5) and is the noisiest.

**Sensible default: TMI** — it is the fork's purpose-built survival index, the
metric the tank EP presets reference (`tankRefStat`), stable, and monotonic in
gear quality. DTPS is a good secondary. This matches `options.md`'s TMI-default
recommendation, now backed by numbers.

**One correctness caveat carried from the foundation, confirmed:** prot warrior
ships a `critImmunityCap` (uncrit cap) in `statCaps` (`sim.ts:84-87`), but the
engine's `CapProfile` has no vocabulary for it (`foundation.md` §4). TMI _does_
implicitly price crossing the uncrit cap (a crushable/crittable tank spikes
harder → higher TMI), so the ranking number degrades gracefully; the missing
piece is only the advisory cap flag, not the objective itself.

### Healer: is HPS a coherent single objective?

**Moot for all three healers in this build** — none produce HPS. But the proto
answers the well-posedness question the foundation raised: `UnitMetrics` exposes
`hps`, `tto` (Time To OOM), and `secondsOomAvg` (`api.proto:315-321`). So the
sim _does_ model a longevity/mana dimension alongside raw HPS — meaning "rank by
HPS alone" would be ill-posed for a mana-constrained encounter, exactly as
`options.md` §B warned. This matters only if the healing sim is ever fixed.

**Why each healer produces nothing (source-level, definitive):**

1. **Holy paladin** — heals are implemented (`sim/paladin/healing.go`, Holy
   Light / Flash of Light with `SpellFlagAPL|SpellFlagHelpful`) but crash on the
   first crit via the nil-attack-table bug (Q1). Blocked, not stubbed.
2. **Resto shaman** — the heal file is `sim/shaman/_heals.go`. **Go excludes
   files whose name starts with `_` from the build.** The shaman's healing
   spells are not compiled at all. A resto shaman casts nothing → HPS 0.
3. **Resto druid** — `sim/druid/restoration/restoration.go` registers the spec
   but `ApplyTalents()` is empty and **no heal spells are registered**. The
   struct declares `Rejuvenation *DruidSpell` etc. (`druid.go:62`) and defines
   spell-mask constants (`druid.go:131-152`), but nothing assigns them; a
   repo-wide grep finds no Rejuvenation/Regrowth/Lifebloom/Nourish/HealingTouch
   _registration_ anywhere in `sim/druid/`. The only healing code in the druid
   sim is bear Frenzied Regeneration and a talent proc, both non-resto. A resto
   druid casts nothing → HPS 0.

**Finding:** healer HPS is not merely noisy — it is **absent by construction** in
this fork build. All three healer specs are registered shells with real EP
constants but no working healing simulation.

---

## VERDICT

### Healers — **UNTRUSTWORTHY (blocks Option B/the healer half of C).**

The fork's healer sims cannot produce a non-DPS number. Resto shaman heals are
build-excluded (`_heals.go`), resto druid registers no heal spells, and holy
paladin crashes on the first healing crit (nil attack table, `spell.go:753`).
The EP presets are real constants but unvalidated and unusable without a working
sim. **Single most important caveat:** this is not a tuning or noise problem —
the healing simulation is _not implemented_ upstream, so shipping healers would
require fixing/writing the fork's healer sim first (an upstream engine effort far
larger than the §3 objective refactor). Until then, ranking healer gear is
impossible, not merely unreliable.

_Untested / not attempted:_ the WASM `statWeightCompute` path (the tab's real
sim path). But `statWeightCompute` runs the same Go sim under the hood via WASM;
the three defects above are in that shared `sim/` code, so WASM is expected to
hit the identical crash / zero-HPS (**hypothesis** — not run here, since the CLI
answer is already conclusive and the code is shared).

### Tanks — **TRUSTWORTHY (supports the tank half of C).**

Both tank classes tested (prot warrior, bear druid) run cleanly and populate
TMI, DTPS, threat, and chance-of-death. The numbers are stable (TMI/DTPS
relative cross-seed SE 0.06-0.09 % at 500 iters, comparable to or tighter than
DPS) and strongly sensitive to gear quality (a gear tier moves TMI 20-40 units
against ~0.06 SE). TMI is the sensible default objective; DTPS a good secondary.
**Single most important caveat:** the uncrit/defense **cap** that most defines
tank gearing has no representation in the engine's `CapProfile`
(`foundation.md` §4) — TMI implicitly prices crossing it so the _ranking number_
is still sound, but the advisory cap flags a tank most needs are missing until
`CapProfile` gains defensive vocabulary. Prot paladin was not sim-run here
(warrior + bear were sufficient to establish the objective); its EP preset is
the richest of the three and it shares the same engine survival path
(**expected** to behave identically — untested).

---

## Re-run index

```
CLI=./vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe
# Tank (works):
python build_protwarr.py 1 5000 .scratch/probe/protwarr_s1.req.json
$CLI sim --infile .scratch/probe/protwarr_s1.req.json --outfile .scratch/probe/protwarr_s1.out.json
# Healer (crashes):
python build_holypal.py 1 3000 .scratch/probe/holypal_s1.req.json
$CLI sim --infile .scratch/probe/holypal_s1.req.json --verbose   # nil-pointer panic
```

- Healer sim defects: `sim/core/spell.go:753`, `sim/core/spell_outcome.go:138-150`,
  `sim/paladin/healing.go:68`; `sim/shaman/_heals.go` (underscore = build-excluded);
  `sim/druid/restoration/restoration.go` (empty `ApplyTalents`, no heal registration).
- Metric proto: `vendor/tbc-new-fork/proto/api.proto:300-360`.
- EP presets: `ui/{paladin/holy,shaman/restoration,druid/restoration,warrior/protection,druid/feralbear,paladin/protection}/presets.ts`.
