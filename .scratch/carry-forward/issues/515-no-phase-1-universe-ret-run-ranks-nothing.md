Status: open
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
