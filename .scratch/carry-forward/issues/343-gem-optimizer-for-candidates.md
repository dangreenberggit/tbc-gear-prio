Status: closed
Type: task
Origin: docs/fork-tab-native-bulk-sim-finding.md (investigation 2026-08-31)
Blocks: none
Blocked by: none

# Is wowsims' gem optimizer worth calling for a one-item swap?

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

Separate question from the bulk-sim work (owner ruled it out of the bulk-sim
scope, to be looked at on its own). wowsims' `feature/backend-reforge` branch has
a gem optimizer — `reforgeOptimizeAsync`, a linear-program solver that re-gems a
gear set for max EP under stat caps. Unlike bulk sim, it **does** run in the
in-browser WASM worker (`vendor/tbc-new-fork/ui/worker/sim_worker.ts:72,99-103`),
so it is reachable adapter-only.

Our tab currently **repairs** gems (fixes illegal sockets, minimal disruption) but
does not re-optimize — a deliberate policy (ADR-0025: repair, not re-optimize).
The optimizer re-optimizes, which conflicts with that policy.

The question: **is it worth calling for our case?** We sim one new item against
the existing set, so we are not re-gemming whole builds — at most the swapped
item's gems plus meta legality.

## Owner's prior (to test, not assume)

Full re-gemming per item is probably NOT worth it for a one-item swap. BUT it may
matter when socket bonuses shift around (a modestly rare but slightly substantial
case), and it may be cleaner code than our own repair pass. This is a
measurement-and-code-shape question, not an armchair one — needs a subagent
investigation, not reasoning alone.

## Approach

- Measure: on our fixtures, does calling the optimizer for a one-item swap change
  the ranking meaningfully vs our repair pass? When socket bonuses shift, how much?
- Weigh: accuracy gain vs efficiency cost vs code cleanliness.
- Respect ADR-0025: if adopted at all, decide default-off opt-in vs new default —
  and if it would change the ranking default, that amends ADR-0025 and is an owner
  call.
- Reachable adapter-only (no shared-file edits); calling `reforgeOptimizeAsync` is
  a call, not an edit.

## Acceptance

- [x] Measured: does the optimizer change one-swap rankings vs repair, and by how
      much (incl. the socket-bonus-shift case)?
- [x] A recommendation: adopt (how — opt-in vs default) or not, with the ADR-0025
      policy implication stated.

## Closed 2026-10-03

Answered by ticket 535's measurement (plan
`.scratch/stage-gate/535-meta-repair-hit/plan.md`, Appendix E; files under
`.scratch/stage-gate/535-meta-repair-hit/wowsims-opt/`, gitignored; the
table is in ticket 535's comment of 2026-10-03).

**Measured.** On the 85 meta repairs of the five tab fixtures, with
settings matched to the tab (rare palette, preset weights, a hit-cap gap
equal to the repair budget), wowsims' optimizer scored below the exact
search on 84 (by 1.16–6.53 EP) and changed 2–5 sockets where 1–3 were
needed. On four ret rows, the exact layout simmed 1.47–3.18 DPS higher than
the optimizer's (seeds 11, 3011 and 6011 at 3000 iterations: wrist 32574
+2.93, chest 30907 +1.91, chest 32365 +1.47, the Burning Rage step +3.18).
Rankings were not re-run with the optimizer; the per-row DPS gap is the
measured effect. The socket-bonus case: ticket 535's exact search now
credits a socket bonus a recolour switches on (test 535-C1), which on
ret-p3-p2 moved the Sovereign Nightseye to the boots and raised all 31
wrist rows by 1.73 to 2.08 DPS.

**Recommendation: not adopted** for one-item swaps. The optimizer
re-gems every unfrozen slot instead of repairing (freezing is per slot,
with no cost for changing a gem), which breaks "repair, not
re-optimization" and the fairness of a baseline that is not re-gemmed; it
scored worse on the measured repairs; it is async, which would make every
repair site async; and it is slower (median 136 ms per call in Go against
9.5 ms for the exact search). Ticket 535 records the four reasons.
ADR-0025's "repair, not re-optimize" stands, so no ADR changes.
