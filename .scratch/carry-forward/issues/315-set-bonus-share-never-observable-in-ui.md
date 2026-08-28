Status: open
Type: bug
Origin: stage-gate `upgrades-ui-rebuild`, slice 4 execution, 2026-08-27
Blocks: none
Blocked by: none

# Set-bonus share never became observable in the UI

Ticket 313's display code shipped (fork commit `978f0c2e3`), but **its
acceptance was never met**: across five sweeps the executor could not get a
single row to carry a `setContext`, so none of the four display states was
ever seen on screen. The code is committed unverified-in-practice and is
recorded as such in the stage's decision log; it is not known to be wrong,
it is known to be unobserved.

## What was swept

Reported by the executing seat (its measurement tables are in a scratchpad
that does not survive the session, so treat the specific figures as its
report rather than as re-run output):

- phases 3 and 5 on default gear
- 2/5 and 3/5 of Crystalforge Battlegear (`setId` 629), whose 2pc and 4pc are
  both listed implemented

In every case the set-potential toggle stayed hidden and the assumptions
drawer recorded no set-bonus disclosure at all.

## The candidate explanation, untested

At 3/5 the 4pc needs one added piece, which `rank.ts:1232` marks
`unmeasurable-at-this-worn-count`. That would explain the 3/5 sweep. It does
**not** explain the 2/5 sweep, which needs two pieces and still produced
nothing. **Hypothesis**: the gating that suppresses these rows is upstream of
the UI, in the engine or the candidate pool, not in ticket 313's display
code. Nobody has confirmed this.

## Why it is filed rather than fixed here

The stage that found it owns the tab's presentation only; `upgrades/engine/**`
and `upgrades/data/**` were out of scope and byte-gated. Whoever picks this up
should start by asking whether any row in any phase/spec combination ever
carries a `setContext` — if none does, the display states are unreachable and
ticket 313's UI cannot be validated by inspection at all.

Related: ticket 91 (closed) covers a different layer — the engine crediting a
measured 4pc bonus to no row. This ticket is about no `setContext` reaching
the UI in the first place.
