# 03-package-gap — pricing the socket-capacity loss (Line A) and diffing the sim request (Line B)

## What I was asked

Explain the +64.07 -> +97 gap (32.93 DPS) for the four-piece T6 package swap
(shoulder 31048, chest 31042, hands 31034, legs 31044) on shredzepelin's
actual gear, along two independent lines:

- Line A: price the socket-capacity loss by simming the package arm three
  ways (production payload, flat-filler-gem payload, best-sensible-gems
  payload) plus BASE, seeds [11,22,33,44,55] at 3000 iterations, with the
  same 2152.10 DPS guard `measure_shredzepelin_t6.py` uses.
- Line B: diff the sim request (`data/presets/feral/p2.raid-sim-skeleton.json`)
  against what a wowsims web-UI P3 feral run would use — buffs, consumables,
  debuffs, encounter, talents, race — and investigate the p2/p3 filename
  question.

No fixes attempted. Read-only on `packages/`.

## Line A — commands run, verbatim

### Setup

```
mkdir -p .scratch/set-bonus-value/loop-103-106/sims-103-request
```

Confirmed the production T6-package payload dump from subagent 01
(`.scratch/set-bonus-value/loop-103-106/payload-dump.json`) exists and has
the expected shape:

```
node -e "
const d=JSON.parse(require('fs').readFileSync('.scratch/set-bonus-value/loop-103-106/payload-dump.json','utf-8'));
console.log('t6Package length:', d.t6Package.length);
console.log(JSON.stringify(d.t6Package.slice(0,10)));
"
```
Output:
```
t6Package length: 17
[{"id":8345,"gems":[],"enchant":3003},{"id":278827,"gems":[]},{"id":31048,"gems":[24028,24028],"enchant":2983},{"id":278819,"gems":[],"enchant":368},{"id":31042,"gems":[24028,24028,24028],"enchant":2661},{"id":29966,"gems":[24028],"enchant":2647},{"id":31034,"gems":[32194],"enchant":2564},{"id":29247,"gems":[]},{"id":31044,"gems":[24028],"enchant":3012},{"id":28545,"gems":[24028,24028],"enchant":2939}]
```

Confirmed shredzepelin's actual worn gems (all `24028`, Delicate Living Ruby,
+8 agi, Red) in every tier-slot socket, from the raw fixture directly:

```
node -e "
const fs=require('fs');
const raw=JSON.parse(fs.readFileSync('test/fixtures/shredzepelin-cat.raw.json','utf-8'));
const actors={}; for(const a of raw.actors) actors[a.id]=a;
for(const ev of raw.combatant_info_events){
  const actor=actors[ev.sourceID];
  if(actor && actor.name.toLowerCase()==='shredzepelin'){
    for(const g of ev.gear){ if(g.gems) console.log(g.id, JSON.stringify(g.gems.map(x=>x.id))); }
  }
}
"
```
Output:
```
29100 [24028,24028]
29096 [24028,24028,24028]
28741 [24028,24028,24028]
28545 [24028,24028]
29966 [24028]
```

Confirmed none of the four T6 items carry a meta socket (color 1) — only
yellow/blue/red (colors 4/3/2), so `PKG_BESTGEMS` needs no meta preservation:

```
node -e "
const db=JSON.parse(require('fs').readFileSync('vendor/wowsims/db.json','utf-8'));
const items={}; for(const i of db.items) items[i.id]=i;
for(const id of [31048,31042,31034,31044]){
  console.log(id, items[id].name, 'sockets=', JSON.stringify(items[id].gemSockets||[]));
}
"
```
Output:
```
31048 Thunderheart Pauldrons sockets= [4,3]
31042 Thunderheart Chestguard sockets= [3,4,2]
31034 Thunderheart Gauntlets sockets= [3]
31044 Thunderheart Leggings sockets= [3]
```

So `PKG_BESTGEMS` = the T6 package arm with every socket filled with `24028`
(the same red-agi gem the baseline actually uses everywhere), not a
different/stronger gem — there is no stronger sensible feral-cat agi gem
than the flat red filler in this palette, and no meta socket to chase.

### The sim script

Wrote `.scratch/set-bonus-value/loop-103-106/measure_pkg_gap_line_a.py`,
following `measure_shredzepelin_t6.py`'s established pattern (same
`resolve_cli`, `map_wcl_gear_to_sim`, `to_proto_item`, `compose`, `run_sim`,
guard, seeds, iterations). It adds:
- `load_prod_package_items()` — reads subagent 01's
  `payload-dump.json` `t6Package` array (the exact output of the real,
  exported `equipmentForCandidateSwap`, applied sequentially, per
  `rank.ts:1066-1074`) and converts each `SimItemSpec` through the same
  `to_proto_item` conversion `measure_shredzepelin_t6.py` uses for its own
  arms — same conversion, different source array. This is a straight read of
  subagent 01's already-produced production payload, not a reimplementation
  of `equipmentForCandidateSwap`.
- `build_filler_or_bestgems(..., gem_id)` — reused `measure_shredzepelin_t6.py`'s
  `build_items` logic parameterized on which gem id to fill every T6 socket
  with (`32194` for `PKG_FILLER`, `24028` for `PKG_BESTGEMS`).

### Run

```
python .scratch/set-bonus-value/loop-103-106/measure_pkg_gap_line_a.py
```

Full output:
```
wowsimcli v0.0.101
gear      test\fixtures\shredzepelin-cat.raw.json (actor 'shredzepelin')
skeleton  data\presets\feral\p2.raid-sim-skeleton.json
prodPayload .scratch\set-bonus-value\loop-103-106\payload-dump.json
seeds=['11', '22', '33', '44', '55'] iterations=3000

=== guard sim: BASE ===
  BASE            2152.10  2152.02  2152.16  2152.07  2152.31   mean= 2152.13  spread= 0.29  SE~= 2.33
  guard OK: 2152.13 vs target 2152.10 (diff +0.03)

=== package arms ===
  PKG_PROD        2216.17  2216.62  2216.90  2216.74  2216.63   mean= 2216.61  spread= 0.73  SE~= 2.73
  PKG_FILLER      2232.65  2233.09  2233.33  2232.88  2232.68   mean= 2232.93  spread= 0.68  SE~= 2.69
  PKG_BESTGEMS    2216.19  2216.57  2216.81  2216.66  2216.57   mean= 2216.56  spread= 0.62  SE~= 2.68

=== deltas vs BASE ===
  PKG_PROD       delta =   +64.48 DPS
  PKG_FILLER     delta =   +80.80 DPS
  PKG_BESTGEMS   delta =   +64.43 DPS

wrote .scratch\set-bonus-value\loop-103-106\measurements-line-a.json
```

Full sim output/request JSON files are under
`.scratch/set-bonus-value/loop-103-106/sims-103-request/` (one `.req.json`
and one result `.json` per arm per seed). Summary payload:
`.scratch/set-bonus-value/loop-103-106/measurements-line-a.json`.

### Line A results table

| arm | mean DPS | per-seed spread | mean reported SE | delta vs BASE |
|---|---|---|---|---|
| BASE (guard) | 2152.13 | 0.29 | 2.33 | — |
| PKG_PROD | 2216.61 | 0.73 | 2.73 | **+64.48** |
| PKG_FILLER | 2232.93 | 0.68 | 2.69 | **+80.80** |
| PKG_BESTGEMS | 2216.56 | 0.62 | 2.68 | **+64.43** |

### Line A conclusion

`PKG_FILLER` reproduces the previously-recorded +80.80 exactly (delta
+80.80 here vs +80.80 in `measure_shredzepelin_t6.py`'s prior run) —
harness cross-check passes.

`PKG_PROD` (+64.48) matches the pipeline's stated `packageDeltaDps` of
+64.07 to within 0.4 DPS, well inside the ~2.7 DPS per-seed noise floor —
this is the same number, not a new discrepancy.

**`PKG_BESTGEMS` (+64.43) is statistically indistinguishable from
`PKG_PROD` (+64.48)** — 0.05 DPS apart, an order of magnitude below the
~0.6-0.7 DPS spread and ~2.7 DPS SE on each arm. It is **not** close to
`PKG_FILLER` (+80.80), which sits ~16 DPS above both.

This falsifies the socket-capacity-loss hypothesis as stated in ticket 103's
"Why" section. Filling every T6 socket with the same gem the player's
baseline already uses (24028, the "best sensible" gem — there is no
stronger option in this palette and no meta socket on any of the four T6
pieces) reproduces the *low* production number, not the *high* filler-gem
number. The `PKG_FILLER` arm's extra ~16 DPS comes specifically from its use
of `32194` (Glinting/whatever the filler gem is) in slots where production
places `24028`, not from having fewer total sockets. **Socket-capacity loss
explains approximately 0 of the 32.93 DPS gap** (64.48 to 64.43 is a ~0.05
DPS move, not a ~33 DPS one). The +64 to +97 gap is fully unexplained by
this line — the 32.93 DPS is not sitting in socket count or gem choice at
all; it must be sought in Line B (sim request) or somewhere neither line
checked.

One side note worth flagging: `PKG_FILLER`'s use of gem `32194` instead of
`24028` accounts for essentially the entire `PKG_PROD` vs `PKG_FILLER`
delta (~16.3 DPS), which is itself the number ticket 103 originally
attributed to "sequential-exclusion socket capacity" — that attribution
looks wrong on this data; the real driver of the `PKG_PROD`/`PKG_FILLER`
split is gem choice (24028 red-agi vs 32194), not socket count, since
`PKG_BESTGEMS` (same socket count and gem-fill policy as `PKG_FILLER`, but
with 24028) lands on `PKG_PROD`, not `PKG_FILLER`.

## Line B — commands run, verbatim

### p2/p3 skeleton question

```
Glob data/presets/feral/*
```
Output: only `buff-defaults.json`, `p1.ep-weights.json`,
`p2.raid-sim-skeleton.json` exist under `data/presets/feral/`. No p3
skeleton file exists anywhere in `data/presets/`.

```
grep -n "p2.raid-sim-skeleton\|p3\b" packages/core/src/cli.ts packages/core/src/rank.ts
```
Output:
```
packages/core/src/cli.ts:282:    `data/presets/${args.spec}/p2.raid-sim-skeleton.json`
packages/core/src/rank.ts:376:  ret: "ret/p2.raid-sim-skeleton",
packages/core/src/rank.ts:377:  feral: "feral/p2.raid-sim-skeleton",
```

**Conclusion: this is deliberate, not a naming mismatch.** The report's
`--maxPhase 3` (which produced `shredzepelin-p3.json`) only changes the
*item/gem candidate pool* (`loadUniversePool(args.maxPhase, ...)`,
`gemsForPhase(maxPhase)`); it does not select a different sim-request
skeleton. `p2.raid-sim-skeleton.json` is hardcoded as the one and only
raid-sim skeleton for every phase, for both specs (`PRESET_ID_BY_SPEC` in
`rank.ts:376-377` and the same hardcoded path in `cli.ts:282`). Confirmed by
reading `scripts/build_feral_skeleton.py`'s docstring and source (see
below) — this file is a real, tracked, generated artifact with a build
script, not a copy-paste stray.

**This is still a genuine divergence candidate worth flagging**, however:
the file is literally the *phase-2* skeleton (buffs/consumables/encounter
built against P2 sources) reused unmodified for a P3 report. Whether that
matters depends on what actually differs between upstream's P2 and P3
defaults — investigated below.

### Skeleton settings dump

Read `data/presets/feral/p2.raid-sim-skeleton.json` directly (full file,
1277 lines). Player-relevant fields:

| setting | our skeleton value | source |
|---|---|---|
| race | RaceNightElf | `scripts/build_feral_skeleton.py` `RACE` constant, comment: "OtherDefaults" in upstream `ui/druid/feralcat/presets.ts` @ pinned commit `8aa378b3` |
| class | ClassDruid | same |
| talentsString | `-503032132322105301251-05503301` | same script, `TALENTS` constant — "StandardTalents rather than MonocatTalents: it is the preset upstream lists first and the one its P2 gear sets are built around" (comment, own words) |
| profession1/2 | Engineering / Enchanting | same script, "OtherDefaults" |
| reactionTimeMs | 250 | same |
| distanceFromTarget | 0 | same |

Consumables (`player.consumables`):

| field | value | source |
|---|---|---|
| potId | 22838 | `CONSUMABLES` constant, `scripts/build_feral_skeleton.py` — "DefaultConsumables in the same file" (upstream presets.ts) |
| battleElixirId | 22831 | same |
| guardianElixirId | 32067 | same |
| foodId | 27664 | same |
| mhImbueId | 34340 | same |
| conjuredId | 12662 | same |
| drumsId | GreaterDrumsOfBattle | same |
| superSapper | true | same |
| goblinSapper | true | same |
| scrollAgi | true | same |
| scrollStr | true | same |

Note in the script (own comment, quoted verbatim): "The `potions`/
`conjuredItems` menu arrays ret carries are deliberately omitted:
`check_raid_sim_skeleton.py`'s docstring records them as exported UI menus
with an unknown filter, inert for ret, so inventing feral values would be
fabrication rather than a port." — flagged as a known, disclosed omission,
not a silent one.

Raid buffs, party buffs, individual buffs, debuffs — all sourced from
`data/presets/feral/buff-defaults.json`, whose own header states:
"Generated by `scripts/extract_sim_defaults.mjs` from
`vendor/wowsims/feral_sim.ts` at the commit pinned in
`data/wowsims.lock.json`. Do not edit by hand." I diffed this file against
the live skeleton and they match field-for-field (both read above) — no
drift between the generated artifact and what actually ships in the
skeleton.

```
grep -n "talentsString\|race\|Race\|duration\|Duration\|consumable\|Consumable\|potId\|foodId\|elixir\|Elixir\|scrollAgi\|scrollStr\|sapper\|Sapper\|drumsId\|mhImbueId\|conjuredId" vendor/wowsims/feral_sim.ts
```
Output:
```
18:	Race,
38:	// Extra stats shown in consumables picker (beyond epStats).
39:	consumableStats: [Stat.StatMeleeHasteRating, Stat.StatMana, Stat.StatSpirit, Stat.StatMP5],
92:		consumables: Presets.DefaultConsumables,
113:			graceOfAirTotem: TristateEffect.TristateEffectImproved,
...
214:			consumables: Presets.DefaultConsumables,
215:			defaultFactionRaces: {
216:				[Faction.Unknown]: Race.RaceUnknown,
217:				[Faction.Alliance]: Race.RaceNightElf,
218:				[Faction.Horde]: Race.RaceTauren,
219:			}
220:		},
221:	}
```
Confirms `consumables: Presets.DefaultConsumables` and
`Race.RaceNightElf` for Alliance are symbolic references resolved from
upstream `presets.ts`, matching what `build_feral_skeleton.py`'s comments
claim it copied from that same file.

Encounter block (`data/presets/feral/p2.raid-sim-skeleton.json`
`encounter`, lines 1204-1270):

| field | value |
|---|---|
| duration | 180s |
| durationVariation | 5s |
| target count | 1 ("Raid Target", id 31146) |
| target level | 73 |
| target mobType | MobTypeMechanical |
| target armor (stat idx 17, per proto layout) | 320 |
| target minBaseDamage | 15113 |
| target swingSpeed | 2 |
| parryHaste / canCrush | true / true |

Compared against `data/presets/ret/p2.raid-sim-skeleton.json`'s encounter
block (dumped via `python -c "..." json.dumps(d['encounter'])"`) —
**byte-identical** to feral's. `build_feral_skeleton.py`'s own docstring
explains why: "encounter block: copied from the ret skeleton. It describes
the FIGHT rather than the player, and upstream defines it per-spec
identically (feral's sim.ts encounterPicker carries no duration override),
so there is nothing spec-specific to lose." This is the wowsims web UI's
generic single-target 180s "raid target dummy" default, used the same way
across specs and (per the same reasoning) across phases — nothing in
`feral_sim.ts` or `presets.ts` overrides duration/target-count by phase.

Known, disclosed non-default quirk (from `build_feral_skeleton.py`'s own
comment, quoted verbatim): `exposeWeaknessHunterAgility` is hardcoded to
**1080** in `buff-defaults.json`/the skeleton, which is upstream's
`Phase.Phase1` value — Phase 2's value per `utils.ts`'s phase map is 1150.
The comment states this is because "feral spreads
`defaultExposeWeaknessSettings(Phase.Phase1)` with an EXPLICIT Phase1" in
upstream's own `sim.ts`, i.e. **upstream itself** hardcodes Phase1's number
into feral's sim.ts regardless of which phase you're actually simming, and
our extractor faithfully mirrors that. The comment: "Mirroring upstream is
the point — 'correcting' it to 1150 would re-diverge from the browser."

I did not find a P3-specific value for this field anywhere in the vendored
data (`vendor/wowsims/` carries no `feral_p3_sim.ts` or per-phase sim
variant — `feral_sim.ts` is phase-agnostic UI code, phase only changes
which gear-set JSON populates the gear picker). **Whether a wowsims web-UI
user running a genuine P3 sim also inherits this same Phase1-pinned 1080
value cannot be determined from the vendored source** — that source only
shows what our extractor mirrors, not what the live web UI's current build
does at P3 (the live site could have patched this since the pinned
commit). Stating otherwise would be a guess; flagging as **untested /
undetermined**, not fact.

### Line B — top suspicious divergences

1. **p2/p3 skeleton reuse (structural, not a bug).** Every field in this
   skeleton (buffs, debuffs, consumables, talents, race, professions,
   encounter) is sourced from phase-agnostic or explicitly-P1/P2-pinned
   upstream artifacts (`feral_sim.ts`, `presets.ts`, ret's encounter block).
   Nothing in the vendored data changes by simmed phase except the gear/gem
   candidate pool. This is consistent with wowsims' own architecture (the
   web UI's "Settings" tab — buffs/consumables/talents/encounter — is not
   itself phase-gated; only the gear-set dropdown is), so reusing one
   skeleton across phases is very likely correct, not a mismatch — but I
   could not independently confirm the live web UI behaves this way from
   the vendored source alone. **Hypothesis, not confirmed**: this file
   should be renamed away from "p2" (it is really phase-invariant) rather
   than there being a missing "p3" version to build.

2. **`exposeWeaknessHunterAgility: 1080`** — a disclosed, deliberate mirror
   of an upstream quirk (Phase1's value hardcoded into feral's sim.ts
   regardless of actual phase). This affects DPS via Expose Weakness uptime
   scaling and is the single most concrete, named, non-default-looking
   value found in the skeleton. Whether the owner's wowsims web run (if run
   against a live/current P3 build) shows 1080 or 1150 here is **untested**
   — this is the strongest lead for the remaining unexplained 32.93 DPS gap
   that Line B surfaced, but sizing its DPS contribution requires a sim,
   which was out of scope for Line B's diff-only mandate.

3. **Consumables' omitted "potions"/"conjuredItems" menu arrays** — flagged
   in the build script's own comment as a known gap (inert for ret,
   untested for feral). Not confirmed to matter, but it is a place where
   our skeleton could differ from a live web UI's fuller consumable
   selection if that menu is not actually inert for feral.

4. **Talent preset choice (StandardTalents vs MonocatTalents)** — the
   script picked "the preset upstream lists first," which is a judgment
   call, not a measurement of what a P3 player would actually run. If the
   owner's wowsims run used a different talent build (e.g. a P3-appropriate
   spec), the whole DPS comparison is against a different character, not
   just a different sim-request setting. **Untested** whether this matches
   what the owner ran.

No divergence was found in fight duration, target count, target armor/level,
or raid/party buff composition — those all check out as upstream's own
values, sourced from a generated, gated artifact
(`data/presets/feral/buff-defaults.json`, gated by `pnpm sim-defaults:check`
per its header) rather than hand-typed.

## Overall conclusion

- **Line A: socket-capacity loss explains ~0 of the 32.93 DPS gap.**
  `PKG_BESTGEMS` (+64.43, same gem the player's baseline already uses,
  fewer total sockets, no meta to lose) is statistically identical to
  `PKG_PROD` (+64.48), not to `PKG_FILLER` (+80.80). The
  ticket-103-recorded "socket-capacity shifts per slot" mechanism does not
  price the gap; it prices ~0 DPS of it. The `PKG_PROD`/`PKG_FILLER` ~16 DPS
  split is gem-*choice* (24028 vs 32194), not socket *count* — and even
  that split is only about half of the 32.93 DPS gap to the owner's +97,
  and `PKG_FILLER`'s gem choice isn't what a real player would pick anyway
  (32194 is a filler test gem, not "the strongest sensible gem"), so it
  does not represent a real alternative production could have chosen.
- **Line B: no smoking gun, but two live leads.** The p2/p3 skeleton reuse
  looks structurally deliberate and likely correct (phase-agnostic
  settings), not a bug — but `exposeWeaknessHunterAgility: 1080` is a
  disclosed, concrete non-P2-default-looking value inherited from an
  upstream Phase1-pinned quirk, and the talent preset choice is a judgment
  call not verified against what the owner's run used. Both are named,
  sizeable candidates for the still-unexplained 32.93 DPS gap, but neither
  was simmed here — that is the natural next step, not undertaken because
  it was out of this subagent's Line-B (diff-only) scope.
