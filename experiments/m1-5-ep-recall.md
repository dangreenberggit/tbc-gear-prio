# M1.5 — EP-ordering recall on committed full-sweep fixtures

Command: `npx tsx scripts/m1_5_recall.mjs`

Calls the already-merged `orderCandidatesByEp`
(`packages/core/src/candidate-order.ts:52`) over each roster fixture's
eligible pool, and reads the measured 5,000-iteration `deltaDps` per
candidate from `experiments/e-w5-rank.json` (committed by slice B, produced
by `npx tsx scripts/ew5_rank.mjs`) rather than re-simming. Cutoff `{absDps:
3.4, pct: 0.15}` (F10) is used for both specs, matching §3.2; feral's own
`cutoffForSpec()` value (`{absDps: 3.6, pct: 0.15}`,
`packages/core/src/cutoff.ts:27`) is reported separately per fixture to
show whether it changes the conclusion.

**Seed provenance (inherited from section 3.2):** those deltas come from runs with
`seeds: [42]` — a single seed, which disables paired replication, so each row
carries independent SE (~1.68 DPS at 5,000 iterations, F10) rather than a
paired-replicate SE. Above-cutoff _membership_ is therefore noise-sensitive
for rows sitting within ~1 SE of the 3.4 DPS cutoff. This does not move the
conclusion below: the worst-ranked misses are 13-15 DPS cloaks and belts, far
outside that band.

This script writes only the data tables below. The "Interpretation"
section at the end of the committed `experiments/m1-5-ep-recall.md` is
hand-written judgment over these numbers — re-running this script
regenerates the tables above it but does not touch or regenerate that
section; re-add it by hand (or re-review it) after any re-run that changes
the numbers it cites.

## ret (eligible pool: 246)

### Cutoff {absDps: 3.4, pct: 0.15} (F10)

Above-cutoff rows: **13** (13 non-owned). Worst (highest) ordering rank among above-cutoff rows: **114**. Worst among non-owned above-cutoff rows: **114**.

#### Every above-cutoff row, by ordering rank

| ordering rank | item id | name                          | slot   | owned | deltaDps | deltaPct |
| ------------- | ------- | ----------------------------- | ------ | ----- | -------- | -------- |
| 2             | 30106   | Belt of One-Hundred Deaths    | waist  | no    | 47.54    | 2.372%   |
| 12            | 29997   | Band of the Ranger-General    | finger | no    | 7.51     | 0.374%   |
| 22            | 30738   | Ring of Reciprocity           | finger | no    | 3.73     | 0.186%   |
| 30            | 28485   | Bulwark of the Ancient Kings  | chest  | no    | 15.34    | 0.765%   |
| 77            | 30061   | Ancestral Ring of Conquest    | finger | no    | 10.34    | 0.516%   |
| 94            | 30098   | Razor-Scale Battlecloak       | back   | no    | 15.81    | 0.789%   |
| 96            | 28730   | Mithril Band of the Unscarred | finger | no    | 5.78     | 0.288%   |
| 98            | 29994   | Thalassian Wildercloak        | back   | no    | 14.31    | 0.714%   |
| 100           | 29177   | A'dal's Command               | finger | no    | 4.04     | 0.202%   |
| 102           | 30729   | Black-Iron Battlecloak        | back   | no    | 13.42    | 0.669%   |
| 109           | 33122   | Cloak of Darkness             | back   | no    | 14.42    | 0.720%   |
| 110           | 28777   | Cloak of the Pit Stalker      | back   | no    | 8.02     | 0.400%   |
| 114           | 24259   | Vengeance Wrap                | back   | no    | 13.06    | 0.651%   |

#### Top 5 by measured deltaDps, with their ordering rank

| measured rank | ordering rank | item id | name                         | slot  | owned | deltaDps |
| ------------- | ------------- | ------- | ---------------------------- | ----- | ----- | -------- |
| 1             | 2             | 30106   | Belt of One-Hundred Deaths   | waist | no    | 47.54    |
| 2             | 94            | 30098   | Razor-Scale Battlecloak      | back  | no    | 15.81    |
| 3             | 30            | 28485   | Bulwark of the Ancient Kings | chest | no    | 15.34    |
| 4             | 109           | 33122   | Cloak of Darkness            | back  | no    | 14.42    |
| 5             | 98            | 29994   | Thalassian Wildercloak       | back  | no    | 14.31    |

## feral (eligible pool: 246)

### Cutoff {absDps: 3.4, pct: 0.15} (F10)

Above-cutoff rows: **16** (16 non-owned). Worst (highest) ordering rank among above-cutoff rows: **96**. Worst among non-owned above-cutoff rows: **96**.

#### Every above-cutoff row, by ordering rank

| ordering rank | item id | name                          | slot    | owned | deltaDps | deltaPct |
| ------------- | ------- | ----------------------------- | ------- | ----- | -------- | -------- |
| 5             | 32014   | Merciless Gladiator's Maul    | weapon  | no    | 44.80    | 2.089%   |
| 8             | 29995   | Leggings of Murderous Intent  | legs    | no    | 23.27    | 1.085%   |
| 12            | 30627   | Tsunami Talisman              | trinket | no    | 6.20     | 0.289%   |
| 13            | 30106   | Belt of One-Hundred Deaths    | waist   | no    | 44.28    | 2.064%   |
| 18            | 30229   | Nordrassil Feral-Kilt         | legs    | no    | 17.81    | 0.830%   |
| 22            | 29994   | Thalassian Wildercloak        | back    | no    | 6.49     | 0.302%   |
| 25            | 30040   | Belt of Deep Shadow           | waist   | no    | 24.37    | 1.136%   |
| 50            | 30061   | Ancestral Ring of Conquest    | finger  | no    | 3.55     | 0.165%   |
| 58            | 30017   | Telonicus's Pendant of Mayhem | neck    | no    | 12.62    | 0.588%   |
| 65            | 28830   | Dragonspine Trophy            | trinket | no    | 5.46     | 0.255%   |
| 71            | 29119   | Haramad's Bargain             | neck    | no    | 5.83     | 0.272%   |
| 75            | 28745   | Mithril Chain of Heroism      | neck    | no    | 4.35     | 0.203%   |
| 76            | 29099   | Greaves of Malorne            | legs    | no    | 8.99     | 0.419%   |
| 93            | 30042   | Belt of Natural Power         | waist   | no    | 22.79    | 1.062%   |
| 95            | 28828   | Gronn-Stitched Girdle         | waist   | no    | 11.07    | 0.516%   |
| 96            | 28750   | Girdle of Treachery           | waist   | no    | 10.13    | 0.472%   |

#### Top 5 by measured deltaDps, with their ordering rank

| measured rank | ordering rank | item id | name                         | slot   | owned | deltaDps |
| ------------- | ------------- | ------- | ---------------------------- | ------ | ----- | -------- |
| 1             | 5             | 32014   | Merciless Gladiator's Maul   | weapon | no    | 44.80    |
| 2             | 13            | 30106   | Belt of One-Hundred Deaths   | waist  | no    | 44.28    |
| 3             | 25            | 30040   | Belt of Deep Shadow          | waist  | no    | 24.37    |
| 4             | 8             | 29995   | Leggings of Murderous Intent | legs   | no    | 23.27    |
| 5             | 93            | 30042   | Belt of Natural Power        | waist  | no    | 22.79    |

### Feral's own cutoff {absDps: 3.6, pct: 0.15} (`cutoffForSpec('feral')`)

Above-cutoff rows: **16** (16 non-owned). Worst (highest) ordering rank among above-cutoff rows: **96**. Worst among non-owned above-cutoff rows: **96**.

#### Every above-cutoff row, by ordering rank

| ordering rank | item id | name                          | slot    | owned | deltaDps | deltaPct |
| ------------- | ------- | ----------------------------- | ------- | ----- | -------- | -------- |
| 5             | 32014   | Merciless Gladiator's Maul    | weapon  | no    | 44.80    | 2.089%   |
| 8             | 29995   | Leggings of Murderous Intent  | legs    | no    | 23.27    | 1.085%   |
| 12            | 30627   | Tsunami Talisman              | trinket | no    | 6.20     | 0.289%   |
| 13            | 30106   | Belt of One-Hundred Deaths    | waist   | no    | 44.28    | 2.064%   |
| 18            | 30229   | Nordrassil Feral-Kilt         | legs    | no    | 17.81    | 0.830%   |
| 22            | 29994   | Thalassian Wildercloak        | back    | no    | 6.49     | 0.302%   |
| 25            | 30040   | Belt of Deep Shadow           | waist   | no    | 24.37    | 1.136%   |
| 50            | 30061   | Ancestral Ring of Conquest    | finger  | no    | 3.55     | 0.165%   |
| 58            | 30017   | Telonicus's Pendant of Mayhem | neck    | no    | 12.62    | 0.588%   |
| 65            | 28830   | Dragonspine Trophy            | trinket | no    | 5.46     | 0.255%   |
| 71            | 29119   | Haramad's Bargain             | neck    | no    | 5.83     | 0.272%   |
| 75            | 28745   | Mithril Chain of Heroism      | neck    | no    | 4.35     | 0.203%   |
| 76            | 29099   | Greaves of Malorne            | legs    | no    | 8.99     | 0.419%   |
| 93            | 30042   | Belt of Natural Power         | waist   | no    | 22.79    | 1.062%   |
| 95            | 28828   | Gronn-Stitched Girdle         | waist   | no    | 11.07    | 0.516%   |
| 96            | 28750   | Girdle of Treachery           | waist   | no    | 10.13    | 0.472%   |

#### Top 5 by measured deltaDps, with their ordering rank

| measured rank | ordering rank | item id | name                         | slot   | owned | deltaDps |
| ------------- | ------------- | ------- | ---------------------------- | ------ | ----- | -------- |
| 1             | 5             | 32014   | Merciless Gladiator's Maul   | weapon | no    | 44.80    |
| 2             | 13            | 30106   | Belt of One-Hundred Deaths   | waist  | no    | 44.28    |
| 3             | 25            | 30040   | Belt of Deep Shadow          | waist  | no    | 24.37    |
| 4             | 8             | 29995   | Leggings of Murderous Intent | legs   | no    | 23.27    |
| 5             | 93            | 30042   | Belt of Natural Power        | waist  | no    | 22.79    |

## Interpretation

**Is a pre-M2 cap default below "all eligible" safe? No.**

On both roster fixtures the worst (highest) ordering rank among above-cutoff
rows is far outside any plausible small cap default:

- **ret**: worst above-cutoff ordering rank **114** of 246 eligible
  (`Vengeance Wrap`, item 24259, back slot, +13.06 DPS / +0.651%). A cap of
  20, 25, or even 60 would drop this row — and 5 of the 13 above-cutoff rows
  (ranks 94, 96, 98, 100, 102, 109, 110, 114) sit past rank 90.
- **feral**: worst above-cutoff ordering rank **96** of 246 eligible
  (`Girdle of Treachery`, item 28750, waist slot, +10.13 DPS / +0.472%). Same
  picture: 6 of 16 above-cutoff rows sit at rank 65 or later.

Per §5.1.1, a sub-"all" cap default is safe only if the worst above-cutoff
rank is small on **every** fixture. It is not small on either fixture here —
114 and 96 are not "small" by any plausible cap default a UI control would
ship (e.g. 20–60), so **no cap default below "all eligible" is safe
pre-M2**. This does not soften: EP ordering, useful as it is for ranking
(E-W5 §3.2 measured Spearman rho ≥ 0.97 against the full 5,000-iteration
sweep at every sweep point), has poor recall as a **cap-membership**
predicate — a different question EP was never validated against before now.

**Why the miss, in one line:** EP ordering ranks candidates by raw stat
value against `epWeights`, pre-gem, blind to set bonuses, procs, on-use
effects and weapon speed (F9). Both fixtures' worst misses are cloak, ring,
neck and waist items whose value likely comes partly from those un-modeled
sources (e.g. proc trinkets, on-use waist items, set pieces) — EP
undervalues them relative to what the sim actually measures, so they sink
in the order despite being real upgrades.

**Owned rows:** neither fixture has any owned row above cutoff (both are
pre-raid/p1 preset characters being evaluated against phase-2 eligible
gear, so nothing worn is itself a phase-2 upgrade) — the owned-exemption
carve-out in §5.1.1 is not exercised by this data and the risk analysis
above is already entirely about non-owned rows (both `worstAboveCutoffRank`
and `worstAboveCutoffNonOwnedRank` are identical: 114 and 96).

**Consequence for M2.** Per §5a's second question ("how much M2 is worth"):
this result argues M2 is worth a great deal on the EP-recall axis — an EP
prefilter/cap would have hidden real upgrades ranked 90+ places below the
top on both fixtures. But E-W5 §3.2 already returned a **no-go on M2** for
an unrelated reason (racing does not pay for itself: `t_fixed` dominates
wall-clock, cost(100)/cost(5000) = 0.609 on ret against a 0.25 gate). So
the measurement that would justify M2 lines up with a plan that already
can't ship it under the current (Node/CLI) cost model. The practical
consequence is **M1's cap control should default to "all eligible"
candidates**, not a sub-"all" number, until either M2 ships on a cost model
where racing pays for itself, or a cheaper second filter is found.
