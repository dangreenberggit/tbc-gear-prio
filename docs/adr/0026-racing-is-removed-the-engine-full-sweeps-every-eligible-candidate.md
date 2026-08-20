# ADR-0026 — Racing is removed; the engine full-sweeps every eligible candidate

**Status:** accepted
**Date:** 2026-08-19
**Supersedes in part:** [`docs/plans/wowsims-tab/candidate-pool.md`](../plans/wowsims-tab/candidate-pool.md) §3.4.1 and §6 (M2 — racing)
**Amends:** [ADR-0018](0018-no-rank-time-ep-prefilter-so-no-fullpool-flag.md) — the `fullPool` flag it discusses no longer exists, because the behaviour it selected is now the only behaviour
**Ticket:** `.scratch/carry-forward/issues/225-promotion-budget-is-a-blunt-instrument-relative-to-real-upgrade-count.md`

## Context

M2 added racing: screen every candidate at 1,000 iterations, promote the top
K by noisy delta plus the top J per slot, and full-sim only the promoted rows.
The bet was that most candidates are obvious losers, so a cheap look at all of
them plus an expensive look at a few beats an expensive look at all of them.

Ticket 225 reopened the question because the shipped defaults did not look
like a saving. Before measuring anything, it fixed the bar a screening
mechanism has to clear (C1):

> A screening mechanism earns its place only if, at zero recall misses over 30
> noise draws on every committed gating fixture, it costs at least 20 % less
> WASM wall-clock than a full sweep under candidate-pool.md §3.4.1's model
> `cost(it) = 748.4 + 3.2446·it` ms, with its decision rule and parameters
> fixed in advance — not tuned per fixture on the truth.

Racing misses that bar in three separate ways.

**It costs more than it saves at shipped defaults.** Wall ratios against a full
sweep are 1.407 on ret, 1.476 on feral and 1.098 on feral-p3 at 3,000
iterations. Screening 226–357 candidates at 1,000 iterations is not cheap
relative to the sweep it is trying to avoid, and the promoted set is not small:
break-even needs a promoted/eligible ratio of 0.619 at 3,000 iterations.

**It misses the bar even when K is tuned on the answer.** Giving racing the
best case it can possibly have — the smallest per-pool K that loses no
above-cutoff row in any of 30 draws, chosen with knowledge of the truth —
yields K/N of 0.270/0.518/0.487 and wall ratios of 0.651/0.899/0.868. Feral
pools do not clear 20 % even under an oracle. The shape is wrong, not the
parameter.

**Its own recall gate is red.** `racing.test.ts` 7.0 fails on feral at shipped
defaults.

And nothing depended on it. The CLI, the only production caller, always passed
`fullPool: true`; every racing-active call site lived under
`packages/core/test/`.

Five other candidate mechanisms were measured against the same pre-stated bar
(ticket 225 records each with its win condition and command). All failed:
restating the cutoff in SE units, common-random-numbers pairing, a per-slot
top-3 output contract, an EP-gap stop with a fitted overturn bound, and
sequential screening with a separate full sim on promote. EP predicts feral
DPS too weakly for a pre-order stop — |residual| p95 is 232 and 227 DPS on the
two feral pools.

One candidate did clear the cost term: adaptive per-candidate sims that
continue until the confidence interval clears the cutoff decision, keeping the
pooled estimate rather than re-simming on promote, with z fixed at 3 in
advance. It measures 0.591/0.764/0.760 wall at zero misses. It is not adopted
here. Its cost evidence is a noise-model simulation rather than a real-binary
run, its output-precision term is unscored (14.8/5.8/19.4 promoted rows end
below 3,000 iterations, carrying a pooled estimate whose mean error against
truth is 1.84/2.52/2.62 DPS), and it depends on a replication-seed defect being
fixed first. It is a new stage shape, not a re-parameterisation of this one.

## Decision

Racing is removed. `rankUpgrades` full-iteration-sims every eligible candidate
on every call. There is no screening pass, no promotion rule, no
`screenIterations` / `promoteTopK` / `promoteTopJ` / `fullPool` knob, no
`screened` row state and no `ruledOut` view bucket.

Adaptive-CI screening is the measured open direction, filed as its own ticket
with its validation plan. It is not built here.

## Consequences

**The cap is the only pool control left.** `candidateCap` still bounds how many
candidates are considered; what changed is that every candidate that survives
it now gets a full-iteration sim. Cost is linear in the cap with no second
term, which makes the browser budget in candidate-pool.md §3.4.1 easier to
reason about, not harder.

**Cache keys are frozen, not migrated.** `contentHashOf` keeps `fullPool:
true, screenIterations: null, promoteTopK: null, promoteTopJ: null` in its
payload as constants. Dropping them would rehash every stored ranking and
silently re-sim it. The CLI always passed `fullPool: true`, so these four
values reproduce its keys exactly; `content-hash.test.ts` pins the resulting
digest. Delete them only alongside an `ENGINE_VERSION` bump, which invalidates
the cache deliberately.

**The recall gate moved rather than disappearing.** With one sim path,
"screening recall" is no longer a property anything can have — there is no
second computation to lose rows against. What remains worth gating is that the
full sweep still finds the set it should, so `full-sweep-recall.test.ts`
asserts the above-cutoff item-id set against ids the fixture generator
recorded from the real binary, and asserts that requests appear at the
recorded iteration count and no other. candidate-pool.md §7's rule — the
recall gate is never weakened to make a rule look good — survives the removal.

**The fork still races.** `vendor/tbc-new-fork`'s ported engine keeps its
promotion path, so the E-W3 parity harness passes `fullPool: true` on the
fork's side to hold both engines on the same full-sweep path. Porting the
removal is separate work.

**Open direction:** adaptive-CI screening, `.scratch/carry-forward/issues/233-adaptive-ci-screening-design.md`, gated on the replication-seed fix in `232`.
