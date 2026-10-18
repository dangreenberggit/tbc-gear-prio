Status: open
Type: bug
Origin: pre-merge review feat/tab-wowsims-items, A9 (outside the diff)
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on

# Hunter and warrior preset set keys collide

The tab keys a preset set as `preset:${phase}:${name}` (fork
`ui/features/upgrades/model/settings_pool.ts` `setOptions`). Hunter has 14 and
warrior 6 (phase, name) pairs that occur more than once, for example hunter
phase 1 "2H - 6% hit" and warrior phase 2 "BIS" (Python count over fork
`ui/features/upgrades/model/pool_source.presets.fixture.json`). Two set chips
then share one key, so ticking one may tick the other (hypothesis, untested in
the browser). The key format is the same at fork `160ae36c2`, so this predates
ticket 505.

## Done means

Every preset set option has a unique key, with a test over the presets
fixture, and a saved pick still restores the set it named.
