# Verification log

PLAN.md §14: *"No stage starts until the previous gate is written into
`docs/verification-log.md`."* This is that file. One entry per gate box, each
recording what was actually run and what came back — not what was expected.

---

## 2026-07-26 — Stage 0, second sitting

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
require a profession. Highest gem tier in use is T4.

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
  Gems by content phase P1–P5 are **163 / 6 / 39 / 0 / 6** (from `db.json`;
  the curated `data/gems/palette.json` is 156 / 6 / 39 / 0 / 6), matching the
  review's figures exactly, and confirming the 39 T6 (P3) epic gems that
  `maxPhase` must gate.
- Gem records carry `unique` and `requiredProfession`, so §9's palette filter has
  the fields it needs.

### Still open after this sitting

The two `wowsimcli` boxes — closed in the third sitting below.

---

## 2026-07-26 — Stage 0, third sitting (close the last two boxes)

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

### Stage 0 gate

Both remaining boxes closed. Stage 1 may start once this log is on `dev` and the
§14 checklist in PLAN.md / `docs/stage0-findings.md` is ticked to match.

---

## 2026-07-26 — Stage 1, first sitting (five-seed spread)

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
| ~~Independent~~ *(see correction)* | 11, 22, 33, 44, 55 | **0.099 DPS** | **1.678 DPS** |
| Shared | 42 × 5 | **0.000 DPS** | 1.678 DPS |

Shared-seed repeats are bit-identical — the sim is deterministic given a seed.
What forms tie groups is the **reported** SE on the ~1.7 DPS scale.

> **Correction (2026-08-19, ticket 236).** The first arm is **not independent**,
> and the sentence this entry originally drew from it — "independent seeds barely
> move the *mean* (0.1 DPS)" — was wrong. It read a property of the seeds as a
> property of the sim.
>
> Upstream seeds iteration `i` from `RandomSeed + i`
> (`vendor/tbc-new-fork/sim/core/sim.go:248-251`, called per iteration at
> `:347-348`), so a run of `N` iterations from seed `S` consumes the streams
> `S..S+N-1`. At the 5,000 iterations this sitting used, seeds 11 and 55 are 44
> apart and so share 4,956 of 5,000 streams. The five runs were near-copies of
> one run, which is why their means barely moved. The sim was never shown to be
> insensitive to seed; these seeds were shown to be nearly the same seed.
>
> Re-measured at 3,000 iterations with `scripts/seed_overlap_probe.py` against
> the same pinned binary, as `sampleSd/SE` — a spread that matches the reported
> SE gives ~1.0:
>
> | seeds | sampleSd/SE |
> |---|---|
> | 11, 22, 33, 44, 55 | **0.087** |
> | `11 + k*3000`, 20 seeds | **0.895** |
> | 20 scattered seeds | **1.074** |
>
> Properly spaced seeds move the mean about ten times as much as this entry
> reported. Full table and method in
> [`.scratch/handoffs/ticket-236-seed-spacing-measurements.md`](../.scratch/handoffs/ticket-236-seed-spacing-measurements.md).
>
> **What survives.** The **reported SE** column (1.678 DPS) and everything
> derived from it are unaffected: the sim reports that per run from its own
> iteration variance, not from any spread across seeds, and the cutoff constant
> below is built from reported SE for exactly the reason the next section gives.
> The bit-identical shared arm is also unaffected. What does not survive is any
> claim about sim stability inferred from the 0.099 spread.
>
> `DEFAULT_SEEDS` is now derived as `base + k*iterations` rather than pinned
> (`packages/core/src/se.ts`, `replicateSeeds`), and `assertUsableSeeds` rejects
> under-spaced seeds.

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
`absDps`. Stage 1 engine code should pin this pair as one constant (not
re-provisional 3.0). Paired-replicate SE for the top ~8 stays Stage 2.

### Where this leaves Stage 1

One gate box closed. Remaining Stage 1 work: scaffold, generated protos, three
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
`TypeSimple` label is not what the Go sim is running for the Stage 0 baseline.
Compose / the skeleton generator must merge the pinned APL; `type`+`simple`
alone is wrong. PLAN.md §8.2 updated to the build-time generator + golden
skeleton shape (design C).

---

## 2026-07-28 — Stage 1 gate reconciliation (audit, no new engine work)

The Stage 1 gate in PLAN.md §14 showed 2 of 10 boxes checked. Several were
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

> **Counts restated 2026-08-06 on `phase-2/feral`.** The property still holds —
> zero empty-source rows, tier coverage still complete — but the totals grew and
> two more universes now ship:
>
> | Universe | entries | empty `sources` | tier |
> |---|---|---|---|
> | `ret-p2.json` | 235 | **0** | 10/10 |
> | `ret-p3.json` | 359 | **0** | 15/15 |
> | `feral-p2.json` | 250 | **0** | 10/10 |
> | `feral-p3.json` | 377 | **0** | 10/10 |
>
> Feral tier coverage stops at T5 by construction: T6 Thunderheart is absent
> from `FERAL_TIER_PIECE_IDS`, so 10/10 is the whole expected set, not a
> shortfall. Ret grew because the wowsims curated gear sets now grant
> membership; feral is new.

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
  `items-gems.test.ts` asserts T6 epic gems stay out of a maxPhase-2
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

### Where this leaves Stage 1

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

PLAN.md §14's Stage 1 gate asks that top items survive a check against
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

It does say the Stage 1 gate box cannot be closed by quoting 76.4%. The honest
figure for "would our pipeline find the right items on its own" is 58.5%, and
the trinket/libram gap is a concrete, ownable defect rather than a vague recall
worry. Ticket 18 now has its instrument and its first measurement.

> **Re-measured 2026-08-06 on `phase-2/feral`**, same two commands, same `--max-phase 3`:
>
> | | Wowhead as input | Held out |
> |---|---|---|
> | universe total | 347 → **359** | 325 → **339** |
> | `listOnlyMembership` | 21 → **23** | 0 |
> | Wowhead P3 BiS recall | 76.4% → **83.7%** (103/123) | 58.5% → **67.5%** (83/123) |
> | tier pieces present | 15/15 | 15/15 |
>
> The held-out figure is the one that matters, and **58.5% → 67.5%** is a real
> improvement in what the pipeline finds *without* the answer key: that branch
> taught `parse_wowhead_source` the badge-vendor, reputation-vendor (both word
> orders) and quest-with-zone phrasings, so rows whose prose was previously
> discarded now resolve to a source from db/AtlasLoot corroboration rather than
> depending on the list.
>
> The reading above is unchanged. Keep Wowhead as a shipping input; use the
> held-out number as the diagnostic. The remaining gap is still concentrated in
> badge, reputation and world-drop items — see
> `.scratch/carry-forward/issues/45-unparsed-wowhead-prose-and-unknown-bucket.md`
> for the 87-of-627 rows that still parse to nothing.

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
Stage 1 gate box asks for, and it passes on the axis the design targets.

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

## 2026-07-29 — `maxPhase` A/B: the last Stage 1 gate box

Two tests in `packages/core/test/rank.test.ts`, because one phase pair could not
carry the whole claim.

### 1 → 2 — both axes wired to the same `maxPhase`

One character, one `deps`, two `rankUpgrades` calls differing only in
`maxPhase`. Candidate set: `[29381]` at 1 versus `[30101, 29381]` at 2, so the
phase-2 chest appears only at 2. Palette: `gemsForPhase(2)` adds exactly
32634–32639 over `gemsForPhase(1)` (156 → 162 entries).

**Limitation, measured not assumed.** All six gems `gemsForPhase(2)` adds are EP-dominated
by a phase-1 gem of their own colour under ret P2 fill weights — the strongest,
32637 at 6.36 EP, loses to phase-1 30584 at 8.08. Running
`fillEmptyCandidateGems` at palette 1 vs 2 over all 1498 socketed items in
`data/items/index.json` gives **zero** differences. So at 1→2 the palette
genuinely changes but the fill output cannot, and the second axis is asserted on
`gemsForPhase` directly.

### 2 → 3 — the palette change reaching the sim request

T6's epic gems do win, so this pair closes the stricter reading of the box.
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

### Stage 1 gate: 10 of 10

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

## 2026-08-06 — Stage 2 gate: the five boxes closed by the merged slices

Five gate boxes were closed by work already merged into `phase-2/trust`
(`caches`, `disclosure-and-caps`, `apply-view`) but never written into this log.
This sitting is **transcription of existing evidence**, not new implementation —
no source file changed, and every claim below is a test that passes at the
integrated tip.

Reproduce all five at once:

```bash
pnpm exec vitest run packages/core/test/rank.test.ts packages/core/test/view-gate.test.ts packages/core/test/meta-repair.test.ts packages/core/test/store-contract.test.ts packages/core/test/content-hash.test.ts packages/core/test/view.test.ts
```

Run on 2026-08-06 at `42db95a`: **6 files, 124 tests, all passing.**

### ☑ Re-run hits cache; deltas stable

Owned by `.scratch/phase-2/issues/01-caches.md`.

**The obvious test does not close this box, and the ticket says so from
measurement rather than suspicion.** `rank.test.ts`'s "serves the second
identical call from the store without simming" passed *before* either new cache
existed and still passes with both reverted: a second identical call returns at
the Stage 1 ranking cache before gear is read or a sim is spawned, so "zero
reads, zero runs" is satisfied without any of this ticket's work.

The evidence is therefore the two **hash-miss** cases, where the ranking cache
misses and execution actually reaches the new caches:

| Test (`rank.test.ts`) | What moves the hash | Assertion | Fails without |
|---|---|---|---|
| `fetches gear once across runs whose ranking hash differs` | `maxPhase` 1→2, same resolved fight | `fetches.reads` stays **1** across both runs | `CachingGearSource is not a constructor` |
| `reuses a cached sim result when only the candidate pool grows` | one candidate added | `sim.runs === afterFirst + 2`, not +4 | `expected 6 to be 4` |

Both were confirmed to fail by stashing `rank.ts` / `gear-source.ts` — a test
that cannot fail is exactly the trap the "deltas stable" half warns about.

**Where the cache lives matters and the first attempt was wrong.** Building the
gear cache inside `rankUpgrades` went red on the pre-existing "re-sims when the
logged gear changes but the character does not" case: a `kv` hit made the
source's fresh gear unreachable, so the hash matched and last run's numbers were
served for a re-gemmed set — the staleness ADR-0019 exists to prevent.
`rankUpgrades` always calls `deps.gear.readGear` and hashes what comes back; the
cache wraps the WCL adapter (`CachingGearSource`), which is why
`RecordedGearSource` stays uncached and the offline tests keep their meaning.
`findFights` is deliberately **not** cached — a fight list grows as a character
raids, so it is not immutable.

**"Deltas stable" had teeth only after the review.** The pre-merge review found
the sole deep-equal sat inside the identical-re-run test, i.e. it covered the
Stage 1 ranking cache and not the new ones — a sim cache returning a mismatched
observation would have moved every `deltaDps` while the run-count assertions
still passed. The pool-grows test now deep-equals the cached candidate's
`RankedItem` across runs; the assertion entered in `8ca148c` (whose subject
line, "Key the gear cache by character, not by fight alone", describes the other
change it carried — `git log -S "expect(after).toEqual(before)"` locates it).

`SqliteStore` (`node:sqlite`) and `MemoryStore` pass one shared contract suite —
25 tests across both halves of the `Store` interface, plus a persistence test
that reads a blob back through a second connection to the same file.

**Scope limit:** `SqliteStore` has **zero production call sites**; `cli.ts` still
constructs `MemoryStore`. Deployment is Stage 4. Two defects are known and
deferred to `.scratch/carry-forward/issues/31-sqlitestore-job-ids-and-kv-created-at.md`
(`Blocks: phase-4`): `kv` omits §11's `created_at`, and job ids from
`SELECT COUNT(*)` race two writers and reuse ids after a delete. Neither can
bite until something deploys it with more than one writer.

### ☑ Inactive-meta baseline auto-repaired and disclosed

Owned by `.scratch/phase-2/issues/02-disclosure-and-caps.md`.

Two altitudes, because the unit tests passing says nothing about whether the
engine wires one to the other.

**The unit level** — `meta-repair.test.ts`, on slamaltman's real logged gear:

- `leaves an already-active slamaltman layout alone` — his actual layout is
  `active`, and repair returns `metaAdjusted: false`, `swaps: []`. A repairer
  that fires on a healthy set would be worse than none.
- `repairs slamaltman when yellow contribution is stripped` — the lever is real
  gear: Crystalforge Breastplate (30129) carries `[24027, 24058, 24058]`, and
  its two orange gems are the entire yellow count. Recolouring them red drives
  `gemColorCounts(...).yellow` to 0 and the meta to `inactive`; repair returns
  it to `active`.

**Through `rankUpgrades`** — `rank.test.ts`'s "auto-repairs an inactive meta and
discloses it as a run substitution", same lever, driving the real engine:

| Assertion | Value |
|---|---|
| `ranking.baseline.metaAdjusted` | `true` |
| substitution present | `field === "gems.meta-repair"` |
| detail shape | contains `Meta inactive`, matches `/\d+→\d+@item \d+/` |
| tier | **not** in `assumptions.standing` |

That last row is the one worth keeping: §9 R7's two tiers must not blur, so a
run substitution appearing among standing assumptions is a failure even though
the repair itself worked.

### ☑ A meta repair that would break a socket bonus picks the other move (§9, R4)

Same ticket. **Closed by pre-existing work, and the honest thing is to say so:**
both the pricing rule (`meta-repair.ts:193-197`) and its fixture
(`meta-repair.test.ts:94`) predate the `disclosure-and-caps` branch, which is
what the branch's own review independently confirmed.

The rule is that the socket-bonus forfeit is priced **inside** the move's cost,
not checked afterwards:

```ts
let cost = gemEp(from, opts.epWeights) - gemEp(candidate.id, opts.epWeights);
if (matchedBefore && !socketsMatch(slot.itemId, trialGems)) {
  cost += socketBonusEp(slot.itemId, opts.epWeights);
}
```

The fixture is constructed so that the gem-only cost **ties**, which is the only
way to prove the bonus term is what decides. Under strength-only weights, yellow
and blue/green gems all score 0, so yellow→green and yellow→blue cost the same
on gems alone; the chest's +4 str socket bonus is the entire difference. The
test asserts the repair recolours to a gem that satisfies yellow *and*
contributes blue — colour 5 (Green) or 8 (Prismatic) — rather than a pure blue
that would activate the meta just as well while forfeiting the bonus.

Both moves fix the meta. Only one of them is free. The test fails if the
repairer picks the other.

### ☑ A raid filter on a tier-token slot returns the tier piece (§8.3.2)

Owned by `.scratch/phase-2/issues/03-apply-view.md` (closed). This is §15's
quiet failure mode: a "Karazhan" filter that silently omits every T4 piece,
because the tier piece reaches its zone only through `ItemSource`
`kind: 'token'` — a two-hop resolution the filter must follow.

`view-gate.test.ts`, three tests, all through a real `rankUpgrades` ranking:

| Test | Filter | Rows |
|---|---|---|
| returns the token-sourced T4 piece | `raid: "Karazhan"` | `[28530, 29072]` — 29072's `source.kind === "token"` |
| scopes a boss filter through the token hop too | `+ boss: "The Curator"` | `[29072]` only |
| does not return the tier piece under a different raid | `raid: "Tempest Keep"` | `[30129]`, no 29072 |

The premise is guarded first (`expect(ranking.items...).toContain(29072)`), so a
pass cannot come from the item being absent from the ranking entirely. The
Curator case matters independently: the boss filter has to follow the *token
source's own boss* and must not sweep in Moroes' neck. The Tempest Keep case
makes the filter discriminating rather than merely empty — TK has its own token
piece, which is what comes back.

**Mutation-checked, not merely green:** matching only the `raid` hop instead of
the `token` hop fails a named test, per ticket 03's outcome.

**Deferred:** `.scratch/carry-forward/issues/37-token-boss-unguarded-and-fixtures-bypass-the-map.md`
— 45 hand-written `ItemSource` literals across the test suite, none cross-checked
against the committed universe. They are correctly *typed*, so ticket 34 (tests
are never typechecked) would not catch them either.

### ☑ Toggling any `ViewOptions` field does not change `contentHash` or trigger a sim

Same ticket. Ticket 30 named the right altitude for this box and it is **not**
the pure-function level — that is why the box outlived the `content-hash` branch.

`content-hash.test.ts` already proved the hash *function* ignores
ViewOptions-shaped fields (mutation-checked: `hashPayload` builds its object
field by field, and the test fails if that becomes a spread). That is half the
box at the wrong altitude, and it cannot reach "or trigger a sim" at all.

`view-gate.test.ts` drives 14 `ViewOptions` combinations against a ranking
produced by `rankUpgrades` with a counting `SimRunner` and a counting
`GearSource`:

| Test | Claim |
|---|---|
| `toggling any ViewOptions field changes neither contentHash nor the sim count` | `contentHash` identical across all 14; sim count unchanged |
| `serves every view change from one ranking, without re-entering the engine` | 14 views rendered, `gear.entries` stays **1** |
| `keeps the ranking's own rows and deltas intact across every view` | `ranking.items` deep-equal to a `structuredClone` taken before |

**The middle test is the one that closes the box, and the reason is recorded in
the test itself.** `applyView` is pure and never receives a `SimRunner`, so
asserting on the sim counter *inside* the view call is trivially true — the
first test says as much and keeps the assertion only as a tripwire on a future
`applyView(r, v, deps)`. The claim the box actually makes is about the
**caller's** loop: one `rankUpgrades`, then N re-renders. A caller that re-ranked
to serve a view change would satisfy every pure-function test in the file and
still violate the box — and would *not* be caught by the sim counter either,
because identical input hits the ranking cache and costs zero sims. Counting
**gear entries** is what discriminates: a re-ranking caller reads 15.

Each run's `sim.runs > 0` is asserted before the loop, so "count unchanged" is
never vacuously true against a ranking that never simmed.

**One real bug this branch found by running the CLI rather than the unit tests,**
worth recording because the unit tests were green throughout: tie grouping
originally extended each group against its running bounds, so on the actual ret
P2 Karazhan ranking (reported SE ~2.18 DPS, adjacent deltas much smaller) the
overlaps chained and all 100 rows collapsed into one tie group — items 20+ DPS
apart marked as tied, the exact "reads as broken" failure §10 warns about.
Groups are now leader-anchored and bounded at 2×SE, with a regression test
(`does not chain a long ladder into one undifferentiated group`).

**Deferred:** `groupBy: 'raid'` keys off the first zone-bearing source, arbitrary
for a multi-zone item (ticket 35); the below-cutoff expand is modelled as data
(`belowCutoffInView`, hidden never deleted) rather than as a UI affordance,
since there is no UI until Stage 3.

### Where this leaves the Stage 2 gate

**6 of 8 boxes** recorded by this sitting, up from 1. The other two are owned by
`.scratch/phase-2/issues/05-feral.md`, the last slice, which merged into
`phase-2/trust` at `e841a67` after this entry was written. Ticket 05 is closed
and carries a verdict for both — **one PASS, one PARTIAL** — in
[`.scratch/phase-2/feral-gate-verdict.md`](../.scratch/phase-2/feral-gate-verdict.md),
with the coupling evidence in `.scratch/phase-2/feral-coupling-audit.md`:

| Box | Verdict |
|---|---|
| feral shipped without a structural change to `rankUpgrades` or its seams | **PASS** |
| ≥3 real characters produce believable shortlists | **PARTIAL** — `sme-rank-review` returned trust-with-caveats and filed carry-forward 41; shredzepelin's capture is an off-tank fight, so usable characters is 2 of 3 (ticket 06, 2026-08-08) |

**Those two boxes are deliberately not written up here.** This sitting was scoped
to the five closed by `caches` / `disclosure-and-caps` / `apply-view`, and a gate
box is closed by the slice that owns it recording its own evidence — not by a
neighbouring entry summarising a verdict file.

> **Superseded 2026-08-07.** Ticket 05's own entry below (2026-08-06, "feral as
> the second spec") records both boxes against its own evidence, which is what
> this paragraph was waiting for. The gate now stands at **7 of 8 recorded**,
> and PLAN.md §14 is ticked to match. The one open box — ≥3 characters produce
> believable shortlists — remains a live domain decision, not a formality, and
> §14's "no stage starts until the previous gate is written" still binds Stage 3
> until it closes.

---

## 2026-08-05 — Stage 2 gate: the report-events fallback route

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

---

## 2026-08-06 — Stage 2, ticket 05: feral as the second spec (gate boxes)

Branch `phase-2/feral`, merged into `phase-2/trust` as `e841a67`. Full verdict
in `.scratch/phase-2/feral-gate-verdict.md`, measurements in
`.scratch/phase-2/feral-coupling-audit.md`, review in
`docs/reviews/phase-2-feral.md`.

### ☑ Box — feral shipped without a structural change to `rankUpgrades` or its seams

The §14 box is a falsification test, and the claim survived.

The box asks what **feral** forced, so the diff is the feral slice against the
integration branch it branched from — not against `dev`, which would fold in
the four trust slices that ran first and *did* touch `seams/`:

```bash
# 42db95a = phase-2/trust before the feral merge; e841a67^2 = the feral tip.
# Pinned to SHAs, not branch names: `phase-2/trust~1...phase-2/feral` was the
# original form and is wrong, because feral is an *ancestor* of trust~1, so
# their merge-base is feral itself and the three-dot diff is always empty
# (carry-forward 82).
git diff 42db95a...e841a67^2 --stat -- \
  packages/core/src/rank.ts packages/core/src/seams/ \
  packages/core/src/compose.ts
# => packages/core/src/rank.ts | 20 ++++++++++++++++----
```

`seams/` and `compose.ts` do not appear: **0 lines**. No fourth port, no port
signature changed. `rankUpgrades`'s signature, `Deps`, `RankInput` and `Ranking` are
unchanged; `rank.ts` moved 20 lines turning `PRESET_ID` into a per-spec lookup.
`spec.ts` did change shape (+95) to carry `DetectedSpecId` and form-uptime
disambiguation, which §14 anticipated in the words "plus the disambiguation
confidence field".

That `Deps` already carried `raidSimSkeleton`, `epWeights`, `gemPalette` and
`pool` as **data rather than ports** (ADR-0019) is what made this cheap, and is
the thing the box was really testing.

**Reported separately, per ticket 05:** `scripts/assemble_universe.py` *did*
need a parameterisation pass. Six of its seven named hard-codings were paths;
`CLASS_PALADIN` and `ret_eligible_d7` were logic. The generator is a build-time
script producing one of the `Deps` data fields, so it is outside the box as
written — but it is a genuine spec-coupling surface the box does not name, and
saying so is part of the deliverable.

### ☐ Box — ≥3 real characters produce believable shortlists (PARTIAL)

Three characters rank end to end: slamaltman (ret), shredzepelin and nexess
(feral cat), from committed fixtures under `test/fixtures/`.

**The box does not close.** "Believable" is a domain judgment, and only
shredzepelin was ever put through `sme-rank-review` — it returned
**trust-with-caveats** and found a real defect (carry-forward 41). The
remaining work is a domain pass on slamaltman and nexess, not more pipeline
work.

**Update, 2026-08-08 — shredzepelin's shortlist is measured against the wrong
baseline, so the count of usable characters is 2, not 3.** His capture
(`shredzepelin.raw.json`, Morogrim Tidewalker) is a fight where he was **backup
tank**: 99.1% cat form, but wearing tank gear for a job that never came up.
Reported by the user from raid knowledge, not derivable from the log.
`classifyFeralForm` reports confidence ~1.0 and is *correct about the form*
while saying nothing about the role, so the fight looked like a clean cat
parse. Consequence: Icebound Cloak and Violet Signet (zero agility, zero AP,
both carrying defense rating) are ranked against a cat baseline, which is why
backs and fingers dominate his shortlist — the `sme-rank-review` §2 verdict
that this was "mostly correct rather than a bug" is corrected in
[`sme-rank-judgment-feral-shredzepelin.md`](../.scratch/handoffs/sme-rank-judgment-feral-shredzepelin.md).

Measured, from the `buffs_table` auras already in each fixture:

| fixture | fight | form | Salvation |
|---|---|---|---|
| shredzepelin | Morogrim | 99.1% Cat | **absent** |
| shredzepelin-bear | Karathress | 69.1% Bear | absent |
| nexess | Karathress | 96.6% Cat | **100%** |

Shredzepelin/Morogrim and nexess/Karathress are both ~99% cat, so form uptime
cannot separate them and salvation does — it is stripped from anyone who might
tank. Re-run with the one-liner in
[ticket 06](../.scratch/phase-2/issues/06-shredzepelin-gear-incorrect.md).

Shipped for this: `salvationUptimeOf`, `FightSummary.salvationUptime` carried
through `resolveFight`, and `fightProvenanceLines` — every run now names its
source fight, and a confident DPS parse with no salvation is flagged. The flag
**asks rather than asserts**, because `capture_fixture.py:56` scopes the buffs
table to one player, so "no paladin in the raid" cannot be ruled out. Closing
this box still needs a genuine cat capture for shredzepelin (or a domain pass
on the two clean characters) — the disclosure makes the problem visible, it
does not make his shortlist believable.

The defect behind the caveat is largely fixed. Worn items absent from their own
universe, all three characters, before and after:

```bash
# ticket 41 carries the full script and both counts
```

| character | before | after |
|---|---|---|
| slamaltman | 6 | **4** |
| shredzepelin | 12 | **8** |
| nexess | 6 | **2** |

The feral ranged slot went from 2 idols to 4, admitting Everbloom Idol and Idol
of the Raven Goddess — the two the SME review said were missing. Cause was not
"no db source records" (29 shipping ret rows have none either) but that
`wowsims_curated_item_ids()` was read only to *label* rows already admitted,
never to grant membership.

### What shipped alongside

- `data/wowhead-lists/feral/{p1-p2,p3}.json` — 166 hand-collected rows. The
  pre-merge domain axis validated every one against the pinned db: all ids
  exist, names byte-identical, slots match `ITEM_TYPE_SLOT[type]`.
- `data/universes/feral-p{2,3}.json` — feral's first candidate universes.
- A new `{kind:"unknown"}` `ItemSource` for items with no recorded origin. It
  carries no fields, so nothing is invented, and having no `zone` keeps it out
  of every raid and boss filter.

**Correction (2026-08-09, carry-forward 74).** This section previously claimed
`data/universes/ret-p*.json` "grew by additions only — p2 +5, p3/p4/p5 +3, zero
deletions, no existing row altered". Every part of that is false against the
real merge-base; it summarised a diff that is not the one it named. Retracted
and replaced by the measurement below.

```bash
BASE=$(git merge-base dev phase-2/trust)
git diff "$BASE"...phase-2/trust --stat -- data/universes/ret-p{2,3,4,5}.json
```

Line-level (6563 insertions, 2506 deletions) overstates the semantic change,
because these files are pretty-printed and a one-key edit rewrites a row. Keyed
by `itemId` against the same merge-base:

| file | entries base → tip | added | removed | rows altered |
|---|---|---|---|---|
| ret-p2 | 230 → 240 | 10 | 0 | 230 |
| ret-p3 | 356 → 394 | 38 | 0 | 356 |
| ret-p4 | 403 → 441 | 38 | 0 | 403 |
| ret-p5 | 484 → 534 | 50 | 0 | 484 |

So: **no row was deleted**, but **every surviving row was altered**, in three
ways, all intended.

1. `sources` — every row gained an `origin` field (`"db"`, `"atlasloot"`,
   `"wowhead"`, …). That is the provenance work this stage shipped; it accounts
   for all 1473 altered rows on its own.
2. `curatedSets` (23–26 rows/file) — added, naming which wowsims presets equip
   the item.
3. `bisTags`/`bisSets` (11–14 rows/file) — the flat `["BiS"]` label became a
   phase-scoped claim.

Of (3), 11 rows at p2 and 12 at p3/p4/p5 lost `["BiS"]` and gained no `bisSets`.
This is the **intended** fix for carry-forward 47 §1, not a regression: all of
them are `curatedSets` of `p1` / `preraid` only, i.e. items last curated for a
stage earlier than the one being ranked, so their BiS claim had expired. They
keep `curatedSets`, so the provenance survives — only the current-stage verdict
is withdrawn. The rule is `bis_set_labels_for_max_phase`
(`scripts/assemble_universe.py:360`); the affected rows are Justicar T4 pieces,
Black Felsteel Bracers, Vengeance Wrap, Ironstriders of Urgency, Mithril Chain
of Heroism, Ring of a Thousand Marks, Girdle of the Endless Pit, Grips of
Deftness, Mask of the Deceiver, and (p3+) Haramad's Bargain.

The 10–50 added rows per file are wowsims-curated ret items that were being
dropped in silence, plus the Band of Eternity / Shattered Sun families that
entered with the vendor slice.

The phase-2 spec's boundary (`.scratch/phase-2/spec.md:84`) says a byte-level
change to `ret-p*.json` "is a finding to report". It is reported here: the
change is real, large, and attributable to this stage's own provenance and
BiS-scoping work rather than to feral's slice.

### A silent wrong answer, caught by review and fixed

Worth logging because it is the failure mode PLAN.md names as this project's
worst case. Universes are cumulative, so a p3 build also reads the p1-p2
Wowhead list. Where two guides phrased the same item differently and only the
later phrasing parsed, the item shipped a real `raid` source at p3 and a
zoneless `{kind:"unknown"}` at p2 — and `matchesZone` requires a zone, so at p2
the item silently vanished from its own raid's view with no error.

30017 Telonicus's Pendant of Mayhem is a Kael'thas drop, written
`Quest: … (Tempest Keep: The Eye)` on the feral p1-p2 page. Fixed by teaching
the parser that shape plus the two vendor phrasings; pinned by four cross-tier
source-stability tests and one asserting a Wowhead-listed item never ships as
`unknown`, each verified to fail without the fix.

`pnpm verify` green on the merged tip: **357 tests, 32 files**.

### Where this leaves Stage 2

Seven of the eight §14 Stage 2 boxes are closed by their owning tickets. The
open one is **"≥3 real characters produce believable shortlists"**, above, and
it needs a human/SME reading of two shortlists rather than code.

**Reconciled into PLAN.md 2026-08-07.** §14's gate line had shown one ☑ against
seven written-up boxes, because the five from `caches` / `disclosure-and-caps` /
`apply-view` sat on `claude/verification-log-five-boxes-4c2a8c`, stranded off
`phase-2/trust` and merged into no branch until then. Ticking the line was the
whole reconciliation; no box's evidence changed.

**Run the two SME passes after this branch merges to `dev`, not before.** The
feral universe and the nexess shortlist exist only here — `data/universes/feral-*`
is absent from `dev` — so a pass run there could not read them. The carry-forward
work also fixed source data an SME reads first: before it, ret P5 showed
Crystalforge Breastplate sourced from Morogrim Tidewalker in Serpentshrine (a
Tempest Keep piece), token names in `boss` fields, and `Crafted · 2` for a
profession. Reviewing that would have spent a domain pass on known-fixed data.

## 2026-08-08 — Shredzepelin's cat set now reads from a DPS fight (ticket 06)

Ticket 06 shipped disclosure and an off-tank warning but left the scope-3 item
open: the warning told the reader to "pick another fight" and there was no other
fight to pick, because `feralOfflineRecordings` records exactly one fight per
fixture and shredzepelin's only cat capture was the Morogrim off-tank kill.

### The fight was chosen by measurement, not by preference

Probed all ten SSC/TK kills in report `YwahQLgv2jBrZGn6` for form uptime and
salvation. Three fights are unambiguous DPS — Leotheras (26), Void Reaver (63),
Solarian (73): high cat form *and* full salvation. Void Reaver was taken because
its 98.8% cat form is nearest to Morogrim's 99.1%, which holds form uptime fixed
and isolates the tank-vs-DPS variable.

Re-run (needs WCL credentials in `.env`; costs API points):

```bash
python scripts/capture_fixture.py --name shredzepelin --server-slug dreamscythe \
  --region US --report YwahQLgv2jBrZGn6 --fight 63 \
  --out test/fixtures/shredzepelin-cat.raw.json
```

### The gear confirms the diagnosis rather than assuming it

Nine of seventeen slots differ between the two fights. Both pieces the SME
handoff flagged — Icebound Cloak and Violet Signet, the zero-agility tank items
— are gone on Void Reaver, replaced by The Frost Lord's War Cloak and Ring of
Lethality. The original "the gear read is wrong" report was right about the
gear and wrong about the cause: the parser was faithful, the fight was not.

### A live detector bug the new fixture exposed

`SALVATION_AURAS` listed only the two Blessings. This raid used **Hand of
Salvation** — a distinct spell, not a rank — so the Void Reaver fight scored
salvation 0 and drew the exact false off-tank warning ticket 06 exists to
prevent. Both real captures matter here: nexess carries `Greater Blessing of
Salvation`, shredzepelin's cat fight carries `Hand of Salvation`. Fixed by
adding the third name; pinned by three direct `salvationUptimeOf` unit tests
(including a partial-uptime case, since Hand of Salvation is also a short
emergency cast and presence must not be read as a fight-long buff).

### Result

`pnpm rank --spec feral --offline --max-phase 2`, shredzepelin:

- Provenance reads `Void Reaver … spec confidence 100%`, and the salvation
  warning correctly stays silent.
- Baseline **2067.99** vs the off-tank fight's **1917.50** — the old baseline
  was measured in tank gear, so every prior delta was inflated against it.
- The shortlist shape the SME called out is gone: 13 of the top 15 rows were
  backs and fingers, now the top rows are belts, legs and neck, with two cloaks
  and one ring.

`pnpm verify` green: 459 tests + 2 todo, 32 files.

The Morogrim fixture is **kept, not dropped** — `shredzepelin.raw.json` is now
the regression fixture for the off-tank warning itself, and the feral form tests
bind it as `offtank` rather than `cat` so the name stops asserting the wrong
thing. This closes the last open Stage 2 §14 gate box's shredzepelin half; the
SME re-read of the corrected shortlist is still a human step.

---

## 2026-08-21 — Stage 2's last gate box: worked, and it stays open

PLAN.md §14 Stage 2, `☐ ≥3 real characters produce believable shortlists`.
**Outcome: the box stays ☐**, with the blocking finding named and ticketed.

Everything below was produced at `feat/stage-2-close-shortlist-box`, base
`1ecd2e5`, on the pinned v0.0.119 engine. The binary is gitignored, so no claim
here asserts it is present: its path, byte size, sha256 and the commands to
regenerate and verify it are in
[`.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md`](../.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md),
and every number in this entry was measured against that digest.

### What was run

`--offline` gates only the *gear* source. The CLI always constructs
`CliSimRunner` (`cli.ts:52,408`) and live-sims the pool, so these shortlists are
a full re-sim against the pinned binary, not a fixture replay.

```
pnpm rank --region US --realm dreamscythe --character slamaltman   --offline --spec ret   --max-phase 3 --report .scratch/rank-reports/stage2-close-slamaltman.html
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-shredzepelin.html
pnpm rank --region US --realm dreamscythe --character nexess       --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-nexess.html
```

| character | spec | pool | wall | above cutoff | baseline DPS | gear read from |
| --- | --- | --- | --- | --- | --- | --- |
| slamaltman | ret p3 | 391 | 200 s | 44 | 2003.0 | Hydross the Unstable (fight 8) |
| shredzepelin | feral p2 | 228 | 144 s | 14 | 2266.9 | **Void Reaver** (fight 63) |
| nexess | feral p2 | 228 | 144 s | 12 | 2302.5 | Fathom-Lord Karathress (fight 32) |

Each `.stdout.txt` transcript carries its invocation, its resolved fixture path,
the binary digest and the CLI's own `gear read from …` line. shredzepelin reads
Void Reaver rather than the Morogrim kill, which is the ticket-06 routing at
`cli.ts:372` doing its job.

### The verdicts

Two `gate-sme` seats ran on different questions over different inputs. Seat 1
read the three shortlists cold; its input note carried no framing from ticket 250
and no healer or mana wording (verify: `grep -oiE
'250|rotation|regression|227|healer|mana|intellect|spirit|mp5'` over
`.scratch/stage-gate/stage-2-close-shortlist-box/sme-input-shortlists.md`
prints nothing).

Handoff: [`.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md`](../.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md)

| character | verdict |
| --- | --- |
| slamaltman | `trust-with-caveats` |
| shredzepelin | **`do-not-trust`** |
| nexess | `trust-with-caveats` |

**Why the box stays open.** The `do-not-trust` is not sim noise and not a
disclosure gap. When a character's worn item is absent from the candidate pool
for its slot, the slot is scored against an *empty slot*, inflating every
candidate in it. shredzepelin has three such slots — neck, back, waist — so only
**4 of his 14** above-cutoff rows are measured against real gear. nexess, on
identical code, pool and spec, has one and is usable. The report does disclose
each case in `ranking.plausibilityWarnings`; the rows still appear with inflated
deltas. Re-observe with:

```
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];[print(w['slot'],w['cause'],w.get('wornItemName')) for w in r['plausibilityWarnings']]"
```

Tracked as **ticket 253**. Closing this box needs that fixed and shredzepelin
re-read. Two non-blocking findings went to **254** (the cutoff is an OR of
`absDps` and `pct`, so boundary rows can sit above it with a sub-threshold
`deltaDps` — real, but the seat's "internal inconsistency" reading is too strong)
and **255** (a comment that misled two readers running).

### Ticket 250, re-measured and closed

Seat 2 judged the ticket-250 question on different inputs, with an explicit
instruction not to re-issue shortlist verdicts. Verdict `trust-with-caveats` on
the re-measurement; handoff at
[`.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`](../.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md),
method and literal invocations at
[`q2-remeasure/commands.md`](../.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/commands.md).

Three arms at 20000 iterations, seed 42: tip 782.14, whole old package 740.67,
old-rotation-on-tip-consumables 739.23. **The rotation main effect is −42.91 DPS
against a pre-registered 2×combined-SEM bound of 1.38** — the new
rotation is *better*, contradicting the ticket's premise in sign. Consumables
move −1.44 DPS with the rotation held constant, inside the bound. Arm 2
reproduces the ticket's 740.67 to the cent, so the stale half of its pair is the
722.55. Ticket 250 is **closed**, its pair superseded rather than kept.

**Measured on the unequipped skeleton.** All three arms carry 17 equipment slots
with no item id — verified: `python -c "import json;eq=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/arm1-tip.request.json'))['raid']['parties'][0]['players'][0]['equipment']['items'];print(len([i for i in eq if i.get('id')]),'of',len(eq))"` → `0 of 17`.
That is why the arms read 740–782 DPS while the characters' own baselines are
2266.9 and 2302.5. **The sign is safe and the comparison is valid** — all arms
are equally unequipped, so the rotation contrast holds — but the *magnitude* is
not transferable to a geared character. TBC powershift value scales with attack
power and with the Wolfshead Helm interaction the new APL names in its
variables, and shredzepelin wears Wolfshead. Do not cite −42.91 as the gain a
geared feral would see. Raised by the pre-merge domain axis, 2026-08-21.

### Corrections to the 2026-08-08 entry

That entry is left as written; these are the corrections, not edits to it.

1. "Only shredzepelin was ever put through `sme-rank-review`" — false. Twelve
   handoffs exist as of base `9a4b932` (`git ls-tree 9a4b932 -- .scratch/handoffs/ | grep -c sme-rank-judgment` → 12; the same `ls` at tip returns 16, because this branch added four),
   covering all three characters. All twelve predate the 2026-08-21 pin, rotation
   and skeleton commits, which is why a fresh pass was needed — the conclusion
   was right for a reason other than the one given.
2. "The count of usable characters is 2, not 3 … needs a genuine cat capture for
   shredzepelin" — resolved by `78ca9af`, which added
   `test/fixtures/shredzepelin-cat.raw.json`; phase-2 ticket 06 is closed.
3. PLAN.md's own gate paragraph carried the same two stale clauses; corrected in
   place at PLAN.md §14 rather than here.

### What this entry does not claim

- **Fixture scope.** Only `packages/core/test/fixtures/synthetic-roster-recordings.json`
  is uniformly `simVersion: v0.0.119`. The per-character
  `test/fixtures/{slamaltman,shredzepelin-cat}.raid-sim-result.json` files are
  still `v0.0.101`; they are read by no TS code. Nothing here claims all fixtures
  were re-recorded.
- **Ticket 236** (replicate seeds overlap RNG streams) is open and bounds the
  cutoff-adjacent rows: only 8 rows per run carry `paired-replicate`, the rest
  `independent` with se ~1.35–2.18 against cutoffs of 3.4–3.6. Seat 1's
  boundary-row findings are stated against that spread.
- **Ticket 240** (vendor-gated tests can silently skip) — checked rather than
  assumed. The baseline `pnpm verify` skipped exactly one test,
  `wowsims-fork-parity`, gated on generated protos under `vendor/tbc-new-fork`.
  It does not gate the ranking path. Counts in `binary-provenance.md`.
- **C11 superseded.** An earlier claim of 20 feral rows at p2 / 43 at p3 with
  baseline 2145.6, sourced from the synthetic roster recordings, does not match
  live output at this tip: 14 and 12 rows against baselines 2266.9 and 2302.5.
  The counts in this entry are the observed ones.

## 2026-08-22 — Stage 3 web shell (offline-first)

Closes five of §14 Stage 3's six gate boxes. The first stays ☐ on purpose: the
shell resolves three recorded characters and 404s everything else, so nobody
can type their own name yet. Ticket 267 owns that.

Run from `phase-3/web-shell`. Bootstrap first — `vendor/` is gitignored, and a
fresh worktree has neither the binary nor the pinned wowsims inputs:

```bash
pnpm install --frozen-lockfile
pnpm fetch:wowsimcli        # vendor/wowsimcli-v0.0.119-win32-x64/
pnpm sync:wowsims:restore   # vendor/wowsims/, 15 files
pnpm verify                 # exit 0
```

Without `sync:wowsims:restore` five `synthetic-fixtures` tests fail ENOENT on
`vendor/wowsims/ret_preraid.gear.json`. That is worktree bootstrap, not a
regression, and the plan did not budget for it.

### ☐ 1 — type a character, wait, trust the top recommendation

Open, and recorded here rather than quietly skipped. `/c/$region/$realm/$name`
resolves slamaltman, shredzepelin and nexess from committed fixtures and
answers `404 not a recorded character (offline build)` for anyone else.

The plan chose offline-first on size, not on a missing credential:
`WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` **do** exist in the main checkout's
`.env` (names read with `grep -o '^[A-Z_]*='`; values never read; the file is
gitignored at `.gitignore:2`, which is why a worktree does not see it). The
live adapter sized at ~12 steps and ~8 files against an API that fixtures
cannot verify, versus 17 steps for the rest of the shell, and PLAN.md L898
scopes it out. Ticket 267 carries the sizing and the credential note.

### ☑ 2 — feels calm during multi-minute work

Measured on the built server (`pnpm web:build`, then Node 22 on
`apps/web/dist-server/main.js`), driving a real ret-p2 slamaltman run through
the browser. The run is the real thing: 277 sims against wowsimcli v0.0.119.

Mid-run the API reported, and the page rendered from:

```
stage: simming  done: 132 / 277  candidates: 240  rows: 131  simVersion: v0.0.119
```

`progressLabel` turns that into `simming 132/277`, and rows appear as each
candidate lands rather than all at the end. Final state: 240 rows from 277
sims — the two numbers differ because `total` counts sims (baseline +
candidates + paired replicas) while `candidates` counts rows, which is why
step 2c added the second field.

### ☑ 3 — zero layout shift during a run

A `PerformanceObserver` on `layout-shift` was installed before the run started
and sampled every 400 ms through it. **CLS 0.00000, zero shift entries**, and
the list container measured a constant **360 px** at every sample from page
load onward — the fixed-height container holding its size before any row
exists.

Honest limit on this one: the sampling window covers page load through
`building pool`, and the completed view. The headless tab reports
`document.visibilityState === 'hidden'` permanently, and React Query pauses
interval refetching while hidden, so the page stopped polling partway and the
finished run was reloaded rather than watched filling live. **The
skeleton-fill-to-completion transition was therefore not observed in the
browser** — it is covered by `run-state.test.ts` and by the mid-run API
snapshot above, not by a CLS measurement across that exact frame.

### ☑ 4 — filters and pins re-render without a network round trip

The box this plan was riskiest for, and the one now most directly measured.

`applyView` had to reach the browser without the 6.8 MB item index. `view.ts`
imported `setPotentialIsConfounded` from `rank-report-rules.ts`, which imports
`getItem` from `items.ts`, which imports `data/items/index.json` (6,825,902
bytes). The predicate reads one optional field and touches no item data, so it
moved to `set-potential.ts`. The transitive runtime closure of `dist/view.js`
is now five modules — `view`, `cutoff`, `pool`, `set-potential`,
`item-source-kinds.generated` — and none mentions `index.json`.

```bash
grep -l "index.json" packages/core/dist/{view,pool,cutoff,set-potential}.js  # no output
grep -c "index.json" apps/web/dist/assets/*.js                               # 0
```

Bundle cost of importing `applyView`: **190.40 kB → 192.61 kB**, +2.2 kB.
Built with the full UI: **245.09 kB** (gzip 76.09 kB), against a 400 kB budget.

On the completed run, with `fetch` and `XMLHttpRequest.open` both counted,
every view control was toggled — Already have it, Pin BiS, Raid, Boss, Group
by — giving **0 fetches, 0 XHR, CLS 0**. The filter did real work while making
no request: Raid `Gruul's Lair` + boss `Gruul the Dragonkiller` → **0 rows**,
back to All raids → **27 rows**.

### ☑ 5 — the pin control is hidden, not inert, where no curated set exists

**No committed universe produces `pinBisAvailable === false`** — feral-p2 and
feral-p3 carry 17 BiS tags each, ret-p2/p3/p4/p5 sixteen each — so no
`maxPhase` reaches the state. The reproducible input is a pool injected
through `Deps.pool`: `apps/web/test/fixtures/pool-no-bis.json`, a ret-p2 slice
with every `bisTags` emptied, ranked through the same server path as any run.
`jobs.test.ts` asserts both polarities: ret-p2 → `true`, the fixture →
`false`. `showPinControl` returns the flag and the component omits the control
rather than disabling it.

The browser demonstration above used ret-p2, where the control is correctly
**present and enabled**. The absent case is closed on the test, on test data —
stated plainly here so the reader is not left thinking a browser showed it.

### ☑ 6 — every Stage 1 CLI check still passes unchanged

```bash
git diff --stat $(git merge-base HEAD dev) -- packages/core/test
#  packages/core/test/individual-settings.test.ts | 77 ++++++
#  packages/core/test/share-link.test.ts          | 69 ++++++
```

Two files added, none modified. The CLI's offline wiring moved into
`packages/core/src/cli-wiring.ts`, and `pnpm rank --offline` for slamaltman is
byte-identical before and after — twice, once after the extraction and again
after `defaultMaxPhase` moved — modulo the pid in Node's SQLite warning.

### Exports, against the real binary

`toIndividualSimSettings` sets `apiVersion` from the `current_version_number`
option on `proto.ProtoVersion`, read at runtime (13, matching the committed
preset). wowsims runs an import through its migration chain when the field is
lower, and the proto default of 0 would take every export down that path.

From the running server:

```
GET /api/jobs/job_1/export.json
  200, content-disposition: attachment, apiVersion 13, 17 equipment items
GET /api/jobs/job_1/share             -> 1,525-char link
GET /api/jobs/job_1/share?item=30106  -> 1,517-char link
wowsimcli-windows.exe decodelink <link>   # exit 0 both times
  apiVersion 13; 17 items; the chosen candidate (30106, the top-ranked belt)
  present in the decoded equipment
```

### Deviations

1. **Submit dedupe keys on the request, not `contentHash`.** `contentHash` is
   computed inside `rankUpgrades` after gear is read, so it does not exist at
   submit time. In-flight dedupe uses the canonical JSON of the `RankInput`;
   cross-run dedupe stays `rankUpgrades`' own ranking cache. The server slice
   then found in-flight-only dedupe too narrow — a run finishes in ~500 ms and
   a resubmit started a second job — so the key outlives the run, and only a
   failed run drops it.
2. **`/c/...` is offline**: three recorded characters, 404 otherwise.
3. **TMB's control labels are unconfirmed.** `thatsmybis.com` and
   `thatsmybis.com/help` return marketing and FAQ copy; a live guild view needs
   a login. The UI ships §12's wording (Raid, Boss, Group by, Already have it,
   Pin BiS). Renaming later is a string change.
4. **Skeletons appear when the candidate count is known**, not at submit.
   `rank.ts` emits `simming` from three sites and only one carries
   `candidates`, so the trigger is that field being defined, not the stage
   being reached.
5. **"Already have it" greys, and does not use core's `hideOwned`.** That
   option *removes* owned rows, while §12 and §8.3.3 require them greyed and
   kept. The UI carries its own `greyOwned` flag. Core's option name and the
   plan's requirement genuinely disagree; nothing here changes core.

### What the harness could not show

- **No screenshot.** The browser pane does not composite in this environment,
  so every visual claim above is a DOM or `PerformanceObserver` measurement,
  not something seen.
- **Node 20 in the preview harness.** `seams/store.ts` imports `node:sqlite` at
  module scope, which does not exist before Node 22, so the server will not
  boot under it even when `MemoryStore` is all that is wanted. The shell and CI
  both run Node 22. No `engines` field declares that floor — a follow-up, not
  fixed here.

---

## 2026-08-22 — Stage 2's last gate box closes, and its blocker was never real

**☑ ≥3 real characters produce believable shortlists.** All eight §14 Stage 2
boxes are now closed. Stage 3 may start once this log is on `dev`.

### The blocker was a lying warning, not a bad ranking

The 2026-08-21 pass returned `do-not-trust` on shredzepelin, and that verdict
held the box open. It was a correct response to what the report said, and what
the report said was false.

For a slot whose worn item is absent from the candidate pool, the
`worn-unrankable` warning read:

> "every row shown for neck was scored against an empty slot, not against Amulet
> of Bitter Hatred. Do not read any of them as an upgrade or a loss"

The report also applied its `unmeasured` styling to those rows, desaturating the
deltas. Neither was true. `rankUpgrades` composes the baseline from the
character's full logged equipment — `equipmentFromLoggedGear` in
`packages/core/src/rank.ts`, with no pool filtering — so every one of those rows
was measured against the worn item exactly like a healthy slot's. The numbers
confirm it:

```
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];items=r['items'];[print(s,[(i['name'],round(i['deltaDps'],1)) for i in sorted([x for x in items if x['slot']==s],key=lambda x:-x['deltaDps'])[:3]]) for s in ('neck','back','waist')]"
```

Neck tops out at **+12.9**, back at **+7.8**. An empty neck would price a phase-2
epic at roughly +80-150. **That band is a hypothesis, untested** - a judgement about stat budgets, not a measurement; no arm was run with the slot emptied, and it is not what carries the conclusion. What carries it is the code path above plus the 44-of-44 worn rows at exactly `0.00` below, both directly checkable. Note also that waist, the third such slot, tops at **+48.0** - printed by the quoted command but omitted from earlier revisions of this prose, which cited the two most favourable slots.
pool scores exactly `0.00` — thirteen of them on shredzepelin — which is the
signature of a baseline built from worn gear.

Fixed in `486f977`: the message now states only that the worn item has no row of
its own, and `isUnmeasuredSlot` limits the desaturation to causes where no worn
item is comparable (`unique-effect`, `set-break-toll`, `thin-pool`). Four files,
**no scoring logic, no `contentHash` change, no number changed.** Recorded on
ticket 253, which also records why the planned force-include fix was dropped: the
anchor row it would add is `deltaDps ≈ 0`, fails `meetsCutoff`, and is filtered
out of the shortlist — measured at **0 of 44 owned rows above cutoff** across the
three reports.

### The verdicts

Re-judged on reports regenerated at this tip by live re-sim on the pinned
v0.0.119 binary (sha256
`4b60235dcbb0088c9644ba464223fc9f65fcb3fccb2710cfc37fa3c752db97b1`; `vendor/` is
gitignored — regenerate with `pnpm fetch:wowsimcli && pnpm sync:wowsims` and
verify the digest before trusting a re-run):

| character | spec / tier | verdict |
| --- | --- | --- |
| slamaltman | ret, maxPhase 3 | `trust-with-caveats` |
| shredzepelin | feral cat, maxPhase 2 | `trust-with-caveats` |
| nexess | feral cat, maxPhase 2 | `trust-with-caveats` |

Handoffs: [`sme-rank-judgment-stage2-recheck.md`](../.scratch/handoffs/sme-rank-judgment-stage2-recheck.md)
(slamaltman) and [`sme-rank-judgment-stage2-recheck-feral.md`](../.scratch/handoffs/sme-rank-judgment-stage2-recheck-feral.md)
(both feral). The feral seat **explicitly declined to confirm** the earlier
`do-not-trust`.

Regeneration commands:

```
pnpm rank --region US --realm dreamscythe --character slamaltman   --offline --spec ret   --max-phase 3 --report .scratch/rank-reports/stage2-close-slamaltman.html
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-shredzepelin.html
pnpm rank --region US --realm dreamscythe --character nexess       --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-nexess.html
```

Note `--offline` gates the **gear source only** — the CLI always spawns the
pinned binary, so these are live sims, not fixture replays.

### What made the verdicts credible

The corroboration is upstream's, not ours. The pinned wowsims P2 feral sets
(`vendor/wowsims/feral_p2_6p.gear.json`, `feral_p2_9p.gear.json`) line up with
both feral shortlists nearly item for item — for shredzepelin, 9 of 18 upstream
BiS items are already worn and score `0.00`, 6 unworn all land in the top 10. For
slamaltman, **7** of 16 ret BiS-tagged rows are worn at `0.00` and the unworn ones
land in the top 22. An earlier revision said 8 of 16; the pre-merge adversarial
axis measured 7. No worn item appears as a nonzero upgrade on any character.

Two figures that read as bugs and are not, recorded so the next reader does not
stop on them:

- **A tier-5 head at −208 DPS.** Nordrassil Headdress losing ~9% of total DPS to
  a crafted helm is correct: the pinned sim branches the cat rotation on whether
  Wolfshead Helm is equipped (`vendor/tbc-new-fork/sim/druid/feralcat/rotation.go:52,174,260`).
  Losing the helm costs the powershift rotation, not the helm's stats.
- **Shard-bound Bracers at +10.3** over a higher-ilvl worn bracer — a socket plus
  a +4 AP socket bonus the worn item lacks. **This is nexess's row** (rank 9);
  on shredzepelin the same item is -7.34 and unranked. An earlier revision
  placed it in shredzepelin-framed prose.

### What this box does not claim

**Three `medium` caveats survive, not two** — the original wording here said two
and was corrected by the pre-merge spec axis before merge.

Two of them are one defect seen twice: the feral **ranged slot offers a single
candidate**, the idol already worn. Filed as **carry-forward 259**
(`Blocks: phase-2`). It is the third confirmed instance of one mechanism — an
item with no AtlasLoot source row silently never becomes a candidate.

**Settled by measurement, 2026-08-22, after two seats reasoned to opposite wrong
answers.** A third SME ran the sim rather than reading the code: same gear, same
seed, 20,000 iterations, only the ranged slot varied.

| ranged slot | DPS | vs worn Everbloom |
| --- | --- | --- |
| Everbloom Idol (worn) | 2153.6 | — |
| Idol of Feral Shadows | 2116.5 | −37.1 |
| Idol of the Raven Goddess | 2113.3 | −40.3 |
| nothing equipped | 2098.9 | −54.6 |

**The feral idol slot is not a live P2 decision.** Everbloom wins by 37 DPS and
neither alternative is close — so no idol is a missing upgrade, and the caveat's
practical weight is smaller than either SME seat believed. The pool-coverage
mechanism behind it is still real and still worth fixing, which is what ticket 259
now asks for.

Two claims recorded earlier in this entry are **withdrawn**. That 32387 scores
"roughly zero" because Improved Leader of the Pack buffs party members rather than
the wearer: false — the druid is in its own party and the sim grants the aura to
every member, so it is worth **+14.3 DPS** over an empty slot. And that 28372 Idol
of Feral Shadows is the item to chase: it is heroic-sourced
(`[{"dungeon": "The Arcatraz", "kind": "heroic"}]`), the category
`assemble_universe.py:68-76` excludes deliberately, so pooling it would reopen
ticket 17's scope question.

**The methodological lesson outlasts the item.** Two independent seats traced the
vendored Go source to a DPS conclusion and both got it wrong, in opposite
directions. One 20k-iteration run settled it. `bisTags` corroboration is still the
technique that made these verdicts credible, and it still fails quietly for
party-buff items — but when the question is what an item is *worth*, the answer is
a measurement, not a reading.

The third `medium` is **benign and dismissed here rather than ticketed**: the
slamaltman seat flagged `ranking.plausibilityWarnings` as absent from that
character's JSON while the SME input note said it is always present. The note was
wrong, not the emitter — the key is optional and omitted when empty
(`rank-report.ts` reads it as `?? []`) and slamaltman has no dead slots. The note
is corrected. Recorded because the gate rule is "every caveat fixed or
SME-agreed-ticketed", and silently dropping one is worse than saying why it does
not count.

The remaining caveats are `low`. Three are disclosed in the product output — the
assumed race and hit cap (`ranking.caps.hit`, `ranking.assumptions.standing`),
the empty meta sockets on candidates (`ranking.substitutions[0]`; ticket 257
measured this as *not* a scoring asymmetry, since the worn baseline has no meta
either), and the three slots whose worn item has no row of its own
(`plausibilityWarnings`). **Two are not disclosed anywhere**, and this entry
should not have implied otherwise: caster cloth padding the feral pool appears in
no warning or transcript (`grep -ci cloth` on the shredzepelin JSON and stdout
both return 0), and per-row gem and enchant detail is absent from the report —
that caveat *is* the absence of disclosure. Neither changes a number; both are
presentation gaps a reader should know about.

So the box asserts that a ret and a feral player would act on these lists. It
does **not** assert the candidate pool is complete, and 259 is the standing
evidence that it is not.

### Scope limits worth carrying

- **Replicate noise is ruled out for the feral pair, not assumed away.** Both
  shortlists are short (14 and 12 ranked rows) and every row clears twice its own
  standard error, so ticket 236 cannot explain a finding there.
- **Ticket 240 still applies:** `pnpm verify`'s one skipped suite is
  `wowsims-fork-parity`, gated on ungenerated protos, and it does not cover the
  ranking path.

## 2026-08-23 — finish-the-tab, tranche 1: the Upgrades tab ranks in the browser

Stage-gate run `finish-the-tab`. Every figure below is from a real Brave window,
fronted, driven through Claude in Chrome. Nothing was timed from the Claude Code
Browser pane, which never composites. Working notes and raw readings:
`.scratch/stage-gate/finish-the-tab/measurements.md`.

**Surface and machine, identical for all four timed runs.** Brave, window
fronted; an in-page `visibilitychange` sampler recorded **0 hidden milliseconds
on every run**, so none is throttle-contaminated. `hardwareConcurrency: 20`,
worker picker 4 (`__tbc_new_wasmconcurrency`). Production bundle served with
`npx http-server <archive> -p 8123 -c-1`. Iterations 3,000, Candidates empty
(uncapped), maxPhase 2. Fork tip `8bb02b028`.

**Gear, per cell.** Loaded through the page's own share-link hash, encoded from
committed data by this repo's `encodeShareLink`. Ret:
`test/fixtures/slamaltman.raid-sim-request.json` via `toIndividualSimSettings`,
17 equipment slots of which 16 carry an item id, baseline **1775.0 DPS**.
Feral: `data/presets/feral/owner-p2.settings-export.json`, likewise 16 ids
persisted, baseline **842.3 DPS**. Not wowsims gear presets: the preset picker
was unusable at the time the gear was loaded (see the wasm finding below).

**The ret baseline is unreconciled.** This repo recorded **2042.85 DPS** for the
same `slamaltman` fixture at the same 3,000 iterations (`docs/stage0-findings.md`
§11, and the table earlier in this log). 1775.0 is **13 % below** that, and this
run did not establish why. Two candidates, neither tested: the settings the page
received came through `toIndividualSimSettings`, which may carry a different
encounter or buff set than the raid-sim request the 2042.85 figure was produced
from; and the share link persisted 16 item ids where an earlier draft of this
entry claimed 17, so a slot may be arriving empty. **Every ret figure below is a
self-consistent comparison between cells on one baseline, not a number to
compare against the fixture's own recorded DPS.** Ticket 274 tracks it.

**The feral cell ran the fork's default APL, not the owner's.** The committed
export carries a rotation using `timeToNextEnergyTick`, a field newer than this
repo's pinned proto, so protojson refused the whole message; `player.rotation`
was stripped before decoding and the page supplied its own default rotation.
**Every feral figure in this entry inherits that** — the 61 s and 395 s
elapsed, and the finding that no feral row carried rankable set potential. A
run with the owner's rotation could differ on all three.

### Goal line: a ranked shopping list from an in-browser run

Met. Both specs produced a ranked list with per-slot sub-tabs, stage labels, rows
landing as they finished, and the elapsed wall-clock on completion.

### Time budget — proposed 600 s, not D7

`PLAN.md`'s D7 sets an iteration default and carries no time number. The 600 s
figure is this plan's own proposal, read from `candidate-pool.md:11`'s
"single-digit minutes". **Owner ruling, 2026-08-23: there is no time target**;
the column below is the yardstick the cells were judged against when they ran,
and the elapsed figures stand as measurements, not pass/fail.

| Cell | Spec | Pre-sim prune | Elapsed | Simming n/N | vs 600 s |
| --- | --- | --- | --- | --- | --- |
| 1 | ret | on | **307 s** | 53 | met |
| 1 | feral | on | **61 s** | — | met |
| 2 | ret | off | **1017 s** | 277 | missed by 417 s |
| 2 | feral | off | **395 s** | — | met |

Elapsed is the page's own `Took N s.` status. **The goal line is judged with the
prune on and is met on both specs.** Prune-off figures are recorded as
measurements: ret needs the prune to fit the budget, feral does not.

Two honest caveats. The ret prune-off cell was run twice under identical
conditions and gave 866 s and 1017 s — a **17 % spread**, against the 3.6 % and
1.3 % ticket 156 saw; a single run here is not a precise number. And a sampled
interval gave **7.8 s per sim** against ticket 156's 3.8 s, roughly 2x slower on
the same machine, unexplained.

### The racing comparison was not measured

Cell 3 (candidate (a), M2 racing) was never run: that archive persists
share-link settings but never applies them to the character, and no run was
started rather than time a 0-stat character. Q1 was decided by the plan's
pre-stated rule — an unmeasured candidate cannot satisfy a win condition, so
candidate (c), the full sweep, wins. That is where ADR-0026's core-side
measurements already had it, so nothing was reverted. Ticket 273 records the gap.

### C22 is refuted, and the build recipe with it

Plan claim C22 held that the wasm could be reused because the fork branch
changes no Go file. The premise is true — `git diff --name-only f359239..HEAD`
matches 0 `.go` or `.proto` files — but the conclusion does not follow.

The served `dist/tbc/lib.wasm` was the 2026-08-14 binary (md5
`4811d1a5e93a422f732e81da3a214ff0`) while `sim_worker.js` had been rebuilt with
Go 1.25.4's `wasm_exec.js`. The wasm never instantiated, **silently**:
`instantiateStreaming(...)` at `sim_worker.js:3444` has no `.catch`, so the
workers never posted `ready`, `waitForInit()` never resolved, and the whole
settings/gear/preset callback at `individual_sim_ui.tsx:333-359` never ran. The
page rendered with no gear, no presets and an empty Settings pane — three
symptoms of one cause, which this run first misdiagnosed as a fork page defect.
Rebuilding the wasm (md5 `393bee733c304016472af3589a57225f`) fixed all three.

**Reusing a wasm is only safe when its toolchain matches the glue's.** The
corrected recipe, superseding C21 (which omitted both the wasm step and the
working directory):

```
eval "$(fnm env --shell bash)"; fnm use 22.17.1
export PATH="<fork>/node_modules/.bin:/c/Program Files/Go/bin:/c/Users/dgree/go/bin:$PATH"
cd <fork>                       # vite.config.mts:128 resolves i18nextLoader
                                # paths against the process cwd
protoc -I=./proto --ts_opt generate_dependencies --ts_out ui/core/proto proto/api.proto
protoc -I=./proto --ts_out ui/core/proto proto/test.proto
protoc -I=./proto --ts_out ui/core/proto proto/ui.proto
protoc -I=./proto --go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb \
       --go_out=./sim/core ./proto/*.proto
GOOS=js GOARCH=wasm go build -o ./dist/tbc/lib.wasm ./sim/wasm/    # NOT optional
npx tsx vite.build-workers.mts
npx vite build
```

`make dist/tbc/.dirstamp` does all of it in order where `make` exists (it is not
installed on this machine). Verify a build with a gear-set **item id**, never a
source identifier — oxc minification renames identifiers, and grepping for
`makePresetGear` produced a false "presets are missing from the bundle" reading
this run. Verify the engine with `Worker[0] Ready, isWasm: true` in the console.

### Control 1 — pre-sim BIS prune ("Sim only items on a BIS list")

The Candidates placeholder tracks the control exactly: **240 eligible** off,
**16** on for ret and **17** on for feral. Those match the tagged counts measured
independently from the universe files (ret-p2 16, feral-p2 17). With the prune on
every result row carried the BiS badge on both specs. The control was visible for
both specs, so the hidden polarity is unreachable with shipped data, as predicted.

`Simming n/N` is **53** for ret prune-on, not 16. The prune bounds the *tagged
candidates* it sims; the engine still sims owned rows and retries paired slots,
the same composition ticket 156 recorded when its `Candidates=20` run landed 34
rows. The assumptions drawer names which pool a result came from.

### Control 2 — post-sim BIS filter ("Only items on a BIS list")

On the completed 480-row ret ranking, clicking the checkbox:

```
off -> on :  480 rows -> 32, every one tagged;  slot tabs 17 -> 17;  status unchanged
on  -> off:  32 rows -> 480 (exactly restored); slot tabs 17 -> 17;  status unchanged
```

Fully reversible, no sim dispatched — the status line still read `Took 1017 s.`
throughout. The 32 survivors equal the tagged count in the unfiltered ranking.

This control shipped broken and was fixed during the run. Toggling it destroyed
the ranking: the teardown loop called `parentElement.remove()` on each slot pane,
and slot panes are children of the same container as the shopping-list pane, so
it deleted the whole tab body. Fixed in fork commit `8bb02b028` by removing the
pane itself under an identity check. An earlier commit, `118f708d8`, fixed a
second real fault in the same area (the slot strip was built from the filtered
view, and the shopping list computed its own view separately) but was not the
cause of the teardown.

### Control 3 — set-bonus toggle ("Include set-bonus potential")

Visible on the ret prune-off ranking; correctly **hidden** on both prune-on runs
and on feral prune-off, where no row carried rankable set potential. Both
polarities of PLAN.md §4's hide-when-absent rule were observed.

Toggling it on a completed ranking re-ranks with **zero sim calls**: row count
unchanged at 480, **12 positions reordered** (first at index 50), status text and
slot tabs unchanged. The clearest case, at positions 50/51 — `Crystalforge
Shoulderbraces`, a tier piece carrying prospective set-bonus DPS, rises above
`Leggings of Murderous Intent`:

```
off:  50 Leggings of Murderous Intent   51 Crystalforge Shoulderbraces
on:   50 Crystalforge Shoulderbraces    51 Leggings of Murderous Intent
```

### Honest progress

Observed on every run: stage labels in sequence (resolving, reading gear,
composing, building the candidate pool, `Simming n/N`, ranking results), the
row-landed counter climbing as rows arrived, and the elapsed figure on
completion. The elapsed status is new this run and is what every number above is
read from.

### Required tickets

156 closed with the numbers above and "D7 stays 3,000"; 199 closed on its three
done-when items; 205 and 206 closed as moot (racing deleted in fork commit
`f70378155`, porting ADR-0026); 201 annotated as not blocking. Filed and open:
272 (the fork's lockfile carries no Windows native binaries), 273 (the
unmeasured racing cell), 274 (this entry's unreconciled ret baseline) and 275
(the tab's three repeated toggle controls).

## 2026-08-23 — phase-item-pool: the pool is explainable, and the tab names its phase

Stage-gate run `phase-item-pool`. One line per brief goal with the command or
measurement that establishes it. Working notes and raw browser readings:
`.scratch/stage-gate/phase-item-pool/measurements.md`.

### Goal 1 — a committed listing says why each item is in or out of the pool

`data/pool-listings/ret-p3.md` and `feral-p3.md` put the local universe beside a
membership derived from the pinned wowsims DB and classify every difference by a
rule they can cite. `scripts/list_phase_pool.py` regenerates them;
`pnpm pool-listings:check` regenerates and byte-compares, inside `pnpm verify`.

```bash
pnpm pool-listings:check
# pool listings check ok: both listings match a fresh regeneration
grep -h 'phase-disagreements:' data/pool-listings/*.md
grep -h 'raid drops lacking a reason:' data/pool-listings/*.md
```

Both properties hold as measured results rather than by construction: **zero**
phase disagreements and **zero** phase-3 raid drops lacking a reason, in both
listings. Every wowsims-only raid drop (8 ret, 7 feral) is a stub-only sim
effect, which is a citable rule.

Two shape facts recorded because each was a way to get this wrong. Categories a,
b and d from the plan **cannot fire**: the audited membership is *defined* by
`eligible_d7` passing, so no member of it can fail that rule. They stay in the
table at a structural zero with the reason stated, rather than reading as three
checks that passed. Separately, an early draft made the last category
unconditional, which would have made the zero-unexplained claim pass vacuously;
the shipped categories are each a test that can fail, so "unexplained" stays
reachable.

The precedence rule and its grounds are in
`docs/adr/0028-pool-membership-precedence-local-universe-primary-wowsims-audits.md`.
The owner's stated ideal — wowsims primary for membership — is inverted on
measured grounds: the DB records no source at all for badge, PvP and tier-token
items.

```bash
python -c "import json,collections;db=json.load(open('vendor/wowsims/db.json'));print(collections.Counter(k for i in db['items'] for s in i.get('sources') or [] for k in s))"
# Counter({'drop': 2821, 'crafted': 1113, 'rep': 111})
```

### Goal 2 — the fork's bundled universes match `data/`, and a gate says so

Ticket 211 closes. Five of the eight copied files had drifted again before the
gate landed, exactly as that ticket predicted. Membership only, traced to two
commits: `5cf0ea0` added 29297 to ret-p3, ret-p4, ret-p5 and feral-p3 plus 34470
to ret-p5; `5c42a37` removed druid-unusable weapon rows from feral-p2 and
feral-p3.

```bash
pnpm fork-universes:check
# fork universes check ok: 8 bundled copies byte-match their data/ sources
python scripts/sync_fork_universes.py --write   # the one-command refresh
```

### Goal 3 — the tab names the phase in plain words

Measured on the served page in a fronted Brave window, **zero hidden
milliseconds** across the timed run. `document.body.innerText.includes('this
phase')` is **false** on ret p2, ret p3, feral p2 and feral p3. Rendered
strings:

```
Sim only Phase 3 (2.2 - T6) BiS-list items
Only items on a Phase 3 (2.2 - T6) BIS list
Max phase        Phase 3 (2.2 - T6)
Candidate pool   BiS-list items for Phase 3 (2.2 - T6)
Pool source      feral-p3.universe.json (366 entries)
```

The tab mounts the page's own `makePhaseSelector` against the same `sim`, so tab
and page cannot disagree. Verified in **both** directions: setting the tab's
selector to 3 moved every page picker to 3, and driving a Gear-side picker to 5
moved the tab's selector and both its labels to Phase 5.

The `366` in the pool-source row equals the local membership the committed feral
listing records, so the bundled universe and the committed artifact agree.

### Goal 4 — a post-sim raid filter, with zoneless gear still reachable

On the completed feral run the filter offers zones first, then only the zoneless
buckets present in the pool:

```
All, Serpentshrine Cavern, Black Temple, Hyjal Summit, Tempest Keep,
PvP vendor, Reputation vendor, Badge vendor, Crafted
```

| Filter | rows | zoneless | slot tabs |
| --- | --- | --- | --- |
| All | 17 | 5 | all 14 slots |
| Serpentshrine Cavern | 2 | 0 | Waist, Trinket 1 |
| Black Temple | 8 | 0 | Neck, Shoulder, Back, Chest, Legs, Feet, Finger 1 |
| Hyjal Summit | 1 | 0 | Hands |
| Tempest Keep | 1 | 0 | Back |
| PvP vendor | 2 | 2 | Wrist, Main Hand |
| Reputation vendor | 1 | 1 | Finger 1 |
| Badge vendor | 1 | 1 | Trinket 2 |
| Crafted | 1 | 1 | Head |

The eight non-All values sum to **17**, exactly the All count; no item matched
two values and none was unreachable. That is the same exactly-one-bucket
property `packages/core/test/view.test.ts` asserts, now confirmed on a served
page. The run's largest single upgrade is a PvP-vendor item at +90.9 DPS, which
a zone-only filter would have hidden entirely.

Accepted consequence: the slot strip narrows with the filtered view — 7 tabs
under Black Temple against 14 under All — because `renderSubTabs()` derives the
slot set from the same view. Nothing is unreachable, only regrouped.

The boss sub-filter is deferred behind ticket 35, because multi-zone items
bucket arbitrarily today and boss narrowing would be confidently wrong. Ticket
277 records the deferral.

### The feral prune-on run, and a 5x discrepancy that is not explained

```
Your current gear: 2132.2 DPS. Took 302 s.
```

Phase 3, prune on (366 candidates down to 17), 3,000 iterations, seeds
11/22/33/44/55, `visibilityState: visible` with **zero hidden intervals**.

**302 s against the 61 s this log recorded for the feral prune-on cell earlier
today in the finish-the-tab entry — roughly 5x, and unexplained.** Both runs
were fronted and unthrottled, so throttling is ruled out. Candidate causes, all
**hypotheses, none tested**:

- The feral universes were refreshed between the two runs (fork `a00a50c6f`
  restored 33 rows to feral-p3), so the pruned candidate set could differ. Both
  runs report the prune reaching 17, which argues against membership alone
  accounting for the gap.
- The earlier feral cell ran the **fork's default APL**, because the owner's
  rotation was stripped when `timeToNextEnergyTick` proved unknown to the pinned
  proto. Whether this run did the same was not checked.
- Machine state: other load, worker count or thermal conditions may differ
  between sittings. `hardwareConcurrency` and the worker picker were not re-read
  this run.
- Run-to-run variance in this area is already known to be wide. The
  finish-the-tab entry records 7.8 s per sim against ticket 156's 3.8 s, and a
  17 % spread between two runs of the same ret cell.

The engine diff between the two fork tips touches only `view.ts`, a post-sim
display filter that cannot affect sim time:

```bash
git -C vendor/tbc-new-fork diff --stat 8bb02b028..eb65670 -- ui/core/components/individual_sim_ui/upgrades/engine/
# PROVENANCE.md | 2 +-    view.ts | 22 +++++-
```

**302 s is the measured figure and stands.** The discrepancy is recorded, not
resolved.

### Engine on wasm — a substitute measurement, labelled as one

The literal `Worker[0] Ready, isWasm: true` line could not be captured: the
browser tooling's console tracker re-initialises on every navigation and so
never observes load-time logs. The same fact was measured at its source instead,
since `sim_worker.js` posts `ready(isWasm)` rather than logging it:

```js
const w = new Worker('/tbc/sim_worker.js');
w.onmessage = e => console.log(JSON.stringify(e.data));
// {"msg":"ready","outputData":{"0":1}}   outputData[0] === 1 is isWasm true
```

### Two traps this run hit

- **Serve `dist`, not `dist/tbc`.** The bundle hardcodes a `/tbc/` prefix, so
  serving `dist/tbc` as the web root 404s the entry script and the page renders
  blank white with no console error. Measuring then would have recorded a blank
  page as a finding.
- **An empty filter view renders a one-cell "No upgrades found above the
  cutoff." row.** A naive `tbody tr` count treats it as data; it inflated one
  filter's row count and produced a phantom item appearing to match three
  filters. Count only rows with `cells.length >= 5`.

### Tickets

211 closed, its mechanism now built. 89, 17 and 173 annotated with what the
listing does and does not settle — 89's blanket framing does not survive the
evidence and needs re-scoping. Filed: 276 (two membership buckets for the owner,
plus the Swiftsteel/Swiftstrike phase doubt) and 277 (the boss sub-filter
deferral).

## 2026-08-23 — upgrades-ui-pass: the mid-run table was the one losing the order

Ticket 278 said "the Upgrades tab UI does not sort by rank". Both halves are
now settled on a served page, and they have different answers.

### Q1: was the done-state order broken? Measured before any change

Taken on the unmodified fork tip `d49096e`, before a single edit, so a pass
could not be an artifact of the fix. Served `vendor/tbc-new-fork/dist` on
`http://localhost:8975`, page `/tbc/paladin/retribution/`, iterations 1,
candidates left at default (blank → full pool).

Toggle states at read time, all four recorded:

| Control | Checked | Visible |
| --- | --- | --- |
| prune | false | true |
| set-potential | false | false (no set data this run) |
| BiS-only / pin | false | true |
| raid filter | "" (default, all) | true |

The shortlist table and the below-cutoff table were read **separately** — they
are two tables, and a concatenated `querySelectorAll` manufactures an inversion
at the seam. 52 shortlist rows (the pre-registered underpowered floor was 10)
and 188 below-cutoff rows.

**Deltas: non-increasing in both tables, zero inversions** across 51 and 187
adjacent pairs. The engine's ordering is not lost on the way to the screen.

**Rank numbers: two inversions**, rendering `... 19, 21, 20, 22, 23, 25, 24,
26 ...`. Both sit strictly inside an exact delta tie (+18.1 twice, +14.2
three times). Two comparators order the same rows and disagree on ties:
`rank.ts:883-891` stamps `rank` after sorting with a delta-only tiebreak,
while `view.ts:205` renders through `compareRows`, which breaks ties on
bisTags richness then `itemId`. Filed as ticket 279; engine changes were
scoped out of this plan, and the UI fix below is correct either way.

### Q2: the mid-run table, which is what the owner was looking at

`landedRowsTable` rendered rows in whatever order their sims finished — 96 of
239 adjacent pairs inverted in the recorded repro — with four columns and no
Rank at all. It now sorts a copy by delta at render time and shares one row
renderer and one header with the done-state tables.

Confirmed on the rebuilt page: 240 rows, five columns including Rank, **zero
delta inversions across 239 adjacent pairs**, Rank sequential 1…240.

### The prune toggle's behaviour change, verified both directions

`setPruneAvailable` used to force the checkbox off whenever it hid the
control, destroying the user's preference. Visibility now only shows and
hides; the safety is provided at the single read site instead
(`pruneEffective()` = `visible && checked`).

- visible + checked → placeholder "all 16 eligible", the pool is pruned;
- hidden + checked → run used all 240, assumptions drawer recorded
  "Candidate pool: every eligible item".

So the gate is not vacuously false in one direction, and a hidden prune cannot
silently apply.

### A trap worth recording

**The browser pane again reported `document.hidden: true` and
`outerWidth/outerHeight: 0` for the whole session**, the same condition that
stalled the earlier repro. In-page DOM reads and clicks worked fine and runs
completed in ~10 s at iterations 1. The earlier session's conclusion that runs
cannot finish in this state was a function of default iterations, not of the
0×0 window: C9 held.

### Tickets

278 closed (measured, and the mid-run path fixed). 275 closed (toggle fold).
Filed: 279 (the rank/view tie-order disagreement), 280 (sortable headers),
281 (progress bar), 282 (content-filter option grouping).

## 2026-09-10 — reforge-catchup-leftovers: two questions, one answerable

### Q1: what does the fork engine do with a 2H + off-hand equipment spec?

**Unmeasurable from committed inputs.** Full record with every command and its
output: `.scratch/stage-gate/reforge-catchup-leftovers/probe/results.md`.

Ticket 350 is reachable only for `DUAL_WIELD_SPECS` — rogue, enh, warrior,
hunter (`packages/core/src/pool.ts:373-378`). The only committed request
fixtures are `feralCatDruid` and `retributionPaladin`, and the only skeletons
`cli-wiring.ts` can load are `data/presets/{feral,ret}/p2.raid-sim-skeleton.json`.
Ret and feral are excluded from the set deliberately — neither can put anything
in the off hand — so no committed input can express the 2H+OH set the question
is about. A request for a dual-wield spec would have to be hand-authored, which
`packages/core/test/direct-sim-support.ts:15` warns differs from what `rank.ts`
actually sends. Ticket 365 files the missing fixture.

Reading only (not a measurement): no hand-type check gates the off-hand weapon
on this path. `IsDualWielding` is `options.OffHand.SwingSpeed != 0`
(`sim/core/attack.go:441`), and `GetOHWeapon` (`sim/core/character.go:560-568`)
returns nil only for id 0, a shield, or a dedicated `WeaponTypeOffHand` item —
never because the main hand is two-handed. The defensive clear exists only in
the bulk generator (`sim/core/bulk/generator.go:335`), which the `raidsim` path
does not use.

The planned live observation on the enhancement page did not happen: the run
aborts in the item-swap path before any candidate is priced (ticket 362). It is
evidence neither for nor against any of the three candidate answers.

### Q2: do a weightstone and a sharpstone give the same melee bonus in TBC?

**Yes — answered by reading, as the ticket said it should be.**
`registerStaticImbue` (`vendor/tbc-new-fork/sim/core/consumes.go:697`) gives
Adamantite Sharpstone (29453, case :708) and Adamantite Weightstone (34340,
case :734) the same `stats.MeleeCritRating +14` and the same `+12` to MH/OH
BaseDamageMin/Max. The only difference is the sharpstone's ranged-crit
compensation at :732, inert for a melee-only character.

So `sim/druid/forms.go:52`, which grants the paw bonus only when
`MhImbueId == 34340`, is the defect — filed as ticket 364.

**provenance: upstream, measured.** The `upstream` remote had never been
fetched, so ancestry within the pin's own history proved nothing about where a
commit came from. After `git -C vendor/tbc-new-fork fetch upstream
feature/backend-reforge`, `merge-base --is-ancestor db05fed93
upstream/feature/backend-reforge` exits 0 — the commit is on upstream's branch.

Decision recorded in ticket 351: do **not** mirror `adjustWeaponImbueID` here,
because with `forms.go:52` unchanged a dagger candidate rewritten to 29453 loses
a paw bonus blunt candidates keep. The `disclosure.ts` note that over-asserted
"deltas survive" is corrected in both engine copies regardless, with a test that
pins the new wording.
