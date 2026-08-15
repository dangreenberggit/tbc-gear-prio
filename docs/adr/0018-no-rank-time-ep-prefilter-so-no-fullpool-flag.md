# ADR-0018 — There is no rank-time EP prefilter, so `fullPool` is not implemented

**Status:** accepted
**Date:** 2026-07-30
**Amends:** PLAN.md §4 (`RankInput.fullPool`), §8.3.3, §4's cost model
**Ticket:** `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md` item 1
**See also:** [`docs/plans/wowsims-tab/candidate-pool.md`](../plans/wowsims-tab/candidate-pool.md) — bounds the in-browser run without adding the EP prefilter this ADR describes as deferred

## Context

PLAN.md §4 lists a flag on `RankInput`:

> `fullPool?: boolean // skip the rank-time EP prefilter (§8.3), sim everything`

and §8.3.3 calls it _"the escape hatch when you want to check what the filter
dropped."_ §8.3.3 specifies the filter it escapes: re-score the tier-filtered
pool with EP evaluated at the player's own logged gear, hit and expertise
weights clipped to the player's remaining cap gap, and **sim the top ~80** of a
~180-entry pool.

The review filed the missing flag as spec drift. Looking for it turned up the
larger fact: **the prefilter it bypasses was never built.**

`rankUpgrades` selects candidates in one place
(`packages/core/src/rank.ts:202`):

```ts
const candidates = filterPoolByPhase(deps.pool ?? [], input.maxPhase).filter(
  (e) => !isKaelTempLegendary(e.itemId)
);
```

Phase and Kael temp legendaries. No EP scoring, no cap-clipped weights, no
top-N. Confirm with:

```bash
grep -rn "prefilter\|topN\|EP_TOP_N" packages/core/src/
```

which returns nothing at `0dec76a`. The shipped behaviour is already
`fullPool: true` — the P3 run sims 357 of a 362-entry universe, and the 5-row
gap is items the player already wears, not a filter.

## Decision

**`fullPool` is not implemented, and will not be until a prefilter exists.**

Adding the flag now would ship a parameter that skips nothing. It would appear
in the interface, be hashed into `contentHash`, and read to any caller as an
audit capability — while doing nothing at all. A no-op flag that looks like a
safety control is worse than an absent one, because it invites the audit it
cannot perform.

PLAN.md §4's `fullPool` line and §8.3.3's prefilter design are **deferred, not
cancelled.** They become live together, or not at all.

## Why the prefilter is not urgent

§8.3.3's premise was a ~180-entry curated pool where simming everything cost
too much, so ~80 had to be chosen well. Two things changed:

- The candidate set is now a generated per-tier universe (ADR-0017), 354 rows
  at p3 after `classAllowlist` enforcement.
- A full P3 run sims all of them in roughly 15 minutes offline, which is
  tolerable for the CLI. **Untested as written** — that figure is carried from
  a handoff note, not from a measured run recorded here. Re-derive with
  `pnpm rank --region US --realm dreamscythe --character slamaltman --offline
--max-phase 3` before relying on it.

So the cost the prefilter existed to avoid is currently being paid, and the
product still works. The prefilter becomes necessary when the web path (Phase
2+) needs a ranking in tens of seconds rather than minutes, or when the
universe grows past what a full sweep can carry.

## Consequences

- **`RankInput` stays smaller than §4 describes.** Anything reading §4 as the
  contract will not find `fullPool`; this ADR is why.
- **No audit gap today.** §8.3.3 wanted `fullPool` to check what the filter
  dropped. Nothing is dropped, so there is nothing to check — the escape hatch
  and the thing it escapes are both absent, which is consistent.
- **Ticket 18's junk-filter audit was unaffected.** That measurement compared a
  _universe-assembly_ filter against a full sim of the universe, which the
  current engine gives for free. It never needed `fullPool`.
- **When the prefilter lands, `fullPool` is not optional.** The moment
  candidate selection depends on EP evaluated at the player's gear, the
  selection becomes player-dependent and unfalsifiable without a way to sim
  everything. Implement them in the same change, with a test that the flag
  actually widens the simmed set.
- §4's cost model ("~80 of a ~180-entry pool by default, or the whole pool
  under `fullPool`") does not describe the shipped engine and should be read
  as a Stage 2+ target.

## Alternatives considered

**Add `fullPool` now as a no-op accepted-and-ignored flag.** Rejected: it
would be dead interface surface that misrepresents what the engine does.

**Add `fullPool` and build the prefilter to give it something to skip.**
Rejected as scope inversion — building a filter so a flag can disable it.
The prefilter should be justified by a runtime budget that actually binds.

**Delete `fullPool` from PLAN.md.** Rejected: the prefilter is still the right
design for the web path, and §8.3.3's cap-clipping argument is sound. Deferring
keeps the reasoning; deleting would lose it.
