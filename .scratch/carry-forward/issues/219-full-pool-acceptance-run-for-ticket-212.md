Status: open
Type: verification gap (acceptance evidence is a time-boxed sample)
Origin: ticket 212 criterion 4, scope decision 2026-08-17
Blocks: none
Blocked by: none

# Ticket 212's acceptance run covered a sample, not the full pool

Ticket 212's criterion 4 asks for a served-build run where the count of
candidates dropped for `No item with id` reaches zero. A full pass is ~455
candidates and its duration has never been measured — measuring it *is*
ticket 156, which ticket 212 blocked.

Decision (user, 2026-08-17): cap the acceptance run at 30 minutes, record the
candidate count it reached, and accept zero drops across that sample. The
reasoning, recorded so a later reader can judge it: before the fix **every**
candidate panicked (455/455 in the slice-B record), so a broken fix fails on
the first candidate and cannot produce a zero-drop sample of any size. A
30-minute sample therefore discriminates "works" from "does not work" with
high confidence.

What it does not discriminate is a failure that only a longer run would
reach.

## Where this work happens

Two repos are involved; be explicit about which is which.

- **The build and the run** happen in the **fork clone**,
  `vendor/tbc-new-fork` (a separate git repo, gitignored by the parent, its
  own remote `github.com/dangreenberggit/tbc-new`), on `feat/upgrades-tab`.
  Nothing here needs a fork commit: building `dist/` and serving it changes
  no tracked file. If a fix *is* needed, that is a fork change and follows
  §9.1a (fork commit -> E-W3 green -> PROVENANCE re-hash -> drift check),
  with the lockfile pin bumped from the parent repo afterwards.
- **The evidence** is recorded in **this repo**,
  `C:/Users/dgree/Code/lulz/tbc-gear-prio`, on the feature branch in play
  (`feat/candidate-pool` at the time of writing), by editing this ticket and
  ticket 156.

## What a full pass could still surface

Hypotheses, untested — each is a reason a partial run could read clean while
a full one does not:

- **Late-pool items whose rows the Database cannot resolve.** The slice-0
  preflight found 0 missing ids across all six universes (2,229 entries)
  against `assets/database/db.json`, so this is unlikely, but the preflight
  checks id *presence*, not that `lookupEquipmentSpec` resolves every one of
  them into a `Gear` with usable rows.
- **A phase the sample never reaches.** The run is Phase 3; a pool entry
  gated to a later phase is not exercised.
- **Meta-gem behaviour.** Upstream drops inactive meta gems before simming
  (`ui/core/sim.ts`). Ticket 212's plan recorded as an untested hypothesis
  that our engine's meta repair makes that unnecessary. A candidate whose
  repair leaves a meta inactive might panic only deep into the pool.
- **Accumulating state.** Nothing in the design suggests per-candidate state
  leaks, but a partial run cannot rule out a failure that only appears after
  many candidates.

## Done when

- [ ] A served production build runs the full candidate pool to completion,
      Phase 3, screening on.
- [ ] The dropped-for-`No item with id` count is zero across the whole pool,
      read from the per-row disclosure, with the candidate count recorded.
- [ ] The run's wall-clock duration is recorded — this is also the
      measurement ticket 156 needs, so the two can be satisfied together.
- [ ] Any drop that does appear is diagnosed against the hypotheses above
      rather than assumed to be the same bug.
