# ADR-0017 — Per-tier generated universes replace the single curated pool

**Status:** accepted
**Date:** 2026-07-30
**Amends:** PLAN.md §5.1 / §8.3 file layout, and planned ADR #9's second clause
**Ticket:** `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md` item 4

## Context

PLAN.md §8.3 (review R2) specifies the candidate set as one curated file per
spec:

> `pools/ret.json` — candidate pool — ONE FILE PER SPEC, not per tier (R2).
> … Curation accumulates instead of being redone [each tier].

and PLAN.md's "ADRs to write on approval" list pins it as item 9: _"Content
tier is a user input (`maxPhase`, inclusive), never a build target; pools are
per-spec, not per-tier."_ (That list is §17 as of this writing and was §16
before the "Open plans" section was inserted, so find it by title rather than
by number.)

The shipped engine reads `data/universes/ret-p2.json` and
`data/universes/ret-p3.json` — per tier, the shape R2 explicitly argued
against. `pnpm pool:generate` and its diff-mode curation loop are gone. Verify:

```bash
ls data/pools/ data/universes/
grep -n "pool:generate" package.json
```

At `28bdc77` that shows `data/pools/` holding only a `README.md`, four files
under `data/universes/`, and no `pool:generate` script.

### Why R2 wanted one file

R2's argument was about **curation**: a human-reviewed file per tier means the
review work is redone every tier, and judgements made at T4 are lost when T5
arrives. One accumulating file keeps that work.

### Why that premise no longer holds

The raid-scoped redesign made the candidate set **generated, not curated**.
`scripts/assemble_universe.py` derives membership from pinned inputs — db.json
sources, AtlasLoot, Wowhead lists, two-hop tier tokens — with no hand-maintained
membership file anywhere in the path. `data/pools/README.md` records that the
old curated files and `generate_pool.py` / `curate_ret_pool.py` were deleted
after a plan review found the curated file shipped bows, guns and a Kael'thas
temp legendary while tests only guarded the universe path.

There is no accumulated curation to lose, because there is no curation. R2's
conclusion outlived its premise.

## Decision

The candidate set ships as **one generated file per (spec, maxPhase)** under
`data/universes/`, not one curated file per spec.

**R2's load-bearing rule is unaffected and stays.** Content tier remains a user
input, never a build target, and the `maxPhase` filter remains **inclusive** at
rank time — `packages/core/src/pool.ts` still filters `e.phase <= maxPhase`, so
a user simming at tier 2 still sees Karazhan and badge gear. That inclusivity
was the actual substance of R2; the file layout was the mechanism it happened
to pick.

Planned ADR #9 is amended: its first clause (tier is a user input, inclusive)
stands; its second clause (pools per-spec, not per-tier) is superseded here.

## Consequences

- Each tier's file is reproducible from the pinned inputs, so a "lost curation"
  regression is not possible — regeneration is the only way to change
  membership, and it is deterministic (verified byte-identical across five
  `PYTHONHASHSEED` values, see `docs/verification-log.md`).
- Membership changes are reviewable as a diff on a committed generated
  artifact, which is how the classAllowlist and polearm changes were caught.
- **Cost:** a per-tier file must exist for every tier a user can select.
  `data/universes/` currently holds only p2 and p3, while `cli.ts` builds
  `ret-p${maxPhase}` for any phase and `phase_raids.json` advertises tiers 4
  and 5. Selecting tier 4 or 5 today finds no file. That gap is real and is
  tracked in ticket 23; this ADR does not close it.
- Adding a tier is now a generation step (`--max-phase N`) plus a committed
  file, rather than data appended to one accumulating pool. Still no code
  change, so §14's "new content tiers are not a delivery phase" holds.

## Alternatives considered

**Restore the single accumulating pool.** Rejected: it would reintroduce a
hand-maintained membership file, which is what admitted class-illegal and
temp-legendary items before, and the tests guarded the universe path rather
than the curated one.

**Keep one generated file per spec carrying every tier, filtered at load.**
Closer to R2's letter and genuinely viable — the entries already carry their
own `phase`. Rejected for now only because the per-tier report sidecars
(`ret-pN.report.json`) are per-assembly measurements (recall, tier coverage,
junk-filter counts) that a single combined file would have to either merge or
lose. Worth revisiting if the tier-4/5 gap above is closed by generating more
files rather than fewer.
