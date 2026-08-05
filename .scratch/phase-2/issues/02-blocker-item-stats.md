Status: open
Type: finding
Origin: `.scratch/phase-2/issues/02-disclosure-and-caps.md` item 1 (CapState)
Blocks: none
Blocked by: none

# `CapState` cannot be computed today — item stats are dropped at index generation

Found while starting ticket 02 on `phase-2/disclosure-and-caps`. The ticket
assumes the hit/expertise **rating** the player is carrying is reachable. It is
not. This is a data-availability blocker, not a design disagreement.

## What was checked

Three candidate sources, all ruled out by inspection:

1. **`data/items/index.json` has no `stats` field.** The runtime `ItemEntry`
   (`packages/core/src/items.ts`) carries `socketBonus` but not `stats`.
   `scripts/generate_item_gem_index.py:121` emits `socketBonus` for items and
   emits `stats` only for **gems** (line 189). Item stats are dropped.

   ```bash
   python -c "import json; d=json.load(open('data/items/index.json')); print(sorted(d['30129'].keys()))"
   ```

2. **The sim result carries no stats.** `test/fixtures/slamaltman.raid-sim-result.json`
   contains only `raidMetrics` / `playerMetrics` (dps avg/stdev/min/max),
   `iterationsDone`, `simVersion`. Confirmed upstream rather than only in the
   fixture: `RaidSimResult` (`proto/api.proto:384`) has no stats field.
   `SimObservation` (`seams/sim-runner.ts`) mirrors that.

3. **`ComputeStats` is not reachable through the pinned CLI.** The RPC exists
   (`api.proto:426`) and `PlayerStats.final_stats` (`api.proto:489`) is exactly
   the right number — gear + talents + buffs. But the pinned binary exposes only
   `sim`, `decodelink`, `version`, `completion`, `help`:

   ```bash
   vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe --help
   ```

## The data does exist in the vendor db

`vendor/wowsims/db.json` carries per-item stats under
`scalingOptions["0"].stats`, as a sparse index→value map. Crystalforge
Breastplate (30129) shows `{"0":56,"2":40,"3":20,"20":23,"21":21,"31":1668}`.

Stat indices from `data/proto/common.proto`: `StatMeleeHitRating = 20`,
`StatExpertiseRating = 24`. So index 20 = 23 melee hit rating on that chest.

## Recommended fix

Extend `build_items_index` to emit `"stats"` per item, densified the same way
gem stats already are, then sum equipped item stats + socketed gem stats in a
new pure `caps.ts`. This is a **generated-artifact change**: it grows
`data/items/index.json`, so it must be regenerated from the committed source
with the pinned toolchain and the working tree must match `HEAD` before commit
(AGENTS.md § Durable claims).

**Untested hypothesis:** that gear-summed rating alone is close enough to be
worth showing. It excludes talents and raid buffs, which `final_stats` would
have included — for ret, Precision-style talent hit is exactly the sort of thing
that would make a gear-only figure read low. §4.3 already forbids presenting a
precise figure and requires the uncertainty band, which softens but does not
remove this. Measure a gear-only sum against a known-good figure before
believing the banner.
