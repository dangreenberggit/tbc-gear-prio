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
