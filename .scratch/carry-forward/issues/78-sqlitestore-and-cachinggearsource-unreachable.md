Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (standards axis)
Blocks: none
Blocked by: none

# `SqliteStore` and `CachingGearSource` are exported and tested but no production path constructs either

`SqliteStore` (`seams/store.ts`) and `CachingGearSource`
(`seams/gear-source.ts`) are both exported from `index.ts` and covered by
tests, but `cli.ts` (around line 358) still builds `MemoryStore`, and
`RecordedGearSource` is the only gear source ever wired in. Related to
tickets 31 and 32 (SqliteStore internals, and the missing `rateLimitData`
instrument) but distinct: this is about the adapters never being reachable
at all, not about defects within them.

`CachingGearSource`'s own docstring calls the gear cache "the primary
defence of the WCL point budget" — a budget nothing currently defends
because nothing constructs it.

Not a defect today (PLAN.md explicitly scopes Phase 0-2 to offline/recorded
fixtures), but real dead-code risk once Phase 3's "going live on GearSource"
planning pass happens — that pass should either wire both adapters in or
explain why not.

## What to do

When the Phase 3 live-`GearSource` plan lands (PLAN.md §14 flags this as not
yet scoped), wire `CachingGearSource` and `SqliteStore` into the real
call site, or if they're not the chosen path, remove them rather than
carrying unreachable adapters indefinitely.

## Closed 2026-08-22 — Stage 3 web shell

`SqliteStore` now has a production call site. `apps/web/server/wiring.ts`
constructs it against `<root>/.data/app.db` whenever `DATABASE_URL` is set,
falling back to `MemoryStore` otherwise, so the adapter is reachable rather
than exported-and-unused. No Stage 3 gate box needs state to survive a
restart — that is Stage 4's "caches survive restart" — so the default stays
in memory and the SQLite path is an opt-in, not a durability claim.

`CachingGearSource` is the other half and it cannot be closed the same way:
it caches an *inner* gear source, and the only source Stage 3 wires is
`RecordedGearSource`, which reads committed fixtures. Wrapping a fixture
reader in a cache would be a call site with no purpose. It moves to ticket
263, the live-`WclGearSource` ticket, where a real API to defend actually
exists — that ticket carries it as item 8, alongside ticket 32's
point-budget instrument.
