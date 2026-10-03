Status: closed
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 456 (Sim-sets behavior change — this label ties into it)
Resolution: Fixed in fork commit 8bc15cad9 (re-pin 09caef2b). prune.only_bis now
  reads "Sim only selected set items" (the {{phase}} token dropped), and the
  prune toggle is available only while a set is selected — its visibility is
  recomputed on chip toggle so unticking the last set hides it. Verified live
  (live-verify 5d/5e; tab-review pruneLabel fact).

# "Sim only Phase 3 (2.2 - T6) BiS-list items" is too long

Owner report, 2026-09-20. The BiS-prune toggle label
("Sim only {{phase}} BiS-list items", currently rendering as e.g. "Sim only
Phase 3 (2.2 - T6) BiS-list items") is too long.

## What would close this

- Reword to "Sim only selected set items" — and the behavior follows the label:
  the toggle then sims only the currently selected Sim-sets, not a phase-derived
  BiS list. This is coupled to 456 (Sim-sets becomes a phase picker that
  auto-selects the phase's BiS sets), so land them together.
- The string is `upgrades_tab.prune.only_bis`; update the locale + schema mirror
  and the code that builds/uses the pruned pool.
