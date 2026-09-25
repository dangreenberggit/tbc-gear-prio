# Round 2e-1 measurements (D1): set-bonus values and se on the fork sim

Executor, 2026-09-25. Main `76724ab3`, fork `2cf4ec46e` (`feat/upgrades-tab`), both clean at start. The fork was edited in the working tree only (A1, saved as `a1.diff`) and reverted at the end.

## Headline

- **Verdict: systematic** (Justicar 4pc, `J4 = 17.82`, `se = 4.46`, `R = 17.82`). Under plan A3, round 2e-2 does not start as planned.
- **Crystalforge 4pc: systematic** (`17.32 ± 3.40`). **Lightbringer 2pc: noise** (`1.52 ± 2.42`). **Lightbringer 4pc: noise** (`−0.75 ± 3.40`).
- The calibration rule `B > 2·se` admits both known-inert ret bonuses (CF4 at 5.1 se, J4 at 4.0 se) on the P2 gear. On this data the rule does not do the job it was designed for.
- The same two bonuses read as noise on the ret pre-raid gear (J4 `−5.25 ± 4.15`, CF4 `2.33 ± 3.17`). So the residue depends on the gear. This is measured on two gear sets only; the cause is untested.

## Rules written before run 2 was read (plan A3 with N2, N9, N1)

Let `J4` be Justicar 4pc (626:4) `bonusDps` in run 2 and `se` its difference-form se. `R = |J4|` (N2).

- **noise**: `|J4| < 2·se`. The package method is sound for ret at 10000 iterations.
- **systematic**: `J4 ≥ 15.3 − 2·se` (it did not move from scenario I's 15.32), or `R > 4.81`.
- **stable-smaller**: otherwise, with `R ≤ 4.81`.
- A significantly negative value (`B < −2·se`) is residue evidence, not a real bonus (N2).

The same three-way rule is applied to Crystalforge 4pc (anchor 21.07) and to Lightbringer 2pc and 4pc (anchors −3.14 and −4.22) (N1).

## §0 Baseline fixture figures (A0)

Command: the plan's A0 one-liner, extended with `piecesWorn`, `selfConfound.dps` and `unmeasured`. Output saved as `measurements/a0-fixture-dump.txt`. Tuples are `(setId, threshold, piecesWorn, bonusDps, se, bonusDpsNet, selfConfound.dps, unmeasured)`. The se column is the engine's old `combineSe` form at 3000 iterations.

| fixture | measured bonuses |
| --- | --- |
| `ret-p3-p2` (scenario I; fixture `forkSha` `bcbb5e74`) | 629:4 w1 21.07 / 10.08 / net 21.07 / pair 4.80; 626:4 w0 15.32 / 5.38; 680:2 −3.14 / 4.44; 680:4 −4.22 / 5.43 |
| `feral-p3-nordrassil4` | 676:2 150.32 / 2.77 / net 103.13; 676:4 173.80 / 3.44 / net 79.43; 640:2 140.27 / 2.83 / net 93.08; 640:4 109.31 / 3.46 / net 14.94 |
| `feral-p3-p2bis` | 676:2 74.14 / 2.93; 676:4 210.37 / 3.55 / net 114.19; 641:4 156.68 / 3.54 / net 60.50; 640:4 w2 21.32 / 2.97 |
| `feral-p3-th-hands-legs` | 676:4 w2 73.15 / 2.77; **641:4 −60.46 / 3.41**; 640:2 55.77 / 2.76; **640:4 −31.84 / 3.49** |
| `feral-p2-malorne4` | 641:4 35.18 / 3.50 / net 50.89 |

C1 and C2 hold. **Residue flag (N2), from the committed fixtures:** in `feral-p3-th-hands-legs`, Nordrassil 4pc (−60.46, −17.7 se) and Malorne 4pc (−31.84, −9.1 se) are significantly negative, with `bonusDpsNet` equal to `bonusDps`.

## Environment

- **Backend (N6).** Restarted from `.claude/launch.json` `wowsims-backend`, which runs `go build -o wowsimtbc.exe ./sim/web` and then serves :3333.
  - Build started 10:29:10 local and the binary was written 10:30:50, so the build took about 100 s.
  - `git -C vendor/tbc-new-fork log -1 --format=%H -- sim/` = `5be3a56358a060a8ddecfa653d3bb8469dfd2c7e` (2026-09-17). Every dump records this as `simCommit`.
  - The A1 edits touch only `ui/`, so the Go sim is the pinned `sim/` tree.
- **Vite.** A vite from 2026-09-24 was already running on Node 22.17.1 on :5173. I stopped it and started a fresh one with Node 22.17.1 first on PATH (`npx vite serve --port 5173 --strictPort` in the fork).
- **Driver.** The Browser pane was hidden, so the page ran with `visibilityState: hidden`. A ret 3000-iteration run there progressed at about 2.2 s per sim, which projected to about 19 minutes. I stopped it.
  - All runs therefore used a headless-Chrome CDP driver instead. It is a copy of `scripts/tab-fixtures/record.mjs` with three changes: the dirty-tree refusal is replaced by a check that the fork status did not change during the run; it writes to `round-2e/measurements/`; and it has a `--swap slot:itemId` option for the gear-dependence runs.
  - The driver activates the target and turns on focus emulation, the same way the recorder does. It polled for "Took" every 10 s.
  - Each dump records `forkDiffSha1 = cd450b4b027a346daf5fd5847d07bdd0cd489fe2`, which is the sha1 of `a1.diff`.
  - The driver script is in the session scratchpad (`measure.mjs`) and is not committed anywhere.
- **Sim inputs.** No bulk screening ran: the tab calls the runner with screening off, and no term in any dump has a `screenBase` key. Every single, package, pair and vacate sim is one sim at seed 11 (`seeds[0]`).

## A1 — the temporary fork edits (`a1.diff`)

`git -C vendor/tbc-new-fork diff --stat` showed 2 files, `engine/rank.ts` (+144/−15 lines touched) and `engine/set-value.ts` (+63). They are saved at `round-2e/a1.diff`.

**`set-value.ts` table (N8, list of every change).** `IMPLEMENTED_IN_SIM` is replaced by every literal `NewItemSet` registration at thresholds 2 and 4 whose closure is not empty. That is 56 sets, keyed by the db `setId` joined on the Go `Name` through `data/items/index.json`. The parse command is d3-sets.md §Commands, with the join added.

- **Kept from the old table:** 626 `{2: false, 4: true}` (Justicar 2pc forced **false**, N8), 629 `{2, 4}`, 680 `{2, 4}`, 640 `{2, 4}`, 641 `{4}`, 676 `{2, 4}`.
- **Added:**
  - 530 {2,4}; 555 {2,4}; 559 {2}; **566 {2}**; 571 {2}; 572 {2}; 577 {2,4}; 611 {2,4}; 613 {2,4}
  - 620 {4}; 621 {2,4}; 622 {2,4}; 625 {2,4}; 628 {2,4}; 632 {4}; 633 {4}; 635 {4}; 637 {4}
  - 639 {2,4}; 643 {4}; 644 {2,4}; 645 {2,4}; 646 {2,4}; 648 {4}; 649 {2,4}; 650 {4}; 651 {4}
  - 652 {2,4}; 653 {2,4}; 654 {2,4}; 655 {2,4}; 656 {2,4}; 657 {2,4}; 658 {2,4}; **659 {2,4}**; 661 {2,4}
  - 664 {2,4}; 666 {2,4}; 668 {2,4}; 669 {2,4}; 670 {2,4}; 671 {2,4}; 672 {2,4}; 673 {2,4}; 674 {2,4}
  - 677 {2,4}; 679 {2,4}; 682 {2,4}; 684 {2,4}; 699 {2}
- **Not represented:** 3pc-only sets (Fel Skin 573, Primal Intent 619 and others), because `SetThreshold` is `2 | 4`. Also helper-built or variable-built sets (Gladiator's Sanctuary 584, Gladiator's Battlegear 567, the Oathbound sets), and Cryptstalker's 6 and 8.
- Gladiator's Vindication 583 is not among the literal registrations the parser found, so it is not in the table.

**`rank.ts` se (the F7 fix, via N5's last clause).** Every package, 4pc, pair and vacate figure is built as an explicit linear combination of raw sims: `B = Σ c_k · dps_k`. Its se is `sqrt(Σ (c_k · se_k)²)`, where `se_k = stdev_k / sqrt(iterations)` is each sim's own raw se.

- A sim that enters a figure more than once (the baseline, prefix singles, the 2pc package inside the 4pc) enters once, with its net coefficient. This covers N5's coefficients (baseline −3 or +3 for J4; the pair term `(n−1)² · se_pair²`) and the k² shared-baseline point.
- Each bonus carries `_diag.terms` (key, coefficient, dps, se) and `_diag.valCheck = Σ c·dps`. `valCheck` equals `bonusDps` to within 5e-13 in every dump, so the coefficients reproduce the engine's own figure.
- `seCombineSe` keeps the old engine se for comparison.
- `bonusDpsNet` gets `netTerms` and `netSe` the same way: the bonus's own terms minus `factor × terms(B)` for each inflation key.
- A1 also adds two optional fields to `IndividualDelta`: `rawDps`, and `baseKey`, which names the baseline the single was differenced against.
- No other logic changed, and the 492 guard was not touched.

**Statistical assumption.** The se treats every sim as independent. All sims share seed 11 (common random numbers), so this se is an upper bound (C10). The real se of these differences is likely smaller, which makes a large `B/se` more significant, not less.

## A2 — runs and wall times

Each run had sources 14/14, no candidate cap, BiS only off, Set potential off. The gear check passed item by item before and after each run.

| run | spec / preset / page phase / iterations | dump | wall | baseline dps | rows |
| --- | --- | --- | --- | --- | --- |
| 1 | ret, "Phase 2 / P2", phase 3, 3000 | `measurements/ret-p3-p2-3000.json` | 813 s | 2084.16 | 467 |
| 2 | ret, "Phase 2 / P2", phase 3, 10000 | `measurements/ret-p3-p2-10000.json` | 2195 s | 2086.78 | 467 |
| 3 | ret, "Phase 1 / Pre-raid", **phase 2**, 10000 | `measurements/ret-p2-preraid-10000.json` | 810 s | 1840.25 | 288 |
| 4 | feral, "Phase 2 / BiS 6%", phase 3, 10000 | `measurements/feral-p3-p2bis-10000.json` | 802 s | 2448.47 | 353 |
| 5 | feral, "Phase 1 / Pre-Raid", **phase 2**, 10000 | `measurements/feral-p2-preraid-10000.json` | 363 s | 2172.26 | 220 |
| (3 at phase 1) | ret pre-raid, phase 1, 10000 | `measurements/ret-p1-preraid-10000.json` | 10 s | 1840.25 | **0** |

- **Phase 1 has no candidate universe.** `data/universes/` has `ret-p2..p5` and `feral-p2..p5` only. The phase-1 ret run ranked 0 candidates (`candidates: []`), so runs 3 and 5 ran the pre-raid gear at phase 2, the lowest phase with a universe.
- **Run 1 reproduces scenario I exactly:** CF4 21.07, J4 15.32, LB2 −3.14, LB4 −4.22, baseline 2084.2. The sim is deterministic at a fixed seed, and the pin `2cf4ec46` gives the same figures as fork `5e009317` and fixture fork `bcbb5e74`.
- **Wall times are 3–4× C7** (ret 3000: 813 s against 185 s in scenario I). The backend used about 2.4 of 20 logical cores while it ran. Feral ran faster than ret here: fewer candidates, and phase 2 for run 5.

## A3 — probe verdicts (run 2, 10000 iterations)

Every input below is a **raw-sim se**; no input is a paired-delta se. Formulas are per raw sim; `base` is the baseline, `s:<id>` a single, `pkg:<set>:<t>` a package, `pair:<a>+<b>` the 492 pair sim.

Verdict: systematic (Justicar 4pc, R = 17.82)

- J4 = 17.82, se = 4.46 (B/se 3.99). The old engine se was 2.94.
- Formula: `B = +1·pkg:626:4 +3·base −1·s:29073 −1·s:29075 −1·s:29072 −1·s:29074`.
- The test: `|J4| = 17.82 ≥ 2·se = 8.92`, so it is not noise. `J4 = 17.82 ≥ 15.32 − 8.92 = 6.40`, so it did not move. `R = 17.82 > 4.81`.
- At 3000 iterations (run 1), with the corrected se, it was 15.32 ± 8.21.

**Crystalforge 4pc verdict: systematic.**

- CF4 = 17.32, se = 3.40 (B/se 5.09) at worn 1, with the 492 pair sim. Pair B2 = 0.78 in run 2, against 4.80 in run 1.
- Formula: `B = +1·pkg:629:4 +1·s:30131 +1·s:30133 −1·s:30132 −2·pair:30131+30133`. The baseline cancels. The pair coefficient is `n−1 = 2`, so `4·se_pair²`.
- The test: `17.32 ≥ 6.80`, so it is not noise; `17.32 ≥ 21.07 − 6.80 = 14.27`, so it did not move.

**Lightbringer 2pc verdict: noise.** LB2 = 1.52, se = 2.42. Formula: `+1·pkg:680:2 +1·base −1·s:30990 −1·s:30993`.

**Lightbringer 4pc verdict: noise.** LB4 = −0.75, se = 3.40. Formula: `+1·pkg:680:4 +2·base −1·s:30989 −1·s:30997 −1·pkg:680:2` (the difference form: `P4 − P2 − Σ extra singles`, with baseline coefficient `m = 2`).

**N9.** At 10000 iterations, 2·se for J4 is 8.92, above the 4.81 floor. "stable-smaller with R ≤ 4.81" needed `8.92 ≤ |J4| ≤ 4.81`, which cannot happen. So the proceed branch through stable-smaller was unreachable, and only a **noise** verdict could have let the build go ahead.

**Second look (not a verdict).** On the ret pre-raid gear (run 3) the same inert bonuses read as noise: J4 −5.25 ± 4.15 and CF4 2.33 ± 3.17. The residue that makes J4 and CF4 read +17 on the P2 gear is absent on the pre-raid gear. **Hypothesis, untested:** a stat-interaction term between the package pieces, for example hit or expertise crossing a cap. This is the d1-noise.md candidate (1).

## A4 — calibration table (package figures)

`admitted = B > 2·se` (one-sided, N2). A residue flag means `B < −2·se`. Every se is the difference form described in A1, computed from raw-sim se inputs.

| run | set:threshold | worn | B | se | old se | B/se | admitted | residue flag | net | net se | formula (coefficient · raw sim) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | Crystalforge 629:4 | 1 | 17.32 | 3.40 | 2.69 | 5.09 | yes (**inert, residue**) | | 17.32 | 3.40 | `+1·pkg:629:4 +1·s:30131 +1·s:30133 −1·s:30132 −2·pair:30131+30133` |
| 2 | Justicar 626:4 | 0 | 17.82 | 4.46 | 2.94 | 3.99 | yes (**inert, residue**) | | 17.82 | 4.46 | `+1·pkg:626:4 +3·base −Σ4 s` |
| 2 | Lightbringer 680:2 | 0 | 1.52 | 2.42 | 2.42 | 0.63 | no | | 1.52 | 2.42 | `+1·pkg:680:2 +1·base −1·s:30990 −1·s:30993` |
| 2 | Lightbringer 680:4 | 0 | −0.75 | 3.40 | 2.97 | −0.22 | no | | −0.75 | 3.40 | `+1·pkg:680:4 +2·base −1·s:30989 −1·s:30997 −1·pkg:680:2` |
| 2 | Burning Rage 566:2 | 0 | 7.87 | 2.37 | 2.37 | 3.32 | yes | | 7.87 | 2.37 | `+1·pkg:566:2 +1·base −1·s:33173 −1·s:23522` |
| 3 | Crystalforge 629:2 | 0 | 1.53 | 2.22 | 2.22 | 0.69 | no | | 1.53 | 2.22 | `+1·pkg:629:2 +1·base −1·s:30131 −1·s:30129` |
| 3 | Crystalforge 629:4 | 0 | 2.33 | 3.17 | 2.76 | 0.74 | no | | 2.33 | 3.17 | `+1·pkg:629:4 +2·base −1·s:30130 −1·s:30132 −1·pkg:629:2` |
| 3 | Justicar 626:4 | 0 | −5.25 | 4.15 | 2.73 | −1.27 | no | | −5.59 | 3.86 | `+1·pkg:626:4 +3·base −Σ4 s` |
| 4 | Thunderheart 676:2 | 0 | 75.34 | 1.60 | 1.60 | 46.98 | yes | | 75.34 | 1.60 | `+1·pkg:676:2 +1·base −1·s:31034 −1·s:31044` |
| 4 | Thunderheart 676:4 | 0 | 201.60 | 2.25 | 1.94 | 89.48 | yes | | 109.20 | 2.20 | `+1·pkg:676:4 +2·base −1·s:31048 −1·s:31042 −1·pkg:676:2` |
| 4 | Nordrassil 641:4 | 0 | 150.53 | 3.01 | 1.93 | 50.07 | yes | | 58.12 | 2.73 | `+1·pkg:641:4 +3·base −Σ4 s` |
| 4 | Malorne 640:4 | 2 | 21.12 | 1.61 | 1.61 | 13.12 | yes | | 21.12 | 1.61 | `+1·pkg:640:4 +1·base −1·s:29097 −1·s:29099` |
| 5 | Nordrassil 641:4 | 0 | 73.04 | 2.80 | 1.82 | 26.10 | yes | | 36.47 | 2.10 | `+1·pkg:641:4 +3·base −Σ4 s` |
| 5 | Malorne 640:2 | 0 | 101.22 | 1.50 | 1.50 | 67.27 | yes | | 79.81 | 1.83 | `+1·pkg:640:2 +1·base −1·s:29100 −1·s:29096` |
| 5 | Malorne 640:4 | 0 | 12.42 | 2.14 | 1.83 | 5.82 | yes (raw); net −2.74 ± 2.12 | | −2.74 | 2.12 | `+1·pkg:640:4 +2·base −1·s:29097 −1·s:29099 −1·pkg:640:2` |

Reference, run 1 (3000 iterations, corrected se): CF4 21.07 ± 6.20; J4 15.32 ± 8.21; LB2 −3.14 ± 4.44; LB4 −4.22 ± 6.24; Burning Rage 2pc 7.27 ± 4.33.

**Residue flags (N2).** No row in runs 1–5 is below −2·se. The committed fixture `feral-p3-th-hands-legs` has two (§0).

**Non-tier sets that decide B6's re-record scope:**

- **566 Burning Rage: admitted** on its package figure. Run 2, P2 gear: 7.87 ± 2.37. But its worn break value on the pre-raid gear is 0.34 ± 2.23 (next table).
- **573 Fel Skin: not measurable.** It is a 3pc-only set, and A1 cannot represent thresholds other than 2 and 4.
- **583 Gladiator's Vindication: not measurable.** It has no literal `NewItemSet` registration that the parser finds.
- **584 Gladiator's Sanctuary: not measurable.** It is helper-built (`pvpResilience2PBonus`), so it is `unparsed`.

**Predicted ranking effect of the rule on runs 3 and 5.** Row `deltaDps` values already contain any worn bonus a single swap breaks, because the sim sees the broken set. What changes is the Set potential view.

- **Run 5 (feral pre-raid, Wastewalker 4/4).** Each shoulder, chest, hands or legs row (49 rows: 10/12/16/11) now breaks an implemented Wastewalker 4pc, with B = 21.41.
  - A package that takes Wastewalker to 1 or 0 also breaks the 2pc, with B = 27.66.
  - Malorne 2pc goes from raw 101.22 to net 79.81, and Malorne 4pc from raw 12.42 to net −2.74. Nordrassil 4pc goes from 73.04 to net 36.47.
- **Run 3 (ret pre-raid, Burning Rage 2/2).** The 41 shoulder and chest rows now break Burning Rage 2pc, with B = 0.34, which is noise.
  - Justicar 4pc goes from −5.25 to net −5.59, and Crystalforge 2pc and 4pc nets are unchanged.
- **Row-level detail.** I did not compute the ON-view per-row credit for each row. The figures above are the engine's package and net values from the dumps.

## Break value table (vacate figures, N4)

These are not package figures. The se uses the same form as A1: the formula below over raw-sim se inputs. `neutral` records what the vacate replaced the worn pieces with.

| run | bonus | worn | B | se | old se | B/se | vacated → replacements (their sets) | neutral? | formula |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | Burning Rage 566:2 | 2 | 0.34 | 2.23 | 2.23 | 0.15 | 33173, 23522 → 30740, 28485 (none) | yes, no set piece | `+1·vac:566:2 +1·base −1·s:30740 −1·s:28485` (worn = t, coefficient −1) |
| 4 | Malorne 640:2 | 2 | 92.41 | 1.55 | 1.55 | 59.51 | 29100, 29096 → 33674, 33675 (584, 584) | set pieces, but 584 has no implemented threshold | `+1·vac:640:2 +1·base −1·s:33674 −1·s:33675` |
| 5 | Wastewalker 659:4 | 4 | 21.41 | 1.48 | 1.48 | 14.42 | 27797, 28264 → 30230, 30222 (641, 641) | set pieces; 2 Nordrassil cross no implemented threshold | `+1·vac:659:4 +1·base −1·s:30230 −1·s:30222` |
| 5 | Wastewalker 659:2 | 4 | 27.66 | 2.10 | 3.40 | 13.20 | 27797, 28264, 27531 → 30230, 30222, 29947 (641, 641, none) | as above | `−1·vac:659:2 +2·vac:659:4 −1·s:30230 −1·s:30222 +1·s:29947` (n = 3, coefficient 1, uses the 4pc's terms) |

**Burning Rage anomaly (hypothesis, untested).** The Burning Rage 2pc is +20 melee hit rating (`sim/common/tbc/items_sets.go:115-124`, `RequiredProfession: Blacksmithing`; the request carries `profession2: Blacksmithing`). Ret pre-raid is 69.6 hit rating below cap (`caps.hit.gap`). The ret EP weight for hit is 2.15 against 1.0 for strength, which suggests tens of DPS for this bonus. The vacate reads 0.34 ± 2.23, while the package on the P2 gear reads 7.87 ± 2.37. Something in this is not what the plan assumes, whether it is the bonus, the profession check or the vacate. I did not investigate it.

## Gear dependence (N3a, optional; run)

These are repeats of run 5 (feral pre-raid, phase 2, 10000 iterations), with worn Wastewalker pieces swapped out through the page's saved settings. The swapped-in item keeps the slot's enchant and has no gems.

| run | worn Wastewalker | swap | dump | wall | baseline | Wastewalker 2pc B ± se | Wastewalker 4pc |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | 4/4 | none | `feral-p2-preraid-10000.json` | 363 s | 2172.26 | 27.66 ± 2.10 | 21.41 ± 1.48 |
| 5a | 3/4 | hands 27531 → 29947 | `feral-p2-preraid-swap6_29947-10000.json` | 343 s | 2162.69 | 26.68 ± 1.48 | not worn; no candidates, so not measured |
| 5b | 2/4 | hands → 29947, legs 27837 → 29995 | `feral-p2-preraid-swap6_29947_8_29995-10000.json` | 342 s | 2186.93 | 25.87 ± 1.50 | not worn; not measured |

- **Wastewalker 2pc (+35 hit) moves by 1.8 DPS** across these three gear states, which is within about 1 se. This data cannot say how it behaves near the hit cap; these states are all below it.
- **Other bonuses in the same runs moved more.**
  - Malorne 2pc raw: 101.22 / 53.74 / 74.05; net: 79.81 / 80.42 / 74.05.
  - Malorne 4pc net: −2.74 / −1.19 / 4.15.
  - Nordrassil 4pc raw: 73.04 / 10.56 / 62.93; net: 36.47 / 37.24 / 37.06.
  - The raw figures swing with the breaks. The nets are stable to within about 6 DPS.
- **Time cost:** 685 s for the two runs.

## Findings for the 2e-2 redesign (recorded, not acted on)

1. The residue probe is **systematic**. J4 and CF4 are inert on the default ret APL, and they read about +17 at 4–5 se on the P2 gear, but about 0 on the pre-raid gear. A `B > 2·se` calibration at one gear set per spec would admit both.
2. Phase 1 has no universe, so the plan's "phase-1 ret/feral run from the pre-raid preset" (B4, B6, B7) runs no candidates.
3. The corrected se is larger than the old engine se wherever the baseline or a 2pc enters a figure more than once. The old se was too small by up to 35% on the 4pcs: J4 2.94 → 4.46; Nordrassil 4pc 1.93 → 3.01. The one case where it shrank is Wastewalker 659:2, from 3.40 to 2.10, because shared sims cancel.
4. Measured wall times are 3–4× C7's estimate.
5. The Burning Rage 2pc break value is about 0, against an expected value of tens of DPS (above).
