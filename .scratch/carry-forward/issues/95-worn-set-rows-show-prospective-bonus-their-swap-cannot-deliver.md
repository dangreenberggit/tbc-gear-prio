Status: closed
Type: bug
Origin: worn-set double-count trace, 2026-08-10 (`.scratch/set-bonus-value/worn-set-double-count-trace.md`)
Blocks: none
Blocked by: none

# worn-set rows show prospective bonus their swap cannot deliver

`applySetContext` (`packages/core/src/rank.ts:1119-1152`) attaches
`prospectiveBonusDps` to rows for pieces the player **already wears**. The
`crossesThreshold` guard only covers the case where a swap *newly delivers*
a bonus that is already inside its own `deltaDps`; it does not cover the
already-worn case, where `piecesAfterSwap === piecesWornBefore` (re-equipping
an item you already have advances nothing).

```ts
const piecesAfterSwap = item.owned
  ? piecesWornBefore
  : piecesWornBefore + 1;
const crossesThreshold =
  thresholdBeforeSwap !== null && piecesAfterSwap >= thresholdBeforeSwap;
```

For `item.owned` rows, `piecesAfterSwap === piecesWornBefore` by
construction, so `crossesThreshold` can be `false` while the row still gets
`nextThreshold`/`prospectiveBonusDps` attached at line 1152.

## Consequence in the live artifact

Breastplate of Malorne (29096, chest) and Mantle of Malorne (29100,
shoulder) are the worn items — swapped for themselves, `deltaDps` is exactly
`0`. Both display Malorne 4pc potential that this swap does not advance:

| itemId | slot | deltaDps | weighted (×0.25) | full (×1) |
|---|---|---|---|---|
| 29096 | chest | 0.00 | +4.51 | +18.04 |
| 29100 | shoulder | 0.00 | +4.51 | +18.04 |

The 4pc requires the *other two* Malorne pieces (hands 29097, legs 29099);
re-equipping a piece already worn contributes nothing toward it.

**Scope: two rows, ~18 DPS max (full credit).** This does NOT explain the
~100 DPS uniform penalty seen on chest/shoulder candidates generally — that
is a separate, much larger question, see ticket 92.

## Suggested fix — untested, no test written

Gate on whether the swap advances the piece count, e.g. add
`piecesAfterSwap > piecesWornBefore` to the guard at `rank.ts:1149`, or
equivalently skip `item.owned` rows entirely. This is proposed reasoning
from the trace, not a verified patch — no test exists yet for this case.


---

## Disposition (2026-08-10) - FIXED, commit `d1c2c87`

`applySetContext` now gates `prospectiveBonusDps` on
`piecesAfterSwap > piecesWornBefore`. An owned row's swap leaves the piece count
where it found it, so it no longer advertises a threshold it cannot advance.
Breastplate of Malorne (29096) and Mantle of Malorne (29100) - `deltaDps` exactly
0 - stop showing +4.51 weighted / +18.04 full.

Test in `packages/core/test/rank.test.ts` (red first, failing with
`expected 40 to be undefined`): an owned set piece gets no `prospectiveBonusDps`
and `piecesAfterSwap === piecesWornBefore`, while a not-yet-worn piece of the
same set still does - proving the gate is about advancing the count, not about
set membership.
