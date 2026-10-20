Status: open
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
