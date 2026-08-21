Status: resolved
Type: defect (latent; no caller uses the unsafe form today)
Origin: pre-merge review round 4 of `feat/candidate-pool`, 2026-08-20 (adversarial axis)
Blocks: none
Blocked by: none

# `assertUsableSeeds` makes the ticket-236 spacing check opt-in

## The finding

`packages/core/src/se.ts:44-49` declares:

```ts
export function assertUsableSeeds(
  seeds: readonly number[],
  iterations?: number
): void {
```

and at `:63` the spacing check — the entire fix for ticket 236 — sits behind:

```ts
if (iterations === undefined) return;
```

The distinctness check above it always runs. Only the *spacing* check, which is
what ticket 236 added, is optional.

## Why this matters

Ticket 236's defect was that `DEFAULT_SEEDS = [11, 22, 33, 44, 55]` at 3,000
iterations share most of their RNG streams, so the paired-replicate SE derived
from their spread is far too small — a plausible-looking precision number that
is an artifact. PLAN.md names a confidently wrong number with no error anywhere
as the project's worst case.

The guard against that defaults to off, and the function is exported from the
public barrel (`packages/core/src/index.ts:12`) alongside the safe constructor
`replicateSeeds` (`:14`).

`packages/core/test/se.test.ts:119` asserts the condemned seed set does not
throw in the one-argument form:

```ts
expect(() => assertUsableSeeds([11, 22, 33, 44, 55])).not.toThrow();
```

## Not an oversight — a documented choice

`se.test.ts:118` records the rationale: "Callers that cannot know the iteration
count keep the old contract." The objection is not that the author missed it;
it is that **no such caller exists**. Verified at `88c1c1e`:

```
grep -rn "assertUsableSeeds" packages/core/src
```

returns the definition, the barrel export, and exactly one call —
`packages/core/src/rank.ts:684`, which passes `iterations`. Behavior today is
correct. The escape hatch is unused, public, and re-enables the exact failure
the ticket removed.

## Options (needs a judgement call, not a mechanical fix)

1. **Make `iterations` required.** Any caller omitting it becomes a compile
   error rather than a silent downgrade. Cheapest, and the reason the reviewer
   flagged it. Costs the documented "old contract" affordance.
2. **Split the API** — `assertDistinctSeeds` (no iterations) and
   `assertUsableSeeds` (required iterations), so a caller that genuinely cannot
   know the iteration count asks for the weaker check by name instead of by
   omitting an argument.
3. **Leave it, drop the public export.** Keep the optional form for internal
   use but take `assertUsableSeeds` off the barrel, so the unsafe call is not
   reachable from outside the package.

Option 2 is the one that keeps the stated affordance without making silence the
default. Recording all three rather than picking, because the "old contract"
line implies an intended caller whose identity should be confirmed first.

## Acceptance

- [x] One option above chosen and recorded here with its reason.
- [x] No call site can request a spacing-unchecked multi-seed replication by
      omitting an argument.
- [x] `se.test.ts:117-120` updated to match whichever contract is chosen.
- [x] `pnpm verify` green.

## Resolution (2026-08-20)

**Option 2 — split the API.** `assertDistinctSeeds(seeds)` now carries the
distinctness check, and `assertUsableSeeds(seeds, iterations)` takes a
**required** `iterations` and runs distinctness plus spacing. Both are on the
public barrel (`packages/core/src/index.ts`); `rank.ts:684` was already passing
`iterations` and is unchanged, so behaviour today is identical.

### First: the "old contract" caller does not exist

The ticket deferred because `se.test.ts:118` implied an intended caller. Swept
wider than the original `packages/core/src` check — the whole repo including
gitignored trees (`vendor/tbc-new-fork` is present, ~its own `node_modules`
excluded for walk time):

```
grep -rn --binary-files=without-match "assertUsableSeeds" . --exclude-dir=.git
grep -rn --binary-files=without-match "assertUsableSeeds" vendor/tbc-new-fork   --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git
```

Outside `packages/core` there are exactly two kinds of hit, neither a caller:

- **`vendor/tbc-new-fork/.../upgrades/engine/se.ts`** — a *verbatim port*, not a
  consumer. It never imports this package (`PROVENANCE.md` documents it as a
  copied snapshot gated by `scripts/check_engine_port_drift.py`). Its own copy
  predates ticket 236 and has no `iterations` parameter at all, so it could not
  have been the caller the comment meant.
- **`.claude/worktrees/*`** — stale agent worktrees holding pre-236 snapshots of
  this same file.

So the escape hatch was unused, and option 1 breaks nothing.

### Why option 2 over option 1

Option 1 (just make it required) was cheaper and would have been defensible.
Option 2 won because the sweep turned up the thing the ticket was missing: the
fork port **is** the real-world shape of a distinctness-only check — a surface
that legitimately has no iteration count to give. That use is real even though
it is not a caller of this function, so the weaker check deserves a name rather
than being deleted. Naming it also makes the choice legible at the call site:
asking for `assertDistinctSeeds` is a visible decision, where omitting an
argument was silent. Option 3 was rejected because it left the silent downgrade
intact for anything inside the package, which is where the sole caller lives.

`se.test.ts:117-120`'s assertion that `[11, 22, 33, 44, 55]` does not throw in
the one-arg form is gone. The replacement pins the new contract: that seed set
throws from `assertUsableSeeds(..., 3000)`, and passes `assertDistinctSeeds`
only under that explicit weaker name.

### Ran

- `pnpm -C packages/core exec vitest run test/se.test.ts` — red first
  (`assertDistinctSeeds is not a function`), then 22 passed.
- `pnpm verify` from the repo root — **exit 0** (captured directly), including
  `engine-port-drift:check` (33 ported files still match; the gate hashes the
  fork's files, not core's).
