Status: closed
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

**2026-10-11 — on the finish list (Chunk 3b step 6 of
`.scratch/plans/upgrades-tab-finish-line.md`, decided by the
orchestrating session).** The set-bonus numbers must be checked before the
tab counts as finished. The check is a live feral run on the current fork
at 0, 1, 2, 3 and 4 worn Thunderheart pieces, read against this ticket's
figures; it is run, not put to the owner as a question. It stays in
Tab-blocking in `docs/upgrades-tab-scope.md` until that run is recorded
here.

**2026-10-15 — stage-gate tab-set-bonus, chunks K1 and K2.** Still open:
the set-screen part waits for the orchestrator's Gate C (below).

- Close condition 1: the controlled test exists and passes.
  `corepack pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t 497`
  (497-A, 497-B; commits 60cf6f4c and 2449eaf1). With an exact fake sim, at
  worn Thunderheart 0 to 4 the printed Malorne and Nordrassil 4pc Breaks line
  is exactly the Thunderheart bonuses the step loses and the pieces line is
  the pieces' own values plus the bonus; moving 7 DPS between the two lines
  in `view.ts` fails both cases. No leak in the step-path arithmetic, so
  condition 2 (an engine fix) does not apply.
- The live run is recorded (ticket 467's closing note: fork `176268e7c`,
  worn 0 to 4, gate-sme trust-with-caveats at every count). Malorne 4pc
  same-gear value, record only: 23.3, 23.3, 21.7, 23.3 at worn 0 to 3
  (never printed: its step is worth less than the 2pc stop); not measured at
  worn 4 (set screened, below-zero). Nordrassil 4pc pair value 36.86 to
  36.92 at every worn count. The 2026-09 variation this ticket reports is
  not present on the current code.
- Nordrassil "hidden": the set screen drops it at worn 0 to 3 as
  `outside-band` (measure 31.3, 30.7, 43.5, 16.6 against floors 83.6, 82.8,
  95.5, 68.5, floor = 2nd top-k measure − √2·σ) and drops Malorne and
  Nordrassil at worn 4 as `below-zero` (measure + 2σ = −43.0 and −108.4).
  Every drop matches ADR-0035's rule. The pre-written screen rule
  (`.scratch/stage-gate/tab-set-bonus/progress.md`, Step 4) still reads
  TICKET at worn 1 to 3, because its clause "every kept set's rows carry
  `futureBonuses`" fails on the worn Thunderheart pieces' own rows (delta
  0, piece count unchanged). gate-sme contests that this is a screen fault.
  Whether that clause counts is left to the orchestrator; no screen ticket
  is filed yet.
- Recorded, not displayed (plan claim C10): the old package figures in
  `ranking.setBonuses[]` still swing with worn Thunderheart. Malorne 4pc
  `bonusDps` / `bonusDpsNet` is 10.2/10.2, 17.6/17.6, −53.0/−53.0,
  −41.5/54.3 at worn 0 to 3. The step path the tab runs does not read
  either field (plan claim C7), so no printed line uses them.

Evidence: `python -I .scratch/stage-gate/tab-set-bonus/497-read.py` (main
checkout, gitignored stage folder; output `497-read.txt`).

**2026-10-15 — closed (stage-gate tab-set-bonus, chunk K4).** The
orchestrator's Gate C ruled the set-screen question: the Nordrassil drop is
the ADR-0035 band rule working as designed. At worn Thunderheart 0 to 3 the
screen drops Nordrassil as `outside-band`, with measure 31.3, 30.7, 43.5 and
16.6 against floors 83.6, 82.8, 95.5 and 68.5 (floor = the 2nd top-k measure
− √2·σ); at worn 4 it drops Malorne and Nordrassil as `below-zero`, with
measure + 2σ = −43.0 and −108.4. Every drop meets the rule. The Step 4 rule
read TICKET at worn 1 to 3 only through its clause "every kept set's rows
carry `futureBonuses`", and the only rows that failed it are the player's
own worn Thunderheart pieces (delta 0, piece count unchanged), which add
nothing and can have no future bonus. No screen ticket is filed. Close
condition 1 is met by the controlled test (comment above); condition 2 does
not apply, because no bug was found. The Wolfshead × Thunderheart 2pc
interaction the SME found is ticket 635.

Verified by:
`corepack pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t 497`
and `python -I .scratch/stage-gate/tab-set-bonus/497-read.py` (main
checkout; prints `497-read.txt`), tbc-new-fork@176268e7c.

**2026-10-15 — pre-merge review of `feat/tab-set-bonus` (findings S2, P4).**
Two corrections to the notes above. The claim "moving 7 DPS between the two
lines in `view.ts` fails both cases" is a hand mutation run in chunk K1
(both cases failed with "k=2 row 29098 step 4: expected -57 to be close to
-50"), recorded in `.scratch/stage-gate/tab-set-bonus/execution-report.md`
line 20 of the main checkout, a gitignored folder; to repeat it, move 7 DPS
between the pieces and Breaks lines in the fork's `view.ts`
`setPotentialSteps` and run the vitest command above. And close condition 1
rests on two pieces of evidence, not the controlled test alone: the test
shows the step arithmetic cannot move a Thunderheart loss into the 4pc
lines, and the live run in ticket 467's closing note shows that the
2026-09 variation is gone.
