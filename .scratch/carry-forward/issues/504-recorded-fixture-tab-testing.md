Status: closed
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

## Comments

**2026-09-24, round 2c executor (Steps 1–5).** Status left open: the
orchestrator confirms the shas before this closes, and the layout gate's
first run with a fixture is red (see below).

- Loader: fork `bcbb5e741514701e9229b8e671d5b1736d310901`
  (`upgrades/adapters/fixture.ts`, compiled in only when the
  `__TBC_TAB_FIXTURES__` define is true). Re-pin: main `4ce44113`.
  Recorder, check and README: main `87dae630`. Fixtures: main `d1fd9039`.
- A plain `vite build --outDir <scratch>` has 0 of 23 JS files naming
  `__upgradesFixture`; the gate harness's build has 1.
- Five fixtures, all at fork `bcbb5e741`, recorded from the previous
  phase's preset gear:

  | Fixture | Size | Items | Set rows | Run |
  | --- | --- | --- | --- | --- |
  | feral-p3-p2bis | 345,804 B | 353 | 23 | 402s |
  | feral-p3-nordrassil4 | 348,461 B | 353 | 18 | 186s |
  | feral-p3-th-hands-legs | 348,384 B | 353 | 23 | 192s |
  | ret-p3-p2 | 409,234 B | 467 | 19 | 215s |
  | feral-p2-malorne4 | 231,205 B | 220 | 8 | 106s |

- `python scripts/check_tab_fixtures.py` rc=0, all five "inputs changed
  since: none".
- Layout gate with the fixture pass (`python scripts/check_layout_gate.py`):
  `[fixture feral-p3-p2bis] (11) set-bonus sub-lines inside their cell: 16
  checked` at 375, 653, 768 and 1280, and (6b) 16 checked at each. But the
  run is `{"outcome":"measured","passed":91,"failed":2,"a11yFailed":0}`:
  (6) fails at 768 and 1280 on the Slot cell "Main Hand", which wraps to two
  lines in the 5.5rem Slot column (31.3px against a 15.3px line). The live
  ret rows never had a Main Hand row in the sampled five; the feral fixture
  does. Not caused by the loader; reported to the orchestrator as a gate
  decision.
- Runtime check (`pnpm tab-review` on a manifest entry with
  `"fixture": "feral-p2-malorne4"`): rc=0, 48.9s end to end including the
  bundle build; the fixture settled with 417 rows in 2.0s. Facts: phase
  selector "Phase 2 (2.1 - T5)", the gear tab lists Mantle, Breastplate,
  Gauntlets and Greaves of Malorne, no stale banner, baseline summary "Your
  current gear: 2316.2 DPS." with no "Took", Set potential disabled.

**2026-09-25, round 2c: closed.** The red gate noted above ("Main Hand"
wrapping in Slot, assertion (6)) is fixed by ticket 499's Slot width. The
real gate run on fork `7ed8c9941` (main `f6bc9087`) is
`{"outcome":"measured","passed":121,"failed":0,"a11yFailed":0,"a11yWarned":26}`,
with `[fixture feral-p3-p2bis] (11) set-bonus sub-lines inside their cell: 16
checked` at 375, 653, 768 and 1280, and the new (12)–(15) each checking at
least one row in the fixture pass. Every close condition above is met.

Staleness check after the re-pin (`pnpm tab-fixtures:check`):

```
fixture feral-p2-malorne4: recorded at bcbb5e741514; inputs changed since: ui/core/components/individual_sim_ui/upgrades_tab.tsx
fixture feral-p3-nordrassil4: recorded at bcbb5e741514; inputs changed since: ui/core/components/individual_sim_ui/upgrades_tab.tsx
fixture feral-p3-p2bis: recorded at bcbb5e741514; inputs changed since: ui/core/components/individual_sim_ui/upgrades_tab.tsx
fixture feral-p3-th-hands-legs: recorded at bcbb5e741514; inputs changed since: ui/core/components/individual_sim_ui/upgrades_tab.tsx
fixture ret-p3-p2: recorded at bcbb5e741514; inputs changed since: ui/core/components/individual_sim_ui/upgrades_tab.tsx
```

Re-record decision: **none**. `git -C vendor/tbc-new-fork diff bcbb5e741 7ed8c9941
-- ui/core/components/individual_sim_ui/upgrades_tab.tsx` has two hunks: the
`formatDelta` doc comment (line 347) and the set-bonus tippy's placement
options in the result row (line 3039). Neither touches `run()` or the
`RankInput` it builds, so no recorded Ranking would change (amendment N1).
