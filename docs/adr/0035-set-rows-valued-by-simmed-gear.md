# ADR-0035 — Set rows are valued by a sim of gear the player could wear

**Status:** accepted
**Date:** 2026-10-02
**Related:** [`ADR-0034`](0034-set-bonus-row-values-are-not-additive.md) (superseded in part here: the walk (R1) and the rule for when a row equals the measured swap, for a step ranking); tickets `.scratch/carry-forward/issues/511-ret-set-credit-counts-bonuses-with-no-ret-dps.md`, `512-set-breaks-model-only-six-tier-sets.md`, `514-set-bonus-value-carries-gear-dependent-residue.md`, `490-commit-break-assumes-top-package-over-charges-other-sets.md` (owner-quote correction), `523-moving-a-worn-set-to-other-slots-cannot-be-shown.md`, `530-tab-replicate-seeds-overlap.md`, `532-off-class-cryptstalker-sims-fail.md`; fork engine files `partner-choice.ts`, `set-screen.ts`, `set-less-copies.ts`, `rank.ts`, `view.ts` under `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/`; fixtures in `packages/core/test/fork-set-net.test.ts`, derived in `docs/set-bonus-fixture-derivations.md`; stage-gate `511-512-set-credit`

## Context

With "Set potential" on, the Upgrades tab adds a set-bonus credit to each set
piece's row. Until this change, that credit was built from single-swap figures
and a hand-kept table of six tier sets (ADR-0034, ticket 512). Two problems
followed:

- Ticket 511: on ret "Phase 2 / P2" gear at page phase 3, Justicar 4pc and
  Crystalforge 4pc read +17.82 and +17.32 (plan claim C2). Neither can add ret
  DPS on the default APL (C1). Measured on identical gear, they read +0.0000
  and +1.5851 (se 1.725) (C74).
- Ticket 512: breaks were valued only for sets the table listed.

The owner set four rules for the fix. Each quote is verbatim from the stage
decision log (`.scratch/stage-gate/511-512-set-credit/decision-log.md`):

- The measurement (line 21): "set measure: "The proposed method sims the same
  gear twice ". thats fine. its important to get these right. and the
  alternatives dont look good."
- No list (line 77): "No list. The list would have to be perfect and I don't
  want to do that."
- Rank by the best total (line 61): "total (including both set bonuses if
  applicable , as well as losing broken set bonuses if applicable, I believe).
  Your recommendation and explanation make sense and I agree"
- Option A (line 109): "I do think we need to go with A, but handling it here
  isn't simple (or it is but it's easy to overcomplicate). Maybe there's a way
  to just show the best "partner" and use that"

## Where the evidence is

Most measurements behind this ADR are **not in a clone**.

- The stage folder `.scratch/stage-gate/511-512-set-credit/` (below, `S/`) is
  gitignored (`.gitignore` line 59, `.scratch/stage-gate/*`). It holds the
  plan, the decision log, the execution report and every live result.
- Claim ids in this ADR (C1, C74, …) are rows of the claims registers in
  `S/plan.md` (C1–C202), `S/plan-k5on-patch.md` (C203–C237) and
  `S/plan-k6b-patch.md` (C238–C275). Each row names
  the command that checks it. Ids such as W-S1 and W-ON2 are those plans' win
  conditions.
- The scripts that made the results are in that folder too: `S/k5p/run-check.mjs`,
  `S/k5p/score.py`, `S/k5e/score_screen.py`, `S/k5on/parity.py` and others.
- To regenerate the results, a reader needs that folder, or must rebuild the
  scripts from the plan's steps 24–31 (K5P: steps 24–28; K5E: steps 29–31) and
  the K5ON patch's steps 33.1–33.7 (`S/plan-k5on-patch.md`). Steps 24–31 build
  the test characters, drive the live tab on :5173 against the :3333 sim server,
  and score the saved rankings offline.

What a clone does hold:

- The fixtures. They are fork-gated: CI skips them, because the fork clone under
  `vendor/` is gitignored. With the fork present at the lock's `commit`, run
  `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/fork-set-fixtures.test.ts packages/core/test/fork-sim-database.test.ts packages/core/test/wowsims-fork-parity.test.ts --reporter=verbose; echo rc=$?`.
  A skipped file still exits 0, so the passing case lines are the check (C14).
- The hand derivations of every literal, in `docs/set-bonus-fixture-derivations.md`.
- The tickets named above.

## Decision

### Option A: a set row is a sim of wearable gear

- With Set potential on, a set row is credited at the bonus with the best total.
- That total is one sim: the current gear plus the row's item plus a partner set
  for that bonus, minus the sim of the current gear.
- The partner pieces' own stats are inside that sim.

**One partner set per bonus.** The owner wrote "Maybe there's a way to just show
the best "partner" and use that" (decision-log line 109). "One partner set per
bonus, shown alone" is **the orchestrator's interpretation** of that sentence
(decision-log line 110; C134), not the owner's words.

- `choosePartnerSet` in `partner-choice.ts` picks the set. It has one call site,
  in `rank.ts`.
- The popover names only the chosen pieces.
- The player gets no control over the choice. The owner (line 109): "The risk is
  that we're overloading them with tons of extra information about all these
  other individual "partner" pieces".

### The rule for one row

For a row r of set S that the player does not wear (plan, "The rule for one row"):

- d_r is r's single-swap figure, taken before paired replication.
- A future (S, t) is **eligible** when its same-gear value clears the gate:
  B'(S, t) > max(floor, 2·se). The floor is 5.09 for feral and 4.81 for every
  other spec (C22).
- For each eligible future, g(r, t) = sim(G + r + P(r, t)) − sim(G), where P is
  the chosen partner set and G is the current gear.
- **Best total (`RULE_490` = "best-stop").** Walk the eligible futures in count
  order with a running value c = g − d_r. The credit is the largest c above 0,
  or 0.
- The row's figure is deltaDps + credit. For a row that paired replication did
  not rewrite, that equals g at the stop (C92; win condition W-S1). Check 4s
  of `packages/core/test/fork-set-fixtures.test.ts` asserts this within 1e-6
  on the recorded fixtures.
- A row is unmeasured (credit 0, "couldn't measure") when a needed same-gear
  value, step-gear total or partner choice is missing.

Step rankings read none of `bonusDps`, `bonusDpsNet`, `netInflation`, the ticket
492 pair figure or `commitBreaks` (C120, C171).

**Worked example** (K1's sims at 10,000 iterations; C85). Thunderheart Gauntlets
row on feral P2 BiS:

| Gear                                                                           | Total over current gear |
| ------------------------------------------------------------------------------ | ----------------------- |
| + Gauntlets                                                                    | +6.4                    |
| + Gauntlets, Leggings (2pc)                                                    | +70.0                   |
| + Gauntlets, Leggings, Pauldrons, Chestguard (4pc, breaks Malorne Harness 2pc) | +119.3                  |

The stop is the 4pc, and the row's figure is +119.3.

### Which counts are tried: no list, no cap, the gate first

- **No list and no cap.** For each set in the candidate pool, the gain side tries
  every count from max(2, w + 1) up to the count the pool can reach (C138;
  Gate C after K5, decision-log line 158). Counts above 4 are needed, because Go
  keys Cryptstalker Armor 530's bonuses at 6 and 8 (C147).
- **The gate runs before the package sim** (C137):
  - clears the gate: the package sim and the step sims run;
  - at or below the gate: the entry is `belowGate`, and no package, pair or step
    sim runs for it;
  - sim failed: the entry is `unmeasured: "sim-failed"`.
- A `belowGate` entry is never read as a simmed package (C198; fixture 511-K).
- The six-set table and `SET_THRESHOLDS` [2, 4] stay on the flag-off path only
  (C32, C124).

### Worn-set breaks: the ladder

- For a worn set W at w ≥ 2 pieces, rung c (c = 1 … w) keeps the first piece
  real, sends pieces 2 … c as set-kept copies and the rest as set-less copies.
  The break value at count c is rung c minus rung c − 1 (plan, "The break model").
- The ladder has one rung per worn piece and no cap. A break is charged only when
  it clears the same gate (`clearsSameGearGate`; C150).
- A rung whose sim failed is charged without a value. A row whose partner choice
  needs that value is unmeasured (C169; fixture 476-D).

### The partner rule shipped: "close-calls"

**The check (chunk K5P).** Eight test characters, one live ranking each at
10,000 iterations, with every partner combination simmed ("every-combination",
the reference answer). The three zero-sim rules were scored offline: Z
(sum of singles, with an add-back for a bonus several singles each lose), Z0 (Z
without the combination-only term) and T (the old single-swap choice).

| Id       | Kind of scenario                                                       | `spec`, phase | Z                                             | Z0   | T    |
| -------- | ---------------------------------------------------------------------- | ------------- | --------------------------------------------- | ---- | ---- |
| FX-A     | saved character where the old rule and Z choose differently            | feral, 3      | pass                                          | pass | fail |
| HUN-C3   | set with bonuses above 4 pieces, 3 worn, beside another set at 2       | hunter, 5     | pass                                          | pass | pass |
| P5-8     | 8-piece tier set on offer, 2 pieces of another set worn                | feral, 5      | fail                                          | fail | fail |
| RET-P3P5 | the owner's example: last phase's best gear going into Sunwell Plateau | ret, 5        | no decision (every gain entry below the gate) | –    | –    |
| W3-TH    | 3 worn pieces, a 2pc others can break only in combination              | feral, 5      | fail                                          | fail | fail |
| FER-P3P5 | the owner's example with 4 tier pieces worn                            | feral, 5      | pass                                          | pass | fail |
| WCL-M5   | real logged mage gear, 5 worn pieces                                   | mage, 3       | no decision (one audited set each)            | –    | –    |
| WCL-R5   | real logged rogue gear, 5 worn pieces, the next tier on offer          | rogue, 5      | fail                                          | fail | fail |

Source: the K5P handoff in `S/execution-report.md` (`python score.py results`
in `S/k5p/`). Characters and kinds: plan, "The characters".

- **The pass rule** is the plan's own (C189). For each row and eligible bonus,
  the shortfall s = g* − g_ρ must be at most τ = max(3 DPS, 2·√(se*² + se_ρ²)),
  and so must the row's ON shortfall at the oracle's stop. The 3 DPS comes from
  a relayed write-up (decision-log line 108), not from the owner.
- **Outcome: P-C** ("No scored rule passes"). Six characters had a decision,
  from three classes (druid, hunter, rogue). An independent agent recomputed
  every figure and agreed (`S/k5p/check-e/check.out`).
- The run took 1,538 full and 1,575 screen sims, 29.4 minutes (`S/k5p/runs.md`).

**The rule built (chunk K5S).** `PARTNER_RULE = "close-calls"`, with
`CLOSE_CALL_MARGIN_DPS = 31.866872635956497` (M′ = 31.8669) in
`partner-choice.ts`.

- M = 15.9334 is the largest gap K5P measured between the best Z estimate and
  the estimate of the set the sims found best (W3-TH, Mantle of Malorne 29100,
  4pc). M′ = 2·M (`S/k5p/report.md`, from `python fallback_global.py results`).
- The rule computes Z's estimate for every partner set. When two or more sets are
  within M′ of the best estimate, it sims each one and keeps the highest total.
  A failed sim is skipped. If every sim fails, Z's choice stands. Fixture 511-PC
  pins this.
- **Cost.** A player's full-pool run at 3000 iterations gains 0–4.19% more sims
  on the K5P characters. The worst is P5-8, 27 of 645: about 11 s on the server
  and about 6.8 min in one browser worker (`S/k5p/budget-full/full_run.out`, from
  `python S/k5p/budget-full/full_run.py`). That count assumes the set phase sims
  the same number at 3000 iterations as at 10,000 (hypothesis, untested).
- **The owner accepted the cost** (decision-log line 183): "I assume it's a full
  run, 5% for a solid outcome is worth it".

### The popover: "steps that add up"

The owner chose this form (decision-log line 200): "The only thing that makes
sense is steps that add up."

- Under "Set potential", one line per step up to the stop. Each step names the
  pieces it adds and the bonus it reaches. The lines add up to the Total. On
  FX-A's Gauntlets row: Item stats +6.4, Thunderheart Leggings (2pc) +63.6,
  Breaks Malorne Harness 2pc −61.6, Thunderheart Pauldrons and Thunderheart
  Chestguard (4pc) +110.9, Total +119.3 (K6B visual check,
  `S/execution-report.md`). On the committed `feral-p3-p2bis` fixture the same
  row reads +3.7, +62.5, −59.1, +109.9, Total +117.0 (K7 visual review,
  `.scratch/handoffs/visual-review-511-512-set-credit-k7.md`).
- **A step that newly loses a worn bonus is split** into two lines: "Breaks
  {set} {n}pc" −Y, then the pieces line +X with no "breaks" text (chunk K6B).
  - **The owner's words.** On choosing "steps that add up" (decision-log line
    200): "One downside is that a lot of things are clustered together (I guess
    to hide the complicated mystery bonus) but that also means combining gains
    from a set with losses from breaking another set, if applicable (wordier, a
    but harder to read, less actually detailed and informative)". Asked whether
    to build the split, the owner answered "yes" (decision-log line 227) (C238).
  - **The method** is "take the bonus away first" (`S/q-step-break-split.md`).
    One extra sim per such step: the gear just before the step, with the lost
    set's replaced pieces (the pieces the step's new items displace) sent as
    set-less copies. Y = sim(gear before) − that sim, so Y is the lost bonus
    valued on the gear just before the step. X = sim(gear after) − that sim.
    X − Y equals the step exactly, so the row's figure, its rank and the Total
    do not change (C243, C249).
  - **Fallback, per step.** A step whose bonus-off sim failed, or whose request
    could not be built, keeps the combined line "{pieces} ({count}pc, breaks
    {set} {n}pc)" with its value. No value is guessed (fixture 511-LF). The
    split is written only when the plain gear before was found in the run's
    store, so Y is always a paired measurement (Gate B ruling GK6-2).
  - **A step that loses two bonuses** gets one Breaks line naming both, valued
    by the one sim (fixture 511-L2).
  - **Unchanged:** the separate-outcomes layout, and the row's own break lines
    above the heading.
  - **Rejected: the stand-in (re-tag) method.** It needed an untested main step,
    a new kind of copy and a new item-id rule, to save at most 4 sims in one run
    (`S/q-step-break-split.md`).
  - **Cost:** one sim per distinct pair of gear before and replaced pieces.
    `feral-p3-p2bis` +2, `ret-p3-p2` 0; at most 8 per run in the check runs
    (HUN-C3) (C256, C265, C269).
  - **Live result** (K6B, `S/k6b/compare-FX-A.out` and
    `S/k6b/compare-HUN-C3.out`, both "RESULT PASS"): each ranking equals the
    same character's run on the code before K6B, apart from the four new
    fields, and X − Y equals the step on all 11 split steps. Fork commit
    `f09d218e`, main commit `7921a69a`.

    | Run                       | Row                                            | Lost             | X            | Y           | Y on current gear (B) |
    | ------------------------- | ---------------------------------------------- | ---------------- | ------------ | ----------- | --------------------- |
    | FX-A, 10,000 it           | Thunderheart Gauntlets 31034, Leggings 31044   | Malorne 2pc      | 110.91       | 61.63       | 93.16                 |
    | FX-A, 10,000 it           | Thunderheart Cover 31039                       | Malorne 2pc      | 112.92       | 58.47       | 93.16                 |
    | HUN-C3, 3000 it           | 8 rows, Gronnstalker's and Rift Stalker pieces | Cryptstalker 2pc | 63.87–170.33 | 11.36–14.22 | 10.94                 |
    | `feral-p3-p2bis`, 3000 it | Thunderheart Gauntlets 31034, Leggings 31044   | Malorne 2pc      | 109.87       | 59.17       | 96.26                 |
    | `feral-p3-p2bis`, 3000 it | Thunderheart Cover 31039                       | Malorne 2pc      | 113.23       | 57.46       | 96.26                 |

    The `feral-p3-p2bis` rows are from K7's re-record, compared with the
    `4f19a468` recording by `S/k7/compare-feral.out` ("RESULT PASS": every row's
    figure and rank unchanged). On feral, the Malorne 2pc is worth about 32 to 39
    DPS less on the gear just before the four-piece step than on the current
    gear. The SME follow-up's judgment of these values is in ticket 511.
- **Rows whose partner sets do not nest** use the "separate outcomes" layout:
  one "{item} alone" line and one "With …" line per bonus in "N DPS more/less",
  no "+" signs, no Item stats line, no Total, and a "this row's figure" marker on
  the stop. This is the orchestrator's ruling in the same decision-log entry,
  because the owner rejected layouts that look like addition. Fork `view.ts`
  `setPotentialSteps` returns null for such a row, and the tab then builds the
  outcomes layout. Fixture 511-PN pins the null.
- In 12 saved rankings, all 83 credited step rows nest and add up exactly
  (decision-log line 223; K6 offline survey). No saved ranking has a credited row
  that does not nest. K5P found one non-nesting row under the oracle, WCL-R5
  29044, with credit 0.

## The set screen

### What the owner approved, and why

- The purpose (decision-log line 117): "Maybe at least with reducing iteration
  count or something we can make this quicker" (C201).
- The approval (line 126): "i have no problem with approving an exploration,
  couldve even started doing it" (C163).
- The screen runs one cheap pair of sims per set, and only sets it keeps get the
  full per-bonus measurement.

### Record mode, and paired errors off the player path

- Chunk K5R built a record mode that filters nothing. It records each set's
  low-iteration readings and each reading's paired error, from the sim's
  per-iteration values.
- The per-iteration values come through an optional `saveAllValues` in
  `SimRunOpts`. `WorkerPoolSimRunner.run()` adds it to `simOptions` only when it
  is true, and returns `allValues` only then (C196). A player's requests and
  observations are unchanged (W-SR4; fixture 511-SR).

### Phase 1, as verified

Phase 1 ran outside the plan on 2026-10-01. An independent verifier reproduced
every figure and returned "relay with corrections" (decision-log line 130).

- **Q1 (exact zero), within scope only** (C180): the server path, seed 11, two
  feral no-bonus pairs (Thunderheart at 3 pieces; two non-set pieces tagged into
  an unregistered set), item swap off. Both read exactly 0 at N = 10, 100, 300
  and 3000. Justicar 4pc and Gladiator's Sanctuary 2pc also read exactly 0.
  Every real bonus read non-zero.
- **Q2 (timings)** (C179): 56.1 ms + 0.1165 ms·N per sim on :3333, and
  53.9 ms + 4.988 ms·N on one WASM worker. `allValues` comes back on both paths.
- **Q3 (noise): σ not settled** (C181, C194). Both pre-written tests failed: the
  5-seed spread exceeded the bound in 3 of 15 cells, and own error was within
  ×1.5 in 43 of 75 runs. The verifier showed that 3 of 15 is the chance rate when
  the bound is exact (0.594 per cell), and that the ×1.5 test passes all 15 cells
  with probability 0.0066 even when σ is exact. Pooled, own error matches the
  spread (54.2 on 60 df, p = 0.69). Own error understates Wastewalker 2pc (+35
  hit, a stat bonus) by sd5/own 1.53 and 1.44. Thunderheart 2pc and 4pc are not
  stat bonuses (C195).

### K5E's verdict

- **σ rule, fixed before K5E ran:** σ = 1.0 × √2·stdev/√N. Sensitivity rows:
  1.5 × that bound, and each reading's own paired error.
- **Verdict: yes** under the primary σ, on 11 characters (`S/k5e/report.md`,
  from `python score_screen.py` in `S/k5e/`; the K5E handoff in
  `S/execution-report.md`).
- **Sensitivity.** Both rows keep the verdict at yes, and both change the rule
  K5E would pick: 1.5 × bound picks M2 N = 10, K = 1, c = 2; own paired error
  picks M2 N = 300, K = 2, c = 1. Under own paired error, the primary pick fails,
  because it drops C3:652.
- **Browser path (Q1-W).** The two no-bonus pairs read exactly 0 at N = 10, 100
  and 300 on one WASM worker and on the tab's default 4-worker runner.
- **Set-kept copies in the browser (G10-1).** Four Thunderheart pieces as
  set-kept against set-less copies read 249.9144, 176.8621 and 175.7047 at
  N = 10, 100, 300 (`S/k5e/q1q3/q1w.md`). Against the server: equal to 4
  decimals; per-iteration values identical; the means differ by at most
  4.1e-12 (`S/k5on/swap/result.md`, "Cross-path comparison"; Gate C ruling
  GON-10).
- **Wastewalker noise (Q3-W).** 20 seeds 1,000,000 apart gave sd20/bound 0.896
  and 0.895 (p 0.59 and 0.58). The pre-written trigger (p < 0.05) did not fire.

### The rule shipped, and the rule not shipped

Both are recorded, as the Gate C ruling Q-K5E-rule requires (decision-log line
190; C205). The measure M2 is the best over counts t of the package's summed
singles plus rule Z's add-back, plus the pair reading at N. Rule 1 drops a set
whose pair reads exactly 0. Rule 2 drops a set whose M2 + 2σ < 0. Rule 3 keeps
the top K, plus any set within c·√2·σ of the K-th.

|                                              | Shipped (the runner-up)                                     | Not shipped (the plan-rule pick)    |
| -------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Rule                                         | M2, N = 300, K = 2, c = 1, rule 1 on, σ = 1.0 × √2·stdev/√N | M2, N = 10, K = 1, c = 3, rule 1 on |
| C1 browser estimate (screen off: 105.63 min) | 54.77 min                                                   | 53.18 min                           |
| Near misses (kept only by the band)          | 0                                                           | 3 (C6:676, C3:652, C4:699)          |
| 1.5 × bound                                  | passes (mean kept 2.27)                                     | passes                              |
| Own paired error                             | passes (mean kept 1.82)                                     | fails (drops C3:652)                |

Sources: C203, C204, C224 (Command A in `S/plan-k5on-patch.md`, over
`S/k5e/score_screen.json`). Browser times are estimates from Phase 1's
one-worker fit.

**Why the runner-up.** The orchestrator ruled at Gate C: the plan-rule pick is
about 1.6 minutes (about 3%) cheaper, but it keeps three needed sets only through
its band, and it fails under the own-error σ that the pooled check favoured. The
ruling cites the owner's sentence (decision-log line 183): "I assume it's a full
run, 5% for a solid outcome is worth it". **The owner said this about the
close-calls budget, not about the screen**; the orchestrator applied it to the
screen rule (C206). The owner was told of the choice and did not object
(decision-log line 201).

The constants are `SCREEN_ON_RULE` in `set-screen.ts`. Changing one needs a new
scoring of the check characters.

### What a dropped set means

- The set gets one entry, `unmeasured: "screened-out"`, and no gate, package or
  step sims.
- Its rows show their single-swap figure, keep their own break lines and
  crossing line, show no Set potential section, and earn no credit (W-ON2;
  fixtures 511-SU, 511-SN, 511-SB, 511-SD, 511-SA, 511-SL and 511-SH).
- Only the gain-side set list changes. The ladder, the crossing gates,
  `brokenSetValues`, every row's `deltaDps`, and every kept set's entries are as
  with the screen off (W-ON1).
- **Failed readings are kept.** A set whose pair is absent is kept with reason
  "readings-absent" and goes through the gain side as with the screen off
  (C231). The known case is Cryptstalker Armor 530 on a non-hunter: every sim
  with 2 or more of its set-tagged pieces fails (ticket 532; cause a hypothesis,
  untested).

### Checks on the shipped rule

- **Item swap on (step 33.1).** On the enhancement page, P5 gear, with the
  Truncheon swap (main hand 30832, off hand 27901: non-set items only), at seed
  11 and N = 300:
  - SWC, Skyshatter Harness 682 as four set-kept against four set-less copies:
    37.709 (paired error 1.58) on the server; the floats differ on every path;
  - SW0 and SWD, two no-bonus pairs: exactly 0 on the server, on one WASM worker
    and on the 4-worker runner;
  - SWC at N = 3000 (information): 36.697.

  Source: `S/k5on/swap/result.md` (`python result.py` in `S/k5on/swap/`).

- **Enhancement ranking with item swap on (step 33.2).** Only Skyshatter Harness
  682 was worth collecting (+131.35 at 4 pieces). The shipped rule keeps 530
  (readings absent), 636 and 682 under σ, 1.5 × σ and own error. Pass
  (`S/k5on/score_enh.out`).
- **Rule parity offline (step 33.6).** The engine's `applyScreenRule` keeps the
  scorer's sets on all 11 K5E characters under σ and 1.5 × σ: 22 of 22
  (`S/k5on/rule_parity/check.out`, from `npx tsx S/k5on/rule_parity/check.mts`).
- **Live parity (step 33.7).** On C6, C5, C1 and the enhancement character, the
  live on-mode run keeps exactly the scorer's sets with exactly its reasons. Every
  pair and M2 reading equals the record run's (difference 0). Dropped-set rows
  keep `singleBreaks`, `crossesThreshold` and `piecesAfterSwap` (rows checked:
  C6 11, C5 124, C1 147, enhancement 139). Source: `S/k5on/parity.out`, "RESULT:
  PASS".

### The tab passes "on"; the engine's default stays "off"

- The tab sets `setScreen: 'on'` unless a check hook overrides it (fork
  `upgrades_tab.tsx` line 1943 at `04de6a46`).
- The engine reads an absent value as "off". So the core engine, the CLI, the
  parity test E-W3 and every existing fixture case are unchanged (C217; W-ON6).

## The check hooks

- `window.__upgradesCheck`, `__upgradesFixture` and `__upgradesRanking` exist
  only in dev and gate builds (`__TBC_TAB_FIXTURES__`, true for `vite serve`)
  (C176). A player's build has none of them.
- The check runs used pools of set pieces only, to shorten them. The noise floor
  is a per-spec constant, so a smaller pool does not change it (C187). That the
  set phase gets the same inputs as with the whole pool is a code reading (C188);
  step 25's dry run, with every gate cleared by a fake runner, gave equal
  set-phase outputs for FX-A both ways (`S/progress.md`, step 25). A live
  comparison is untested.
- K5P's rankings ran at 10,000 iterations. K5E's and K5ON's rankings, and the
  tab's default, use 3000.

## The measurement: set-less and set-kept copies

**Why copies, not a switch in Go.**

- No request field turns off one set bonus. The only built-in gate is
  `RequiredProfession` (C7).
- A request can equip an id that exists only in its own `Player.database`, and
  a copy keeps the item's stats (C8).
- Upstream master does not change `item_sets.go` or `database.go` past the pin
  (C11). The fork's Go sim differs from the upstream pin only in bulk-sim files,
  `sim/hunter/item_sets.go` and one proto field (C38). A switch would be a Go
  change in the fork. The owner's standing rule is to borrow from wowsims, not
  re-mirror; applying it here is the plan's reading (C34).

**The offsets.** A set-less copy has id 1,000,000 + id and no set. A set-kept
copy has id 2,000,000 + id and its own set. The id must be a fixed function of
the original, and the two kinds need different offsets, because Go's item map
keeps the first row it sees for each id (C48).

**Copies in both requests (G2).** Go applies item effects by item id: PvP glove
mods only for listed hands ids (`RegisterPvPGloveMod`, C112), and equipped-id
reads in trinket, ring, weapon, item-swap and class code (C10). A copy lacks
every such effect. The pieces whose set membership changes are copies in both
requests of a gate or rung, so the effect is missing from both sides. Values
are therefore measured without those effects (limit (c)).

**G1, rejected.** Extending the Go-source generator to list id-keyed effects
would be a generated list. Its correctness depends on the parser finding every
Go pattern that keys by id, and today's generator misses 15 calls
(`S/plan-r7.md` line 201). `implementedEffectItemIds` holds none of the 20 PvP
glove ids (C113).

**Rejected count sources.** ComputeStats returns `PlayerStats.sets`, which no UI
code reads (C116). Asking the sim which bonuses are active ("option 2") was
offered; the owner answered "Option 2 sounds .. mediocre." (decision-log line
117). A hand or generated list of implemented bonuses was rejected by "No list"
above.

**Why the choice of copied pieces does not change a zero.** Go's `SetBonus`
holds no piece slot: `getSetBonuses` appends the set's own slot list (C149). So
at a count with no bonus key, both requests get the same bonus list whichever
pieces are copies, and the reading is exactly 0. Phase 1 confirmed this on the
server within its scope (C180); K5E confirmed it in the browser; step 33.1
confirmed it with item swap on.

**Set-kept copies turn a bonus on** (C197). This was a code reading until step
26.3 measured it live on FX-A: the (676, 2) gate read 75.9124, the (676, 4) gate
75.6106, and the Malorne (640, 2) rung 93.1580, each equal to K1's value
(`S/k5p/runs.md`).

**Ticket 522 and the copies.** Since ticket 522, every tab request holds the run
skeleton's consumable and spell-effect rows. `applyCopies` adds copy rows only to
`player.database.items`, so those rows survive in every copy request. Test 522-G
in `packages/core/test/fork-sim-database.test.ts` asserts it (C165).

## Non-additivity

Row figures still do not add up (ADR-0034's Decision stands). Two measured
causes:

- **Ret.** The non-additivity is real sim behaviour: the gear is 4.69 hit rating
  over the melee cap once Improved Faerie Fire is counted, and expertise rounds
  down to whole points. The Justicar gap is +13.58 ± 0.68 at independent seeds
  (C78; `cat S/diag/h2.out`; `S/diag/report.md`).
- **Feral.** With their bonuses off, the four Thunderheart pieces are worth
  5.87 ± 0.46 DPS more worn together than one at a time, at independent seeds
  (C118; `S/k2-thunderheart-seeds.md`). The approved sentence: "K1's single-seed
  9.59 is within the upper-bound noise of this figure". The cause is not
  identified.

Under option A each total is one sim with every piece worn together, so nothing
is counted twice (C78).

## The other-pieces history, and the ticket 490 quote

- Ticket 502 (2026-09-27) made set rows count the other pieces' own stats.
  ADR-0034 records the owner's words for it.
- The verifier's corrections to that history (C119; decision-log lines 72 and
  99): the owner's 2026-09-20 rule "item plus set bonuses only. the total should
  also only be total set bonuses, perhaps minus broken set bonues, plus the item
  in question net dps gain. NOT OTHER ITEMS" was the owner's own typed answer, not
  a pick of a recommended option. The owner's "This sounds like…" direction is
  from 2026-09-27, not 2026-09-20.
- **Ticket 490's wording.** The owner chose best-stop over full-path on
  2026-09-24 (`.scratch/handoffs/owner-quotes-upgrades-tab-closeout.md` lines
  57–66). ADR-0034 and ticket 490 had put an agent's parenthetical gloss of the
  rule inside the owner's confirmation (C192). That gloss is not the owner's
  words (C104; Gate B ruling N1). It is removed from ADR-0034 lines 72–74, and
  ticket 490 has a 2026-10-02 comment saying so.

## The flag boundary

- The new sims and fields run only when the engine's `measureBrokenSetValue` is
  on. The tab always sets it (`upgrades_tab.tsx` line 1934 at `04de6a46`). E-W3
  never sets it: `grep -c measureBrokenSetValue packages/core/test/wowsims-fork-parity.test.ts`
  prints 0 (C28).
- So the core engine, the CLI report and the flag-off path keep ADR-0034's rules
  in full.
- `setScreen` and `partnerRule` join the run's content hash only when set, so an
  unset run hashes as before (W-H1, W-ON6).

## The cost

All figures are estimates from Phase 1's fits unless marked measured (K5ON
patch, "Changes to other plan sections" item 2; C224–C229).

| Run                                                       | Screen off  | Screen on               | Server           | Browser, one worker |
| --------------------------------------------------------- | ----------- | ----------------------- | ---------------- | ------------------- |
| C1, phase-5 warrior (p4 fury preset), set-phase gain sims | 239 at 3000 | 29 at 3000 + 66 at 300  | 96.9 s → 17.8 s  | 59.8 → 9.0 min      |
| C1, whole run (set-piece pool)                            | 422 at 3000 | 212 at 3000 + 66 at 300 | 171.2 s → 92.0 s | 105.6 → 54.8 min    |

- **Measured** (K5ON-B, `S/k5on/parity.out`, set-piece pools): C1 with the
  screen on took 108.2 s of wall time. The same character's record-mode run,
  which sims the whole gain side plus every record-mode screen sim, took 330.9 s.
- **Measured** (step 36, whole pools, 3000 iterations, screen on, desktop
  server): the `ret-p3-p2` re-record took 229 s ("Took" on the tab; 10 screen
  sims, 0 step gears), and `feral-p3-p2bis` took 213 s (10 screen sims, 9 step
  gears: 17 simmed, 10 from the store). The fixtures hold `setScreen` and
  `setStepSims`; the wall times are in the stage folder (`S/k7/k7-ret.log`,
  `S/k7/k7-feral.log`).
- **Measured** (K7 re-record after K6B, same settings): `feral-p3-p2bis` took
  193 s, with `setBonusOffSims` gears 2, simmed 2, from the store 0, failed 0,
  skipped steps 0 (`S/k7/k7r-feral.log`; the fixture holds `setBonusOffSims`).
  `ret-p3-p2` has no breaking step, so the split adds no sim there.
- The close-calls rule adds 0–4.19% of a full-pool run (C229).
- Screen sims run one at a time, while the tab keeps up to 4 other sims in flight
  against :3333 (C226).

## Seeds

- The Go sim seeds iteration i with RandomSeed + i. Two runs are independent only
  when their seeds differ by at least the iteration count (C77).
- The tab's `DEFAULT_SEEDS` [11, 22, 33, 44, 55] overlap, so its replicates are
  not independent (ticket 530, record only).
- Nothing in this ADR relies on a tab replicate. Every pair, gate and rung shares
  one seed on one path. The one replicate measurement, Q3-W, spaced its seeds
  1,000,000 apart.

## Known limits

From the plan (a)–(h):

- (a) The running total has no noise gate of its own (C84).
- (b) The gate is measured on the entry's package, not on the row's partner gear
  (C106; hypothesis).
- (c) Bonuses and breaks are valued without the copied pieces' item-id-keyed
  effects (C10), except a split step's Breaks line (Y), which compares the real
  replaced pieces with set-less copies. So an item-id effect of a replaced set
  piece counts in Y. At least 5 of 1,957 set pieces in the effects list have
  such an effect, plus the PvP gloves and the other id reads (ruling R5) (C268;
  Gate B ruling GK6-3).
- (d) Ring, trinket and weapon set pieces map to the first of their two slots
  (C138). A second-slot single can make the partner estimate wrong (C153;
  unverified). Two same-set rings, trinkets or one-hand weapons never count
  together (fixture 511-A3R).
- (e) A row that replaces a worn piece of its own set may have its count after
  the swap overstated (C160; hypothesis).
- (f) The zero-sim estimate ignores stat interactions between pieces. K5P
  measured what that costs, and close-calls sims the close cases.
- (g) K5P scored at 10,000 iterations; the tab ships at 3000.
- (h) A row whose partner choice needs an unmeasured worn bonus is unmeasured.

From the screen, (i)–(m):

- (i) A dropped set earns no credit and shows no Set potential.
- (j) M2 judges a set on its best-case package, which is optimistic.
- (k) A bonus smaller than the screen's noise survives only as a top-K set or
  through the band.
- (l) Rule 1's exactness is tested on the server, in the browser on one worker
  and on four, and with item swap on with a swap of non-set items only, only at
  N ≤ 300 and on named pairs.
- (m) N is 300 whatever the page's Iterations setting, and the screen sims run
  one at a time.

From the split break lines, (n)–(p):

- (n) Y also includes any bonus of the lost set between the two counts that the
  ladder did not count; the line names only counted bonuses (C248).
- (o) A step that loses two bonuses shows one Breaks line naming both, valued
  together by one sim.
- (p) A first step's Y needs the row's single swap stored under the same
  request. The engine writes the split only when that request is found in the
  run's store (Gate B ruling GK6-2), which holds for the tab's default loop
  (C245); `setBonusOffSims.beforeInStore` records it.

Added since:

- The "this row's figure" marker in the separate-outcomes layout has no highlight
  colour, because the stylesheet was outside K6's paths (Gate C between K6 and
  K7, decision-log line 224). No saved ranking has a row that shows it.
- Item swap was tested with non-set items only (limit (l)).
- Off-class Cryptstalker Armor sims fail, so those sets read "couldn't measure"
  (ticket 532).
- The tab's replicate seeds overlap (ticket 530).
- A step no longer lumps a set's gain with a broken set's loss. The owner asked
  for the design ("Yes pls.", decision-log line 214) and then decided to build it
  ("yes", decision-log line 227). Chunk K6B built it (fork `f09d218e`, main
  `7921a69a`); see "The popover: steps that add up".

## Relation to ticket 523

Ticket 523 records that the tab cannot show the value of moving a worn set bonus
to other slots. A verifier found that the gap can leave rows too low, never too
high, because every figure here is a sim of wearable gear or a value measured on
current gear. Option A does not make the gap larger (decision-log line 105). The
gap is not phase-5-only. FER-P3P5 is the owner's example of its case; K5P did not
score that move.

## What this supersedes in ADR-0034

For a **step ranking** (the tab, with `measureBrokenSetValue` on):

- **The walk (R1).** A step ranking adds no single-swap terms, own-stats terms or
  floored bonus terms. Its credit is the best running value of one stop-gear sim
  minus the row's own swap.
- **"When the row equals the measured swap."** A credited row that paired
  replication did not rewrite equals the sim of its own stop gear, with none of
  the three conditions (W-S1).
- **Breaks charged with no floor.** On the flag path, a worn break is charged
  only when it clears the same gate (C150). Fixture 502-G's ON figure stays 366,
  the measured 4-piece swap (decision-log line 104).
- **"Remaining gap, until ticket 512."** The ladder measures every count a swap
  takes a worn set below, with no list.

Still in force from ADR-0034: row figures are not additive; best-stop
(`RULE_490`) over full-path; and every rule on the flag-off path.

## Consequences

1. A set row's figure is a sim the player can reproduce by wearing the named
   pieces, not a sum of single-item figures.
2. A bonus that measures about 0 on identical gear earns no credit and costs no
   package or step sim. On ret P2 gear, Justicar 4pc and Crystalforge 4pc
   measure +0.0000 and +1.5851 (se 1.725) on identical gear at 10,000
   iterations (C74). The committed `data/tab-fixtures/ret-p3-p2.json`,
   re-recorded with the screen on at fork `04de6a46`, gives neither any credit:
   the screen drops Justicar 626 ("below-zero", M2 −56.92), and Crystalforge
   629's 4pc reads +0.204 (se 3.164) on identical gear, below the gate. No ret
   row gets Set potential. Ticket 511 records the details.
3. The tab keeps no list of which set bonuses the sim implements.
4. Runs cost more sims than before this change. The screen takes most of that
   back; close-calls adds up to about 4%.
5. A change to the partner rule or the screen rule needs a new check like K5P or
   K5E, because each constant comes from that scoring.
