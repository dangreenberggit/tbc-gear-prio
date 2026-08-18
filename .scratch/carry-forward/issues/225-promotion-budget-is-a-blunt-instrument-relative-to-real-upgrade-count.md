Status: open
Type: task (design question raised by measurement; no known defect)
Origin: user challenge during the 2026-08-18 review of ticket 221 — "am I
  supposed to believe that 150 items provided a DPS increase... but that
  modest upgrades didn't make the list until it was expanded to 210? this is
  suspect. it should be suspect."
Blocks: none
Blocked by: none

# The screening ranking is unreliable exactly where `promoteTopK` cuts it

## The challenge, and why it is well aimed

Ticket 221 raised `DEFAULT_PROMOTE_TOP_K` from 150 to 210 because seven
above-cutoff rows were being screened out of the 398-candidate feral P3 pool.
That is a real measured miss and the fix is sound as far as it goes. The
challenge is aimed one level up: **the budget is a blunt instrument and its
size is now hard to justify from first principles.**

Numbers, all from the committed `feral-p3` fixture:

```
python -c "import json; r=json.load(open('packages/core/test/fixtures/synthetic-roster-recordings.json'))['rows']['feral-p3']; print(r['poolSize'], r['aboveCutoffCount'])"
# 398 86
```

- Eligible candidates: **398**
- Actually above cutoff (>= 3.6 DPS or >= 0.15%, `cutoff.ts:27` `CUTOFF_FERAL`): **86** = 21.6% of the pool
- Careful sims performed at K=210: **210** = 52.8% of the pool

So the tool full-sims **more than half the pool to find the fifth of it that
matters**. `promoteTopK` is not a count of upgrades and was never meant to be —
it is a budget for "how many of the screening ranking's top rows do we re-check
properly". But the gap between 210 and 86 is the measure of how imprecise the
screening ranking is, and it has grown.

## The cost, measured

From ticket 221's execution report, full sims / eligible at K=210:

| fixture | ratio |
| --- | --- |
| feral P2 (246 eligible) | **0.9837** |
| feral P3 (398 eligible) | 0.6457 |

On the P2 pool, racing now performs **98% of the work a full sweep would**.
The screening shortcut has very nearly stopped being a shortcut there. §6.4's
stated target was <= 0.4.

## The measured reason, which is sharper than "the budget is too big"

The user pressed the point that matters: if we re-check 150 candidates and a
genuine upgrade **still** misses the list, the ranking that produced those 150
is the problem, not its length. The fixture says exactly that.

Density around the cutoff, computed from the committed `feral-p3` recordings
(461 rows, 3,000-iteration truth):

```
rank  86:  1958.33 DPS   77 items within +/-1 screening SE
rank 150:  1950.44 DPS   86 items within +/-1 screening SE
rank 195:  1945.24 DPS   77 items within +/-1 screening SE
rank 210:  1943.18 DPS   75 items within +/-1 screening SE

gap rank 86 -> rank 150:  7.89 DPS = 1.54 x SE
gap rank 86 -> rank 210: 15.15 DPS = 2.95 x SE
```

Screening SE is **5.128 DPS** at 1,000 iterations (ticket 222, verified against
the fork source). Consecutive items near the cutoff differ by roughly **0.1
DPS**. So at any rank in this region, **~80 items are statistically tied**, and
the entire span from the last real upgrade (86) to the shipped budget (210) is
**under three noise-widths**.

**The screening ranking near the cutoff is close to meaningless.** Raising K
from 150 to 210 does not make it more accurate; it widens the net over a region
the measurement cannot order. That is why the fix worked empirically and why it
should not be trusted as a principle — the same noise that pushed an item past
150 can push one past 210, and only luck over 30 draws says otherwise.

## The cutoff is smaller than the noise that decides it

Worse, and this is the root:

```
feral cutoff (cutoff.ts:27 CUTOFF_FERAL.absDps):  3.6 DPS
screening SE at 1,000 iterations:                 5.128 DPS
```

The threshold for "is this an upgrade at all" is **smaller than the error bar of
the measurement used to screen against it**. Splitting the 86 above-cutoff rows
by that error bar:

```
clearly above cutoff (delta > cut + 1 SE):   45
within +/-1 SE of the cutoff (undecidable):  77
```

So "86 upgrades" is really **~45 solid upgrades and a large undecidable band**.
Screening cannot classify the band, at any budget, because the question is finer
than the instrument. Every figure in the two blocks above is reproduced by:

```
node .scratch/carry-forward/probes/225-cutoff-density.mjs
```

which reads only the committed fixture
(`packages/core/test/fixtures/synthetic-roster-recordings.json`).

## The question this ticket exists to answer

Not "what should K be" but **"should a rank budget be the mechanism at all"**,
given that the ranking it slices is unreliable exactly where it is sliced.

## Candidate directions (none chosen; that is the ticket's job)

1. **Promote by noise band rather than by rank budget.** Promote everything
   whose screening delta is within k * SE of the cutoff, plus everything clearly
   above it. Ties the budget to measured precision instead of a swept constant,
   and shrinks automatically when screening gets more precise.
2. **Two-stage screening.** Re-screen the marginal band at higher iterations
   before deciding, rather than promoting it all to full sims.
3. **Keep the rank budget but derive it** from the measured displacement bound
   and the count above cutoff, so it is a computed consequence rather than a
   swept constant.
4. **Accept and document** that the shortcut is only worthwhile on large pools,
   and skip screening entirely below some pool size — the P2 ratio of 0.98 says
   racing is close to pointless there already.

## Acceptance criteria

- [ ] A stated relationship between the promotion budget, the measured
      screening SE, and the observed rank displacement — so the budget's size
      has a reason, not just a sweep result.
- [ ] Either a rule that adapts to pool shape, or a recorded decision that the
      swept constant is the right tool with the re-measurement trigger written
      down.
- [ ] The recall gate (`racing.test.ts` 7.2 and 7.3) still passes at zero
      misses on both fixtures. **Never weaken the gate to make a cheaper rule
      look good** (candidate-pool.md §7).
- [ ] The full-sims/eligible ratio is reported for both fixtures under whatever
      rule is chosen, and the P2 ratio of 0.9837 is explicitly addressed —
      either improved or accepted with its reason.

## Out of scope

- Reverting ticket 221's K=210. The misses it fixed were real; this ticket asks
  for a better rule, not a return to a worse one.
- The presentation of screened rows — that is ticket 224.
