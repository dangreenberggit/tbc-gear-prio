Status: open
Type: task
Origin: docs/reviews/phase-3-web-shell.md (spec axis, Sp10)
Blocks: phase-4
Blocked by: none

# `GET /api/characters/...` returns fights in source order; the page re-sorts

## Problem

`apps/web/server/characters.ts` computes `mostRecent(fights)` only to choose
whose gear to pre-read, then returns `fights` in source order. The page's
`mostRecentFirst` (`apps/web/src/pages/Character.tsx`) is therefore
load-bearing, and the "most recent pre-selected" rule (PLAN.md §12, the
`/c/` route) lives in two places that can drift. The pre-merge fix pass left
it alone because making the server sort is a contract change.

## What to do

Have the server return fights most-recent-first (undated last) and state that
order in the response comment; drop the page's sort and rely on the contract.
One server test asserting the order; the page test that asserts the first
fight is pre-selected stays.

## Verify

`grep -n "mostRecent" apps/web/server/characters.ts apps/web/src/pages/Character.tsx`
