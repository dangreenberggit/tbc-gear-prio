Status: open
Type: task
Origin: chat (owner request, 2026-09-24)
Blocks: 494, 495, 499, 501
Blocked by: none

## Problem

Every check of the Upgrades tab's layout and hover text today needs a live
sim run. That means the Go backend on :3333, the vite server on :5173, and
3 to 4 minutes per feral run. When the servers are down, agents fall back
to estimating pixel widths from the code, and those estimates are
unreliable. On 2026-09-24 the layout investigator for 495/499 found both
servers down and could only estimate. The layout gate's own capture (the
ret page, first ~5 rows, "Set potential" off) never shows a set-bonus row,
so layout assertion (11) passed with zero rows checked in two real gate
runs.

## Owner's request (2026-09-24)

Add a light testing setup that renders the Upgrades tab from recorded sim
results, so UI work does not need live sims. It should not be a full
Storybook. Record real results from these configurations:

- feral cat, phase-2 BiS preset gear, phase 3 selected
- 2 or 3 more configurations that together show the set-bonus cases: a
  gain, a break, a stop at 2 pieces, finishing the set paying off, and a
  bonus below the noise floor

The scenario runs under
`.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/` already
recorded suitable states (scenarios A, D, E, F and I in `scenarios.md` and
`report.md`). Use them as the starting list.

## Sequencing (owner)

Layout and hover work that depends on measuring real rows (494, 495, 499,
501, and the gate-coverage fix for assertion (11)) happens after this
setup exists. Layout decisions made by reading the code are useful but
unreliable.

## Constraints to respect

Ports and adapters are limited to three: `GearSource`, `SimRunner` and
`Store` (PLAN.md §5). Do not add a fourth port without agreement. Recorded
fixtures and adapters are the repo's existing pattern. The tab code lives
in the gitignored fork `vendor/tbc-new-fork`, so every fork change is a
two-step re-pin (AGENTS.md § The forked tab repo). A recorded fixture must
name the fork sha and the gear preset it came from, and must have a
regeneration command. It then goes stale in a visible way instead of
drifting silently.

## What would close this

Each of these is a checkable item:

- The tab renders on :5173, or in the layout and review harness, from a
  named recorded fixture, with no backend and no WASM run.
- At least 3 recorded fixtures exist, including feral P2 BiS in phase 3,
  and together they cover the set-bonus cases listed above.
- The layout gate and `pnpm tab-review` can run against a fixture that
  contains set rows, so assertion (11) checks at least one real sub-line.
- There is a documented command to re-record the fixtures.
