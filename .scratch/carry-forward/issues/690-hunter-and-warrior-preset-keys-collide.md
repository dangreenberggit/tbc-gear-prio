Status: closed
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

## Closed, 2026-10-20 (stage dps-spec-coverage)

Verified by: tbc-new-fork@833e333ff, test `ui/features/upgrades/model/preset_keys.test.ts`
(re-run in the fork: `npx vitest run ui/features/upgrades/model/preset_keys.test.ts`),
and the hunter live run at tbc-new-fork@c89b0b912

The key is `preset:${phase}:${group}/${name}` when wowsims gives the preset a
`group` (hunter: Beast Mastery / Survival; warrior: Fury / Arms), and is
unchanged otherwise, so saved picks for the other nine specs still restore
(`settings_pool.test.ts`, "restores a saved pick of an ungrouped preset by its
old key"). A chip label and a row badge add " (<group>)" only when another set
shares the phase and the name. The unique-keys test covers every spec
(hunter 31 keys, warrior 12).

Live run, hunter at phase 3 with the Phase 2 "DW - 6% hit" preset worn: the
Sim sets list held 31 chips before, after ticking "P2 - DW - 6% hit (Beast
Mastery)", and after unticking it; only the ticked chip turned on, and its
Survival twin stayed off. The dev-server log had no "same key" error (the run
on 2026-10-19 logged 709). Record: the pair's gitignored
`.scratch/agent-reports/2026-10-20-live-dps-spec-coverage.md`, section 3.

Not restored (pre-merge review feat/dps-spec-coverage, P1): a hunter or warrior
pick saved under the old key matches no option now, and `setSelection` drops
it without a message (fork `settings_pool.ts`, `setSelection`). The old key
named two sets at once, so there is no single set to restore it to, and the
tab has no users outside development (no deploy; tab-1 deferred), so the
pick is lost once on a development browser only.
