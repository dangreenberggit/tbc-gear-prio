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
