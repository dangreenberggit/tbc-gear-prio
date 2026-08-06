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

---

## 2026-07-28 — Phase 1 gate reconciliation (audit, no new engine work)

The Phase 1 gate in PLAN.md §14 showed 2 of 10 boxes checked. Several were
already met by code on `phase-1/five-seed-spread` but had never been written
down. This sitting audits each box against what exists today. **No box below is
closed by new implementation** — only by recording evidence that already passes,
or by measuring a committed artifact.

### ☑ Same input, same seed, same deltas across runs

`packages/core/test/rank.test.ts` — "returns identical deltas for the same seed
and recordings" calls `rankUpgrades` **twice** against one shared `deps`
(`RecordedGearSource` / `RecordedSimRunner` / `MemoryStore`, `seed: 42`,
`seeds: [42]`) and compares `[itemId, deltaDps]` pairs.

Scope of the claim: this is determinism **of the engine at the `rankUpgrades`
seam**, which is what the gate asks for. It is *not* a claim that the live
`wowsimcli` binary is deterministic across two real spawns — `RecordedSimRunner`
replays by `simCacheKey`, and `cli-sim-runner.test.ts` (the only real-binary
test) runs the binary once and skips where `vendor/` is absent.

Reproduce: `pnpm exec vitest run packages/core/test/rank.test.ts` (8 passed).

### ☑ The full engine runs offline from fixtures in a unit test

Same file. Every test in `rank.test.ts` drives the real exported `rankUpgrades`
(PLAN.md §4 public entry point) through recorded adapters at all three §5 seams —
no network, no binary spawn. `RecordedSimRunner.run` throws when no recording
matches, so a green run proves execution stayed inside the fixture set.

**Correction worth recording:** `packages/core/test/slamaltman-offline.test.ts`
is *not* evidence for this box despite its name. It calls only
`slamaltmanOfflineRecordings(raw)` and asserts on loaded `GearSource` shape; it
never composes a request, never calls `sim.run`, never touches `Store`. Cite
`rank.test.ts` for this box.

### ☑ No pool entry ships with `source: null` (§8.3.2)

Measured on the committed universes (the only ranking membership that ships —
`data/pools/` was deleted, see its README):

| Universe | entries | entries with empty/missing `sources` |
|---|---|---|
| `data/universes/ret-p2.json` | 224 | **0** |
| `data/universes/ret-p3.json` | 347 | **0** |

Tier coverage is also complete in both: p2 10/10 expected tier pieces present,
p3 15/15, `tierPiecesMissing: []`.

Note the schema is `sources` (an array of `{kind, zone, boss}` rows), not a
scalar `source`. A first probe reading `.source` reported 224/224 null and was
wrong; the corrected probe reads `sources`.

**This box is about what ships, and what ships is clean.** It is *not* the same
question as ticket 17: the report's `excludedNoSource` (2326 at p2, 2322 at p3,
against `d7EligibleTotal` 4212) counts items dropped *during assembly* for having
no resolvable source. Those never reach the universe, so they cannot violate this
gate — but the phase≥2 remainder among them is a real recall concern and stays
owned by `.scratch/carry-forward/issues/17-phase2-plus-no-source-gap.md`.

### ☑ A known set-break case shows an explanatory `setBonusNote`

`setBreakNote` (`packages/core/src/set-bonus.ts`) detects dropping below a 2pc/4pc
threshold and returns e.g. `breaks 2-piece set 629 (below 4)`. It is wired
through `rank.ts` onto the ranked item's `setBonusNote` field and rendered by
both `rank-report.ts` and `cli.ts` — so the note reaches a human, which is the
point of the box.

`packages/core/test/set-bonus.test.ts` covers the break case and the silent case.
The fixture uses **real** items, verified against `data/items/index.json`:
30129 Crystalforge Breastplate, `setId` 629, the Paladin T5 chest; the swap-in
30102 Krakken-Heart Breastplate has `setId: null`. Sibling pieces 30130/30131/
30132 share `setId` 629.

Reproduce: `pnpm exec vitest run packages/core/test/set-bonus.test.ts` (2 passed).

### ☐ `maxPhase` changes the candidate set and the gem palette TOGETHER — still open

Both halves work **in isolation**, and each is tested:

- Candidate set: `filterPoolByPhase` (`pool.ts`) is inclusive-filtered and called
  from `rankUpgrades`; `rank.test.ts` asserts a phase-2 chest is dropped at
  `maxPhase: 1`.
- Gem palette: `gemsForPhase` (`gems.ts`) is called from `rank.ts`;
  `items-gems.test.ts` asserts phase-3 epic gems stay out of a maxPhase-2
  palette (by inspecting palette metadata, not by diffing two `gemsForPhase`
  calls).

**What does not exist** is the comparison the box actually names: "run the same
character at 1 and at 2 and diff". No test runs `rankUpgrades` twice at two
`maxPhase` values and shows both axes moving together. Every phase test checks a
single phase against a fixed expectation.

Leaving this box **open**. Closing it is one test in `rank.test.ts`: same
character and deps, two `rankUpgrades` calls at `maxPhase` 1 and 2, asserting the
candidate id set differs *and* the gems placed on candidates differ. That is
small, but it is new test code and this sitting was scoped to recording what
already passes.

### Housekeeping — stale memory corrected

The assistant's cross-session memory carried "only 2/16 wowsims BiS items survive
the generator; two separate fatal causes (EP rank-out, plate-only armor filter)".
That measurement described `scripts/generate_pool.py` / `curate_ret_pool.py`,
both **deleted** in `88465cf` along with every `data/pools/ret*.json`. Neither
cause can still fire against `assemble_universe.py`. The memory is now marked
superseded, pointing at tickets 17 and 18 for what actually remains.

### Where this leaves Phase 1

Gate now stands at **7 of 10** recorded, up from 2 — six boxes were already
satisfied and merely unwritten, one (`source: null`) was closed by measuring the
shipping artifact.

Remaining, in the order they should be attacked:

| Box | Why it is still open |
|---|---|
| `maxPhase` A/B diff | needs one new test (above). Cheapest of the three |
| top items survive a human check vs wowsims BiS / Wowhead | needs the shortlist compared against a curated set; the substantive one |
| a ranking **you would act on tonight** | the judgment box; depends on the one above and on ticket 17's recall gap |

The last two are the same question wearing different hats: whether the
raid-scoped universe recalls the items a geared ret paladin would actually want.
Ticket 18 (recall measurement, junk filter stays off until it passes) is the
instrument for answering it. `junkFilter` on the p3 universe currently reports
`casterOnlyReject` 114 of 347 (32.9%) — unvalidated against sim, which is
precisely why the filter is not applied.

---

## 2026-07-28 — Held-out Wowhead recall (ticket 18 instrument)

PLAN.md §14's Phase 1 gate asks that top items survive a check against
"Wowhead's per-tier ret guide". But PLAN.md §530 also has Wowhead as a *curation
input*, and `assemble_universe.py` consumes `data/wowhead-lists/ret/*.json` as a
membership origin. Grading recall against a list that also populates the universe
is circular for exactly the items it added.

`--hold-out-wowhead` builds the universe from db / AtlasLoot / two-hop / zone
match only, still reading the list purely as an answer key. It refuses to run
without explicit `--out`/`--report` so a diagnostic can never overwrite the
shipping universe.

Reproduce (paths must be absolute — `--out` under a relative path trips a
pre-existing `relative_to` bug in the script's final print):

```
python scripts/assemble_universe.py --max-phase 3 \
  --out <abs>/.scratch/heldout/p3-normal.json \
  --report <abs>/.scratch/heldout/p3-normal.report.json

python scripts/assemble_universe.py --max-phase 3 --hold-out-wowhead \
  --out <abs>/.scratch/heldout/p3-heldout.json \
  --report <abs>/.scratch/heldout/p3-heldout.report.json
```

| | Wowhead as input | Held out |
|---|---|---|
| universe total | 347 | 325 |
| `listOnlyMembership` | 21 | 0 |
| Wowhead P3 BiS recall | 94/123 (**76.4%**) | 72/123 (**58.5%**) |
| tier pieces present | 15/15 | 15/15 |

**The headline number is 58.5%, not 76.4%.** Roughly a fifth of the apparent
recall is the answer key grading itself. The baseline run reproduces the
shipping universe exactly (347 entries), so the flag does not perturb assembly.

### What the independent sources cannot find

22 items are recalled *only* because Wowhead named them — all `d7Eligible`, so
these are source-resolution gaps, not eligibility filtering. They cluster in
crafted / PvP / BoE territory that db sources and AtlasLoot do not cover:
Lionheart Executioner, Stormherald, Bulwark of the Ancient Kings, Red Belt of
Battle, Swiftstrike Shoulders, the Merciless/Vengeful Gladiator pieces,
Furious Gizmatic Goggles (engineering), Mask of the Deceiver.

A further **29 are missed in both runs** — Wowhead never rescued them either,
so they are unowned gaps. By slot: trinket 9, ranged 4, legs 3, finger 3, then a
tail. The trinket and ranged/libram concentration is the standout: those are
badge, reputation, and world-drop items whose sources our pipeline resolves
worst. Persistent misses include Bloodlust Brooch's peers — Hourglass of the
Unraveller, Abacus of Violent Odds, Mark of the Champion, Slayer's Crest — and
every ret libram (Avengement, Fervor, Hope).

### Reading

This does **not** say the shipping universe should drop Wowhead — losing those
22 items would be a real recall regression for users. Keep it as an input for
what ships; use the held-out number as the diagnostic. Two runs, one to ship and
one to grade.

It does say the Phase 1 gate box cannot be closed by quoting 76.4%. The honest
figure for "would our pipeline find the right items on its own" is 58.5%, and
the trinket/libram gap is a concrete, ownable defect rather than a vague recall
worry. Ticket 18 now has its instrument and its first measurement.

---

## 2026-07-28 — Two membership bugs: polearms and world bosses

Both found by reading the held-out recall misses (previous entry) against the
design intent, which is **raid zone drops**. Most of the 29 persistent misses
turned out to be *correct* exclusions — vanilla raids, heroic 5-mans, quests,
world drops. Two were real defects.

### Polearms were rejected alongside staves

`ret_eligible_d7` rejected `WEAPON_POLEARM` and `WEAPON_STAFF` in one condition.
Paladins can wield polearms; staves they cannot. Authority is wowsims'
`ui/core/player_classes/paladin.ts`, which lists Polearm with
`canUseTwoHand: true` and omits Staff entirely:

```
static weaponTypes: EligibleWeaponType[] = [
    { weaponType: WeaponType.WeaponTypeAxe, canUseTwoHand: true },
    { weaponType: WeaponType.WeaponTypeMace, canUseTwoHand: true },
    { weaponType: WeaponType.WeaponTypeOffHand },
    { weaponType: WeaponType.WeaponTypePolearm, canUseTwoHand: true },
    { weaponType: WeaponType.WeaponTypeShield },
    { weaponType: WeaponType.WeaponTypeSword, canUseTwoHand: true },
];
```

Blast radius is small: of 57 two-hand polearms in `db.json`, only three have a
source resolving to a phase≤3 raid zone. **+28774 Glaive of the Pit**
(Magtheridon, admitted at p2 and p3) and **+32248 Halberd of Desolation** (Black
Temple, p3 only). 34183 Shivering Felspine is Sunwell, correctly still out. No
caster polearm exists at quality ≥ 3, so nothing embarrassing entered.

### World boss drops were unreachable by design

Doomwalker and Doom Lord Kazzak drops carry **no `sources` key at all** in
`db.json` — not an empty array, the key is absent. `db.zones` (74 entries) holds
only instanced content, no outdoor zones, and `db.npcs` has no record for either
boss. So no `data/phase_raids.json` row could ever have matched them, whatever
the zone was called.

AtlasLoot *does* carry both loot tables (`WorldBossesBC`, 20 items, with
npcIDs), but `parse_atlasloot.py` dropped the block: it has no `MapID` and had no
`INSTANCE_ZONE_ALIASES` entry, so `resolve_zone` returned `None`. Adding the
alias plus a `{"phase": 1, "name": "World Bosses", "zoneId": null}` row admits
13 ret-eligible drops.

### Net effect

| | before | after |
|---|---|---|
| `ret-p2.json` | 224 | **238** |
| `ret-p3.json` | 347 | **362** |
| Wowhead recall (list as input) | 94/123 (76.4%) | **100/123 (81.3%)** |
| Wowhead recall (**held out**) | 72/123 (58.5%) | **78/123 (63.4%)** |
| caster reject rate | 32.9% | 32.9% |

Nothing was removed from either universe. The caster reject rate is unchanged, so
the additions did not skew the population. Tier coverage stays 15/15.

Some admitted world-boss items are caster gear (Ancient Spellcloak of the
Highborne, Ring of Flowing Light). That is expected and pre-existing: cloaks,
rings and necks have no armor-type gate in D7, and the caster junk filter is
deliberately **off** pending ticket 18's sim measurement.

### Guards added

`pool-hardening.test.ts` now asserts polearms are admitted, that **no** staff
ever enters the universe, and that the five Wowhead-named world-boss items carry
`source.zone === "World Bosses"`. Two hard-coded universe counts (349→362 in
`pool-hardening`, 224→238 in `pool.test.ts`) caught both membership changes
before commit — they are working as intended and were updated with reasons rather
than loosened.

### Still non-raid, still out (deliberate)

Badge and reputation vendors are not covered. Per the user, badge items matter at
P1 (heavily non-raid) and possibly P4, not P3, so this is not blocking. Every ret
libram and most badge/rep trinkets remain absent — see ticket 17.

---

## 2026-07-28 — Wowhead "Best" recall: the right yardstick

The 123-entry aggregate recall (63.4% held out) understates the pipeline badly,
because the P3 list is a *guide*, not a BiS set: 89 P3 rows plus carried stages,
covering headline picks, alternatives, hit-variants, PvP options and old tier.
Missing "PVP Option" or "Old Tier" is not a defect.

Scoring only what Wowhead actually recommends — the `Best`-family `rankLabel`
rows (`Best`, `Best - Hit`, `Best - Crafted`, `Best - No Expertise`, …), 21 of
them:

| | with list as input | **held out** |
|---|---|---|
| Best-family recalled | 19/21 | **15/21** |
| **raid-sourced Best only** | 14/14 | **14/14** |

**Every raid-sourced Best pick is recalled independently — 14/14, zero misses.**
All six held-out misses are non-raid by category, and each is a source the
pipeline deliberately does not cover:

| Item | Slot | Source |
|---|---|---|
| Swiftstrike Shoulders | shoulder | Leatherworking |
| Cloak of Darkness | back | Leatherworking |
| Bindings of Lightning Reflexes | wrist | Leatherworking |
| Shapeshifter's Signet | finger | Lower City exalted |
| Bloodlust Brooch | trinket | G'eras, 41 Badges of Justice |
| Libram of Avengement | ranged | Heroic Blood Furnace |

Three crafted, one reputation, one badge, one heroic dungeon. Zero raid misses.

**Reading.** The raid-scoped universe does what it claims. The recall gap is
entirely the non-raid source categories that are known, deferred, and tracked —
badge/rep vendors (ticket 17; user scoped these to P1 and possibly P4, not P3)
and crafting (ticket 13, `13-raid-recipe-crafts.md`). This is the measurement the
Phase 1 gate box asks for, and it passes on the axis the design targets.

Quote **14/14 raid-sourced**, or **15/21 Best-family held out** if a single
headline number is wanted. Do not quote 63.4% as a quality figure — that grades
the pipeline against content it was never built to cover.

---

## 2026-07-28 — Fresh P3 ranking on the fixed universe

The committed rank report predated the polearm and world-boss fixes, so it was
re-run against the 362-entry universe.

```
pnpm rank --region US --realm dreamscythe --character slamaltman \
  --offline --max-phase 3 --report .scratch/rank-reports/slamaltman-p3-postfix.html
```

Baseline 2003.26 DPS, 362 pool / 357 ranked, **43 above cutoff**
(`{absDps: 3.4, pct: 0.15}`). Artifacts: `.scratch/rank-reports/slamaltman-p3-postfix.{html,json,run.log}`.

### Top of the shortlist

| Δ DPS | Item | Slot |
|---|---|---|
| +47.94 | Belt of One-Hundred Deaths | waist |
| +43.64 | Torch of the Damned | weapon |
| +26.34 | Cataclysm's Edge | weapon |
| +22.57 | Band of Devastation | finger |
| +20.34 | Unstoppable Aggressor's Ring | finger |
| +19.75 | Cursed Vision of Sargeras | head |

These are recognisable ret BiS-tier items, in a plausible order.

### The caster-admission worry did not materialise

Admitting world bosses brought in caster gear (cloaks, rings and necks have no
armor-type gate, and the junk filter is off pending ticket 18). **The sim sorts
them out unaided** — every one lands well below cutoff: Ancient Spellcloak of the
Highborne −22.77, Ring of Flowing Light −27.27, Topaz-Studded Battlegrips −56.80,
Faceguard of the Endless Watch −94.20.

Of the 15 items admitted today, only two clear the cutoff, both legitimately:
**Black-Iron Battlecloak +13.40 (rank 19)** and **Ring of Reciprocity +3.77
(rank 38)**. Both are Doomwalker/Kazzak drops that were unreachable before.

The polearms rank below cutoff (Glaive of the Pit −103.91, Halberd of Desolation
−33.49). That is correct for *this* character — he wields a strong sword and both
polearms are stat-less proc weapons — and does not argue against admitting them,
since they are real options for a differently geared paladin.

### Against Wowhead's Best-family picks, controlling for worn gear

| | count |
|---|---|
| already worn (correctly Δ0) | 7 |
| above cutoff | 11 |
| below cutoff | 3 |
| absent from the ranking | **0** |

The three below-cutoff picks are marginal: Swiftstrike Shoulders +1.98, Midnight
Chestguard +1.87, Choker of Endless Nightmares +0.41 — all positive, all under a
3.4 DPS cutoff, which is the expected shape for a well-geared character rather
than a defect.

**Nothing Wowhead calls Best is missing from the ranking.** Combined with the
14/14 held-out raid-sourced membership result, the two human-check gate boxes are
answered on the axis the design targets.

---

## 2026-07-29 — `maxPhase` A/B: the last Phase 1 gate box

Two tests in `packages/core/test/rank.test.ts`, because one phase pair could not
carry the whole claim.

### 1 → 2 — both axes wired to the same `maxPhase`

One character, one `deps`, two `rankUpgrades` calls differing only in
`maxPhase`. Candidate set: `[29381]` at 1 versus `[30101, 29381]` at 2, so the
phase-2 chest appears only at 2. Palette: `gemsForPhase(2)` adds exactly
32634–32639 over `gemsForPhase(1)` (156 → 162 entries).

**Limitation, measured not assumed.** All six gems phase 2 adds are EP-dominated
by a phase-1 gem of their own colour under ret P2 fill weights — the strongest,
32637 at 6.36 EP, loses to phase-1 30584 at 8.08. Running
`fillEmptyCandidateGems` at palette 1 vs 2 over all 1498 socketed items in
`data/items/index.json` gives **zero** differences. So at 1→2 the palette
genuinely changes but the fill output cannot, and the second axis is asserted on
`gemsForPhase` directly.

### 2 → 3 — the palette change reaching the sim request

Phase 3's epic gems do win, so this pair closes the stricter reading of the box.
Candidate **30104 Cobra-Lash Boots** against slamaltman's worn boots (30081,
ungemmed, so every candidate socket arrives empty and the fill must consult the
palette):

| maxPhase | gems sent to the sim |
|---|---|
| 2 | `[28362, 30584]` |
| 3 | `[32193, 32193]` |

Same character, same seed, same item — only `maxPhase` differs, and the gems the
engine actually put in the `RaidSimRequest` differ.

Choosing the fixture took two attempts. A phase-2 chest (30101) fails: the rank
path is migrate-then-fill-empties, so a candidate whose sockets the worn gems
already cover never consults the palette, and the request located was the
baseline's worn chest (`[24027, 24058, 24058]` = Crystalforge Breastplate).
118 universe items do differ on the real rank path at 2 vs 3; boots were picked
because the worn item is ungemmed.

**Mutation-tested, not merely green.** Neutering `gemsForPhase` to
`PALETTE.filter(() => true)` fails the 2→3 test
(`expected [32193, 32193] to not deeply equal [32193, 32193]`); neutering
`filterPoolByPhase` fails the 1→2 candidate-set assertion. `gems.ts` restored;
`git diff packages/core/src/` clean.

### Phase 1 gate: 10 of 10

All boxes are now checked. `pnpm verify` green at this tip.

### Incident note — repo damage from a host freeze

The machine froze mid-session and corrupted two git refs, both zero-filled
(41 and 40 null bytes) rather than missing:
`refs/heads/phase-1/five-seed-spread` and `refs/stash`. No commit objects were
lost — the tip (`22687ca`) was recovered from `.git/logs/HEAD` and the branch
rewritten with `git update-ref`'s file equivalent. The stash refs were
lint-staged's transient backups, each already auto-restored after its commit, so
deleting them cost nothing. `git fsck` is clean.

## Ticket 18 — junk-filter false negatives, sim-based (2026-07-30)

The go/no-go this ticket gated on. The junk filter's reject set was
cross-referenced against a completed full-universe sim run, asking directly:
would applying the filter have dropped an item the sim ranked above cutoff?

Re-run with:

```
python .scratch/ticket-18/measure_junk_false_negatives.py \
  --universe data/universes/ret-p3.json \
  --report .scratch/rank-reports/slamaltman-p3-postfix.json \
  --db vendor/wowsims/db.json
```

The script imports `is_caster_junk` / `build_percentiles` / `item_stat_map` from
`scripts/assemble_universe.py` rather than reimplementing them, so it measures
the filter that would actually ship.

Report: `slamaltman-p3-postfix.json` (baseline 2003.26 dps, cutoff
`{absDps: 3.4, pct: 0.15}`, 357 ranked, 43 above cutoff).

| universe | rejects | caster-only | EP-floor | above cutoff | unranked |
|---|---|---|---|---|---|
| `ret-p3` (362) | 136 | 119 | 17 | **0** | 0 |
| `ret-p2` (238) | 85 | 74 | 11 | **0** | 0 |

**Zero false negatives on both.** The P3 caster-only count (119, 32.9%) matches
the figure the report already emitted.

The margin is not marginal. Ranked by `deltaDps`, the *best*-simming rejected
item is **-19.16 dps** (Drape of the Righteous) — a downgrade — against a
+3.4 dps cutoff. That is a 22.6 dps empty band, ~10x the per-item standard
error (~2.15). The three lowest above-cutoff survivors (Lightbringer
Breastplate +3.11, Softstep Boots of Tracking +3.29, Ring of Deceitful Intent
+3.30) all clear via the percentage arm of the OR-cutoff, and all survive the
filter.

P2 was measured against the same P3 sim results: `ret-p2` is a subset of
`ret-p3`, same character and baseline, and every P2 reject resolved to a ranked
item (`unranked: 0`). `build_percentiles` is computed per-universe, so the
EP-floor arm was recomputed against P2 membership rather than reused.

**Scope limit:** one character (slamaltman), who is already well geared, so
"below cutoff" partly reflects that baseline. The 22.6 dps margin is wide enough
that a different character seems unlikely to flip the verdict, but that is
**untested** — no second character has been simmed against the reject set.

**Go.** The junk filter is cleared to be applied.

### Correction (2026-07-30) — the margin argument was wrong, and so was the weapon rule

The entry above justified the junk filter partly on the size of the gap between
the best-simming reject (-19.16 dps) and the cutoff (+3.4). **That reasoning is
withdrawn.** A margin is measured against one character's baseline; change the
baseline and every number in it moves, which is the exact concern it was
offered to answer. It should not be quoted.

An SME review (`.scratch/handoffs/sme-junk-filter-judgment.md`) then found a
real defect behind the weapon rejections.

`ep_score` (`scripts/assemble_universe.py`) sums `stats[i] * weight[i]`. Weapon
damage is not in the stats map — it is `scalingOptions.0.weaponDamageMin/Max` —
and the ret EP weights have no weapon-damage term. So `curationHint` ranked
two-handers blind to their largest damage contribution, and the EP-floor rule
was applied to the `weapon` slot on that ranking.

Verify:

```
python -c "import json;d=json.load(open('vendor/wowsims/db.json'));\
i=[x for x in d['items'] if x['id']==28774][0];\
print(i['scalingOptions']['0'])"
```

Glaive of the Pit (28774) scored `curationHint` **0.00**, last of 17 weapons,
on an empty stat map — while carrying 354-532 damage at 3.7 speed
(**119.7 weapon dps, within 5.7% of the worn Lionheart Executioner**), three
gem sockets and a 1.33 PPM proc. Hammer of the Naaru (28800) is 119.9 weapon
dps with three sockets against the worn weapon's zero.

This is the same blind spot the `ranged` / `trinket` exemptions already work
around: the three P3 librams also have empty stat maps and would all be
rejected without their exemption.

**Fix:** `weapon` removed from `SLOTS_WITH_EP_SIGNAL`. Re-measured, still zero
false negatives, with the two weapons no longer rejected:

| universe | caster-only | EP-floor | combined | above cutoff |
|---|---|---|---|---|
| `ret-p3` (362) | 119 | 15 (was 17) | 134 (was 136) | **0** |
| `ret-p2` (238) | 74 | 10 (was 11) | 84 (was 85) | **0** |

The sim did rank both weapons as downgrades for this character (-70.51,
-103.91), which is expected against a stronger worn weapon — but that is not
what rejected them. `curationHint` dropped them before the sim was consulted.

Rule 1 (caster-only) is unaffected: it is a stat-*presence* test, never a
magnitude test, so it does not depend on `ep_score` at all.

Filed as ticket 27 (`ep_score` blind to weapon damage) — the underlying scoring
gap is still there for any future use of `curationHint` on weapons.

---

## 2026-08-05 — Phase 2 gate: the report-events fallback route

Closes:

> ☑ fallback route exercised on a character with no ranked kills

Owned by `.scratch/phase-2/issues/04-resolution-and-fallback.md`.

### "No ranked kills" is about a ranked parse, not about whether the boss died

The ticket asked for a character with no ranked kills, and the obvious reading —
find a wipe-only report — is the wrong one. All three parts below are one
committed script, so this is re-runnable from a fresh worktree:

```bash
python scripts/probe_ranked_route.py --name slamaltman --server-slug dreamscythe --region US
```

**Part 1, kills.** Every one of slamaltman's 25 most recent reports contains
kills — 25/25 had at least one, and the SSC / TK reports run 10 kills out of 11
boss fights. There was no wipe-only report to capture. (Skip this part with
`--skip-kills`; it is the expensive one, one query per report.)

**Part 2, ranks.** The distinction that matters is `encounterRankings`, which is
what the `ranked` route resolves through. Slamaltman returns
`totalKills=None, ranks=0` on encounters 623 (Hydross), 624 (The Lurker Below)
and 625 (Leotheras) — encounters he has ten kills on. The encounter IDs were
confirmed against `worldData.zones` (zone 1010, SSC / TK) before being trusted,
because a wrong id returns the same empty result as an unranked character.

**Part 3, control** — because zero ranks only means "no ranked kills" if the
query is capable of returning a non-zero. Hydross has 100 ranked characters; the
top of that leaderboard (Seonsu @ Herod) returns `totalKills=19, ranks=19` from
the *same* query shape. The query works; slamaltman is genuinely unranked.

Verdict line from the run on 2026-08-05:

```
  slamaltman has NO ranked kills -- the 'report-events' fallback
  is the only route that reaches this character's gear.
```

So slamaltman is himself the character the gate box asks for, and the fixture is
a real capture rather than a contrived one.

### The capture

```bash
python wcl_probe.py --name slamaltman --server-slug dreamscythe --region US \
  --report-code VGjFb3mtX9xHgyav \
  --raw-out test/fixtures/slamaltman-report-events.raw.json
```

~12.62 points against the 3,600/hour budget. Written: 25 combatants, 19 gear
entries for slamaltman, plus the buffs table — committed.

The captured fight is Hydross the Unstable with `kill: true`. That is not a
contradiction and the test asserts it on purpose: the route is `report-events`
because the character has no ranked *parse*, not because the boss lived.

**The first capture was wrong, and the way it was wrong is the lesson.** It came
from report `mKTA9V7Lx4Ck2DXf` (Magtheridon), which is slamaltman's one
**protection** night among his recent reports — talents 0/44/17, 17,192 armour,
a shield in the off-hand. Nothing objected, because the fixture builder
hardcoded ret's `[5, 11, 45]` on the false claim that `--raw-out` does not
persist tree points. It does. Every downstream number was ret EP weights and
the ret P2 preset applied to a tank set, and the only visible symptom was a
baseline of 758.98 DPS against the ranked fixture's 2003.26 — which reads as a
plausible "different report, different gear" until you resolve the items.

Caught by the domain axis of the pre-merge review, not by any test. The builder
now reads `talents` from the capture and throws when it cannot, and
`packages/core/test/report-events-fallback.test.ts` asserts the build is ret
(retribution plurality, empty off-hand). Re-captured from a ret fight, the
fallback baseline is **2003.26** — identical to the ranked fixture, which is the
right answer for the same character's same gear.

**The fixture was fixed; the engine gap was not.** Nothing on the resolution
path calls `classifySpec`, so any character who tanks or off-specs on some
nights can still resolve to a fight they played in another spec and be simmed
against the wrong preset and EP weights. That is
`.scratch/carry-forward/issues/40-fight-resolution-is-not-spec-aware.md`, and it
carries an open product decision: preferring a spec-matching fight is
uncontroversial, but the fallback when none exists ("assume their last fight is
their spec") only produces a right answer once the tool can sim that other spec,
which needs more than the one shipped spec.

Check which report a fresh worktree's fixture actually holds, and that it is
ret, without spending points:

```bash
python -c "import json; d=json.load(open('test/fixtures/slamaltman-report-events.raw.json')); a={x['id']:x['name'] for x in d['actors']}; e=[v for v in d['combatant_info_events'] if a.get(v['sourceID'],'').lower()=='slamaltman'][0]; print(d['report_code'], d['fight']['name'], [t['id'] for t in e['talents']], 'offhand=', e['gear'][16]['id'])"
```

Expected: `VGjFb3mtX9xHgyav Hydross the Unstable [5, 11, 45] offhand= 0`.

### The behaviour

`Ranking` had no `fight` field, so nothing carried the route out to a caller.
Added `Ranking.fight: ResolvedFight` (reportCode, fightId, encounterName,
killedAt, route) per PLAN.md §4, and `resolveFight` now prefers a ranked
summary and falls through to report-events rather than depending on list order.

```bash
pnpm vitest run packages/core/test/report-events-fallback.test.ts
```

11 passing: the fixture loads to 17 sim slots from 19 WCL entries, `rankUpgrades`
returns a `Ranking` for a character who previously reached
`RankError('no-qualifying-fight')`, `ranking.fight.route` reads `report-events`,
and the throw still happens when neither route has a fight.

`pnpm verify` green on the branch.
