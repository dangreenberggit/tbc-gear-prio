Status: closed
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2, Gate C (visual seat finding, 2026-09-24)
Blocks: none
Blocked by: none
Related: 489, 467

# "hover for set detail" prints over the Source column

On set rows, the `upgrades-set-bonus` sub-line under the DPS figure ("hover
for set detail") runs into the Source column and prints over the Source text
at 1280px.

**Possible cause, untested:** Round 1's 489 change widened the Source column
from 7rem to 11rem (fork `49a1208fc6f7b8421bd80b17291037fbe1960c0b`), which
leaves less room for the DPS cell's sub-line.

## Evidence

Captures (gitignored) in `.scratch/stage-gate/upgrades-tab-closeout/round-2/`,
fork `371da7dce972ea8bf6267daadf9f20627f7e58bb`, width 1280:

- `feral-worn1-table-on.png`: every set row (1–10 and 12) overlaps; rows 10 and
  12 ("Serpentshrine Cavern") are the worst.
- `feral-worn0-table-on.png` rows 12 and 14; `feral-worn2-tip-Malorne-on.png`.
- Advisory, same area: long DPS figures touch the Slot text ("Shoulder+112.3
  DPS") in `feral-worn1-table-off.png` row 1 and `feral-worn0-table-off.png`
  row 8.
- Visual handoff `.scratch/handoffs/visual-review-467-round-2.md`, section
  "Findings".
- The layout gate passed on this source (53 passed, 0 failed), so no gate
  assertion covers this overlap.

## What would close this

1. Confirm or rule out 489 as the cause (render at 7rem and at 11rem).
2. A layout fix so the sub-line does not overlap Source at 375, 653, 768 and
   1280px, preferably with a layout-gate assertion for it.
3. Fork commit, re-pin, `pnpm verify` rc=0, a real layout gate run, and a
   gate-visual pass on a re-capture of `feral-worn1-table-on`.

## Comments

- 2026-09-24 (round 2b, Step 3): measured on the unedited tab, :5173,
  feralcat, "Set potential" ON, 15 rendered sub-lines per capture (15 more
  sit in hidden per-slot tab panes). Text measured with a Range over the
  `<small>`'s contents. Full table:
  `.scratch/stage-gate/upgrades-tab-closeout/round-2b/493-measurements.md`
  (gitignored).
  - The sub-line text is 127.1px wide at Source 7, 10 and 11rem alike, so
    **489 is not the cause**; it overprints at 7rem too.
  - At 768 and 1280 the DPS cell is 77px (5.5rem, `table-layout: fixed`):
    "hover for set detail" overflows by 50.1px and draws over the Source
    text on 15/15 rows. At 375 and 653 (`table-layout: auto`) the column
    grows to 134px and nothing overflows.
  - String widths: "hover for set detail" 127.1, "set bonus not counted"
    151.5, "set detail" 63.6, "not counted" 82.4, "detail" 39.0,
    "uncounted" 72.7 (px, same at every width).
  - Rule (plan Step 3): a string ships if it is ≤ 73px (cell − 4) at 768 and
    1280. "set detail" passes. "not counted" fails, so the one fallback was
    tried and "uncounted" passes (4.3px spare). Shipping `hover_hint` = "set
    detail", `not_counted` = "uncounted", awaiting owner copy confirmation.
  - Widen price at 1280: item names cut short go from 166/338 today to
    315/338 (DPS at 127.1px) or 334/338 (151.5px).
- 2026-09-24 (round 2b, Step 8): **closed.** Fork
  `7b7f2da281dd9ddc00faa4c216ff539ca40b2fe6`, re-pinned in main `f72f1a6b`
  (tip pin `cf51f4f4`, fork `5e0093175`). Shipped strings, awaiting owner
  copy confirmation: `hover_hint` "set detail" (63.6px), `not_counted`
  "uncounted" (72.7px; "not counted" was 82.4px and failed the rule), in a
  77px DPS cell. The DPS column width is unchanged, so the fix holds at 10
  and 11rem Source alike: the cell is fixed at ≥ md whatever Source gets.
  Widening DPS instead would cut short 315–334 of 338 item names at 1280
  (166 today).
  - No-overlap evidence (Step 4 probe, headless Chrome on :5173, fork
    `f6355d529`, feralcat worn Thunderheart 2, "Set potential" ON): 15
    rendered sub-lines per capture, at 1280/768/653/375 × Source 7/10/11rem.
    Largest text overflow past the cell: 0px at 1280 and 768, −3.5px at 653
    and 375; largest `scrollWidth − clientWidth`: 0 / −7. Data:
    `.scratch/stage-gate/upgrades-tab-closeout/round-2b/feral-worn2.json`
    (`probe493`, gitignored).
  - `test-layout.mjs` assertion (11) checks every rendered sub-line. In both
    real gate runs this round (on `f6355d529` and `5e0093175`,
    `{"outcome":"measured","passed":57,"failed":0,"a11yFailed":0,"a11yWarned":29}`)
    it found **0 sub-lines** at every width: the gate measures the ret page
    after 6 rows land, before any set row. It passed vacuously there, so
    493's evidence is the probe above alone (amendment N6); Gate C accepts
    or reopens.
