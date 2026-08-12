## Impact analysis: does `feature/backend-reforge` affect more than the gem optimizer?

Four parallel investigations (proto surface, database/artifacts, sim behavior, CLI/binary+sync), each diffing pinned `v0.0.101` (`8aa378b3`) against branch head `d09edaaf8`. The branch is a **clean fast-forward** — merge-base equals the pinned tag, so everything below is purely additive history.

**Short answer: yes, but narrowly.** The interface surface holds almost everywhere; the real impacts are (a) feral cat numbers, (b) a handful of pinned-file checksums, and (c) `sync_wowsims.py` cannot point at a branch at all.

### What holds (verified, not assumed)

- **CLI is byte-identical.** `git diff HEAD FETCH_HEAD -- cmd/` is empty. `decodelink`, `sim --infile/--outfile`, `version` all unchanged. `DiscardUnknown: true` on input remains — unknown skeleton fields stay tolerated.
- **Release pipeline unchanged.** Makefile has an empty diff; same artifact names (`wowsimcli-windows.exe.zip`, `wowsimcli-amd64-linux.zip`) that `scripts/fetch_wowsimcli.py` expects. Workflow changes are CI hygiene only.
- **Share-link encoding unchanged.** Both link exporter/importer files have empty diffs; `IndividualSimSettings.reforge_settings = 18` untouched. Links encode/decode identically across refs.
- **Item slots unchanged.** `ItemSlot` enum identical (17 slots, same order) — `slots-sim-order.generated.ts` stays valid.
- **Wire compatibility: no silent-corruption risk.** No field renumbering anywhere we touch; our transport is protojson over `--infile` (field names, not tags); we read back only `raidMetrics.dps.{avg,stdev}`, `error.type`, `iterationsDone` — all unchanged. The one repurposed field (apl.proto 89, `energyRegenPerSecond` → `timeToNextEnergyTick`) appears in neither of our sim skeletons (verified directly; only generated `apl_pb.ts` mentions it).
- **`CURRENT_PHASE` still Phase 2**; ret APL and all pinned ret + feral gear sets are blob-identical.
- **Gem palette cannot change**: `db.json`'s `gems` section is byte-identical between refs.

### What changes

| Impact | Detail | Severity |
|---|---|---|
| **Feral cat numbers will move** | `sim/core/energy.go` rewritten: tick 2s/20.0 → 2020ms/20.2, `hasteRatingMultiplier` dropped, `TimeToTargetEnergy` now tick-quantized. Plus `ui/druid/feralcat/apls/default.apl.json` is a wholesale rotation rewrite (powershifting, bite-tricking, 13 new valueVariables). Upstream's committed feral test results are unchanged, but those don't exercise the new default APL — if we consume it, our feral numbers move materially. | **High for feral; the main numeric consequence of re-pinning** |
| Ret DPS shifts ~−0.03% uniformly | Only functional `sim/paladin/` change: removal of Int→SpellCrit stat dependency. Uniform offset across gear sets → rankings essentially unaffected. (TPS −30%, but we rank DPS.) | Low |
| `db.json` checksum stale | Content: 657 items lose empty `scalingOptions` stubs (invisible to our generator), and **2 items change phase 5→3** (Medallion of Karabor 32649 / Blessed 32757). All other generator-consumed fields (`gemSockets`, `socketBonus`, `setId/setName`, `unique`, `sources`, …) changed on **zero** items. Net: two rows in `data/items/index.json`; pools/universes unaffected (neither medallion is in any universe today). | Low |
| 4 tracked pins changed | `db.json`, `feral_default.apl.json`, `feral_sim.ts`, `proto_utils.ts` — the feral ones feed `extract_sim_defaults.mjs` (ADR-0022) and could shift `data/presets/feral/buff-defaults.json`. | Medium (feral presets) |
| 6 proto pins changed | Regenerating proto TS is a breaking regen for `db_pb.ts` (`disabledInChallengeMode` removed) — but no source file reads that field. `ReforgeSettings`/`StatCapConfig`/`UIStat` moved ui→api at same field numbers (import-path change only). | Low |
| **`sync_wowsims.py` cannot target a branch** | Tag-only by construction: `--tag` resolves via `repos/{REPO}/tags`; a branch name → `SystemExit`. Workaround: hand-write the branch commit SHA into the lockfile and run `--restore` (`pinned_fetch` takes raw SHAs, and all 30 pinned paths still exist on the branch). Proper fix: add a `--ref`/commit mode. | **Blocking for a clean re-pin** |
| Full cache invalidation on re-pin | `simVersion` is part of every sim cache key, so a new binary misses rather than lies; `RecordedSimRunner` throws `no recording for sim key`. Recorded feral fixtures need regeneration. Correct behavior, but it's real work. | Expected cost |
| Set-bonus data: no change | `setId`/`setName` changed on zero items; socket-bonus modeling upstream (MIP link constraints + exact `ComputeStats` validation) remains a *pattern* to compare against, not a data change. | None (data), design-review only |

### Reproducibility caveat (unverified, flagged for the review)

`sim/core/sim_concurrent.go` rewrites the concurrent-run combiner (metrics keyed by struct index instead of `ActionID.String()`), and `sim/core/database.go` (+86) reroutes consumable lookup through `GetConsumableByID()`. Neither was audited to the bottom; the concurrency change is the highest-risk item for same-request-same-DPS reproducibility. Should be checked before trusting branch-built binaries for cached rankings.

### Decision this enables

Re-pinning to the branch is **feasible and cheap on the interface side** — the migration is: lockfile SHA swap (via `--restore` workaround or a new `--ref` mode), regen `data/items/index.json` (2 rows), regen feral presets, accept full cache invalidation, re-record feral fixtures, update `docs/verification-log.md` pin line. The substantive costs are feral-number churn and the unaudited concurrency rewrite — both arguments for pinning a **specific commit** on the branch rather than tracking it, and for re-running the five-seed spread on feral after the swap.
