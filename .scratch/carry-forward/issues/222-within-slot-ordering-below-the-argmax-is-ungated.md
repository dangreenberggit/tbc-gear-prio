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

## Acceptance criteria

- [ ] The screening SE at 1,000 iterations is measured and recorded, replacing
      the untested `1/sqrt(n)` extrapolation from F10's ~6.8 DPS at 300, with
      the command that produced it.
- [ ] A slot with floor-only promotion is identified in a real feral P3 run,
      named, with its candidate count and how many of its rows shipped as
      `screened`.
- [ ] That slot's candidates are re-simmed at full iterations and the true
      ordering is compared against the shipped screening ordering, reporting
      inversion count and maximum rank displacement — including "no inversions"
      if that is the answer.
- [ ] `sme-rank-review` has judged whether the shipped within-slot ordering
      below the argmax is defensible as game-domain output, and its verdict is
      recorded here.
- [ ] A decision is recorded: either the defaults or the promotion rule change
      with a re-measured `rank.ts` table, or the presentation changes, or the
      current behaviour is accepted with its reason written into the
      `RankInput.promoteTopJ` doc comment so the next reader sees that
      within-slot ordering is known-unmeasured-and-accepted rather than
      known-good.
- [ ] If any change is made, `npx vitest run packages/core/test/racing.test.ts
      -t 7.2` and `npx tsx packages/core/test/measure-racing-ratio.ts` are
      re-run and their numbers updated in `rank.ts`.
