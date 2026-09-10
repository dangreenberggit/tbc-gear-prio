Status: open
Type: task
Origin: .scratch/stage-gate/reforge-catchup-leftovers/brief.md
Blocks: none
Blocked by: none

# No committed dual-wield RaidSimRequest fixture, so ticket 350 step 1 cannot run

**What is NOT claimed: nothing here says what the engine does with a 2H +
off-hand set.** That is exactly the question that cannot be asked from committed
inputs today. What was confirmed by reading is the inventory below.

## Why 350 is stuck

Ticket 350 is reachable only for the four specs in `DUAL_WIELD_SPECS` —
`rogue`, `enh`, `warrior`, `hunter` (`packages/core/src/pool.ts:373-378`). Ret
and feral are excluded there deliberately, in the comment's own words, because
"neither can put anything in the off hand".

The committed inputs cover only the two excluded specs:

```
$ ls test/fixtures/*.raid-sim-request.json
test/fixtures/shredzepelin-cat.raid-sim-request.json     # feralCatDruid
test/fixtures/slamaltman.raid-sim-request.json           # retributionPaladin

$ ls data/presets/*/p2.raid-sim-skeleton.json
data/presets/feral/p2.raid-sim-skeleton.json
data/presets/ret/p2.raid-sim-skeleton.json
```

`packages/core/src/cli-wiring.ts:126-128` loads
`data/presets/${spec}/p2.raid-sim-skeleton.json`, so those two are the only
loadable skeletons. `data/presets/{enh,warrior,hunter}` hold `*.ep-weights.json`
and nothing else.

Hand-authoring a request instead is the thing
`packages/core/test/direct-sim-support.ts:15` warns against: "hand-built
character JSON (the ticket 106 style) can differ from what `rank.ts` actually
sends in gems and buffs".

## What to build

A recorded dual-wield fixture, captured through the real composition path rather
than written by hand.

- **Source to build from:** the fork's own enhancement preset,
  `vendor/tbc-new-fork/ui/shaman/enhancement/gear_sets/p1.gear.json`, which
  wears item 28308 in both index 14 and index 15 — a 1H+OH set, the right shape.
  Its APL is `ui/shaman/enhancement/apls/default.apl.json`. Warrior has the
  equivalent under `ui/warrior/dps/gear_sets/p*_fury.gear.json`.
- **How to capture it:** run the ranker and intercept what it builds, the way
  `direct-sim-support.ts` describes (`CapturingSimRunner`), so the fixture is
  what `rank.ts` sends rather than what someone typed.
- **Runner for the measurement:** the pinned CLI at
  `vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64`, which
  reports its own pin via `wowsimcli-windows.exe version`.

## What the measurement must look like

Sized here so the fixture is not built to the wrong shape.

- **The effect must be the off-hand swing, not the off-hand stats.** A 1H+OH set
  versus the same set with a two-hander in the main hand and the off hand left
  in place.
- **A stat-only delta cannot be resolved at 3000 iterations.** The committed
  feral result has `stdev = 127.9659250680645` at `iterationsDone 3000`, so the
  3σ floor on the mean is `3 · 127.966 / √3000 = 7.01 DPS` — larger than a +8
  Agility off-hand contributes on a ~2152 DPS character.
- **Raise iterations** until that floor sits well under the expected effect.
- **Compare with a tolerance, never exact equality.** Same seed, `simVersion`
  and core count give bit-identical results, but across core counts the sim
  splits iterations over `runtime.NumCPU()` shards and agrees only to ~1e-12 DPS
  (`docs/plans/compute-topology.md:177`); the standing rule at `:207-209` is
  that live-binary float assertions use `toBeCloseTo`.

## Acceptance

- [ ] A dual-wield `RaidSimRequest` fixture exists, captured through the
      ranker's own composition path, with its player key recorded.
- [ ] Ticket 350 step 1 is run against it and its result written down.
- [ ] The iteration count used is justified against the noise floor above.

## Notes

Filed from the reforge-catchup-leftovers investigation; full record in
`.scratch/stage-gate/reforge-catchup-leftovers/probe/results.md`. Ticket 350 is
`Blocked by: 365`. Note the enhancement page cannot substitute for this today —
its Upgrades run aborts on an item-swap item (ticket 362).
