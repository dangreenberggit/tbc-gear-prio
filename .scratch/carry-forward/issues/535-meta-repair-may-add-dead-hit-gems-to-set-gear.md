Status: closed
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
is `plan.md` there, revision 6.2). Re-run commands: `measurement.md`
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

## Closed 2026-10-03

Plan: `.scratch/stage-gate/535-meta-repair-hit/plan.md`, revision 6.2
(gitignored). An independent reviewer passed it with inline fixes, made in
this close and in fork `3613d654f`.

Fork commits (`dangreenberggit/tbc-new`, branch `feat/upgrades-tab`, not
pushed):

- `890e8e643` Pick meta repair gems by exact search (535). Meta repair
  picks, by exact search, the best minimal set of recolours that switches the
  meta back on, counting every socket bonus the recolours switch on or off.
  Past a work limit of 5,000,000 it falls back to greedy with the same value
  and writes one warning. On ret and feral, when the runner can read stats,
  hit counts only up to the character's remaining cap: one `computeStats`
  read of the baseline, moved by each swap's own change in gear hit, and in
  the set phase each repaired version's own read.
- `3613d654f` Cite ticket 535, not its plan, in rank.ts. Two comments only.

Main commits: `c8e5a8be` Re-pin fork to 890e8e643 for ticket 535 (the lock,
`data/sim-implemented-effects.json`, the tests and the comment above), and
`6535ad92` Re-pin fork to 3613d654f for ticket 535.

Tests, in `packages/core/test/fork-meta-repair.test.ts` (fork-gated, so CI
skips them; run with `npx vitest run packages/core/test/fork-meta-repair.test.ts`):

- **535-B1 to B5:** the baseline budget from the sim's hit percent, Improved
  Faerie Fire and the target level.
- **535-L0 to L2:** `gearHitRating` equals the sim's gear hit on the baseline,
  the chest rows and the Burning Rage package.
- **535-R1 to R4, C1, T1:** the over-cap chest rows get two Inscribed Noble
  Topaz; the others keep two Rigid Dawnstones; the budget caps the layout's
  total hit; a socket bonus switched on earns its value; the work limit.
- **535-O1, O2:** the 85 measured repairs, through the tab's own swap path,
  equal a brute force written in test code (`meta-repair-oracle.ts`);
  minimal sets only.
- **535-S1 to S3:** `rankUpgrades` reads the baseline's hit once; a runner
  without `computeStats` keeps full weight; a failed read warns once and
  caches no ranking.
- **535-V1 to V7:** each set version's own repair, one read per distinct
  request, the first failed read ends version budgets, Stop ends the reads,
  and the step break split keeps its pairing.

Each cycle ran red before its fix, for the reason the plan names. The
reviewer ran the plan's R1 code mutations: 16 were killed by the tests
they name, and item 19 was not (below).

**The first-step check (V7), orchestrator ruling.** V7 covers the first-step
check (`firstStep` in `queueBonusOff`) and the older store check (ruling
GK6-2) jointly: deleting either alone leaves V7 green, and deleting both
fails it. The rebuilt first-step request is never simmed, so the store check
skips its split even without the first-step check. The first-step check is
kept as redundant protection. The reviewer tried once to build a case that
isolates it and did not produce one.

### Why repair is an exact search

The 85 measured repairs, scored with V (the changed gems' EP change, minus
each socket bonus switched off, plus each one switched on, plus hit up to
the budget):

| Repair rule | Optimal on | Largest loss |
| --- | --- | --- |
| Capped greedy, no credit | 31 of 85 | 2.76 EP |
| Capped greedy with the credit added | 67 of 85 (ret 55 of 55, feral 12 of 30) | 2.31 EP |
| Exact search, `d + 1` changes | 85 of 85 | 0 |

Test 535-O1 checks the shipped search against the brute force on these 85.

At a synthetic deficit of 4, greedy with the credit scored V 88.06 against
the minimal-set search's 73.30. The evidence for why
(`probe/probe-222/results-222.json`, `partC.cases[0]`): the probe emptied 11
sockets to reach that deficit, and greedy's fill of an empty socket is free
EP; the search without the minimal-set condition scored V 116.1; on real
preset gear greedy never beat the search (rogue P2 0 of 265, enhancement P3 0
of 388); and production fills a candidate's empty sockets before repair. So
the minimal-sets rule loses no way of switching the meta on, and drops only
changes the meta does not need.

### Rulings

- **Owner, 2026-10-02, verbatim:** "Yes, fix it. There might be better
  yellow/orange/whatever gem options for activating a meta gem and this
  could artificially introduce a bad manipulation of a gear set's
  cost/benefit".
- **Owner, 2026-10-03, verbatim:** "it seems obvious that socket bonus
  should count--theyre there! and there's already a regemming funcitionality
  that wowsims has (which this brief and somewhat vague question doesnt seem
  to recogize as existing)".
- **Orchestrator, 2026-10-03, Q-535-set-gems: separately.** Each version of
  a set pair gets its own best repair. It is derived from the owner's first
  quote, "this could artificially introduce a bad manipulation of a gear
  set's cost/benefit": a shared layout made keeping Burning Rage read about 6
  DPS worse.
- **Orchestrator, 2026-10-03, Q-535-same-gear-amendment: build per-version
  repair in 535.** This is the orchestrator's ruling, not the owner's. Its
  reasons: (1) the shared layout is chosen with a hit budget that cannot see
  set-bonus hit, so on the set-kept side it is a hit-cap bug, the bug 535
  fixes; (2) the owner's stated view of this angle favours sensible gems on
  each side; (3) the plan reviewer's fixes R-1 to R-4 address the risk. The
  owner quote reason (2) cites, labelled a perspective on one angle and not a
  ruling: "It seems obvious, not considering other downside, but just this
  one angle of comparison and gemming, that the set bonus set should have
  gems a player would use that make sense and are better and not purposely
  bad, rather than just the same gems blindly. That's all I'm saying."
- **Orchestrator, 2026-10-03, Q-535-replication-check:** step 7.3's
  unchanged-gems check excepts rows whose paired-replication membership
  changed between the recordings (plan rev 6.2).

### Why wowsims' optimizer is not used

wowsims' only gem chooser is the HiGHS optimizer in
`sim/core/reforge_optimizer/`. It re-gems every non-meta socket of every
slot that is not frozen, freezes per slot only, and has no cost for changing
a gem. With settings matched to the tab, it scored below the exact search on
84 of the 85 repairs (1.16–6.53 EP), changed 2–5 sockets where 1–3 were
needed, and simmed 1.47–3.18 DPS lower on four ret cases. It is async (the
repair sites would all become async), and slower (median 136 ms per call in
Go, against 9.5 ms for the exact search). The full table is in the comment
above ("wowsims' optimizer on the same repairs"). Ticket 343 records it.

### Scope

- **The hit budget: ret and feral only.** Dual-wield white swings miss 27%
  at zero hit, so hit past 9% still helps them; casters keep school hit in
  per-school pseudo-stats and Balance of Power is a per-spell mod; hunters'
  ranged hit is unexamined. The budget is set per spec, not per build: the
  sim adds the dual-wield miss penalty only when the off hand has a swing
  speed (`sim/core/attack.go:441`), so a two-handed warrior or enhancement
  shaman has ret's 9% cap and still gets full-weight repair (pre-merge
  review round 11, D1).
- **The exact search with credit: every spec the fork tab ranks.** Measured
  with sims on ret and feral; on rogue P2 and enhancement P3 gear only timed
  and scored with V, not simmed. Step 4 Part C ran the shipped search on the
  2/2/2 probe's jobs: rogue P2, 265 repairs, 0.85 s in all, at most 22.7 ms
  and 23,318 work; enhancement P3, 388 repairs, 1.67 s, at most 9.3 ms and
  24,563 work; none past the limit. So the search was not scoped down.
- **The work limit and its fallback.** Past 5,000,000 work the search stops
  and greedy with the credit runs, with one console warning. No measured
  repair reaches the limit (largest 1,343,593).
- **Per-version budgets in the set phase.** One `computeStats` read per
  distinct version request whose build made a repair. The step 7.6.1 capture
  of ret-p3-p2 (a fake-sim run, which builds more set versions than a real
  run) made 3 reads: the baseline (`pseudoStats[12]` 6.297560509125587,
  Improved Faerie Fire, target level 73) and the two Burning Rage screen
  rungs, whose missed hit read 0.0 (set-less) and 20.0 (set-kept). The real
  runs' read counts are not recorded.

### Limits

- An item row whose single swap changes a set's count keeps the local
  budget, which misses that set's hit. The sets that give melee hit rating
  are in the fork's `sim/common/tbc/items_sets.go`: Doomplate 2pc +35
  (line 21), Wastewalker 2pc +35 (line 54), Burning Rage 2pc +20 (line
  121), Netherscale 3pc +20 (line 164) and Thick Draenic 2pc +15 (line
  219). Wastewalker is leather, so this limit applies to feral as well as
  ret (pre-merge review round 11, D2).
- The worn-set ladder keeps one shared layout, chosen without a budget when
  the baseline needs a repair.
- A feral druid's own Improved Faerie Fire is applied through Faerie Fire
  (Feral) and is not in `raid.debuffs`; with the raid debuff off the budget
  wants 3% more hit than the sim needs.
- The timing probe swapped main hands only, so off-hand swaps were not
  timed.
- Epic gems stay out of repair (ticket 117 caps repair at rare).
- Core and the CLI keep greedy repair.
- The committed fixtures under `data/tab-fixtures/` were not re-recorded: no
  gate fails when a fixture is stale, and a re-record would also move
  ret-p3-p2's pinned values for reasons outside 535 (ticket 530's seed
  change; hypothesis, from 530's close).

### Step 7: before and after

Recorded with `corepack pnpm tab-fixtures:record --spec ret --phase 3 --name
p2 --preset-tab "Phase 2" --preset "P2" --expect-gear-file
ui/paladin/retribution/gear_sets/p2.gear.json --out <dir>` and the feral
equivalent (`--spec feral --name p2bis --preset "BiS 6%"
--expect-gear-file ui/druid/feralcat/gear_sets/p2_6p.gear.json`), "before"
at fork `72bc102f2`, "after" at `890e8e643`. Compared with
`python .scratch/stage-gate/535-meta-repair-hit/compare.py before after
890e8e6430e14efdbe2920bb9f332b7d0ff6726d`.

**Ret (ret-p3-p2).** `baseline.dps` identical (2084.16). 36 rows changed
`deltaDps`: 4 with a changed gem multiset, 31 with gems in other sockets
only, and 1 with no gem change (row 32335, below).

| Check | Result |
| --- | --- |
| 4 over-cap chest rows: two 24027 → 24058 | pass, in boots 30104 sockets 0 and 1 |
| their `deltaDps` rises by more than 5 | pass: 32365 +12.715, 30102 +12.645, 28601 +11.823, 30896 +11.731 |
| 19 uncapped chest rows: two 24027 → 24051 | pass, now in 30104 sockets 0 and 1; `deltaDps` identical on all 19 |
| 31 wrist rows: one 24027 → 24054 in 30104:0 or 30106:1 | pass, all 31 in 30104 socket 0; each rose 1.73 to 2.08 DPS |
| rows with unchanged gems have identical `deltaDps` and `se` | pass on 412 rows, with one listed exception |
| set 566: pair ≠ 0, not kept, reason below-zero | pass: pair 0 → +7.36 (predicted about +8.5), measure −74.04 → −66.67, exact-zero → below-zero |

The listed exception (plan rev 6.2): row 32335 (Unstoppable Aggressor's
Ring) has unchanged gems, but wrist row 32574 rose from 9.02 to 11.10 and
took its place in the top 8 rows that paired replication re-sims. So 32335
was paired-replicate, rank 7, 10.231 before, and independent, rank 8, 10.210
after: a replicated mean in one recording and its seed-11 single figure in
the other. The recording holds no per-seed figure to compare. No other
screen set's pair changed.

**Feral (feral-p3-p2bis), report only.** Eight head item rows changed, each
rising 1.48 to 7.86 DPS (29098 +1.48, 30228 +7.00, 31039 +7.86, 32235 +5.99,
32240 +5.44, 32329 +5.27, 32525 +5.91, 33672 +5.91). Every row outside the
head slot has identical `deltaDps` and `se` (the hard check passes). The
Thunderheart package deltas are unchanged (2pc 66.26, 4pc 116.96). Screen
pairs 640, 641 and 676 moved by up to 1.32 DPS (676: 273.96 → 272.64), each
with the same verdict (band, top-k, top-k).

**Wall time.** Ret: 678 s before, 615 s after. Feral: 268 s before; the
"after" runs took 475 s, then 1532 s (attempt 1 of the repeat, a hang the
recorder's 25-minute watchdog killed; `after-logs/feral-repeat-1.log` and
`after-logs/times.txt`, gitignored), then 215, 223 and 203 s. The three
completed repeats match the first "after" recording exactly. In the hang,
the backend's log shows no sim before the next attempt began, so the run
stalled before its first sim. The cause is unknown. The reviewer's
hypothesis, untested: `WorkerPool.computeStats` has no timeout
(`vendor/tbc-new-fork/ui/core/worker_pool.ts:114-115`). At the repeats, the
Battle.net and GOG Galaxy launcher windows were open and no game window;
CPU load read 12% before attempts 3 and 4 and 1% after. The first
"before" ret attempt also failed at start (`no #phase-selector`, on a cold
`:5173`) and was re-run.

### Live check (step 7.6)

Captured with `node .scratch/stage-gate/535-meta-repair-hit/capture-after.mjs
ret-p3-p2 .scratch/stage-gate/535-meta-repair-hit/after-capture/ret-p3-p2`
(fork at `890e8e643`); alternatives from `probe/alternatives.test.ts`; 96
sims on `:3333` with `resim-layouts.mts`, seeds 11, 3011 and 6011 at 3000
iterations. B is the alternative with the highest mean DPS; D = chosen − B
per seed; a case passes when mean(D) ≥ −2 SE.

| Case | Chosen V | Alternatives' V | Chosen DPS | B's DPS | mean(D) | SE | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| chest 32365 | −1.84 | −1.94, −2.04, −2.14 | 2082.22 | 2081.48 | +0.73 | 0.00 | pass |
| chest 30102 | −1.84 | same | 2078.43 | 2078.43 | 0.00 | 0.00 | pass |
| chest 28601 | −1.84 | same | 2053.55 | 2053.55 | 0.00 | 0.00 | pass |
| chest 30896 | −1.84 | same | 1996.69 | 1996.69 | 0.00 | 0.00 | pass |
| chest 30907 | 18.40 | 16.90, 15.20, 14.10 | 2069.56 | 2068.42 | +1.14 | 0.03 | pass |
| chest 32334 | 18.40 | same | 2059.71 | 2058.53 | +1.18 | 0.01 | pass |
| Burning Rage set-less | 10.59 | 9.67, 9.51, 9.32 | 2021.62 | 2021.50 | +0.12 | 0.04 | pass |
| Burning Rage set-kept | 0.47 | −0.45, −1.37, −1.84 | 2030.22 | 2029.33 | +0.89 | 0.06 | pass |

On three capped rows the chosen layout and its alternatives simmed to the
same DPS to the last digit. The reviewer checked them against
`computeStats`: the attack power is identical, because the Strength
difference rounds away to a whole number. In the tab, the Burning Rage
set-kept version wore two Inscribed Noble Topaz and no Rigid Dawnstone
(capture request 519), so the per-version path ran.

The tab loaded the "after" ret recording and drew its table with no error
banner. No part of the tab shows a row's gem changes, so that half of the
visual check could not be judged.

## Comment 2026-10-03: closing item 1 (pre-merge review round 11, P1)

Item 1 asked which path chose the Rigid Dawnstone in the F1 gear. Meta
repair did. In the table "Baseline and swapped-gear hit" above, each chest
row's gear hit as built (with greedy repair) is 16 more than the same gear
without the repair's hit gems (for example 75 against 59), which is two
Rigid Dawnstones at +8 hit each. Tests 535-R1 to R4 pin the result after
the fix: the over-cap chest rows get Inscribed Noble Topaz and the others
keep two Rigid Dawnstones. Re-run:
`npx vitest run packages/core/test/fork-meta-repair.test.ts` (fork-gated,
Node 22).
