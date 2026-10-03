Status: open
Type: defect
Origin: pre-merge review round 11 on feat/tab-signoff-followups, finding A2, 2026-10-03
Blocks: none
Blocked by: none
Related: 537, 526, 465

# Changing race, rotation, spec options or bonus stats does not mark the result stale

## What was found

Line numbers are in `vendor/tbc-new-fork` at fork `3613d654f`. Read them
with `git -C vendor/tbc-new-fork show 3613d654f:<path> | sed -n <from>,<to>p`.

The Upgrades tab marks a shown result stale through `markStale`, wired in
`ui/core/components/individual_sim_ui/upgrades_tab.tsx` lines 1579-1596 to
`player.gearChangeEmitter`, `player.talentsChangeEmitter`, a list of `sim`
emitters, `sim.raid.changeEmitter` and `sim.encounter.changeEmitter`. The
reviewer reports that `raid.changeEmitter` does not include the player's
emitters (`ui/core/raid.ts:58-64`), while the sim request the tab sends
holds the whole player (`makeRaidSimRequest`, `skeleton.ts:28`). So a
change to race, rotation, spec options, consumables on the player or bonus
stats would leave the old result shown with no stale notice, and Simulate
disabled (`upgrades_tab.tsx` about line 2054). Hypothesis, untested: no one
has changed one of these after a run and watched the tab.

`ui/core/components/individual_sim_ui/upgrades/run_staleness.ts` lines 2-3
say a change to "sim settings" makes the result stale, which is more than
the listeners cover.

The listener list did not change on this branch; ticket 537 made a change
during a run count, using the same listeners.

## What would close this

1. On a finished run, change race, then a rotation option, then bonus
   stats, and record whether the stale notice shows (a `pnpm tab-review`
   manifest or a test of the listener wiring).
2. If it does not: subscribe `player.changeEmitter` (or the specific player
   emitters the sim request reads) to `markStale`, with a test, and make
   `run_staleness.ts`'s comment name what is wired.
