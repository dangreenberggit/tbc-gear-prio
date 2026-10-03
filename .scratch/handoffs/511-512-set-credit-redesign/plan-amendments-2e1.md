# Round 2e-1 amendments (orchestrator, Gate B round 2)

The re-review (`plan-review-r2.md`) found one blocking finding (N7) and several material ones. N7, N1, N3, N11, N12 and N13 concern round 2e-2's design: the calibration rule, the generated-file stamping and the scope across specs. **Round 2e-2 is not approved.** Its design will be redone after 2e-1's data is in, with the owner.

Round 2e-1 is measurement only. Its temporary fork edits are reverted, and it commits nothing but scratch files. It goes ahead now, with these binding amendments. Each wins over plan.md where the two disagree.

- **N8.** The A1 temporary table must keep 626:2 (Justicar 2pc) **false**, so J4 has no 2pc term. List every A1 table change in the report.
- **N2.** The probe and admission are one-sided. A significantly **negative** set value (`B < −2·se`) counts as residue evidence, not as a real bonus. In A3, compute the residue with `R = |J4_10k|`. Record every significantly negative value in A4 as a residue flag.
- **N5.**
  - Say, for every se you report, whether each input is a raw-sim se or a paired-delta se.
  - Use the correct coefficients. For a 4pc at 0 worn with no 2pc term (J4), B4 = P4 − Σ singles, and the baseline enters with coefficient 1 − 4 = −3. Where the inputs are delta se, account for the shared baseline correctly (k singles give k²·se_base², not k·se_base²). The pair term is (n−1)²·se_pair².
  - Write the exact formula used for each row into d1-measurements.md.
  - If the engine's per-bonus `se` cannot be made correct by a small temporary edit, compute the se offline from the dumped raw sims, and say so.
- **N4.** For sets that are only worn (Wastewalker in run 5, Burning Rage in run 3), record the vacate-based figures from `breaks[]` / `brokenSetValues`: value and se, and whether the vacate target is neutral. Define their se the same way as N5. Report them in A4 as a separate "break value" table. Do not treat them as package figures.
- **N6.** Before the runs, restart the backend from `.claude/launch.json` (`wowsims-backend` builds `wowsimtbc.exe` from the fork source at start). Record `git -C vendor/tbc-new-fork log -1 --format=%H -- sim/` and the build time in the report, so the Go sim is known to match the pin. Vite needs Node 22 (ticket 507).
- **N9.** At 10000 iterations the 2·se bar (about 5.8) exceeds the 4.81 floor. So "stable-smaller with R ≤ 4.81" may be unreachable. Report the verdict against the plan's rules anyway, and add one sentence saying whether the proceed branch was reachable given the measured se.
- **N1.** Crystalforge 4pc gets its own verdict line with the same three-way rule as J4, including its pieces, its 2pc term and its pair sim if one exists. Do the same for Lightbringer 2pc and 4pc. These results matter for the 2e-2 redesign.
- **N10.** Save `git -C vendor/tbc-new-fork diff > round-2e/a1.diff` before reverting. The report cites it.
- **Gear dependence (N3a, a data point for 2e-2).** If time allows after the five runs, repeat run 5, feral pre-raid, with one worn Wastewalker piece swapped out (worn 3/4, then 2/4). This shows how much the Wastewalker 2pc and 4pc value moves with gear. Mark this optional, and record its time cost.

The round ends at A5: revert the fork, commit only files under `round-2e/`, and report. Do not start B-steps.
