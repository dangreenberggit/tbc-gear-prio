Status: open
Type: task (design question raised by measurement; no known defect)
Origin: user challenge during the 2026-08-18 review of ticket 221 — "am I
  supposed to believe that 150 items provided a DPS increase... but that
  modest upgrades didn't make the list until it was expanded to 210? this is
  suspect. it should be suspect."
Blocks: none
Blocked by: none

# `promoteTopK` costs 53% of the pool to find the 22% that are upgrades

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

## The question this ticket exists to answer

Ticket 221 established empirically that K=210 gives zero misses over 30 seeded
noise draws, and that the zero-miss floor is 195. What it did **not** establish
is *why* 210 is enough, and that gap is the concern:

If screening noise (measured at ~5.13 DPS at 1,000 iterations, ticket 222) can
push a genuine upgrade from its true position past 150, what bounds the
displacement at 210? "It held across 30 draws" is evidence, not a mechanism. A
principled answer would relate the budget to the noise scale and the density of
candidates near the cutoff, rather than to a swept constant that must be
re-measured every time the pool changes shape.

Note the two known facts that make this tractable now, both from ticket 222:

- The screening SE at 1,000 iterations is **measured**, not extrapolated:
  5.128 DPS mean (min 2.36, max 6.08), and `SE = stdev/sqrt(n)` is verified
  against the fork source (`vendor/tbc-new-fork/sim/core/sim_concurrent.go:138`).
- Maximum observed rank displacement anywhere was **12** positions.

A displacement bound of ~12 does not obviously require a 60-row margin over the
86 real upgrades.

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
