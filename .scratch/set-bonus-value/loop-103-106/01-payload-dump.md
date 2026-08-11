# 01-payload-dump — production equipment payload dump for tickets 103 & 106

## What I was asked

Phase-1, observation-only: produce the EXACT equipment payload production
builds (via the real exported `equipmentForCandidateSwap` in
`packages/core/src/rank.ts`, not a reimplementation) for:

(a) the four-piece T6 package arm on shredzepelin's gear, built sequentially
    the way `rank.ts:1066-1074` builds it;
(b) the single-swap helm arm for Cursed Vision of Sargeras;
(c) the single-swap helm arm for Vengeful Gladiator's Dragonhide Helm;

plus the BASELINE (no swap), and for each: item id/name, socket count,
gems placed + colour, enchant, empty-socket check, dropped-gem check
(multiset diff vs baseline), and meta-gem activation (with the colour-count
arithmetic), then diff tables. No sims run. No production code touched
(read-only on `packages/`).

## Commands run, verbatim

All commands run from repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio` on
branch `feat/set-bonus-value`.

### 1. Located tickets and the established measurement pattern

```
Glob .scratch/carry-forward/issues/103*
Glob .scratch/carry-forward/issues/106*
Glob .scratch/set-bonus-value/measure_shredzepelin_t6.py
Read .scratch/carry-forward/issues/103-package-delta-reads-low-versus-a-regemmed-wowsims-run.md
Read .scratch/carry-forward/issues/106-loop-why-s3-pvp-helm-sims-equal-to-cursed-vision.md
Read .scratch/set-bonus-value/measure_shredzepelin_t6.py
```

### 2. Read the production swap builder

```
Grep "export function equipmentForCandidateSwap|function fillOptsForSwap|function migrateGemsToItem|function fillEmptyCandidateGems|function repairMeta|function applyRepairedGems|function swapItemAt" packages/core/src/rank.ts
Read packages/core/src/rank.ts (offset 1000-1120, 1300-1512)
```

Confirmed: `equipmentForCandidateSwap` (rank.ts:1424) is exported specifically
so tests (and, here, this diagnostic script) exercise the real function — see
its doc comment at rank.ts:1418-1423 citing carry-forward ticket 22 (a
hand-duplicated copy in a test previously dropped `fillOptsForSwap` silently).
`applyRepairedGems` (rank.ts:1502) and `swapItemAt`/`fillOptsForSwap` are
**not** exported — only `equipmentForCandidateSwap` is. I therefore call the
real exported function for every swap arm, and only reproduce the tiny
6-line `applyRepairedGems` body (copied verbatim, labeled as such) to
reconstruct the **baseline** equipment the same way `rank.ts:472-475` does
— baseline construction is not itself the swap logic under test.

Confirmed the package loop (rank.ts:1066-1074) applies
`equipmentForCandidateSwap` sequentially, threading `packageEquipment`
through each of the four pieces — exactly what I replicated.

### 3. Found item ids in `vendor/wowsims/db.json`

```bash
grep -n "Cursed Vision\|Dragonhide Helm" vendor/wowsims/db.json | head -50
```

Relevant hits:
- `32235` "Cursed Vision of Sargeras" — `gemSockets:[1,4]`
- `33672` "Vengeful Gladiator's Dragonhide Helm" — `gemSockets:[1,4]`

No other id variants matched "Cursed Vision" or "Vengeful Gladiator's
Dragonhide Helm" in db.json — these are the only ids for each item in this
database (other PvP-season Dragonhide Helms exist under different names:
Gladiator's 28127, Merciless 31968, Brutal 34999 — none of these are
"Vengeful").

### 4. Confirmed which ids the report/pool actually use

```powershell
Select-String -Path ".scratch\rank-reports\shredzepelin-p3.json" -Pattern "33672" -Context 0,0
Select-String -Path ".scratch\rank-reports\shredzepelin-p3.json" -Pattern "32235" -Context 0,0
```
Read `.scratch/rank-reports/shredzepelin-p3.json` lines 9990-10080. Both
`itemId: 33672` (Vengeful Gladiator's Dragonhide Helm, `deltaDps:
-202.0497...`) and `itemId: 32235` (Cursed Vision of Sargeras, `deltaDps:
-202.1336...`) appear as head-slot candidates, `belowCutoff: true`, deltas
essentially equal — reproducing the symptom ticket 106 describes (report
shows near-equal deltas where the owner expects Cursed Vision ~+10 ahead).

### 5. Wrote and ran a throwaway tsx script calling the real production function

File: `.scratch/set-bonus-value/loop-103-106/dump-payloads.ts` (full source
kept in that file; not reproduced here). It:

- Loads shredzepelin's actual gear from `test/fixtures/shredzepelin-cat.raw.json`
  via the real `feralOfflineRecordings` + `SHREDZEPELIN_REF` (same fixture,
  same helper `cli.ts` uses — `cli.ts:340`, `cli.ts:364`).
- Builds baseline equipment mirroring `rank.ts:448-475` verbatim
  (`socketedItemsFromLoggedGear` → `repairMeta` → `applyRepairedGemsForBaselineOnly`,
  where the latter is a byte-for-byte copy of rank.ts's private
  `applyRepairedGems`, used ONLY for baseline reconstruction, clearly
  commented as such in the script).
- Builds `gems = gemContext(gemsForPhase(3), epWeights)` using the real
  `p1.ep-weights.json` for feral (matching `cli.ts:284-288`).
- Builds the four-piece T6 package by calling the **real, unmodified,
  exported** `equipmentForCandidateSwap` sequentially over
  shoulder(2)/chest(4)/hands(6)/legs(8) with item ids
  31048/31042/31034/31044 — same order and same indices as
  `rank.ts:1066-1074`.
- Builds the Cursed Vision (32235) and Vengeful Gladiator (33672) single-swap
  arms by calling the same real `equipmentForCandidateSwap` once each at the
  head slot index (`SIM_ORDER.indexOf("head")` = 0).
- Dumps all four equipment arrays (baseline, t6Package, cursedVisionHelm,
  vengefulGladHelm) as JSON.

Command:
```bash
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/dump-payloads.ts \
  > .scratch/set-bonus-value/loop-103-106/payload-dump.json \
  2> .scratch/set-bonus-value/loop-103-106/payload-dump.stderr.log
```
Exit code 0 after two fixes (a non-exported `applyRepairedGems` import, and
`__dirname` not existing under tsx's ESM mode — replaced with
`resolve(process.cwd())`, run from repo root). stderr log is empty on the
successful run. Full output at
`.scratch/set-bonus-value/loop-103-106/payload-dump.json` (404 lines).

### 6. Looked up gem colours and the meta condition in the vendored data

```bash
grep -o '"id":32409[^}]*}' vendor/wowsims/db.json   # meta gem
grep -o '"id":32194[^}]*}' vendor/wowsims/db.json
grep -o '"id":24028[^}]*}' vendor/wowsims/db.json
grep -o '"id":32220[^}]*}' vendor/wowsims/db.json
grep -o '"id":30549[^}]*}' vendor/wowsims/db.json
grep -o '"id":32212[^}]*}' vendor/wowsims/db.json
node -e "const c=require('./data/gems/meta-conditions.json'); console.log(JSON.stringify(c.find(x=>x.id===32409)))"
Grep "GemColorMeta|GemColorRed|GemColorYellow|GemColorBlue|..." packages/core/src/proto/common_pb.ts
```

Results:
- `32409` "Relentless Earthstorm Diamond", `color:1` = **GemColorMeta**
  (confirmed enum: `GemColorMeta=1, GemColorRed=2, GemColorBlue=3,
  GemColorYellow=4, GemColorGreen=5, GemColorOrange=6, GemColorPurple=7,
  GemColorPrismatic=8`, `packages/core/src/proto/common_pb.ts:2727-2764`).
  Its condition (`data/gems/meta-conditions.json`, id 32409): `"Requires at
  least 2 Red Gems, at least 2 Yellow Gems, and at least 2 Blue Gems"` —
  `minRed:2, minYellow:2, minBlue:2`.
- `32194` Delicate Crimson Spinel — `color:2` (Red)
- `24028` Delicate Living Ruby — `color:2` (Red)
- `32220` Glinting Pyrestone — `color:6` (Orange; counts toward both Red and
  Yellow per `SOCKET_TO_MATCHING` in `packages/core/src/meta.ts:67-75,76-84`)
- `30549` Shifting Tanzanite — `color:7` (Purple; counts toward both Red and
  Blue per `meta.ts:59-66,68-75`)
- `32212` Shifting Shadowsong Amethyst — `color:7` (Purple; same as above)

Item db entries used for socket counts / names:
- `8345` Wolfshead Helm — **no `gemSockets` field** (0 sockets, no meta socket)
- `32235` Cursed Vision of Sargeras — `gemSockets:[1,4]` (meta + yellow)
- `33672` Vengeful Gladiator's Dragonhide Helm — `gemSockets:[1,4]` (meta + yellow)
- `31048` Thunderheart Pauldrons — `gemSockets:[4,3]` (yellow, blue) — 2 sockets
- `31042` Thunderheart Chestguard — `gemSockets:[3,4,2]` (blue, yellow, red) — 3 sockets
- `31034` Thunderheart Gauntlets — `gemSockets:[3]` (blue) — 1 socket
- `31044` Thunderheart Leggings — `gemSockets:[3]` (blue) — 1 socket
- `29100` Mantle of Malorne (worn shoulder) — `gemSockets:[3,3]` — 2 sockets
- `29096` Breastplate of Malorne (worn chest) — `gemSockets:[4,3,2]` — 3 sockets
- `29947` Gloves of the Searing Grip (worn hands) — **no `gemSockets` field** — 0 sockets
- `28741` Skulker's Greaves (worn legs) — `gemSockets:[2,2,3]` — 3 sockets

### 7. Ran `metaStatus` (the real production function) on baseline + both helm arms

Script: `.scratch/set-bonus-value/loop-103-106/meta-status.ts`. Uses the head
socket arrays looked up in step 6 (`[]` for Wolfshead 8345 with no
`gemSockets`; `[1,4]` for both 32235 and 33672) and calls the real
`metaStatus` from `packages/core/src/meta.ts`.

```bash
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/meta-status.ts
```

Output (verbatim):
```
baseline {"kind":"no-meta-socket"}
cursedVisionHelm {"kind":"active","metaId":32409,"counts":{"red":12,"yellow":2,"blue":2}}
vengefulGladHelm {"kind":"active","metaId":32409,"counts":{"red":12,"yellow":2,"blue":2}}
```

### 8. Empty-socket and dropped-gem check across all four arms

Script: `.scratch/set-bonus-value/loop-103-106/socket-diff.ts`. For every
item with sockets in each arm, compares `db.json` `gemSockets.length` against
the number of gems actually placed by the production function; also diffs
the whole-equipment gem multiset (baseline vs each arm, and Cursed Vision vs
Vengeful Gladiator).

```bash
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/socket-diff.ts
```

Output (verbatim):
```
=== baseline ===
  29100 Mantle of Malorne sockets=2 gems=2
  29096 Breastplate of Malorne sockets=3 gems=3
  29966 Vambraces of Ending sockets=1 gems=1
  28741 Skulker's Greaves sockets=3 gems=3
  28545 Edgewalker Longboots sockets=2 gems=2

=== t6Package ===
  31048 Thunderheart Pauldrons sockets=2 gems=2
  31042 Thunderheart Chestguard sockets=3 gems=3
  29966 Vambraces of Ending sockets=1 gems=1
  31034 Thunderheart Gauntlets sockets=1 gems=1
  31044 Thunderheart Leggings sockets=1 gems=1
  28545 Edgewalker Longboots sockets=2 gems=2

=== cursedVisionHelm ===
  32235 Cursed Vision of Sargeras sockets=2 gems=2
  29100 Mantle of Malorne sockets=2 gems=2
  29096 Breastplate of Malorne sockets=3 gems=3
  29966 Vambraces of Ending sockets=1 gems=1
  28741 Skulker's Greaves sockets=3 gems=3
  28545 Edgewalker Longboots sockets=2 gems=2

=== vengefulGladHelm ===
  33672 Vengeful Gladiator's Dragonhide Helm sockets=2 gems=2
  29100 Mantle of Malorne sockets=2 gems=2
  29096 Breastplate of Malorne sockets=3 gems=3
  29966 Vambraces of Ending sockets=1 gems=1
  28741 Skulker's Greaves sockets=3 gems=3
  28545 Edgewalker Longboots sockets=2 gems=2

=== gem multiset diffs ===

-- baseline vs t6Package --
  gem 24028: baseline=11 arm=9 (-2)
  gem 32194: baseline=0 arm=1 (+1)
  total gem count: baseline=11 arm=10

-- baseline vs cursedVisionHelm --
  gem 24028: baseline=11 arm=7 (-4)
  gem 32409: baseline=0 arm=1 (+1)
  gem 32194: baseline=0 arm=1 (+1)
  gem 32220: baseline=0 arm=2 (+2)
  gem 30549: baseline=0 arm=1 (+1)
  gem 32212: baseline=0 arm=1 (+1)
  total gem count: baseline=11 arm=13

-- baseline vs vengefulGladHelm --
  gem 24028: baseline=11 arm=7 (-4)
  gem 32409: baseline=0 arm=1 (+1)
  gem 32194: baseline=0 arm=1 (+1)
  gem 32220: baseline=0 arm=2 (+2)
  gem 30549: baseline=0 arm=1 (+1)
  gem 32212: baseline=0 arm=1 (+1)
  total gem count: baseline=11 arm=13

=== cursedVisionHelm vs vengefulGladHelm gem diff ===
  IDENTICAL gem multisets
  total: cursedVision=13 vengefulGlad=13
```

## Per-slot payload detail (from step 5's dump, `payload-dump.json`)

`SIM_ORDER` (index → slot): 0 head, 1 neck, 2 shoulder, 3 back, 4 chest,
5 wrist, 6 hands, 7 waist, 8 legs, 9 feet, 10 finger1, 11 finger2,
12 trinket1, 13 trinket2, 14 mainhand, 15 offhand, 16 ranged.

### BASELINE (no swap)

| idx | slot | item id | name | sockets | gems placed | colours | enchant |
|---|---|---|---|---|---|---|---|
| 0 | head | 8345 | Wolfshead Helm | 0 | — | — | 3003 |
| 2 | shoulder | 29100 | Mantle of Malorne | 2 | 24028,24028 | Red,Red | 2983 |
| 4 | chest | 29096 | Breastplate of Malorne | 3 | 24028,24028,24028 | Red,Red,Red | 2661 |
| 5 | wrist | 29966 | Vambraces of Ending | 1 | 24028 | Red | 2647 |
| 6 | hands | 29947 | Gloves of the Searing Grip | 0 | — | — | 2564 |
| 8 | legs | 28741 | Skulker's Greaves | 3 | 24028,24028,24028 | Red,Red,Red | 3012 |
| 9 | feet | 28545 | Edgewalker Longboots | 2 | 24028,24028 | Red,Red | 2939 |

(All other slots carry no gems in the fixture; full list in
`payload-dump.json`.) No empty sockets (0 expected on 8345/29947, matching
0 placed). No meta socket present on the worn helm — `metaStatus` correctly
returns `no-meta-socket`.

### (a) T6 four-piece package (sequential build, `rank.ts:1066-1074` order)

| idx | slot | item id | name | sockets | gems placed | colours | enchant |
|---|---|---|---|---|---|---|---|
| 2 | shoulder | 31048 | Thunderheart Pauldrons | 2 | 24028,24028 | Red,Red | 2983 (carried) |
| 4 | chest | 31042 | Thunderheart Chestguard | 3 | 24028,24028,24028 | Red,Red,Red | 2661 (carried) |
| 6 | hands | 31034 | Thunderheart Gauntlets | 1 | 32194 | Red | 2564 (carried) |
| 8 | legs | 31044 | Thunderheart Leggings | 1 | 24028 | Red | 3012 (carried) |

All four sockets fully filled — 0 empty. Enchants carried over from the worn
pieces unchanged (2983/2661/2564/3012 match baseline). No meta involved
(head untouched in this arm).

Gem multiset vs baseline: net **-1 gem overall** (11→10), because worn
hands/legs (0/3 sockets) become T6 hands/legs (1/1 sockets) — a socket-count
*decrease* on legs (3→1) forces 2 fewer `24028` placed there, and the new
1-socket hands slot picks up a fresh filler gem `32194` (a colour it had no
socket for before). This matches the "socket capacity shifts per slot" note
already in ticket 103 (legs 28741 3 sockets → T6 31044 1 socket, hands 29947
0 sockets → T6 31034 1 socket) — **not** a dropped/lost gem relative to what
each slot's own socket count allows; every socket present in each arm is
filled. No gem is unaccounted for beyond what a smaller total socket count
mechanically removes.

### (b) Cursed Vision of Sargeras single swap (32235)

| idx | slot | item id | name | sockets | gems placed | colours | enchant |
|---|---|---|---|---|---|---|---|
| 0 | head | 32235 | Cursed Vision of Sargeras | 2 (meta+yellow) | 32409, 32194 | **Meta**, Red | 3003 (carried) |

Rest of equipment unchanged from baseline except gem colour reshuffling
required to satisfy the meta (see multiset diff above): shoulder gems become
32220×2 (Orange, was Red×2 filler-equivalent 24028×2), chest gains
30549+32212+24028 (Purple, Purple, Red — was 24028×3), other slots unchanged.

Both head sockets fully filled (2/2). `metaStatus`: **ACTIVE**, metaId
32409, counts `{red:12, yellow:2, blue:2}` — condition requires `minRed:2,
minYellow:2, minBlue:2`; 12≥2, 2≥2, 2≥2, all satisfied.

### (c) Vengeful Gladiator's Dragonhide Helm single swap (33672)

| idx | slot | item id | name | sockets | gems placed | colours | enchant |
|---|---|---|---|---|---|---|---|
| 0 | head | 33672 | Vengeful Gladiator's Dragonhide Helm | 2 (meta+yellow) | 32409, 32194 | **Meta**, Red | 3003 (carried) |

Byte-identical gem placement to the Cursed Vision arm at every slot
(confirmed by the multiset diff in step 8: "IDENTICAL gem multisets", 13
gems each). `metaStatus`: **ACTIVE**, metaId 32409, counts
`{red:12, yellow:2, blue:2}` — same as Cursed Vision arm.

## Diff tables

### Baseline vs T6-package arm

| | baseline | T6 package | note |
|---|---|---|---|
| socket total (4 tier slots) | shoulder 2 + chest 3 + hands 0 + legs 3 = 8 | shoulder 2 + chest 3 + hands 1 + legs 1 = 7 | socket capacity **decreases** net -1 (T6 hands +1, T6 legs -2) |
| gems placed (4 tier slots) | 8 | 7 | matches socket totals exactly — every socket filled in both arms |
| total equipment gems | 11 | 10 | -1, mechanically forced by the socket-count decrease above |
| empty sockets | none | none | — |
| meta gem | not present (worn helm untouched, no meta socket) | not present (helm untouched in this arm) | not applicable to this ticket's swap |
| enchants | 2983/2661/2564/3012 | same, carried | unchanged |

**No dropped gem and no empty socket found in the T6-package arm.** Every
socket present in the built equipment is filled; the gem-count decrease is
fully explained by T6 legs having fewer sockets (1) than the worn legs
(3) — not by the builder losing a gem it could have placed.

### Cursed Vision arm vs Vengeful Gladiator arm

| | Cursed Vision (32235) | Vengeful Gladiator (33672) | diff |
|---|---|---|---|
| sockets | 2 (meta, yellow) | 2 (meta, yellow) | none |
| gems placed | 32409 (meta), 32194 (red) | 32409 (meta), 32194 (red) | **none — identical** |
| empty sockets | 0 | 0 | none |
| meta gem present | yes, 32409 | yes, 32409 | none |
| meta ACTIVE | **yes** — red 12≥2, yellow 2≥2, blue 2≥2 | **yes** — red 12≥2, yellow 2≥2, blue 2≥2 | none |
| whole-equipment gem multiset | 13 gems | 13 gems, **identical multiset** | none |
| enchant | 3003 (carried) | 3003 (carried) | none |

**No payload difference whatsoever between the two helm arms.** The report's
near-equal deltas (-202.05 vs -202.13, ticket 106's symptom) are **not**
explained by an empty socket, a dropped gem, or a dead meta in either arm —
both payloads that reach the sim are byte-identical apart from the item id
itself (32235 vs 33672). Since Cursed Vision (ilvl 151, `stats`
int39/spi46/agi108/str108/hit21/crit38/ap385) and Vengeful Gladiator
(ilvl 146, `stats` str32/agi31/stam58/int23/hit12/crit27/resil84/ap25/hp373/mp56)
have genuinely different base stats in `vendor/wowsims/db.json`, a real DPS
gap between them is plausible on its face — but this script does not measure
DPS (out of scope per instructions) and does not explain why the *report's*
deltas come out equal despite different base stats. That is squarely outside
Phase 1's payload-only scope.

## Conclusion

1. **Empty socket:** none found in any of the four arms (baseline, T6
   package, Cursed Vision, Vengeful Gladiator). Every socket the item
   actually has (per `vendor/wowsims/db.json` `gemSockets`) is filled with a
   gem in the production-built payload.
2. **Dropped gem:** none found beyond what socket-count *differences*
   between worn and candidate items mechanically force (T6 legs has 1 socket
   vs worn legs' 3 — 2 fewer gems is expected, not a bug; T6 hands has 1
   socket vs worn hands' 0 — 1 more gem is expected). No slot loses a gem
   relative to its own available socket count in the built arm.
3. **Meta gem:** ACTIVE in both helm arms (Cursed Vision and Vengeful
   Gladiator), with byte-identical gem placement and identical colour counts
   (`red:12, yellow:2, blue:2}` against a `minRed:2, minYellow:2, minBlue:2`
   requirement). The baseline has no meta socket (Wolfshead Helm, 8345, has
   no `gemSockets` at all), so there is no meta-activation regression to
   compare against — this is expected, not a defect.

**Verdict: no payload defect (empty socket / dropped gem / dead meta) found
in any of the four arms dumped.** For ticket 106, this rules out the
gem-handling hypothesis for the equal-delta symptom entirely — the two helm
payloads that reach the sim are identical in every gem/socket/meta respect,
so if the report truly shows near-equal deltas where a real DPS gap should
exist, the cause is not in `equipmentForCandidateSwap`'s gem handling and
must be sought elsewhere (sim request settings, EP scoring, or something in
how the report reads/labels the sim result — none of which this script
investigated). For ticket 103, the T6-package arm shows the exact
sequential-build socket-capacity effect the ticket's "Why" section already
named as a hypothesis (legs 3→1 sockets, hands 0→1 sockets) — confirmed by
direct payload inspection, not just source reading — but this run did not
sim anything, so it does not by itself explain the specific 16.72 DPS gap
size; it only confirms the mechanism produces a materially different
(smaller) gem-and-socket footprint on the package arm than a freely
re-gemmed arm would.
