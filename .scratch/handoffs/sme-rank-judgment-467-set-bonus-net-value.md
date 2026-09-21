# SME rank judgment — ticket 467 (set-bonus net value on the Upgrades tab)

Stage-gate Step 9, SME (game-domain) seat. Audience: the engineering team.

## Verdict

**trust-with-caveats**

The two ON credit views produce game-defensible orderings for a feral cat
druid deciding what to chase, the OFF/ON honesty invariant holds (no ON cell is
less honest than its OFF cell — every loss stays itemised), the ~74 DPS
broken-Malorne-2pc loss is plausible for feral P5, and both flagged
observations (A worn-1 4pc, B worn-3 credit-control-enabled) are the correct
conservative/data-driven behaviour. The caveats are about **how the two views
should be read**, not about a wrong number — the full-set view is legitimately
optimistic and a player who reads it as a per-piece verdict will over-rank
low-own-delta set pieces. That is inherent to a "full credit on every row"
view, is disclosed in the tooltip, and is exactly what the split view corrects.

## What was reviewed

- Character: feral cat druid, phase 5, default packaged preset (4-piece
  Thunderheart Harness worn), real Go-backend sims at 3000 iters.
- Inputs judged (all read this session):
  - `.scratch/stage-gate/set-bonus-net-value-467/live-verify.md` (15-case
    identity table + the resolved B cross-check CORRECTION block).
  - Per-view scrapes read in full: `live/worn0.on_full.json`,
    `live/worn0.on_split.json`, `live/worn1.on_full.json`,
    `live/worn2.on_split.json`, `live/worn3.on_full.json`,
    `live/malorne2.off.json`, `live/malorne2.on_full.json`,
    `live/malorne2.on_split.json`.
  - Item stat lines read from `data/items/index.json` via
    `node -e` (command below).

Item identities confirmed from repo data (not recalled):

```
node -e 'const d=require("./data/items/index.json"); for(const id of [31039,31048,31042,31034,31044,29097,29099]){const x=d[id]; console.log(id,x.name,"slot",x.slot,"setId",x.setId,x.setName)}'
```

- 31039/31048/31042/31034/31044 = Thunderheart Cover/Pauldrons/Chestguard/
  Gauntlets/Leggings, all `setId 676 "Thunderheart Harness"`, feral leather
  (itemType 1/3/5/7/9 = head/shoulder/chest/hands/legs armor progression).
- 29097/29099 = Gauntlets/Greaves of Malorne, both `setId 640 "Malorne
  Harness"`, feral leather. Neutral fillers (34392/34906/34234/30898/34188)
  all carry `setId null`. All druid-equippable. The set membership and slots
  the model assumes are correct against repo data.

## Findings

| # | Finding | Severity | Evidence |
| --- | --- | --- | --- |
| 1 | ON is never less honest than OFF — every loss stays itemised. malorne2 Legs: OFF cell −28.0 already contains the −77.7 Malorne break (leg swap vacates the Malorne leg now); ON/full +136.5 still shows `breaks Malorne Harness 2pc: -77.7` in the tooltip and only adds the measured future credit (+65.4, +99.1). The gain, not a hidden loss, is what turns it positive. | none (design claim holds) | `malorne2.off.json` (Legs tipText `+49.7 / breaks ...: -77.7`) vs `malorne2.on_full.json` (Legs tipText same break line + `2pc +65.4 / 4pc +99.1`, ranked +136.5) |
| 2 | Break placement is game-correct and differs by row. Rows that displace a worn Malorne piece (Legs, Hands) show the break as immediate `breaks Malorne Harness 2pc: -77.7`; rows that do not (Chest, Shoulder, Head) show it deferred as `completing breaks Malorne Harness 2pc: -77.7`. This correctly distinguishes "you lose the 2pc the moment you equip this" from "you lose it only when you later finish the set". | none (correct) | `malorne2.on_full.json` / `malorne2.on_split.json` tooltips, all 5 rows |
| 3 | Full-set view credits the identical whole-set future on every contributing row, so ON/full ordering collapses to own-delta order and can rank a badly-itemized piece as an upgrade. worn0: Thunderheart Cover own −153.4 shows as **+15.8 / rank 24** in ON/full because it is credited the entire +169.3 set future; the same row is −86.9 / rank 286 in ON/split. | low (read-the-view caveat, disclosed) | `worn0.on_full.json` Head (+15.8, own −153.4) vs `worn0.on_split.json` Head (−86.9) |
| 4 | Split view is the per-piece-honest ordering and is game-defensible: each threshold's bonus ÷ its FULL piece count (2pc÷2, 4pc÷4), independent of how many are already worn. worn2 (2 worn, 4pc needs 2 more) credits `4pc, 2 more: +71.5 (share +17.9)` = 71.5÷4, not ÷2. A −70.9-own head correctly stays −53.0 and below cutoff. | none (correct) | `worn2.on_split.json` all rows; divisor is full 4 not remaining 2 |
| 5 | Malorne 2pc broken-value ~74 DPS is plausible for feral P5. `recalled, unverified`: Malorne Harness 2pc is a feral-cat offensive bonus (Shred damage/energy), a real DPS bonus, not tank/survivability. ~74 DPS on a ~2420 baseline ≈ 3%, a normal magnitude for a raid-tier feral 2pc. Engine 74.5 and independent real-sim 73.2 AGREE (Δ1.3, within SE). | none (plausible) | live-verify CORRECTION block (73.2 vs 74.5, 0-Thunderheart context); baseline 2418.9 in `malorne2.*.json` |
| 6 | Observation A (worn-1 does NOT credit the 4pc): game-correct conservative behaviour. At worn 1, adding a Thunderheart piece reaches worn 2 and activates the 2pc (shown inside deltaDps as `activates 2pc (included in this number)`); the 4pc future exists but its corrected value was not measurable at t−1, so it is credited 0 and the ON cell equals the OFF cell. Not crediting an unmeasured future is the honest outcome — better to under-credit than to show a made-up 4pc gain a player would chase. | none (correct) | `worn1.on_full.json` all rows: tooltip `Full set end state: +178.9` disclosed, but ranked total == own delta, no 4pc credit added |
| 7 | Observation B (worn-3 credit control ENABLED, plan expected disabled): game-correct on the real shared pool. Thunderheart rows themselves carry credit 0 at worn 3 (`activates 4pc (included in this number)`, full==split), but OTHER sets in the same pool (Malorne, Nordrassil, Band of Eternity) have splittable multi-piece potential, so the split/full control legitimately affects the list. Disabling it would wrongly hide the split option for those other sets. | none (correct; plan expectation was Thunderheart-only) | `worn3.on_full.json` (TH rows full==split, credit 0); live-verify note 2 (Mantle of Malorne full +191.4 vs split −17.2) |

## Rows that look fine

Every Thunderheart row across all 15 view-scrapes is internally consistent
(own delta + itemised credits/breaks == displayed total, and the `(ranked)`
line always equals the active cell). The near-zero own deltas at worn2 for
Chest/Shoulder (0.0) are game-plausible: those tier pieces are stat-neutral
against the P5 neutral fillers they replace, so the credit is the whole story
there. Source labels (Black Temple / Hyjal Summit) match the real drop sources
for these T6 feral pieces.

## Gate — would a feral who knows the game trust this output?

Yes, with the reading caveat. A feral cat player deciding what to chase is
served correctly by the **split** view as the default per-piece verdict, and by
the **full** view as "what the whole set is worth if I commit to all of it".
The one thing an engineer should be aware of: the full view will always float a
poorly-itemized set piece (e.g. the T6 head with a −153 own delta) up the list
because it hands that single row the entire set's future value. That is not a
bug — it is the definition of the full-credit view, it is disclosed in the
tooltip's `This piece alone` / `Full set end state` split, and the split view
is the corrective. As long as the UI does not present the full view as a
standalone per-item ranking without the split alongside it, the output is
trustworthy.

## Confidence caveats

- Item set membership, slots, and armor type are read from repo data
  (`data/items/index.json`) — high confidence.
- The Malorne 2pc **effect** (feral Shred bonus) is `recalled, unverified`. The
  claim I rely on for plausibility is only its magnitude class (a real feral
  offensive 2pc worth low-single-digit-percent DPS), which the two agreeing
  sim measurements support independently of my recall.
- I judged the game-facing rankings and tooltips only. I did not re-derive the
  engine's B internally; I accept the live-verify CORRECTION that resolved the
  earlier 58-vs-77.7 disagreement to 73.2-vs-74.5 AGREE, because its context
  argument (2-Thunderheart vs 0-Thunderheart worn) is sound and the 107 DPS
  baseline gap it cites is exactly two tier pieces.

## Contested

None. This verdict does not contradict any fact the ticket or plan states. The
live-verify's own Verdict line still reads "DISAGREE — POTENTIAL STOP" in the
body, but its top-of-file CORRECTION block supersedes that to AGREE; I judged
against the corrected figure as instructed and concur with it.
