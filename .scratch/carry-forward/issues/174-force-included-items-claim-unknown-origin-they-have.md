Status: open
Type: data honesty
Origin: orchestrator fan-in, ticket sweep 154–164, 2026-08-14
(surfaced by `packages/core/test/pool-hardening.test.ts` failing on
`feat/sweep-ret-tickets`)
Blocks: none
Blocked by: none

# Force-included items ship `kind:unknown` while their origin is recorded

`ItemSource`'s `unknown` variant documents itself as "origin not recorded by
any input" (`packages/core/src/pool.ts`), and
`pool-hardening.test.ts`'s "reserves kind:unknown for items no input mentions
at all" enforces that meaning: an item a Wowhead list names must never ship as
`unknown`, because a list naming it means the origin *was* available and the
parser dropped it.

Ticket 157's six force-included items break that contract. Their origin **is**
recorded — in `TICKET_157_FORCE_INCLUDE`'s own dict values, as human-readable
prose:

```python
27484: "Drop: The Maker (Blood Furnace, Heroic)",
31033: "Quest: News of Victory",
22401: "Drop: Isalien (Dire Maul East, normal)",
31856: "Quest: Darkmoon Blessings Deck (BoE trinket)",
28034: "Drop: Temporus (The Black Morass, normal)",
28288: "Drop: Pathaleon the Calculator (The Mechanar, normal)",
```

but they are emitted as `{"kind": "unknown", "origin": "curated"}`, because the
closed `ItemSource` vocabulary has no variant that can carry that text. So the
artifact asserts "nobody knows where this came from" about six items whose
source is written down three files away.

## How it surfaced

The test only reads `feral-p3.json`, and before this sweep none of the six were
in a feral universe, so nothing tripped. Once 28034 entered feral — legitimately,
as a member of upstream's `feral_preraid.gear.json` — the test failed:

```
28034 Hourglass of the Unraveller is on a Wowhead list but shipped as
kind:unknown — the parser dropped its prose
```

Verified that this is **not** caused by the ret gate added at `b2da640`: with
the force-include temporarily ungated, 28034 still ships `kind:unknown` in
feral. The same dishonesty already applies to all six in the ret universes; the
test simply does not read those files.

Worked around at fan-in by excluding the six ids explicitly in that test, with
a comment pointing here. The exclusion is a literal id list rather than a
predicate, so a **new** item acquiring this shape still fails the test.

## Done when

The six carry a source that says what is actually known about them, and the
test exclusion is deleted. Options, in rough order of preference:

- Add a variant that carries prose, e.g. `{kind: "documented", text: string}`,
  and use it for exactly this case. Costs a change to a closed vocabulary that
  consumers branch on (`view.ts`'s `matchesZone`, the report filters) — check
  every consumer treats an unrecognised kind the way `unknown` is treated
  today, i.e. excluded from zone and boss filters.
- Teach `map_db_source` the two shapes that defeat it (five-man zones absent
  from `phase_raids.json`/`PHASE_HEROIC_DUNGEONS`, and the `" - Heroic"`
  suffix `WOWHEAD_HEROIC_ZONE_RE` misses), so these six resolve normally and
  the force-include set disappears. This is the real fix and it is ticket 17's
  deferred ~280-item question — see ticket 173.

Until then the artifact is honest about *membership* and dishonest about
*provenance* for six rows, which is the milder of the two failure modes but is
still a claim the data cannot support.
