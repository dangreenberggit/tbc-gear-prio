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

## What the fixture shows

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

Raising K from 150 to 210 did not make the ranking more accurate; it widened
the net over a region the measurement cannot order. The fix works empirically —
zero misses over 30 draws — but the sweep cannot say whether 210 has margin or
is one unlucky draw from failing.

**What is NOT established here:** whether any of this matters to output quality.
If the items packed near the cutoff are genuinely interchangeable — as ticket
222 found the trinkets to be — then a screen that cannot order them is behaving
correctly, and the only real defect is presenting them as if it had. Nobody has
looked at what those items actually are. That check is cheap and should come
before any redesign.

## The cutoff is smaller than the noise that decides it

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

So "86 upgrades" is **~45 solid upgrades plus 77 rows inside one error bar of
the line**. Screening cannot classify that band at any budget, because the
question is finer than the instrument. Whether the band deserves classifying is
the open question above. Every figure in the two blocks above is reproduced by:

```
node .scratch/carry-forward/probes/225-cutoff-density.mjs
```

which reads only the committed fixture
(`packages/core/test/fixtures/synthetic-roster-recordings.json`).

## The question this ticket exists to answer

**Nobody has ever stated what recall this system is buying, or at what
confidence.** `promoteTopK` was set by sweeping until the observed miss count
hit zero on 30 draws. That is a stopping rule, not a specification. It cannot
tell you whether 210 is generous or barely adequate, and it cannot survive a
change to the pool without another sweep.

The concrete question: **what fraction of genuinely above-cutoff items must
survive screening, with what probability, and what is the cheapest rule that
achieves it?** Until that target exists, every K is equally arbitrary.

## A caution: "use a noise band instead" is not automatically an improvement

The obvious alternative is to promote by measured noise rather than by rank
position. Tested against this fixture, it lands in the same place:

```
node .scratch/carry-forward/probes/225-cutoff-density.mjs   # density
```

promote if (delta >= cutoff + k*SE) or (|delta - cutoff| < k*SE):

```
  k=1  ->  122 of 398 promoted (30.7%)
  k=2  ->  166 of 398 (41.7%)
  k=3  ->  211 of 398 (53.0%)     <- K=210 promotes 210 (52.8%)
```

At k=3 the band rule is **the same rule with different notation**. Its value is
not that it promotes fewer items by magic; it is that `k` has a meaning
("how many error-widths of protection") where `210` has none, so the number
becomes arguable from a stated recall target instead of a sweep. Whether it is
also *cheaper* depends entirely on what k the target justifies — and k=1 at 122
items would be a genuine saving if 1 SE of protection is enough.

**Do not adopt the band rule on the grounds that it is more principled while
setting k by sweeping until misses hit zero.** That reproduces the original
problem with extra steps.

## Directions worth testing (none chosen; that is the ticket's job)

1. **State the recall target first**, then derive the rule. Without this, the
   rest is guessing.
2. **Two-stage screening.** Re-screen only the undecidable band at higher
   iterations, rather than promoting all of it to full sims. This is the one
   direction that attacks the root cause — the cutoff (3.6 DPS) being finer
   than the screening SE (5.128 DPS) — instead of budgeting around it. More
   iterations on 77 items is much cheaper than full sims on 124 extra ones.
3. **Skip screening entirely on small pools.** The P2 ratio of 0.9837 says
   racing is already close to pointless there; a pool-size threshold may beat
   any budget rule.
4. **Accept that items inside the cutoff's error bar are unclassifiable** and
   handle them as a declared band in the output rather than pretending the
   screen decided them. Relates to ticket 224.

## Acceptance criteria

- [ ] **First, the cheap check:** look at what the 77 items inside the cutoff's
      error bar actually are. If they are interchangeable in the way ticket
      222's trinkets were, this ticket may reduce to a presentation problem
      (ticket 224) and no budget redesign is warranted. Do this before anything
      below — it is one query against the fixture plus a look at the item list,
      and it decides whether the rest of this ticket is worth doing.
- [ ] **A stated recall target**: what fraction of above-cutoff items must
      survive screening, at what probability. This is the criterion everything
      else depends on, and it does not currently exist anywhere in the repo.
- [ ] The chosen rule's promoted-set size is a *consequence* of that target,
      derivable without sweeping. If a sweep is still used to set the final
      constant, say so plainly rather than presenting the result as principled.
- [ ] The band-rule equivalence above is addressed head on: any proposal must
      say why it is not K=210 in different notation (`k=3` promotes 211).
- [ ] The recall gate (`racing.test.ts` 7.2 and 7.3) still passes at zero
      misses on both fixtures. **Never weaken the gate to make a cheaper rule
      look good** (candidate-pool.md §7).
- [ ] The full-sims/eligible ratio is reported for both fixtures under whatever
      rule is chosen, and the P2 ratio of 0.9837 is explicitly addressed —
      either improved or accepted with its reason.
- [ ] Reproduce both probes and confirm their numbers still hold on whatever
      fixture is current:
      `node .scratch/carry-forward/probes/225-cutoff-density.mjs` and
      `node .scratch/carry-forward/probes/225-band-rule-comparison.mjs`.

## Out of scope

- Reverting ticket 221's K=210. The misses it fixed were real; this ticket asks
  for a better rule, not a return to a worse one.
- The presentation of screened rows — that is ticket 224.
