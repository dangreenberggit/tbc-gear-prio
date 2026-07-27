# Verification log

PLAN.md §14: *"No phase starts until the previous gate is written into
`docs/verification-log.md`."* This is that file. One entry per gate box, each
recording what was actually run and what came back — not what was expected.

---

## 2026-07-26 — Phase 0, second sitting

Closes three review findings against data on disk. Reproduce with:

```bash
python scripts/sync_wowsims.py --update
python wcl_probe.py --name slamaltman --server-slug dreamscythe --region US --raw-out test/fixtures/slamaltman.raw.json --json-out docs/phase0-probe-summaries/slamaltman.json
python scripts/verify_fixture.py test/fixtures/slamaltman.raw.json
```

### Fixture capture — the first run's output was not a fixture

The first probe's summary (`docs/phase0-probe-summaries/slamaltman.json`) recorded `"enchants": "present (10/19)"`
and threw the payload away. The raw gear array was printed to stdout and never
persisted, which is why R17 and R19 could not be settled after the fact despite
the data having been on screen at the time.

`wcl_probe.py` now takes `--raw-out` and warns when it isn't passed. The captured
fixture (`test/fixtures/slamaltman.raw.json`) holds all 25 combatants from the
fight plus the buffs table, not just the one player — it cost nothing extra, since
the query was already paid for.

**Cost:** ~12.6 points for the full re-run; 41.3 points total for the session
including the six-report sweep below. Budget is 3,600/hour.

### ☑ R17 — 19 → 17 slot reconciliation

Both halves confirmed, from two independent directions.

**WCL's 19-entry order** — every logged item resolved against `db.json` and its
slot compared to PLAN.md §8.4's table: **19/19 agree.** Indices 3 and 18 are the
two entries absent from `db.json`, and they are exactly shirt (`859`) and tabard
(`5976`), as predicted.

**The sim's 17-entry order** — confirmed without needing the binary, using
wowsims' own curated ret P2 gear set. It is 17 entries in the sim's order and
carries an enchant `effectId` per slot, and TBC enchants are slot-typed. So the
names have to land on the slots they describe, and they do: *Enchant Cloak* at
index 3 (back), *Enchant Gloves* at index 6 (hands), *Nethercobra Leg Armor* at
index 8 (legs). **16/16 non-empty entries agree.**

**The danger was understated.** The review flagged `back` as the reordered slot
(4th in the sim, 15th in WCL). Measured, a drop-only implementation gets
**11 of 17 positions wrong**:

```
sim[ 3] wants back      drop-only gives chest
sim[ 4] wants chest     drop-only gives waist
sim[ 5] wants wrist     drop-only gives legs
sim[ 6] wants hands     drop-only gives feet
sim[ 7] wants waist     drop-only gives wrist
sim[ 8] wants legs      drop-only gives hands
sim[ 9] wants feet      drop-only gives finger1
sim[10] wants finger1   drop-only gives finger2
sim[11] wants finger2   drop-only gives trinket1
sim[12] wants trinket1  drop-only gives trinket2
sim[13] wants trinket2  drop-only gives back
```

Only head, neck, shoulder and the three weapon slots survive by accident. This
produces a valid `RaidSimRequest` and a wrong number with no error.

### ☑ R19 / R14 — enchant and gem ID namespaces

**`permanentEnchant` is the `tbc-new` `effectId` namespace. No conversion table
needed.** All 10 populated values resolved as `effectId`, **0** as `itemId`, 0
unresolved — and each enchant's type matches the slot it was found on
(`684 → Enchant Gloves - Major Strength` on hands, `368 → Enchant Cloak - Greater
Agility` on back).

Confirmed a second time from the opposite direction: wowsims' own ret gear set
writes `{"id": 32461, "enchant": 3003, ...}` on the head, and slamaltman's logged
head enchant is also `3003` (*Glyph of Ferocity*). Upstream writes the same
namespace WCL reports.

`temporaryEnchant: 2713` did not resolve, and should not — weapon oils and
sharpening stones are consumables, not enchants, and live in `db['consumables']`.
It is a separate namespace and is scored separately.

**Gems:** all 12 socketed gems resolve against `db.json`, meta included
(`32409` Relentless Earthstorm Diamond). Four are flagged `unique` and none
require a profession. Highest gem phase in use is 1.

### ☒ R8 — race is NOT retrievable from Warcraft Logs

This one failed, and the failure is decisive rather than inconclusive.

| Route | Result |
|---|---|
| `ReportActor` fields | `gameID, icon, id, name, petOwner, server, subType, type` — no race |
| `CombatantInfo` event keys | no race-like key |
| `Character.gameData` | `{"error": "This game does not support cached game data."}` |
| `Heroic Presence` in the Buffs table | absent from **6/6** reports across two zones |

The buff route looked promising and is the one worth recording properly, because
it would have been *better* than race: TBC's *Heroic Presence* is a **party-wide**
+1% hit aura, so a non-Draenei grouped with a Draenei still gets it, and reading
race alone gives the wrong answer in both directions. The buff is the ground truth
that race only proxies for.

It isn't tracked. The Buffs table returns 163 auras for these fights, including
passive party auras of exactly the same shape (*Blood Pact*, *Unleashed Rage*,
*Blessing of Might*) — so the absence is not a limitation of the table.

And the sample is not ambiguous: **both fixture characters are Alliance**
(`faction: {id: 1, name: "Alliance"}`), and in TBC every Alliance shaman is a
Draenei. The buff tables are full of shaman auras (*Unleashed Rage*, *Earth
Shield*, *Windfury Attack*), so there were certainly Draenei in those raids.
*Heroic Presence* still never appears.

**Consequence:** the exact yellow hit cap is not derivable from a log. See
PLAN.md §4 — race becomes a standing assumption with a user override, and the
hit-cap banner is phrased to carry that uncertainty rather than to imply a
precise cap.

### ☑ Content tier default — sourced from upstream, not hand-maintained

`ui/core/constants/other.ts` in `wowsims/tbc-new`:

```ts
export enum Phase { Phase1 = 1, Phase2, Phase3, Phase4, Phase5 }
export const CURRENT_PHASE: Phase = Phase.Phase2;
```

Their enum is 1–5, matching `maxPhase` exactly. `scripts/sync_wowsims.py` pins the
repo at a tag, fetches the tracked inputs, parses `CURRENT_PHASE` and writes
`data/wowsims.lock.json`. Pinned at **v0.0.101** (`8aa378b3`), `currentPhase: 2`.

`--check` reports drift and is CI-shaped (exit 1 on drift). A change in
`CURRENT_PHASE` is the **P3 launch signal** — no calendar reminder, no dated risk
row.

### Incidental findings

- **Ret's curated gear sets are `preraid`, `p1`, `p2` and stop there** —
  confirmed by listing the repo, not inferred. Protection has p1–p5. The review's
  claim about uneven coverage is now an observation.
- **`ui/<class>/<spec>/gear_sets/*.gear.json` is still current** for paladin, but
  hunter *additionally* carries `builds/phase_N/*.build.json`. Upstream layout
  varies per spec; do not assume one shape when adding the second spec.
- **`db.json` totals:** 8,257 items, 214 gems, 141 enchants, 107 consumables.
  Gems by phase are **163 / 6 / 39 / 0 / 6**, matching the review's figures
  exactly, and confirming the 39 phase-3 epic gems that `maxPhase` must gate.
- Gem records carry `unique` and `requiredProfession`, so §9's palette filter has
  the fields it needs.

### Still open after this sitting

The two `wowsimcli` boxes — closed in the third sitting below.

---

## 2026-07-26 — Phase 0, third sitting (close the last two boxes)

Vendored `wowsimcli` v0.0.101, confirmed `decodelink`, and ran a hand-composed
`RaidSimRequest` built from Slamaltman's real logged gear through the binary.

Reproduce with:

```bash
pnpm fetch:wowsimcli                          # or: python scripts/fetch_wowsimcli.py
# Box 2 — any ret share link from wowsims.com Export → Link works; one that did:
#   https://www.wowsims.com/tbc/paladin/retribution/#eJyr4OXi... (full link in
#   .scratch/phase0-close/p2-share-link.txt if present; re-export from the site)
vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe decodelink '<share-link>'
# Box 1 — skeleton is test/fixtures/ret-p2.raid-sim-skeleton.json (CLI export)
python scripts/compose_slamaltman_raid_sim.py
```

### Footgun found before either box could close: `events[0]` is not the character

`test/fixtures/slamaltman.raw.json` holds all 25 combatants. `combatant_info_events[0]`
is **Hagguth** (Warrior, Destroyer Battlegear) — not Slamaltman (Paladin,
`sourceID=11`). `scripts/verify_fixture.py` previously probed `[0]`, so the second
sitting's R17/R19 numbers were measured against the wrong actor. The *conclusions*
still hold on the real character (re-run below): drop-and-reorder, `effectId`
namespace, gems resolve. What was wrong was the attributed gear — Destroyer helm
`30120` was Hagguth's; Slamaltman wears Furious Gizmatic Goggles `32461` and
Crystalforge Breastplate `30129`.

Feeding Hagguth's warrior set into a `ClassPaladin` request panics the Go sim
inside a warrior set-bonus registration (`RetributionPaladin is not warrior.WarriorAgent`).
Silent wrong-DPS is the failure mode the plan fears for slot mapping; this one
at least crashes. Both `verify_fixture.py` and `compose_slamaltman_raid_sim.py`
now resolve the target via the `actors` table by name.

### ☑ Preset decode path — `decodelink` works

```text
wowsimcli version → v0.0.101
wowsimcli decodelink <ret-p2-share-link> → IndividualSimSettings JSON (exit 0)
```

Committed as `data/presets/ret/p2.individual-sim-settings.json`. Filename states
the protobuf message deliberately (`IndividualSimSettings` ≠ `RaidSimRequest`).
The zlib+base64 fallback stays scoped for the export side (§12) even though the
primary path is confirmed.

### ☑ Real logged ret gear → valid `RaidSimResult`

Hand-composed request: stock ret P2 CLI export as skeleton (buffs / talents /
consumes / encounter / simple rotation), Slamaltman's mapped equipment swapped
in, assumed `RaceHuman` (Alliance faction known; race unreadable — R8),
`iterations=3000`, `randomSeed=42`.

| | |
|---|---|
| sim version | v0.0.101 |
| DPS avg | **2042.85** (stdev 119.04, min 1581.23, max 2493.17) |
| iterationsDone | 3000 |
| error | none |

Fixtures:

- `test/fixtures/slamaltman.raid-sim-request.json` — the composed `RaidSimRequest`
- `test/fixtures/slamaltman.raid-sim-result.json` — slimmed observation (avg/stdev;
  per-action histograms kept only in `.scratch/`)

Slot mapping assertion embedded in the compose script: `sim[3].id == wcl[14].id`
(back), so a filter-only regression fails before the binary runs.

### Housekeeping folded into this sitting

- `pnpm sync:wowsims` / `pnpm sync:wowsims:check` aliases (were referenced by
  `.gitignore` and PLAN.md §8.5 but missing from `package.json`)
- `pnpm fetch:wowsimcli` → `scripts/fetch_wowsimcli.py`
- Probe summaries moved off the repo root:
  `docs/phase0-probe-summaries/{slamaltman,shredzepelin}.json`

### Phase 0 gate

Both remaining boxes closed. Phase 1 may start once this log is on `dev` and the
§14 checklist in PLAN.md / `docs/phase0-findings.md` is ticked to match.

---

## 2026-07-26 — Phase 1, first sitting (five-seed spread)

PLAN.md §14: run the §10 / R5 experiment *before* fixing the cutoff. Identical
logged ret gear, five independent seeds vs five repeats of one shared seed, at
the plan default of 5,000 iterations.

Reproduce with:

```bash
python scripts/five_seed_spread.py
# optional: --iterations 5000 (default)
```

Fixture: `test/fixtures/slamaltman.raid-sim-request.json` (equipment already
mapped). Binary: `wowsimcli` v0.0.101 from `data/wowsims.lock.json`. Full numbers:
[`docs/five-seed-spread.json`](five-seed-spread.json).

### ☑ Independent-seed noise floor (reported SE, not max−min of means)

| Arm | Seeds / repeats | max−min of avgs | mean reported SE (`stdev/√n`) |
|---|---|---|---|
| Independent | 11, 22, 33, 44, 55 | **0.099 DPS** | **1.678 DPS** |
| Shared | 42 × 5 | **0.000 DPS** | 1.678 DPS |

Shared-seed repeats are bit-identical — the sim is deterministic given a seed.
Independent seeds barely move the *mean* (0.1 DPS); what forms tie groups is the
**reported** independent SE on the ~1.7 DPS scale.

### Against R5's cited 1.58 / 0.06

R5 (PLAN-REVIEW) reported identical-gear spreads of **1.58 DPS** (independent)
and **0.06 DPS** (shared) at 5,000 iterations. Our max−min numbers do not match
that pair. The figure that *does* land on the same scale is mean reported SE
(**1.678 ≈ 1.58**). Shared-seed collapse to 0.06 looks like residual non-
determinism in whatever harness produced R5; under pinned `wowsimcli` v0.0.101
here, shared repeats are exactly 0. The cutoff derivation therefore uses
**reported SE**, which is the quantity PLAN.md §10 says tie intervals are built
from — not max−min of five means.

### ☑ Cutoff constant derived

```
cutoff = { absDps: 3.4, pct: 0.15 }
# absDps = max(3.0, 2 × 1.678) → 3.4
# pct unchanged from the plan's dual threshold
```

At slamaltman's ~2042 DPS baseline, 0.15% is ~3.06 DPS — same order as
`absDps`. Phase 1 engine code should pin this pair as one constant (not
re-provisional 3.0). Paired-replicate SE for the top ~8 stays Phase 2.

### Where this leaves Phase 1

One gate box closed. Remaining Phase 1 work: scaffold, generated protos, three
seams + adapters, eight stages, slot-mapping test, gem solver, curated pool,
`pnpm rank`, and the human-trust checks on a real shortlist.

---

## 2026-07-27 — Compose rotation: APL is load-bearing under TypeSimple

Question: the golden `ret-p2.raid-sim-skeleton.json` / slamaltman request labels
`rotation.type` as `TypeSimple` while also carrying the four APL fields from
pinned `vendor/wowsims/ret_default.apl.json`. Are those APL fields inert?

Reproduce (pinned `wowsimcli` v0.0.101, fixture request, 3000 iter, seed 42):

| Variant | avg DPS |
|---|---|
| Committed request (baseline) | **2042.847593** |
| `prepullActions` stripped or `[]` | 789.024346 |
| Only `type` + `simple` (no APL fields) | 673.740575 |
| Label flipped to `TypeAPL`, APL kept | **2042.847593** |
| Rotation replaced with vendor APL only | **2042.847593** |

**Conclusion:** the APL block — especially `prepullActions` — is active. The
`TypeSimple` label is not what the Go sim is running for the Phase 0 baseline.
Compose / the skeleton generator must merge the pinned APL; `type`+`simple`
alone is wrong. PLAN.md §8.2 updated to the build-time generator + golden
skeleton shape (design C).
