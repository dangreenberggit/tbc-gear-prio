Status: open
Type: task (measurement gap + SME judgment; no known defect)
Origin: user question during the 2026-08-18 feral Phase 3 review — "if it ends
  up screening out, for example, basically all the upgrades in a certain slot,
  that's kind of a case of overscreening. im not sure how. requires
  investigation plus SME review"
Blocks: none
Blocked by: none (a feral P3 run already exists — ticket 219's; this ticket
  needs a re-sim of one slot, not a new full-sweep recording)

# Within-slot ordering below the argmax is ordered by screening noise, and nothing measures it

## The concern as raised

A slot whose upgrades are all small can lose "basically all" of its candidates
to screening. The user named this **overscreening** and asked for investigation
plus SME review. This ticket is that investigation.

## The mechanism, verified against source at 70174a0

`DEFAULT_PROMOTE_TOP_J = 1` (`packages/core/src/promotion.ts:32`). The per-slot
floor in `promotionRule()` (`packages/core/src/promotion.ts:126-137`) sorts each
slot's screening results and takes `bucket.slice(0, j)` — at j=1 that is
**exactly one candidate per slot: the slot's screening argmax**.

So for a slot with no representation in the global top-`promoteTopK`, exactly
one candidate reaches a full-iteration sim. Every other candidate in that slot
is finished as a `screened` row, and its `deltaDps` is its **screening**
observation at `DEFAULT_SCREEN_ITERATIONS = 1000`
(`packages/core/src/promotion.ts:19`).

Those rows are not deleted, and this is the part that makes the concern sharp.
`rank.ts:1381-1398` builds a `RankedItem` for each one carrying the screening
delta; `rank.ts:1558-1562` sorts screened rows after every full-iteration row
and **orders them against each other by `b.deltaDps - a.deltaDps`** — that is,
by screening delta. `rank.ts:1576-1579` sets `rank: null` on them.
`view.ts:328-335` reproduces the same partition in the view, and
`view.ts:239-248` assigns tie groups within the screened partition separately.

**So the product does present an ordering among screened-out rows**, and inside
a slot that kept only its argmax, that ordering is 1,000-iteration screening
noise. The rows are visually distinguished — `rank: null`, sorted below
everything simmed, their own tie groups — but they are ordered, and a reader
sees a list.

Where the user's framing needed correcting: the concern is **not** that these
candidates vanish. They do not. It is that positions 2..n inside such a slot are
ordered on a quantity nobody has bounded.

## What is already measured, and what it does not cover

The 7.2 recall gate (`packages/core/test/racing.test.ts:204-251`) is a **set
membership** assertion and nothing else. Read the loop: it builds
`aboveCutoffIds` and `top5Ids` from the full-sweep truth, then for each of 30
noise draws collects `screenedOutIds` and asserts

```
expect(misses).toEqual([]);
expect(top5Misses).toEqual([]);
```

Both arrays are populated only by `screenedOutIds.has(itemId)`. **No ordering,
rank, or delta is compared anywhere in the test.** A run in which every
above-cutoff row is promoted but the screened remainder is shuffled into a
random order passes 7.2 unchanged. Verify by reading the test, or re-run it:

```
npx vitest run packages/core/test/racing.test.ts -t 7.2
```

The `promoteTopJ` table in `rank.ts:188-195` has the same limitation. Its
`misses` column is 7.2's miss count and its `ratio` column is
`measure-racing-ratio.ts`'s cost ratio. The row that reads j=5 at K=150 raising
the ratio 0.7146 → 0.7232 at 0 misses is therefore saying **"a deeper floor
costs more sims and recalls no additional above-cutoff row"** — it says nothing
about whether the ordering within a slot improved, because recall is a metric
over a set. A slot's argmax being correct is fully compatible with positions
2..n inside that slot being unreliable. **Nothing in the repo measures
within-slot ordering.**

Noise magnitude, for scale. `promotion.ts:1-8`'s header records F10's only
observable SE as **~6.8 DPS at 300 iterations**, and cites that magnitude as the
reason promotion is rank-based rather than SE-based. **No equivalent figure at
1,000 iterations is recorded anywhere in this repo** — searched
`packages/core/src`, `docs/`, and `.scratch/`; the 1,000-iteration references
that exist are cost/throughput, not SE. Under the usual `1/sqrt(n)` scaling the
1,000-iteration SE would be around 3.7 DPS (**untested extrapolation, not a
measurement**), which is the same order of magnitude as the user's "5 DPS"
intuition. That coincidence is the reason this is worth measuring rather than
dismissing.

## What this is not — distinguished from ticket 221

`.scratch/carry-forward/issues/221-screening-recall-unmeasured-at-p3-pool-size.md`
asks whether the **zero-miss recall result**, measured at 246 eligible, still
holds at the 398 eligible that ships. That is a question about the **global
top-K budget** and how its fixed absolute size interacts with pool growth. Its
metric is recall — set membership — and its blocker is a maxPhase 3 full-sweep
recording that does not exist.

This ticket is about **per-slot promotion depth (j=1)** and is **independent of
pool size**. Even if 221 comes back with zero misses at 398, and even if the
pool shrank back to 246, j=1 would still promote exactly one candidate from an
unrepresented slot and still leave that slot's remaining ordering resting on
screening noise. 221 asks *are the right items promoted*; this asks *is the
ordering we show among the un-promoted ones meaningful*. Neither subsumes the
other, and both would be closed by different measurements.

Related but distinct in the other direction: the per-slot floor's existence is
already justified (`rank.ts:171-181`, M1.5's clustered-miss measurement). This
ticket does not question whether the floor should exist. It questions the
**depth** and, separately, whether shipping an ordering below the floor is
defensible at all.

## The investigation

**Step 1 — pick a real slot.** From a real feral P3 run, find a slot whose
candidates are all outside the global top-K, i.e. a slot where exactly one row
is promoted by the floor and the rest are `screened` rows. Ticket 219's recorded
run is the concrete example to look in: 398 eligible, all screened, **199
promoted** to full sims
(`.scratch/carry-forward/issues/219-full-pool-acceptance-run-for-ticket-212.md`,
"Candidates" row). 199 exceeds K=150, so roughly 49 promotions came from the
floor, set packages, and owned items combined — the floor-only slots are in
there. **Untested:** whether ticket 219's run artifact was saved in a form that
lets a slot be picked out post hoc; if not, the run must be repeated with the
ranking JSON kept.

**Step 2 — establish that slot's true ordering.** Re-sim that one slot's full
candidate list at the shipped full iterations and record the resulting order.

**Step 3 — compare.** Set the true ordering against the screening ordering the
tab shipped for the same rows. Report rank correlation and, more usefully, the
count of adjacent inversions and the maximum displacement of any row.

**Cost, honestly.** Full-iteration sims are the expensive stage: ticket 219's
comparable feral P3 run took **2,724 s (45.4 min)** for 398 screens plus 199
full sims. Step 2 is bounded to one slot's candidates rather than the whole
pool, so it should be a small fraction of that, but the figure is the honest
anchor for what "re-sim at full iterations" costs here. Recording a 1,000-
iteration SE alongside (repeat screening on one candidate across seeds and take
the sd) is cheap and would settle the noise-magnitude question on its own, even
if the ordering comparison is deferred.

**No default change is proposed by this ticket.** Raising
`DEFAULT_PROMOTE_TOP_J` is one possible outcome and not the presumed one — the
`rank.ts` table shows j=5 at the shipped K costs ratio (0.7146 → 0.7232) and
buys no recall on the gating fixture. Other outcomes are equally open: the
measurement may show the within-slot ordering is fine; or the right fix may be
presentational (stop implying an order among screened rows, or disclose the
screening iteration count in the UI); or the answer may be that the current
behaviour is acceptable and should be written down as a decision.

## SME review

The measurement above answers "is the ordering noise-driven". It does not answer
"is shipping it acceptable". That is a game-domain judgment and is why the user
asked for SME review as well as investigation.

Run the `sme-rank-review` skill (`.claude/skills/sme-rank-review/SKILL.md`) —
audience is the **engineering team**, gate and bugs, not player loot advice — on
a real feral P3 ranking, with the specific question: **is it defensible to show
a user a ranked list within a slot where every position below the first is
ordered by 1,000-iteration screening noise?** Sub-questions worth putting to it:

- Does the current presentation (`rank: null`, sorted below all simmed rows,
  separate tie groups) do enough to stop a reader treating those positions as
  a ranking?
- For a near-BiS slot specifically — the M1.5 clustering case the floor was
  built for — does the shipped output mislead about which of several close
  pieces to chase?
- Is there a game-domain reason to believe within-slot screening order is
  *approximately* right despite the noise (e.g. deltas within a slot are
  strongly stat-driven and monotone in item level), which would make the
  measurement's inversion count less alarming than it reads?

## Findings (2026-08-18)

All figures below come from one committed, deterministic script:

```
npx tsx packages/core/test/measure-within-slot-ordering.ts
```

It runs fully offline against the ticket-221 feral Phase 3 recording
(`packages/core/test/fixtures/synthetic-roster-recordings.json`, 461
recordings, 398 eligible, 3,000 iterations, seed 42, simVersion v0.0.101) --
no new sims. Two consecutive runs produce identical output.

### What is real and what is modelled

The **truth side is real**: recorded 3,000-iteration sims of every eligible
candidate, plus each candidate's real measured variance. The **screening side
is a model** -- `DerivedNoiseSimRunner` perturbs recorded truth with seeded
Gaussian noise scaled `stdev / sqrt(iterations)`, independent across
candidates (`packages/core/test/racing-support.ts:113`).

**No artifact of a real shipped screening ordering exists.** Ticket 219's run
saved aggregate figures only, with no per-row output, so no byte replay is
possible; this is a distributional model of a 1,000-iteration pass. Real
screening shares one seed across candidates (`screenOpts` in `rank.ts`), so
real errors are plausibly correlated, and correlated errors preserve order
better than independent ones -- the inversion counts below are a **conservative
upper bound** on real disorder, not an unbiased estimate of it.

### 1. Screening SE at 1,000 iterations

Mean per-sim stdev 162.15 DPS over 461 recordings gives **SE = 5.128 DPS**
(min 2.36, max 6.08); the pairwise difference scale is `sqrt(2) * SE = 7.25
DPS`. `stdev` is confirmed a per-iteration population sd with no `/sqrt(N)`
applied (`vendor/tbc-new-fork/sim/core/sim_concurrent.go:138`), so
`SE = stdev/sqrt(n)` is the correct shape.

This replaces F10's untested extrapolation, which gives `6.8 * sqrt(300/1000)`
= 3.72 DPS -- 27% below the measured mean (equivalently, the measured mean is
38% above the extrapolation). The extrapolation understates because the feral
P3 per-sim stdev is larger than the one behind F10's 300-iteration figure.

### 2. No floor-only slot exists on this pool

The premise of this ticket's step 1 turns out not to hold. The per-slot floor
adds **zero rows in 0/30 draws at K=210 and 0/30 draws at K=150** -- the global
top-K already promotes every slot's screening argmax, so no slot ships with
exactly one floor-promoted row and the rest screened.

**The cause is pool shape, not the value of K.** The pool spreads 398 entries
over 14 slots -- weapon 91, finger 49, back 31, feet 31, waist 27, wrist 26,
neck 25, chest 20, hands 20, legs 20, trinket 20, head 18, shoulder 18, ranged
2 -- and a K admitting 38-53% of it leaves every slot's argmax already inside
the global top-K. Ticket 221's K change did not cause this, and lowering K back
to 150 does not reactivate the floor; the script sweeps both values so that is
re-runnable rather than asserted. A materially larger pool, more slots, or a
much smaller K/pool ratio could reactivate the floor and would make this worth
re-measuring.

Substituted comparison subjects: the **largest screened partitions** -- weapon
(78 screened rows of 91 candidates), head (13 of 18), trinket (12 of 20).

### 3. Ordering: screening vs recorded truth, 30 draws

| slot | rows | pairs | inv (mean/max) | inv% | resolvable pairs | rInv% | maxDisp (mean/max) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| weapon | 78.3 | 3029 | 98.9 / 131 | 3.3% | 2751 | 0.4% | 8.8 / 12 |
| head | 13.0 | 78 | 9.4 / 17 | 12.1% | 58 | 3.9% | 3.9 / 7 |
| trinket | 12.0 | 66 | 28.3 / 36 | 43.2% | 0 | n/a | 8.5 / 11 |
| finger | 11.7 | 63 | 28.8 / 46 | 45.9% | 5 | 19.4% | 8.4 / 11 |
| shoulder | 10.2 | 47 | 7.0 / 15 | 14.9% | 28 | 4.4% | 3.4 / 6 |
| hands | 8.9 | 36 | 11.1 / 19 | 31.1% | 13 | 11.2% | 4.8 / 7 |
| chest | 8.6 | 33 | 5.2 / 12 | 15.9% | 19 | 5.6% | 2.6 / 6 |
| neck | 7.8 | 27 | 5.8 / 10 | 21.2% | 16 | 2.9% | 3.0 / 4 |
| waist | 7.3 | 24 | 4.3 / 8 | 18.1% | 16 | 1.1% | 2.4 / 3 |
| legs | 6.5 | 18 | 1.8 / 5 | 9.7% | 15 | 3.7% | 1.0 / 3 |
| back | 5.9 | 15 | 3.3 / 7 | 22.0% | 8 | 5.7% | 2.2 / 6 |
| feet | 4.9 | 10 | 3.4 / 6 | 34.1% | 4 | 0.0% | 2.2 / 3 |
| wrist | 4.6 | 8 | 2.8 / 5 | 33.5% | 2 | 1.5% | 2.2 / 3 |

**All slots, 30 draws: 6,306 inversions of 103,616 pairs (6.09%), maximum rank
displacement 12.** Under this model, and reading it as the conservative upper
bound it is, within-slot disorder is real but bounded and local.

`rInv%` restricts to pairs whose **recorded truth** deltas differ by more than
the 7.25 DPS pairwise noise scale -- pairs where a correct order exists at
screening precision at all. On that basis the rate is **587 of 88,046 (0.67%)**,
with 85% of all pairs resolvable. The gap between the two columns is the
finding:

- **trinket's 43% raw inversion rate is entirely ties.** Zero of its 66 pairs
  are separated by more than the noise scale, so its displayed order is close
  to arbitrary -- but no ordering could do better, because the sim cannot
  distinguish those items at screening precision. finger has the same shape (5
  of 63 pairs resolvable).
- **Where an answer exists, screening finds it.** weapon, the largest screened
  partition, inverts 0.4% of its resolvable pairs; head 3.9%.

### 4. The cited re-run command in the `promoteTopJ` comment is broken

`npx tsx packages/core/test/measure-racing-ratio.ts` throws
`RankError { kind: 'sim-failed' }` at this branch's base, pre-existing and not
caused by ticket 221. Ticket 223 owns the fix. The rewritten `promoteTopJ`
comment states the ratio column is not currently reproducible and points at
223, rather than citing a command that does not execute.

## Acceptance criteria

- [x] The screening SE at 1,000 iterations is measured and recorded, replacing
      the untested `1/sqrt(n)` extrapolation from F10's ~6.8 DPS at 300, with
      the command that produced it.
      **5.128 DPS** mean (min 2.36, max 6.08), n=461, via
      `npx tsx packages/core/test/measure-within-slot-ordering.ts`. See
      Findings section 1.
- [x] A slot with floor-only promotion is identified in a real feral P3 run,
      named, with its candidate count and how many of its rows shipped as
      `screened`.
      **Discharged -- no such slot exists on this pool.** The floor adds zero
      rows in 0/30 draws at K=210 and at K=150 alike, because of pool shape
      (14 slots over 398 entries, K admitting 38-53%), not because of the K
      value. Substituted subjects are the largest screened partitions: weapon
      78 screened of 91 candidates, head 13 of 18, trinket 12 of 20. See
      Findings section 2.
- [x] That slot's candidates are re-simmed at full iterations and the true
      ordering is compared against the shipped screening ordering, reporting
      inversion count and maximum rank displacement -- including "no
      inversions" if that is the answer.
      **Done without new sims**, against the recorded full-iteration truth for
      all 398 eligible candidates: 6,306 inversions of 103,616 pairs (6.09%),
      max displacement 12, over 30 draws; 0.67% restricted to truth-resolvable
      pairs. The screening side is an independent-Gaussian model over real
      per-candidate stdevs and real screening shares a seed, so these are a
      conservative upper bound, not a measurement of a shipped ordering. See
      Findings section 3.
- [ ] `sme-rank-review` has judged whether the shipped within-slot ordering
      below the argmax is defensible as game-domain output, and its verdict is
      recorded here.
      Input prepared at
      `.scratch/stage-gate/ticket-222-within-slot-ordering/sme-input.md`;
      the review is run and its verdict recorded outside this ticket's
      measurement-and-documentation step.
- [x] A decision is recorded: either the defaults or the promotion rule change
      with a re-measured `rank.ts` table, or the presentation changes, or the
      current behaviour is accepted with its reason written into the
      `RankInput.promoteTopJ` doc comment so the next reader sees that
      within-slot ordering is known-unmeasured-and-accepted rather than
      known-good.
      See Decision below. Note the ticket's own phrase no longer fits what was
      established: the ordering is neither unmeasured nor known-good, but
      bounded under the repo's own noise model with the model's limits stated.
- [x] If any change is made, `npx vitest run packages/core/test/racing.test.ts
      -t 7.2` and `npx tsx packages/core/test/measure-racing-ratio.ts` are
      re-run and their numbers updated in `rank.ts`.
      **Discharged as not applicable -- no default, promotion rule, or
      production code path changed.** This ticket produced a measurement script
      and documentation only, so no number in the `rank.ts` table moved. (The
      ratio command is separately broken; Findings section 4, ticket 223.) Were
      the SME gate to reverse the decision into a behaviour change, this
      criterion becomes live again and both commands must be re-run.

## Decision

**Accept the current behaviour and document it**, with the reason written into
the `RankInput.promoteTopJ` doc comment in `packages/core/src/rank.ts`.

The grounds, all from Findings above:

1. The per-slot floor is inert on this pool at K=150 and K=210 alike, so
   raising `promoteTopJ` is unmotivated -- the sharpest version of the concern
   ("a slot keeps only its argmax") has no instance on the pool that ships.
2. Within-slot disorder is bounded and local under the repo's own noise model:
   6.09% of pairs raw, 0.67% among pairs the truth actually separates, maximum
   displacement 12 in the largest partition.
3. Where the raw inversion rate looks alarming (trinket 43%, finger 46%) the
   cause is candidates packed inside the noise scale, which no promotion depth
   or iteration budget available at screening would resolve.

No defaults change and no production code change. What would reopen this: a
materially larger pool, more slots, or a much smaller K/pool ratio -- any of
which could reactivate the floor and would make the measurement worth
re-running.

This decision records the engineering half of the question. The game-domain
half is the open SME criterion above and is not presumed here.
