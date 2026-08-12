# Agent usage log — set-bonus feature arc

Kept by the main (reviewing) session. One row per agent completion, as
reported by the harness. Numbers are the tokens the subagent itself spent
(not the main session's). Resumed agents report per-completion; rows with
the same name are the same agent resumed. Failed-mid-run agents may have
spent tokens that were never reported — noted where known. The main
session's own usage is not visible to itself and is not in this table.

Date: 2026-08-10 → 2026-08-11.

| # | task | model (effort) | tokens | tool uses | outcome |
|---|---|---|---|---|---|
| 1 | Orchestrate ticket 90–99 resolution (sims, fixes, review) | opus (high) | 312,420 | 176 | done |
| 2 | Practical-outcome report | opus (med) | 74,701 | 7 | done |
| 3 | Rerender scratch HTML (flagged) | sonnet | 72,222 | 15 | done |
| 3b | — resumed: default-mode render check | sonnet | 79,851 | 5 | done |
| 4 | Resolve tickets 100/96/101/102 | opus (high) | 146,407 | 97 | done |
| 5 | Loop: why T6 shoulders never surface | opus (high) | 142,250 | 61 | done |
| 6 | Design note: sim-process vs UI-only | opus (med) | 101,410 | 13 | done |
| 7 | Panel qualifier + pct ticket + UI cleanup + curated-list + export fixes | opus (high) | 213,229 | 194 | done |
| 8 | Gear-snapshot provenance hunt | opus (med) | 84,738 | 25 | done (later corrected by v2 gear) |
| 9 | Director: combined 103/106 loop | opus (high) | 112,812 | 32 | done |
| 9b | — resumed: owner settings diff | opus (high) | 131,633 | 10 | done |
| 9c | — resumed: corrected gear re-price | opus (high) | 166,167 | 19 | done |
| 9d | — resumed: web-results analysis, close-out | opus (high) | 201,488 | 23 | done |
| 10 | Ticket specs: gem two-step (111) + chips (112→filed as 112) | opus (med) | 136,722 | 59 | done |
| 11 | Owner's wowsims simming instructions | opus (med) | 108,041 | 26 | done |
| 12 | Orchestrate tickets 111+112 implementation | fable (low) | 95,857 | 26 | phase 1 |
| 12b | — resumed: chip verification | fable (low) | 106,169 | 6 | done |
| 12c | — resumed: close-out after review fixes | fable (low) | 131,422 | 16 | done |
| 13 | Implement ticket 111 review fixes (child of 12, surfaced to main) | inherited (opus-class) | 180,401 | 37 | done |
| 14 | Review two-ticket increment (child of 12) | inherited | 106,480 | 26 | done |
| 15 | Convergence check vs web results | opus (med) | 107,131 | 38 | done (found ticket 117) |
| 16 | Orchestrate ret catch-up | fable (low) | 90,221 | 25 | stalled (dead monitor) |
| 16b | — resumed after stall | fable (low) | 109,493 | 3 | killed by session limit |
| 16c | — resumed after limit | fable (low) | 132,447 | 16 | done |
| 17 | W4 ret HTML surfaces check (child of 16) | inherited | 115,430 | 12 | done |
| 18 | Orchestrate fix round (117/118 + sweep) | fable (low) | unreported | — | killed by session limit mid-round; most commits landed first |
| 19 | — resumed: finish 118, regenerate, review | fable (low) | pending | — | running |

## Notes

- "inherited" = child agents spawned by an orchestrator inherit the
  orchestrator's session model unless it overrode them; the orchestrators
  were not asked to record per-child model choices before 2026-08-11.
  From here on, orchestrator briefs ask for per-worker model + token rows
  in their DIRECTOR.md logs.
- Two session-limit kills (16b, 18) mean some spent tokens were never
  reported and are missing from this table.
- Rough visible total for the arc so far: ~3.1M subagent tokens across
  ~20 completions, before the main session's own usage.
