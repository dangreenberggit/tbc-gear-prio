# Candidate pool — execution report for the plan author

Plan: `docs/plans/wowsims-tab/candidate-pool.md` (rev 2).
Branch: `feat/candidate-pool`, tip `b52fd51` (+ this report).
Fork: `vendor/tbc-new-fork` at `6a192eb2a` on `feat/upgrades-tab`, `pushed: false`.
Review: [`docs/reviews/feat-candidate-pool.md`](../../../../docs/reviews/feat-candidate-pool.md).

**Headline: the plan's central bet lost, and losing it was the most valuable
thing this branch did.** M2 (racing) was cancelled by its own gate, on
measurement, before any of it was built. M1 shipped in both engine copies.

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
