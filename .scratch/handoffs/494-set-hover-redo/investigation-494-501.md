# Investigation: set-bonus hover content (494) and disabled-toggle reason (501)

Read-only investigation, 2026-09-24. Fork clone `vendor/tbc-new-fork` at 5e0093175 (feat/upgrades-tab).
Paths below are relative to `vendor/tbc-new-fork/` unless they start with `.scratch/` or `packages/`.

## 1. What the hover emits today

Builder: `ui/core/components/individual_sim_ui/upgrades_tab.tsx:3170` `setBonusPresentation(row, noiseFloorDps, on, _setCredit, deltaLabel)`.
(Note: the file is `individual_sim_ui/upgrades_tab.tsx`, not under `upgrades/`.)
Strings: `assets/locales/en/translation.json:905-914` (`upgrades_tab.set_bonus.*`).

Guard: no `setContext` → no sub-line, no hover (3177). `setBonusSubLine(ctx, on)` null → nothing (3192).

Lines, in emitted order:

| # | Key (translation.json line) | English | Condition | Source |
|---|---|---|---|---|
| 1 | `tip_activates_included` (907) | `activates {{threshold}}pc (included in this number)` | `ctx.crossesThreshold` | 3203-3210. No set name, no DPS figure, no floor check. |
| 2 | `tip_breaks` (908) | `breaks {{set}} {{threshold}}pc: -{{dps}}` | each `singleBreaks` entry with `dps` | 3211-3227. **No floor check** (prints even below the floor). |
| 2u | `tip_unmeasured` (909) | `breaks {{set}} {{threshold}}pc: value not measured` | each `singleBreaks` entry without `dps` | same loop |
| 3 | `tip_future` (910) | `{{threshold}}pc ({{have}}/{{threshold}}): +{{dps}}` | per `futureBonuses` entry, `dps > noiseFloorDps` | 3233-3247. `have` = `ctx.piecesWornBefore`. **No set name.** |
| 4 | `tip_future_break` (912) | `to reach {{threshold}}pc: breaks {{set}} {{broken}}pc: -{{dps}}` | each break of that future, `dps > floor`, not already printed (dedupe by `setId:threshold`) | 3248-3268. Printed even when the future's own line was hidden (below floor) — the Stag-Helm case. |
| 4u | `tip_unmeasured` | as above | future break without `dps` | 3252-3254 |
| 5u | `tip_unmeasured` | as above | `commitBreaks` entry without `dps`, not already printed | 3273-3278. Measured commit breaks are no longer printed (ticket 490). |
| 6 | `tip_package_total` (913) | `Full set end state: {{dps}}` | `ctx.commitPackageDeltaDps !== undefined` | 3281-3283, signed by `tipDelta` (368-380). **No floor check.** |

Unused key: `tip_break_on_complete` (911) is defined but no call site uses it.
Hidden entirely (ticket 471/#5): credit totals, full/split mode, "(ranked)". `deltaLabel` and `_setCredit` are unused (`void deltaLabel`, 3288).
The hover content does not depend on `on` (ticket 471/#4); only the sub-line does. So OFF and ON hover text are identical — the analyses record one block per row.

Sub-line (`engine/view.ts:209-221` `setBonusSubLine`): `null` if no singleBreaks, no crossesThreshold, no futures, no commitBreaks; else `not_counted` ("uncounted", 906) when `on && setCreditUnmeasured(ctx)`, else `hover_hint` ("set detail", 905). It does **not** apply the floor, so a row whose futures are all below the floor and whose only printable line is the package total still gets "set detail" (scenario I).

Credit (`engine/view.ts:240-275` `setPotentialCredit`, `295-302` `rankableSetPotential`): futures sorted by threshold; each future = floored value − floored breaks on its path not already charged; running total; **best-stop** keeps the largest positive running total (stop threshold t*). Split view uses the same stop point. `commitBreaks` measured values are not charged. Any unmeasured figure → credit 0 (`setCreditUnmeasured`, 192-202).

## 2. Data available to the hover

`SetContext` type: `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts:303-336`:
`setId, setName, piecesWornBefore, piecesAfterSwap, nextThreshold, crossesThreshold, singleBreaks?[{setId,setName,threshold,dps?}], futureBonuses?[{threshold, piecesNeeded, dps?, breaks?[{setId,setName,threshold,dps?}]}], commitBreaks?[{setId,setName,threshold,dps?}], commitPackageDeltaDps?, packages?[SetPackageContext]` (`SetPackageContext` 338-343: threshold, deltaDps, itemIds, piecesNeeded). Doc comment 281-302.

Can the hover know:
- **Set name of each future:** yes, indirectly. Futures carry no `setName`, but they are always the row's own set (built from `bonusesBySet.get(setId)`, rank.ts:2463), so `ctx.setName` names them. Break entries carry their own `setName`.
- **Which futures/breaks were counted (t\*):** not today. `setPotentialCredit` returns only a number. The same walk would have to return `{ credit, stopThreshold, counted: [...] , notCounted: [...] }` — a small pure-function change in view.ts; the builder should consume that rather than re-derive (same reason `setBonusSubLine` lives in view.ts, ticket 491).
- **Row credit value:** yes. The builder receives `noiseFloorDps` and `_setCredit`; `rankableSetPotential(row, noiseFloorDps, setCredit)` gives it. Not printed today.
- **Floor value:** yes, the `noiseFloorDps` parameter (≈4.81 ret / ≈5.09 feral per view.ts:283).

## 3. "Full set end state"

It prints `ctx.commitPackageDeltaDps`, set at rank.ts:2570-2587 to `topPackage.packageDeltaDps` — the measured DPS change of swapping in the **top measured package of the set** (the highest-threshold package, e.g. the best four Malorne pieces) versus the baseline. Despite the type comment ("with this candidate substituted", rank.ts:293-296), only the **breaks** use the substituted package (`substitutedPackageBreaks`); the **figure** is the unsubstituted package delta, so it is the same on every row of the set.

Scenario D (`.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/analysis-D.md:96-122`): all four Malorne rows print `Full set end state: +8.5`; Breastplate of Malorne credit ON−OFF = +108.0 (analysis-D.md:52). The +108.0 is the future terms only: 2pc +93.1 + 4pc +14.9, no path breaks charged (the Nordrassil 4pc break is the row's single break, already in OFF −54.5). The +8.5 instead sums four pieces' **own item-stat deltas** (each Malorne piece is ≈ −55 alone) plus both bonuses minus the Nordrassil 4pc loss, for a specific package of pieces that need not include this row's item. Different quantity, different item set; the two cannot agree except by chance.

Player meaning: weak. It answers "what if you swapped to the whole best package of this set at once", which is a different question from this row, is identical on every row of the set, and is not used by the credit since 490. A player cannot reconcile it with anything on screen. Recommendation: drop it from the hover. If the owner wants the whole-set answer, it belongs on a set-level surface (not per row), labelled with the package's pieces.

## 4. Disabled toggle (501)

`upgrades_tab.tsx:2031-2054` `refreshViewControlVisibility`: `hasRankable = items.some(i => hasRankableSetPotential(i, noiseFloorDps))`; `setEnabled(hasRankable, i18n.t('upgrades_tab.view.set_potential_unavailable'))`. String at translation.json:889: "None of these upgrades gain a set bonus." One reason for every disabled case.

Can the tab distinguish? Yes, from data already on the rows:
- (a) no row has any future above the floor: `!items.some(i => (i.setContext?.futureBonuses ?? []).some(f => f.dps !== undefined && f.dps > floor))`.
- (b) some row lists a future above the floor but every credit is 0 (never clears its breaks, or unmeasured).
- Optional (c): credit 0 because a figure was unmeasured (`setCreditUnmeasured`). Could fold into (b).
This choice should be a pure function in view.ts next to `setBonusSubLine`, returning a reason key.

## 5. Word-for-word rows (hover identical OFF and ON; analyses record the ON state)

(a) Scenario F — `.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/analysis-F.md:78-83`
**Breastplate of Malorne** (Chest), OFF `+9.5 DPS / set detail`, ON `+65.2 DPS / set detail` (credit +55.7, stop at 2pc)
```
2pc (0/2): +55.8
to reach 4pc: breaks Thunderheart Harness 2pc: -106.2
Full set end state: -195.2
```

(b) Scenario D — `analysis-D.md:75-80`
**Thunderheart Chestguard** (Chest), OFF `-34.5 DPS / set detail`, ON `+148.1 DPS / set detail` (credit +182.6, stop at 4pc)
```
breaks Nordrassil Harness 4pc: -47.2
2pc (0/2): +103.1
4pc (0/4): +79.4
Full set end state: +179.1
```
Also D Breastplate of Malorne (`analysis-D.md:96-101`), OFF `-54.5 DPS / set detail`, ON `+53.5 DPS / set detail`:
```
breaks Nordrassil Harness 4pc: -47.2
2pc (0/2): +93.1
4pc (0/4): +14.9
Full set end state: +8.5
```

(c) Scenario I — `analysis-I.md:79-82`
**Lightbringer Breastplate** (Chest), OFF `+3.9 DPS / set detail`, ON `+3.9 DPS / set detail`
```
Full set end state: -29.7
```

(d) Scenario E — `analysis-E.md:136-140`
**Stag-Helm of Malorne** (Head), OFF `-87.1 DPS / set detail`, ON `-87.1 DPS / set detail`
```
to reach 4pc: breaks Thunderheart Harness 2pc: -71.6
Full set end state: -247.7
```

(e) Scenario C — `analysis-C.md:81-87` (toggle disabled, so ON = OFF)
**Nordrassil Chestplate** (Chest), OFF `-17.4 DPS / set detail`, ON `-17.4 DPS / set detail`
```
breaks Malorne Harness 4pc: -22.9
4pc (0/4): +50.9
to reach 4pc: breaks Malorne Harness 2pc: -84.3
Full set end state: -17.8
```
And **Nordrassil Headdress** (`analysis-C.md:96-102`), OFF/ON `-189.3 DPS / set detail`:
```
4pc (0/4): +50.9
to reach 4pc: breaks Malorne Harness 4pc: -22.9
to reach 4pc: breaks Malorne Harness 2pc: -84.3
Full set end state: -17.8
```

## 6. Proposed rules

### Candidate A — flat list, every line names its set, closing summary line

Lines, in order:
1. Now (already inside the row's DPS):
   - `Activates {{set}} {{n}}pc — included in this DPS` (crossesThreshold).
   - `Breaks {{set}} {{n}}pc: −{{dps}} — included in this DPS` (each singleBreak; apply the floor like every other figure, or print "too small to matter" — decide once).
2. If you keep collecting (per future, threshold order, only if the future is above the floor):
   - `{{set}} {{n}}pc ({{have}}/{{n}} worn): +{{dps}}`
   - under it, each break on its path above the floor: `  needs breaking {{otherSet}} {{m}}pc: −{{dps}}`
   - A path break whose future is hidden (below floor) is **not** printed on its own. Instead one line: `{{set}} {{n}}pc: too small to count` followed by its breaks, or drop both (prefer dropping: the credit ignores that future's value, but it still charges its breaks only if a higher future is counted — so if no higher future, nothing on screen should mention it).
3. Unmeasured: `{{set}} {{n}}pc: break value not measured — set bonus not counted`.
4. Summary (always last, only when futures exist):
   - credit > 0: `Counted with Set potential: +{{credit}} (stops at {{set}} {{t*}}pc)` — needs view.ts to return t*.
   - credit 0, futures listed: `Not counted: no {{set}} bonus outweighs what it breaks.`
   - credit 0, unmeasured: `Not counted: a break could not be measured.`
5. "Full set end state": dropped (section 3).

Empty-hover rule: build the line list first; if it is empty (every figure at/below the floor, no activation, no measured-or-unmeasured break), show **no hover and no "set detail" sub-line**. The rule must live in view.ts (one function returns line descriptors; `setBonusSubLine` becomes "descriptors non-empty"), so the sub-line cannot drift from the hover again. Scenario I Lightbringer Breastplate would then show plain `+3.9 DPS`.

Scenario F Breastplate under A:
```
Malorne Harness 2pc (0/2 worn): +55.8
Counted with Set potential: +55.7 (stops at Malorne Harness 2pc)
```
(The 4pc line is below floor/not counted and its break would not print; if the owner wants the "why stop" visible, add `Malorne Harness 4pc: not counted — needs breaking Thunderheart Harness 2pc (−106.2)`.)
Scenario C Chestplate under A:
```
Breaks Malorne Harness 4pc: −22.9 — included in this DPS
Nordrassil Harness 4pc (0/4 worn): +50.9
  needs breaking Malorne Harness 2pc: −84.3
Not counted: no Nordrassil Harness bonus outweighs what it breaks.
```

Wins when: the owner reads line by line and wants each line to stand alone; minimal restructuring of the current builder.

### Candidate B — two groups: "In this DPS" / "Set potential adds" / "Not counted"

Three headed blocks, each line in exactly one:
- **In this DPS now:** activations and single breaks (figures already in the OFF number).
- **Set potential adds +{{credit}}:** the futures up to t* and their path breaks, each with set name; the header figure equals ON − OFF, so the block sums visibly to the row change.
- **Not counted:** futures past t* (with their breaks), futures below the floor, and unmeasured items, each with a short reason ("costs more than it gives", "too small", "not measured").
Hidden when all three blocks are empty; a block with no lines is omitted.

Scenario D Breastplate of Malorne:
```
In this DPS now
  Breaks Nordrassil Harness 4pc: −47.2
Set potential adds +108.0
  Malorne Harness 2pc (0/2 worn): +93.1
  Malorne Harness 4pc (0/4 worn): +14.9
```
Scenario F Breastplate:
```
Set potential adds +55.7
  Malorne Harness 2pc (0/2 worn): +55.8
Not counted
  Malorne Harness 4pc: needs breaking Thunderheart Harness 2pc (−106.2), costs more than it gives
```
Wins when: the owner's complaint is "I cannot tie these numbers to the row" — B makes the arithmetic visible (header = ON − OFF) and answers "why is this not counted" in place. Costs more: view.ts must return the counted/not-counted split (a richer return from the credit walk), and the tooltip gets headings (layout gate + visual pass). Also naturally answers 501 on each row.

Note on split credit: under the split view the header figure is the split total, while future lines show full values. B must print the split figures in the block or say "(split share)"; A's summary line just prints the credit.

### 501 reason copy (draft, owner to confirm)

- (a) No future bonus above the floor on any row: "None of these upgrades lead toward a set bonus big enough to count."
  (Keep the current "None of these upgrades gain a set bonus." if the owner prefers; it is true in this case.)
- (b) Futures listed but no credit: "Some upgrades lead toward a set bonus, but none is worth more than the bonus it breaks. Hover a row's set detail to see the figures."
- (c, optional) Unmeasured: "Set bonuses could not be counted: a bonus these upgrades break could not be measured."

## 7. Test coverage

`packages/core/test/fork-set-net.test.ts` (fork-gated; skips without the clone) already tests the pure view functions: `491-P` (`setCreditUnmeasured`, line 1183), `491-L` (sub-line follows zero rule, line 1215), 490-A/B/C credit rule cases (1086-1163). It imports the fork engine via `fork-engine-harness.js`.

The hover **text** is not testable today: line choice, floor gating, dedupe and ordering live inside `upgrades_tab.tsx` (JSX + `i18n.t`), which the core tests do not import. To make it testable, move line selection into a pure view.ts function returning descriptors (`{ key, params }[]`, plus the summary descriptor and the 501 reason key); unit-test those in fork-set-net.test.ts against the scenario figures above; the tab only maps descriptors to `i18n.t`. English strings themselves stay checked by the visual pass.

## Surprises

- `tip_break_on_complete` (translation.json:911) is dead.
- Single-break lines and the package total skip the noise floor; futures and path breaks apply it.
- The `SetContext` doc (rank.ts:293-296) implies the package total uses this candidate substituted; the code (rank.ts:2586) stores the unsubstituted top package delta, identical on every row of the set.
- The sub-line ignores the floor, which is why scenario I shows "set detail" over a hover containing only the package total.
