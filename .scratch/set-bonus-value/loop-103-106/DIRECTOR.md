# DIRECTOR log — combined loop for tickets 103 and 106

Branch: `feat/set-bonus-value`. Started 2026-08-10. Director maintains this file
only; each subagent writes its own `NN-<label>.md` in this directory.

## The question

Two symptoms, one prime suspect.

- **103**: `packageDeltaDps` for the four-piece T6 swap = **+64.07**; the owner's
  wowsims run of the same swap **with the same gems** = **+97**. Re-gemming is
  falsified as the explanation. Gap unexplained.
- **106**: Vengeful Gladiator's Dragonhide Helm sims ~equal to Cursed Vision of
  Sargeras in our report; owner's manual wowsims run (same gems both arms, meta
  active in both) puts Cursed Vision ~**+10** ahead.
- **Prime suspect**: the swap builder's gem handling —
  `migrateGemsToItem` → `fillEmptyCandidateGems` → `repairMeta`
  (`packages/core/src/rank.ts` ~1376-1452, entry point
  `equipmentForCandidateSwap` at :1424), applied **sequentially** for packages
  (`rank.ts:1066-1074`).

## Plan

Phase 1 (shared): dump the exact equipment payload production builds for (a) the
T6 package arm and (b) each helm's single-swap arm — item ids, gems per socket,
enchants, and meta activation state (gem colour counts vs the meta's condition).
Diff against the owner's arms. Then price any difference found by simming our
payload against the corrected payload.

Decision point: payload defect explaining both → one fix, checked against spec
§2.2's byte-identical gem policy symmetry invariant (amendment needed → propose,
do not implement). Payloads clean → fork: 103 to sim-request diffs, 106 to item
variant then noise (cross-ref ticket 105).

## Iterations

### Iteration 1 — dispatched

- **Hypothesis**: production's swap builder produces an equipment payload that
  differs from the owner's arm — a dropped gem, an unfilled socket, or a
  deactivated meta — on the T6 package arm and/or one of the two helm arms.
- **Subagent**: `01-payload-dump` (read-only measurement; log
  `.scratch/set-bonus-value/loop-103-106/01-payload-dump.md`).
- **Command(s)**: a throwaway tsx script calling the **real** exported
  `equipmentForCandidateSwap`; commands recorded verbatim in
  `01-payload-dump.md`.
- **Result**:
  - T6 package arm: **no empty sockets, no dropped gems** beyond what socket
    capacity mechanically forces (11→10 gems: legs 31044 has 1 socket vs worn
    Skulker's Greaves' 3; hands 31034 has 1 vs worn 0). Every socket present is
    filled.
  - Helm arms: Cursed Vision **32235** and Vengeful Gladiator's Dragonhide Helm
    **33672** — payloads **identical apart from the item id**. Same 2 sockets,
    same gems (meta 32409 + red 32194), same enchant, identical whole-equipment
    gem multiset (13 gems).
  - Meta: **ACTIVE on both helm arms** per the real `metaStatus`
    (`packages/core/src/meta.ts`): `{red:12, yellow:2, blue:2}` vs
    `minRed:2 minYellow:2 minBlue:2` (condition from
    `data/gems/meta-conditions.json`). Baseline Wolfshead Helm has no sockets,
    so no meta comparison applies there.
  - Both helm ids confirmed as the only db matches, and as the ids
    `.scratch/rank-reports/shredzepelin-p3.json` actually uses.
- **Verdict**: **Prime suspect FALSIFIED.** No payload defect in any arm. For
  106 this is decisive: identical inputs reach the sim, so an ~equal measured
  delta is not a gem-handling artefact. For 103 it confirms the socket-capacity
  shift by direct inspection but prices nothing.
- **Next step**: the loop forks, exactly as the decision point specified.
  - 106 tail: item-variant check is already done (both ids confirmed, single
    match each) → so 106 goes straight to **noise**: what are the error bars on
    the two helm deltas, and does a clean direct A/B sim of the two helms on
    identical payloads reproduce the owner's ~+10? This is the measurement that
    decides whether the owner's expectation or our report is wrong.
  - 103 tail: **sim-request diffs** (fight/buffs/consumables between our
    skeleton and the owner's web run), plus pricing the socket-capacity loss —
    the package arm carries one fewer gem than baseline, which is a real stat
    loss our figure eats and the owner's arm may not have.

### Iteration 2 — dispatched (two read-only measurement agents, provably disjoint)

Disjointness check: separate log files (`02-*`, `03-*`), separate sim output
directories (`sims-106-helms/`, `sims-103-request/`), both read-only on
production source, no shared writes. Parallel is safe here.

- **Hypothesis 2a (106)**: with identical payloads confirmed, the two helms
  genuinely sim within noise of each other on our skeleton — i.e. the owner's
  ~+10 expectation is either not reproducible on this gear or is smaller than
  our error bars.
- **Subagent**: `02-helm-ab` → `02-helm-ab.md`.
- **Hypothesis 2b (103)**: the +64.07 vs +97 gap comes from the package arm
  losing socket capacity (11→10 gems) and/or from sim-request settings
  (fight/buffs/consumables) differing from the owner's web run.
- **Subagent**: `03-package-gap` → `03-package-gap.md`.
- **Result 2a (`02-helm-ab.md`)** — direct A/B on identical payloads:

  | | 3000 iters | 20000 iters |
  |---|---|---|
  | CURSED (32235) delta vs BASE | −185.46 | — |
  | VENG (33672) delta vs BASE | −188.30 | — |
  | **CURSED − VENG** | **+2.84** | **+4.97** |

  The gap is *real and resolvable* (CURSED beats VENG on every matched seed at
  both iteration counts) but is roughly **half** the owner's expected +10.

  Report's stored figures (`.scratch/rank-reports/shredzepelin-p3.json`):
  VENG `deltaDps −202.0497` (SE 3.455), CURSED `deltaDps −202.1336` (SE 3.615),
  so the report's CURSED − VENG = **−0.084** — flat, and the wrong sign.

  **New, unpredicted symptom**: each helm's *stored* delta (~−202) disagrees
  with the direct sim of the *same production payload* (−185 / −188) by
  **~15 DPS**, well outside SE. Both helms are shifted by about the same
  amount, which is why the difference between them collapses.

- **Result 2b (`03-package-gap.md`)** — pricing and request diff:

  | arm | delta vs BASE |
  |---|---|
  | `PKG_PROD` (real production payload) | **+64.48** |
  | `PKG_FILLER` (flat filler gem 32194) | **+80.80** (reproduces the prior run) |
  | `PKG_BESTGEMS` (T6 sockets filled with 24028, the gem the baseline already uses) | **+64.43** |

  `PKG_BESTGEMS` lands on `PKG_PROD` (0.05 apart, vs ~2.7 SE), not on
  `PKG_FILLER`. So **socket-capacity loss explains ~0** of the 32.93 gap, and
  ticket 103's original "sequential-exclusion / socket-capacity" attribution for
  the ~16.72 DPS `PKG_PROD` vs `PKG_FILLER` split is **wrong on this data** —
  that split is gem *choice* (24028 vs 32194), not socket *count*.

  Request diff: the `p2` skeleton filename is **deliberate**, not a mismatch
  (`--maxPhase` only moves the candidate pool; the skeleton is phase-agnostic
  and gated by `pnpm sim-defaults:check`). No divergence in fight duration
  (180s), target count (1), armor/level, or buff/debuff composition. Two
  **untested** leads: `exposeWeaknessHunterAgility: 1080` (upstream's Phase-1
  value hardcoded regardless of phase; P2's would be 1150) and the talent preset
  ("StandardTalents", never verified against the owner's run).

- **Verdict**: the loop's centre of gravity has **moved**. The prime suspect
  (gem handling) is dead, and so is the socket-capacity story. What replaced it
  is a *shared* discrepancy: **our stored artifact figures do not match a direct
  sim of the very payload production says it built** — ~15 DPS on both helms
  (2a), and the package figure +64.07 stored vs +64.48 measured is fine, but the
  singles were never checked the same way. This is one candidate root cause for
  both tickets: if stored deltas are systematically displaced, 106's flat
  ordering and 103's low package figure could both be downstream of it.

- **Next step**: iteration 3, single serial agent, chasing the ~15 DPS
  artifact-vs-direct-sim discrepancy — the highest-value unexplained fact on the
  table and the only one implicating both tickets. Specifically: does production
  sim the *baseline* differently from our harness (a different baseline DPS
  reference), or does it sim the *candidate arm* differently? A 15 DPS shift on
  both helms with an unchanged baseline points at the baseline reference, not at
  the arms.

### Iteration 3 — dispatched

- **Hypothesis**: our pipeline's stored `deltaDps` is computed against a
  baseline (or through a request) that differs from the one our direct-sim
  harness uses, displacing every stored single-swap delta by a roughly constant
  ~15 DPS and thereby collapsing the CURSED−VENG ordering into noise.
- **Subagent**: `04-artifact-vs-direct` → `04-artifact-vs-direct.md`.
- **Result**: **hypothesis refuted, and the ~15 DPS was subagent 02's harness
  error, not a pipeline defect.** 02's script substituted only the head slot
  with hardcoded `HELM_GEMS = [32409, 32194]` and left every other slot at the
  baseline's `24028`. Production additionally runs `repairMeta`, which
  **rewrites four gems on shoulder 29100 and chest 29096** to satisfy the new
  meta's colour condition — trading four 8-agi `24028` for 5-agi
  `32220/32220/30549/32212`, a net **−12 agility**. That is the ~15 DPS.

  Two decisive experiments:
  - **Leaf-level request diff** (production request via the real
    `equipmentForCandidateSwap` + `compose` vs 02's `3k-CURSED-11.req.json`):
    the *entire* set of differing leaves was those four gems, the cosmetic
    player name, and runner-supplied `simOptions`. Nothing else differs.
  - **Simming the production requests byte-for-byte** (`sim_prod_requests.py`):

    | item | artifact `deltaDps` | seed 11 (what production stores) | 02 |
    |---|---|---|---|
    | CURSED 32235 | −202.13357 | **−202.13** | −185.46 |
    | VENG 33672 | −202.04970 | **−202.05** | −188.30 |

    Exact reproduction to two decimals, on both items independently.

  Ruled out en route: the artifact field is plain `deltaDps` (no adjusted
  variant); single-seed vs 5-seed is worth <0.2 DPS here, not 15. Production
  stores the single-seed figure for these rows because `replicateTopItems`
  (`rank.ts:889-891`) only replicates `!belowCutoff` rows and both helms are
  below cutoff. Baseline is not implicated (stored 2152.0998 vs simmed 2152.10).

- **Verdict**: **106 is explained, and the ticket needs reframing.** The
  report's CURSED−VENG = −0.084 is a *correct* measurement — 04's 5-seed run of
  the production requests gives +0.15, equally flat. The two helms genuinely sim
  within noise **once both pay the meta tax**. 02's +2.84/+4.97 gap was measured
  on arms where the meta is socketed but **dead**, which is why it looked like a
  real ordering.

  That surfaces the loop's actual root cause, and it is a genuine one:
  **`repairMeta` appears to activate the meta at a net DPS loss on this all-red
  gear**, recolouring four strong gems to satisfy a colour condition without
  checking whether activation is worth its cost. 02's meta-inactive arms scored
  ~15 DPS *higher* than production's meta-active ones. Untested as a controlled
  experiment — that is iteration 4.

  **103 is barely touched** by any of this: the T6 package arm never touches the
  head, introduces no meta socket, and `PKG_PROD` +64.48 already agrees with the
  stored +64.07. No displacement exists on that side. The +64 → +97 gap remains
  **unexplained**; the surviving leads are `exposeWeaknessHunterAgility` phase
  pinning, the talent preset, and (weak, untested) a baseline difference if the
  owner's run had an active meta in both arms.

- **Next step**: iteration 4 — controlled test of the meta-tax hypothesis, the
  one candidate root cause with a plausible fix behind it.

### Iteration 4 — dispatched

- **Hypothesis**: `repairMeta` activates the meta gem unconditionally when a
  swap introduces a meta socket, paying a recolouring cost (here −12 agility)
  that exceeds the meta's own benefit on agility-stacked feral gear — so
  production's candidate arms are systematically *worse* than the best
  configuration a wowsims user would reach, depressing helm deltas.
- **Subagent**: `05-meta-tax` → `05-meta-tax.md`.
- **Result**: **hypothesis refuted — the meta is a net GAIN of +22.40 DPS, and
  `repairMeta` is making the right call.**
  `python .scratch/set-bonus-value/loop-103-106/sim_meta_arms.py`, seeds
  [11,22,33,44,55] @ 3000 iters, every arm's status verified with the real
  `metaStatus`:

  | arm | delta vs BASE (5-seed) |
  |---|---|
  | `META_ACTIVE` | −201.98 (seed 11: −202.13, reproduces stored −202.13357 exactly) |
  | `META_DEAD` | −185.46 (reproduces 02's figure exactly) |
  | `NO_META` (32194 in the meta socket) | −224.38 |

  `META_ACTIVE − NO_META = +22.40`, winning on all five paired seeds. The
  overturning measurement: isolating the head socket gives
  `ISO_32194 − ISO_24028 = +3.66` for +2 agi (≈1.83 DPS/agi), but
  `ISO_META − ISO_32194 = +39.25` for +2 agi where the rate predicts ~+3.7. The
  extra **~35 DPS is 32409's +3% crit damage, which the Go sim applies
  unconditionally even with the colour condition unmet** (32409's db stat vector
  is agility 12 and nothing else). So `META_DEAD` is an **illegal comparator** —
  02's "15 DPS higher" arms were higher only because they collect the meta's
  headline effect for free, precisely the impossible-stats case PLAN.md §9
  exists to prevent.

  Does `repairMeta` weigh the trade? **No — `meta-repair.ts:67-70`**, whose only
  gate is `initial.kind !== "inactive"`. The `cost` at `:193-197` ranks
  recolours against *each other* at `:206`, never against "don't repair"
  (`bestRepairMove` returns `Move | null` and `null` throws at `:85-89`). It
  optimises EP loss against `data/presets/feral/p1.ep-weights.json`, and the EP
  model is **blind to the benefit side** — ticket 20 records this qualitatively;
  05 has now put a number on it (~35 DPS seen as 0). A naive "only repair if
  EP-positive" fix would therefore reach the **wrong** answer here.

  Anything mandating always-activate? **Yes, PLAN.md:37** ("Always kept active,
  via minimum-EP-loss repair — not re-optimization") and **§9 policy item 1**
  ("assume the player keeps the meta active"), with ticket 04 implementing it
  and ticket 20's resolution reading `activation deliberately not checked`.
  Changing it would need a **spec amendment**, and 05 recommends against it.

  Blast radius: **8 of 407 rows (2.0%)**, all head, all already below cutoff
  (baseline Wolfshead Helm 8345 has `sockets: []`). Since activation is a
  +22.40 gain, those rows are **not** undervalued — the "systematically
  undervalued" framing does not hold.

- **Verdict**: **106's gem/meta line is closed.** Both helms pay an identical
  and *correct* meta cost; the report's flat CURSED−VENG (−0.084 stored, +0.15
  on a 5-seed re-run) is a correct measurement. The owner's ~+10 must come from
  something other than gems or meta handling. Everything the ticket named as a
  suspect — gem mangling, meta activation, item variant, socket bonuses — is now
  eliminated by measurement.

  Two incidental findings worth their own tickets, both out of this loop's
  scope: (1) `substitutions: []` in the stored report while 8 candidate arms
  each silently recolour four gems — **PLAN.md §9 policy item 5 already
  requires that disclosure, so no amendment is needed**; (2) ticket 20 should
  record the measured ~35 DPS so the next agent does not re-derive it.

- **Next step**: no further sim iteration is warranted. Both tickets' original
  hypotheses are now falsified by measurement, and what remains in each is an
  **unreproduced owner figure**, not a defect we can localise from our side. The
  honest close is to write the findings into both tickets, file the two
  incidental tickets, and state precisely what evidence would be needed from the
  owner's runs to go further. See "Disposition" below.

## Disposition

**No fix implemented, and none is warranted from what was measured.** Every
mechanism this loop was dispatched to catch has been falsified by direct
experiment rather than argued away:

| suspect | status | killed by |
|---|---|---|
| swap builder mangles gems | **falsified** | 01 — payloads identical apart from item id |
| swap leaves a socket empty | **falsified** | 01 — every socket filled |
| swap breaks meta activation | **falsified** | 01, 05 — meta ACTIVE, and correctly so |
| wrong PvP item variant | **falsified** | 01 — both ids the only db matches, and the ones used |
| socket-capacity loss explains 103 | **falsified** | 03 — `PKG_BESTGEMS` +64.43 ≈ `PKG_PROD` +64.48 |
| artifact figures ≠ direct sim (~15 DPS) | **falsified** | 04 — harness error in 02; production reproduces to 2 dp |
| `repairMeta` activates at a net loss | **falsified** | 05 — +22.40 net gain, all five paired seeds |

What survives, in both tickets, is the same shape: **our pipeline reproduces its
own stored numbers exactly, and those numbers disagree with the owner's wowsims
web runs.** 103's +64.07 vs +97 and 106's flat ordering vs ~+10 are now
*unexplained from our side*, with the local explanations exhausted. The
remaining leads are all in the sim *request*, not the equipment payload:
`exposeWeaknessHunterAgility: 1080` (upstream's Phase-1 value, hardcoded
regardless of phase; P2's would be 1150) and the talent preset
("StandardTalents", never verified against the owner's run) — both **untested**.

The next decisive evidence is not another sim on our side but the owner's
exported wowsims settings for the two runs, which would let a request-level diff
finish the job the way 04's leaf diff finished the payload question.
