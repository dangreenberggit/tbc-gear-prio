# Execution ledger — batch-sim-followups Track B (tickets 345, 346, 348)

Executor seat, stage-gate pipeline. Plan: `plan-b.md` v3 (VERDICT proceed),
including the binding round-3 amendments N8–N11.

Shared checkout. Executor owns the tree, the browser and ports 3333 / 4180 /
5173 for the duration.

| | |
| --- | --- |
| Outer base SHA | `088cfd45a51f40d4dc414f09bdbbe3add74aa4d3` (branch `feat/upgrades-tab-batch-sim`) |
| Fork base SHA | `80395e68cd180341b1f9bf7c4c123fef769e4901` (Track A landed) |
| Node | v22.17.1 (PATH pin per `docs/agents/known-traps.md`) |

---

## Step 0 — Preconditions

Started 2026-09-02.

**Tree state.** `git -C $F status --porcelain` → empty (fork clean at the pin).
Outer tree carried one unrelated modification, `.scratch/stage-gate/batch-sim-followups/decision-log.md`
(+1 line) — the orchestrator's own artifact, not in Track B's Paths manifest and
not touched by this seat.

**Track A's guard (C7) — present.**

- `adapters/bulk_request_builder.ts:40` — `export function assertSingleStageChunk(request, candidateCount)`.
- Called at `adapters/bulk_screen_driver.ts:90`, deliberately outside the inner
  `try` so a would-be-culled chunk throws `BulkScreenIntegrityError` rather than
  degrading to the per-candidate loop.
- `MAX_CANDIDATES_PER_BULK_REQUEST = 25` at `engine/bulk/partition.ts:69`. Unchanged.

**Ticket 347 — closed** (Track A). Stop now reaches both bulk runners: the
`AbortSignal` listener is registered once outside the chunk loop and triggers
whichever chunk's `SimSignals` is in flight (`bulk_screen_driver.ts:66-121`).
C28's open question is therefore resolved: Stop does reach bulk signals.

**Harness residue (C15).** `grep -c 'bulkEquiv|bulkArm|__bulkEquiv|bulkSpike'
upgrades_tab.tsx` → **0**. Clean starting point.

**C6 / N9 bound check — re-run, and it corrects the plan again.**

Ran the fork's real `shouldUseLegacyBulkSim` and stage-gating functions through
the `tools/register.mjs` loader (temporary probe, since removed; fork tree
re-confirmed clean).

`shouldUseLegacyBulkSim(BulkSimRequest.create({highStageIterations: I}), n)`:

| I | n=25 | 26 | 27 | 28 | 29 | 30 |
| --- | --- | --- | --- | --- | --- | --- |
| 8,000 | LEGACY | LEGACY | LEGACY | LEGACY | LEGACY | tourn |
| 12,000 | LEGACY | LEGACY | LEGACY | LEGACY | tourn | tourn |
| 16,000 | LEGACY | LEGACY | LEGACY | tourn | tourn | tourn |
| 20,000 | LEGACY | LEGACY | LEGACY | tourn | tourn | tourn |
| 32,000 | LEGACY | LEGACY | tourn | tourn | tourn | tourn |

C6's table reproduces (29 at 8,000, 28 at 16,000). Which pre-High stages run,
by candidate count:

| n | pre-High stages that run |
| --- | --- |
| 5, 20, 25 | none — High only, **single stage** |
| 26, 30 | Medium (`maxSurvivors = 25`) |

**N9 is confirmed:** at n ≤ 25 no pre-High stage runs, so every 25-chunk is
single-stage at *every* iteration count. M2 (pin 8,000, verify achieved) stands,
and M1 correctly carries no 16,000 cap.

**New correction (D1, flagged — see the deviation ledger).** The legacy gate is
evaluated inside `runConcurrentBulkSim` on **one chunk's** candidate list
(`wasm/bulk_sim/index.ts:107`), and the driver partitions at 25 before dispatch.
So no chunk of 30 is ever built: a 30-candidate differential produces chunks of
25 and 5, **both LEGACY at every iteration count**. The plan's Step 2 / N9
justification — "30 > 20 so the tournament path runs" — is therefore false as
written; the `n = 30` row above never applies to a campaign chunk.

This does **not** invalidate the differential's parameters. At n ≤ 25 the legacy
flag and the stage gating converge on the same code path (High stage only), so
30 candidates still exercise *exactly* the stage path the campaign itself will
run, plus the two-chunk baseline carry (`baseline ??=`) that was the other
stated reason for 30. The parameters stand; the justification is corrected.
Consequence: no arm of this campaign, at any candidate count, ever runs a
multi-stage tournament — "tournament" throughout the 346 verdict means the
single-stage High pass over 25-candidate chunks. Recorded so the 346 write-up
cannot overclaim.

**Verified register claims.** C3 cv = 0.0356; C4 target@25 = 7,087 (plan says
7,092 — rounding in the quoted cv, immaterial), critical cv 0.0378, margin 6.2%;
C9 prior config 16 positives / 13 above 2.10 of 220 rows; C17 loop 2,699.5 s /
bulk 4,333.1 s; C22 prior dump has no `deltaPct` (scorer fallback is genuinely
required); C5, C7, C15 as above.

**N8 depth evidence — re-measured under the stricter N10 gate.**
`.scratch/set-bonus-value/ret-catchup/artifacts/shredzepelin-p3.json`
(feral, maxPhase 3, poolSize 407, engine cutoff `{absDps: 3.4, pct: 0.15}`):

| metric | value |
| --- | --- |
| rows | 407 |
| `deltaDps > 0` | 46 |
| **`deltaDps ≥ 2·se` (N10 gate)** | **34** — required ≥ 20 |
| `belowCutoff === false` | 38 |

Pilot 0 (feral at max phase 3) is confirmed as a known-good depth
configuration with margin. The round-3 dissolution of the owner fork holds.

**Budget (Step 3 arithmetic, pulled forward).** C18's per-candidate costs
reproduce from C17: loop 2,699.5/220 = 12.27 s/cand at 5,000 → 19.6 s at 8,000;
bulk 4,333.1/220 = 19.70 s/cand at 7,091 → 22.2 s at 8,000.

| N | A (bulk) | B (loop) | C (loop) | A+B+C | A+B |
| --- | --- | --- | --- | --- | --- |
| 400 | 2.47 h | 2.18 h | 2.18 h | **6.82 h** | 4.64 h |
| 407 | 2.51 h | 2.22 h | 2.22 h | **6.94 h** | **4.73 h** |

Three WASM arms exceed the 6 h budget at the frozen N, exactly as the round-3
amendment anticipated. **Precedence rule fires at its first branch: drop WASM
arm C.** A + B ≈ 4.7 h is within budget, so `candidateCap` is NOT set and depth
is preserved (`k_min` beats budget). The 345 null and the 348 null slope come
from HTTP C; V is quoted as **HTTP loop variance**, labelled as such, and the
C31 caveat ("one tournament run; tournament run-to-run variance unmeasured")
applies regardless.

**Step 0 acceptance: PASS.** Fork porcelain empty; SHAs recorded; guard located;
bound table re-run; Stop behaviour resolved.

---

## Step 1 — Pre-registration (binding; committed before any sim runs)

Copied verbatim from `plan-b.md` "Pre-registered win conditions", as amended by
N9–N11. Nothing below may be edited after the first run; outcomes go in the
Dispositions section.

### Matching method and common preconditions

Every arm pinned to `input.iterations = 8000`. **346 verdict is gated on all
of:** every chunk `n ≤ 25`; every chunk `stages == 1`; every chunk's achieved
`stageIterations == 8000`; every loop `iterationsDone == 8000`.

Else **M1**: re-run arms B and C at the maximum achieved count `I_max`, files
suffixed `-m1`. Per N9 the 16,000 cap is dropped — 25-chunks are single-stage at
every iteration count, so no bound constrains `I_max`.

### Ticket 345 — bulk-vs-loop top-N overlap

Judged A vs B against the C-vs-B null. WASM primary, HTTP alongside.

- Depth gate (**N10**): `k_min = 20` rows with **`deltaDps ≥ 2·se`** on arm B of
  the frozen configuration — never bare `deltaDps > 0`.
- **(c)**: overlap over the first `k = min(kA, kB)` rows ranked by the engine
  cutoff **≥ 90%**.
- **Control**: same metric and boundary-flip count on C vs B.
- **(c')**: every item confidently on one side of the cutoff's absolute arm on
  one route (`|deltaDps − absDps| ≥ 2·se`) is on the same side on the other
  route: **100%**. The pct arm's admissions are listed from `deltaPct` and
  disclosed (C10).
- **Decision.** (c) ≥ 90% and (c') = 100% → close 345, confirmed. (c) < 90% but
  `flips(A,B) ≤ flips(C,B)` and (c') = 100% → close 345 with (c) replaced by
  (c'), reasoning written in. Fallback route: (c') = 100% and
  `flips(A,B) ≤ flips(C,B)` → close on (c'); otherwise re-scope. (c') < 100% on
  any route → re-scope to a defect ticket naming items, gaps, bands.

### Ticket 346 — is bulk faster, slower, or a wash

- **Quoted per arm**: wall clock end to end and screening-only; `run` sim count
  by phase (baseline, screening, replication, set-bonus); chunk count; per-chunk
  baseline probes (measured); total iterations = Σ `run` `iterationsDone` +
  Σ chunks `(rows + probes) × achieved`; screening-only iterations; first-row
  latency; max/mean per-row `se`.
- **"Screening-only"**: for A, the `runBulkScreen` span (all chunks); for B and
  C, the per-candidate sim phase of the loop. The verdict is taken on
  screening-only ratios `R_wall_s`, `R_iter_s`, because the replication (36
  sims, C25), baseline and set-bonus tail is identical work on both routes and
  dilutes end-to-end ratios toward 1.0. End-to-end `R_wall`, `R_iter` quoted
  beside them.
- **Variance**: `V = |screening_B − screening_C| / screening_B`. Per the Step 0
  precedence decision, C runs on **HTTP only**, so V is labelled **HTTP loop
  variance**. **V does not bound `R_wall_s`** (C31). Thresholds: faster if
  `R_wall_s < min(0.9, 1 − V)`; slower if `R_wall_s > max(1.1, 1 + V)`;
  otherwise "wash within the measured loop variance, tournament variance
  unmeasured". If `V > 0.1`, the verdict is "indistinguishable at one run per
  arm (V = …)". The standing wash finding holds if `R_iter_s` ∈ [0.9, 1.1].
- Every 346 statement carries the C31 caveat and, per D1, the clarification that
  "tournament" here is the single-stage High pass over 25-candidate chunks.
- **Decision**: close 346 with verdict and all numbers. **Owner surfacing,
  mandatory wording** — if `R_wall_s < 1` and `firstRowSeconds_A > 120`: "Bulk is
  cheaper in total on WASM (R = …) and still fails the 120 s first-row gate
  (first row at … s)"; if `R_wall_s < 1` and first row ≤ 120 s: ask whether to
  flip the default; if slower: no owner question. **The plan never flips the
  default** (C24).

### Ticket 348 — the ~1.6% multiplicative slope

OLS of A on B over shared items; null OLS of C on B.

- **Reproduces** if `|slope_AB − 1| > 3·SE_AB` **and**
  `|slope_AB − 1| > |slope_CB − 1| + 3·SE_CB` (C21).
- Not reproduced → close into 346 as an accuracy-mismatch artifact.
- Reproduced (stating which transports) → close with the bound "immaterial near
  the cutoff, up to N% at deep downgrades" plus the cross-route consumer list;
  the `partition.ts` doc-comment edit becomes a one-line follow-up ticket (C30,
  next free number 350 — directory listing confirms 345–349 used, none at 350).

### Precedence rule (budget vs depth)

`k_min` beats the 6 h WASM budget. Drop WASM arm C first (HTTP C becomes the
null; V from HTTP, labelled); only if A + B alone still exceed 6 h set
`candidateCap`, identical on every arm, HTTP arms re-run at the cap — and never
below the count that keeps ≥ 20 rows clearing the N10 gate on B.

**Applied at Step 0: WASM arm C is dropped; no cap is set.**

### Pilot protocol (N8, N11)

Pilot 0 = feral at max phase 3 (the `shredzepelin-p3` configuration, or the
page's current character at phase 3 if the preset differs — record which).
Pilots run at **1,000 iterations** (depth depends on gear, not precision); only
the frozen configuration is re-run at 8,000 to become `http-B.json`. Only if
pilot 0 fails the N10 gate do pilots (i) / (iii) run.

### Stop-and-report triggers

Differential mismatch on either transport; an M1 trigger that cannot be
satisfied; any decision rule landing on "re-scope"; any Step 0 precondition
failure. Record the numbers and report rather than adapt.

---

---

## Step 1 — Scorer built and validated (COMPLETE, committed `128dfa0`)

`evidence/campaign-scorer.mjs`, with `evidence/fixtures/` and their generator.

Acceptance table — every target met:

| case | required | measured |
| --- | --- | --- |
| clean | all PASS, slope 1.000 | all PASS; overlap 26/26 = 100%; (c') 0 violations; slope 1.00000 |
| inverted | (a)(b)(d) FAIL, rho −1 | overlap 22/26 = 84.62% FAIL; (c') 8 violations FAIL; flips 8 vs control 0; rho −1.000000 |
| slope102 | slope 1.020 | slope 1.02000; both 348 conditions true |
| overshoot | `NO VERDICT` | `346: NO VERDICT`; `I_max = 9500` → M1 (no cap, per N9) |
| prior `equiv-dump.json` | rho 0.999229, overlap 88.89%, slope 1.016 via the C22 fallback | rho **0.999229**, overlap **8/9 = 88.89%**, slope **1.016 ± 0.002, t = 7.40**, fallback path confirmed firing |

The prior-dump slope reproduces C23's independently recorded 1.016 ± 0.0022
(t 7.4) from ticket 348, so the statistics are validated against real noise and
not only against constructed fixtures.

Pre-registration was committed **before** any pilot or arm ran, as required.
LF endings confirmed on all committed artifacts (0 CR bytes).

---

## Step 2 — NOT STARTED. Stopped and reported to the orchestrator.

No sim arm has been run. No edit has been made to `upgrades_tab.tsx`; no
temporary `?bulkEquiv=` dispatch exists; the fork tree is clean at the pin.

Reason: deviations **D1** and **D2** below both land on Step 2, and both are
`flag`-class under the plan's deviation protocol (they cross a step boundary
and change a step's acceptance criterion), not `adapt`-class. D2 in particular
changes what the campaign would be measuring, which is the orchestrator's call.
Steps 3–8 all consume Step 2's harness, so no independent step remains to
advance.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 0 / 2 | N9: "the Step 2 differential at 30 candidates exercises the tournament path (30 > `BULK_SIM_MIN_COMBINATIONS` = 20)" | The legacy gate runs per **chunk** inside `runConcurrentBulkSim` (`wasm/bulk_sim/index.ts:107`); the driver partitions at 25 first, so 30 candidates yield chunks of 25 and 5 — both LEGACY at every iteration count. No campaign chunk ever runs a multi-stage tournament. | flag | Corrects a claim the register marks load-bearing (C14, already once-corrected by N9). Differential **parameters stand** — at n ≤ 25 the legacy flag and stage gating select the same High-only path, so 30 candidates still exercise the campaign's real stage path plus the two-chunk baseline carry. Only the justification and the 346 wording change. |
| 0 / 2 | C12: the WASM harness "re-implements `BulkWasmSimRunner.runBulkScreen`" (~30 lines of exported calls) | Track A moved that loop into the shared, exported `runBulkScreenChunks` (`adapters/bulk_screen_driver.ts`); `runBulkScreen` is now a 10-line delegation whose transport arrives as an injected `dispatch` callback. | flag | Re-implementing it now would *reduce* fidelity — the harness would drift from the very code path being measured, and would bypass Track A's `assertSingleStageChunk` guard and cancel wiring. The plan's `mode=real` vs `mode=harness` differential also stops being a real check, since the two modes would share the driver. Proposed resolution (orchestrator's call): call the real driver and instrument the injected `dispatch`, capturing each chunk's raw `stageMetrics`, timings and probe events — zero re-implementation, guard still fires, strictly higher fidelity than the planned design. |
| 0 / 3 | Step 3 budgets the WASM arms from the frozen N and applies the precedence rule | At N ≈ 407 (feral p3), A+B+C ≈ 6.9 h > 6 h budget; A+B ≈ 4.7 h | adapt | The plan's own precedence rule names this exact branch: drop WASM arm C first, never cap below the depth gate. Rule applied as written, at its first branch; no cap set, so depth is preserved. |
