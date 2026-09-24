Status: open
Type: task
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 467, 471

# Set-bonus tooltip piece count excludes the hovered piece

Finding D4/D5. `tip_future` renders `"{pc} ({have}/{pc})"` with
`have = threshold − piecesNeeded` = pieces worn BEFORE the hovered item,
so a player wearing 1 Thunderheart piece reads "4pc (1/4)" and expects
2/4. Separately, `tip_activates_included` passes `ctx.piecesAfterSwap` as
the threshold number, which only equals the threshold for the normal +1
step (`rank.ts:2205-2206`).

## What would close this

1. Count includes the hovered piece (or the copy says "1 worn + this").
2. Pass `thresholdBeforeSwap` instead of `piecesAfterSwap`.
3. Owner confirms the copy.
4. Re-pin.

## Comments

**2026-09-24 — fixed, awaiting owner copy confirmation (stage-gate
upgrades-tab-closeout round 1).** Fork
`2cb7da93241f4f733e150b5bf84e337eb798404c`, main re-pin
`f238f91d9163b9ffc9fed34f3ee4a5cdf2908b22`. `pnpm verify` rc=0. Layout
gate: real run, `passed:53 failed:0 a11yFailed:0` (a11yWarned 29). No
copy string, `translation.json`, schema or `upgrades/engine/` file
changed (`git -C vendor/tbc-new-fork diff --stat 5d84ffff9..HEAD --
ui/core/components/individual_sim_ui/upgrades/engine` is empty).

The two expressions, both in `upgrades_tab.tsx`:

1. `tip_future`: `have: f.threshold - f.piecesNeeded` (pieces worn
   before the hovered item) became `have: ctx.piecesAfterSwap`, which
   counts the hovered piece and is already `piecesWornBefore` when the
   item is owned (`rank.ts`: `piecesAfterSwap = item.owned ?
   piecesWornBefore : piecesWornBefore + 1`).
2. `tip_activates_included`: `threshold: ctx.piecesAfterSwap` became
   `nextMeasurableThreshold(ctx.setId, ctx.piecesWornBefore) ??
   ctx.piecesAfterSwap`, the same expression `rank.ts` uses for
   `thresholdBeforeSwap` in `crossesThreshold`. The `??` cannot fire
   while `crossesThreshold` is true. `nextMeasurableThreshold` is
   exported from `upgrades/engine/set-value.ts` and imported by the
   tab, so no engine edit was needed.

**Only the piece count is visible.** Change 2 gives the same number as
before whenever the activates line shows: the line shows only when the
item crosses a threshold, which needs an unowned item, so
`piecesAfterSwap = piecesWornBefore + 1`, and the threshold crossed is
the first implemented one above `piecesWornBefore`, which is that same
number. It removes a coincidence, not a visible bug.

Live look (headless Chrome, :5173 with :3333 up, feralcat, phase 3,
uncapped, settled "Took 174s", 1280×1400). The default feralcat gear
wears four Thunderheart (T6) pieces and no Malorne (T4) piece, so no
row shows a "(n/4)" line and none shows the activates line. The
Mantle of Malorne tooltip reads:

    breaks Thunderheart Harness 4pc: -76.9
    2pc (1/2): +65.6
    Full set end state: -324.6

"(1/2)" is zero Malorne pieces worn plus the hovered one. By the old
expression the same line would read "(0/2)" (derived from the code,
not observed). The ticket's example, one Thunderheart piece worn and
hovering a second reading "4pc (2/4)", was not reproduced because the
default gear already wears four.

Awaiting owner copy confirmation (Step 7); D4/D5 rows rewritten then.
