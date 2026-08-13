# ADR-0019 — `contentHash` hashes what moves a number, not PLAN.md §7's field list

**Status:** accepted
**Date:** 2026-08-03
**Amends:** PLAN.md §7 (field list), §4 (the `onProgress`-once promise, and the
`Deps` shape)
**Tickets:** `.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md`
item 3; `.scratch/carry-forward/issues/24-standards-smells-cleanup.md`
"Unused `Deps` breadth"
**Handoff:** `.scratch/handoffs/contenthash-and-deps-shape.md`

## Context

`contentHash` shipped as a placeholder:

```
packages/core/src/rank.ts:355   (at a01eb84)
  contentHash: `phase1-baseline:${input.character.name.toLowerCase()}`,
```

Two characters with different gear hashed apart only if their names differed;
the same character re-gemmed hashed identically. Nothing was cached, so nothing
was served stale — but the field was already rendered in the report footer
(`rank-report.ts:267`) as a reproducibility stamp, which it could not honour.

PLAN.md §7 specifies the field list. It cannot be implemented literally: four
of its fields describe architecture that no longer exists or never shipped.
Counted in `packages/core/src/` **at `a01eb84`, before this change**:

| §7 field                | occurrences | status                                                               |
| ----------------------- | ----------: | -------------------------------------------------------------------- |
| `poolId`, `poolVersion` |           0 | superseded by ADR-0017 (per-tier generated universes)                |
| `epVersion`, `fullPool` |           0 | reference the rank-time EP prefilter ADR-0018 records as never built |
| `gearSnapshot`          |           0 | the gear _is_ read; no field carries that name                       |
| `presetVersion`         |           0 | `presetId` exists                                                    |
| `encounterProfile`      |           0 |                                                                      |
| `engineVersion`         |           0 | introduced by this change                                            |
| `simVersion`            |           8 | exists                                                               |
| `iterations`, `seeds`   |      27 / 7 | exist, on `RankInput`                                                |

The four zero rows that carry the argument — `poolId`, `poolVersion`,
`epVersion`, `fullPool` — are still zero after this change, and stay zero:

```bash
grep -rn "poolId\|poolVersion\|epVersion\|fullPool\|gearSnapshot\|encounterProfile\|presetVersion" packages/core/src/
```

## Decision

**The membership rule is "if this value changes, do the numbers change?"** —
not §7's enumeration. Hashed, each with a mutation test in
`packages/core/test/content-hash.test.ts`:

```
character (case-normalised), spec, maxPhase, race, fight,
gear { id, slot, enchant, gems },
candidates [{ itemId, slot }], gemPaletteIds, epWeights,
presetId, skeleton (by value), iterations, seeds, simVersion, engineVersion
```

Mapping to §7:

- `gearSnapshot` → **`gear`**, the logged items with enchants and gems. The
  largest input to every delta, and the one the placeholder missed.
- `poolId`/`poolVersion` → **`candidates`**, the post-filter candidate list as
  `{ itemId, slot }` pairs. ADR-0017 removed the identifiers §7 named; the set
  itself is what changes the numbers, so the set is hashed. The **slot** is
  hashed alongside the id — also a review catch — because `simSlotsForPoolSlot`
  uses it to pick which sim slots the swap is tried in (`finger` runs two
  comparisons, `neck` one), so it decides `deltaDps` and `slotChoice`. Ids
  alone served stale deltas after a pool regeneration re-slotted an item.
- `epVersion` → **`epWeights`**, hashed by value. §7 tied this to the rank-time
  prefilter (ADR-0018: never built), but the weights are _not_ dead — they
  drive meta repair and candidate gem fill, so they move numbers today.
- `fullPool` → **dropped.** ADR-0018.
- `encounterProfile` → **`skeleton`**, the `RaidSimRequest` hashed **by value**,
  plus `presetId` as a label. Hashing the label alone was a bug caught in
  pre-merge review: `PRESET_ID` is a module constant that never varies, while
  the skeleton arrives through `deps.raidSimSkeleton` carrying raid buffs,
  debuffs, talents, encounter duration and the APL rotation. Editing that file
  left the hash unchanged, and `docs/verification-log.md` (2026-07-27) measured
  stripping `prepullActions` at 789.02 DPS against a 2042.85 baseline — a 61%
  swing served from cache with no error anywhere, which is PLAN.md's stated
  worst case. `presetId` stays because it feeds `assumptions` from the same
  constant, so the disclosure cannot drift from the hash.
- `presetVersion` → **dropped.** No such field exists; `presetId` names a
  committed file, and `engineVersion` covers deliberate invalidation.
- **`gemPaletteIds`** added. Not in §7, but the palette decides how every
  candidate is socketed, so it changes deltas.

**`engineVersion` (`content-hash.ts`) is the escape hatch.** None of the other
inputs move when only our own arithmetic changes, so without it a ranking-logic
fix serves stale rankings forever. Bump it on any change to how deltas are
computed.

### The hash is taken after the gear read

Not at entry. The logged gear is unknown until `deps.gear.readGear()` resolves,
and hashing without it is unsound — the same character re-gemmed would hit the
cache and be served the old numbers. The check still lands before the sim loop,
which is the expensive part (~350 runs vs one WCL resolve at ~10.6 points).

**This amends PLAN.md §4 line 161**, which promises cache hits _"fire
`onProgress` once and resolve."_ That assumed a hash computable before any I/O.
A hit now fires `resolving`, `reading-gear`, `composing`, `building-pool`,
`ranking`. The promise that survives, and is tested: **a hit runs no sim and
ends on a terminal `ranking` event**, so a caller that opened a progress view
always gets an event to close it.

### `ViewOptions` stays out, structurally

`hashPayload` builds its object field by field rather than spreading its
argument, so a caller passing a view field cannot leak it into the hash. The
§14 gate line — _"toggling any `ViewOptions` field does not change
`contentHash` or trigger a sim"_ — is pinned by a test that fails if the
allow-list becomes a spread.

### `Deps` keeps `pool` and `gemPalette`

Ticket 23 item 3 argued they belong on `RankInput` _"because they are inputs
and they are hashed."_ They **are** hashed, as `candidateItemIds` and
`gemPaletteIds`. **The inference does not follow.** `rankUpgrades` reads both
`input` and `deps` and hashes from both, so cache correctness depends on a
field being _in the hash_, not on which parameter declares it. The stale-ranking
failure the ticket feared is prevented by hashing; relocation prevents nothing.

Moving them would touch `rank.ts`, `cli.ts` and every test that builds `Deps`,
and would only partly restore §5's "three and only three": `raidSimSkeleton`
and `epWeights` are also data, also not ports, and would stay regardless.

**`Deps` carries the three seams plus per-spec configuration the engine cannot
synthesise.** PLAN.md §4 is amended to say so.

## Consequences

- **The report footer's stamp is now true.** "Same hash, same numbers" holds;
  a re-gem changes it.
- **`deps.store` and `deps.clock` have production consumers.**
  `void deps.store; void deps.clock;` is gone, resolving ticket 24's "unused
  `Deps` breadth" as a side effect. The ranking blob is keyed
  `ranking:<hash>`, namespaced so it cannot collide with another
  content-addressed value.
- **Job rows are written on the miss path** — `create` → `running` → `done`,
  keyed by the same hash. A failed sim marks the row `error` rather than
  stranding it `running`. This is the **handle** §7's second payoff needs, not
  the payoff: `Store.job` exposes only `create`/`update`/`read`-by-id, so there
  is no `findByContentHash` and two concurrent identical calls still both sim.
  Attaching to a running job is Stage 2 web-path work.
- **`rankUpgrades` still does not read `deps.clock`.** An earlier draft of this
  ADR claimed it did; that was false. `MemoryStore` timestamps from its own
  constructor-injected clock, so the port is consumed only because `cli.ts` now
  passes the same function to both (`new MemoryStore(clock)`). The engine
  itself writes no timestamp of its own — if it ever needs one, it must take it
  from `deps.clock` rather than `new Date()`.
- **`canonicalJson` is stricter than `JSON.stringify`.** Keys sorted,
  `undefined` treated as absent, `undefined` array elements preserved as
  `null`, non-finite numbers refused rather than silently becoming `null`.
  A cache whose key varied with insertion order would never hit, and the miss
  would be silent.
- **Per-sim caching is unchanged.** `simCacheKey` in `seams/sim-runner.ts`
  still keys on `hash(request) + simVersion + seed + iterations`, hashed
  pre-injection per §7's [R6]. The two levels are independent.
- **`engineVersion` is manual.** Nothing enforces a bump on a logic change;
  that is a review item, and the cost of forgetting is stale cached rankings.

## Alternatives considered

**Hash before the gear read, to skip the WCL resolve on a hit.** Rejected as
unsound: gear would be outside the hash, so a re-gemmed character would be
served stale rankings — the exact failure the reproducibility stamp exists to
prevent.

**Two-level cache** — a cheap `RankInput` pre-hash to skip the resolve, plus
the gear-inclusive hash for the sim cache. Correct and faster, rejected as
premature: two keys and two invalidation stories in an engine that cached
nothing until this change. Revisit if the WCL budget binds.

**Implement §7 literally.** Impossible without inventing `poolId`,
`poolVersion`, `epVersion` and `fullPool` to describe architecture that ADR-0017
and ADR-0018 removed. A hash over invented constants would look rigorous and
prove nothing.

**Move `pool`/`gemPalette` to `RankInput` anyway.** Rejected above: a wide
mechanical refactor that does not change what the cache guarantees.
