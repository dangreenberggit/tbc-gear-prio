Status: open
Type: investigation
Origin: combined 103/106 diagnostic loop, 2026-08-11 (`.scratch/set-bonus-value/loop-103-106/10-baseline-offset.md`)
Blocks: none
Blocked by: none

# Our engine sits ~1% below the wowsims web alpha, and the offset is arm-dependent

Carried out of ticket 103, which closed on its own terms. This is the one
quantity that loop left open, recorded so it is not re-derived from scratch.

## The measurement

Identical settings, identical gear, **byte-identical equipment payloads**
(17/17 slots verified in `10-baseline-offset.md`):

| arm | owner web (12500 iters) | our engine (3000×5) | offset | relative |
|---|---|---|---|---|
| baseline | 2245.60 (±73) | 2219.82 | **+25.78** | +1.161% |
| T6 package | 2343.77 (±75) | 2322.81 | **+20.96** | +0.902% |

Combined SE on the baseline offset 0.894, **z = 28.8** — overwhelmingly real.

**The offset is neither constant nor proportional**, and the difference between
the two rows (4.82 ± 1.27, z = 3.8) is exactly the package-delta residue ticket
103 could not close. So this is **one arm-dependent offset sampled twice**, not
two independent discrepancies.

Consequence worth stating plainly: it **does not cleanly cancel in deltas**.
Roughly 80% cancels, 20% does not. Treating it as a known constant that washes
out would be wrong on this data.

## What is ruled out

By measurement, in `10-baseline-offset.md`:

- **Inputs** — our payload is byte-identical to the owner's export, including
  the empty gloves socket `[0]` and the empty slot 15.
- **Item data** — 278827 and 278819 match wowhead's stat vectors exactly (ilvl,
  quality, agi, sta, AP, hit/armor).
- **Ring enchants 2929** — present and honored (−11.62 when removed), but
  **wrong-signed** to explain us reading lower.
- **`consumables.drumsId` double-drums and `target.canCrush`** — carried unpriced
  since iteration 06, now measured at **+0.00, bit-identical per seed**. Both
  leads closable.

Attributed: **~1.3 DPS** (iteration count 3000×5 → 12500; converged at 25000).

Unattributed: **~24.5 DPS (95%)**. Build drift is the residual **by elimination**
and is **hypothesis, not measurement** — the owner's web reports itself only as
"tbc new" / "alpha" with no version number, against our pinned wowsimcli
v0.0.101.

## What would settle it

Neither is obtainable from our side:

1. **The web build string.** Load-bearing now that inputs and item stats are both
   proven identical — it is the only remaining way to know whether we are even
   comparing the same engine.
2. **One more like-for-like web arm pair** touching neither neck/back nor a set
   bonus. Two points cannot distinguish "the offset shrinks with T6 4pc" from
   "the offset shrinks as DPS rises"; a third arm would.

## Why this is worth keeping open but not urgent

Nothing in the product is known to be wrong because of it — our figures reproduce
themselves exactly, and ticket 111 covers the one defect the loop actually found.
But we treat wowsims as the oracle, so a persistent ~1% disagreement of unknown
origin is a standing caveat on every absolute number we publish, and the
non-cancelling ~20% is a smaller but real caveat on deltas.
