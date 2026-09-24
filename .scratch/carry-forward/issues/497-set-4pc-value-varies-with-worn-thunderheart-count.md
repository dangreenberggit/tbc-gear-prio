Status: open
Type: bug
Origin: SME seat, stage-gate upgrades-tab-closeout round 2b Step 7 (finding C1, 2026-09-24)
Blocks: none
Blocked by: none
Related: 467, 490, 492

# Malorne and Nordrassil 4pc values vary with the worn Thunderheart count

The same 4pc bonus measures very differently depending on which
Thunderheart pieces are worn, although neither bonus depends on
Thunderheart (per `item_sets.go`, as the SME read it):

- Nordrassil 4pc (Shred +75): +44.8, +60.5, hidden, +63.0, +65.2 at worn
  Thunderheart 0 to 4.
- Malorne 4pc (+30 Strength in Cat Form): +9.5, +19.7, hidden, +69.5 at
  worn 0 to 3. +69.5 is too large for +30 Strength.

**Hypothesis, untested:** the worn-2 and worn-3 measurements still include
part of the Thunderheart 2pc loss (an inflation term the net correction
misses when the package breaks a worn set).

At worn Thunderheart 2 the ON figures do not depend on these values (the
SME checked the highest value measured), so this is minor there. It is
major in any state where a break is smaller than the true 4pc.

Evidence: SME handoff
`.scratch/handoffs/sme-rank-judgment-490-per-future-breaks.md`; captures in
`.scratch/stage-gate/upgrades-tab-closeout/round-2/` and `round-2b/`
(gitignored).

## What would close this

1. A controlled fixture in `packages/core/test/fork-set-net.test.ts` that
   reproduces the variation, or shows it is sim noise.
2. The engine fix if it is a bug, with the PROVENANCE cycle and re-pin.

## Comments

### 2026-09-24, set-rule-scenarios run

The nine-scenario set-rule run
(`.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md`)
measured the same Nordrassil 4pc bonus (Shred +75) at three different
worn-gear states, confirming this ticket's variation with independent
figures:

- Scenario A (feral in Phase 2 BiS gear at phase 3): N4 = +60.5. Printed
  on Nordrassil Chestplate/Feral-Mantle, "4pc (0/4): +60.5" /
  "4pc (0/4): +60.5" (`analysis-A.md`).
- Scenario E (Phase 2 gear plus Thunderheart hands and legs, same base
  gear as A but two Thunderheart pieces worn, at phase 3): N4 = +19.9, on
  the same Nordrassil rows (`analysis-E.md`,
  `E-tip-NordrassilChestplate-off.png`).
- Scenario F (Thunderheart hands and legs only, phase 3): N4 does not
  appear at all — no 4pc line on any Nordrassil row, and ON−OFF = 0.0 on
  Nordrassil Handgrips and Kilt where scenario A (same base gear) measured
  N4 = +60.5 (`analysis-F.md`, contradicted-prediction 3 in report.md).

So on close to the same base gear, N4 reads +60.5, +19.9, and hidden
(effectively ≤ the rankable floor), moving only with how much Thunderheart
is worn — the same shape as this ticket's existing worn-0-to-4 table, and
consistent with the ticket's hypothesis that a Thunderheart-set break is
leaking into the measurement.
