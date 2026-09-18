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
- 2026-09-17 — Execute: gate-executor (Opus) completed all 16 steps. Fork commit
  993320fab ("Size the bulk finalist stage independently"); core commits e2c4f97e /
  f1800615 / f04e8a47. pnpm verify rc 0, desktop gate (a)-(h) pass on the tip, both
  trees clean. Written to execution-report.md verbatim. VERDICT: DELETE.
- 2026-09-17 — Gate C (disposition): all clear.
  - Diff cross-check: `git diff --stat 59431bf5..HEAD` = 35 files, every path inside
    the plan's Paths manifest. No out-of-manifest path. Both trees clean; log matches.
  - Verified independently (not on faith): (1) fork commit diff shows
    runBulkSimFinalistStage still called with finalistResults=5, no guard/early-return
    added, refined subset merged back before truncation — fixed not bypassed; (2)
    finalist-B1.csv + server-B1.log.err show the stage ran on both chunks with
    Finalists:5 (never 25/15), refining 20000→80000 / 20000→40000; (3) B1.json
    readback = BulkHttpSimRunner, bulkSimAsync 3, rowCount 40, matches the table.
  - Ledger row 1 (separate finalistResultsList var): ACCEPTED — functionally
    identical, verified in committed diff.
  - Ledger row 2 (stage.go comment-only, param still named topResults): ACCEPTED —
    honors manifest "comment only" the reviewer signed off; clarity in the doc comment.
  - Ledger row 3 (cap 40 screens 65 candidates → 3 chunks, bulkSimAsync==3 not 2):
    ACCEPTED — designed screening behaviour (rank.ts:1192-1195), unchanged by the fix;
    both arms screen the identical 65-candidate set, comparison stays apples-to-apples.
    A corrected prediction, not a loosened threshold.
  - F1 honored: measurement.md records actual L-arm spread at 20000 iters
    (1.51%/3.74%), margin clears it ~4-10×; moot (bulk lost 17× / 1.6×).
  - Verdict DELETE follows mechanically from the pre-registered rule: bulk beats the
    loop on neither firstRowS (104.2 vs 6.0 s) nor clickToDoneS (157.7 vs 97.3 s).
  → Hand off: pre-merge-review, then ask before merge. 406's delete is a separate
    follow-up, not performed here.
