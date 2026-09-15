# 397 — Desktop bulk screening engages but is 2.05× slower than WASM

Status: open
Origin: pre-merge review of feat/desktop-transport-gate (2026-09-14), Q2 finding
Blocks: —

## What

The desktop-transport gate (Chunk 2) measured a full ret P5 run on the packaged
`wowsimtbc` binary at **3419 s** against the WASM tab's **1668 s** for the same
601-row pool — the desktop path is **2.05× slower**, not faster.

The plan's step 5 Q2 hypothesis was the opposite: bulk HTTP screening was
expected to make the desktop path *faster*, because the fork's bulk-screening
branch engages only on the HTTP transport. Screening does engage (29 bulk chunks
observed over `/bulkSimAsync`), so this is not "screening never ran". It is
"screening ran and is not a speed win". The plan's own text (step 5 Q2 outcome
(b)) says this case "is a finding against parent C8, not a shrug" — hence this
ticket rather than a note.

## Why it is a finding, not just a number

The Go bulk path runs multi-stage convergence sims per 25-candidate chunk
(`MAX_CANDIDATES_PER_BULK_REQUEST=25`), plus the 8×5 paired replication and the
baselines. That this is slower than a per-candidate WASM loop is a real
throughput result about the bulk implementation, and it bears on what any future
tab regression on the desktop path can afford (~57 min for a full ret run).

## How to settle / next step

- Measured verbatim in `.scratch/stage-gate/desktop-transport-gate/desktop-gate.md`
  § Q2 and `readback-3333-tip.json` (3419 s, bulkSimAsync 29) vs
  `readback-wasm-tip.json` (1668 s).
- The question this ticket owns: is the multi-stage convergence per chunk doing
  redundant work, or is per-chunk convergence simply the cost of the bulk API?
  Parent plan claim C8 held that `bulkSimAsync` is HTTP-only by design; this
  ticket is the follow-up C8's own outcome (b) names.
- Not a blocker for the desktop gate itself, which asserts correctness, not speed.
