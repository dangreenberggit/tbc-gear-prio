Status: open
Type: coverage gap (test reach, not a known defect)
Origin: ticket 212 slice 3, 2026-08-17
Blocks: none
Blocked by: none

# E-W3 never executes the fork's screening compose site

E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`) is the only gate on
the fork's ported engine. Since ticket 212 slice 3 it also checks that every
composed request carries a sim database describing its own equipment. It
cannot check that for the fork's **screening** compose site, because it never
runs screening at all.


## Where this work happens

**Primarily this repo** (`C:/Users/dgree/Code/lulz/tbc-gear-prio`), on the
feature branch in play (`feat/candidate-pool` at the time of writing): the
gate is `packages/core/test/wowsims-fork-parity.test.ts`, a parent-repo test.
Extending it needs no fork commit and §9.1a does not apply.

The fork clone (`vendor/tbc-new-fork`, `feat/upgrades-tab`) is involved only
as the thing under test — E-W3 imports its engine sources at runtime. If the
investigation concludes the fork's adapted `promotion.ts` must change so the
two engines can be compared under `fullPool: false`, *that* is a fork change
and follows §9.1a (fork commit -> E-W3 green -> PROVENANCE re-hash -> drift
check), with the lockfile pin bumped from this repo afterwards. Deciding
whether to touch it at all is the design question this ticket names.

## The fact

The fork's `rank.ts` has four compose sites, all now routed through one
`composeFor` closure. Three of them — the baseline request, the full-iteration
candidate swap, and the set package inside `buildSetBonuses` — are executed by
E-W3. The screening site is not: `buildRecordingsAndRun` passes
`fullPool: true` in its `rankUpgrades` input, which skips screening on both
engines by design. The harness comment there explains why: the recordings are
pinned at one iteration count, and a screening pass would ask the recorded
runner for keys at `DEFAULT_SCREEN_ITERATIONS` that it rejects.

So a port that threads the other three sites correctly and botches the
screening one passes every E-W3 run. What ticket 212 slice 3 has instead is
static evidence — exactly one `compose(deps.raidSimSkeleton` call remains in
the fork's `rank.ts`, so the screening site must be calling `composeFor` —
plus whatever coverage the shared closure body inherits from the other three
sites. Re-runnable:

```
grep -c "compose(deps.raidSimSkeleton" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts
```

Core covers its own analogous site directly, with
`packages/core/test/rank.test.ts:4495` ("gives screening requests their own
database too"). The fork has no equivalent, and cannot easily grow one: it
ships no TypeScript test runner, which is why E-W3 lives in this repo at all
(`docs/plans/wowsims-tab/plan.md` §8).

This matters more than a generic coverage gap because core's `ea8f916`
("Defend the screening and package compose sites") exists precisely because a
review proved two of core's four sites accepted a full revert of ticket 212
with all tests green. The screening site is one of the two.

## Why the obvious fix is not obvious

Adding a `fullPool: false` case to E-W3 is not a bounded edit.

1. The harness would need recordings at screening iterations for every pool
   candidate, plus the existing full-iteration recordings for whatever gets
   promoted.
2. More seriously, the fork's `promotion.ts` is a deliberately **adapted**
   port. Its PROVENANCE row records that it has no `promoteTopJ` and keeps the
   pre-§6.4 best-in-slot floor. Under `fullPool: false` the two engines may
   therefore legitimately promote different candidate sets — and E-W3's
   cross-engine request-equality assertion would go red on divergence that is
   documented and intended.

That second point is the real question a fix has to answer, and it is a design
question, not a test-plumbing one: **what does request-level parity mean when
the two engines' promotion legitimately diverges?** Comparing the requests as
unordered sets, comparing only the requests for candidates both engines
promoted, or aligning `promotion.ts` first are all plausible answers with
different costs. Pick one deliberately rather than discovering it mid-edit.

## What would close this

Either:

- an E-W3 case that reaches the fork's screening site and states, in the test
  itself, what parity means under divergent promotion; or
- a fork-side check that does not need cross-engine parity at all — the
  screening request carrying a database is a property of one engine, and a
  cheaper gate might assert it directly on the fork's own captured requests.

Until then the gap stands recorded on ticket 212 rather than implied closed.
