# Decision log — 411 desktop bulk-screening wall-clock

One dated line per gate: gate, outcome, reason, round count.

- 2026-09-17 — Stage opened. Base SHA `59431bf5c16d4e4df563670522e9e0571fa51cfc`,
  branch `feat/406-keep-bulk-dead-note`, `git status --porcelain` empty. Fork
  working tree (`vendor/tbc-new-fork`) confirmed clean and unheld. Ticket premise
  corrected in 59431bf5 (Windows-build claim was stale). Verdict-style ticket:
  three open questions Q1–Q3, each with candidate / pre-registered win condition /
  measurement per brief.md.
- 2026-09-17 — Gate A (mechanical): PASS, round 1. All template sections present;
  Claims register 29 rows; Paths manifest present (Partition: none); Q1/Q2/Q3 each
  answered with candidate + pre-registered win condition + measurement, dropped
  candidates carry reasons; `git status --porcelain` empty at 59431bf5 (planner
  wrote nothing). Plan written to plan.md verbatim. → Review.
- 2026-09-17 — Review: gate-reviewer (Opus) returned VERDICT sound, no blocking
  findings; all 29 register rows stand (load-bearing ones re-run). Tree clean at
  59431bf5. Written to plan-review.md verbatim.
- 2026-09-17 — Gate B (judgment): PROCEED, round 1, no loop-back.
  - F1 (material, noise-bar 5% spread measured at 3000 iters but L arm runs at
    ~20k): ACCEPTED with directive, not looped back. Reason: does not void the
    rule (non-overlapping-range guard is an independent second gate) and touches no
    load-bearing claim; the fix is a measurement.md note the executor writes from
    the real L-arm spread it must observe anyway. Executor is directed to record
    the actual L-arm spread across the 3 repeats and treat 5% as an unverified
    upper bound. A plan revision would only pre-state what the run produces.
  - F2 (minor, paired-error fields now populate only for the finalist subset):
    advisory → commit-body line.
  - F3 (minor, `200s` gate label is an HTTP-200 count, not a time window):
    advisory. → Execute.
