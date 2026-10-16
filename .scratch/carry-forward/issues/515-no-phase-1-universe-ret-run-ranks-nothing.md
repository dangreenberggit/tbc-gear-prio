Status: closed
Type: question
Origin: .scratch/handoffs/511-512-set-credit-redesign/d1-measurements.md (round 2e-1 measurements, 2026-09-25)
Blocks: none
Blocked by: none
Related: 511, 512

# No phase-1 universe; a phase-1 ret run ranks no candidates

## Evidence

- `ls data/universes/` lists phases 2 to 5 for every spec. There is no
  `*-p1.json`.
- Round 2e-1 ran ret from the "Phase 1 / Pre-raid" preset at page phase 1,
  10000 iterations. The run took 10 s and ranked nothing:
  `python -c "import json;print(len(json.load(open('.scratch/handoffs/511-512-set-credit-redesign/measurements/ret-p1-preraid-10000.json'))['ranking']['items']))"`
  prints `0`.
- The project's rule for live and SME runs is to start from the previous
  phase's preset. For phase 1 that is the pre-raid preset. Ticket 512's
  evidence and round 2e's plan (steps B4, B6 and B7) both assumed a
  phase-1 run from the pre-raid gear. The round used phase 2 instead.

The cause is not investigated. It may be by design: the universes may
start at phase 2 on purpose. Nothing has checked that.

## What would close this

1. Find out why no phase-1 universe exists, and record the answer here
   with the command or file that shows it.
2. If it is by design, say what a phase-1 run from the pre-raid preset
   should show instead, and note it on 512. If it is a gap,
   file the fix as its own ticket.

## Comments

**2026-10-11 — what "finished" needs from this ticket (Chunk 3b step 6
of `.scratch/plans/upgrades-tab-finish-line.md`, decided by the
orchestrating session).** A Phase 1 run today ends by saying nothing beat
the player's gear ("No upgrades found", `empty_no_upgrades` in the fork's
`assets/locales/en/upgrades.json:129`; which state shows it on a Phase 1
run is from reading the code, untested on the React tab), which is false:
nothing was compared. For the finished tab, that message is fixed: a Phase 1 run says
plainly that the tab has no Phase 1 candidate list. A real Phase 1 list is
not part of "finished". So this ticket closes when:

1. Close condition 1 above is answered (why no phase-1 list exists).
2. The tab no longer shows "No upgrades found" for a phase with no
   candidate list; it says the phase has no list. A fork commit and
   re-pin, `pnpm verify` rc=0, and a `pnpm tab-review` capture or a
   by-hand Browser-pane check of a Phase 1 run.
3. If close condition 1 finds the missing list is a gap rather than a
   design choice, the real Phase 1 list is filed as its own ticket under
   Tab-adjacent.

**2026-10-12 — close condition 1 answered (stage `tab-small-fixes`, plan
step 7).** The missing Phase 1 list is by design.
`packages/core/test/pool-file.test.ts:41-42` says: "Stage 1 is
deliberately out of scope: assemble_universe.py only accepts --max-phase
2..5, because the Wowhead list phases start at "p1-p2"". The script
enforces it: `scripts/assemble_universe.py:3003` declares `--max-phase`
with `choices=[2, 3, 4, 5]`. Stage `tab-item-lists` records the same
(`.scratch/stage-gate/tab-item-lists/plan.md`, claim C22). Conclusion: by
design; the finished tab says the phase has no list (fork commit
`af93190ba`, "Say when a phase has no candidate list"); no Phase 1 list
is filed. Ticket 512 is closed, so no note goes there.

**2026-10-12T18:46Z — live Phase 1 check passed (stage `tab-small-fixes`,
plan step 6; close condition 2's by-hand check).** Fork
`tbc-new-fork@af93190ba`, dev servers started from the pair
`tbc-wt/tab-small-fixes` (vite `:5173`, backend `:3333`), Browser pane on
`http://localhost:5173/tbc/paladin/retribution/`. Loaded the Gear tab's
Phase 1 "Pre-raid" gear set, set the Upgrades tab's phase to Phase 1 (the
run card read "0 eligible items"), clicked Simulate. The run ended
`done`, not `error`. The left column's text read: "Your current gear:
1,838.4 DPS. Took 0.9s." then "No candidate list for Phase 1" and "The
tab has no candidate list for Phase 1, so nothing was compared. Pick
Phase 2 or later and simulate again." It did not say "No upgrades
found". Judged against the sentence "the status line says the run
finished; the results area says the tab has no candidate list for Phase
1; it does not say No upgrades found": pass. The ticket stays open until
the re-pin and `pnpm verify` (plan step 16).

**2026-10-15 — closed (stage `tab-small-fixes`, plan step 17).** All three
close conditions in the 2026-10-11 comment are met. 1: by design, see the
2026-10-12 comment. 2: fork commit `af93190ba` shows "No candidate list for
Phase {{phase}}" for a finished run whose spec and phase have no list; the
live Phase 1 check above passed; the pair's main branch re-pins the fork at
`899d8c267` (`tbc-gear-prio@976a3d51`) and `pnpm verify` passed on it
(rc=0, `gates: 1524 ran, 0 skipped`). 3: not needed, because the missing
list is by design.

Verified by: `tbc-new-fork@af93190ba` (live Phase 1 check, 2026-10-12T18:46Z, comment above); `tbc-gear-prio@976a3d51` re-pin; `pnpm verify` rc=0.
