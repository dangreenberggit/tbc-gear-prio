Status: closed
Type: task
Origin: docs/reviews/feat-dps-spec-coverage.md (round 2, F1)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# No test checks that the run panel's eligible count follows the worn weapon

Since the P2 fix on feat/dps-spec-coverage, the run panel's "{{count}}
eligible items" leaves out off-hand-only items while a two-hander is worn.
`useUpgradesSettings` reads the worn main hand with
`usePlayerStore('gear')` and passes it to `eligibleCountOf` (fork 766e87be2,
`ui/features/upgrades/hooks/useUpgradesSettings.ts:55,101-107`). The pure
rule has a test (`model/settings_pool.offhand.test.ts`), but no test drives
the hook with a worn weapon: breaking the `wornMainHandId` wiring, or the
count's update after a weapon swap, would pass every test
(`grep -n gear ui/features/upgrades/hooks/useUpgradesSettings.test.tsx`
finds gear only in the presets). The round-2 check read the code as correct
(hypothesis, untested).

## Done means

A hook-level test wears a two-hander, reads the count, swaps to a one-hander,
and sees the count rise by the held-out off-hand items; the test fails with
the `wornMainHandId` argument removed.

## Closed, 2026-10-20 (stage dps-spec-coverage)

Verified by: tbc-new-fork@4bb8da4f2, test `ui/features/upgrades/hooks/useUpgradesSettings.offhand.test.tsx`
(re-run in the fork: `npx vitest run ui/features/upgrades/hooks/useUpgradesSettings.offhand.test.tsx`)

The test mounts `useUpgradesSettings` for a mage at phase 3 over a pool of
three off-hand-only items, a one-hander and a two-hander. Wearing The Nexus
Key (two-hander) it reads 2 eligible items; after a swap to Emerald Ripper
(one-hander), written to the player's sim store as the gear tab does, it reads
5; after a swap back it reads 2 again.

Red check: with the hook's `wornMainHandId` argument to `eligibleCountOf`
replaced by `wornMainHandId: undefined`, the test fails with "expected 5 to
be 2". The edit was reverted before the commit.
