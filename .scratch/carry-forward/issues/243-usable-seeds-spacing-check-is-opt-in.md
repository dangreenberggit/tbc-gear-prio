Status: open
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

- [ ] One option above chosen and recorded here with its reason.
- [ ] No call site can request a spacing-unchecked multi-seed replication by
      omitting an argument.
- [ ] `se.test.ts:117-120` updated to match whichever contract is chosen.
- [ ] `pnpm verify` green.
