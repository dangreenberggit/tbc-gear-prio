Status: resolved
Type: bug
Origin: docs/reviews/phase-1-five-seed-spread.md
Blocks: phase-1
Blocked by: none

# Candidate swaps sim with empty gems (no meta repair)

## Problem

`rankUpgrades` repairs meta on the **baseline** (`repairMeta` at
`packages/core/src/rank.ts` ~155) then swaps candidates via `swapItemAt`,
which hardcodes `gems: []` (~337) and never re-runs meta repair.

The Go sim does not enforce meta activation (PLAN.md §9; domain brief).
Socketed upgrades (measured: many of the 347 p3 universe rows) therefore
sim without gems; head/meta-contributor swaps can silently deactivate the
meta. ΔDPS is confidently wrong with no error.

Ticket `04-meta-activation-check` covered **baseline** repair only and is
resolved; this is the candidate half of the same PLAN §9 rule (“applied
identically to baseline and every candidate”).

## Done when

- Every candidate sim uses a gem fill (or an explicit disclosed empty-socket
  policy) and `repairMeta` after the swap, identical in spirit to baseline.
- Standing assumptions disclose any remaining gemming shortcut.
- Seam tests do not encode `gems: []` as the permanent expected contract
  without asserting the disclosed policy.

## Resolution (2026-07-28)

Stashed WIP was salvaged onto tip (`fillCandidateGems` + post-swap
`repairMeta`): commits `05ab947` / `fea34e8` / merge `ce69438`. Seam test
`gem-fills socketed candidates before simming` asserts filled gems.
`rg "gems: \\[\\]" packages/core/src/rank.ts` is clean.
