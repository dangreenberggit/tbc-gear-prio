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

## 1. `fullPool` is not implemented (§4, §8.3.3)

§4 lists it on `RankInput`:

> `fullPool?: boolean // skip the rank-time EP prefilter (§8.3), sim everything`

§8.3.3 calls it *"the escape hatch when you want to check what the filter
dropped"*. It exists nowhere. Without it the prefilter cannot be audited from
the public interface — which is exactly the audit ticket 18 needs.

## 2. `source: null` is measured, not gated (§8.3.2)

> A `null` source is a **build-time failure for a pool that ships**, not a
> runtime shrug.

No assertion in src, tests or scripts enforces this. The gate box was closed by
measuring the committed artifact (0/238, 0/362), which is true today but would
not catch a regression. Needs a real build-time guard in
`assemble_universe.py`, plus a test.

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

## 4. Per-tier universes replaced the single accumulating pool (§5.1, §8.3)

> `data/pools/ret.json` — ONE FILE PER SPEC, not per tier (R2). … Curation
> accumulates instead of being redone every tier.

Shipped is `data/universes/ret-p2.json` / `ret-p3.json` — per tier, the shape R2
explicitly argued against — and `pnpm pool:generate` with its diff-mode curation
loop is gone. This is a real architectural substitution made during the
raid-scoped redesign, and it is defensible (the universe is generated, not
curated, so there is no curation to lose). **It needs an ADR**, which the repo
has no `docs/adr/` entries for yet.

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
