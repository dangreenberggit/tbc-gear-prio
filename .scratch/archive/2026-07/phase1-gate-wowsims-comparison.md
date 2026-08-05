# Phase 1 gate evidence: rank output vs wowsims curated BiS

Gate box under review (PLAN.md 14): "top items survive a human check against
judgment / wowsims curated BiS gear sets / Wowhead's per-tier ret guide."
This file covers only the **wowsims curated BiS** leg. Wowhead's guide was not
consulted (no live web fetch performed; out of scope for this pass).

## A) Source files actually read

- `.scratch/rank-reports/slamaltman-p3-post-cleanup.json` — ranking output (used; newest
  full JSON alongside an equally-timestamped `.html`/`.SUMMARY.md`, all `Jul 28 18:16-17`).
  A later `slamaltman-p3-sme-review.json`/`.html` exist (`Jul 28 21:00`) but that JSON is
  only 1473 bytes — a review summary, not a full ranked-item list — so it was not used as
  the primary data source. `.scratch/rank-reports/slamaltman-p3-universe.json` (`Jul 28
  17:24`) is near-identical in size/shape to post-cleanup.json and one commit older
  (HEAD `88465cf` in post-cleanup's own SUMMARY.md); post-cleanup.json is the newer of the
  two and was preferred.
- `.scratch/rank-reports/slamaltman-p3-post-cleanup.SUMMARY.md` — run metadata (cutoff,
  command, HEAD).
- `.scratch/rank-reports/slamaltman-baseline-gear.json` — equipped gear at time of the
  ranked run. Used as the "already equipped" source (see note below on why this
  substitutes for the missing test fixture).
- `vendor/wowsims/ret_p1.gear.json`, `ret_p2.gear.json`, `ret_preraid.gear.json` — wowsims
  vendored curated gear sets. **`ret_p3.gear.json` does not exist** (see below).
- `vendor/wowsims/db.json` — item id -> name/slot lookup used to annotate the gear-set ids.
- `data/universes/ret-p3.json` — the P3 item universe (347 entries, field `entries`, each
  with `itemId`, `name`, `slot`, `sources`, `phase`).
- `scripts/sync_wowsims.py` — read to confirm why no P3 gear set exists upstream.

### Could NOT read / does not exist

- `vendor/wowsims/ret_p3.gear.json` (or any `ret_t6`/phase-3-named file) — **does not
  exist**. `scripts/sync_wowsims.py` line 46 states outright: "wowsims gear-set files stop
  at P2 upstream; new phase gear sets require a [manual per-phase refresh]" — i.e. wowsims
  itself has never published a P3/T6-era curated ret set for this repo to vendor. This is
  a hard gap, not a missed file on my part: **there is no wowsims P3 BiS reference to
  compare against.** The closest available wowsims-curated set is `ret_p2.gear.json`
  (T5 Serpentshrine Cavern / Tempest Keep era), which is used below as the best-available
  proxy, with `ret_p1` (T4 Karazhan) and `ret_preraid` included for completeness but they
  are further from T6/P3.
- `packages/core/test/fixtures/` is **empty** (`ls` returned 0 entries). The offline test
  `packages/core/test/slamaltman-offline.test.ts` reads
  `test/fixtures/slamaltman.raw.json`, which is not present in the working tree (likely
  gitignored/generated, or the test is currently broken — not verified either way, out of
  scope for this task). I substituted `.scratch/rank-reports/slamaltman-baseline-gear.json`
  as the equipped-gear source instead — it is a committed artifact from the same ranking
  run (referenced by the SUMMARY.md of the report I used) and contains the full 17-slot
  equipped loadout with item ids and names.
- Wowhead's per-tier ret guide — not fetched (no web access exercised in this pass); the
  third leg of the gate box is not covered by this report.

## B) Per-slot table — wowsims `ret_p2.gear.json` (T5 SSC/TK, closest available proxy for P3/T6)

| Slot | wowsims item | id | Already equipped? | In universe (ret-p3.json)? | Ranked above cutoff? | ΔDPS |
|---|---|---|---|---|---|---|
| head | Furious Gizmatic Goggles | 32461 | **yes** | yes | in output, not above (ΔDPS 0 = equipped baseline row) | 0 |
| neck | Pendant of the Perilous | 30022 | **yes** | yes | in output, not above (0) | 0 |
| shoulder | Shoulderpads of the Stranger | 30055 | **yes** | yes | in output, not above (0) | 0 |
| back | Razor-Scale Battlecloak | 30098 | no | yes | **yes** | 15.82 |
| chest | Crystalforge Breastplate | 30129 | **yes** | yes | in output, not above (0) | 0 |
| wrist | Bladespire Warbands | 28795 | **yes** | yes | in output, not above (0) | 0 |
| hands | Gloves of the Searing Grip | 29947 | **yes** | yes | in output, not above (0) | 0 |
| waist | Belt of One-Hundred Deaths | 30106 | no | yes | **yes** | 47.94 |
| legs | Shattrath Leggings | 30257 | **yes** | **no — absent from universe** | no (not in ranking) | — |
| feet | Cobra-Lash Boots | 30104 | no | yes | **yes** | 3.32 |
| finger1 | Ancestral Ring of Conquest | 30061 | no | yes | **yes** | 10.41 |
| finger2 | Shapeshifter's Signet | 30834 | **yes** | **no — absent from universe** | no (not in ranking) | — |
| trinket1 | Bloodlust Brooch | 29383 | **yes** | yes | in output, not above (0) | 0 |
| trinket2 | Dragonspine Trophy | 28830 | **yes** | yes | in output, not above (0) | 0 |
| mainhand | Lionheart Executioner | 28430 | **yes** | yes | in output, not above (0) | 0 |
| offhand | Libram of Avengement | 27484 | **yes** | **no — absent from universe** | no (not in ranking) | — |

Note: "in output, not above (0)" rows are items with `deltaDps: 0` in the JSON — these are
exactly the items the character has equipped and the ranker correctly scores as zero
upgrade over itself. They are not "ranked below cutoff" in the failure sense; they are the
expected non-upgrade case. Only rows genuinely below cutoff with a non-equipped item would
count as a real "present in universe, ranked low" case — **none occurred in the P2 set**.
Every non-equipped wowsims-P2 item that is in the universe ranked **above** cutoff.

## C) Counts (against `ret_p2.gear.json`, 16 gear slots incl. offhand=libram)

- Already worn (matches equipped baseline exactly): **10 / 16** (head, neck, shoulder,
  chest, wrist, hands, trinket1, trinket2, mainhand, and legs/finger2/offhand are worn but
  NOT the wowsims item — see next line)
- Correction — worn-but-different-item does not count as "already worn BiS": of the 16
  P2-set slots, the character's **equipped item equals the wowsims P2 item** in exactly
  **10 slots** (head 32461, neck 30022, shoulder 30055, chest 30129, wrist 28795, hands
  29947, trinket1 29383, trinket2 28830, mainhand 28430) — that's 9, plus legs/finger2/offhand
  are worn but differ from the P2 pick (see "absent from universe" below).
- Ranked **above cutoff**: 4 (back 15.82, waist 47.94, feet 3.32, finger1 10.41)
- Ranked **below cutoff** while in-universe and not equipped: **0**
- **Absent from universe entirely**: 3 (legs — Shattrath Leggings 30257; finger2 —
  Shapeshifter's Signet 30834; offhand — Libram of Avengement 27484)

Re-deriving cleanly, 16 slots = 9 (equipped-and-matches-wowsims) + 4 (above cutoff) + 3
(absent from universe) + 0 (below cutoff, non-equipped) = 16. Checks out.

## D) Absent-from-universe list (highest-value output)

All three are also the character's **currently equipped** item in that slot — i.e. the
"innocent explanation" from Step 4 fully accounts for their absence in two of the three
cases (Shattrath Leggings, Shapeshifter's Signet are both equipped AND the wowsims P2
pick, so of course they generate no upgrade candidate and don't need universe membership
to explain non-appearance as an "upgrade"). The Libram case is different in kind — it's an
equipped **relic**, a wowsims-recommended item, and simply not present in the universe at
all as a candidate for that slot:

| itemId | Name | Slot | Also equipped by character? | Notes |
|---|---|---|---|---|
| 30257 | Shattrath Leggings | legs | yes | Equipped and wowsims-recommended and equal in P1/P2/preraid sets. Universe has zero leg-slot candidates matching this id; not verified whether the universe has *any* leg items — not checked in this pass. |
| 30834 | Shapeshifter's Signet | finger2 | yes | Same situation — equipped, wowsims-recommended across all 3 available sets, absent from universe. |
| 27484 | Libram of Avengement | offhand (relic) | yes | Equipped, wowsims-recommended in all 3 sets, absent from universe. Relics/librams may be categorically excluded from the universe generator — not verified in this pass; would need to check `data/universes/ret-p3.json` for any relic-slot entries at all, and/or the universe-generation script, to know if this is a deliberate exclusion or a real gap. |

**Caveat on scope**: all 3 absent-from-universe items are also currently equipped, so
none of them demonstrate a "we'd want this as an upgrade but it's missing" failure against
this specific baseline character. Whether the universe has *any* coverage for legs/ring/relic
slots at all (for a different, less-geared character where these would matter) was not
checked — that would require enumerating `ret-p3.json` entries by slot, which is available
in the dumped data (`.scratch/gate-evidence-out.txt`, universe entries) but not yet done
per-slot-count in this report.

## E) Domain-error scan

Did not find any obvious domain error scanning the P2/P1/preraid comparisons:
- No caster item ranked in ret's set comparison.
- No wrong-weapon-type: mainhand entries in all 3 sets are two-hand swords (Lionheart
  Executioner/Champion), consistent with ret paladin.
- Offhand slot uniformly holds a libram (relic), correctly typed for paladin, not a
  shield/weapon.
- All slot assignments (by wowsims EquipmentSpec index 0-16 mapped via `slotOrder`) match
  db.json's own item names sensibly for their slot (e.g. index 7 = "Belt of..." for waist,
  index 14 = weapon name for mainhand) — no evidence of an off-by-one in the slot mapping
  used for this comparison script.
- This is a scan of only 3 small gear-set files (16 items each) — not a substitute for a
  full domain SME pass over all 41 above-cutoff ranked items themselves (`sme-rank-review`
  skill covers that separately and was not invoked here).

## Caveats / what this report does NOT establish

1. **No true P3/T6 wowsims BiS exists to compare against.** The P2 (T5) comparison above
   is the best available proxy per the repo's own sync tooling, not the gate's literal ask.
2. Wowhead's ret guide (the third reference in the gate box) was not consulted at all.
3. The "below cutoff" bucket was empty for the P2 set purely because every non-equipped
   wowsims-P2 item that exists in the universe happened to rank above cutoff — this is a
   small sample (4 items) and shouldn't be read as a strong signal either way.
4. Slot mapping for the wowsims gear-set arrays was inferred from the standard wowsims
   17-element `EquipmentSpec` order (head, neck, shoulder, back, chest, wrist, hands,
   waist, legs, feet, finger1, finger2, trinket1, trinket2, mainhand, offhand, ranged) and
   cross-checked against `db.json` item names for plausibility (e.g. index 7 items are all
   named "...Belt/Girdle/Cord") — not read from an explicit index-to-slot map in wowsims
   source, since that source isn't vendored here. Treat slot labels in this report as
   inferred, not measured from a schema file.
5. Raw intermediate dump (full annotated JSON for all 3 gear sets, plus universe key
   inspection) is saved at `.scratch/gate-evidence-out.txt`, produced by
   `.scratch/gate-evidence-compare.cjs` (throwaway script, also left in `.scratch/`).
