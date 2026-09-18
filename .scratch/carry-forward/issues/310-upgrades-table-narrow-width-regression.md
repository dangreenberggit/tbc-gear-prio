Status: resolved
Type: investigation
Origin: Chrome visual pass of the Upgrades tab, 2026-08-27 (branch `feat/upgrades-dedup-wowsims`, fork `342f6a74`)
Blocks: none
Blocked by: none

# The results table wraps character-by-character at narrow width, and the mobile rule that should prevent it appears not to fire

**This is an investigative ticket. The cause is not known.** Do not open with a
fix; the first deliverable is an explanation that survives measurement.

## Observed

A visual pass driving the user's real Chrome (screenshots, not DOM inspection)
found the Upgrades results table degrading at a narrow viewport. Reproduced
across **three** separate screenshots at different points in a run (7/504,
272/504, and after completion), so it is not a one-off render glitch:

- Header `Rank` renders stacked vertically as `R / a / n / k`; `Slot` as `Sl / ot`.
- `Main Hand` wraps to `Ma / in / Ha / nd`; `Waist` to `Wa / ist`.
- `+61.2 DPS` wraps to `+61. / 2 / DPS`.
- `Serpentshrine Cavern (N)` wraps to `Serpents / hrine / Cavern / (N)`.

The **Item** column (icon + name + BiS badge) stayed readable. The toolbar and
the disclosure controls reflowed correctly into stacked rows. The degradation is
confined to Slot / DPS / Source.

Measured viewport: **662px** (`window.innerWidth`).

## Why this is a contradiction, not just a bug

`ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` already carries a
mobile-only treatment written for exactly this failure — `table-layout: fixed`
with deliberate per-column widths, under `@include media-breakpoint-down(md)`.
Its comment records that an even Item/Source split was measured and rejected,
and that the columns were pared so Item could keep a majority share.

Bootstrap's default `md` is **768px** (`node_modules/bootstrap/scss/_variables.scss`).
662px is inside `media-breakpoint-down(md)`, so **that rule should have been
active and this should not have happened.**

Something in that chain is wrong, and reading the SCSS cannot say which.

## Candidate explanations — none confirmed, do not assume

1. The breakpoint is not firing at all in the running page (overridden
   `$grid-breakpoints`, a build that did not pick up the partial, specificity
   loss, or the rule not reaching the served bundle).
2. The rule fires, but the table's **container** is narrower than the viewport,
   so the fixed column widths are still too small for the content. The SCSS
   comment itself references a "319-361px column-panel container", which is far
   narrower than 662px — this is the explanation to test first.
3. The fixed column widths are correct at true phone width (~375px) but wrong at
   the intermediate ~662px, i.e. the fix covers one end of the range only.
4. The observation is an artifact of how the viewport was resized. See below.

## Known limits of the observation

- The agent **could not apply a true 375px viewport**. `resize_window` reported
  success but `window.innerWidth` stayed at 662 regardless of the width
  requested. So the behaviour at real phone width is **unknown**, and 662px may
  not be a width any real device reports.
- No screenshot was captured below 662px.
- Desktop was checked and is fine: columns well-proportioned, long two-line
  Source strings wrap inside their cells without breaking row height.

## Investigation round 1 (2026-08-27) — candidate 1 ruled out, bug unreproduced

A Chrome-driving investigation returned **one settled result and one serious
doubt**. It measured honestly and reported what it could not do, rather than
forcing a number.

**Candidate 1 is ruled out.** Walking `document.styleSheets` on the live page
found the mobile rule present in the served bundle, at the right selector,
inside the right media condition:

```
.upgrades-results-table { table-layout: fixed; width: 100%; }   media: (max-width: 767.98px)
.upgrades-results-table th, td { padding: var(--spacer-1); overflow-wrap: break-word; }   media: (max-width: 767.98px)
```

So the CSS is not missing, not mis-scoped, and did reach the bundle.

**The bug could not be reproduced, because the viewport could not be changed.**
`resize_window` was inert: 375px, 662px, 500px and 320px were all requested,
every call reported success, and `window.innerWidth` read back as **1755**
every time. That is a worse failure than the 662px ceiling this ticket already
recorded.

**Therefore candidate 4 is now the live one, and it undercuts the original
observation.** If the resize tool silently no-ops while reporting success, the
first pass's "662px" was plausibly not a viewport anyone set — just whatever the
window already was, which happened to fall inside `media-breakpoint-down(md)`
and so made the contradiction look sharp. The wrapping *was* seen in screenshots
(`R/a/n/k` stacked vertically is not imagination), but **the width label attached
to that observation is no longer trustworthy.**

Also measured, at the only verified width (1755px, desktop): computed
`table-layout` is `auto` (correct above `md`), `matchMedia('(max-width:
767.98px)').matches` is `false` (correct), and no ancestor of the table is
narrower than the viewport — the chain runs 1264px (table) → 1306px
(`.tab-panel-left`) → 1755px (body). This does **not** settle candidate 2, whose
claim is about the *mobile* layout, where `.tab-panel-left` restructures below
the `lg` breakpoint into `flex-direction: column; width: 100%`. That layout was
never rendered.

Note: grepping for the SCSS comment's "319-361px column-panel container" finds
only the comment itself — it records a prior measurement, not a fixed-width rule
that can be re-located in the CSS.

**Candidates 2 and 3 remain untestable** until the viewport problem is solved.

## What this needs next — the blocker is tooling, not analysis

The question cannot be answered by more source reading. It needs a **real narrow
viewport**, by one of:

- Chrome DevTools' own device-emulation panel (the `chrome-devtools` skill in
  this repo drives CDP directly and may not share the MCP resize defect).
- A manually resized browser window, driven or confirmed by the owner.
- A real device.

Whichever is used, **`window.innerWidth` must be read back**, not assumed from
the resize call succeeding. That is the trap this ticket has now hit twice.

## What would close this ticket

- A reproduction at a **verified** viewport width, with `window.innerWidth`
  read back rather than trusted from the resize call.
- The computed style of `.upgrades-results-table` at that width — is
  `table-layout` actually `fixed`, and what are the resolved column widths?
- The table container's measured width at that viewport, to settle candidate 2.
- A statement of which candidate above is true, with the measurement behind it.
- Only then: whether this is a regression against the "Unbreak the Upgrades tab
  on mobile" work (fork commit on this branch, `d7ea6319`) or a case that work
  never covered.

## Context

The tab lives in the gitignored fork checkout `vendor/tbc-new-fork`
(`feat/upgrades-tab`). The branch it was found on had just taken a formatting
pass over ten owned files (ticket 306) — formatting only, `tsc` green, and the
scss was **not** among the ten, so it is not a plausible cause. Recorded so the
next reader does not spend time on it.

## Investigation round 2 (2026-08-29) — REFUTED at verified viewports (Execution B)

The blocker this ticket named — "the viewport could not be changed" — is
resolved. CDP via `Emulation.setDeviceMetricsOverride` drives real viewports and
`window.innerWidth` reads back **equal to the requested width** at 375, 653, 767
and 1280 (F3 proof; `.scratch/.../layout-evidence/layout-evidence.json`
`cdpProof`). This is the reliable path the earlier `resize_window`-based passes
lacked.

**The char-by-char wrap does not reproduce at the current tip.** Measured with a
real WASM run (`vendor/tbc-new-fork/test-layout.mjs`, 37 assertions green at
375/653/768/1280):

- Computed `table-layout`: `auto` at every width (the mobile block sets it to
  `auto` deliberately, `_upgrades_tab.scss:562-564`) — NOT `fixed`.
- Slot and DPS cells: content height ≤ 1.5× line-height (17.5px) at every width.
  No `R/a/n/k` / `Wa/ist` / `+61./2/DPS` stacking.
- **Candidate 2 confirmed as the mechanism, now handled:** at 375px the table
  content is 407px inside a 319px `.upgrades-results` panel — the container IS
  narrower than the content, exactly as candidate 2 predicted. The current SCSS
  handles it by making `.upgrades-results` an `overflow-x: auto` scroller
  (`:557-560`), so the table scrolls horizontally rather than shattering per
  character. Candidates 1, 3, 4 are moot: the fix does not depend on fixed
  column widths at all.

**Cause of the original observation:** the branch it was filed on (`342f6a74`)
predates fork commit `f0c63af40` "Make the mobile results table legible below
768px", which replaced the fixed-column treatment with the native scroller. The
wrap was real on that older fork; it is fixed on the current tip (`5ed4436a8`).
Not a live regression.

Screenshots: `.scratch/stage-gate/wowsims-tab-tickets/layout-evidence/postrun-375.png`
(and 653/767/1280). State: **refuted / styled, owner-checklist-pending** —
closes on owner sign-off with 327.

## Comments

## 2026-09-18 — re-verified on the post-Chunk-1 fork tip (Chunk 3)

Re-proven on fork tip `d754ac1b` alongside 327. The narrow-width overflow
regression is refuted on the current tip: the layout gate's no-overflow
assertions pass at every width against a real WASM run —
`[375] widest right 368.0 <= innerWidth 375`, `[653] 646.0 <= 653`,
`[768] 761.0 <= 768`, `[1280] 1238.0 <= 1280` — and the 375px table is handled
by the `overflow-x: auto` scroller (`table 416 vs wrap 319`) rather than
crushed fixed columns. 37/37 assertions green at 375/653/768/1280.

Verified by: `cd vendor/tbc-new-fork && node test-layout.mjs` (log at
`.scratch/stage-gate/chunk3-tab-layout-verify/evidence/test-layout-run.log`).
Status unchanged — closes on owner sign-off with 327.

## 2026-09-18 — owner sign-off (resolved)

Owner viewed the results table at narrow width on the live tab: the table scrolls
sideways within its panel rather than overflowing/cutting off. The narrow-width
overflow regression is resolved. Remaining narrow-width polish (column alignment
and the BiS-tag crowding the owner saw) is a NEW mobile-legibility ticket, not
this overflow regression.

Verified by: owner observation on the live tab, 2026-09-18; no-overflow assertions
green in the 2026-09-18 re-verification note above.
