Status: open
Related: 293, 678
Type: detection gap
Origin: adversarial axis, pre-merge review of `feat/sweep-ret-tickets`, 2026-08-14
(`docs/reviews/feat-sweep-ret-tickets.md`, finding A2)
Blocks: none
Blocked by: none

# The source-parse gap has no detector, only a manual rescue list

Ticket 157 fixed six items by name. The **general defect it documents is
untouched**, and is stated plainly in the code's own comment at
`scripts/assemble_universe.py:96-118`:

- `map_db_source` cannot resolve a five-man zone that is absent from
  `phase_raids.json` and from `PHASE_HEROIC_DUNGEONS`.
- `WOWHEAD_HEROIC_ZONE_RE` does not match a `" - Heroic"` suffix.

An item hitting either path is dropped into `excludedNoSource` (1298 items) and
simply never appears in the universe. No error, no warning, no failing test.

The allowlist is the right *shape* for this branch — widening
`PHASE_HEROIC_DUNGEONS` would admit roughly 280 unrelated phase-1 items and
reopen ticket 17's deferred question, a far larger blast radius than this
sweep. The problem is that **the only thing that caught these six was a human
SME reading a ranking and noticing famous librams were missing.**

`ticket157ForceIncluded` is emitted into each report, which is good provenance,
but it records what was *manually rescued*, never what is *still being lost*.

## Evidence that the list will drift

The domain axis of the same review found two items still in `missedItems` that
are in the same class as the six that were fixed — TBC-era, `d7Eligible: true`,
rejected by the zone gate rather than by any deliberate rule:

- **27878** Auchenai Death Shroud
- **29247** Girdle of the Deathdealer

The line was drawn at "what the SME happened to name", not at "what the
criterion implies". Verify with:

```bash
python -c "import json; d=json.load(open('data/universes/ret-p3.report.json',encoding='utf-8')); print([m for m in d['wowheadRecall']['missedItems'] if m.get('d7Eligible')])"
```

## Done when

A regression that increases the silently-dropped set trips a test instead of
waiting for an SME. The concrete suggestion from the review: pin the size or
the membership of `excludedNoSource` in `packages/core/test/pool-hardening.test.ts`,
the same way `universeP3.length` is already pinned there, so the number cannot
move without someone looking at it.

That is a tripwire, not a fix. The real fix — teaching `map_db_source` about
five-man zones and the `" - Heroic"` suffix — is ticket 17's deferred question
and should stay deferred until someone is ready to absorb the ~280-item
consequence deliberately.

## Note

Do not resolve this by adding 27878 and 29247 to `TICKET_157_FORCE_INCLUDE`.
That grows the manual list without adding detection, which is the exact
failure mode this ticket is about.

## Partly answered (2026-08-23, ADR-0028)

This ticket says "nothing detects the next silently dropped item". Something
does now, for phase 3: `pnpm pool-listings:check` regenerates
`data/pool-listings/{ret,feral}-p3.md` on every `pnpm verify` and fails when
the committed listing no longer matches what the data produces. An item that
leaves the pool changes a listing, and the diff has to be read before the
commit lands.

It is a better tripwire than the one this ticket suggested -- it names the
item and the rule rather than pinning a count -- but read what it does not do
before calling this closed:

- It covers **phase 3, ret and feral**. Other phases and specs are
  unwatched.
- It is a **byte-compare, not a judgement**. A regeneration that drops an
  item passes the gate the moment someone commits the regenerated listing.
  The protection is that the diff is legible and item-named, not that the
  gate refuses.
- It does **not** fix `map_db_source`. Ticket 17's deferred question and its
  ~280-item consequence are untouched.
- The audit's own zero-unexplained property is real but narrow: it says
  every difference has a citable rule, not that every rule is right.

The ticket's closing warning still holds -- do not resolve this by growing
`TICKET_157_FORCE_INCLUDE`. The listing exists so that growth is visible.

Re-runnable: `pnpm pool-listings:check`.

## Comments

2026-10-16 (stage tab-source-labels): carried forward as ticket 678, a
`pnpm verify` gate over every committed universe report, to be written
after stage tab-source-labels part P2 lands. Close this ticket when 678
closes.

## Partial resolution (2026-10-17, stage tab-follow-ups)

Stage tab-follow-ups closed this with ticket 678; the pre-merge review reopened it (see § Reopened below). A Wowhead-list-named item that newly lands in
`excludedNoSource`, or leaves its universe for any other cause, now fails
`pnpm verify` as `NEW GAP <spec> p<n> <itemId> <name> absent`, for ret and
feral at every phase 2-5. 27878 and 29247 are tolerated rows of
`data/wowhead-list-gaps.json` (reason `sourcedNoRoute`), not force-included;
`TICKET_157_FORCE_INCLUDE` did not grow. The fix itself (five-man zones,
the `" - Heroic"` suffix) stays with ticket 17.

Verified by: `pnpm wowhead-list-gaps:check` at `tbc-gear-prio@f4951822`.

## Reopened 2026-10-17 (pre-merge review of feat/tab-follow-ups, finding P1)

This ticket asked: "A regression that increases the silently-dropped set
trips a test". `pnpm wowhead-list-gaps:check` covers only items a Wowhead list
names, and only ret and feral have list folders (`SPEC_PROFILES`
`wowhead_dir` in `scripts/assemble_universe.py`): 8 of the 44 universes. An
item no list names, on any spec, or any item on the nine specs without lists
(balance, ele, enh, hunter, mage, rogue, shadow, warlock, warrior), that lands
in `excludedNoSource` is caught only by `pnpm universe-rebuild:check`, which
passes again once the regenerated universe is committed. That is the weakness
this ticket's § above already called not enough.

Remaining scope: a detector for that remainder that needs no Wowhead list,
using a direct signal the builder does not itself produce (for example, the
items wowsims' own curated gear sets equip for a spec, or a committed record
of each universe's excluded ids that may only shrink). Ticket 293's per-spec
list harvest would also widen the existing check to more specs; it is the
route that needs lists.
