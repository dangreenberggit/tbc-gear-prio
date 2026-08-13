Status: closed
Closed: c2d3897
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

---

## Closed (2026-08-10) — corrected mirror plus a drift gate, `c2d3897`

Took the ticket's middle path: kept the hand-written map (corrected) and made
recurrence impossible with a check, rather than building codegen.

**Why not `generate_json_literal_types.py`.** That generator reads a **JSON**
list and emits an `as const` union. `CURATED_SET_PHASE` is a Python *dict
literal* mapping label to phase number, not a JSON file and not a string list,
so routing it through that machinery would have meant adding a JSON export step
to `assemble_universe.py` and a new generator mode — more moving parts than the
one-line drift warrants, and the ticket said not to over-engineer.

**What shipped:**

1. `p3: 3` added to `packages/core/src/rank-report-rules.ts`.
2. The test-locked wrong expectation (`curatedSetPhase("p3") -> null`) inverted;
   the unrecognised-label case now uses `p9`, which is genuinely unrecognised.
3. `scripts/check_curated_set_phase.py` — parses the TS object literal and
   compares it to `assemble_universe.CURATED_SET_PHASE`, wired into
   `pnpm verify` as `pnpm curated-set-phase:check`.
4. The TS docstring now names `assemble_universe.py` as the source of truth and
   points at the gate.

Verify:

```
python scripts/check_curated_set_phase.py
grep -n "CURATED_SET_PHASE" packages/core/src/rank-report-rules.ts scripts/assemble_universe.py
```

**The gate was proved to fail, not just to pass:** deleting the `p3: 3` line and
re-running the check exits 1 with
`p3: assemble_universe.py=3 rank-report-rules.ts=None`. Restored before commit.
