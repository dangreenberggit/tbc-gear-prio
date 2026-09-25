# Round 2c Step 7 measurements

Measured 2026-09-24 on the `:5173` dev server (vite, Node 22), fork
`bcbb5e741514701e9229b8e671d5b1736d310901`, fixtures from main `d1fd9039`.
Nothing in either tree was edited: Source widths, DPS column widths and tooltip
placements were changed in the page only (injected `<style>`, tippy
`setProps`).

- Scripts: `tools/measure.mjs` (this file's tables), `tools/mockup.mjs`
  (Step 8 figures marked "mock-up"), `tools/probe-arm.mjs`.
- Raw output: `measurements.json`, `mockups/mockups-*.json`.
- Root font size is 14px, so 1rem = 14px. The DPS column is 5.5rem = 77px at
  768 and 1280. Below 768 the table is `table-layout: auto` and the column
  grows (85â€“195px).

## 1. DPS figure in its cell, and the Slotâ€“DPS gap

Selector: every visible `tbody tr` of every `.upgrades-results-table` with the
below-cutoff group opened. The figure is a Range over `td:nth-child(4)`'s first
text node. The content box is the cell box minus padding. The gap is the
figure's left edge minus the right edge of the Slot cell's text.

Source width (7, 8, 11rem) changed none of these numbers, because the Slot and
DPS columns are fixed; only Item absorbs the Source change. "Set potential" ON
and OFF differ only in which rows overflow (row order changes), not in the
maxima.

| Fixture | Width | Rows | Rows whose figure leaves the cell | Worst overflow (right) | Min gap | Rows with gap < 8px |
| --- | --- | --- | --- | --- | --- | --- |
| feral-p3-nordrassil4 | 375, 653 | 338 | 0 | 0 | 7.0px | 2 |
| feral-p3-nordrassil4 | 768, 1280 | 338 | 110 OFF / 117 ON | 12.9px | 2.4px | 29 |
| feral-p3-th-hands-legs | 375, 653 | 338 | 0 | 0 | 7.0px | 7 |
| feral-p3-th-hands-legs | 768, 1280 | 338 | 112 OFF / 113 ON | 11.1px | 2.4px | 26 OFF / 27 ON |
| ret-p3-p2 | 375, 653 | 451 | 0 | 0 | 11.7px | 0 |
| ret-p3-p2 | 768, 1280 | 451 | 87 OFF / 85 ON | 9.3px | 2.4px | 31 OFF / 30 ON |

Widest figure per fixture (1280, Source 11rem), with and without " DPS":

| Fixture | Widest figure | Width | Without " DPS" | Width |
| --- | --- | --- | --- | --- |
| feral-p3-nordrassil4 | -400.8 DPS (Staff of Infinite Mysteries) | 89.9px | -400.8 | 55.1px |
| feral-p3-th-hands-legs | -204.4 DPS | 88.1px | -204.4 | 53.3px |
| ret-p3-p2 | -100.4 DPS | 86.3px | -100.4 | 51.5px |

The widest figure is found by pixel width, not by character count: in this
proportional font "-517.1 DPS" is narrower than "-400.8 DPS".

## 2. The two DPS-cell options (mock-up, feral-p3-nordrassil4, 338 rows)

"Bare" drops " DPS" from every figure (the column header already says DPS),
adds `padding-left: 0.5rem`, and sets the column to 6rem. "Widen" keeps " DPS"
and sets the column to the widest figure + 8px = 97.9px = 6.99rem. "Bare at
5.5rem" is the bare figure with the padding in today's 5.5rem column; it was
measured but not photographed.

| Option | Source | Width | Worst overflow | Min gap | Item names cut short |
| --- | --- | --- | --- | --- | --- |
| today | 8rem | 1280 | 12.9px | 2.4px | 37 |
| bare, 6rem | 8rem | 1280 | 0 | 33.4px | 55 |
| bare, 5.5rem | 8rem | 1280 | 0 | 26.4px | 37 |
| widen, 6.99rem | 8rem | 1280 | 0 | 12.4px | 84 |
| today | 11rem | 1280 | 12.9px | 2.4px | 150 |
| bare, 6rem | 11rem | 1280 | 0 | 33.4px | 172 |
| bare, 5.5rem | 11rem | 1280 | 0 | 26.4px | 150 |
| widen, 6.99rem | 11rem | 1280 | 0 | 12.4px | 209 |
| today / bare 6rem / bare 5.5rem / widen | 8rem | 768 | 12.9 / 0 / 0 / 0 | 2.4 / 33.4 / 26.4 / 12.4 | 2 / 2 / 2 / 2 |
| today / bare 6rem / bare 5.5rem / widen | 11rem | 768 | 12.9 / 0 / 0 / 0 | 2.4 / 33.4 / 26.4 / 12.4 | 6 / 6 / 6 / 9 |

Step 7's own truncation pass (`measure.mjs`, 1280, Source 11rem, figures left
as they are) gave: DPS column 5.5rem â†’ 150 / 146 / 211 names cut short
(nordrassil4 / th-hands-legs / ret-p3-p2), 6rem â†’ 172 / 168 / 241. Its
"widest + 8px" row used a 16px rem by mistake (6.12 / 6.00 / 5.89rem, about 1rem
too narrow); the mock-up's 6.99rem row above replaces it.

Plan prediction: "both pass the fit; widen costs more truncated names". Both
pass the fit at every width and Source width measured, and widen costs 59
more names than today at 1280/11rem (209 against 150). Bare at 6rem costs 22;
bare at 5.5rem costs none.

## 3. Tooltip placement (495)

Pass condition: the tooltip rect intersects no text rect of the Item, Slot,
DPS or Source cell of the row directly above or below the hovered row, at 768
and 1280; and it is fully on screen at 653 and 375. Popper flips `left` to
`bottom`/`top` when the room runs out. "Lines" counts distinct text-line tops
in today's hover.

Today's hover content (`measure.mjs`):

| Row (fixture) | Lines | 1280 top | 1280 left | 1280 left-start | 768 top | 768 left | 653 left | 375 left |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thunderheart Chestguard (th-hands-legs) | 2 | covers above Item, Slot, DPS, Source | clear | clear | covers above Slot, DPS, Source | clear | clear | clear |
| Justicar Crown (ret-p3-p2) | 2 | covers above Item, Slot, DPS, Source | clear | clear | covers above Slot, DPS, Source | clear | clear | clear |
| Breastplate of Malorne (th-hands-legs) | 3 | covers above Item, Slot, DPS, Source | clear | clear | covers above Slot, DPS, Source | clear | flips to bottom, covers the row below | flips to bottom, covers the row below |
| Crystalforge Greaves (ret-p3-p2) | 3 | covers above Slot, DPS, Source | clear | clear | covers above Slot, DPS, Source | clear | below Item, Slot | flips to bottom, covers the row below |
| Thunderheart Gauntlets (nordrassil4) | 4 | covers above Item, Slot, DPS, Source | clear | below Item, Slot | covers above Slot, DPS, Source | clear | below Item, Slot | flips to bottom, covers the row below |

Every tooltip was fully on screen at every width.

The proposed grouped hover (mock-up, Thunderheart Chestguard in
feral-p3-nordrassil4, 6 lines with 2 headings, 128.6px tall):

| Width | top | left | detail row |
| --- | --- | --- | --- |
| 1280 | covers above Item, Slot, DPS, Source | covers above and below Item and Slot; DPS and Source clear | no overlay (the rows below move down) |
| 768 | covers above Item, Slot, DPS, Source | covers above and below Item and Slot; DPS and Source clear | no overlay |
| 375 | covers above Item, Slot, DPS | flips to bottom, covers below Item, Slot, DPS | no overlay |

Prediction check. `top` fails everywhere: confirmed. "`left` passes only when
the tooltip is at most two lines and fails on three-line hovers": wrong for
today's hovers at 768 and 1280, where `left` stayed clear up to 4 lines (85px
tall), because a tooltip centred on a ~56px row spills only into the
neighbours' padding. It is right below 768: at 653 a 3-line hover already
touches the row below, and at 375 `left` flips to `bottom`. It is also right
for the proposed grouped hover, which is taller (6 lines, 129px): `left` then
covers the neighbours' Item and Slot text at 768 and 1280 but never their DPS
or Source. The detail row passes by construction. `left-start` is never better
than `left`.

## 4. Focus ring (499.2)

`measure.mjs`, first `td[tabindex]` focused with `focus({focusVisible: true})`:
`:focus-visible` matches; the cell draws the browser's own ring
(`outline-style: auto`, 1px, offset 0, colour rgb(16,16,16)); the row has no
outline. Mock-up with the row rule (`tr:has(> td[tabindex]:focus-visible)
{ outline: 2px solid var(--bs-link-color); outline-offset: -2px }` and the
cell's outline removed): the row computes `solid 2px`, the cell `none`, at 1280
and 768.

## 5. Other defects the fixtures show (not in this round's tickets)

- **Slot "Main Hand" wraps to two lines at 768 and 1280** (31.3px against a
  15.3px line; 16 cells in ret-p3-p2, 44 in feral-p3-p2bis). Below 768 it is
  one line (16px). This is why the first gate run with the fixture pass
  failed assertion (6) at 768 and 1280.
- **The "cleared by %-arm" sub-line (`.upgrades-cutoff-arm`) runs 110.9px
  past its DPS cell into Source at 768 and 1280** (2 rows in ret-p3-p2, e.g.
  Midnight Chestguard; see `mockups/494-I-lightbringer-1280.png`). Below 768 it
  fits (âˆ’3.5px). Gate assertion (11) checks only `.upgrades-set-bonus`
  sub-lines, so it cannot see this one.

## 6. SetContext literals for Step 9 (C36)

Read from the committed fixtures (main `d1fd9039`). `packages` is omitted: the
credit and the hover do not read it. Round 2b's figures match these to 0.1 for
F, D, I and C.

Scenario E (Stag-Helm of Malorne on the `cfg-E.json` gear) is not in any of the
five fixtures. 494-D below uses the row in the recorded fixtures with the same
structure: every future at or below the floor, one path break above it, no
positive running total. That is Nordrassil Chestplate in
feral-p3-th-hands-legs. (Stag-Helm of Malorne in that same fixture is shaped
like 494-A, not like E: its Malorne 2pc +55.8 is counted.)

### 494-A — Breastplate of Malorne (`feral-p3-th-hands-legs`)

scenario F: stop at 2, below-floor 4pc with a path break. Floor = sqrt(2) x cutoff.absDps 3.6 = 5.0912. `deltaDps` = 9.453784648271721.

```json
{
  "setId": 640,
  "setName": "Malorne Harness",
  "piecesWornBefore": 0,
  "piecesAfterSwap": 1,
  "nextThreshold": 2,
  "crossesThreshold": false,
  "futureBonuses": [
    {
      "threshold": 2,
      "piecesNeeded": 2,
      "dps": 55.76944836783514
    },
    {
      "threshold": 4,
      "piecesNeeded": 4,
      "dps": -31.835349694978504,
      "breaks": [
        {
          "setId": 676,
          "setName": "Thunderheart Harness",
          "threshold": 2,
          "dps": 106.24370861387797
        }
      ]
    }
  ],
  "commitBreaks": [
    {
      "setId": 676,
      "setName": "Thunderheart Harness",
      "threshold": 2,
      "dps": 106.24370861387797
    }
  ],
  "commitPackageDeltaDps": -195.2455900341347
}
```

### 494-B — Thunderheart Chestguard (`feral-p3-nordrassil4`)

scenario D: single break, finishing pays. Floor = sqrt(2) x cutoff.absDps 3.6 = 5.0912. `deltaDps` = -34.45656585230381.

```json
{
  "setId": 676,
  "setName": "Thunderheart Harness",
  "piecesWornBefore": 0,
  "piecesAfterSwap": 1,
  "nextThreshold": 2,
  "crossesThreshold": false,
  "singleBreaks": [
    {
      "setId": 641,
      "setName": "Nordrassil Harness",
      "threshold": 4,
      "dps": 47.187881439068406
    }
  ],
  "futureBonuses": [
    {
      "threshold": 2,
      "piecesNeeded": 2,
      "dps": 103.1285374662184
    },
    {
      "threshold": 4,
      "piecesNeeded": 4,
      "dps": 79.4277084181308
    }
  ],
  "commitPackageDeltaDps": 179.1493890900333
}
```

### 494-C — Lightbringer Breastplate (`ret-p3-p2`)

scenario I: every figure at or below the floor. Floor = sqrt(2) x cutoff.absDps 3.4 = 4.8083. `deltaDps` = 3.947966739203366.

```json
{
  "setId": 680,
  "setName": "Lightbringer Battlegear",
  "piecesWornBefore": 0,
  "piecesAfterSwap": 1,
  "nextThreshold": 2,
  "crossesThreshold": false,
  "futureBonuses": [
    {
      "threshold": 2,
      "piecesNeeded": 2,
      "dps": -3.1395415254401087
    },
    {
      "threshold": 4,
      "piecesNeeded": 4,
      "dps": -4.216874888146776
    }
  ],
  "commitPackageDeltaDps": -29.70266300438516
}
```

### 494-D — Nordrassil Chestplate (`feral-p3-th-hands-legs`)

scenario E shape (E itself was not recorded): Not counted only, below-floor 4pc with a path break. Floor = sqrt(2) x cutoff.absDps 3.6 = 5.0912. `deltaDps` = 16.776270683614985.

```json
{
  "setId": 641,
  "setName": "Nordrassil Harness",
  "piecesWornBefore": 0,
  "piecesAfterSwap": 1,
  "nextThreshold": 4,
  "crossesThreshold": false,
  "futureBonuses": [
    {
      "threshold": 4,
      "piecesNeeded": 4,
      "dps": -60.45729943014521,
      "breaks": [
        {
          "setId": 676,
          "setName": "Thunderheart Harness",
          "threshold": 2,
          "dps": 106.24370861387797
        }
      ]
    }
  ],
  "commitBreaks": [
    {
      "setId": 676,
      "setName": "Thunderheart Harness",
      "threshold": 2,
      "dps": 106.24370861387797
    }
  ],
  "commitPackageDeltaDps": -252.52668813879563
}
```

### 494-E — Nordrassil Chestplate (`feral-p2-malorne4`)

scenario C: single break, future never clears its break. Floor = sqrt(2) x cutoff.absDps 3.6 = 5.0912. `deltaDps` = -17.421577489680658.

```json
{
  "setId": 641,
  "setName": "Nordrassil Harness",
  "piecesWornBefore": 0,
  "piecesAfterSwap": 1,
  "nextThreshold": 4,
  "crossesThreshold": false,
  "singleBreaks": [
    {
      "setId": 640,
      "setName": "Malorne Harness",
      "threshold": 4,
      "dps": 22.857401253672833
    }
  ],
  "futureBonuses": [
    {
      "threshold": 4,
      "piecesNeeded": 4,
      "dps": 50.89141511488151,
      "breaks": [
        {
          "setId": 640,
          "setName": "Malorne Harness",
          "threshold": 2,
          "dps": 84.2835690558677
        }
      ]
    }
  ],
  "commitBreaks": [
    {
      "setId": 640,
      "setName": "Malorne Harness",
      "threshold": 2,
      "dps": 84.2835690558677
    }
  ],
  "commitPackageDeltaDps": -17.799267438721472
}
```

