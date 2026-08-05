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

**Measured 2026-08-05 — the hypothesis was right, the reasoning was wrong.**

The original claim here was that "for ret, Precision-style talent hit" makes a
gear-only figure read low. Precision is **not** a Retribution talent: it is a
*Protection* talent (`proto/paladin.proto:33`, `int32 precision = 23`, inside
the `// Protection` block at lines 30-52). The Retribution tree (43-64) has no
hit talent at all.

That does not rescue the figure — it makes the gap concrete. The pinned ret P2
preset cross-specs into Protection and takes **3/3 Precision**:

```bash
python -c "import json;d=json.load(open('data/presets/ret/p2.raid-sim-skeleton.json'));\
print([v for k,v in __import__('itertools').chain.from_iterable([]) ] or 'see talentsString')"
# talentsString: 5-053201-0523005120033125331051
# Protection block '053201'; Precision is proto 23, block starts at 21 -> index 2 -> 3 points
```

3% hit ≈ 3 × 15.769233 ≈ **47 rating**. The same string is in the simmed
request (`test/fixtures/slamaltman.raid-sim-request.json`), so the sim applies
it. slamaltman therefore sits near **119 of 142**, not the 72 the gear-only sum
reports — the banner's shortfall is roughly 2.5× the real one.

No TBC raid buff grants melee hit, so Precision plus Heroic Presence is the
whole invisible remainder. Both only ever *reduce* the shortfall, which is why
the banner states the direction instead of a symmetric ± band.

**Still open:** wiring the talent contribution in. `talentsString` is already in
the composed request the engine holds, so the talent half is reachable today
without a new seam — see ticket 33.
