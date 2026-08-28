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

## The cheapest next check (added by domain review, round 4)

The domain axis narrowed this usefully. At `piecesWorn = 2` only the 4pc row is
built (`rank.ts:1548`, `if (threshold <= piecesWorn) continue;`), needing **two**
added pieces — so the `addedPieces.length === 1` guard does **not** fire and
`unmeasurable-at-this-worn-count` is *not* the cause of the 2/5 sweep. The
hypothesis above is wrong about that half.

The likelier cause: `selectPackage` (`packages/core/src/set-value.ts:185-192`)
accepts a completing piece only if `deltaByItemId.get(entry.itemId)` exists —
the piece must be **in the candidate pool and individually simmed**. With
`setIdsWithCandidates` returning empty short-circuiting the whole path
(`rank.ts:1510-1516`), the feature needs *two* un-worn pieces of the same set to
survive pool filtering in one run. On default gear at 2/5 the worn-item guard
removes the worn tier pieces, so the surviving in-pool pieces may be fewer than
two.

**Start here:** instrument `setIdsWithCandidates.size` and `selection.ok` for
setId 629. This is a hypothesis, not a measurement — nobody has run it.

Domain's reachability verdict: the feature is **not** structurally dead, but it
is much narrower than the toggle's presence implies — it needs a player at 2/5+
of an implemented set whose pool still carries two un-worn pieces of that set.

## Why it is filed rather than fixed here

The stage that found it owns the tab's presentation only; `upgrades/engine/**`
and `upgrades/data/**` were out of scope and byte-gated. Whoever picks this up
should start by asking whether any row in any phase/spec combination ever
carries a `setContext` — if none does, the display states are unreachable and
ticket 313's UI cannot be validated by inspection at all.

Related: ticket 91 (closed) covers a different layer — the engine crediting a
measured 4pc bonus to no row. This ticket is about no `setContext` reaching
the UI in the first place.


## Handoff notes (orchestrator, 2026-08-28)

The owner is assigning this to a separate agent. Everything below was confirmed
by command in this session so the next seat does not have to rediscover it.

### The probe, concretely

`setIdsWithCandidates` is built at `packages/core/src/rank.ts:1511-1514` and
short-circuits the whole set-bonus path at `:1516`
(`if (setIdsWithCandidates.size === 0) return [];`), then drives the loop at
`:1532`. `selectPackage` is `packages/core/src/set-value.ts:155`. Instrument
those two for setId 629 and the reachability question is answered.

### The trap: the engine exists in two copies

`packages/core/src/` is the source. The fork carries a **ported copy** under
`ui/core/components/individual_sim_ui/upgrades/engine/`, hash-gated by that
directory's `PROVENANCE.md` and checked by `scripts/check_engine_port_drift.py`.

A probe added to the wrong copy measures nothing, because **the running page
executes the fork's ported files, not `packages/core`**. Any real edit has to go
through the ported-file cycle (see `docs/agents/known-traps.md` before touching
either copy) — a temporary probe is easier to run in the fork copy and then
revert, but do not commit a hash-breaking edit by accident.

### What "done" looks like

Two possible outcomes, and they are different tickets:

1. **Reachable** — construct a character/phase where a row carries a
   `setContext`, then verify all four of ticket 313's display states on screen.
   That closes this ticket and finally validates 313.
2. **Unreachable in practice** — if no realistic configuration produces one,
   313's display code is dead as written and the design question reopens: the
   toggle advertises a feature the engine will not feed. That is a bigger
   finding than a bug, and it should come back to the owner rather than being
   fixed quietly.

Do not close 313 on either path without the owner seeing the answer.

### Do not trust these figures without re-running

The five-sweep results above are the executing seat's report; its measurement
tables lived in a session scratchpad that is gone. The *reasoning* about why
2/5 should have worked was independently verified by domain review, but the
sweep numbers themselves were not re-run.