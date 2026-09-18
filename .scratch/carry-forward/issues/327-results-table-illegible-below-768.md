Status: open
Type: bug
Origin: owner report, 2026-08-28 (third time raised)
Blocks: none
Blocked by: none

# Upgrades results table is illegible below 768px

Owner report, viewing a Feral Cat druid at ~653px: text in the results table
cells **goes vertical** (slot labels "Legs"/"Waist" render as stacked single
characters; "+58.7 DPS" breaks across several lines), some text is **cut off /
disappears**, and there are **huge vertical gaps** between rows despite the
cramped text. Owner: "basically a 0.5/10 on CSS fundamentals."

**This is the third time results-table legibility has been raised.** The layout
gate ticket 322 shipped (`test-layout.mjs`) passed without catching it because it
asserted structure (viewport overflow, control-group order, sticky, grid-column)
and **not cell legibility** — see ticket 329.

## Owner direction

Use **wowsims' native styling presumptively** — study how wowsims styles its own
results tables (the Bulk tab is the closest sibling) and reuse those patterns
rather than the from-scratch `.upgrades-*` SCSS. This takes research and direct
observation of the rendered result per component, not a code-only pass. The break
is **below 768px**; verify the fix there (375 / 653 / 767) and at a desktop width.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/_upgrades_tab.scss`
(and shared `_sim_tab.scss`); the results/shopping-list markup in
`upgrades_tab.tsx`. A diagnosis pass (2026-08-28) maps each defect to its
selector+property; the fix reuses native table styling. The environment CAN
drive narrow widths now (the browser pane's `resize_window` works this session),
so the fix must be verified by direct observation, not asserted.

## 2026-08-29 — styled, owner-checklist-pending (Execution B, layout subset)

State: **styled — awaiting owner sign-off on the rendered result.**

The fix already landed on this branch's fork before base SHA `43f460c` (fork
commit `f0c63af40` "Make the mobile results table legible below 768px"): the
from-scratch pared-column `table-layout: fixed` treatment that shattered cells
was replaced by the native content-table pattern — `table-layout: auto`,
`white-space: nowrap` on Slot/DPS, and an `overflow-x: auto` scroller on
`.upgrades-results` (`_upgrades_tab.scss:557-616`). This executor verified the
result at verified viewports rather than re-writing it.

Evidence (CDP, `window.innerWidth` read back at every capture — F3):

- `vendor/tbc-new-fork/test-layout.mjs` (the committed 322 layout gate) run
  green: **37 assertions pass at 375/653/768/1280** against a real 6-row WASM
  run. The char-by-char wrap is **refuted** — every Slot/DPS cell content height
  ≤ 1.5× line-height (no vertical letter-stacking); no clipped text under a
  hidden-overflow ancestor; the `.upgrades-results` scroller scrolls the
  407px-wide table inside its 319px panel at 375px instead of shattering; no
  outsized row gaps. Log:
  `.scratch/.../layout-evidence/` (see report; run
  `.scratch/.../layout-evidence/evidence-capture.mjs`).
- Screenshots at 375/653/767/1280, pre-run and post-run (with 88/85/54 landed
  rows): `.scratch/stage-gate/wowsims-tab-tickets/layout-evidence/prerun-*.png`,
  `postrun-*.png`, `ranking-stage-*.png`. `postrun-375.png` shows "Chest"/"Head"
  slot labels and "+22.0 DPS"/"-30.8 DPS" figures each on one horizontal line.

Closes on owner sign-off, not by this executor.

## 2026-09-18 — re-verified on the post-Chunk-1 fork tip (Chunk 3)

The styling landed by Execution B was re-proven on today's fork tip
`d754ac1b` (branch `feat/upgrades-tab`), which moved after the 2026-08-29
evidence was captured — Chunk 1 merged upstream `master` into the fork and the
tab `.tsx` was later touched by the WasmSimRunner→WorkerPoolSimRunner rename, so
the old screenshots no longer described the shipped code.

The fork layout gate `vendor/tbc-new-fork/test-layout.mjs` was re-run against a
fresh vite build with a real 5-row WASM ret run (30.4s) and **37 assertions pass
at 375 / 653 / 768 / 1280** (`{"outcome":"measured","passed":37,"failed":0}`).
The 327-specific assertions all pass on the current tip:

- `[375/653/768/1280] one-line cells: all Slot/DPS content heights <= 1.5x
  line-height (17.5px)` — the char-by-char vertical stacking is refuted.
- `[375/653/768/1280] no clipped text: no cell overflows its box under an
  overflow-hidden ancestor`.
- `[375] scroller ok: table 416 vs wrap 319, overflow-x auto` — the wide table
  scrolls inside the narrow panel instead of shattering.
- `[375/653/768/1280] row spacing: all rows <= 7x line-height, consecutive rows
  adjacent` — no outsized row gaps.

Verified by: `cd vendor/tbc-new-fork && node test-layout.mjs` (durable log at
`.scratch/stage-gate/chunk3-tab-layout-verify/evidence/test-layout-run.log`).
Status unchanged — closes on owner sign-off (Chunk 4 step 5).
