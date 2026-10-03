# Handoff: redesign set credit and set breaks (tickets 511 and 512)

> **Read first:** `.scratch/handoffs/owner-quotes-upgrades-tab-closeout.md` has the owner's own words, quoted exactly. Where this handoff and those quotes differ, the quotes are the owner's intent and this handoff is an agent's reading.

Written 2026-09-25 on branch `feat/tab-signoff-followups`. Main was at `76724ab3` and the fork at `2cf4ec46e` when the measurements ran. The fork working tree is clean again (`git -C vendor/tbc-new-fork status --porcelain` printed nothing after the round).

## Where things stand

Round 2e-1 measured set-bonus values on the fork sim and stopped at its decision gate. The verdict is **systematic**: the engine's set-bonus figure gives about +17 DPS to two ret bonuses that cannot add ret DPS, on one gear set, and about 0 on another. No code was changed. Round 2e-2, the build, was never approved and did not start. Tickets 511 and 512 stay open.

The next session must redesign how a set bonus is measured before it designs anything else. Start by agreeing the measurement method with the owner (see "Recommended start" at the end).

## What the owner decided

On 2026-09-25 the owner said that 511 and 512 are fixed before the branch merges. The merge stays held until then.

The owner's standing direction is that set facts come from wowsims, not from a list that this repo keeps by hand. The same lesson is recorded in ticket 301 (the eligibility mirror), ticket 505 (candidate pool from the wowsims item source) and the memory note `project-fork-items-come-from-wowsims.md`. A design that adds to a hand-kept table of sets needs an explicit owner exception.

On 511, the owner's first guess was "a threshold or 'sim more so less noise' situation". The measurements below show that more iterations do not remove the credit.

## Files in this handoff

All files are in `.scratch/handoffs/511-512-set-credit-redesign/`. They are copies of files from `.scratch/stage-gate/upgrades-tab-closeout/round-2e/`, which is gitignored. Paths inside the copies still say `round-2e/...`; read them as this folder.

`brief.md` is the round's brief. `d1-noise.md` (noise and se) and `d3-sets.md` (how the sim registers item sets, and the 2/4 threshold sites) are the investigations. `plan-r1.md` and `plan-review.md` are revision 1 and its review. `plan.md` and `plan-review-r2.md` are revision 2 and its review. `plan-amendments-2e1.md` holds the binding changes the orchestrator made before the measurements ran. `d1-measurements.md` is the full results report. `a1.diff` is the temporary fork edit that the measurements used. `measurements/` holds the eight JSON dumps.

Three files were not copied. `round-2e/measure-path.md` (how the tab recorder measures) and `round-2e/measurements/a0-fixture-dump.txt` (the §0 fixture figures, already quoted in `d1-measurements.md`) are still in the gitignored folder and may be lost. The driver script `measure.mjs` was in a session scratchpad and is gone. It was a copy of `scripts/tab-fixtures/record.mjs` with three changes, listed in `d1-measurements.md` under "Environment".

To re-run a measurement: apply `a1.diff` to the fork at `2cf4ec46e`, restart the backend from `.claude/launch.json` (`wowsims-backend`), start vite on Node 22, and drive the tab. Revert the fork afterwards with `git -C vendor/tbc-new-fork checkout -- .`.

## What was measured

Every run used the tab on the fork engine with sources 14/14, no candidate cap, "BiS only" off and "Set potential" off. Every dump records `simCommit` `5be3a563` (the last fork commit under `sim/`) and `forkDiffSha1` `cd450b4b`, which is the sha1 of `a1.diff`.

The temporary edit `a1.diff` did two things. It widened the fork's implemented-set table to every literal `NewItemSet` registration at thresholds 2 and 4 (56 sets), with Justicar 2pc kept off. It also rebuilt each bonus's standard error (se) as an explicit sum of raw sims: for a figure `B = sum of c_k times dps_k`, the se is the square root of the sum of `(c_k times se_k)` squared. This treats all sims as independent. They all use seed 11, so this se is an upper bound.

| run | spec, preset, page phase, iterations | dump | wall time | baseline DPS |
| --- | --- | --- | --- | --- |
| 1 | ret, P2, phase 3, 3000 | `ret-p3-p2-3000.json` | 813 s | 2084.16 |
| 2 | ret, P2, phase 3, 10000 | `ret-p3-p2-10000.json` | 2195 s | 2086.78 |
| 3 | ret, pre-raid, phase 2, 10000 | `ret-p2-preraid-10000.json` | 810 s | 1840.25 |
| 4 | feral, P2 BiS, phase 3, 10000 | `feral-p3-p2bis-10000.json` | 802 s | 2448.47 |
| 5 | feral, pre-raid, phase 2, 10000 | `feral-p2-preraid-10000.json` | 363 s | 2172.26 |
| 5a | run 5 with hands swapped (Wastewalker 3/4) | `feral-p2-preraid-swap6_29947-10000.json` | 343 s | 2162.69 |
| 5b | run 5 with hands and legs swapped (Wastewalker 2/4) | `feral-p2-preraid-swap6_29947_8_29995-10000.json` | 342 s | 2186.93 |
| – | ret, pre-raid, phase 1, 10000 | `ret-p1-preraid-10000.json` | 10 s | 1840.25, and no candidates |

Run 1 reproduced the committed fixture `data/tab-fixtures/ret-p3-p2.json` exactly (Crystalforge 4pc 21.07, Justicar 4pc 15.32, baseline 2084.2). Runs 3 and 5 ran at phase 2 because phase 1 has no candidate universe (ticket 515).

The two ret bonuses that cannot add ret DPS are the Justicar 4pc (it changes only Judgement of Command, which the default ret APL never casts) and the Crystalforge 4pc (a party heal). Their figures:

| bonus | ret P2 gear, phase 3 (run 2) | ret pre-raid gear, phase 2 (run 3) |
| --- | --- | --- |
| Justicar 4pc (626:4) | +17.82 ± 4.46 (4.0 se) | −5.25 ± 4.15 |
| Crystalforge 4pc (629:4) | +17.32 ± 3.40 (5.1 se) | +2.33 ± 3.17 |
| Lightbringer 2pc (680:2) | +1.52 ± 2.42 | not worn or measured |
| Lightbringer 4pc (680:4) | −0.75 ± 3.40 | not worn or measured |

At 3000 iterations with the corrected se, run 1 gave the Justicar 4pc +15.32 ± 8.21 and the Crystalforge 4pc +21.07 ± 6.20. Raising the iterations from 3000 to 10000 shrank the se but left both values near +17.

The bonuses that should add DPS read clearly positive (run 4 and run 5, 10000 iterations):

| bonus | run | value ± se | value after the engine removes the break it causes |
| --- | --- | --- | --- |
| Thunderheart 2pc (676:2) | 4 | 75.34 ± 1.60 | 75.34 |
| Thunderheart 4pc (676:4) | 4 | 201.60 ± 2.25 | 109.20 ± 2.20 |
| Nordrassil 4pc (641:4) | 4 | 150.53 ± 3.01 | 58.12 ± 2.73 |
| Malorne 4pc (640:4), 2 worn | 4 | 21.12 ± 1.61 | 21.12 |
| Malorne 2pc (640:2) | 5 | 101.22 ± 1.50 | 79.81 ± 1.83 |
| Malorne 4pc (640:4) | 5 | 12.42 ± 2.14 | −2.74 ± 2.12 |
| Nordrassil 4pc (641:4) | 5 | 73.04 ± 2.80 | 36.47 ± 2.10 |
| Burning Rage 2pc (566:2) | 2 | 7.87 ± 2.37 | 7.87 |

Break values come from "vacate" sims, which replace the worn set pieces with other items. They are not package figures:

| bonus broken | run | worn | value ± se | replacement items |
| --- | --- | --- | --- | --- |
| Burning Rage 2pc | 3 | 2 | 0.34 ± 2.23 | 30740, 28485 (no set) |
| Malorne 2pc | 4 | 2 | 92.41 ± 1.55 | 33674, 33675 (set 584, not implemented) |
| Wastewalker 4pc | 5 | 4 | 21.41 ± 1.48 | 30230, 30222 (Nordrassil, below threshold) |
| Wastewalker 2pc | 5 | 4 | 27.66 ± 2.10 | 30230, 30222, 29947 |

The full calibration table, every formula, and the rules written before run 2 was read are in `d1-measurements.md` under A3, A4 and "Break value table".

## Why each rejected design failed

**Revision 1** (`plan-r1.md`, reviewed in `plan-review.md`) derived the implemented-set table from every set the sim registers, for every spec. That turned on bonuses that do nothing for DPS (resilience, heals, mana, a PvP Intercept) across about 60 sets. At 3000 iterations the credit floor of 4.81 DPS is below one se, so those bonuses would pass it by chance. The design spread the 511 false credit to every spec (review finding F2). It also never re-recorded the committed recordings. More sets means more package sims, and `RecordedSimRunner` throws on any sim key it has no recording for, so `packages/core/test/fixtures/synthetic-roster-recordings.json` and the tab fixtures would break the tests (F1). Its probe also ran the wrong binary, and its verdict changed nothing that followed (F3, F4).

**Revision 2** (`plan.md`, reviewed in `plan-review-r2.md`) kept the derived table but admitted a bonus only when a one-time measurement per fork pin, at 10000 iterations on one gear set per spec, gave `|B| > 2·se`. The review found three problems. First, a bonus's value depends on the gear, so one gear set decides the answer for every phase and player (N3). Second, the residue differs from one package to the next, so the Justicar 4pc's residue does not bound the Crystalforge 4pc's (N1). Third, the plan copied a generated file that embeds `forkCommit` byte for byte into the fork. Each fork commit moves the pin and changes that stamp again, so the drift check could never pass (N7). The measurements then confirmed the first two problems: on the P2 gear the rule admits both inert ret bonuses, the Crystalforge 4pc at 5.1 se and the Justicar 4pc at 4.0 se.

## What the systematic verdict means

The engine computes a set bonus as the package sim minus the baseline, minus each piece's single-swap delta, minus the 2pc value for a 4pc. On the ret P2 gear that figure is about +17 for two bonuses whose true value is 0. On the ret pre-raid gear the same two read about 0. So on well-geared characters the figure is not a clean measure of the bonus. It also contains a term that depends on the gear. More iterations make that term more precise; they do not remove it.

The cause is untested. The working hypothesis is an interaction between the stats of the package pieces, for example hit or expertise crossing a cap, that single swaps on the baseline do not see. This is candidate (1) in `d1-noise.md`.

The committed fixture `data/tab-fixtures/feral-p3-th-hands-legs.json` shows the same problem in the other direction. It gives Nordrassil 4pc −60.46 (−17.7 se) and Malorne 4pc −31.84 (−9.1 se). A set bonus cannot cost DPS, so these values are residue too.

Every positive feral figure above may include some residue as well. None of them has been checked against a bonus of known value.

## Other findings

The old engine se was too small. For the Justicar 4pc it was 2.94, against 4.46 from the explicit sum. For the Nordrassil 4pc in run 4 it was 1.93, against 3.01. The old form counts the baseline once where it enters a figure several times, and it leaves out the subtracted 2pc term. The only case that went down was the Wastewalker 2pc break (3.40 to 2.10), because shared sims cancel.

The Burning Rage 2pc break reads about 0 on the ret pre-raid gear (0.34 ± 2.23). That gear is 69.6 hit rating below the hit cap. The bonus is +20 melee hit rating and needs Blacksmithing (`sim/common/tbc/items_sets.go` lines 115–124), and the request sends `profession2: Blacksmithing`. With a ret hit weight of 2.15 against 1.0 for strength, tens of DPS would be expected. On the P2 gear its package figure is 7.87 ± 2.37. This is an anomaly and its cause is untested (ticket 516).

No phase-1 universe exists. `data/universes/` holds phases 2 to 5 for every spec. A ret run at phase 1 from the pre-raid preset ranked nothing: `ranking.items` is empty in `ret-p1-preraid-10000.json`. Revision 2's steps B4, B6 and B7, and ticket 512's evidence, assumed a phase-1 run from pre-raid gear (ticket 515).

The Wastewalker 2pc is worth about 26 to 28 DPS at 4, 3 and 2 pieces worn (27.66 ± 2.10, 26.68 ± 1.48, 25.87 ± 1.50 in runs 5, 5a and 5b). Its value moved by less than 2 DPS across these three gear states, all of which are below the hit cap. The Wastewalker 4pc break is 21.41 ± 1.48 at 4 worn. In the same runs the raw Malorne 2pc and Nordrassil 4pc figures swung by up to 60 DPS, while their values after removing breaks stayed within about 6 DPS.

Three sets could not be measured. Fel Skin (573) has only a 3pc bonus, and the engine's `SetThreshold` type allows only 2 and 4. Gladiator's Vindication (583) has no literal `NewItemSet` registration that the parser finds. Gladiator's Sanctuary (584) is built by a helper function (`pvpResilience2PBonus`), so the parser cannot read its bonuses.

Measured wall times were 3 to 4 times the plan's estimate (ret at 3000 iterations: 813 s against about 185 s). The backend used about 2.4 of 20 logical cores.

## Open design questions

**How to measure a set bonus without the residue.** The package-difference method cannot tell a bonus from a stat interaction. One option is a switch in the sim that turns off one set bonus while the gear stays the same, so that the bonus is the difference of two sims on identical gear. The request proto has no such field today, so this means new work in the fork's Go sim, and the fork's sim would then differ from upstream. Another option is to measure each piece's single value with the other package pieces already worn, so that the singles include the interaction. That costs more sims per package, and it has not been tested whether it removes the residue. Before choosing, a probe on the Justicar 4pc in the ret P2 gear would show whether an option reads about 0 where the current method reads +17.

**Whether a cheap fix is enough for now.** The two inert ret bonuses could be marked "not implemented" by hand as a stop-gap. That removes the visible false credit on ret. It is a hand-kept list, which is against the owner's direction, so it needs an owner exception. It leaves the residue in every other set figure, on ret and feral, including the negative feral figures above. It also hides a real Justicar 4pc for a player whose own APL casts Judgement of Command (claim C23 in `plan.md`, untested).

**How to handle breaks of the non-tier sets.** The pre-raid presets wear Wastewalker 4pc (feral) and Burning Rage 2pc (ret), and nothing charges their loss today. `d3-sets.md` section 5 compares deriving the table from the sim's registrations (design A) with a hand table (design B). The Wastewalker break values look stable across gear. The Burning Rage value does not look right (ticket 516). Break figures come from vacate sims, which include the replacement items' own stats unless the replacements are neutral. They may include the same residue, which is untested. A 3pc threshold (Primal Intent, Fel Skin) needs the `SetThreshold` type widened and the 2/4 sites that `d3-sets.md` section 3 lists. Any change that makes the engine request new sims means re-recording `synthetic-roster-recordings.json` and the tab fixtures.

**Which phase the pre-raid runs use.** 512's evidence and revision 2's plan expect a phase-1 run from the pre-raid preset, and no phase-1 universe exists (ticket 515). Either that is fixed first, or the fixtures use phase 2, as round 2e-1 did.

**A requirement from ticket 502 (added 2026-09-27).** Since ticket 502, with Set potential on, a set row inside a measured package shows exactly that package's measured swap, when every bonus on its path is above the floor and paired replication rewrote none of the deltas involved (ADR-0034, ticket 502 paragraph). That equality holds because a bonus value is defined as the package's leftover after the singles. If 511/512 measures bonuses directly instead, for example with the sim switch above, the equality stops holding. 511/512 must then choose one of two options: show the measured swap and put the leftover on a popover line, or accept rows that differ from the measured swap. Source: `.scratch/stage-gate/502-other-pieces-rule/design.md`, "Sequencing with 511/512".

## Recommended start

Agree the measurement method with the owner before any design. Present the options above in prose, with what each costs and what it hides, and a recommendation. The owner decides whether a fork Go sim change is in scope, and whether a hand stop-gap for the two ret bonuses is acceptable. Only then plan the table and break changes. Use the stage-gate pipeline, because a wrong plan here has already cost two review rounds.

## Tickets

511 and 512 stay open, with comments pointing here. New tickets from this round are in `.scratch/carry-forward/issues/`. Ticket 514 records that the set bonus value carries a residue that depends on the gear. Ticket 515 records that there is no phase-1 universe and a phase-1 ret run ranks no candidates. Ticket 516 records that the Burning Rage 2pc break reads about 0 below the hit cap.
