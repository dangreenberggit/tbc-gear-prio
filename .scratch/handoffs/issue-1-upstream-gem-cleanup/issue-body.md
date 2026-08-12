## Summary

Two intertwined problems, fixed together on `claude/wowsims-gem-choosing-issue-3be1fa` (which also absorbs `feat/set-bonus-value`), **before Phase 3 starts**:

1. **The gem/meta repair shipped in Phase 2 is suspect** and needs review and fixing (`packages/core/src/meta-repair.ts` and friends).
2. **Our connection to upstream is structurally capable of misleading us** — and did, twice. The gemming confusion is what triggered the closer look; the connection is the deeper problem.

The two successive false beliefs that exposed it:

- *"Upstream has no gem optimizer at all"* — false. The UI ships **Suggest Gems** (`ReforgeOptimizer` — named for *reforging* because the component was inherited from later expansions; TBC has no reforging, so every natural search term misses it).
- *"The UI TSX component is the upstream reference"* — also wrong. Active upstream development for this area happens on **[`feature/backend-reforge`](https://github.com/wowsims/tbc-new/tree/feature/backend-reforge)**, which moves the optimizer into the Go sim core (`sim/core/reforge_optimizer/`, MIP solver, test fixtures, `ReforgeOptimizeRequest` proto API, `/reforgeOptimize` endpoint). We had no idea this branch existed until now.

The §9 product stance stands throughout: **repair, not re-optimize** — output must stay recognisably the player's gear.

## Part A — Upstream connection cleanup

What actually failed, three layers deep:

1. **Naming** — the feature is discoverable only if you know it's called "reforge."
2. **`vendor/` was empty** — gitignored, never populated. An agent searched a directory containing zero lines of wowsims code and reported "no meta-repair, no suggest-gems" as fact.
3. **We didn't know where upstream development lives** — the pin points at release tag `v0.0.101`, which is correct for *building*, but nobody was watching the branch where the relevant work happens. Even a populated `vendor/` would have shown only the soon-to-be-replaced TSX version.

**Decision (settled): keep building against the tag; make the connection branch-aware.** Freezing an unreleased branch commit is the wrong default when the goal is a connection that can't mislead — adoption of unreleased code is a separate, optional bet. When upstream tags a release containing the merge, the re-pin is a normal tag bump.

- [ ] Teach `scripts/sync_wowsims.py` a `--ref`/commit mode (today it is tag-only: a branch name → `SystemExit`)
- [ ] Record `feature/backend-reforge` in `data/wowsims.lock.json` as a **watched ref** (analogous to how `--check` watches `CURRENT_PHASE`); drift reports cover it
- [ ] `sync_wowsims.py --check` (or an AGENTS.md preflight) fails loudly when `vendor/` is absent — "the source isn't here" must never again read as "the feature doesn't exist"
- [ ] Correct stale upstream claims in PLAN.md §9 / docs — both the "no upstream optimizer" claim and any implication that the TSX component is the reference

## Part B — Gem/meta repair review and fix

What we have today (verified in `packages/core/src`, end-to-end in `rankUpgrades`):

| Module | Role |
|---|---|
| `meta-repair.ts` | Greedy min-EP recolour until meta active, else `meta-unsolvable`; socket-bonus forfeiture priced in cost (R4) |
| `meta.ts` | Colour matching + meta conditions (ported from wowsims `gems.ts`) |
| `candidate-gems.ts` | Per-item EP fill; matched vs free layout; unique within the piece |
| `migrate-gems.ts` | Carry worn gems onto a new socket layout |
| `gems.ts` / `data/gems/palette.json` | Phase palette; JC excluded at generation |

Baseline: `repairMeta` on full set → sim → per candidate: same item id keeps worn gems; new item gets `migrateGemsToItem` + `fillEmptyCandidateGems` + `repairMeta` again. Candidate fill uses `gemFillWeights` (melee hit + expertise EP zeroed); meta repair uses full EP weights.

**Upstream's Go optimizer is now a correctness oracle, not (yet) a dependency.** It solves the same design problem we solved independently in Phase 2, with committed test fixtures (`gem-limits`, `gem-pool-narrow/wide`, `meta-gem-comparative`, `soft-caps-multi`, …) and documented invariants (`.github/skills/wowsims-tbc-reforge-optimizer-handoff/SKILL.md`: validate with exact `ComputeStats`; solver deltas are guidance, not authority; error loudly on solver failure). We can compare against it at zero adoption risk.

- [ ] Review `meta-repair.ts` / `candidate-gems.ts` / `migrate-gems.ts` against `sim/core/reforge_optimizer/` — use upstream's test fixtures as an oracle where semantics overlap. Start from `.scratch/handoffs/gem-optimizer-comparison.md` (accurate but written against the TSX version; needs updating for the Go port)
- [ ] Adopt **`minimizeRegems` semantics** (`gear.go:54`: reuse gems the player already owns unless swapping back would break a socket-colour match) — the piece that keeps getting missed and glossed over, and directly §9-aligned
- [ ] Reassess `gemFillWeights` hit/expertise zeroing against upstream's cap-aware re-solve (`checkCaps` → tighten → recurse)
- [ ] Set-bonus interaction (`feat/set-bonus-value` folds in here): compare our set-bonus valuation against upstream's pattern — socket bonuses as explicit MIP link constraints, validated with exact `ComputeStats`. (Data side is clean: `setId`/`setName` changed on zero items between refs.)
- [ ] Fix what the review turns up; keep repair semantics — do not convert this into a re-optimizer
- [ ] Re-confirm Phase 2 gate behaviours: inactive-meta baseline auto-repaired and disclosed; a meta repair that would break a socket bonus picks the other move (§9, R4)

Consuming the Go optimizer directly (server binary or shim — it is **not** in `wowsimcli`) is explicitly deferred; re-evaluate at the tagged release.

## Part C — What the branch previews about the next release

Full impact analysis in the comment below (four parallel investigations, pinned `8aa378b3` vs branch head `d09edaaf8`; the branch is a clean fast-forward from our tag). Read it as a **preview of the next tag bump**, not a migration checklist. Highlights:

- **Interface layer holds almost everywhere**: `cmd/wowsimcli/` diff is empty (`decodelink` intact), release artifact names unchanged, share-link encoding unchanged, `ItemSlot` enum unchanged, no proto renumbering we touch, gem section of `db.json` byte-identical.
- **Feral is the warning flare**: upstream rewrote the energy model (2s/20.0 → 2020ms/20.2 ticks, haste multiplier dropped, tick-quantized) and wholesale-rewrote the default feral APL. Upstream considers current feral simulation wrong — which bounds how much to trust our feral deltas *today*, independent of any re-pin. At the tag bump: feral numbers move, recorded feral fixtures regenerate, five-seed spread re-runs for feral. Ret shifts ~−0.03% uniformly; rankings unaffected.
- **Small data drift**: 2 items change phase (Medallion of Karabor 32649 / Blessed 32757, 5→3); 657 items lose empty `scalingOptions` stubs our generator never reads; everything else our generator consumes changed on zero items.
- **Open verification at re-pin time**: the concurrent-sim combiner was rewritten (metrics keyed by struct index vs `ActionID.String()`) and consumable lookup rerouted through `GetConsumableByID()` — verify the same-seed-same-delta guarantee still holds before trusting a new binary for cached rankings. `simVersion` in the cache key means a new binary misses rather than lies, which is the designed behavior.

## Related carry-forward issues

Triage as part of Part B — several may be symptoms of the same root cause:

`117-repairmeta-bypasses-the-rare-cap-on-coloured-sockets` · `116-exported-fillcandidategems-bypasses-the-rarity-cap` · `114-gem-quality-null-passes-the-fill-cap-while-undefined-drops` · `111-fillemptycandidategems-invents-gems-the-player-does-not-own` · `107-candidate-gem-substitutions-undisclosed-in-report` · `103-package-delta-reads-low-versus-a-regemmed-wowsims-run` · `29-job-row-stranded-on-meta-unsolvable` · `20-meta-gem-ep-model-blind-to-proc-effects` · `06-candidate-ungemmed-swaps` · `04-meta-activation-check`

`103` is especially relevant: our delta reading low against a regemmed wowsims run is exactly the discrepancy the missed `minimizeRegems`/optimizer gap would explain.

## Out of scope

- Building a full gem re-optimizer as a user-facing product surface (separate ticket, separate product decision)
- Re-pinning to the branch now (settled above: watched ref now, tag bump when upstream releases)
