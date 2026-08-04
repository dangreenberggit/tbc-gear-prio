Status: closed
Type: task
Origin: `docs/reviews/phase-1-five-seed-spread.md` Spec findings S3–S7
Blocks: phase-2
Blocked by: none

# Spec drift between PLAN.md and the shipped Phase 1 engine

Five places where the code and PLAN.md disagree. None breaks a shipped number;
each is either a missing affordance or an undocumented architectural change. The
resolution for several may legitimately be "amend the plan" — but that has to be
a recorded decision, not silent drift.

**Status 2026-08-03: all five items are resolved.** Item 3 was the last one
open, waiting on `contentHash`; that trigger has fired — see below.

**Item 3 resolved 2026-08-03 by ADR-0019.** `contentHash` is implemented, and
the trigger this ticket was holding for produced the *opposite* answer to the
one it predicted. The ticket argued `pool`/`gemPalette` belong on `RankInput`
*"because they are inputs and they are hashed."* They are now genuinely hashed
— as `candidateItemIds` and `gemPaletteIds` — **and the inference still does
not follow.** `rankUpgrades` reads both `input` and `deps` and hashes from
both, so cache correctness depends on a field being *in the hash*, not on which
parameter declares it. The stale-ranking failure this item feared is prevented
by hashing; relocation prevents nothing.

Decision: `pool` and `gemPalette` **stay on `Deps`**, and PLAN.md §4 is amended
to describe the real shape — `Deps` carries the three seams plus per-spec
configuration the engine cannot synthesise. Note `raidSimSkeleton` and
`epWeights` are data too and would have stayed regardless, so moving the other
two would only partly have restored §5's "three and only three".

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

## 3. `Deps` grew four fields beyond the spec (§4) — RESOLVED 2026-08-03 (ADR-0019)

§4 fixes `Deps` at `{ gear, sim, store, clock }`. Shipped adds
`raidSimSkeleton`, `epWeights`, `gemPalette?`, `pool?`. `pool` and `gemPalette`
let a caller inject the candidate set and palette — data as dependency, not a
seam, and it dilutes §5's "three and only three" discipline. Note the maxPhase
gate test relies on `Deps.pool` to supply a two-item fixture, so the "candidate
set changed" assertion is about a hand-built list rather than the shipping
universe.

Either fold these into `RankInput` (they are inputs and they are hashed), or
amend §4 to describe the real shape.

### What this actually costs, examined 2026-07-30

`Deps` was meant to carry only the three seams — the swappable connections to
the outside world (fetch gear, run sim, store results) that let the engine run
offline from fixtures. It now also carries plain **data**: `pool` (the
candidate items) and `gemPalette` (which gems exist). Data is not a connection
to anything, so it does not need a port.

Two consequences were claimed. Only one is real today.

**Real — the test hazard.** Because the candidate list arrives through
`deps.pool`, a test can substitute any list it likes. The maxPhase gate test in
`rank.test.ts` passes a hand-built two-item pool (29381 neck, 30101 chest), so
it proves `filterPoolByPhase` works *on that fixture* and asserts nothing about
the 354-row artifact that ships. **Fixed** by a new test in `pool.test.ts` that
gates the real `ret-p2.json`: 142 rows at maxPhase 1, all 230 at maxPhase 2,
with a phase-1 item surviving both and a phase-2 item only surviving the
second. Mutation-checked — changing `<=` to `===` fails it with
`expected 88 to be greater than 142`.

Note that moving `pool` into `RankInput` would **not** have fixed this. A test
could pass a two-item list there just as easily. The fix was a test against the
shipping artifact, not a different home for the field.

**Not real yet — the hashing argument.** "They are inputs and they are hashed"
does not hold: `contentHash` in `rank.ts` is currently the literal placeholder
`` `phase1-baseline:${character}` ``, not a hash of anything. Nothing is hashed,
so nothing is missing from the hash. When `contentHash` is implemented, the
candidate pool genuinely must be part of it — change the pool and the numbers
change, so a cache keyed without it would serve stale rankings.

### Settled 2026-08-03, once the hash was real

The deferral below was right to wait, and wrong about what it would find. It
assumed *"the field's home determines whether the cache is correct."* It does
not — the hash's **contents** determine that, and `contentHash` hashes from
`deps` as readily as from `input`. With `candidateItemIds` and `gemPaletteIds`
in the payload (both mutation-tested in `content-hash.test.ts`), the cache is
correct with the fields where they are.

So the change would not have paid for itself: it is a wide mechanical refactor
across `rank.ts`, `cli.ts` and every `Deps`-building test that leaves the
guarantee identical. Recorded in ADR-0019 and PLAN.md §4 instead.

Original deferral:

Moving `pool` / `gemPalette` to `RankInput` now would touch `rank.ts`,
`cli.ts` and every test that builds `Deps`, on a branch that is otherwise
land-ready, to satisfy a hash that does not exist. **Revisit when
`contentHash` is implemented** — at that point the field's home determines
whether the cache is correct, and the change pays for itself.

`raidSimSkeleton` and `epWeights` are not in question: both are per-spec
configuration the engine cannot synthesise, and neither is a port.

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

**Tier gap closed 2026-08-02.** `ret-p4.json` (401 rows) and `ret-p5.json`
(467 rows) are generated and committed, so every tier `phase_raids.json`
advertises now loads. Both come from the same assembler with no new flags:
p4 adds Zul'Aman, p5 adds Sunwell Plateau.

Checked before committing them, since a bad universe is worse than a missing
one:

- Each tier is a strict **superset** of the one below (230 → 354 → 401 → 467),
  which is R2's inclusive-filtering rule.
- Every row's `phase <= maxPhase`, and all 14 slots are populated at both
  tiers.
- p5's 30 rows carrying a `zone: null` source looked wrong but are not — they
  are `crafted`/`pvp`/`badge`, kinds that have no raid zone by definition. The
  shipped universes already do this (12 rows at p2, 21 at p3).

`--max-phase 1` is **out of scope, not broken**: `assemble_universe.py`
accepts only 2..5 because the Wowhead list stages begin at `p1-p2`. The CLI
still exits 2 with the regeneration hint, which is the right failure.

Pinned in `pool-file.test.ts`: every advertised tier ≥2 loads through
`poolFromUniverse`, and each tier is a superset of the one below.
Mutation-checked — deleting one p3 item from p4 fails with
`p4 drops items p3 admitted: expected [ 32323 ] to deeply equal []`.

**The tier now loads, but p5's contents are not yet right.** Shipping
`ret-p5.json` made a defect reachable that did not exist before: five phase-5
items the Wowhead ret list names — four BiS-labelled, including Shard of
Contempt at 44 expertise — are absent because membership gates on raid zones.
Tracked as `.scratch/carry-forward/issues/28-p5-bis-outside-raid-zones.md`.
"Tier gap closed" here means the file exists and loads, not that a p5 run
gives good advice.

## 5. `setBonusNote` is not explanatory (§14 gate) — ALREADY RESOLVED, ticket text was stale

**No work was needed. This was fixed on 2026-07-30 by `4a9e715` ("Name the set
a swap breaks instead of printing its id"), four days before the post-merge
handoff still listed it as open.** Verified 2026-08-03 by calling
`setBreakNote` directly:

```
4pc break: breaks 4-piece Crystalforge Battlegear (below 4)
2pc break: breaks 2-piece Crystalforge Battlegear (below 2)
```

`set-bonus.ts`'s `setLabel` resolves `item.setName`, and `items.ts` carries the
field. All **299** sets in `data/items/index.json` have a `setName` on at least
one member, so the `set ${setId}` fallback is unreachable — `set-bonus.test.ts`
already pins both the exact string and that unreachability.

The ticket's example output (`breaks 2-piece set 629 (below 4)`) describes the
pre-`4a9e715` behaviour and should not be quoted as current. Its own
parenthetical — that the originating review wrongly claimed a malformed
`(below 4)` on the 2pc branch — remains correct.

Original text:

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
