Status: open
Type: bug
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 467

# Net set-bonus value misses the lower threshold on a tier-set swap

Finding A2/D1. `set-value.ts:223-236`'s `brokenSetBonuses` reports only the
highest lost threshold per set (`.reverse().find(...)`), and `rank.ts`'s
vacate math (`n = wornX === t ? 2 : wornX - t + 1`, `B = wornX === t ? delta
- sumOwn : sumOwn - delta`) assumes only the target bonus is lost.

When the player wears a set's 4pc and a candidate/package breaks its 2pc
(vacating 3-4 pieces also breaks the 4pc), the measured B comes out as
`B2 − 2·B4` at worn=4 and `B2 + B4` at worn=5, and the lost B2 is never
subtracted on a 4pc-only report. This is the full-tier-set to next-tier
swap case (T4 4pc to T5 4pc, same slots), so the row ranks too high. Since
467 this changes the sort key, not just disclosure.

## What would close this

1. Report every lost threshold per set, not only the highest.
2. Measure each B against a vacate that breaks only that threshold (or
   solve the system for both).
3. A `packages/core/test/fork-set-net.test.ts` fixture with worn=4 and a
   2pc+4pc break asserting the exact net.
4. PROVENANCE cycle on the fork engine files, re-pin, `pnpm verify`.
