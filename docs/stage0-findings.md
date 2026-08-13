# Stage 0 findings

**Status:** de-risking probe run against the live Warcraft Logs API. Converts the plan's Warcraft-Logs-side assumptions from documented-but-unproven to verified.
**Probe script:** [`wcl_probe.py`](../wcl_probe.py) (handoff doc for the script's own design lives in the session that produced it; not duplicated here — see script docstring).
**Runs:** two characters, two classes, both on Dreamscythe-US, both SSC/TK logs against Hydross the Unstable.
**Probe summaries (not fixtures):** [`docs/phase0-probe-summaries/slamaltman.json`](phase0-probe-summaries/slamaltman.json), [`docs/phase0-probe-summaries/shredzepelin.json`](phase0-probe-summaries/shredzepelin.json). The real gear payloads are under `test/fixtures/*.raw.json`.

---

## Gate checklist (PLAN.md §14, Stage 0)

- [x] real logged gear produced a valid, inspectable `CombatantInfo` payload
- [x] present/absent fields documented, with a synthesis policy for what's absent
- [x] exact `specName`-equivalent strings identified for Paladin/general classes — **see §4, this changes a plan assumption**
- [x] points cost per resolve measured — **see §2**
- [x] 19 → 17 slot mapping verified both directions — **see §10**
- [x] enchant / gem ID namespace resolved — **see §10**
- [x] race retrievability — **answered NO, decisively; see §10**
- [x] preset decode path (`decodelink`, §8.2 of the plan) — **closed 2026-07-26, third sitting; see verification-log**
- [x] real logged gear through the pinned binary to a valid `RaidSimResult` — **closed 2026-07-26, third sitting; DPS avg 2042.85**

---

## 1. Auth and endpoints

- Token endpoint: `https://www.warcraftlogs.com/oauth/token` (the shared endpoint, not a classic-specific one) works with the confidential client credentials flow.
- GraphQL endpoint: `https://classic.warcraftlogs.com/api/v2/client` is the one that actually resolves TBC data.
- `.env` originally stored credentials as `WARCRAFTLOGS_CLIENT_ID`/`WARCRAFTLOGS_CLIENT_SECRET`; renamed to `WCL_CLIENT_ID`/`WCL_CLIENT_SECRET` to match the probe script and (presumably) whatever Stage 1 code reads next.

## 2. Rate limit

- `limitPerHour`: 3600 points.
- Full probe run (schema introspection + zones + character + report + CombatantInfo + buffs) cost **~10.6 points**. Two full runs plus schema-only exploration totaled under 20 points spent in the session.
- At this cost, permanent gear-snapshot caching (per PLAN.md §11) is not urgent for hobby-scale usage, but still worth doing before any multi-user deployment — a handful of concurrent lookups is fine, dozens per hour during a raid night is not free.

## 3. Schema

- `Character.recentReports` **is present** — the plan's resolve-stage assumption holds, no fallback to `zoneRankings`/`encounterRankings` needed for that step.
- `Character.encounterRankings` and `Character.zoneRankings` both present too.
- `EventDataType.CombatantInfo`, `.Buffs`, `.Casts` all present.
- `TableDataType.Buffs` present (used for form-uptime check, §6 below).

## 4. Spec strings — plan assumption does not hold as written

The actor-level `subType` field on report players (used in the plan as "WCL's spec label") only returns **class-level** strings: `Druid, Hunter, Mage, Paladin, Priest, Rogue, Shaman, Unknown, Warlock, Warrior`. There is no `Retribution` or `Feral` string at this level.

PLAN.md §1.2 arbitrates the first-spec choice partly on the claim that "WCL's spec label is unambiguous for ret, so Stage 1 carries no spec-disambiguation layer at all." That claim needs revisiting: spec-level detail isn't in `subType` at all, for any class, not just feral. What does carry spec signal:

- `CombatantInfo.specID` — a numeric spec identifier, present on every combatant event in both test runs.
- `CombatantInfo.talentTree` and the `talents` array (see §5) — the actual talent point allocation, from which spec can be derived by whichever tree has the plurality of points.

**Implication:** ret still doesn't need the uptime/cast-based disambiguation heuristics that feral needs (per §5.4 of the plan) — that part of the arbitration still stands. But "no disambiguation layer at all" undersells it: even ret needs to read talent points rather than trusting a ready-made spec string from the actor list, because no such string exists at that level. This is a small correction to the resolve/normalize stages, not a structural problem.

**Update (ticket 01):** `specID` is not a usable signal on TBC Anniversary. In `test/fixtures/slamaltman.raw.json`, **every** combatant has `specID: 0`, including Slamaltman (talent plurality `5/11/45` → Ret). Talent-tree plurality is the only classifier (`classifySpec` in `packages/core/src/spec.ts`); `specID` is documented noise on this game version unless a re-probe shows otherwise.

## 5. Talents — different shape than assumed

`CombatantInfo.talentPoints` (the shape the plan assumed) is **absent** on both test characters. In its place: a `talents` array of `{id, icon}` triples — three entries, one per tree, `id` being points spent in that tree (e.g. `[{"id": 21, ...}, {"id": 40, ...}, {"id": 0, ...}]` reads as 21/40/0 across the three trees).

**Implication:** talent-preset selection falls back to a single default per spec/phase rather than picking the closest variant by exact point distribution, per the plan's own fallback note (§7 of the original probe design). Not fatal — the tool only needs spec-level granularity — but confirms the refinement is unavailable, not just untested.

## 6. CombatantInfo gear — present, and the sparsity is expected, not a data gap

Both runs returned CombatantInfo successfully: 19 gear slot entries per combatant (vs. the sim's 17 — slot-count reconciliation is still a manual TODO), with `permanentEnchant`/`temporaryEnchant` and `gems` keys present on the payload shape.

Raw population counts:

| Character | Class | Enchant-populated slots | Gem-populated slots |
|---|---|---|---|
| slamaltman | Paladin | 10 / 19 | 7 / 19 |
| shredzepelin | Warrior | 9 / 19 | 6 / 19 |

At first glance this reads as "sparse" against a naive expectation of 19/19. **It isn't a data gap.** Cross-referencing the specific item IDs from both logs against the actual wowsims item database (`assets/database/db.json` from [wowsims/tbc-new](https://github.com/wowsims/tbc-new)) shows exact agreement between what a slot *can* carry and what WCL reported:

| Item | Slot | wowsims `gemSockets` | WCL gems reported |
|---|---|---|---|
| 30120 Destroyer Battle-Helm | Head | `[1,3]` (2 sockets) | 2 gems |
| 30022 Pendant of the Perilous | Neck | none | 0 gems |
| 30053 Pauldrons of the Wardancer | Shoulder | `[2,3]` (2 sockets) | 2 gems |
| 30488 Merciless Gladiator's Plate Helm | Head | `[1,4]` (2 sockets) | 2 gems |
| 33066 Veteran's Pendant of Triumph | Neck | `[4]` (1 socket) | 1 gem |
| 29023 Warbringer Shoulderplates | Shoulder | `[4,3]` (2 sockets) | 2 gems |

Every item matches: sockets in the item DB → gems present in the log; no sockets → no gems. Same story for enchants — neck/ring/trinket slots correctly show no `permanentEnchant` because those slots aren't enchantable in TBC at all. This held across two different classes and two different characters, which is the re-run the original probe design asked for before trusting the number.

**Synthesis policy, confirmed:** the normalization layer does not need to treat every slot as "should have an enchant/gem, flag if missing." It needs to be **eligibility-aware**: for each slot, first determine from the item DB whether it *can* carry an enchant / has sockets, and only synthesize (from the curated preset) when an eligible slot is genuinely empty in the log. The plan's existing rule — apply the same synthesis to baseline and every candidate alike — still stands and is now known to trigger rarely rather than constantly, since most of what looked like "missing" data was never expected to be there.

One practical consequence: this also means the item DB (or at least its socket/enchantability metadata) needs to be available to the normalization layer at Stage 1, not just to the pool generator (§8.3 of the plan) — it's now load-bearing for gear-reading, not only for pool curation.

## 7. Buff / form uptime (feral gate)

The `Buffs` table for both fights contains `Dire Bear Form`, `Bear Form`, `Cat Form`, and `Moonkin` entries. Form uptime is derivable from this table, which unblocks the feral bear/cat disambiguation planned for Stage 2 (§5.4, §14 Stage 2 gate).

## 8. Zone / encounter IDs

Captured for all raid tiers exposed by the endpoint: Karazhan, Gruul/Magtheridon, Zul'Gurub, Zul'Aman, SSC/TK (not itemized above but present in the 32-zone list), BT/Hyjal, Sunwell Plateau. Full list in `docs/phase0-probe-summaries/slamaltman.json`.

## 9. Still open / deferred

- ~~Share-link `decodelink` path~~ — **closed 2026-07-26**, third sitting.
- ~~Slot-count reconciliation~~ — **closed 2026-07-26**, see §10.
- ~~Real logged gear → `RaidSimResult`~~ — **closed 2026-07-26**, third sitting.
- This was sampled from one fight (Hydross, SSC/TK) per character. Both characters happened to be on the same encounter; worth a third fixture against a different encounter/raid tier (and ideally an inactive meta) before treating slot-eligibility logic as fully general. Deferred — not a Stage 0 gate.

---

## 10. Second sitting, 2026-07-26 — corrections and closures

Full detail and reproduction commands in [`verification-log.md`](verification-log.md). Summarised here because three items above are superseded.

**This document's §6 said the raw payload was inspected. It was — but it was never saved.** The probe summary (`docs/phase0-probe-summaries/slamaltman.json`) records `"enchants": "present (10/19)"` and nothing else, so every downstream question that needed the actual IDs stayed open. `wcl_probe.py` now takes `--raw-out` and writes `test/fixtures/slamaltman.raw.json` (all 25 combatants plus the buffs table), and warns when the flag is omitted. **A summary is not a fixture** — that's the reusable lesson.

**Slot mapping (§6's "manual TODO") is closed.** WCL's 19-entry order verified 19/19 against `db.json`; the sim's 17-entry order verified 16/16 against wowsims' own curated ret set, which carries slot-typed enchants and so proves the ordering without the binary. Dropping shirt and tabard *without reordering* gets **11 of 17 positions wrong**.

**Enchant/gem namespace is closed.** `permanentEnchant` is the `tbc-new` `effectId` namespace — 10/10 resolved as `effectId`, 0 as `itemId`. All 12 gems resolve. `temporaryEnchant` is a consumable and a separate namespace.

**§5's talent finding stands, with one addition.** Both fixture characters are **Alliance** (`faction: {id: 1, name: "Alliance"}`), which matters for the race finding below.

**Race is not retrievable — a new, decisive negative.** No race on `ReportActor`, none on `CombatantInfo`, and `Character.gameData` returns `{"error": "This game does not support cached game data."}`. The *Heroic Presence* aura — which would have been a **better** signal than race, since it is party-wide and is what actually moves the cap — is absent from 6/6 reports, in tables that do track 163 auras including passive party auras of the same shape. Given both characters are Alliance and every Alliance shaman is a Draenei, there were Draenei in those raids. The plan changed to suit (assumed race, `capUncertainty: 16`, user override).

**Cost:** 41.3 points for the whole sitting, against 3,600/hour.

---

## 11. Third sitting, 2026-07-26 — `wowsimcli` boxes + `events[0]` footgun

Full detail in [`verification-log.md`](verification-log.md).

**`events[0]` is not the named character.** The raw fixture keeps every combatant;
`[0]` was Hagguth (Warrior). §6's item table above quoting Destroyer Battle-Helm
`30120` for the slamaltman run was that warrior's gear. Slamaltman (`sourceID=11`)
wears Furious Gizmatic Goggles `32461` + Crystalforge Breastplate `30129`. R17/R19
conclusions re-confirmed against the real actor; `verify_fixture.py` now matches
by `actors[].name`.

**`decodelink` works** on the pinned binary (v0.0.101). First preset committed:
`data/presets/ret/p2.individual-sim-settings.json`.

**Logged ret gear sims.** Hand-composed `RaidSimRequest` → DPS avg **2042.85**
(3000 iterations, seed 42). Fixtures under `test/fixtures/slamaltman.raid-sim-*.json`.
