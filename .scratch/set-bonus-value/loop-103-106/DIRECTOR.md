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
- **Result**: pending.
- **Verdict**: pending.
