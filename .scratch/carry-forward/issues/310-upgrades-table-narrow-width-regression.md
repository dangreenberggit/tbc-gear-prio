Status: open
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

## Comments
