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


## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 0 / 2 | N9: "the Step 2 differential at 30 candidates exercises the tournament path (30 > `BULK_SIM_MIN_COMBINATIONS` = 20)" | The legacy gate runs per **chunk** inside `runConcurrentBulkSim` (`wasm/bulk_sim/index.ts:107`); the driver partitions at 25 first, so 30 candidates yield chunks of 25 and 5 — both LEGACY at every iteration count. No campaign chunk ever runs a multi-stage tournament. | flag | Corrects a claim the register marks load-bearing (C14, already once-corrected by N9). Differential **parameters stand** — at n ≤ 25 the legacy flag and stage gating select the same High-only path, so 30 candidates still exercise the campaign's real stage path plus the two-chunk baseline carry. Only the justification and the 346 wording change. |
| 0 / 2 | C12: the WASM harness "re-implements `BulkWasmSimRunner.runBulkScreen`" (~30 lines of exported calls) | Track A moved that loop into the shared, exported `runBulkScreenChunks` (`adapters/bulk_screen_driver.ts`); `runBulkScreen` is now a 10-line delegation whose transport arrives as an injected `dispatch` callback. | flag | Re-implementing it now would *reduce* fidelity — the harness would drift from the very code path being measured, and would bypass Track A's `assertSingleStageChunk` guard and cancel wiring. The plan's `mode=real` vs `mode=harness` differential also stops being a real check, since the two modes would share the driver. Proposed resolution (orchestrator's call): call the real driver and instrument the injected `dispatch`, capturing each chunk's raw `stageMetrics`, timings and probe events — zero re-implementation, guard still fires, strictly higher fidelity than the planned design. |
| 0 / 3 | Step 3 budgets the WASM arms from the frozen N and applies the precedence rule | At N ≈ 407 (feral p3), A+B+C ≈ 6.9 h > 6 h budget; A+B ≈ 4.7 h | adapt | The plan's own precedence rule names this exact branch: drop WASM arm C first, never cap below the depth gate. Rule applied as written, at its first branch; no cap set, so depth is preserved. Superseded by D5 once the rate was measured rather than assumed. |
| 2 | Screening-only work is separable by tagging each `run` with the engine's progress stage | The `Progress` vocabulary has no screening/tail distinction — `simming` covers both the screening sims and the replication/set-bonus tail, which is exactly the work the 346 verdict must exclude | adapt | Intent unambiguous, fix local to the harness: latch a `tail` flag on the `stage: "ranking"` event, which `rank.ts` emits between `screenCandidates` (1213) and `replicateTopItems` (1336)/set-bonus (1297). Confirmed by re-measurement — 8 of 14 sims moved to the tail bucket at `cap=5`. No engine edit. |
| 1 | Fixtures encode the engine cutoff | Fixtures used ret's `absDps 3.4` with `deltaPct` as a 0–1 fraction; feral's cutoff is **3.6** and `deltaPct` is on a 0–100 scale (`rank.ts:1137` vs `cutoff.ts:137`) | adapt | Local to the fixtures, and the campaign's spec is feral. Corrected; all five scorer cases re-validated against the right units. The differential dump independently confirms `{absDps: 3.6, pct: 0.15}`. |
| 5 | C18: WASM ≈ 19.6 s/candidate (loop) and 22.2 s (bulk) at 8,000 — the register marks this "hypothesis, untested (arithmetic on C17)" | **Measured 43.5 s/candidate** — four sims at 43.34 / 43.40 / 43.59 / 43.61 s, pool 4, `isWasm true`. HTTP corroborates independently: 32.3 s per 25-chunk against C11's recorded 9.35 s. This machine is materially slower than the one C17/C18 derive from. | **stop** | At N ≈ 407 the WASM arms cost ~10.5 h against a 6 h budget, and both precedence-rule branches are exhausted. Dropping arm C was already applied and is not enough. Capping to ~232 cannot be justified: `rank.ts:1178` keeps the first N of the **EP order** (`orderCandidatesByEp`, 599), not the measured-delta order, and the EP order is not reconstructable from the committed artifact — so depth retention at that cap is unverified, and the rule forbids capping below the depth gate. A pre-registered rule landing on re-scope is a stop-and-report trigger, not an executor decision. |
