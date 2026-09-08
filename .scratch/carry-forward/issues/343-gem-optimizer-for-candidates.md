Status: open
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

- [ ] Measured: does the optimizer change one-swap rankings vs repair, and by how
      much (incl. the socket-bonus-shift case)?
- [ ] A recommendation: adopt (how — opt-in vs default) or not, with the ADR-0025
      policy implication stated.
