Status: closed
Type: investigation
Origin: user proposal, 2026-08-10, during the set-bonus 4pc-invisible investigation (`.scratch/handoffs/set-bonus-4pc-invisible-investigation.md`)
Blocks: none
Blocked by: none

# measure set bonuses in isolation on a reference set

Every set-bonus figure this project has produced is measured relative to
**one player's baseline gear**. `computeSynergy`
(`packages/core/src/set-value.ts:332-345`) computes:

```
packageDelta(S,t) = D(P(S,t)) - D(baseline)
bonus(S,2)        = packageDelta - Σ singles
bonus(S,4)        = packageDelta - Σ singles - bonus(S,2)
```

Every term is anchored to `D(baseline)`, and for the live feral P3 case that
baseline wears two Malorne Harness pieces. So the reported Thunderheart 4pc of
193.89 is entangled with three things at once: this player's gear, the Malorne
2pc break the package causes (k=2, ticket 90), and the singles used to subtract
stat value. That entanglement is the whole reason tickets 90/92/97 exist —
a break toll `B`, a multiplier `k`, and a regression estimate are all artefacts
of the measurement design, not of the game.

**Measure the bonus directly instead.** wowsims applies set bonuses natively
from equipped items, so this needs no new engine capability: sim one gear set
twice, once with N set pieces equipped and once with N non-set items in the
same slots, and difference the two DPS numbers. No break, no `Σ singles`, no
`k`, no regression.

## Reference gear set

Use **`vendor/wowsims/feral_p3_9p.gear.json`** as the A-side (fall back to
`feral_p3_6p.gear.json` if the 9p variant is unavailable; the four tier slots
are identical between them, they differ only at back/trinket).

Both files already equip all four Thunderheart pieces. Verified by reading
`vendor/wowsims/feral_p3_9p.gear.json` — array index → item id:

| index | slot | item id | name | ilvl |
|---|---|---|---|---|
| 2 | shoulder | 31048 | Thunderheart Pauldrons | 146 |
| 4 | chest | 31042 | Thunderheart Chestguard | 146 |
| 6 | hands | 31034 | Thunderheart Gauntlets | 146 |
| 8 | legs | 31044 | Thunderheart Leggings | 146 |

ilvls and set membership re-derivable with:

```
python -c "import json; db=json.load(open('vendor/wowsims/db.json')); \
items={i['id']:i for i in db['items']}; \
[print(t, items[t]['name'], items[t]['scalingOptions']['0']['ilvl'], items[t].get('setName')) \
 for t in (31048,31042,31034,31044)]"
```

### B-side replacements — no clean ilvl-146 match exists. Read this before running anything.

The obvious B-side is "same slot, same ilvl, no set". **That does not exist for
this spec.** Scanning `data/universes/feral-p3.json` for each slot and joining
against `vendor/wowsims/db.json` ilvl:

```
python -c "
import json
db=json.load(open('vendor/wowsims/db.json')); items={i['id']:i for i in db['items']}
uni=json.load(open('data/universes/feral-p3.json'))
il=lambda i: items.get(i,{}).get('scalingOptions',{}).get('0',{}).get('ilvl')
for slot in ('shoulder','chest','hands','legs'):
    rows=sorted(((il(e['itemId']), e['itemId'], e['name'], items.get(e['itemId'],{}).get('setName'))
                 for e in uni['entries'] if e['slot']==slot), key=lambda r:-(r[0] or 0))
    print(slot); [print(' ',r) for r in rows[:6]]"
```

gives, at the top of each slot:

- **shoulder** — the only other ilvl-146 item is 33674 Vengeful Gladiator's
  Dragonhide Spaulders, which is itself a set piece (`Gladiator's Sanctuary`,
  setId 584). Best non-set: **32377 Mantle of Darkness** (ilvl 141) or
  **30917 Razorfury Mantle** (ilvl 141).
- **chest** — ilvl-146 alternatives are 33675 Vengeful Gladiator's Dragonhide
  Tunic (setId 584, again a set). Two *higher* non-set items exist at ilvl 151
  (30905 Midnight Chestguard, 30913 Robes of Rhonin). Best matched non-set
  below: **32252 Nether Shadow Tunic** (ilvl 141, leather, 3 sockets).
- **hands** — **no ilvl-146 non-Thunderheart item at all** in the feral-p3
  universe. Best non-set: **32347 Grips of Damnation** (ilvl 141).
- **legs** — ilvl-146 alternative is again a Gladiator set piece (33673). Best
  non-set: **32271 Kilt of Immortal Nature** (ilvl 141) or **30898 Shady
  Dealer's Pantaloons** (ilvl 141); 30912 Leggings of Eternity is ilvl 151 but
  cloth.

**Do not use the Vengeful Gladiator pieces.** Swapping all four tier slots to
them would equip four pieces of setId 584 and activate *that* set's bonuses,
reproducing exactly the contamination this ticket exists to remove. Any B-side
item chosen must have `setId == null` in `vendor/wowsims/db.json`. Check it
per item; do not assume from the name.

### Specified fallback

Accept a **5-ilvl deficit on the B-side** (146 → 141 in all four slots) and
correct for it, rather than chasing an exact match that does not exist:

1. Prefer B-side items whose stat profile is closest to the tier piece — same
   armor type (leather, `armorType: 2`), Agility/Strength/AP-weighted, similar
   socket count. From the shortlist above the closest four are 32377
   (shoulder), 32252 (chest), 32347 (hands), 32271 (legs). All four are
   `setName: None` in db.json — re-verify with the snippet above before use.
2. Sim each B-side item as a **single swap off the A-side reference set**, one
   slot at a time. That gives four `single_i` deltas that price the raw stat
   difference of each replacement.
3. The bonus estimate is then
   `bonus_4pc ≈ D(A) - D(B_all4) - Σ single_i`, which is the same subtraction
   shape as `computeSynergy` but with **no broken set on either side**, since
   the reference set holds no Malorne and the B-side items hold no set at all.
   This retains the `Σ singles` term but eliminates `B` and `k` entirely — the
   confound that ticket 90 identified.

**Narrower alternative if the four-slot version proves messy:** measure the
**2pc only**, replacing just two of the four tier slots. Fewer replacements
means less accumulated stat-matching error, and it directly produces a figure
comparable to the 31.46 the artifact reports for the Thunderheart 2pc.

## The exact comparisons

Run the 0/2/4 ladder so the 2pc and 4pc increments separate cleanly. All on the
same reference gear, same seeds, same iteration count:

| sim | tier pieces equipped | slots replaced | yields |
|---|---|---|---|
| A4 | 4 (31048, 31042, 31034, 31044) | none — the file as committed | `D(4pc active)` |
| A2 | 2 (31048, 31042) | hands 31034→32347, legs 31044→32271 | `D(2pc active)` |
| A0 | 0 | all four → 32377 / 32252 / 32347 / 32271 | `D(no set bonus)` |
| S1..S4 | 3 each | one slot replaced per sim | `single_i`, the raw stat cost of each replacement |

Then:

```
4pc_increment ≈ (D(A4) - D(A2)) - (single_hands + single_legs)
2pc_increment ≈ (D(A2) - D(A0)) - (single_shoulder + single_chest)
total_set_value ≈ (D(A4) - D(A0)) - Σ all four singles
```

That is **7 sims** for the full ladder, or **3** (A4, A0, plus four singles = 6)
for the total-value-only version. Ticket 92's `~4-per-run` budget note (spec
§2.4) is about a ranking run's budget; this is a standalone experiment and is
not bound by it.

Use the existing run parameters for comparability: seeds `[11,22,33,44,55]`,
3000 iterations — the same values ticket 92 names for its own sim.

**Untested by definition:** no sims have been run in any part of this
investigation (`.scratch/handoffs/set-bonus-4pc-invisible-investigation.md`,
"No sims were run in any part of this work"). Every number this ticket
predicts is a prediction, not a result.

## Why this is better than ticket 92's current plan

Ticket 92 (`92-measure-malorne-2pc-to-de-confound-break-savings.md`) proposes
swapping one Malorne piece for a stat-identical non-set item to estimate `B`,
then subtracting `k·B` from 193.89 to recover a corrected 4pc. That is an
**indirect correction**: it inherits ticket 90's single-scalar-toll model
(`bonus_reported = bonus_true + (k-1)·B`), the `k=2` derivation, and the
assumption that `B` measured on that one swap is the same `B` charged inside
the package. If any of those is wrong, the corrected 4pc is wrong and nothing
in 92's design would reveal it.

This ticket measures the target quantity directly. There is no `B` to
estimate, no `k` to derive, and no model to inherit — the difference between
"four tier pieces equipped" and "four non-set pieces equipped" **is** the set
bonus plus a stat delta, and the singles price the stat delta.

**Recommendation: run 99 before 92's sim, or instead of it.** If 99 lands a
credible 4pc figure, 92's correction becomes a cross-check rather than the
primary evidence — and if 99's figure and 92's corrected figure disagree, that
disagreement is itself the finding (it would falsify the single-scalar-toll
model). Do not delete or supersede 92; its `B` is independently interesting
because `B` is what the *ranking pipeline* actually charges, whether or not it
matches the isolated measurement.

## What this settles

1. **The live factor-of-4 disagreement about Malorne 2pc.** Regression
   evidence puts `B` at ~116–133; SME domain reasoning puts it at 15–40
   (`.scratch/set-bonus-value/sme-review-2026-08-10.md` G4,
   `worn-set-double-count-trace.md`; summarised in ticket 92). **The same
   recipe applied to Malorne settles this** — take a reference set, equip two
   Malorne pieces vs two matched non-set items, difference. It is a second run
   of this ticket's method with a different set, not new work of a different
   kind. Note the Malorne pieces are ilvl 120 (29096 chest, 29100 shoulder,
   29097 hands, 29099 legs), so the reference set for that run must be a
   phase-appropriate one, not the P3 set — a P3 body with two ilvl-120 pieces
   bolted on measures the bonus on gear no Malorne wearer has. **Hypothesis,
   untested:** an energy-proc bonus like Malorne 2pc may itself scale with the
   host gear's haste/AP, which is exactly the scope limit below.

2. **Ticket 97's independent plausibility band.** Ticket 97
   (`97-no-independent-plausibility-band-for-set-bonus-magnitudes.md`) derives
   ~60–120 DPS (centre ~95) for the T6 4pc from game mechanics alone, and
   states its own purpose as a falsification test against 92's output. This
   ticket's figure tests it just as well and with fewer intermediate
   assumptions. If 99's 4pc lands inside ~60–120, both the mechanic reasoning
   and the measurement corroborate each other; if outside, one of them is
   wrong and 97's "Sourcing gap" section (the unverified hand-transcription in
   `verification.md` V1) is the first place to look.

## Can the engine do this today? Yes — a standalone script, no new plumbing

**Verdict: small script using existing internals. No new seam, no new port, no
production source change.** Two independent routes exist, and the second is
the cheaper one.

**Route A — TypeScript, reusing core.** `buildSetBonuses` already builds and
sims arbitrary synthetic equipment payloads. In `packages/core/src/rank.ts`
around lines 998–1015 it constructs `packageEquipment` by repeatedly applying
`equipmentForCandidateSwap`, then calls:

```ts
const packageRequest = compose(deps.raidSimSkeleton, {
  name: input.character.name.toLowerCase(),
  race,
  equipment: packageEquipment,
});
```

`compose` (`packages/core/src/compose.ts:21-42`) takes any `readonly
SimItemSpec[]` and patches it into the skeleton at
`raid.parties[0].players[0].equipment`. It does not care where the array came
from — nothing about it is derived from a player's log. `CliSimRunner.run`
(`packages/core/src/seams/cli-sim-runner.ts:35`) then spawns wowsimcli on that
request. So the path "arbitrary equipment array → RaidSimRequest → DPS"
already exists end to end; only `rankUpgrades`'s own entry point insists on a
character, and this experiment does not need to go through `rankUpgrades`.

Skeleton to pass as `raidSimSkeleton`:
`data/presets/feral/p2.raid-sim-skeleton.json` (the path `cli.ts:281-283`
loads). Binary via `pnpm fetch:wowsimcli`.

**Route B — Python, and the closer precedent.** `scripts/five_seed_spread.py`
already does exactly this shape of experiment: it loads a committed
RaidSimRequest, mutates only what it needs, spawns the pinned wowsimcli
directly, and writes results to `.scratch/`. Ticket 99 is the same script with
`equipment.items` mutated instead of `simOptions`. This avoids touching
`packages/core` entirely, which matters because this is an experiment, not a
feature.

**Route B is recommended.** Read `scripts/five_seed_spread.py` for the binary
resolution and result-parsing pattern; the only new logic is a list of
`(label, item-id substitutions)` pairs applied to
`vendor/wowsims/feral_p3_9p.gear.json`'s `items` array before composing.

**One caveat, hypothesis/untested:** the gear.json files are wowsims *gear-set*
exports, not RaidSimRequests. Whether they drop straight into the skeleton's
`raid.parties[0].players[0].equipment.items` unchanged, or need the same
`toProtoItem` normalisation `compose.ts:45-51` applies, has not been checked —
the shapes look compatible (`{id, enchant, gems}` with `{}` for empty), but
confirm before trusting the first sim's output. A cheap guard: sim the
unmodified reference set once and confirm the DPS is in the right ballpark for
a P3 feral before running the ladder.

## Scope limit — record this, it will be misread otherwise

**A bonus measured on a reference set is not the value it has for a given
player.** A proc that scales with attack power, haste, or crit is worth more on
better gear; a resource-throughput bonus is worth more or less depending on how
close the rotation already is to energy-capped. Two players with different gear
genuinely have different values for the same bonus, and this method deliberately
holds gear fixed.

So this measurement is **good for**:

- comparing two set bonuses to each other on a common footing (is the T6 4pc
  bigger than the T5 4pc?)
- sanity-checking whether a reported magnitude is physically plausible at all
  (feeds ticket 98's plausibility gate)
- falsifying model-derived corrections like ticket 92's `193.89 - k·B`

and it is **not good for**:

- predicting what a specific character gains from completing a set
- replacing the per-character measurement the ranking pipeline does
- being written into `set-value.ts` as a constant

If a reference figure is ever surfaced in a report or a gate, label it as
measured-on-reference-gear with the reference set named, so nobody reads it as
the truth for every character.


---

## Disposition (2026-08-10) — DONE, sims run

**Measured.** Route B as specified, script
`.scratch/set-bonus-value/measure_set_bonus.py`, raw output
`.scratch/set-bonus-value/sims/`, write-up
`.scratch/set-bonus-value/measurements-2026-08-10.md`. wowsimcli v0.0.101,
seeds `[11,22,33,44,55]`, 3000 iterations, reference
`vendor/wowsims/feral_p3_9p.gear.json`, skeleton
`data/presets/feral/p2.raid-sim-skeleton.json`.

```
pnpm fetch:wowsimcli
python .scratch/set-bonus-value/measure_set_bonus.py
```

| quantity | measured | engine reports |
|---|---|---|
| Thunderheart 4pc | **73.5 ± 6.3 DPS** | 193.89 |
| Thunderheart 2pc | **30.5 ± 5.5 DPS** | 31.46 |
| total set value | 104.0 ± 7.9 DPS | — |

Guard sim passed: unmodified A4 = 2441.74 DPS, inside the required 2000–2600
band, which also settles this ticket's open question about gear-injection shape
(the gear.json entries do drop in after `toProtoItem` normalisation).

### This ticket's own specified formula was wrong, and the run found it

The ladder as specified returns **negative** bonuses (4pc = −84.7), ~13 SE below
zero. Cause: each `S_*` single drops the set 4→3 and so **destroys the 4pc**,
meaning every single already contains the whole 4pc loss; summing four subtracts
it roughly four times. Fixed by adding four `R_*` arms that restore one tier
piece onto the all-B-side set (0→1 pieces, crossing no threshold), which price
stats cleanly. The `S_*` arms were still run and reported so the confound is
auditable rather than asserted.

**Cross-slot consistency check** (the sharpest available test — four independent
estimates of one quantity via `(A4 − S_x) − (R_x − A0)`): shoulder 68.21, chest
73.67, hands 72.35, legs 85.90; mean 75.03, sd 7.61 against ~5.2 DPS per-estimate
SE. Consistent with the 73.5 headline.

### Known defect, recorded rather than hidden

The legs B-side **32271 Kilt of Immortal Nature is a healer item** (Int +42,
HealingPower +118, MP5 +10, losing Str/Agi/hit). That is why `R_legs − A0` is
only 4.19 and why legs is the outlier slot. The selection step checked
`setName is None` but never "is this a melee item". A corrected re-run should
pick a melee legs replacement; excluding legs the other three slots agree at 71.4.

### Verdict against ticket 97's band

73.5 lands **inside** ticket 97's independently-derived 60–120 band (low side of
its ~95 centre), corroborating the mechanic reasoning and the measurement against
each other. The engine's 193.89 is ~2.6x the isolated figure.

The 2pc is the strongest single check: the engine measures it at **k=0**, where
the confound model predicts no inflation, and the isolated measurement agrees
within noise (30.5 ± 5.5 vs 31.46). Contamination loads onto the 4pc term, which
is where `computeSynergy` subtracts twice.

### Scope limit still applies

73.5 is the 4pc's value **on the `feral_p3_9p` reference set**, not for any
character. Do not write it into `set-value.ts` as a constant. Use it for
cross-set comparison, plausibility gating (ticket 98), and falsifying
model-derived corrections.

Item 1 of "What this settles" (measure Malorne the same way) was carried out
separately — see ticket 92.
