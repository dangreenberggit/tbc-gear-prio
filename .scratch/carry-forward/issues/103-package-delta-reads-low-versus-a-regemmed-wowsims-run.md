Status: closed
Type: disclosure
Origin: diagnostic loop, 2026-08-10 (`.scratch/set-bonus-value/loop-log-t6-shoulders.md`, iterations 3–4)
Blocks: none
Blocked by: none

# packageDeltaDps reads systematically low against a re-gemmed wowsims run

`formatPackageDelta` now shows `packageDeltaDps` in the Set potential panel
(commit `ed58c79`), which is the right figure to show. But that figure is
systematically **more conservative** than what a player will see in wowsims
after re-gemming the same package, and nothing on the surface says so.

## The measurement

For the four Thunderheart (T6) pieces on shredzepelin's actual gear, three
figures exist for one and the same swap:

| figure | source | value |
|---|---|---|
| `packageDeltaDps` | our pipeline, `.scratch/rank-reports/shredzepelin-p3.json` | **+64.07** |
| direct sim, flat filler gems | `python .scratch/set-bonus-value/measure_shredzepelin_t6.py` | **+80.80** |
| user's wowsims web UI run | reported 2026-08-10 | **+97** |

The repro is trustworthy on its own terms: its baseline arm simmed 2152.13 DPS
against the artifact's stored `ranking.baseline.dps` of 2152.0998 — a 0.03 DPS
guard — with per-seed spread under 1 DPS across seeds `[11,22,33,44,55]` at 3000
iterations on wowsimcli v0.0.101. The four single-swap arms reproduce the
artifact's singles to within a few DPS (shoulder −106.16 / −100.23, chest
−100.16 / −95.81, hands 21.75 / 21.24, legs 23.29 / 26.47). Only the **package**
diverges, by 16.72 DPS — an order of magnitude above the noise, so this is
structural, not statistical.

## Why (hypothesis, mechanism identified but not isolated by experiment)

Production assembles the package by applying `equipmentForCandidateSwap`
**sequentially, one piece at a time** (`packages/core/src/rank.ts:1037-1045`).
That helper runs `migrateGemsToItem` → `fillEmptyCandidateGems` → `repairMeta`
(`rank.ts:1376-1430`), and `fillOptsForSwap` (`rank.ts:1432-1452`) passes a
`usedUnique` exclusion computed over the rest of the equipment. Applied
sequentially, each successive package piece is therefore denied any unique gem
an earlier piece already consumed, and meta requirements are repaired against a
partially-assembled set. Socket capacity also shifts per slot (legs 28741 has 3
sockets against T6 31044's 1; hands 29947 has 0 against 31034's 1).

This is **not a bug** — spec §2.2 step 1 requires byte-identical gem policy
between package and single swaps so PLAN.md §9's symmetry invariant holds by
construction. The conservatism is the price of that invariant.

**Untested:** the sequential-exclusion mechanism is read from the source and is
directionally consistent with the 16.72 DPS gap, but no experiment has isolated
its contribution from the socket-count differences. Simming the package with
production's gem assignment against the same package with a freely re-optimised
gem set would separate them.

## Why it matters

A player who reads "whole package +64.07 DPS vs current gear", equips the four
pieces, re-gems them the way the wowsims UI would, and re-sims will see a
larger number. Being wrong in the conservative direction is the right way round,
but the panel currently states the figure without qualification, and the gap is
~30 DPS on a ~2150 DPS baseline.

## Options

1. **Disclosure line only.** Extend the panel's existing standing-assumption
   line (`set-potential-assumption`, already rendered) to say package figures
   hold the player's current gem policy fixed and re-gemming can only improve
   them. Cheapest; no number moves; consistent with PLAN.md:272 disclosure-over-
   correction.
2. **Measure and state the spread.** Sim the re-gemmed package and report the
   package figure as a range. More honest, costs one sim per package, and
   invites the question of which end belongs in the panel.
3. **Do nothing.** Defensible if the conservative direction is considered
   self-evidently safe, but the ~30 DPS gap is large enough that a reader
   comparing our panel against their own wowsims run will think one of them is
   broken.

Option 1 is the recommendation. Do **not** change how the package is gemmed —
that would break the spec §2.2 symmetry invariant to chase a display problem.

## Update, 2026-08-10 — option 1 partially shipped, ticket stays open

`packageDeltaDps` now also drives the report's opt-in **package** display mode
(ADR-0024), so the figure reaches member rows and not only the panel. Option 1's
disclosure ships with it, in two places:

- every package-member row's line ends "holds your current gems fixed, so
  re-gemming can only improve it" (`formatPackageMembershipLine`,
  `packages/core/src/rank-report-rules.ts`);
- the set-weight control's note repeats it for the mode as a whole.

Still open: the **Set potential panel's** own `formatPackageDelta` line carries
no such qualifier, which is the surface this ticket was originally filed
against. Nothing here measures the spread (option 2) or isolates the
sequential-gem mechanism from the socket-count differences — both remain
untested as written above.

## Closed, 2026-08-10 — option 1 complete

The panel's own `formatPackageDelta` line now carries the qualifier, so every
surface that states `packageDeltaDps` states it: the panel, the per-row package
line, and the set-weight control's note. The wording is one exported constant,
`GEM_POLICY_QUALIFIER` in `packages/core/src/rank-report-rules.ts`, rather than
three strings that could drift into three different claims about one number.
The CLI's set block picks it up for free — it renders through the same
`formatSetBonusLine`.

**Closing on disclosure, which was this ticket's full scope.** The title is a
statement about what the figure *reads like*, and the ticket's own
recommendation was option 1 with an explicit instruction not to change how the
package is gemmed. Options 2 (measure the spread) and 3 (do nothing) are not
carried forward as work: no number moved, and the mechanism hypothesis in "Why"
above stays **untested** exactly as written — nothing in this change isolated
the sequential-gem effect from the socket-count differences. If the spread is
ever wanted as a range, that is a new ticket with a sim budget, not this one.
