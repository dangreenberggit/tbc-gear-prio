# Candidate pool — execution report for the plan author

Plan: `docs/plans/wowsims-tab/candidate-pool.md` (rev 2).
Branch: `feat/candidate-pool`, tip `b52fd51` (+ this report).
Fork: `vendor/tbc-new-fork` at `6a192eb2a` on `feat/upgrades-tab`, `pushed: false`.
Review: [`docs/reviews/feat-candidate-pool.md`](../../../../docs/reviews/feat-candidate-pool.md).

> **Superseded in part by §8.** This headline was written before the plan
> author pointed out that the gate had been measured on the CLI, the wrong
> runtime for the question it decides. Re-measuring on WASM (ticket 203)
> **resumed M2**, and it now ships in both engine copies. §1–7 are left as
> written because they record what was true and known at the time; read §8
> for the current state.

**Headline (superseded): the plan's central bet lost, and losing it was the
most valuable thing this branch did.** M2 (racing) was cancelled by its own
gate, on measurement, before any of it was built. M1 shipped in both engine
copies.

## 1. What was executed per slice

| Slice | Content                              | Result                                     |
| ----- | ------------------------------------ | ------------------------------------------ |
| A     | M0 doc fixes                         | merged `80508a9`                           |
| B     | E-W5 §3.1 + §3.2                     | merged `0076a15`                           |
| C     | M1 in `packages/core`                | merged `162097e`                           |
| B′    | M1.5 EP-ordering recall              | merged `667ba97`                           |
| D     | M1 port to fork + adapter + controls | fork `655b3c36f..6071b858e`                |
| E     | M2 in core                           | **not run** — cancelled by §3.2's no-go    |
| F     | M2 port + 7.10 parity                | M2 half cancelled; parity green at the tip |
| G     | Ticket 156 recipe rewrite            | committed `6a2ed67`                        |

`pnpm verify` exits **0** on the tip. That is the real exit code, captured
with `$?` — an earlier backgrounded run reported `[exited with code 0]` while
its own log ended in `ELIFECYCLE … exit code 1`, so every verify claim here
comes from a directly captured status.

## 2. E-W5 and M1.5 numbers, and the go/no-go

**§3.1** (`experiments/e-w5-overhead.{json,md}`, `npx tsx` not needed here —
`node scripts/ew5_overhead.mjs`): `t_fixed` = **373.2 ms**, `t_iter` =
**0.0637 ms/iteration**, peak RSS **183.8 MB** per sim process, five-repeat
medians with a 1.03×–1.08× spread.

**F8 resolved to a proven zero.** No presim round runs for the ret fixture:
`runPresims` loops only while `doOne || remainingAgents > 0`, and the fork's
only `Presimmer` returns `nil` unless `CadenceSeconds != 0`. The fixture's
`healingModel` is `{}`. So `t_fixed` is pure setup, not an unseparated mix —
the plan asked for two components and the honest answer is that one is zero.

**§3.2** (`experiments/e-w5-rank.{json,md}`, `npx tsx scripts/ew5_rank.mjs`):
full eligible pool (246 rows per spec) through the real `rankUpgrades` seam
against the live binary, both fixtures, every sweep point plus 5,000.

| point | ret rho | ret K\* | ret cost ratio | feral rho | feral K\* | feral cost ratio |
| ----- | ------- | ------- | -------------- | --------- | --------- | ---------------- |
| 100   | 0.9721  | 18      | 0.609          | 0.9699    | 25        | 0.462            |
| 300   | 0.9882  | 15      | 0.650          | 0.9905    | 16        | 0.483            |
| 1000  | 0.9946  | 15      | 0.695          | 0.9964    | 18        | 0.565            |
| 3000  | 0.9995  | 13      | 0.847          | 0.9992    | 16        | 0.768            |

**Go/no-go: NO-GO.** The K\* half passes easily (max 25 against a threshold of
60). The cost half fails at every point on both fixtures — the cheapest is
0.609 against a `< 0.25` requirement.

**The no-go is stronger than the gate asked for.** Cross-checked against
§3.1's own fit: predicted ratios are 0.549/0.567/0.632/0.816/1.000, and the
floor as iterations → 0 is `t_fixed/cost(5000)` = **0.540**. Even a
zero-iteration screen costs 54% of a full sim. **No `screenIterations` value
could ever pass that gate on this path.** The failure is structural, not a
badly chosen sweep point. The perf review axis recomputed this independently
and reproduced `t_fixed` = 373.161 ms, `t_iter` = 0.063693 and the 0.5395
floor.

Defaults chosen: none. `screenIterations` and `promoteTopK` do not exist,
because M2 does not.

**§5a / M1.5** (`experiments/m1-5-ep-recall.{json,md}`): worst above-cutoff
ordering rank **114/246** (ret) and **96/246** (feral). Per §5.1.1 a sub-"all"
cap default is safe only if that number is small on every fixture. It is not,
so **the cap defaults to all eligible** — which `rank.ts` already did
(`input.candidateCap ?? ordered.length`), so no change was needed. Feral's own
cutoff (3.6) gives an identical worst rank, so the cutoff choice does not
drive the conclusion.

EP orders well (rho ≥ 0.97) and predicts cap membership badly. The mechanism
is F9's blind spots: EP scores raw stats pre-gem and cannot see set bonuses,
procs, on-use effects or weapon speed.

## 3. Test table §7

| #    | Test                        | Status                                                       |
| ---- | --------------------------- | ------------------------------------------------------------ |
| 7.0  | Racing does less work       | **n/a** — M2 cancelled                                       |
| 7.1  | Cap incl. owned exemption   | pass                                                         |
| 7.2  | Recall on held-out fixture  | **n/a** — M2 cancelled; M1.5 answers the related question    |
| 7.3  | Determinism 1 vs 4, same error | pass — **and strengthened**: the original could not detect R3 |
| 7.4a | Hash incl. `undefined` ≡ n  | pass                                                         |
| 7.5  | Promotion rule              | **n/a** — M2 cancelled                                       |
| 7.6  | Ordering total order        | pass                                                         |
| 7.7  | applyView third state       | **n/a** for screened rows; partial-run handling covered instead |
| 7.8  | Stop honest and resumable   | pass — **plus two boundary tests added**, both red first      |
| 7.9  | `promisePool`               | pass — 6 tests after the review fixes                        |
| 7.10 | Port parity at tip          | pass (E-W3)                                                  |
| 7.11 | Row-landed progress         | pass                                                         |
| 7.12 | E-W5 / M1.5 harnesses       | delivered                                                    |

`rank.test.ts`: 76 passed. Full suite: 795+ passed.

## 4. Deviations from the plan, with reasons

1. **M2/E/F-half not built.** §3.2's gate returned no-go. This is the plan
   working as designed, not a deviation from its intent.
2. **Fork isolation.** §9.1 assumed a sibling fork clone; the fork is nested
   at `vendor/tbc-new-fork`. Raised at dispatch; the author amended the plan
   (§9.1a, `bb61877`) and that governed slices D and F.
3. **No separate F slice.** Its M2 half was cancelled and its other half
   (7.10 parity) was already green at the tip with PROVENANCE matching.
   Spawning a worker to redo verified work would have been theatre.
4. **§5.1.4 sharpened by the author mid-round**, then implemented: a partial
   is `complete: false` even when every candidate landed, keeps
   `seMethod: 'independent'`, and never carries a `setBonusNote`. Writing the
   boundary test the author specified **found a real bug** — see §5.
5. **§7.a's synthetic-fixture rule not applied.** Both roster fixtures remain
   WCL-derived. M1.5 and §3.2 ran against them anyway; the rule's purpose
   (determinism, exercising the owned path) was met, but the plan's stated
   preference was not implemented and no ticket was filed. **Flagging as an
   unaddressed plan item.**
6. **CLI concurrency left at 1** (§5.2's `CLI: 1`), which the review argues is
   now the wrong call — deferred to ticket 200, see §5.

## 5. Open disagreements and unresolved items

**Verbatim, not summarised into agreement.**

### 5.1 Per-slot promotion — §8.1's carried disagreement, trigger now fired

- **Dean's position:** per-slot top-_j_ (j=3) ∪ global K; a one-per-slot floor
  is not enough.
- **Fowler and Beck's position:** add _j_ only when a recall failure names a
  starved slot.
- **Plan as shipped:** global top-K + best-in-slot floor, with the trigger
  "any 7.2 or M1.5 result naming a starved slot".
- **What the run produced:** M1.5 fired the trigger. Above-cutoff misses
  cluster hard by slot — on ret, **all six worst-ranked upgrades are cloaks**
  (ranks 94, 98, 102, 109, 110, 114); on feral the tail is belts (93, 95, 96)
  and necks (58, 71, 75). Rows beyond the _j_-th of their own slot: _j_=3
  misses 5 on ret and 2 on feral; _j_=5 misses 1 and 0; **_j_=10 misses none
  on either fixture** — where a global cap needs ~114.
- **Orchestrator's position:** this is evidence for Dean on the axis the
  trigger named, recorded in §8.1 (`007c50a`). Two limits stated there: it was
  measured for **cap membership**, not M2 promotion (M2 is cancelled), and
  _j_=10 is fit on the same two fixtures it is judged against. A supported
  hypothesis, not a validated default. **It belongs to the M3 design pass, and
  it is not settled.**

### 5.2 CLI concurrency (review R9) — orchestrator defers, reviewer disagrees

- **Carmack's position:** the branch ships zero throughput change on the only
  path with measured numbers. `cli.ts` sets no `concurrency`, so `rank.ts`
  defaults to 1 and the pool is a `for` loop there. 66% of every sim is fixed
  setup (~92 s per ret p2 run), and concurrent process spawning is the direct
  fix, needs no new seam, and is a four-line change. Plan §5.2's `CLI: 1` was
  written before the measurement that made it wrong.
- **Orchestrator's position:** the finding is correct and I verified it. I
  deferred it (ticket 200) rather than fixing it because it widens scope the
  plan explicitly assigned away, and because doing it honestly needs a
  measured before/after ratio — not just the four-line change. **I think the
  reviewer is right on the merits and the plan should be amended.** This is
  the branch's biggest gap: no concurrency timing ratio exists anywhere,
  because §5.3 asked only for byte-identical output at 1 vs 4.

### 5.3 Orchestrator errors this review caught

- **R1 was partly mine.** I asserted, in a merge commit message and in
  progress summaries, that the ranking cache "structurally cannot" accept a
  partial. I had checked that `Ranking.complete` is a literal `true` but never
  checked `Store.put`, which is generic — so the claim was false. The literal
  does real work at `applyView` and `cli.ts`; it does not work at the cache.
  Fixed in code and comment in both copies.
- A backgrounded `pnpm verify` reported success while failing. Noted in §1.

## 6. What the user must still do

1. **Read the review** (`docs/reviews/feat-candidate-pool.md`) — 12 findings
   fixed, 4 deferred to tickets 200–202, 3 wontfix with reasons.
2. **Rule on ticket 200 (CLI concurrency).** My recommendation: take it, and
   amend §5.2's `CLI: 1`, because the measurement that justified serial CLI is
   the same one that now argues against it.
3. **Ticket 156's browser measurement** still needs a human with a real
   foregrounded tab. Its recipe is rewritten around the new Candidates cap and
   Stop control, which is what made the 20-candidate batch runnable at all.
4. **Decide on §7.a's synthetic fixtures** (deviation 5) — implement, ticket,
   or drop the rule from the plan.
5. **The merge decision.** `pnpm merge-to-dev` has not been run and will not be
   without an explicit ask. Nothing has been pushed; the fork's `pushed` flag
   is still `false`.

## 7. Judgement for the plan author

The plan's instrument worked. It specified a gate, the gate was measured
honestly, and the gate said no — before any of M2 was built. The cost of that
discipline was two measurement slices; the thing it avoided was building a
racing system that could never have paid for itself, and then discovering that
in production.

What shipped is smaller than the plan hoped: a cap that defaults to no-op
(correctly — M1.5 proved a smaller default unsafe), concurrency that is
inactive on the measured path (ticket 200), and a Stop that is genuinely
honest and resumable. What was learned is larger: per-request fixed cost, not
iteration count, is the thing to attack, and no amount of screening tuning
changes that.

---

# 8. Fix round (2026-08-15)

Ordered by the user after the plan author's §3.4 judgment: ticket 203 → 200 →
204 (conditional) → re-review + this section.

**Headline: the plan author was right and I was wrong.** REPORT §1–7 said "the
central bet lost." That over-read a CLI-scoped result. M2 exists for the
browser, where a resident WASM module pays no process spawn — and re-measuring
on that runtime **resumed the milestone**.

## 8.1 What was executed

| item      | content                                       | result                              |
| --------- | --------------------------------------------- | ----------------------------------- |
| 203       | E-W5 §3.1 sweep on `lib.wasm` under Node      | done; **floor 0.0441** → M2 resumes |
| 200       | CLI `--concurrency`, default 4                | done; **1.88×** measured            |
| 204       | Synthetic fixture roster (§7.a)               | done; ret 38/240, feral 42/246      |
| slice E   | M2 racing in `packages/core`                  | merged `1ad5568`                    |
| slice F   | M2 ported to the fork                         | fork `138fa77f5`                    |
| re-review | Linus / perf / Carmack over the new diff only | 2 NACKs, 4 blockers, all fixed      |

`pnpm verify` exits **0** on the tip; `pnpm merge-ready` reports **ok**. Both
exit codes captured directly, not read off a wrapper.

## 8.2 Numbers and the go/no-go

**WASM (ticket 203):** `t_fixed` = 748.4 ms, `t_iter` = 3.2446 ms/iteration,
`cost(5000)` = 16,971.4 ms, **floor = 0.0441** — under the 0.25 gate by more
than 5×. With §3.2's `max K* = 25 ≤ 60`, both legs pass and **M2 resumed**.

The contrast is the whole finding: CLI floor 0.609 against WASM floor 0.0441, a
~14× difference in the deciding ratio, because `t_fixed` roughly doubles while
`t_iter` grows about 51×.

**The perf axis stress-tested it and it held.** Every estimator (median, mean,
min, leave-one-out, two-point) and a 20,000-draw bootstrap put the floor below
0.053. The verdict is robust even though the number itself is not precise
(§8.5).

**Defaults, corrected during slice E:** `screenIterations` = 1000,
`promoteTopK` = 150. My §3.4.1 proposal of 300/35 was structurally impossible —
I derived K from a fixture with 16 above-cutoff rows, but the gating fixture
has 42 at contiguous ranks 1–42, so no K below 42 could ever pass recall.

**§6.4's ratio target is NOT met: 0.7042 against ≤0.4**, and it is unreachable
at any K that passes recall — K=120, the measured zero-miss floor, still lands
near 0.58.

**The sum nobody had done** (`experiments/m2-net-win-arithmetic.md`): racing
**saves ~15% on WASM and costs ~24% on the CLI**. Break-even is a promoted
ratio of 0.765 (WASM) and 0.368 (CLI).

## 8.3 Test table

| #       | Test                       | Status                                      |
| ------- | -------------------------- | ------------------------------------------- |
| 7.0     | Racing does less work      | pass                                        |
| 7.2     | Recall on held-out fixture | pass — 30 seeded draws, zero misses, feral  |
| 7.5     | Promotion rule             | pass — 9 unit cases incl. 2 added in review |
| 7.7 ext | Screened third state       | pass                                        |
| 7.10    | Port parity at tip         | pass (E-W3, re-run after every fork edit)   |

`pnpm verify` runs 817+ tests. Ticket 204's fixture test asserts both the ≥10
above-cutoff floor and the (spec, preset phase, `maxPhase`) triple.

## 8.4 Deviations from the plan

1. **§3.4.1's defaults replaced** (300/35 → 1000/150). Mine could not pass
   recall on the gating fixture. Slice E measured and corrected.
2. **§6.3's premise was false.** It said the fork needs a per-request
   iterations override for screening. Slice F verified `WasmSimRunner` never
   calls `makeRaidSimRequest` — `SimRunOpts.iterations` already crossed the
   seam — and corrected the section rather than implementing a no-op.
3. **§6.4's ratio target missed**, recorded as measured rather than adjusted.
4. **§7.a's WCL fixtures kept, not replaced.** Their tests cover ambiguity
   resolution that exists only because WCL data is ambiguous; replacing them
   would have deleted coverage. §7.a records the reason, per its own rule.
5. **Ticket 204's preset source** is `sync_wowsims.py --restore` into
   `vendor/wowsims/`, not the nested fork clone my brief claimed.

## 8.5 Open disagreements and unresolved items

**Verbatim, not summarised into agreement.**

### The one that decides whether M2 should be enabled

- **Carmack:** racing as shipped is a **net loss on the CLI (1.24×) and a 15%
  win on WASM** — not the ~2.5× the ≤0.4 target implied. Break-even is 0.368
  (CLI) and 0.765 (WASM); the shipped 0.7042 sits on the wrong side of one and
  barely inside the other.
- **Orchestrator:** agreed, verified, and fixed the CLI half — `cli.ts` now
  passes `fullPool: true`. **I do not think the WASM half is settled.** 15% is
  a real win but far from what the plan wanted, and nobody has timed racing end
  to end on either runtime. **My position: M2 is correct and safe, but whether
  it ships enabled on the browser path is a judgment call for the plan
  author**, with per-slot top-_j_ as the alternative that would make it clearly
  worth it.

### Per-slot promotion — §8.1's carried disagreement, now with a price

- **Dean:** per-slot top-_j_ ∪ global K; a one-per-slot floor is not enough.
- **Fowler and Beck:** add _j_ only when a recall failure names a starved slot.
- **What this round produced:** a **third** independent pointer. M1.5 showed
  slot clustering; §6.4 showed a global K cannot reach the ratio target at any
  recall-passing value; and the net-win table shows the savings live at small
  promoted counts. Carmack costed it: `bestDeltaBySlot` is **already computed**
  inside `promotionRule`, so per-slot top-_j_ is a sort per bucket —
  microseconds — and at _j_=5 over 17 slots the ratio lands near 0.354, **under
  the target and under the CLI break-even**, the only configuration in this
  analysis where racing pays on both runtimes.
- **Orchestrator:** the evidence is three-for-three and now quantified at
  roughly the difference between 6% and 65% on WASM. It is still fit on two
  fixtures and unmeasured in a browser. **Recommend taking it before enabling
  M2 by default.** Not built here — outside every slice's scope this round.

### Linus's Blocker 3, tested and refuted

- **Linus:** §6.4's "unreachable" may be measuring an over-broad
  `setPackageItemIds` (it promotes every item with a set id, not the packages
  `selectPackage` sims) rather than a real constraint. Instrument before
  accepting the tension.
- **Orchestrator:** correct objection, so I measured it. Of 160 promoted rows,
  **150 are top-K**; everything else adds 10, the set clause 6. Removing it
  entirely moves 0.704 to about 0.68. **The conclusion survives.** The clause is
  still over-broad and worth tightening on its own merits (ticket 205).

### My own errors this round

1. **§3.4.1's defaults were structurally impossible** — K=35 against a 42-row
   contiguous band.
2. **§3.4.1 said M2 resumes "on the browser path" without checking the code
   could distinguish runtimes.** It could not; that is Carmack's blocker F1.
3. **My first net-win sum used 240 screens; the real count is 277** (paired
   slots screen twice). Carmack's figure is the accurate one, and mine
   understated racing's cost.

## 8.6 What the user must still do

1. **Decide whether M2 ships enabled on the browser path** at a 15% win, or
   whether per-slot top-_j_ comes first. This is the substantive call.
2. **Read the updated review** — 4 fix-round blockers fixed, 12 deferred to
   tickets 201 and 205–207, 2 wontfix.
3. **Ticket 156** still needs a human with a real foregrounded browser tab;
   every number here is Node-hosted.
4. **The merge.** `pnpm merge-to-dev` has not run and will not without an
   explicit ask. Nothing is pushed; the fork's `pushed` flag is still `false`.

## 8.7 Judgement

The plan's instrument worked twice — once to cancel M2 on evidence, once to
resume it when the author noticed the evidence came from the wrong runtime.
Both moves were right on the information available, and the second was possible
only because the first was recorded honestly enough to be re-examined.

What ships now is a measured, recall-safe racing implementation worth ~15% on
the runtime it targets, correctly disabled on the one where it loses. What it
is not is the ~60% the plan hoped for, and the reason is a global top-K
fighting a per-slot problem — the disagreement §8.1 has carried since the plan
review, now with three independent measurements and a price attached.
