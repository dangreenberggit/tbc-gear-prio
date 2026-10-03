Status: open
Type: investigation
Origin: pre-merge review round 10 of feat/tab-signoff-followups, finding D3 (`docs/reviews/feat-tab-signoff-followups.md`), 2026-10-02
Blocks: none
Blocked by: none
Related: 511, 521, 516

# Meta-gem repair may put hit gems on set gear that is already at the hit cap

This ticket is a record of a hypothesis. Nobody ran a sim to file it.

## What was found

The F1 check on ticket 511 notes that the choice of a Rigid Dawnstone
(+8 hit) was not checked. For ret, candidate socket fills score melee hit
at 0 (`packages/core/src/candidate-gems.ts` about lines 335-344,
`cap-profile.ts` about line 125), so a fill should never pick Rigid
there. The domain reviewer's hypothesis, untested: meta-gem repair keeps
full EP weights (`candidate-gems.ts` about line 326, fork `rank.ts` about
line 3815), so a repair can choose hit gems that add nothing on a
character already at the hit cap.

If true, the package and step gear the set rows are valued by can hold
dead hit gems, and set totals read low by the value of the stats those
sockets could have held.

## What would close this

1. Find which path chose the Rigid Dawnstone in the F1 gear, from the
   code or a logged repair (record the command).
2. If meta repair is the cause, either make repair use the capped
   weights, or record here why it stays (with the size of the effect
   from a sim, and the command).

## Comment 2026-10-03: readings and probe results the 535 tests use

`packages/core/test/fork-meta-repair.test.ts` takes its literals from the
`/computeStats` readings and probe results below. They are copied here from
gitignored files under `.scratch/stage-gate/535-meta-repair-hit/` (the plan
is `plan.md` there, revision 6.1). Re-run commands: `measurement.md`
§ Re-run (the sims and stats reads), and the plan's Appendices D (the
probes) and E (wowsims' optimizer).

### Baseline and swapped-gear hit (plan Appendix B)

Baseline, from `.scratch/stage-gate/511-512-set-credit/f1/stats-cold.log`
line 1 (the ret-p3-p2 fixture's gear): `hitRating.gear` 52,
`meleeHitPercent_final` 6.297560509125587, targets `[73]`, no sets. The
budget is (9 − 3 − 6.297560509125587) × 15.769233 = −4.69 rating (tests
535-B1 to B3, 535-L0).

Swapped gear, from the measurement's `/computeStats` reads
(`results/ret-p3-p2.jsonl`, `type: "stats"`, fork `b1eb1de85`). "As built"
is greedy repair (alt `None`); "pre-repair" is the variant without the
repair's hit gems (alt 24058). `remaining` = −4.69 − (pre-repair − 52).

| Row | Item id | As built | Pre-repair | `remaining` |
| --- | --- | --- | --- | --- |
| Heartshatter Breastplate | 32365 | 75 | 59 | −11.69 |
| Krakken-Heart Breastplate | 30102 | 75 | 59 | −11.69 |
| Chestguard of the Conniver | 28601 | 67 | 51 | −3.69 |
| Glory of the Defender | 30896 | 79 | 63 | −15.69 |
| 19 uncapped rows | see below | 45 | 29 | 18.31 |
| Burning Rage package, set-less version (518) | 33173 + 23522 | 54 | 38 | 9.31 |
| Burning Rage package, bonus active (519) | 33173 + 23522 | 74 | 58 | not reachable locally |

The 19 uncapped chest ids: 30907, 32334, 23522, 28599, 30913, 32592, 32327,
30075, 30887, 30899, 32340, 30904, 28602, 28578, 28662, 28735, 29921, 28600,
30065 (`results/ret-p3-p2.calls.txt`, requests 181–516).

Feral budgets (test 535-O1) are derived, not read from a sim:
6 × 15.769233 − G(baseline). Baseline G: feral-p2-malorne4 96,
feral-p3-p2bis and feral-p3-nordrassil4 94, feral-p3-th-hands-legs 148.

### The probes (plan Appendix D)

Scored with V (credit on, hit capped). Each cell: repairs where the rule
loses to the exact search, and the range of the loss in EP.

| Fixture | Repairs (deficit) | Capped greedy, no credit | Greedy with credit | Exact search |
| --- | --- | --- | --- | --- |
| ret-p3-p2 | 55 (31 × 1, 24 × 2) | 31, 2.25 | 0 | 0 |
| feral-p2-malorne4 | 2 (2, 3) | 2, up to 2.31 | 2, up to 2.31 | 0 |
| feral-p3-nordrassil4 | 8 (1 × 2, 7 × 3) | 8, up to 2.76 | 6, up to 0.44 | 0 |
| feral-p3-p2bis | 12 (2 × 2, 10 × 3) | 12, up to 2.76 | 10, up to 1.40 | 0 |
| feral-p3-th-hands-legs | 8 (1 × 2, 7 × 3) | 1, 0.04 | 0 | 0 |

Sources: `probe/review-probe/results-review.json` (`hit.cg.capGreedyCreditGap`,
`hit.cg.gapCredit`). The exact search's value equals `hit.cg.creditOpt` on 85
of 85.

Search timing (`probe/probe-timing/results-timing.json`): at `d + 1`
changes, medians 7.1, 22.3 and 134.4 ms at 2, 3 and 4 changes allowed,
maximum 330.3 ms; at `d + 2`, median 558.1 ms and maximum 1406.5 ms at 5
changes, and nothing better than `d + 1`.

Work counts (`probe/probe-222/results-222.json`, fork `72bc102f2`): on the
85 repairs at most 1,343,593 work and 136.2 ms (feral-p3-th-hands-legs, row
32235, d = 3); rogue P2 single swaps, 265 repairs, at most 23,318 work and
4.81 ms; enhancement P3, 388 repairs, at most 24,563 work and 7.29 ms;
rogue P2 gear with gems removed to deficits 4, 5 and 6: 171,723, 340,749
and 546,669 work (68, 100 and 173 ms).

At the synthetic deficit of 4, greedy with the credit scored V 88.06
against the minimal-set search's 73.30. The evidence for why
(`partC.cases[0]`): the probe emptied 11 sockets to reach that deficit, and
greedy's fill of an empty socket is free EP; the search without the
minimal-set condition scored V 116.1; on real preset gear greedy never beat
the search (rogue P2 0 of 265, enhancement P3 0 of 388); and production
fills a candidate's empty sockets before repair (`fillEmptyCandidateGems`
in fork `rank.ts` `swapItemAt`). So the minimal-sets rule loses no way of
switching the meta on, and drops only changes the meta does not need.

### wowsims' optimizer on the same repairs (plan Appendix E)

Settings matched to the tab (rare palette, preset weights, a cap gap equal
to our budget). Sources: `wowsims-opt/summary.txt`, `backend-time.jsonl`,
`backend-sim.jsonl`.

| Fixture (n) | free: equal / below / above | free: sockets changed (d) | freeWorn | frozen |
| --- | --- | --- | --- | --- |
| ret-p3-p2 (55) | 0 / 55 (1.30–2.87) / 0 | 4–5 (1–2) | 35 / 20 / 0 | 54 / 1 / 0 |
| feral-p2-malorne4 (2) | 0 / 2 (1.91–3.47) / 0 | 3 | 0 / 2 / 0 | 2 / 0 / 0 |
| feral-p3-nordrassil4 (8) | 0 / 8 (1.16–2.05) / 0 | 3 | 1 / 7 / 0 | 4 / 4 / 0 |
| feral-p3-p2bis (12) | 0 / 12 (1.40–6.53) / 0 | 2–4 | 0 / 12 / 0 | 12 / 0 / 0 |
| feral-p3-th-hands-legs (8) | 0 / 7 (1.16) / 1 (0.36) | 4–5 | 7 / 0 / 1 | 6 / 0 / 2 (1.52) |
| Total (85) | 0 / 84 / 1 | | 43 / 41 / 1 | 78 / 5 / 2 |

Cost: Go median 136.0 ms per call; `:3333` median 155.1 ms; the exact
search in the same run, median 9.5 ms. Sims on `:3333`, seeds 11, 3011,
6011 at 3000 iterations, exact layout minus optimizer layout: wrist row
32574 +2.93 DPS (SE 0.01), chest 30907 +1.91 (SE 0.67), chest 32365 +1.47
(SE 0.00), Burning Rage step (freeWorn) +3.18 (SE 0.02).

### The production search, measured by the tests and by step 4 Part C

At fork `890e8e643`, `npx vitest run packages/core/test/fork-meta-repair.test.ts`
on Node 22:

- 535-O1 runs the 85 measured repairs through `candidateSwapWithRepairs`
  and checks the search against the brute force in
  `packages/core/test/meta-repair-oracle.ts`. It found no package repair
  beyond the 5 the probes found. Its wall time was 24.9 s in a run of O1 and
  O2 alone and 12.9 s in a run of the whole file.
- 535-T1 counted 546,669 work at the synthetic deficit of 6, the probe's
  count, in 498–836 ms across three runs (the probe measured 173 ms; why it
  is slower here is a hypothesis, untested).

Step 4 Part C ran the production `bestMinimalRepair` (no hit budget, `d + 1`
changes) on the 2/2/2 probe's jobs (`probe/probe-222-prod/probe222prod.test.ts`,
`results-222-prod.json`): rogue P2, 265 single-swap repairs, none past the
work limit, 0.85 s in all, at most 22.7 ms and 23,318 work; enhancement P3,
385 single-swap and 3 set repairs, none past the limit, 1.67 s in all, at
most 9.3 ms and 24,563 work. Its value and work equal the probe's on every
repair. The check (no repair past the limit, at most 5 s per preset) passed,
so the exact search runs for every spec.
