# ADR-0016 — The second `GearSource` and `Store` adapters move to Phase 2

**Status:** accepted
**Date:** 2026-07-30
**Supersedes:** the Phase 1 timing commitment in PLAN.md §5 (not the rule itself)
**Ticket:** `.scratch/carry-forward/issues/19-second-adapter-gear-source-store.md`

## Context

PLAN.md §5 states the discipline plainly:

> _one adapter is a hypothetical seam; two adapters is a real one._ Each seam
> below has two adapters that both actually get built, in Phase 1, and both
> actually get used.

Phase 1 ships three seams. Verify what each actually has with:

```bash
grep -rn "implements SimRunner\|implements GearSource\|implements Store" packages/core/src/seams/
```

At `4a9e715` that returns:

| Seam         | Adapters                            | Meets §5 |
| ------------ | ----------------------------------- | -------- |
| `SimRunner`  | `CliSimRunner`, `RecordedSimRunner` | yes      |
| `GearSource` | `RecordedGearSource`                | **no**   |
| `Store`      | `MemoryStore`                       | **no**   |

PLAN.md §5 also names `SqliteStore` and `WclGearSource` in the target layout.
Neither exists.

The consequence is not that anything is broken — every Phase 1 claim about
running offline from committed fixtures is true. It is that those claims are
**unfalsifiable**. With a single adapter there is no evidence the port boundary
is in the right place: a port that has only ever been implemented by a recorded
fixture reader may well have absorbed assumptions about the recorded format,
and nothing would reveal it until the second implementation is written.

The remaining work is not small. `WclGearSource` needs live WCL authentication,
rate limiting and API point budgeting — which is most of what PLAN.md already
scopes as Phase 2's caching work. Building it inside Phase 1 would pull a
Phase 2 concern into a phase whose gate is otherwise complete (§14, 9/9 in
`docs/verification-log.md`), to satisfy a rule about design confidence rather
than to make anything work.

## Decision

The second `GearSource` adapter (`WclGearSource`) and the second `Store`
adapter (`SqliteStore`) are **deferred to Phase 2**. Phase 1 ships one adapter
each for those two seams.

The §5 rule itself is **not** repealed. Two adapters per seam remains the
standard; only the phase in which `GearSource` and `Store` meet it moves. The
`SimRunner` seam already meets it and is the worked example of what the other
two owe.

Phase 2 is not considered complete until both exist and are used.

## Consequences

- Phase 1's "runs deterministically offline from committed fixtures" claim
  stands but stays unfalsifiable for those two seams. It should not be cited as
  evidence that the seam boundaries are correct.
- Seam-shape risk is **deferred, not avoided**. If `GearSource` turns out to be
  shaped around `RecordedGearSource`'s fixture format, that is discovered in
  Phase 2, and the fix then costs a change to both implementations at once
  rather than one.
- `MemoryStore` remains the only persistence in Phase 1, so nothing exercises
  serialization or partial-write behaviour. No Phase 1 result depends on
  persistence surviving a process restart.
- This ADR is the record that the gap is known and chosen. A future review
  finding one adapter on these seams should land here, not re-open it as a
  defect.

## Alternatives considered

**Build `WclGearSource` in Phase 1.** Full compliance, but imports live-auth,
rate-limiting and point-budgeting work into a phase that is otherwise done, and
duplicates effort Phase 2 has already scoped.

**Build only the second `Store` adapter now.** Substantially cheaper than
`WclGearSource` and would make one more seam real. Rejected for this ADR
because it satisfies half a rule for the half that carries less risk — the
`GearSource` boundary is the one with an external system behind it, and so the
one where being wrong costs the most. Worth revisiting if Phase 2 slips.

**Amend §5 to require two adapters only where a second is cheap.** Rejected:
that converts a discipline into a preference, and the seams where a second
adapter is expensive are exactly the ones where the boundary is hardest to get
right by inspection.
