Status: open
Type: task
Origin: pre-merge review of `phase-2/caches` (domain axis), 2026-08-05
Blocks: phase-4
Blocked by: none

# Nothing reads `rateLimitData`, so the point budget cannot be measured

The domain axis of the `phase-2/caches` review raised this against PLAN.md §15's
risk table, which pairs the permanent gear cache with **`rateLimitData`
monitoring**. `phase-2/caches` built the cache; the monitor does not exist.

Nothing in `packages/core/src/` reads or exposes `rateLimitData`:

```bash
grep -rn "rateLimitData" packages/core/src/
```

## Why this is not a `phase-2/caches` defect

§5.1 puts WCL's rate-limit surface behind the WCL adapter, and there is no WCL
adapter yet — `GearSource` has only `RecordedGearSource` and
`CachingGearSource`. So there is no place for this to live until the adapter
lands. Filing it rather than fixing it is the correct call for that branch.

## Why it matters later

The §14 **Phase 4** gate box is *"point budget survives expected concurrency"*.
That box cannot be checked off by argument — it needs a number, and today no
code can produce one. Measured budget from `docs/phase0-findings.md`: 3,600
points/hour, ~10.6 points per resolve, 41.3 points for a whole Phase 0 sitting.

Note the cache makes the budget *look* fine in casual testing precisely because
the second run costs nothing — which is why an instrument, not a vibe, is what
closes the gate.

## Done when

- The WCL adapter surfaces `rateLimitData` (points remaining / reset) from the
  responses it already receives.
- Something can report points consumed for a run, so the Phase 4 gate box has
  evidence behind it rather than an assertion.
