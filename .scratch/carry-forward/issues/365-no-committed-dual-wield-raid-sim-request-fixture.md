Status: open
Type: task
Origin: .scratch/stage-gate/reforge-catchup-leftovers/brief.md
Blocks: none
Blocked by: none

# No committed dual-wield RaidSimRequest fixture (CLI test-coverage gap, CLI-only)

**What is NOT claimed: nothing here says what the engine does with a 2H +
off-hand set.** That is exactly the question that cannot be asked from committed
inputs today. What was confirmed by reading is the inventory below.

## What this is and is not

**This does not block ticket 350.** The Upgrades tab reaches 350's
two-hander-over-a-worn-off-hand case from live page state, with no fixture and
no skeleton — see `ADR-0031`. Ticket 362, which this ticket used to cite as the
reason the enhancement page could not substitute, is closed.

**This is CLI-only.** The value that remains is CLI-side reproducibility: a
recorded enh, warrior or hunter request that a test can assert against, built
through the ranker's own composition path rather than typed by hand.

The case is reachable only for the four specs in `DUAL_WIELD_SPECS` in
`packages/core/src/pool.ts` (grep for it) — `rogue`, `enh`, `warrior`,
`hunter`. Ret and feral are excluded there deliberately. That comment's own
reason — "neither can put anything in the off hand" — is **too strong read as
a statement about TBC**: druids equip off-hand held items, and `feral-p3`
carries 11 off-hand items a druid can wear — `grep -c '"handType": 3'
data/universes/feral-p3.json` returns 11, and `HandTypeOffHand = 3` comes from
the generated `packages/core/src/proto/common_pb.ts` (grep for the enum
member). What actually makes the set unreachable for these two is the
ranker's placement rule —
`simSlotsForPoolSlot` never offers them an off-hand placement — not the
game's equip rule. Corrected at the pre-merge review, finding D2; ticket 350
carries the same correction.

The committed inputs cover only the two excluded specs:

```
$ ls test/fixtures/*.raid-sim-request.json
test/fixtures/shredzepelin-cat.raid-sim-request.json     # feralCatDruid
test/fixtures/slamaltman.raid-sim-request.json           # retributionPaladin

$ ls data/presets/*/p2.raid-sim-skeleton.json
data/presets/feral/p2.raid-sim-skeleton.json
data/presets/ret/p2.raid-sim-skeleton.json
```

`loadOfflineInputs` in `packages/core/src/cli-wiring.ts` loads
`data/presets/${spec}/p2.raid-sim-skeleton.json`, so those two are the only
loadable skeletons. `data/presets/{enh,warrior,hunter}` hold `*.ep-weights.json`
and nothing else.

Hand-authoring a request instead is the thing the `hand-built` warning in
`packages/core/test/direct-sim-support.ts` (grep for it) warns against:
"hand-built character JSON (the ticket 106 style) can differ from what
`rank.ts` actually sends in gems and buffs".

## If built: how

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
- [ ] ~~Ticket 350 step 1 is run against it and its result written down.~~
      Struck: the owner declined that engine measurement on 2026-09-10
      ("sounds like a waste of processing"). Replaced by — a CLI test can
      compose a dual-wield request through the ranker's own path.
- [ ] The iteration count used is justified against the noise floor above.

## Notes

Filed from the reforge-catchup-leftovers investigation; full record in
`.scratch/stage-gate/reforge-catchup-leftovers/probe/results.md`.

## Comments

**2026-09-10 — rescoped to a CLI-only test-coverage gap.** This ticket no
longer blocks 350, and the two claims that made it look blocking are gone: the
tab reaches 350's case from live page state with no fixture, and ticket 362 (the
item-swap panic that stopped the enhancement page substituting) is closed. The
reasoning and its measurements are in `ADR-0031`; the related question of
whether to generate skeletons for the other nine specs is ticket 367, which
found no consumer for them today.
