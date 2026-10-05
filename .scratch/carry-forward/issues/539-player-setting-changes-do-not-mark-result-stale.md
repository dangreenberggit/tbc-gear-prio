Status: closed
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

## Pre-registered outcome (written 2026-10-04, before the live check)

Code trace at fork `e413972db`: `Player.changeEmitter` is `onAny` of all
17 player emitters, race, rotation, spec options, consumes and bonus stats
among them (`ui/core/player.tsx:338-358`). `party.ts:90` forwards it to the
party's `changeEmitter`, and `raid.ts:51` forwards that to
`raid.changeEmitter`, which `wireStalenessListeners` subscribes
(`upgrades_tab.tsx:1579-1617`). The finding's premise, that
`raid.changeEmitter` leaves out the player's emitters, reads only the
`onAny` list at `raid.ts:58-64` and misses the forward at `:51`.

- **Candidate A (no change)** wins if, after a finished run, each of race,
  one rotation option and one bonus-stat edit shows the stale notice and
  re-enables Simulate.
- **Candidate B** (subscribe the failing input's own player emitter in
  `wireStalenessListeners`, not `player.changeEmitter`, which would double
  every notification that already arrives through the raid path) wins for
  exactly the inputs that fail.

## Live check 2026-10-04

Browser pane on `http://localhost:5173/tbc/paladin/retribution/` (vite
dev server at fork `e413972db`, clean tree, plus the `:3333` backend that
the dev page's `local_worker.js` sends sims to, `vite.config.mts:23`).
Gear: the Gear tab's Phase 2 preset `P2` (already active on page load);
Upgrades phase 3. Run 1 settled at 2026-10-04T18:56:53Z: "Your current
gear: 2079.7 DPS. Took 185s.", no stale notice, Simulate disabled.

Read after each change: stale notice `#upgrades-tab
.upgrades-status-line.text-warning`, Simulate `.upgrades-run-button`
`disabled`. Each change was reverted and the run repeated before the next
input; each repeat was a cache hit ("Took 0s") that left no stale notice
and Simulate disabled.

| Input | UI action | Time (UTC) | Stale notice | Simulate |
| --- | --- | --- | --- | --- |
| Race | Settings tab Race picker, Blood Elf → Human | 18:57:14 | "settings changed since this ranking — results may be out of date" | enabled |
| Rotation option | Rotation tab "Use Exorcism" ticked (`rotationChangeEmitter`, `ui/paladin/retribution/inputs.ts:9-13`) | 18:58:32 | same text | enabled |
| Bonus stats | Strength "±", Bonus Strength 0 → 50, Tab to commit (Strength 828 → 889) | 18:59:24 | same text | enabled |
| Talents | Talents tab, one point removed from the first Holy talent | 19:00:35 | same text | enabled |
| Gear | Gear tab preset Phase 1 → `P1` | 19:01:21 | same text | enabled |

A typed bonus-stat value that is not yet committed (before Tab) changes
nothing: at 18:59:17 Strength was still 828 and no notice showed. That is
the number picker committing on `change`, not a missing listener.

K4 (ticket 538) has not landed, so no `[upgrades] stats read` console
line exists: `grep -n 'stats read'` on `upgrades/engine/rank.ts` finds
three comments and no log call.

Full log: `.scratch/stage-gate/round-11-followups/539-live-check.txt`
(gitignored).

## Closed 2026-10-04: no defect; no code change

Pre-registered Candidate A wins. Every checked input marks a finished
result stale and re-enables Simulate: race, a rotation option, bonus
stats, talents and gear. The finding's premise was wrong:
`raid.changeEmitter` does pass on the player's changes, through
`Player.changeEmitter` (`onAny` of all 17 player emitters,
`ui/core/player.tsx:338-358`) → `party.ts:90` → `raid.ts:51`. No
listener added, no fork commit, no re-pin. The `run_staleness.ts:2-3`
comment ("sim settings") stays as it is: it describes what the wiring
does.

Not checked live: spec options and player consumables. They reach
`raid.changeEmitter` through the same `Player.changeEmitter` path
(hypothesis, untested in the tab).
