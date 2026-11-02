Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-adjacent)
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md (finding F6)
Blocks: none
Blocked by: none
Related: 500

# A ranking lists Thunderheart Harness at a 5-piece threshold the set does not have

`data/tab-fixtures/feral-p5-th4pc.json` (recorded 2026-10-15, fork
`2d168e74f`) has `ranking.setBonuses[0]` for Thunderheart Harness with
`"threshold": 5`. The set's bonuses are at 2 and 4 pieces only
(`vendor/tbc-new-fork/sim/druid/item_sets.go:224-250`). Whether any screen
shows this entry, and whether the engine meant a step entry rather than a
bonus, is untested.

Re-run: `python -c "import json;r=json.load(open('data/tab-fixtures/feral-p5-th4pc.json',encoding='utf-8'))['ranking'];print([(b.get('setId'),b.get('setName'),b.get('threshold')) for b in r['setBonuses']])"`

Done when: the cause is found, and a ranking either has no set-bonus entry
at a threshold the set lacks or the entry is shown to mean something else
and is labelled so.

## Owner, 2026-10-16

Verbatim: "Nonexistent set bonuses is on obviously wrong too"

The owner rules that a set-bonus entry at a threshold the set does not
have is a defect, not a judgment call. "Labelled so" in Done when is
therefore not enough if a screen shows the entry as a bonus.

On 2026-10-16 the re-run above prints the Thunderheart Harness entry
second in the list (index 1, not 0), still with `threshold` 5. The fork's
`sim/druid/item_sets.go:224-250` still defines only the 2-piece and
4-piece bonuses.

Other open tickets that describe a set bonus that does not exist: none.
Checked by reading every open ticket under `.scratch/carry-forward/issues/`
that mentions a set bonus, threshold or piece count. Ticket 621 is related
but different: those bonuses exist, and the sim panics when another class
reaches them.

## Cause and fix, 2026-11-01

Cause, in two parts (fork `ui/features/upgrades/model/engine/rank.ts` at
`119b9f676`):

1. **A marker entry at worn + 1.** With `measureBrokenSetValue` (the tab's
   setting), a set with candidates but no count in reach, or one the set
   screen dropped, got one `setBonuses` entry with
   `threshold: Math.max(2, piecesWorn + 1)` and `unmeasured`
   `"insufficient-pieces"` or `"screened-out"`. In `feral-p5-th4pc`,
   Thunderheart is worn at 4 and the set screen dropped it (`exact-zero`), so
   the marker named 5. Re-run:
   `git -C vendor/tbc-new-fork show 119b9f676:ui/features/upgrades/model/engine/rank.ts | grep -n "Math.max(2, piecesWorn + 1)"`
2. **Every reachable count was tried.** The gain side and the crossing gate
   tried every piece count from worn + 1 up to what the pool could fill, with
   no knowledge of which counts the set has a bonus at. So rankings also held
   below-gate entries at counts the set lacks: Thunderheart and Malorne at 3
   and 5 in the recordings made at fork `b908771dd`. Re-run:
   `python -c "import json,glob;[print(p.split('/')[-1],[(b['setName'],b['threshold']) for b in json.load(open(p))['ranking']['setBonuses'] if b['setId'] in (676,640,680) and b['threshold'] not in (2,4)]) for p in sorted(glob.glob('packages/core/test/fixtures/tab-recordings/*.json'))]"`

Fix, fork `3f2948ce1` (re-pinned on branch `fix/644-655-set-bonus-list`): the
ranking asks the sim which set bonuses are active on the gear that adds each
set's largest package (new optional `SimRunner.activeSetBonuses`, answered
from the sim's `computeStats` `PlayerStats.sets`, names such as
`Thunderheart Harness (4pc)`), less those already active on the current gear.
The gain side, the set screen's reach and the crossing gate then try only
those counts. A set with no bonus in reach, or one the screen dropped, gets no
`setBonuses` entry; its rows keep their `setContext` through an internal list,
and the popover reads a dropped set from `ranking.setScreen`. For a runner
without `activeSetBonuses` (the test fakes), and for a set whose read fails or
whose largest package fails gem repair, the gain side tries every count, as
before (the doc comment on `setBonusCountsInReach`); the marker entry is gone for every
runner (`rank.ts` `setBonusCountsInReach` and the `markedSetIds` branch; added
by the pre-merge review, docs/reviews/fix-644-655-set-bonus-list.md, P3). The frozen
recordings under `packages/core/test/fixtures/tab-recordings/` were made at
`b908771dd` and still hold the old entries; they are engine test data, not
rankings the tab shows.

Tests: `fork-set-net.test.ts` cases 644-A, 644-B and 644-C (red before the
fork change, green after). Four 511 cases that pinned the marker entry now pin
"no entry".

Live check, 2026-11-01: `pnpm tab-fixtures:record` at fork `3f2948ce1` for
`feral-p3-th-hands-legs` and `ret-p3-p2` (files in the pair's gitignored
`.scratch/tab-recordings-644/`). Neither has an entry for Thunderheart,
Malorne, Lightbringer or Crystalforge at a count other than 2 or 4, and
`feral-p3-th-hands-legs` has no crossing gate for Thunderheart at 3 (the old
recording has one; the new recording has no `crossingGates` key at all, so
this shows no gate of any kind, not a gate at 2 or 4 only; added by the
pre-merge review, P5). The `feral-p5-th4pc` re-record did not run: the recorder
stopped with "gear not loaded; missing Signet of Primal Wrath, Berserker's
Call" before any sim (cause untested).

Verified by: `pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t 644`
at tbc-gear-prio@e798d4ad with tbc-new-fork@3f2948ce1
