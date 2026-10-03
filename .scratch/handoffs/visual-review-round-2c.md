# Visual review: upgrades-tab-closeout round 2c

Seat: gate-visual (Opus). Read-only review of captured renders. No browser was driven.

- Capture directory: `.scratch/stage-gate/upgrades-tab-closeout/visual/round-2c/`
- `forkHead` (from `index.json`): `7ed8c99410ac836443c2e07ede9790f5439467d5`
- `forkDirty` (from `index.json`): `false`
- `index.json` `generatedAt`: `2026-09-25T15:56:54.302Z`
- `facts-495.json` `forkHead`: `7ed8c99410ac836443c2e07ede9790f5439467d5` (same build)
- Fixture: `feral-p3-p2bis` (recorded, not a live sim). Main repo pins this fork at `f6bc9087`.
- Out of scope, not judged: the tooltip's text and wording (494, 501), and the "cleared by %-arm" sub-line overflow (506).
- Ignored as instructed: `495-post-run-{1280,768}-{0,2}.png` and their `index.json` errors ("capture selector missing or zero-size: [data-tippy-root]"). The scratch hover captures `495-hover-*` replace them.

## Verdicts

| Ticket | Verdict | Evidence |
| --- | --- | --- |
| 499 | pass | `499-489-post-run-1280-0.png`, `-1280-1.png`, `-768-0.png`, `-768-1.png`, `-375-0.png`, `-375-1.png`; `facts.json` `499-489.{1280,768,375}.firstFigureCell` = `+47.7`; `facts-495.json` `dpsCell` |
| 489 | pass (judged at 1280 and 768; see advisory A1 for 375) | `facts.json` `499-489.1280.sourceCol.width` = 112, `499-489.768.sourceCol.width` = 112, `itemNameWhiteSpace` = `normal`; `499-489-post-run-1280-0.png`, `-1280-1.png`, `-768-1.png` |
| 495 | pass | `facts-495.json` (`placement`, `tip`, `cell`, `roomRight`, `onScreen`, `covers`); `495-hover-a-1280.png`, `495-hover-b-1280.png`, `495-hover-a-768.png`, `495-hover-b-768.png` |

## Evidence per ticket

### 499

- Bare signed figure, no " DPS": `facts.json` `499-489.{1280,768,375}.firstFigureCell` is `+47.7` at all three widths. Every figure in `499-489-post-run-1280-1.png` and `-768-1.png` (+43.3, +16.7, +14.7, +10.8, +8.7, +6.8, +4.7, +3.7) has no unit. `facts-495.json` `dpsCell` is `-11.6\nset detail` and `+3.7\nset detail`.
- Figure inside its column: `facts.json` 1280 `dpsCol` is 735.4-805.4 and `slotCol` ends at 735.4; the figures in `-1280-1.png` sit right-aligned inside that band, left of the Source text. Same at 768 (`dpsCol` 523-593) in `-768-1.png`, and at 375 (`dpsCol` 279.9-350.5) in `-375-1.png`. The executor's measurement (no figure leaves its cell on the five fixtures) agrees.
- Space between Slot text and figure: visible gap on every row in `-1280-1.png`, `-768-1.png` and `-375-1.png` (for example "Finger 1" and "+4.7"; "Main Hand" and "+47.7" in `-1280-0.png`). `facts.json` `dpsPadLeft` is 7px at 1280 and 768, 3.5px at 375. The executor measured Slot text to figure at 19.0px or more at 768 and 1280.
- "Main Hand" on one line: row 1 in `499-489-post-run-1280-0.png`, `-768-0.png` and `-375-0.png`.
- Set row's "set detail" clears the Slot text: row 9 (Thunderheart Gauntlets, "Hands" and "+3.7 / set detail") in `-1280-1.png`, `-768-1.png`, `-375-1.png`; row 34 (Thunderheart Leggings, "Legs" and "-11.6 / set detail") in `495-hover-a-1280.png` and `495-hover-a-768.png`.

### 489

- Source is 8rem: `facts.json` `499-489.1280.sourceCol.width` = 112 and `499-489.768.sourceCol.width` = 112 (8rem at a 14px root).
- Names wrap to at most two lines with BiS tags below, no "…": `itemNameWhiteSpace` = `normal` at all widths. In `-1280-1.png`, "Vindicator's Dragonhide Bracers" and "Band of the Eternal Champion" wrap to two lines with the "BiS 6% / BiS 9%" tags below. In `-768-1.png` every name is on one line with tags below. No name ends in "…" in any 1280 or 768 capture. The executor measured 0 names cut off.

### 495

- Right when there is room (1280): `facts-495.json` `1280 a` and `1280 b` `placement` = `right`; `roomRight` 474.6 is larger than `tipWidth` 341.1. The tip's left edge (815) is right of the hovered cell's right edge (805.4). See `495-hover-a-1280.png`, `495-hover-b-1280.png`.
- Above when there is not (768): `768 a` and `768 b` `placement` = `top`; `roomRight` 175 is smaller than `tipWidth` 341.1. See `495-hover-a-768.png`, `495-hover-b-768.png`.
- Covers no DPS figure when it opens to the right: `1280 a` `covers` = `above Source`, `this Source`, `below Source`; `1280 b` `covers` = `this Source`. No DPS entry. The PNGs agree: -11.2, -11.6, -12.2 (a) and +4.7, +3.7 (b) are all visible.
- Fully on screen: `onScreen` = true in all four entries. `1280` tip right edge 1156.1 is inside the 1280 viewport.
- At 768 the top placement covers the row above, including its DPS figure (`768 a/b` `covers` includes `above DPS`). The owner accepted this, and the acceptance sentence only forbids DPS cover for the right placement.

## Findings

### Blocking

None.

### Advisory

| # | Finding | Class | Evidence |
| --- | --- | --- | --- |
| A1 | At 375 the literal 489 sentence does not hold. Source is 81.3px, not 8rem, and two item names wrap to three lines: "Band of the / Eternal / Champion" (row 8) and "Vindicator's / Dragonhide / Bracers" (row 4). I judged 489 at 1280 and 768 because ticket 489's close condition and the owner's decision (`round-2c/owner-checkpoint-2.md`, "489") are both stated at 1280, and `round-2c/investigation-495-499.md` says the table is `table-layout: auto` at 375, so the colgroup width does not apply there. If the orchestrator holds 489 to 375 as well, this row becomes blocking and 489 is a fail. | advisory (scope call for the orchestrator) | `499-489-post-run-375-1.png`; `facts.json` `499-489.375.sourceCol.width` = 81.328125 |
| A2 | At 1280 the right-placed tooltip covers the action icons (star and swap) of the hovered row and its neighbours, and it extends over the left part of the right-hand sidebar panel. The acceptance sentence does not forbid this. | advisory | `495-hover-a-1280.png`, `495-hover-b-1280.png`; `facts-495.json` `1280 a.tip.right` = 1156.1 |
| A3 | At 768, `495-hover-a-768.png` shows the top-placed tooltip over parts of two rows above (row 32 "-11.1" and row 33), not one. `facts-495.json` `covers` only records "above". This is covered by the owner's acceptance of top-placement cover. | advisory | `495-hover-a-768.png`; `facts-495.json` `768 a.tip.top` = 327.4 |
| A4 | axe reports two violation rules in every state: `color-contrast` (serious, 9 nodes, the epic-colour item names such as "Vengeful Gladiator's Staff") and `label` (critical, 1 node, `.upgrades-export-area`). The executor's "0 a11y failures" is the layout gate's figure. I did not check whether the gate's ratchet baseline already lists these two, so this is not marked contested. | advisory | `a11y.json` |

## a11y counts per state

From `a11y.json` (axe violation rules; node counts in brackets).

| State | Violation rules | color-contrast (serious) | label (critical) |
| --- | --- | --- | --- |
| 499-489/1280 | 2 | 9 | 1 |
| 499-489/768 | 2 | 9 | 1 |
| 499-489/375 | 2 | 9 | 1 |
| 495/1280 | 2 | 9 | 1 |
| 495/768 | 2 | 9 | 1 |

The two 495 states in `a11y.json` come from the `pnpm tab-review` pass whose tooltip capture failed. The tooltip-open state has no a11y scan.

## Contested

None. My verdicts agree with the executor's stated measurements. A1 is a scope note, not a contradiction: the executor measured at 768 and 1280 only.
