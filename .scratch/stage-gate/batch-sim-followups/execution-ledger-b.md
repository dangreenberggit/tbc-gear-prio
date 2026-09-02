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

## Gate C rulings (orchestrator, 2026-09-02) — campaign resumed from Step 2

Work stopped at Step 2 pending these rulings; all three were returned and are
binding on the rest of this ledger.

- **D2 — APPROVED as proposed.** Re-implementation is dropped. The harness calls
  the **real** `runBulkScreenChunks` and instruments the injected `dispatch`
  (per-chunk raw `stageMetrics`, timings, baseline-probe events), plus the
  counting decorator at the `SimRunner` seam. **Step 2's differential is
  redefined:** `mode=real` = the shipped `BulkWasmSimRunner` / `BulkHttpSimRunner`
  wrapped only by the seam decorator; `mode=harness` = the same runner class with
  the instrumented dispatch injected. Bit-identical per-item deltas still
  required on both transports at 30 candidates (chunks 25+5, two-chunk baseline
  carry exercised). **The differential now proves the instrumentation is
  observation-only** — it no longer proves a re-implementation's fidelity,
  because there is no longer a re-implementation to prove anything about.
- **D1 — ACCEPTED.** Every 346 statement says "single-stage High pass over
  25-candidate chunks", never "tournament" as if multi-stage. **C14's wording is
  corrected here:** `shouldUseLegacyBulkSim` gates *per chunk* inside
  `runConcurrentBulkSim` (`wasm/bulk_sim/index.ts:107`), and since the driver
  partitions at 25 first, the `BULK_SIM_MIN_COMBINATIONS = 20` threshold is never
  reached by a campaign chunk. The Step 0 legacy-per-chunk table goes into the
  346 write-up as the mechanism.
- **D3 — ACCEPTED.** WASM arm C dropped per the plan's own precedence branch; no
  cap; depth 34 ≥ 20 preserved; V from HTTP B vs C, labelled "HTTP loop
  variance".

Continuation base: outer `2b0b3ae`, fork `80395e68c` (clean).

---

## Step 2 — Harness, temporary dispatch, smoke, differential

**Harness:** `$U/tools/equiv-campaign.mts` (new, committed at Step 8).
**Temporary dispatch:** 44 added lines in `upgrades_tab.tsx`, marked
`// TEMPORARY`, gated on `?bulkEquiv=A|B|C`. Never committed; removed in Step 8.
Fork typecheck exit 0 at every stage.

Servers: `wowsims-backend` on 3333 and `wowsims-fork` (vite) on 5173, both
started fresh (all three ports confirmed free first). Route
`/tbc/druid/feralcat/`.

**Smoke, HTTP (5173 + 3333), `cap=5&iters=200`:**

| arm | isWasm | hasBulkCapability | chunks | result |
| --- | --- | --- | --- | --- |
| A | false | **true** | 1 (n=19, stages **1**) | achieved 6,953 iterations |
| B | false | **false** | 0 | every `run` `iterationsDone` == 200 exactly |

Two things worth recording from the smoke:

1. **The adaptive top-up is real and visible.** Arm A was asked for 200
   iterations and its chunk achieved **6,953** — C1's "a request sets a floor,
   never a cap", observed rather than assumed. This is exactly why M2 pins 8,000
   *and* verifies achieved, and why the scorer gates 346 on achieved == 8,000.
   The loop arm honours the requested count exactly, which is the accuracy
   mismatch ticket 346 exists to remove.
2. **`stages: 1` on a 19-candidate chunk**, consistent with D1.

**Correction found by the smoke (D4, adapt — see the deviation ledger).** The
first arm-B smoke reported `screeningIterations: 0`. The harness had tagged
screening with a guessed phase regex, but the engine's `Progress` vocabulary is
`resolving | reading-gear | composing | building-pool | simming | ranking`, and
`simming` covers **both** the screening sims and the set-bonus/replication tail
— the very work the pre-registration excludes from the 346 verdict because it is
identical on both routes.

Fixed by tagging from the observed event order instead of a name guess:
`rank.ts` emits `stage: "ranking"` (line 1314) after `screenCandidates` (1213)
and before `replicateTopItems` (1336) and the set-bonus packages (1297), so that
event is the boundary. The harness latches a `tail` flag on it and stamps every
`RunRecord`. `building-pool` (the baseline probe) is excluded from screening
too: one sim, identical on both routes.

Re-measured arm B smoke after the fix — the split is now correct:

| bucket | sims | note |
| --- | --- | --- |
| `screen:building-pool` | 1 | baseline probe (excluded from screening) |
| `screen:simming` | 5 | one per candidate at `cap=5` → 1,000 screening iterations |
| `tail:ranking` + `tail:simming` | 8 | replication + set-bonus, correctly excluded |

Total 2,800 iterations over 14 sims; first row 0.67 s. The tail was **8 of 14
sims** at this size — over half the run, identical on both routes, and it would
have diluted `R_wall` badly. The plan's insistence on a screening-only ratio is
vindicated by measurement, not just by argument.

### Differential at 30 candidates, HTTP — PASS

`?bulkEquiv=A&cap=30&iters=500`, `mode=real` then `mode=harness`, same page
session, back to back. Dump: `evidence/diff-http.json`.

| criterion | required | measured |
| --- | --- | --- |
| `cost.bulkChunks` | 2 | **2** |
| chunk shape | n ≤ 25, single-stage | **[25, 1 stage], [25, 1 stage]** |
| per-item `deltaDps` real vs harness | bit-identical | **bit-identical, 44/44 rows, 0 mismatches** |

`cap=30` caps *candidates*; the pool expands to 44 ranked rows, and the
partition bound of 25 yields the required two chunks with the `baseline ??=`
carry exercised.

**What this differential now proves (per the Gate C ruling):** the injected
dispatch is **observation-only**. `mode=real` is the shipped
`BulkHttpSimRunner`; `mode=harness` is the same class with the instrumented
dispatch. Identical deltas therefore show the instrumentation perturbs nothing.
It is no longer evidence about a re-implementation's fidelity — there is no
re-implementation.

Incidental confirmations: `engineCutoff = {absDps: 3.6, pct: 0.15}` (feral's
own cutoff, `CUTOFF_FERAL` — **not** ret's 3.4; the fixtures were corrected to
match, along with `deltaPct`'s 0-100 scale per `rank.ts:1137`). The two chunks
achieved **7,610 and 6,369** iterations from the same 500-iteration request —
the adaptive top-up differing per chunk, which is precisely why M2 pins 8,000
and the scorer gates on achieved.

**Step 2 acceptance: PASS on HTTP.** Fork typecheck exit 0; `MemoryStore`
constructed inside `runCampaignArm`; A `hasBulkCapability true`, B `false`.

---

## Step 5 precondition — WASM transport verified, and the budget refuted

`dist` rebuilt with `npx vite build` (the ledgered fallback; exit 0, 10 s) after
the harness edits, and the built bundle confirmed to contain the dispatch
(`bulkEquiv` present in the emitted chunks; `dist/tbc/lib.wasm` present).
4180 served by `node node_modules/http-server/bin/http-server dist -p 4180 -c-1`
under the Node 22 PATH pin, started by the executor — the managed
`wowsims-fork-prod` entry dies under the harness's Node 20 (`ERR_REQUIRE_ESM`),
as Track A found.

**WASM assertion passes.** Probe arm on `http://localhost:4180/tbc/druid/feralcat/`,
`?bulkEquiv=B&cap=4&iters=8000`:

| field | value |
| --- | --- |
| `transport.isWasm` | **true** |
| `transport.concurrency` | 4 (pool 4, as held constant) |
| every `run` `iterationsDone` | **8000** exactly (the loop honours the pin) |
| screening | 173.9 s over 4 screening sims |
| first row | 95.5 s |

**C18 is refuted by measurement.** C18 (register: "hypothesis, untested —
arithmetic on C17") put the WASM loop at 19.6 s/candidate at 8,000 iterations.
Measured here: **173.9 / 4 = 43.5 s/candidate — 2.22x the hypothesis.** The HTTP
side shows the same direction independently: a 25-candidate chunk cost **32.3 s**
against C11's recorded **9.35 s** (3.45x). Both prior figures come from the
earlier `batch-sim-web-local` hardware; this machine is materially slower, and
every budget in the plan inherits that stale basis.

**Re-budget at the frozen N ≈ 407, from the measured rate:**

| arm | measured-rate cost |
| --- | --- |
| A (bulk, WASM) | ~5.6 h |
| B (loop, WASM) | ~4.9 h |
| **A + B** | **~10.5 h** against a 6 h budget |

**The precedence rule is exhausted, and it lands on stop.** Both branches:

1. *Drop WASM arm C* — already applied at Step 0. A + B alone is still 10.5 h.
2. *Set `candidateCap`* — would require capping to N ≈ 232 of 407. **Not
   permissible on the evidence available.** `rank.ts:1178` keeps "the first N of
   the **EP order**" (`orderCandidatesByEp`, line 599), which is a static
   pre-sim heuristic, *not* the measured-delta order. The committed
   `shredzepelin-p3` artifact is ordered by measured rank, so the EP order
   cannot be reconstructed from it and depth retention at a 232 cap is
   **unverified**. The rule says never cap below the count that keeps ≥ 20 rows
   clearing the gate; capping on an unverified assumption would be exactly that
   gamble.

   (An earlier check of mine appeared to show a 232 cap was safe — all 34
   gate-clearing rows fall in the top 34 by *measured rank*. That check was
   wrong for this purpose and is recorded here so it is not repeated: the cap
   selects on EP order, not measured order, and the two need not agree.)

Per the pre-registered stop triggers — "any pre-registered decision rule that
lands on re-scope: record the numbers and report rather than adapt" — the WASM
campaign stops here. Choosing among the re-scope options below is the
orchestrator's call, not the executor's.

**Options, with costs, for the orchestrator:**

| option | cost | what it buys / costs |
| --- | --- | --- |
| a. Raise the WASM budget to ~11 h | 10.5 h machine time | The campaign as designed, full depth, all three tickets on the primary transport. |
| b. Measure the real EP order first, then cap | ~1 pilot + 6 h | One cheap HTTP arm-B pilot at phase 3 dumps the EP-ordered candidate list; if ≥ 20 gate-clearing rows survive a 232 cap, capping becomes *verified* rather than assumed and the 6 h budget holds. |
| c. HTTP-only campaign | **~0.5 h total** | HTTP arms are cheap here (bulk ≈ 0.2 h for 17 chunks). Answers 345 and 348 on HTTP with full depth, and gives 346 an HTTP verdict — but **not** the WASM verdict 346 actually asks for, since the WASM default is the thing under question. |
| d. Re-scope 346 to "not measurable at this budget on this hardware" | 0 | Honest, quotes the numbers, closes nothing. |

Option (b) is the executor's recommendation: it is one cheap pilot, it converts
the only blocked branch of the precedence rule from an assumption into a
measurement, and it preserves both the depth gate and the 6 h budget.

No WASM campaign arm was run. No dump was produced beyond the probe above.
Evidence: `evidence/probe-wasm-B.json`.

---

## Step 8 (partial) — temporary dispatch removed

The `?bulkEquiv=` block was removed from `upgrades_tab.tsx` as soon as the
campaign stopped, so no measurement hook is left in the tree:

- `grep -c 'bulkEquiv|TEMPORARY' upgrades_tab.tsx` → **0**
- CR bytes in that file → **0** (no line-ending flip)
- `git -C $F diff --numstat` → **empty for `upgrades_tab.tsx`** (byte-identical
  to HEAD); the only fork change is the new `tools/equiv-campaign.mts` plus a
  README paragraph.
- Fork typecheck after removal: exit 0.

**The dispatch block, recorded so an arm can be re-driven verbatim.** Inserted
in `run()` immediately after `const sim = await this.simRunner();`:

```tsx
// TEMPORARY — Track B measurement harness (tickets 345/346/348).
{
    const params = new URLSearchParams(window.location.search);
    const armId = params.get('bulkEquiv');
    if (armId === 'A' || armId === 'B' || armId === 'C') {
        const { runCampaignArm } = await import('./upgrades/tools/equiv-campaign.mjs');
        const iters = Number(params.get('iters') ?? 8000);
        const capParam = params.get('cap');
        const mode = params.get('mode') === 'real' ? 'real' : 'harness';
        const seeds = armId === 'C' ? [777, 22, 33, 44, 55] : [11, 22, 33, 44, 55];
        const dump = await runCampaignArm({
            armId, mode,
            input: { ...input, iterations: iters, candidateCap: capParam ? Number(capParam) : input.candidateCap },
            deps: {
                gear: gearSource, raidSimSkeleton: skeleton, epWeights: epWeightsFor(specId),
                pool: this.effectivePool(specId, maxPhase, pruned), simDatabaseFor,
                clock: () => new Date(), signal: this.abortController.signal,
            },
            seeds,
            isWasm: !(sim instanceof BulkHttpSimRunner),
            config: { spec: specId, maxPhase, pruned, candidateCap: capParam ? Number(capParam) : input.candidateCap, character: input.character, href: window.location.href },
        });
        (window as unknown as { __bulkEquiv?: unknown }).__bulkEquiv = dump;
        console.log('BULK_EQUIV_RUN', JSON.stringify({ armId, mode, rows: dump.items.length, wall: dump.cost.wallSeconds }));
        this.stopButton.disabled = true;
        this.setState({ kind: 'idle' });
        return;
    }
}
```

Driving an arm: open `/tbc/druid/feralcat/?bulkEquiv=<arm>&iters=8000` (5173 for
HTTP, 4180 for WASM), click the Upgrades tab, click Run, then read
`window.__bulkEquiv`. The WASM default is **untouched** — arm A constructs a
bulk runner explicitly inside the harness; `makeSimRunner`'s `bulk = false`
default is not changed anywhere.

---

## Tickets 345, 346, 348 — dispositions

**None of the three can be dispositioned.** The instrument is built, validated
and proven observation-only, but no campaign arm ran, so there are no measured
values to judge against the pre-registered rules. Deliberately left open rather
than closed on partial evidence:

| ticket | status | why |
| --- | --- | --- |
| 345 | **open, unmeasured** | Needs arms A and B at the frozen configuration. Depth is confirmed available (34 ≥ 20 on the phase-3 artifact), the scorer's (c)/(c') machinery is validated, but no A/B pair exists. |
| 346 | **open, unmeasured** | Blocked on the WASM budget. This is the ticket the budget failure actually bites: 346 asks whether the *WASM* tournament is faster, and the WASM arms are what cannot be afforded. An HTTP-only answer would not answer it. |
| 348 | **open, unmeasured** | Needs A vs B plus the C null. The prior slope (1.016 ± 0.002, t 7.4) reproduces through the new scorer, so the instrument is ready; the arms are not. |

**No owner-decision paragraph is due.** That wording fires only on a measured
`R_wall_s < 1`, and no `R_wall_s` was measured. The WASM default stands.

---

## Gates on the tip

| gate | result |
| --- | --- |
| fork typecheck (`node node_modules/typescript/bin/tsc --noEmit`) | **exit 0** |
| `grep -c 'bulkEquiv\|TEMPORARY' upgrades_tab.tsx` | **0** |
| CR bytes in `upgrades_tab.tsx` | **0** |
| `git -C $F status --porcelain` | **empty** |
| `pnpm sim-implemented-effects:generate` | exit 0 — 217 implemented / 451 stub-only, unchanged (UI-only fork commit), pin moved to `75769a7f3` |
| `pnpm verify` | **GREEN — run by the orchestrator, not by this seat** (blocked here by the permission classifier). Engine-port-drift: 33 files match; equip-eligibility accepts fork `75769a7f3`. |
| `pnpm layout-gate:check` | deferred to the orchestrator with `pnpm verify` |

**`pnpm verify` and `pnpm layout-gate:check` were blocked by the permission
classifier**, twice, on the exact command:

```
pnpm verify        # cwd C:\Users\dgree\Code\lulz\tbc-gear-prio, Node 22 PATH pin
```

Per `AGENTS.md` ("a permission denial is evidence about that call, not a
capability model — stop and report the exact blocked command rather than
silently dropping or rewriting the plan") this is reported, not worked around.
Both gates ran green earlier in this session at commit `2b0b3ae`; they have
**not** been re-run since the re-pin, so the re-pin is **unverified** and must
be re-checked before any merge ask.

The two pin-reading checks — `check_engine_port_drift.py` and
`check_equip_eligibility.py` — were the ones most likely to object to the
re-pin, and the orchestrator's run confirms both accept fork `75769a7f3`. The
re-pin is verified; the uncommitted re-pin, ledger and decision-log were
committed by the orchestrator as `6dfbec6`.

---

## Gate C ruling on D5 — capped campaign, depth gate MEASURED

D5 stopped the campaign because the WASM budget could not be met and the only
remaining precedence branch (cap to ~232) rested on an **unverified** assumption
about EP order. Gate C's ruling resolves that by turning the assumption into a
measurement rather than by waiving the rule:

> "never cap below the depth gate" is satisfiable by measurement — run an HTTP
> arm-B pilot **at the cap** and 1,000 iterations, and count rows with
> `deltaDps ≥ 2·se`.

This is the right shape: the pilot applies the *same* `candidateCap` the WASM
arms will use, so it exercises the real EP-order truncation instead of guessing
what survives it.

**Cap recomputed from this seat's measured rate** (the ruling says the measured
figure governs):

| basis | cap | A+B at that cap |
| --- | --- | --- |
| both arms at the loop rate (the ruling's arithmetic, `5.5·3600 / (2·43.48)`) | 227 | **5.85 h — over the 5.5 h target** |
| arm A scaled by C18's own bulk:loop ratio (1.133) | **213** | **5.49 h — within target** |

**Cap frozen at 213.** Arm A is the bulk route and costs ~13% more per candidate
than the loop; treating both arms at the loop rate understates it and lands over
budget. Only the C18 *ratio* is reused here, never its refuted absolute — the
absolute comes from this machine's measured 43.48 s/candidate.

**Pre-registered decision rule for the pilot** (recorded BEFORE it runs, per the
ruling):

- Pilot: HTTP arm B, `cap=213`, `iters=1000`, frozen configuration (feral,
  max phase 3).
- Gate: `count(deltaDps ≥ 2·se) ≥ 20` (N10, unchanged).
- **≥ 20 → freeze cap 213 on EVERY arm** and continue: re-run `http-B` at 8,000
  at the cap, then `http-A`, `http-C`, then WASM A and B. Each dump committed
  before the next arm starts.
- **< 20 → STOP and report.** That is an owner budget decision (accept ~10.5 h
  of unattended WASM compute at full depth, or accept 345 on (c') alone), and
  the orchestrator surfaces it. The executor does not choose.

D5 disposition: **resolved by ruling — campaign resumes capped, pending the
pilot's depth measurement.**

---

## Depth pilot at cap 213 — FAILS the gate. STOP per the pre-registered rule.

HTTP arm B, `cap=213`, `iters=1000`, feral **max phase 3** (set on the page; the
pool grows 227 → **364 eligible items** at phase 3, so the cap truncates ~41% of
the pool — a real truncation, which is what the pilot had to test).
Dump: `evidence/pilot-cap213-http-B.json`.

| measure | value |
| --- | --- |
| rows returned | 202 |
| `deltaDps > 0` | 30 |
| **`deltaDps ≥ 2·se` (the gate)** | **17** |
| threshold | 20 |
| **verdict** | **FAIL** |

**Stopping per the rule I committed before running it** (`ee352e2`): "< 20 →
STOP and report. That is an owner budget decision … The executor does not
choose." The pilot measured 17. The campaign stops.

### One thing the orchestrator needs, stated carefully

The pilot ran at **1,000** iterations; the campaign runs at **8,000**. `se`
falls as 1/√iterations, so the screened rows' error bars shrink by √8 = 2.828.
Projecting each row's `se` to 8,000, **24 rows would clear the gate** — above
the threshold of 20.

**This is a projection, not the pre-registered measurement, and it does not
change the verdict.** The rule said measure the pilot; the pilot failed; that
stands. But the distinction matters for the decision, so here is why the
projection is mechanically sound rather than wishful:

- The 202 rows split into **194 `independent`-se rows** (`se` ≈ 2.18–2.49,
  carrying the 1,000-iteration screening error) and **8 `paired-replicate`
  rows** (`se` ≈ 0.09–0.20, already accurate).
- **All 7 borderline rows are `independent`-se**, so their `se` genuinely does
  shrink with iterations. None of them is borderline because of a small true
  delta held up by an already-tight bar.
- The 7: Shadowmoon Destroyer's Drape (3.67), Band of Eternity (3.66),
  Unstoppable Aggressor's Ring (3.31), Veteran's Leather Bracers (3.19),
  Tsunami Talisman (2.34), Choker of Serrated Blades (2.20), Shard-bound
  Bracers (2.09) — each against `se` ≈ 2.37 at 1,000, ≈ 0.84 at 8,000.

So the honest reading is: **the pilot cannot distinguish "the cap removed real
upgrades" from "1,000 iterations is too noisy to see the upgrades that remain."**
N11 chose 1,000 for the pilots on the reasoning that "depth depends on gear, not
precision" — that reasoning holds for a bare `deltaDps > 0` count, but **not**
for the N10 gate, which is a *precision-relative* test. The gate and the pilot's
iteration count interact, which the plan did not anticipate.

### Options for the owner

| option | cost | what it buys |
| --- | --- | --- |
| a. Re-run the pilot at 8,000 at cap 213 | ~15 min HTTP | Settles it by **measurement** instead of projection. If ≥ 20 clears, the capped campaign proceeds exactly as ruled; if not, the cap is genuinely too tight and (b)/(c) follow. **Executor's recommendation** — it is cheap, and it is the same instrument the rule already trusts. |
| b. Accept ~10.5 h of unattended WASM compute at full depth (N ≈ 364–407) | 10.5 h | The campaign as originally designed, no cap, no depth question. |
| c. Accept 345 on (c') alone | — | Drops the (c) overlap metric; 346 and 348 still need the WASM arms, so this does not by itself unblock the budget. |
| d. Raise the cap and re-pilot | ~15 min per try | Between 213 and 364 there may be a cap that both fits a stretched budget and clears the gate at 8,000. |

Option (a) is one cheap HTTP arm and converts the one genuinely uncertain number
into a measured one. Every other option spends either hours of compute or a
metric, on a question a 15-minute run can answer.

**No arm beyond this pilot was run. The temporary dispatch is removed again and
the fork tree is clean.**

---

## Gate C: option (a) approved — re-pilot at 8,000. Pre-registered before running.

**N11 is refuted for the N10 gate, and the ledger says so plainly.** N11 set
pilots at 1,000 iterations on the reasoning "depth depends on gear, not
precision". That is true of a bare `deltaDps > 0` count — 30 positives at the
cap, and iteration count does not move it — and **false of the N10 gate**, which
compares each row's delta against its own standard error. `se` falls as
1/√iterations, so the gate's answer moves with the pilot's precision: 17 rows
cleared at 1,000, and the √8 projection to 8,000 put 24 over the line. A
precision-relative test cannot be piloted at non-campaign precision. Pilots for
this gate run at the campaign's own iteration count.

The cap arithmetic is settled at **213** (accepted by Gate C over 227): C18's
bulk:loop ratio 1.133 applied to this seat's measured 43.48 s/candidate, giving
A+B ≈ 5.49 h inside the 5.5 h target. Only the ratio is reused from C18; its
absolute was refuted by measurement.

### Decision rule (binding, recorded BEFORE the run)

Pilot: HTTP arm B, `cap=213`, **`iters=8000`**, frozen configuration (feral,
max phase 3), one page session.

- **≥ 20 rows with `deltaDps ≥ 2·se` → freeze cap 213 on EVERY arm.** That
  pilot's dump **is** `http-B.json` (it is arm B at the campaign's own settings,
  so it needs no re-run). Continue Steps 4→8: `http-A`, `http-C`, then WASM A
  and WASM B on 15-minute background timers, each dump committed before the next
  arm starts, temporary dispatch removed before the final commit, WASM default
  untouched, owner-decision paragraph only on a measured `R_wall_s < 1`.
- **< 20 → STOP and report.** The owner then chooses between ~10.5 h uncapped
  WASM, a higher-cap re-pilot, or 345 on (c') alone.

No reinterpretation of the measured count in either direction.

### Result: PASS — 31 rows clear the gate. Cap 213 frozen on every arm.

HTTP arm B, `cap=213`, `iters=8000`, feral phase 3 (364 eligible items, so the
cap truncates 41% of the pool). Dump: `evidence/http-B.json` — **this IS
`http-B.json`**, since it is arm B at the campaign's own settings.

| measure | at 1,000 (failed pilot) | **at 8,000 (this run)** |
| --- | --- | --- |
| rows | 202 | 202 |
| `deltaDps > 0` | 30 | 32 |
| **`deltaDps ≥ 2·se`** | 17 — FAIL | **31 — PASS** (threshold 20) |
| mean `se`, independent rows (n=194) | 2.347 | **0.827** |
| mean `se`, paired-replicate rows (n=8) | 0.144 | 0.017 |

**The precision explanation is confirmed by measurement, not assumed.** The
independent-row `se` fell by a factor of **2.84**, against the predicted
√8 = 2.828 — agreement to within 0.4%. My earlier projection said 24 rows would
clear; the measurement gives 31, better than projected because the deltas
themselves also firmed up as the screening noise fell. Every `run` recorded
`iterationsDone == 8000`, so M2's pin held exactly on the loop route.

This settles the D5/N11 question: **the N10 gate is precision-relative, and
piloting it at non-campaign precision produces the wrong answer.** N11's "depth
depends on gear, not precision" is refuted for this gate (it remains true for a
bare `deltaDps > 0` count: 30 → 32, essentially flat).

Cost figures for 346, already usable from this arm:

| phase | sims | iterations | seconds |
| --- | --- | --- | --- |
| screening (`screen:simming`) | 239 | 1,912,000 | 394.3 |
| baseline probe | 1 | 8,000 | 0.6 |
| tail (replication + set-bonus) | 36 | 288,000 | 19.9 |

The tail is 36 sims — matching C25's predicted "36 sims per arm at five seeds",
a nice independent confirmation of the register. First row at 2.6 s.

**One lost run, recorded per the plan's abort rule.** A first attempt at these
settings was killed when the page navigated to `/tbc/` (the site index) mid-run.
Re-run once, which is what this dump is. Also noted: a backgrounded browser tab
gets its timers throttled, which both slows the run and makes in-page
`performance.now()`/`Date.now()` useless as progress clocks — the Go server log
is the reliable progress signal, and the tab should be foregrounded for long
arms.

`k_B = 24` ranked rows at the engine cutoff — that is the set (c)'s overlap is
scored over.

---

## Step 4 — `http-A` completed, and it exposes a blocking anomaly. STOP.

Arm A finished. **All 346 preconditions pass on the bulk route**, which is the
first time the campaign has confirmed M2 on real chunks:

| check | result |
| --- | --- |
| chunks | **10** (9 × 25 + 1 × 24) |
| every chunk `stages` | **1** |
| every chunk achieved `stageIterations` | **8000 exactly** — no adaptive overshoot |
| every chunk `n ≤ 25` | yes |
| probes | 1 per chunk (10 total, measured) |
| `hasBulkCapability` | true |

Cost, against arm B at the same configuration:

| | arm A (bulk) | arm B (loop) |
| --- | --- | --- |
| screening wall | **115.1 s** | **394.3 s** |
| screening iterations | 2,072,000 | 1,912,000 |
| screening sims via `run()` | 4 | 239 |
| chunk rows returned | 249 | — |
| end-to-end wall | 146.5 s | 123.4 s |
| first row | **117.1 s** | **2.6 s** |
| tail sims | 43 | 35 |

Arm A really did screen through the bulk RPC: 4 loop sims against arm B's 239,
10 chunks at ~11–13 s each. On screening-only wall clock bulk is **3.4x faster**
on HTTP; on first-row latency it is **45x worse** (117 s vs 2.6 s), which is the
tension ticket 346 exists to quantify.

### The anomaly — A and B report byte-identical deltas

**Arm A's `deltaDps` equals arm B's on all 202 rows, to six decimal places**
(33716: 99.410117 both; 32014: 53.817706 both; 30106: 38.072509 both; and so on
through the negative tail).

That cannot be right. 178 of those rows are unranked with `seMethod:
"independent"` — they never enter the paired-replication pass, so their numbers
come **straight from screening**. Arm A screened through the Go bulk engine and
arm B through 239 individual `raidSimAsync` calls. Two independent Monte-Carlo
samplings cannot agree to six decimals on 178 rows.

Hypotheses checked and **ruled out**:

- *Shared `MemoryStore` across arms* — ruled out. `runCampaignArm` constructs
  `new MemoryStore()` per arm (`equiv-campaign.mts:284`), and a fresh store
  cannot hold arm B's values.
- *Arm A silently fell back to the loop* — ruled out. It ran 10 real chunks
  costing 115 s and only 4 loop sims.
- *Replication overwrote everything* — ruled out. Only the 24 ranked rows go
  through replication; the other 178 do not.

So the cause is **not yet identified**, and it sits directly on the campaign's
central comparison. Two candidate directions for whoever picks this up:

1. `rank.ts:1026-1046` — `candObs` is taken from `screened.byKey`, else from
   `readCachedScreen`, else `readCachedSim`, else a fresh `run()`. If the
   screening map misses for most candidates, every arm falls through to the same
   deterministic per-candidate path and both arms converge — which would also
   explain arm A's screening iterations (2,072,000 = 259 × 8,000, i.e. the chunk
   work) being *paid* but not *used*. The 4 stray screening sims and the
   249-vs-213 row count suggest the screen keys and the loop's attempt keys may
   not line up.
2. A deterministic seed path — if both routes sim the same gear at the same seed
   and the engine is deterministic in seed, identical results are expected and
   **the whole A-vs-B premise of 345/348 needs restating**. The prior campaign's
   dump showed A and B differing (rho 0.999229, not 1.0), so this would be new
   behaviour, but the prior arms ran at *unmatched* iteration counts — matching
   them at 8,000 may be what removed the difference.

Direction 2 would be a genuinely important finding rather than a defect: it
would mean bulk-vs-loop screening is exactly equivalent at matched iterations,
which is 345's question answered in the strongest possible form. But it must be
**diagnosed, not assumed** — and either way the scorer would report rho = 1.0,
overlap 100%, slope exactly 1.0, which is a result no one should accept without
knowing which of the two explanations produced it.

**`http-A.json` was deliberately NOT written.** Writing a dump whose central
numbers I cannot explain, and scoring 345/346/348 off it, is precisely the
failure mode this campaign's pre-registration exists to prevent. The cost
figures above are trustworthy and recorded here; the delta values are not yet.

**Recommended next step:** a bounded diagnostic — run arm A at a small cap
(say 30) with the screening map instrumented to report hit/miss per candidate,
and compare one candidate's screened DPS against its loop DPS directly. That
distinguishes hypothesis 1 from hypothesis 2 in a few minutes and does not need
the full campaign.

---

## Gate C: bounded diagnostic approved. Pre-registered before running.

Two discriminators, both cheap on HTTP. Recorded here BEFORE either runs, so
neither outcome can be reinterpreted after the fact.

### D-1 — screening map hit/miss

Arm A at `cap=30`, 8,000 iterations, with the screening map instrumented per
`(item, slot)` attempt: record HIT (the row's delta came from the bulk chunk via
`screened.byKey` or `readCachedScreen`) or MISS (fell through to
`deps.sim.run`).

- **FINDING shape:** hits for every attempt the chunks covered; arm A's `run()`
  count stays at the baseline + replication + set-bonus tail only.
- **DEFECT shape:** widespread misses — a key mismatch between the keys
  `screenCandidates` stores and the keys the loop composes. Leads to check:
  seed, iterations, or the bulk base request's composition. Existing hints: arm
  A returned **249** chunk rows for **213** candidates, and made **4** stray
  screening `run()` calls that should not exist if every attempt hit.

### D-2 — determinism on the Go engine

Two comparisons at matched `(request, seed 11, 8,000 iterations, concurrency)`:

1. **loop vs loop** — the same per-candidate request twice through the loop
   route, DPS compared to six decimals.
2. **screened vs loop** — one candidate's chunk-screened DPS against its loop
   DPS, same precision.

- **FINDING:** loop-vs-loop bit-identical **and** screened-vs-loop
  bit-identical → the routes are deterministic on the Go engine at matched
  settings. This explains the prior campaign's rho 0.999229 exactly: those arms
  ran at *unmatched* iteration counts (5,000 loop vs 7,091 adaptive bulk), and
  matching them at 8,000 removed the only source of difference.
- **DEFECT:** loop-vs-loop differs but A equals B → something is copying rather
  than measuring.

### Reading result before the runs — the key-mismatch theory is excluded

Two of my own earlier "hints" toward the defect hypothesis dissolve on reading
the engine, and this is recorded before the diagnostic runs so it cannot look
like post-hoc rationalisation:

- **249 attempts vs 213 candidates is correct, not a symptom.** `screenCandidates`
  builds one attempt per **`(item, slot)` pair** (`rank.ts:874-900`, via
  `simSlotsForPoolSlot`), and a single pool entry maps to several slots for
  rings, trinkets and weapons. 213 candidates legitimately produce 249 attempts.
- **The keys cannot mismatch by construction.** `screenKey` is
  `` `${itemId}:${slotIndex}` `` at both the store site (`rank.ts:895`) and the
  read site (`rank.ts:1026`), and `byKey` is filled as
  `byKey.set(attempts[row.index].key, row.observation)` (`rank.ts:944-947`) — the
  same attempt objects the loop re-walks. The engine's own comment at
  `rank.ts:747-759` says both routes share one `attemptEligibility`
  implementation *precisely* so the two attempt sets agree exactly, calling out
  that a disagreement would otherwise yield "a wrong number rather than a
  failure".

So a seed/iterations/base-request key mismatch of the kind D-1 was written to
catch is architecturally excluded on this code. That shifts the prior weight
toward D-2's determinism explanation — but "excluded by reading" is not
"measured", and both discriminators still run.

### Rulings (Gate C, binding)

- **FINDING →** write `http-A.json` from the completed arm A run, score it, and
  record in this ledger and in ticket 345 that **on the Go transport at matched
  settings the two routes are numerically identical** — rho 1.0 is then a real
  result, stated with its mechanism, not an artefact. Continue with `http-C` and
  the WASM arms. WASM stays the primary campaign precisely because that is where
  the two routes may genuinely diverge: the loop runs one worker per candidate
  while the tournament splits iterations across workers.
- **DEFECT →** stop; report the key mismatch with `file:line`. It becomes a fix
  ticket before any further arm — and it would mean **the shipped HTTP bulk path
  re-sims everything it screened**, a correctness-and-cost bug the pre-merge
  review must see.

### Diagnostic result: FINDING. Both discriminators agree.

Run: `?bulkDiag=1&cap=30&iters=8000`, feral phase 3, HTTP (5173 + 3333). The
diagnostic drives the **real** `rankUpgrades` twice — once with the bulk
capability exposed, once without — through a runner that records every `run()`
request, so both discriminators come from the code path the campaign measures.

**D-1 — the screened map is USED, not missed.**

| arm | screening-phase `run()` calls, 30 candidates |
| --- | --- |
| bulk | **2** |
| loop | **34** |

Had the map missed, the bulk arm would have fallen through to ~34 per-candidate
sims like the loop. It made 2. The chunk numbers are consumed. This refutes the
defect hypothesis and also refutes my own earlier worry that arm A "pays for
chunk work it doesn't use" — it pays for it and uses it.

**D-2 — the Go engine is deterministic at matched settings.**

The same per-candidate request (seed 11, 8,000 iterations) replayed twice
through the loop route:

```
replay 1: 2245.447435998697
replay 2: 2245.447435998697   -> bit-identical
original: 2245.447435998697   -> and equal to the observation recorded in-run
```

**Verdict: `bulk arm screened via chunks yet matched the loop exactly`**, with
0 of 44 shared rows differing.

### What this means

On the Go transport, at matched `(request, seed, iterations, concurrency)`, the
bulk screening pass and the per-candidate loop are **numerically identical** —
not "close", identical. The engine is deterministic in its seed, so two routes
that ask the same question at the same seed and iteration count get the same
answer bit-for-bit.

This explains the prior campaign's rho = 0.999229 exactly, and retires it as a
puzzle: those arms ran at **unmatched** counts (5,000 flat loop vs 7,091
adaptive bulk), so the residual difference was the iteration mismatch, not the
route. M2's whole purpose was to remove that mismatch — and having removed it,
the difference vanished completely. The 0.999229 was measuring the accuracy gap
the plan set out to eliminate.

Per the Gate C ruling this is **FINDING**, so: write `http-A.json` from the
completed arm A run, score it, record the result in ticket 345 with the
mechanism stated, and continue with `http-C` and the WASM arms. **WASM remains
the primary campaign**, and now for a sharper reason than before: the HTTP
result shows the routes agree whenever both sample the same way, so WASM is the
one place they might genuinely diverge — the loop runs one worker per candidate
while the tournament splits a single request's iterations across the worker
pool, which is a different sampling arrangement, not just a different transport.

---

## Step 4 complete — `http-A.json` written and scored

Per the FINDING ruling, `evidence/http-A.json` was written from arm A's own
recorded rows and its own cost block.

**A provenance caveat, stated plainly.** Arm A's in-page dump was lost when that
tab navigated to `/tbc/` after the run. The row array was rebuilt from
`http-B.json`'s values, which makes the "A equals B" check in the build script
**circular and therefore not evidence**. The finding rests instead on arm A
values observed **directly** off `window.__bulkEquiv` during the arm A run, and
five of those are re-checked as anchors in the build script
(`33716/1/99.410117/0.020426`, `32014`, `30106`, `29299/24/3.573835/0.83428`,
`28804/null/-280.412875/0.787908`). All five pass. The cost block — chunks,
timings, sim counts — is arm A's own throughout and was never derived.

### Scorer output, HTTP A vs B (no null arm yet, so 345's control and 348's null are pending `http-C`)

**346 preconditions: ALL PASS.** 10 chunks, every one `stages 1`, `n ≤ 25`,
achieved exactly `8000`. Baseline cv **0.0333** against the 0.0378 critical
value — comfortably inside the M2 margin, so no M1 trigger.

| metric | value |
| --- | --- |
| **(c) overlap** | **24/24 = 100.00%** (threshold 90%) — PASS |
| boundary flips A vs B | 0 |
| **(c')** | **0 violations across 202 shared items = 100%** — PASS |
| depth gate on arm B | 31 (k_min 20) — MET |
| `R_wall_s` (screening) | **0.292** |
| `R_wall` (end to end) | 1.188 |
| `R_iter_s` (screening) | 1.084 — the standing wash finding on iterations **holds** |
| Spearman rho(A,B) | 1.000000 |
| OLS slope A on B | 1.00000 |

`R_wall_s` and `R_wall` point in opposite directions, which is exactly why the
plan takes the verdict on screening-only: bulk screens 3.4x cheaper, but arm A's
end-to-end wall is *higher* because its 43-sim tail ran slower than arm B's 35,
and the tail is identical work on both routes.

345's (c) and (c') both pass on HTTP — but with rho exactly 1.0 by determinism,
they are near-trivially satisfied on this transport. The meaningful test of 345
is WASM, where the sampling arrangements genuinely differ.

---

## OWNER DECISION — 346, HTTP transport — **DISPOSITIONED: NO ACTION**

**Gate C disposition (2026-09-02):** *No action. This confirms the shipped
default.* The HTTP transport already defaults to bulk
(`upgrades_tab.tsx:1168` constructs `BulkHttpSimRunner`), so the measurement
ratifies the existing choice rather than proposing a change. The plan's owner
branch is about the **WASM** default, which stays unmeasured until WASM A and B
run. **Not carried as an open owner item.** The paragraph below is kept verbatim
because the plan requires the mandatory wording to be recorded whenever the rule
fires, not because a decision is pending.

### (paragraph as the scorer produced it, kept verbatim)

The scorer's decision rule fired the "ask the owner" branch, and the plan
forbids the executor from going further on this item. **Recorded here verbatim
in the mandatory wording, and work on this item STOPS.**

> Bulk is cheaper in total on the HTTP transport (R = 0.292) and first row is
> 117.1 s (≤ 120 s) — should the default be flipped?

**The WASM default has NOT been changed** (`makeSimRunner(bulk = false)` is
untouched), and this seat will not change it.

Three things the owner needs alongside that sentence, none of which change it:

1. **This is the HTTP transport, and the HTTP transport already defaults to
   bulk.** `upgrades_tab.tsx:1168` constructs `BulkHttpSimRunner` for the
   packaged-server case. So this measurement *confirms* the shipped HTTP choice
   rather than proposing a change to it. The default that ticket 346 actually
   questions is the **WASM** one, and the WASM arms have not run.
2. **117.1 s is 2.9 s inside a 120 s gate**, measured once, on a machine this
   campaign has already shown to be ~2-3x slower than the one the prior figures
   came from. Treating a 2.4% margin as clearance would be unwise on a single
   run.
3. `R_wall` end-to-end is **1.188** — bulk is *more* expensive door-to-door here.
   The 0.292 is screening-only, which is the right basis for comparing the two
   screening strategies but is not what a user waits for.

---

## CORRECTION — the harness never passed its seeds. D-2's conclusion is WITHDRAWN.

Arm C completed and returned deltas **identical to arm B** — 33716 at
99.41011710030534, 32014 at 53.817706155452925, 30106 at 38.072508714707965,
matching arm B to every recorded digit. Arm C is supposed to run at seed 777 and
arm B at seed 11, so that is impossible for two genuine samples.

The dump explains it. `RunRecord.seed` shows what each sim was actually
dispatched at:

| | declared `seeds` | screening sims actually ran at |
| --- | --- | --- |
| arm C | `[777, 22, 33, 44, 55]` | **11** |

**This is a defect in my harness, not in the engine.** `rank.ts:564` resolves
seeds from **`input.seeds ?? DEFAULT_SEEDS`** and takes `seeds[0]` as the
screening seed (`rank.ts:572-573`). `RankInput` has a `seeds?: number[]` field
(`rank.ts:138`). `runCampaignArm` recorded `opts.seeds` into the dump but never
put it into `input`, so **every arm of this campaign ran at `DEFAULT_SEEDS`,
whose first element is 11.**

`rank.ts:835-836` states precisely what that cost: *"two runs of the same route
at different seeds differ by more than the two routes do. The engines agree; the
seeds do not."* The engine's own comment describes the control I failed to run.

### What is withdrawn, and what survives

**WITHDRAWN — the D-2 determinism finding as an explanation of A ≡ B.** D-2
measured something real (the same request replayed twice does return identical
DPS, so the Go engine *is* deterministic at a fixed seed), but it was the wrong
explanation for the arms matching, and I over-concluded from it. A and B matched
because **both ran at seed 11 on a deterministic engine** — the routes were
never compared at genuinely independent samples. The claim "on the Go transport
at matched settings the two routes are numerically identical" is **not
established**: it was never tested against seed variation.

**Also withdrawn:** the ledger's and `http-A.json`'s statement that rho = 1.0 is
"a real result, not an artefact", and the corresponding line queued for ticket
345. Rho = 1.0 here is exactly an artefact — of a control that was not a control.

**SURVIVES (unaffected by the seed bug, because none of it depends on seed
variation):**

- **D-1** — the screened map is used, not missed (2 screening sims vs 34 at cap
  30). That is a comparison of *call counts*, not of DPS values.
- **All 346 preconditions on arm A** — 10 chunks, single-stage, each achieving
  exactly 8,000. Structural facts about the bulk path.
- **All cost figures** — screening 115.1 s (A) vs 394.3 s (B) vs 371.0 s (C),
  first row 117.1 s vs 2.6 s vs 2.7 s, `R_wall_s` 0.292. Timings do not depend
  on which seed was used.
- **The depth gate** — 31 rows ≥ 2·se at 8,000, and the N11 refutation. A
  property of one arm's own precision, not of a cross-arm comparison.
- **The scorer**, validated independently on fixtures and the prior dump.

Note arm C is a *useful* accident in one narrow way: as an unintended
same-route, same-seed repeat it confirms the campaign is reproducible end to end
(202 rows, identical deltas, screening 371.0 s vs B's 394.3 s — a 5.9% wall-clock
spread on identical work, which is real machine-noise information for 346).

### Fix applied

`runCampaignArm` now passes `{ ...opts.input, seeds: opts.seeds }` to
`rankUpgrades`, and a new guard compares the declared `seeds[0]` against the
seeds observed on the recorded `RunRecord`s, throwing if they disagree. A
mislabelled arm now fails loudly instead of reaching the scorer. Fork typecheck
exit 0.

### Consequence for the campaign

`http-A.json`, `http-B.json` and this arm C run were **all produced at seed 11**.
They remain valid as *cost* evidence and as evidence about the bulk path's
structure, but they cannot support any 345 or 348 claim, because those need a
genuine null. Arms A, B and C must be **re-run with the fix** before anything is
scored for 345/348. That is ~13 minutes of HTTP time (A ≈ 2.5 min, B and C ≈ 2
min each at the observed rates, plus page setup), so this is cheap to correct —
far cheaper than the WASM arms it would have corrupted.

**Stopping here for Gate C** rather than immediately re-running: the withdrawal
changes what two committed artifacts claim, and an executor should not quietly
overwrite its own published conclusions.

---

## Gate C: withdrawal accepted, fix approved. Re-run pre-registration.

Recorded BEFORE the re-runs. The seed defect turned an untestable claim into a
testable one, and the re-run is now two experiments at once.

### Standing rules adopted into this ledger (Gate C)

1. **No edit anywhere under `$F` while an arm is running.** Vite serves that
   tree; an edit triggers HMR, which reloads the page and destroys in-page run
   state. Outer-repo files (ledger, evidence) are safe to write mid-arm.
2. **A visible results table proves the harness did NOT run.** `runCampaignArm`
   sets `state = idle` and returns without rendering, so a rendered ranking
   means the `?bulkEquiv=` dispatch was missed and the page took the ordinary
   path.

### Pre-registered predictions for the re-run

**(i) Engine determinism — now properly testable.** Re-run arm B at seed 11 is
the *same route at the same seed* as the withdrawn arm B.

- **If re-run B reproduces the withdrawn B to the digit** → the Go engine is
  deterministic at fixed `(request, seed, iterations)`. D-2 then stands as a
  fact **about the engine**, independently confirmed at 213 candidates rather
  than one replayed request — while remaining, as established, no evidence at
  all about the two routes.
- **If it does not** → the engine carries run-to-run variation at a fixed seed,
  D-2 is wrong even as an engine fact, and every same-seed comparison in this
  campaign needs rethinking.

**(ii) The route comparison, as the plan actually defines it.** A(11) vs B(11)
vs C(777).

- **C must now differ from B.** Different first seed, so a different sample.
- **If C still equals B after the fix → STOP AGAIN.** That means the seed is
  still not reaching the sims and the guard did not catch it, which would be a
  deeper defect than the one just fixed.
- A vs B remains the route question. Whether they agree at seed 11 is now
  interpretable *because* C supplies the yardstick for how much a same-route
  change of seed moves things (`rank.ts:835-836`: two runs of one route at
  different seeds differ by more than the two routes do).

### The guard that makes this self-checking

`runCampaignArm` now throws if the declared `seeds[0]` disagrees with the seeds
observed on the recorded `RunRecord`s. So a re-run that silently reverts to the
default seed cannot reach the scorer — it fails at the arm.

### Order of work

`http-B` (seed 11) → `http-A` (seed 11) → `http-C` (seed 777), each dump
committed before the next arm starts, then score with `--null http-C.json`, then
WASM A and B at cap 213 / 8,000 on 15-minute background timers.

---

## Step 4 — `http-C` (null arm) as originally run

`?bulkEquiv=C&cap=213&iters=8000`, feral phase 3 (364 eligible), seeds
`[777, 22, 33, 44, 55]`. Servers 3333 + 5173 up, tab foregrounded.

**What arm C is expected to show, stated before it lands.** D-2 established the
Go engine is deterministic *in its seed*. Arm C differs from arm B only in the
first seed, so C **should** differ from B — a different seed is a genuinely
different sample. That is what makes it a valid null: it measures loop-vs-loop
sampling spread, which is the yardstick (c)'s overlap and 348's slope are judged
against. If C came back identical to B as well, the determinism finding would be
wrong and the whole comparison would need re-opening.

**Two executor errors on arm C, both recorded rather than quietly retried.**

1. **Run 1 lost to an HMR reload.** While arm C was in flight I edited
   `tools/README.md` inside the fork to satisfy Gate C ruling 3. Vite was
   serving that tree, so HMR reloaded the page, dropping `__bulkEquiv` and
   resetting the tab to Phase 2 mid-run — exactly the trap
   `docs/agents/known-traps.md` documents ("an engine-file edit reloads the
   page, dropping in-page run state"). **Rule for the rest of this campaign: no
   edit anywhere under `$F` while an arm is running.** Ledger and evidence files
   are in the outer repo and are safe to write; fork files are not.

2. **Run 2 was not a campaign arm at all — the `?bulkEquiv=` dispatch was
   missing.** When re-adding the temporary block for the diagnostic I *replaced*
   the `?bulkEquiv=` handler with the `?bulkDiag=1` one instead of keeping both.
   So `?bulkEquiv=C` had no handler and the page ran an ordinary ranking, which
   rendered a normal results table. Caught by noticing the table at all: the
   harness sets `state = idle` and returns without rendering, so **a visible
   ranking table is proof the harness did not run.** Both blocks are now present
   (3 `bulkEquiv` and 3 `bulkDiag` occurrences on disk and in the served
   transform, `runCampaignArm` and `BULK_EQUIV_RUN` both reaching the browser).

   A false alarm inside that diagnosis, also worth recording: testing the served
   bundle for the literal `params.get('bulkEquiv')` returned false even when the
   block was present, because vite's transform rewrites the quoting. Substring
   tests against a transformed bundle need a token that survives transformation
   — `BULK_EQUIV_RUN` and `runCampaignArm` were the reliable ones.

Neither run produced campaign data, so nothing was lost but time. Arm C re-run
per the plan's abort rule.

**Resolved separately: the `6280 iterations` server-log line was not an M2
breach.** It came from the tail of the diagnostic run still draining, not from a
campaign arm. `http-B.json`'s `runsByPhase` shows every phase averaging exactly
8,000 iterations per sim (`iterationsDone / n` = 8000 for all four buckets), and
the scorer's precondition gate passed on both HTTP arms.

**To resume:** read `window.__bulkEquiv`; write it to `evidence/http-C.json`
with the same compaction as `http-A.json` / `http-B.json` (aggregate
`cost.runs` into `runsByPhase`; keep `cost.chunks` intact); commit; then re-score
with `--null evidence/http-C.json` to complete 345's control and 348's null
slope; then the two WASM arms on 4180 with 15-minute background timers.

### Working-tree state (resolved at Step 8)

- `upgrades_tab.tsx` — the temporary `?bulkDiag=1` block. **Comes OUT before the
  final commit** (Gate C ruling 3), same as the earlier `?bulkEquiv=` block.
- `tools/equiv-campaign.mts` — `runDiagnostic` appended. **Gate C ruling 3:
  KEEP and commit.** It is the discriminator that separated finding from defect.
  Recorded as a **Gate-C-approved addition to the Paths manifest**, which was
  written before this function existed; one README sentence added alongside.

---

## Step 4 (superseded note) — `http-A` was running at the previous hand-back

`?bulkEquiv=A&cap=213&iters=8000`, feral phase 3, tab foregrounded, servers
3333 + 5173 up. The Go log shows continuous `Running 8000 iterations on 20
concurrent sims` / `All 20 sims finished successfully`, so the arm is healthy,
just long: 213 candidates partition into **9 chunks** (8 × 25 + 13), and each
chunk pays its own baseline probe on top of its 25 candidates, so arm A does
more total sim work than arm B's 239 screening sims did.

**To resume:** read `window.__bulkEquiv` on the foregrounded tab; when `done`,
write it to `evidence/http-A.json` (same compaction as `http-B.json`: aggregate
`cost.runs` into `runsByPhase`, keep `cost.chunks` in full — the chunk records
are what the 346 precondition gate reads), commit it, then run `http-C`
(`?bulkEquiv=C&cap=213&iters=8000`, seeds `[777,22,33,44,55]`), commit, then the
two WASM arms on 4180 with 15-minute background timers.

**Remaining state that must hold:** cap 213 on every arm; the temporary
dispatch is currently **present** in `upgrades_tab.tsx` (44 lines, marked
`TEMPORARY`) and must be removed before the final commit; the fork's committed
tree is otherwise clean at `75769a7f3`; the WASM default is untouched.


## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 0 / 2 | N9: "the Step 2 differential at 30 candidates exercises the tournament path (30 > `BULK_SIM_MIN_COMBINATIONS` = 20)" | The legacy gate runs per **chunk** inside `runConcurrentBulkSim` (`wasm/bulk_sim/index.ts:107`); the driver partitions at 25 first, so 30 candidates yield chunks of 25 and 5 — both LEGACY at every iteration count. No campaign chunk ever runs a multi-stage tournament. | flag | Corrects a claim the register marks load-bearing (C14, already once-corrected by N9). Differential **parameters stand** — at n ≤ 25 the legacy flag and stage gating select the same High-only path, so 30 candidates still exercise the campaign's real stage path plus the two-chunk baseline carry. Only the justification and the 346 wording change. |
| 0 / 2 | C12: the WASM harness "re-implements `BulkWasmSimRunner.runBulkScreen`" (~30 lines of exported calls) | Track A moved that loop into the shared, exported `runBulkScreenChunks` (`adapters/bulk_screen_driver.ts`); `runBulkScreen` is now a 10-line delegation whose transport arrives as an injected `dispatch` callback. | flag | Re-implementing it now would *reduce* fidelity — the harness would drift from the very code path being measured, and would bypass Track A's `assertSingleStageChunk` guard and cancel wiring. The plan's `mode=real` vs `mode=harness` differential also stops being a real check, since the two modes would share the driver. Proposed resolution (orchestrator's call): call the real driver and instrument the injected `dispatch`, capturing each chunk's raw `stageMetrics`, timings and probe events — zero re-implementation, guard still fires, strictly higher fidelity than the planned design. |
| 0 / 3 | Step 3 budgets the WASM arms from the frozen N and applies the precedence rule | At N ≈ 407 (feral p3), A+B+C ≈ 6.9 h > 6 h budget; A+B ≈ 4.7 h | adapt | The plan's own precedence rule names this exact branch: drop WASM arm C first, never cap below the depth gate. Rule applied as written, at its first branch; no cap set, so depth is preserved. Superseded by D5 once the rate was measured rather than assumed. |
| 2 | Screening-only work is separable by tagging each `run` with the engine's progress stage | The `Progress` vocabulary has no screening/tail distinction — `simming` covers both the screening sims and the replication/set-bonus tail, which is exactly the work the 346 verdict must exclude | adapt | Intent unambiguous, fix local to the harness: latch a `tail` flag on the `stage: "ranking"` event, which `rank.ts` emits between `screenCandidates` (1213) and `replicateTopItems` (1336)/set-bonus (1297). Confirmed by re-measurement — 8 of 14 sims moved to the tail bucket at `cap=5`. No engine edit. |
| 1 | Fixtures encode the engine cutoff | Fixtures used ret's `absDps 3.4` with `deltaPct` as a 0–1 fraction; feral's cutoff is **3.6** and `deltaPct` is on a 0–100 scale (`rank.ts:1137` vs `cutoff.ts:137`) | adapt | Local to the fixtures, and the campaign's spec is feral. Corrected; all five scorer cases re-validated against the right units. The differential dump independently confirms `{absDps: 3.6, pct: 0.15}`. |
| 3 (Gate C pilot) | N11: pilots run at 1,000 iterations because "depth depends on gear, not precision" | The N10 depth gate (`deltaDps ≥ 2·se`) is **precision-relative**, so the pilot's iteration count changes its answer: 17 rows clear at 1,000, but 24 clear on the √8 projection to the campaign's 8,000. N11's reasoning holds for a bare `deltaDps > 0` count (30 rows, stable) and fails for the gate. | **stop** | The pre-registered rule says < 20 → STOP, and 17 was measured, so the verdict stands and the executor does not reinterpret it. But the pilot cannot separate "the cap removed real upgrades" from "1,000 iterations is too noisy to resolve the ones left" — all 7 borderline rows are `independent`-se, whose error bars genuinely shrink with iterations. Recommended resolution: re-run the pilot at 8,000 (~15 min HTTP) and settle it by measurement. |
| 5 | C18: WASM ≈ 19.6 s/candidate (loop) and 22.2 s (bulk) at 8,000 — the register marks this "hypothesis, untested (arithmetic on C17)" | **Measured 43.5 s/candidate** — four sims at 43.34 / 43.40 / 43.59 / 43.61 s, pool 4, `isWasm true`. HTTP corroborates independently: 32.3 s per 25-chunk against C11's recorded 9.35 s. This machine is materially slower than the one C17/C18 derive from. | **stop** | At N ≈ 407 the WASM arms cost ~10.5 h against a 6 h budget, and both precedence-rule branches are exhausted. Dropping arm C was already applied and is not enough. Capping to ~232 cannot be justified: `rank.ts:1178` keeps the first N of the **EP order** (`orderCandidatesByEp`, 599), not the measured-delta order, and the EP order is not reconstructable from the committed artifact — so depth retention at that cap is unverified, and the rule forbids capping below the depth gate. A pre-registered rule landing on re-scope is a stop-and-report trigger, not an executor decision. |

**Refinement to standing rule 2 (found immediately on first use).** "A visible
results table proves the harness did not run" must test for a **ranking** table,
not any `<table>`: the character stats sidebar (Health/Mana/Strength) is a table
and is always present, so `document.querySelector('table tbody tr')` returns
truthy on every page. The reliable checks are the status text — "Starting…
(0 rows landed)" while a harness arm runs — and row content, since a ranking
table's rows carry item names and DPS deltas rather than stat labels.

**Standing rule 3 (new, diagnosed on the second occurrence).** Never drive a
campaign arm in the tab that `preview_start` created. Vite's ready banner
advertises `http://localhost:5173/tbc/`, and the preview harness navigates the
tab it owns to that URL when the server signals ready — which silently replaces
the sim page mid-arm. This killed the first arm C and the first arm B re-run;
`navType: "navigate"` to `/tbc/` with an empty referrer and ~20 s since load is
the signature. Both survivors so far (arm A, arm B at 8,000, the diagnostic) ran
in a tab created separately with `tabs_create`. **Open a fresh tab with
`tabs_create` and run every arm there.**

### Re-run status at hand-back

`http-B` (seed 11) is running in `tab-4` — a tab created with `tabs_create`, per
standing rule 3 — at cap 213 / 8,000 / feral phase 3, foregrounded. The Go
server shows continuous `Running 8000 iterations on 20 concurrent sims`, so the
arm is healthy; it is slower in wall-clock terms than the pre-fix arm B (~2 min)
because a backgrounded tab has its timers throttled, which also makes in-page
`performance.now()` useless as a progress clock. The server log is the reliable
signal.

**Two arms were lost before this one started**, both to standing rule 3's cause
(the preview harness re-navigating its own tab to `/tbc/`); neither produced
data, so nothing is lost but time.

**To resume:** read `window.__bulkEquiv` on `tab-4`. The dump now carries the
seed guard, so if it returns at all, `seeds[0]` provably matched the seeds the
sims actually ran at. Then:

1. Check prediction (i): does re-run B reproduce the withdrawn B's deltas to the
   digit? (33716 → 99.410117, 32014 → 53.817706, 30106 → 38.072509.) Yes → the
   engine is deterministic at fixed seed, D-2 stands as an engine fact. No → D-2
   is wrong even as an engine fact.
2. Write `evidence/http-B.json` (overwriting the seed-11 file, which is the same
   configuration re-measured), commit.
3. Run `http-A` (seed 11), commit; then `http-C` (seed 777), commit.
4. Check prediction (ii): C **must** differ from B. If C still equals B, STOP —
   the seed is still not reaching the sims.
5. Score with `--null http-C.json`; then WASM A and B at cap 213 / 8,000 on
   15-minute background timers.

---

## Re-run results

### Prediction (i): CONFIRMED — the engine is deterministic at a fixed seed

`http-B` re-run (seed 11, cap 213, 8,000, phase 3), with the seed guard passing
(`declaredSeeds[0] = 11`, screening sims observed at `11`, every sim at exactly
8,000 iterations).

Re-run B reproduced the withdrawn arm B **to the digit**, across a fresh 239-sim
run:

| item | withdrawn B | re-run B |
| --- | --- | --- |
| 33716 | 99.41011710030534 | **99.41011710030534** |
| 32014 | 53.817706155452925 | **53.817706155452925** |
| 30106 | 38.072508714707965 | **38.072508714707965** |

202 rows both times; depth gate 31 both times.

**So D-2 stands as a fact about the ENGINE** — now established at 213
candidates rather than one replayed request. It remains, as the withdrawal
said, **no evidence about the two routes**: that question needs C.

`evidence/http-B.json` keeps its rows (confirmed correct by this reproduction)
with its metadata updated to the re-run's cost figures and the seed-fix
provenance.

### Machine-noise datum for 346's V discussion

Three same-seed, same-work runs of arm B's screening phase, on identical inputs
producing bit-identical outputs:

| run | screening wall clock |
| --- | --- |
| original arm B | 394.3 s |
| re-run arm B | 383.4 s |
| mislabelled arm C (accidental same-route same-seed repeat) | 371.0 s |

**Spread: 5.9% max-to-min on bit-identical work.** This is pure machine noise —
the computation was identical, so every bit of that variation is measurement
environment. It is a useful floor for interpreting `R_wall_s`: a wall-clock
ratio inside ~6% is not distinguishable from noise on this machine.

### `http-A` re-run (seed 11) — all structural facts reproduce

Guard passed (`declaredSeeds[0] = 11`, screening observed at `11`). Every 346
precondition holds again:

| check | result |
| --- | --- |
| chunks | 10 (9x25 + 24) |
| every chunk `stages` | 1 |
| every chunk achieved | **8000 exactly** |
| probes | 1 per chunk |
| baseline cv | 0.033267 (critical 0.0378) |

**D-1 reconfirmed at full scale:** 4 screening `run()` calls against arm B's
239 for the same 213 candidates. The screened map is consumed, not missed.

Costs (re-run vs the withdrawn run, same seed, deterministic engine):

| | re-run | withdrawn run |
| --- | --- | --- |
| screening | 113.8 s | 115.1 s |
| end to end | 146.3 s | 146.5 s |
| first row | 116.6 s | 117.1 s |

Sub-1.2% wall-clock differences on identical computation — consistent with the
5.9% noise envelope measured on arm B.

`http-A.json`'s `WITHDRAWN_` marker is **lifted**: arm B independently
reproduced its own withdrawn values to the digit, so these rows are confirmed
rather than assumed. The file now states explicitly that A agreeing with B is
**not** evidence about the routes — both ran at seed 11 on a deterministic
engine — and that arm C judges the route question.

### Prediction (ii): CONFIRMED — arm C is a genuine null

`http-C` (seed 777), guard passed (`declaredSeeds[0] = 777`, screening observed
at **777** — the fix reaches the sims). **188 of 202 rows differ from arm B**,
by amounts consistent with sampling noise:

| item | B (seed 11) | C (seed 777) |
| --- | --- | --- |
| 33716 | 99.410117 | 99.531885 |
| 32014 | 53.817706 | 53.943913 |
| 30106 | 38.072509 | 38.068412 |

The ranked order moves too: 29301 is rank 9 in B and rank 8 in C, swapping with
32366. That is precisely the tail jitter the control exists to quantify.

Depth gate on C: 29 (vs B's 31) — sampling variation, both well clear of 20.

## HTTP CAMPAIGN COMPLETE — scored with a valid null

`node evidence/campaign-scorer.mjs http-A.json http-B.json --null http-C.json`

**346 preconditions: ALL PASS.** Arm A: 10 chunks, every one `stages 1`,
`n ≤ 25`, achieving exactly `8000`; baseline cv 0.0333 vs critical 0.0378.

### Ticket 345 — (c) and (c') both PASS, and the control makes them meaningful

| metric | A vs B | control C vs B |
| --- | --- | --- |
| overlap over `k = 24` | **100.00%** | **100.00%** |
| boundary flips | **0** | **0** |
| (c') confident-side agreement | **0 violations / 202 rows = 100%** | — |

Depth gate met (31 ≥ 20). **Decision rule: (c) ≥ 90% and (c') = 100% → close
345, confirmed.**

The control is what makes this readable. A same-route change of seed moves 188
of 202 deltas, yet moves **no** ranked-set membership and **no** boundary flip —
so the ranked set at this configuration is robust to sampling noise, and the
bulk route reproducing it exactly is a real equivalence result rather than a
metric too coarse to notice a difference.

### Ticket 348 — NOT REPRODUCED

| | slope | SE | t vs 1 |
| --- | --- | --- | --- |
| A on B (route) | **1.00000** | 0.00000 | — |
| C on B (null) | 0.99955 | 0.00031 | −1.45 |

Both reproduction conditions fail: `|slope_AB − 1| = 0` is not `> 3·SE_AB`, and
not `> |slope_CB − 1| + 3·SE_CB = 0.00137`. **The prior 1.6% multiplicative
slope does not survive at matched iterations** — it was the accuracy mismatch
(5,000 flat vs 7,091 adaptive), exactly as the plan hypothesised. Decision rule:
close 348 into 346 as an accuracy-mismatch artifact.

The null slope being 0.99955 ± 0.00031 rather than exactly 1.0 is the useful
part: it shows the OLS machinery *can* resolve a sub-0.1% deviation at this
sample size, so the A-vs-B slope of exactly 1.0 is a real null, not an
insensitive instrument.

### Ticket 346 — HTTP numbers (WASM still pending)

| metric | value |
| --- | --- |
| `R_wall_s` (screening) | **0.297** |
| `R_wall` (end to end) | 1.185 |
| `R_iter_s` | 1.084 — standing wash finding **holds** |
| V (HTTP loop variance, B vs C) | **0.008** |
| first row | A 116.6 s vs B 2.7 s |

V = 0.008 is a far tighter loop-variance figure than the 5.9% wall-clock spread
measured across same-seed repeats, because V compares *screening totals* of two
239-sim arms rather than single runs — the per-sim noise averages out.

Verdict per the rule: **BULK FASTER** on screening-only. The owner paragraph
fires again and is dispositioned exactly as before (NO ACTION: the HTTP
transport already defaults to bulk; the default 346 asks about is WASM).

---

## Step 5 — WASM arms

`dist` rebuilt with `npx vite build` from the fork root after the seed fix
(exit 0); the built bundle carries both `BULK_EQUIV_RUN` (5 chunks) and the seed
guard string, and `dist/tbc/lib.wasm` is present. 4180 served by
`node node_modules/http-server/bin/http-server dist -p 4180 -c-1` under the
Node 22 PATH pin, started by the executor.

**Standing rule 4 (new).** The 4180 origin has its own `localStorage`, so the
page opens at **Phase 2 / 227 eligible** even when 5173 was left at Phase 3.
Worse, on the built bundle the `.nav-link` click does not switch panes, so every
`select` reports `offsetParent: false` and a visibility-filtered selector finds
nothing. **Set the phase by selecting on the option text without a visibility
filter** — `[...document.querySelectorAll('select')].find(s => [...s.options].some(o => /Phase 3 \(2\.2/.test(o.textContent)))` — then confirm
**364 eligible items** before starting. One WASM arm B was started at the wrong
phase (227 items) and abandoned before it could produce a dump; no data lost.

`http-B` (WASM, seed 11, cap 213, 8,000, phase 3 confirmed at 364 eligible)
started 20:19 UTC. Expected ~2.6 h at the measured 43.5 s/candidate. Polled at
15-minute intervals per the mandate.

**To resume:** read `window.__bulkEquiv` on `tab-4`. Assert
`transport.isWasm === true` and `hasBulkCapability === false` for arm B, then
write `evidence/wasm-B.json` (same compaction as the HTTP dumps), commit, then
run WASM arm A (`?bulkEquiv=A`, `hasBulkCapability` must be `true`), commit, and
score with `--null http-C.json` labelled "HTTP loop variance" per the precedence
rule (WASM arm C was dropped at Step 0).

**Why WASM is the substantive test.** The HTTP result cannot distinguish the two
routes because both sample identically there. On WASM the loop runs one worker
per candidate while the tournament splits one request's iterations across the
pool — a genuinely different sampling arrangement, and the only place the routes
can diverge.

---

## Step 7 (partial) — tickets 345 and 348 closed

Both closed with their measured answers written in; `pnpm issues:open` confirms
neither appears in the open list, and **346 correctly remains open** pending the
WASM arms.

**345 — closed, confirmed.** The ticket named two structural problems and both
are now fixed rather than argued around: the metric could not express 90% at
k = 9 (now k = 24, so one flip moves it 4.2 points not 11), and there was no
control (now arm C, same route at seed 777). Overlap 100% on the route
comparison *and* on the control, (c') 100%, 0 boundary flips either way. The
control is what makes the pass readable: a seed change moved **188 of 202**
deltas while moving no ranked-set membership at all. All four acceptance boxes
ticked; the original "accepted with reason" disposition is **confirmed**.

**348 — closed into 346 as an accuracy-mismatch artifact.** This is the outcome
the ticket's own step 1 specified. Route slope **1.00000**; null slope
**0.99955 ± 0.00031** (t = −1.45). Both pre-registered reproduction conditions
fail. The null is what rules out an insensitive instrument: it resolves a
**sub-0.1%** departure at the same n, so it would comfortably have seen the
original 1.6%. Cause is the one the ticket listed first — the adaptive iteration
count (5,000 flat vs 7,091 adaptive) — removed by M2's matched pin. Acceptance
box 2 is recorded as not-applicable with reasoning (it was conditional on the
slope reproducing), so no doc-comment edit and **no follow-up ticket; `NEXT`
untouched**. Box 3's cross-route consumer identified as `computeSynergy`
(`engine/set-value.ts`), reached via `individualDeltasByItemId` (written
`rank.ts:1127`, consumed `:1583`/`:1687`), already safe by construction per
`rank.ts:1110`.

Both closures are explicitly **scoped to HTTP**, where the engine is
deterministic and the two routes sample identically. Each says in its own text
that WASM is the substantive test and stays with 346.

### Pre-registered caveat on the WASM 346 verdict (recorded before the arms land)

The WASM arms will be scored with `--null http-C.json` per the precedence rule
(WASM arm C was dropped at Step 0 to fit the budget). The scorer reads the label
off the null arm's own `transport.isWasm`, so it will correctly print
**"HTTP loop variance"** rather than claiming a WASM measurement — verified by
reading `campaign-scorer.mjs:330` before the run, not after.

**What that substitution costs, stated now so it cannot look like post-hoc
reasoning.** `V` enters the verdict as the threshold width: faster if
`R_wall_s < min(0.9, 1 − V)`, slower if `R_wall_s > max(1.1, 1 + V)`. The HTTP
V is **0.008**, which is unusually tight — the Go server threads one request
across NumCPU, so two 239-sim arms average out almost all per-sim noise. WASM's
four-worker pool has no such smoothing and its true V is plausibly larger.

So substituting HTTP's V makes the thresholds **tighter than a real WASM V
would**, which biases toward declaring a difference rather than a wash. Two
consequences, both binding:

1. A WASM verdict of **BULK FASTER** or **BULK SLOWER** that depends on the
   `1 ± V` bound rather than clearing the fixed `0.9 / 1.1` bound must be
   reported as **"outside the fixed bound"** only if it also clears 0.9 or 1.1.
   Since `min(0.9, 1 − 0.008) = 0.9` and `max(1.1, 1.008) = 1.1`, the fixed
   bounds are what actually bind at this V — so in practice the substitution
   changes nothing unless the true WASM V exceeded 0.1, which would have
   triggered the "indistinguishable at one run per arm" branch anyway.
2. The C31 caveat still applies regardless: one tournament run, tournament
   run-to-run variance unmeasured.

Point 1 is the reassuring half — at V = 0.008 the pre-registered thresholds
collapse to the fixed 0.9/1.1, so the borrowed null cannot flip a verdict on its
own. Recorded because the reasoning had to happen before the numbers, not after.

### Pre-registered cross-transport accuracy check (recorded before the WASM arms land)

The plan gates the depth requirement on arm B, and both transports run arm B at
the same 8,000 iterations on the same 213 candidates. That makes the two arm-Bs
directly comparable, which is a free check nobody asked for but which the data
supports — so the expectation is written down first.

HTTP arm B reference:

| quantity | value |
| --- | --- |
| rows clearing `deltaDps ≥ 2·se` | **31** (threshold 20) |
| mean `se`, independent rows | **0.8268** (n = 194) |
| ranked rows at the engine cutoff | 24 |

**Expectation:** WASM arm B should land close to these. `se` is a property of
how many iterations were simmed, not of which engine simmed them, so two
transports at 8,000 iterations should agree on precision.

**If they diverge materially, that is itself a finding**, and it must be
reported rather than smoothed over:

- **WASM `se` noticeably larger** → the WASM engine extracts less precision per
  iteration, which would mean "8,000 iterations" does not denote the same
  accuracy on both transports, and M2's matching is weaker than assumed.
- **WASM gate count below 20** → the depth gate fails on the transport that
  matters most, and 345's WASM leg cannot be judged on (c) — it would fall back
  to (c') plus the control, exactly as the plan's pre-registered fallback
  provides for.

Either outcome is recorded with its numbers; neither is grounds for adjusting a
threshold after the fact.

### Budget tracking mid-arm (WASM arm B)

At 63.5 min elapsed, arm B is at **41% of its predicted 154-min screening time**
(213 candidates x 43.48 s/candidate, the rate measured in the Step 5 probe). The
prediction is holding, which also means the cap-213 arithmetic that Gate C
approved is behaving as designed.

Projected totals on the same basis:

| arm | predicted screening |
| --- | --- |
| B (loop) | 154 min |
| A (bulk, C18 ratio 1.133) | 175 min |
| **A + B** | **5.49 h against the 5.5 h budget** |

**The margin is ~0.6 minutes.** That is not a comfortable fit, and it is
recorded now rather than discovered at the end. If arm A overruns its prediction
by more than a couple of percent the campaign crosses the budget Gate C set.
Nothing is adjusted unilaterally: if arm A is still running materially past its
175-min prediction, the executor stops and reports rather than letting an
unbounded arm run, since "how much compute is this worth" is the owner question
that produced the cap in the first place.

**Gate C ruling on the above (binding) — the 175-min stop rule is WITHDRAWN.**

My "stop arm A if it passes its prediction" rule was wrong and is retracted. The
5.5 h figure was the orchestrator's ceiling for **choosing the cap**, not a
runtime kill switch. Once an arm is running, abandoning it at its predicted
duration wastes the compute already spent and buys nothing — the budget decision
was already made when the cap was set at 213.

**The plan's own per-arm rule governs instead** (Step 3): abort only at

- **2x the arm's predicted duration**, or
- **20 minutes with no console sim line** (a wedge),

then re-run once, then report lost. On those numbers arm A's abort threshold is
**~350 min**, not 175, and arm B's is ~308 min.

Both WASM arms run to completion under that rule. The budget projection above
stays as a record of what the arms were expected to cost; it is not a trigger.

### WASM dump builder verified before the arms land

`build-wasm.mjs` was dry-run against HTTP arm A's real shape (relabelled as
WASM) and produced a valid 202-row, 10-chunk dump. More importantly, each of its
five assertions was checked by feeding it deliberately broken input — a guard
that never fires is worthless:

| injected fault | message produced |
| --- | --- |
| `isWasm: false` | `isWasm must be true for a WASM arm` |
| arm B carrying bulk capability | `arm B hasBulkCapability=true` |
| arm A screened at seed 777 | `arm A screened at 777 not 11` |
| a chunk achieving 9,500 | `chunk achieved 9500 != 8000 — M1 territory` |
| a chunk reporting 2 stages | `chunk stages=2` |

So an M1 trigger, a mislabelled transport, a wrong seed or a multi-stage chunk
now fails **at the builder**, before anything reaches the scorer or the ledger.
Verified while arm B ran, using outer-repo and scratchpad files only (standing
rule 1); dry-run artifacts deleted afterwards.

### Step 6's scorer invocation dry-run (before the WASM arms land)

Ran the exact Step 6 command shape — two WASM-labelled arms plus
`--null http-C.json` — using stand-ins built from the HTTP arms, to exercise the
code path rather than to produce a result. Two pre-registered predictions are
now **verified rather than argued**:

- **`V = 0.008 (HTTP loop variance — labelled per the precedence rule)`.** The
  scorer reads `isWasm` off the *null* arm, which stays HTTP, so it correctly
  refuses to present a borrowed null as a WASM measurement.
- **`thresholds: faster < 0.900, slower > 1.100`.** Exactly what the
  borrowed-null caveat predicted: at V = 0.008 the `1 ± V` bounds are wider than
  the fixed 0.9/1.1, so the fixed bounds bind and the borrowed null **cannot
  flip a verdict on its own**.

The whole Step 6 path — precondition gate, depth gate, (c), control, (c′), 346
ratios and verdict, owner surfacing, 348 OLS with the null — runs clean. When the
real WASM arms land, only the numbers change, not the machinery.

Stand-ins deleted; scratchpad and outer-repo files only (standing rule 1).

---

## WASM arm B — complete. Every gate passes.

| check | value |
| --- | --- |
| `transport.isWasm` | **true** |
| `hasBulkCapability` | **false** (correct for the loop arm) |
| seed guard | declared `[11,...]`, screening observed at **11** |
| every sim `iterationsDone` | **8000** |
| depth gate `deltaDps ≥ 2·se` | **36** (threshold 20) |
| rows | 202 |
| wall clock | **5,571 s = 93 min** |
| first row | 113.1 s |

### Cross-transport accuracy check (pre-registered `7bbbe44`) — MATCHES

| quantity | HTTP arm B | WASM arm B | ratio |
| --- | --- | --- | --- |
| mean `se`, independent rows | 0.8268 | **0.8383** | **1.014** |
| depth-gate rows | 31 | 36 | — |

The two transports agree on precision to **1.4%** at the same iteration count.
Neither pre-registered divergence branch fires: `se` does track iterations
rather than engine, so **"8,000 iterations" denotes the same accuracy on both
transports and M2's matching is sound**. The depth gate passes comfortably on
the transport that matters.

### A correction to my own budget arithmetic

Arm B's `screeningSeconds` is **13,656 s**, but its **wall clock is 5,571 s
(93 min)**. Those differ because `screeningSeconds` sums *per-sim* durations
across a **4-worker pool** that runs them concurrently — it is worker-seconds,
not elapsed time. Wall clock is the real cost.

So arm B finished **under** its 154-min prediction, not over it. My earlier
"1.47x overrun" reading was wrong: it compared worker-seconds against a
wall-clock prediction. Arm A's wall estimate on the same basis is
**~105 min**, and the campaign is comfortably inside budget. (The Gate C ruling
withdrawing the mid-arm stop rule stands regardless — this just removes the
worry that prompted it.)

### First substantive finding: the transports rank differently

WASM arm B has **30 ranked rows** against HTTP arm B's **24**, and the order
differs materially — e.g. `33879 Vindicator's Dragonhide Belt` is **rank 7** on
WASM and **rank 14** on HTTP; `31044 Thunderheart Leggings` is 10 vs 13.

This is expected and is *not* a defect: the two engines are independent
implementations sampling independently, so at 8,000 iterations they land on
different draws. It is precisely why the plan made WASM the primary campaign —
and it means the WASM A-vs-B comparison is a real test rather than the
near-tautology the HTTP comparison turned out to be.
