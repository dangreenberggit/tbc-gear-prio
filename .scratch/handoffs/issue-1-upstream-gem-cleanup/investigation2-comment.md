## Second investigation: what the reframing surfaced

Four parallel deep-dives under the corrected framing (upstream as oracle and preview, not adoption target): oracle comparison of our gem code against upstream's Go optimizer, feral validation staleness, a stale-upstream-claims sweep across all docs, and a static determinism analysis of the concurrency changes. Findings below, ranked by what they change about the plan.

---

### 1. Oracle comparison found real bugs in our shipped gem code

Upstream's `sim/core/reforge_optimizer/` (note: the gem model lives in `model.go`; there is no `gems.go`/`choices.go`) was used as a correctness oracle against `packages/core/src/`. 18 invariants compared. The divergences that matter, ranked:

1. **Prismatic gems counted toward all three meta colours** — `meta.ts:332-347` credits a prismatic gem with red AND yellow AND blue toward meta activation; upstream (`meta_gem_constraints.go:72-88`) credits it with **nothing**. We can declare a meta active that the game would not. Highest-confidence correctness bug.
2. **Meta socket wrongly forfeits socket bonuses** — both `candidate-gems.ts:289` (`allSocketsMatched`) and `meta-repair.ts:115` (`socketsMatch`) require the meta socket to match; upstream (`gear.go:169-171`) skips non-coloured sockets entirely. On any item with a meta socket, an empty/absent meta makes us score the bonus as lost when the game still awards it.
3. **Greedy hill-climb can report false `meta-unsolvable`** — `meta-repair.ts:191` accepts only strictly deficit-reducing single moves, so it cannot cross a plateau needing a two-gem exchange. Most plausible on **compare-colour** metas. Worse, step-budget exhaustion (`meta-repair.ts:102`) throws the *same* error class as genuine infeasibility, and `RankError("meta-unsolvable")` aborts the **entire ranking** (`rank.ts:472`) where upstream scopes failure to one request.
4. **Hardcoded `32409` meta preference** in candidate fill (`candidate-gems.ts:108`) — silently wrong for every non-ret spec; our own comment acknowledges EP cannot rank metas.
5. **Tickets 117/116 are fixed but structurally fragile** — our quality cap is call-site discipline (two palettes on one context, `palette` uncapped / `fillPalette` capped, type-indistinguishable); upstream's cap lives inside the pool builder (`model.go:244`) so no consumer can bypass it. This bug class recurs until the cap moves into the palette accessor. **Ticket 114 is still open** (`gems.ts:478-483`: `null <= 3` is `true` in JS; no Go oracle exists — Go can't represent the malformed input).

**`minimizeRegems` spec for our flow** (full detail in agent report): runs after `repairMeta`, before `applyRepairedGems`, at both call sites; requires capturing the **pre-repair layout** (`rank.ts:456` currently overwrites it in place); must never touch the meta socket; uses apply-then-revert for the socket-bonus guard (our `socketsMatch` is unusable for this until bug #2 above is fixed); and must **rewrite** the user-facing `MetaRepairSwap[]` report, not append to it. Motivation is stronger than upstream's (purchase cost): ticket 111 measured a **+10.43 DPS overstatement** from recommending an unowned gem — this is the same medicine applied to repair.

### 2. Feral: the incoming APL is *unparseable by our pinned binary*, and nothing would catch it

- Our feral skeleton embeds the old default APL **verbatim** (all four APL keys byte-identical to `HEAD:ui/druid/feralcat/apls/default.apl.json`; no share link exists — `build_feral_skeleton.py:5-7`).
- The new upstream APL uses `timeToNextEnergyTick`, a **proto field that does not exist at our pin** (confirmed: 0 hits in our vendored `apl_pb.d.ts`), in at least 8 places. `build_feral_skeleton.py:139-142` copies APL keys blindly — it would happily emit the new APL and the pinned `wowsimcli` would reject or misparse it. **There is no schema gate between the vendored APL and the skeleton.** Action: add a hard unknown-field check to `build_feral_skeleton.py`/`check_raid_sim_skeleton.py`.
- **Upstream's own test suite is blind to the rewrite**: `feralcat_test.go` uses `Rotation.Type = TypeSimple`, never the UI APL. The unchanged golden DPS in `TestFeralCat.results` (0 of 584 common entries moved; only TPS, uniformly −30%) is *not* evidence the APL/energy changes are DPS-neutral.
- **Energy model**: mean income is unchanged (10.0/sec both ways — 20/2 vs 20.2/2.02); the fix is quantization. Old model let energy-gated waits fire earlier than physically possible (timing optimism). Direct effect on our runs likely small (our pinned APL gates on `currentEnergy <= 30`, not tick timing) — the rotation rewrite it *enables* is what dominates. Wolfshead/Furor changes look behaviour-preserving for cat DPS (refactors + bear-side additions).
- **Already suspect today, no bump required**: `CUTOFF = {absDps: 3.4, pct: 0.15}` was derived from a **ret** fixture (`docs/five-seed-spread.json:2`) and applied to feral, whose powershifting rotation is more stochastic — the cutoff may be admitting noise as signal on feral rows *right now*. Measuring a feral five-seed spread is the highest-value action in this whole section and needs nothing from upstream.
- Safe: WCL fixtures, `feral-offline.ts`, `buff-defaults.json` (gated). Stale-as-absolutes: every prose feral DPS figure (ADR-0022:126 already concedes this). At bump time: regenerate skeleton + verify APL round-trip, re-derive EP weights, re-measure the Thunderheart/set-bonus conclusions (their APL-based reasoning — "Swipe absent", "Bite is the 5-CP finisher" — is stated against the old rotation).

### 3. Claims sweep: one false load-bearing claim; the corpus is otherwise honest

17 upstream claims audited against both refs. **Only `PLAN.md:650` is both false and load-bearing**: "The Go sim does not enforce meta gem activation [TRUE]… There is no upstream optimizer to borrow, so this is ours [FALSE on both refs]." The half-truth is why it survived. The correction exists but is buried in `.scratch/handoffs/gem-optimizer-comparison.md` — the live plan text still teaches the wrong fact, and §682 still points at `gems.ts` when `meta_gem_constraints.go` is now a maintained, LP-ready 19-entry version of the same table.

Everything else checked TRUE (CLI's exactly-three-subcommands, ret-sets-stop-at-P2, StatWeights-unreachable-via-CLI, zero-hits importer grep, CURRENT_PHASE=2 on both refs) — with hygiene caveats:

- **H1**: true-but-rot-prone phrasing ("Currently 2", "has no upstream equivalent") → stamp with "as of `wowsims/tbc-new` @ v0.0.101 (`8aa378b3`)". The corpus already has the right pattern in `.scratch/set-bonus-value/verification.md`.
- **H2**: fix `PLAN.md:650` by splitting the true half from the false half.
- **H3**: promote the correction to **ADR-0025** (docs/adr has 0016–0024) so the next §9 reader finds it.
- **H4**: wowsims-reuse docs cite the WCL importer with the wrong implied path — anyone reproducing the "zero hits" grep against it gets zero hits *for the wrong reason*. The same empty-directory false-negative that started this ticket, in miniature.
- **H5–H7**: repin `gem-optimizer-comparison.md` (its sources point at an untracked scratch tree), stamp the §14 audit header with its commit, cross-link the "don't rebuild what upstream has" rule from §9.

### 4. Determinism: the concurrency changes are provably neutral; the caveat we own is elsewhere

Static analysis, function-body hashing across refs:

- Seed flow on our tag: iteration N's RNG stream is a pure function of `RandomSeed + N`; split seeds are derived deterministically; results combine in slice-index order. `SplitSimRequestForConcurrency`, `runSimConcurrent`, `AddResult` are **byte-identical** across refs (md5-verified). The map-based combiner keying is a lookup index that is never iterated; append order unchanged. The `NewEnvironment` fourth bool is `false` on the sim path — a no-op branch. (Corrects two claims from the first-round analysis: `RunRaidSimConcurrentAsync` was not rewritten, and nothing is "keyed by struct index" in an order-affecting way.)
- **DPS will still move at the bump — from sim-logic diffs**, not concurrency: `shared_utils.go` (899 lines), proc generation (515), buffs/consumes/energy, per-class files; essentially every upstream golden `Test*.results` regenerated. `simVersion` in our cache key handles this by construction.
- **Pre-existing caveat we own today**: split count = `runtime.NumCPU()` — no env var, no request field, on both refs. Different core counts (dev Windows box vs Hetzner container quota) change FP summation grouping → last-ulp `dps.avg` differences across machines for the same seed. If cache keys ever cross machines, record NumCPU alongside the seed or use iteration counts that divide evenly. This is a §10 statement-of-scope fix, not an upstream problem.
- **Empirical test at bump time** (concurrency needs none — test what changed): (1) upstream's own disabled ST==MT harness (`sim/core/_sim_concurrent_test.go`); (2) same input+seed ×3 through the new binary → byte-identical `dps.avg/stdev/iterationsDone`; (3) cross-ref comparison expecting a *sim-meaningful* diff → mandatory `simVersion` bump; (4) optional heterogeneous-NumCPU check.

---

### What this adds to the checklist

**Part B additions (gem/meta fix):**
- [ ] Fix prismatic colour counting in `meta.ts` (credit nothing toward meta activation, matching upstream)
- [ ] Fix both socket-match predicates to skip non-coloured sockets (`candidate-gems.ts:289`, `meta-repair.ts:115`)
- [ ] Split step-budget exhaustion from genuine infeasibility (distinct error); stop aborting the whole ranking on `meta-unsolvable`
- [ ] Move the gem quality cap into the palette accessor (chokepoint, not call-site discipline); close ticket 114 with a type guard
- [ ] Replace hardcoded `32409` meta preference with per-spec data
- [ ] Implement the `minimizeRegems` pass per the spec above (capture pre-repair layout; rewrite the swap report)

**Part A additions (connection cleanup):**
- [ ] `PLAN.md:650` split; ADR-0025; ref-stamp rot-prone claims (H1–H7)
- [ ] Schema gate: `build_feral_skeleton.py` / `check_raid_sim_skeleton.py` reject APL fields unknown to the pinned proto

**New, independent of any bump (highest measurement value):**
- [ ] Feral five-seed spread; re-derive `CUTOFF` per spec — the ret-derived cutoff may be admitting noise on feral rows today
- [ ] Decide whether cross-machine cache keys need NumCPU (dev→deploy is heterogeneous by plan)
