Status: open
Type: bug
Origin: pre-merge review of `feat/set-bonus-value`, 2026-08-10 (domain axis)
Blocks: none
Blocked by: none

# CURATED_SET_PHASE has drifted from the Python it claims to mirror

`packages/core/src/rank-report-rules.ts:219-223` declares:

```ts
const CURATED_SET_PHASE: Record<string, number> = {
  preraid: 1,
  p1: 1,
  p2: 2,
};
```

and its docstring says it "Mirrors `CURATED_SET_PHASE` / `curated_set_phase` in
`scripts/assemble_universe.py`". That file — **as edited on this same branch** —
reads:

```python
scripts/assemble_universe.py:354
CURATED_SET_PHASE: dict[str, int] = {"preraid": 1, "p1": 1, "p2": 2, "p3": 3}
```

The TypeScript stops at `p2`. It is a hand-copied second source of truth that
was not updated when the branch pinned P3 curated sets
(`assemble_universe.py:225-226`, commit `02f2f85`).

Verify:

```
grep -n "CURATED_SET_PHASE" packages/core/src/rank-report-rules.ts scripts/assemble_universe.py
```

## Why it matters — a silent suppression, not a visible error

`curatedSetPhase` feeds exactly one consumer: `bisStale` at
`rank-report.ts:442-444`. The chain:

1. A future P4/P5 rank falls back to a `p3` label, because
   `bis_set_labels_for_max_phase` degrades to the newest vendored stage
   (`assemble_universe.py:396-403`).
2. `curatedSetPhase("p3")` returns `null` from the stale TS map.
3. `bisStale` computes `false`.
4. The "**No curated set is pinned for P4**" warning **silently does not
   render**.

The reader is shown a P3 BiS list under a P4 heading with no staleness note —
precisely the overclaim the comment at `rank-report.ts:433-436` says the warning
exists to prevent. It fails in the direction that looks correct.

**Latent today**, not live: feral maxes at p3 vendored, so no current run takes
that path. It bites the moment p4 is pinned.

## Note: the current behaviour is test-locked

`packages/core/test/rank-report.test.ts:1363` asserts
`curatedSetPhase("p3") → null`. So this is asserted behaviour, not an untested
oversight — fixing the map means fixing that assertion too, and whoever wrote it
recorded the wrong expectation rather than catching the drift.

## Fix

Add `p3: 3` (and keep the two sources in step). Better: remove the hand-copied
mirror entirely. The repo already has machinery for exactly this class of
problem — `scripts/generate_json_literal_types.py` emits committed `as const`
TypeScript gated by `pnpm verify`, and AGENTS.md's "types from JSON" section
exists because hand-mirroring a Python/JSON source into TypeScript has bitten
this repo before. A generated mirror would make this drift impossible rather
than merely fixed once.
