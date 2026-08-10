Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (standards axis)
Blocks: phase-3
Blocked by: WclGearSource / going-live plan (PLAN.md §14 Phase 3, "Flagged, not planned: going live on GearSource") — not yet built

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
