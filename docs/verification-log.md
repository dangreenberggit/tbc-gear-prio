# Verification log

PLAN.md §14: *"No phase starts until the previous gate is written into
`docs/verification-log.md`."* This is that file. One entry per gate box, each
recording what was actually run and what came back — not what was expected.

---

## 2026-07-26 — Phase 0, second sitting

Closes three review findings against data on disk. Reproduce with:

```bash
python scripts/sync_wowsims.py --update
python wcl_probe.py --name slamaltman --server-slug dreamscythe --region US --raw-out test/fixtures/slamaltman.raw.json --json-out findings.json
python scripts/verify_fixture.py test/fixtures/slamaltman.raw.json
```

### Fixture capture — the first run's output was not a fixture

`findings.json` from the first probe run recorded `"enchants": "present (10/19)"`
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

### Still open — Phase 0 does not close yet

| | |
|---|---|
| ☐ | real logged ret gear produces a valid `RaidSimResult` through the pinned binary |
| ☐ | `decodelink` verified against the pinned binary |

Both need `wowsimcli`, which is not yet vendored. They remain one sitting's work
and are the last two boxes before Phase 1 starts.
