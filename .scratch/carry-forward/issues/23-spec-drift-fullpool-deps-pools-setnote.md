Status: open
Type: task
Origin: `docs/reviews/phase-1-five-seed-spread.md` Spec findings S3–S7
Blocks: phase-2
Blocked by: none

# Spec drift between PLAN.md and the shipped Phase 1 engine

Five places where the code and PLAN.md disagree. None breaks a shipped number;
each is either a missing affordance or an undocumented architectural change. The
resolution for several may legitimately be "amend the plan" — but that has to be
a recorded decision, not silent drift.

## 1. `fullPool` is not implemented (§4, §8.3.3) — RESOLVED 2026-07-30

§4 lists it on `RankInput`:

> `fullPool?: boolean // skip the rank-time EP prefilter (§8.3), sim everything`

§8.3.3 calls it *"the escape hatch when you want to check what the filter
dropped"*. It exists nowhere. Without it the prefilter cannot be audited from
the public interface — which is exactly the audit ticket 18 needs.

**Resolved:** `docs/adr/0018-no-rank-time-ep-prefilter-so-no-fullpool-flag.md`.

The finding is bigger than the missing flag: **the prefilter it escapes was
never built either.** `rank.ts:202` selects candidates by phase and Kael temp
legendary only — no EP scoring, no cap-clipped weights, no top-N.
`grep -rn "prefilter\|topN\|EP_TOP_N" packages/core/src/` returns nothing.
The engine already behaves as `fullPool: true`: the P3 run sims 357 of a
362-row universe, and the 5-row gap is worn items.

So implementing the flag would ship a parameter that skips nothing while
reading as an audit capability. Deferred with the prefilter; they land
together or not at all.

Correction to this ticket's framing: ticket 18's audit did **not** need
`fullPool`. It compared a universe-assembly filter against a full sim of the
universe, which the current engine provides for free.

## 2. `source: null` is measured, not gated (§8.3.2) — RESOLVED 2026-07-30

> A `null` source is a **build-time failure for a pool that ships**, not a
> runtime shrug.

No assertion in src, tests or scripts enforces this. The gate box was closed by
measuring the committed artifact (0/238, 0/362), which is true today but would
not catch a regression. Needs a real build-time guard in
`assemble_universe.py`, plus a test.

**Resolved.** Two parts were already covered and one was not, so the ticket was
partly stale:

- `add_source` already refuses a falsy source, and `poolEntryFromUniverse`
  already throws on an empty `sources` list. The "no source at all" path was
  gated.
- What was **not** gated is a source that exists but cannot be discriminated.
  `pool.ts` takes `sources[0]` and callers switch on `kind`, so a row with a
  missing or unknown `kind` is as unusable as one with no source.

`assemble_universe.py` now validates every source on every row against
`ITEM_SOURCE_KINDS` (mirroring the `ItemSource` union in `pool.ts`) and exits
2 listing the offending rows. `pool-hardening.test.ts` pins the same invariant
on the shipped artifact.

Mutation-checked both branches by editing the raid-source constructor and
regenerating:

```
"kind": "raaid"        -> assembly error: 304 unusable source rows
                          32323 ...: sources[0] unknown kind 'raaid'   exit=2
{"zone": str(zone)}    -> assembly error: 304 unusable source rows
                          32323 ...: sources[0] has no kind            exit=2
```

Real data is unaffected: regenerating p3 still writes 354 entries, exit 0.

## 3. `Deps` grew four fields beyond the spec (§4)

§4 fixes `Deps` at `{ gear, sim, store, clock }`. Shipped adds
`raidSimSkeleton`, `epWeights`, `gemPalette?`, `pool?`. `pool` and `gemPalette`
let a caller inject the candidate set and palette — data as dependency, not a
seam, and it dilutes §5's "three and only three" discipline. Note the maxPhase
gate test relies on `Deps.pool` to supply a two-item fixture, so the "candidate
set changed" assertion is about a hand-built list rather than the shipping
universe.

Either fold these into `RankInput` (they are inputs and they are hashed), or
amend §4 to describe the real shape.

## 4. Per-tier universes replaced the single accumulating pool (§5.1, §8.3) — RESOLVED 2026-07-30

> `data/pools/ret.json` — ONE FILE PER SPEC, not per tier (R2). … Curation
> accumulates instead of being redone every tier.

Shipped is `data/universes/ret-p2.json` / `ret-p3.json` — per tier, the shape R2
explicitly argued against — and `pnpm pool:generate` with its diff-mode curation
loop is gone. This is a real architectural substitution made during the
raid-scoped redesign, and it is defensible (the universe is generated, not
curated, so there is no curation to lose). **It needs an ADR**, which the repo
has no `docs/adr/` entries for yet.

**Resolved:** `docs/adr/0017-per-tier-generated-universes-replace-the-single-curated-pool.md`.
R2's argument rested on *curation accumulating*; the raid-scoped redesign made
the universe fully generated, so there is no curation to lose and the premise no
longer holds. R2's load-bearing rule — tier is a user input, filtered
**inclusively** at rank time — is unaffected and still enforced in
`packages/core/src/pool.ts`. Planned ADR #9's second clause is superseded; its
first stands. The tier-4/5 gap noted below is called out in the ADR as a real
open cost and stays on this ticket.

Related: `data/universes/` holds only p2 and p3, while `cli.ts` builds
`ret-p${maxPhase}` for any phase and `phase_raids.json` advertises 4 and 5.
`--max-phase 1`, `4` or `5` fails to load.

## 5. `setBonusNote` is not explanatory (§14 gate)

The gate asks for an *"explanatory `setBonusNote`"*. `setBreakNote` emits:

```
breaks 2-piece set 629 (below 4)
```

`629` is a raw `setId`. No player knows what that is, and `data/items/index.json`
has the set name available. Should read something like
`breaks the 4-piece Crystalforge Armor bonus`.

(The originating review also claimed the 2pc branch emits a malformed
`(below 4)`. That part is **wrong** — `set-bonus.ts:41-42` correctly emits
`(below 2)` for the 2pc case. Only the raw-ID readability issue is real.)

## Done when

Each of the five is either implemented, or PLAN.md is amended with the reasoning
recorded — and for item 4, an ADR under `docs/adr/`.
