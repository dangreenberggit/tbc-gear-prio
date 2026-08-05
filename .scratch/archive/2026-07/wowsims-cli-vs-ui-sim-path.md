# wowsims CLI path vs UI sim path

**Date:** 2026-07-28  
**Question:** How does *our* ranking path use pinned `wowsimcli` versus how wowsims/`tbc-new` builds and runs an equivalent individual/raid sim — and what gaps could make a real upgrade look like a downgrade (including missing-enchant carry)?  
**Pin:** `data/wowsims.lock.json` → tag `v0.0.101`, commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`  
**Upstream clone (untracked):** `.scratch/wowsims-tbc-new-src/` at that commit  
**Binary checked:** `vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe` → `version` prints `v0.0.101`

Claims below cite repo paths, upstream paths under the clone, or commands a reader can re-run. Speculative causes are labelled **hypothesis** / **untested**.

---

## 1. Executive summary

Both paths eventually call the same Go raid simulator with a `RaidSimRequest`. The CLI and the browser UI do **not** set that request up the same way.

**What is the same**

- Message type for a combat run: `RaidSimRequest` (raid + encounter + `simOptions`).
- Engine entry: `core.RunRaidSimConcurrentAsync` (CLI) / worker `raidSimAsync` (UI) — same sim package after the request exists.
- Share links are **not** `RaidSimRequest`; they decode to `IndividualSimSettings` (or `RaidSimSettings` for `/raid/` links). The UI lifts live player/raid/encounter state into `RaidSimRequest`; we never run the share-link message through `sim`.

**What differs**

- **We** spawn `wowsimcli sim --infile/--outfile` with a JSON request built by patching only **name / race / equipment** onto a committed golden skeleton (ret P2 buffs, talents, APL, consumes, encounter, professions). We inject `simOptions` at spawn time. We read raid-average DPS and stdev.
- **The UI** builds `RaidSimRequest` from the live sim object: full player proto (including an embedded per-player `database` of the equipped items/enchants/gems), raid/party buffs, encounter, tanks, target dummies, then applies gear hygiene (inactive meta gem removal, strip ring enchants if not Enchanter) before run. The browser WASM build is **not** compiled with `--tags=with_db`; it relies on that embedded `database`. Our CLI binary **is** built with `with_db` and loads the full item DB at process start, so omitting `player.database` is intentional and matches upstream’s own CLI exporter (which deletes `database` from the JSON).

**Most likely to make a real upgrade look like a downgrade** (ranked; several still **untested** against a live wrong row)

1. **Candidate gem fill vs worn gems** — new candidates are re-socketed with our EP gem filler (hit/expertise EP zeroed for fill); the UI’s item picker mostly **keeps and re-slots** the previous piece’s gems. A “real” upgrade with bad fill, or a fill that breaks meta / socket bonus relative to the worn set, can lose to baseline. Same-item preserve is already in `swapItemAt`; **different-item** fill remains the big asymmetry.
2. **Frozen preset world** — talents, APL, raid buffs, consumes, encounter, and professions come from the skeleton, not the log / not the user’s wowsims UI profile. Wrong APL/buffs/consumes change absolute DPS and can reorder close upgrades (**hypothesis** for specific rows; standing assumption is documented in `disclosure.ts`).
3. **Enchant copy rules** — when the worn slot **has** an enchant, we copy its id onto the candidate if `isEnchantable(itemId)`; the UI copies only if `enchantAppliesToItem` (type/hand/weapon checks). Copying an incompatible effect id is possible on our side (**hypothesis**). When the worn slot has **no** enchant, our code omits `enchant` and compose does not merge skeleton equipment — so skeleton “default” enchants should **not** leak onto bare swaps (ticket #14’s skeleton-leak story looks **false** on current compose; see §5).

---

## 2. Our invoke path

### Command

`CliSimRunner.run` writes the request to a temp file and spawns:

```text
<binary> sim --infile <req.json> --outfile <res.json>
```

Cited: `packages/core/src/seams/cli-sim-runner.ts` lines 36–57.  
Binary help (re-run):  
`vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe sim --help`  
→ `--infile` = “RaidSimRequest in protojson format”; `--outfile` optional (stdout default).

Version stamp: separate spawn of `version` (same file, lines 29–33, 78).

### Request construction

1. **Skeleton** — `data/presets/ret/p2.raid-sim-skeleton.json` (golden `RaidSimRequest`). Invariants checked by `scripts/check_raid_sim_skeleton.py` against `…individual-sim-settings.json` + `vendor/wowsims/ret_default.apl.json` (buffs/debuffs/party buffs/encounter + APL keys; bare finger enchants).
2. **Compose** — `compose(skeleton, { name, race, equipment })` (`packages/core/src/compose.ts`):
   - `structuredClone` skeleton;
   - **deletes** `simOptions` and `requestId` (lines 26–27) so cache keys stay pre-injection (PLAN.md §7 / R6);
   - sets `raid.parties[0].players[0].name`, `.race`, `.equipment = { items: … }` only (lines 37–39);
   - does **not** touch talents, rotation, consumables, professions, buffs, encounter, `database`, etc.
3. **ItemSpec JSON shape** — `toProtoItem` (`compose.ts` 45–50): empty slot `{}`; else `{ id }`, optional `enchant` only if truthy, optional `gems` only if `length > 0`.
4. **Runner injection** — before spawn, sets `simOptions: { iterations, randomSeed: String(seed), debugFirstIteration: false }` (`cli-sim-runner.ts` 39–46).

### Equipment for baseline / candidates (`rank.ts`)

- Baseline: WCL gear → `equipmentFromLoggedGear` → meta-repair gems → `compose` (lines 149–184).
- Candidate: `equipmentForCandidateSwap` → `swapItemAt` + `repairMeta` (lines 357–390, 392–412):
  - **Same item id:** keep worn gems; copy enchant only if worn had one and `isEnchantable(itemId)`.
  - **New item id:** `fillCandidateGems` (EP fill with hit/expertise weights zeroed in `candidate-gems.ts`); same enchant copy rule.
- Race defaults to `"RaceHuman"` if `RankInput.race` omitted (`rank.ts` 153). Professions are **not** read from the log (`disclosure.ts` “professions-excluded”).

### Result fields we read

From outfile JSON (`cli-sim-runner.ts` 58–84):

| Field | Use |
|--------|-----|
| `error.type` | Throw unless missing/`ErrorOutcomeNone` |
| `iterationsDone` | Must equal requested iterations |
| `raidMetrics.dps.avg` | DPS |
| `raidMetrics.dps.stdev` | Stdev → ranking SE = stdev/√n |
| `version` stdout | Stamped on observation |

We do **not** read per-player metrics, logs, or encounter metrics.

### Skeleton contents (observed)

Command: `python` inspect of `data/presets/ret/p2.raid-sim-skeleton.json` (2026-07-28).

- Top-level: `raid`, `encounter`, `simOptions`, `requestId`, `type: SimTypeIndividual`.
- Player 0 has talents, `retributionPaladin`, full APL under `rotation` (type labeled `TypeSimple` but APL keys present — PLAN.md / verification-log measured APL as load-bearing), consumables (pots/flask/food/sappers/scrolls + menu arrays), `profession1: Engineering`, `profession2: Blacksmithing`, player buffs, empty-ish `cooldowns` / `itemSwap` / `bonusStats`.
- **No** `player.database`.
- Equipment is preset gear (many slots enchanted); compose **replaces** the whole `equipment.items` array with the player vector, so preset item rows are not left in place for ranking.

Sample hand-composed fixture: `test/fixtures/slamaltman.raid-sim-request.json` — same shape (no `database`; Eng+BS; logged gear with explicit enchants/gems).

---

## 3. Upstream invoke path

**Tag/commit:** `v0.0.101` / `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` under `.scratch/wowsims-tbc-new-src/`.

### CLI

| Piece | Location |
|--------|-----------|
| Entry | `cmd/wowsimcli/cli_main.go` — `sim.RegisterAll()` then `cmd.Execute` |
| Subcommands | `cmd/wowsimcli/cmd/root.go` — `version`, `sim`, `decodelink` |
| `sim` | `cmd/wowsimcli/cmd/basic_sim.go` |
| `decodelink` | `cmd/wowsimcli/cmd/decode_link.go` |

`sim` behavior (`basic_sim.go`):

1. Read infile bytes; `protojson.Unmarshal` into `proto.RaidSimRequest` with `DiscardUnknown: true`.
2. **Require** `simOptions` non-nil (fatal otherwise).
3. `core.RunRaidSimConcurrentAsync(input, reporter, "cmd-raid-sim")`.
4. Marshal final `RaidSimResult` with `EmitUnpopulated: true` to outfile/stdout.

`decodelink`: base64+zlib after `#` → `IndividualSimSettings` (or `RaidSimSettings` if URL contains `/raid/`) → protojson to stdout. **Not** a sim run.

DB: makefile builds wowsimcli with `--tags=with_db` (e.g. lines 189 / 197 / 199). `sim/core/database_load.go` (`//go:build with_db`) loads full `assets/database` into the process-global maps via `addToDatabase`.

### UI / worker

| Piece | Location |
|--------|-----------|
| Build request | `ui/core/sim.ts` — `makeRaidSimRequest` (246–262), `getModifiedRaidProto` (207–243) |
| Full run | `runRaidSim` → `workerPool.raidSimAsync` or concurrent WASM path |
| Gear-swap lightweight | `runRaidSimLightweight` (306–357) — overwrites player 0 equipment + `player.database = gear.toDatabase(this.db)` |
| Player proto | `ui/core/player.tsx` `toProto` — embeds `database` unless `forExport` (1436–1446) |
| CLI JSON export | `ui/core/components/individual_sim_ui/exporters/individual_cli_exporter.tsx` — `makeRaidSimRequest` then **deletes** `players[0].database` |
| WASM / web server | `sim/wasm/main.go`, `sim/web/main.go` — also `RegisterAll()`; wasm makefile target builds **without** `with_db` (makefile ~121–123) |

`makeRaidSimRequest`:

```text
raid = getModifiedRaidProto()
encounter = encounter.toProto()
RaidSimRequest { requestId, type, raid, encounter, simOptions{ iterations, randomSeed, debugFirstIteration: true } }
```

`getModifiedRaidProto` (before every normal sim):

- `raid.toProto(false, true)` → each player `toProto` includes **`database`** (not export).
- Per player: lookup gear; if inactive meta → strip meta gem; if **not** Enchanter → `withoutEnchanting()` (clears finger enchants); then `extendPlayerProtoWithMissingEffects` (fills consumable/spell-effect rows **into** `player.database` when present — `utils.ts` 1336–1367).

Individual UI settings (`IndividualSimSettings`) live in `individual_sim_ui.tsx` `toProto` / `fromProto` (share link / localStorage). Running a sim always goes through `Sim.makeRaidSimRequest`, not through feeding `IndividualSimSettings` to the CLI.

### Item swap in the gear picker (enchants/gems)

`selector_modal.tsx` ~172–178: if a piece is already equipped, replacing the **item** calls `equippedItem.withItem(item)`; else `new EquippedItem({ item })` (no enchant).

`equipped_item.ts` `withItem` (139–167): keep previous enchant **only if** `enchantAppliesToItem`; reorganize existing gems into new sockets (match color then eligible); does **not** EP-fill empty sockets from a palette.

`asSpec` (285–291): `enchant: this._enchant?.effectId` (undefined → protobuf default **0**); gems always mapped with `gem?.id \|\| 0` (empty sockets as **0**).

Go apply (`sim/core/database.go` `NewItem` 437–444): `if itemSpec.Enchant != 0` look up effect; missing/0 → no enchant. Unknown enchant id is skipped (panic commented out).

### IndividualSimSettings vs RaidSimRequest

| | IndividualSimSettings | RaidSimRequest |
|--|----------------------|----------------|
| Share link / `decodelink` | Yes | No |
| `wowsimcli sim` | No | Yes |
| UI run | Lifted via live `Sim` state → `makeRaidSimRequest` | Direct |
| Our preset pipeline | Committed `*.individual-sim-settings.json` + APL → golden `*.raid-sim-skeleton.json` (PLAN.md §8.2; check script) | Runtime patch name/race/equipment only |

---

## 4. Diff table

| Field / behavior | Our path | UI path | Risk |
|------------------|----------|---------|--------|
| Transport | Native `wowsimcli sim` infile/outfile | WASM/worker binary protobuf | Low if request equivalent |
| Item DB | Embedded in CLI (`with_db`); request has no `database` | Per-player `SimDatabase` on request; WASM without `with_db` | Low for catalog items on pinned CLI; high if we ever pointed WASM at our JSON without `database` |
| Patched fields | name, race, equipment only | Full player + raid hygiene every run | **High** — preset world vs user UI |
| Talents / APL / buffs / consumes / encounter | Frozen in skeleton | Live UI state | **High** for absolute DPS / ordering |
| Professions | Skeleton Eng+BS; not from log | Live `profession1/2`; strips ring enchants if not Enchanter | Medium if rings enchanted without Enchanting |
| `simOptions.debugFirstIteration` | `false` | `true` | Low (cost/logging; **untested** DPS impact) |
| `requestId` | Stripped in compose; not required by CLI | Set for async/abort | None for CLI |
| Empty enchant | Omit field in JSON | Often serialize as `0` via `ItemSpec.create` | None — Go treats both as no enchant |
| Enchant on item replace | Copy worn enchant id if `isEnchantable(newId)` | Copy only if `enchantAppliesToItem` | Medium — wrong enchant stats on incompatible item (**hypothesis**) |
| Gems on item replace | New id → EP `fillCandidateGems`; same id → preserve | Preserve/reorganize worn gems; empty → 0 | **High** for upgrade/downgrade confusion |
| Inactive meta | `repairMeta` on baseline and after swap | Strip inactive meta before sim | Medium if repair differs from strip |
| Weapon imbues | Standing assumption: WCL temp enchant omitted; skeleton consumables as frozen | `adjustImbues` on lightweight gear path when weapon type changes | Low–medium for weapon swaps |
| Tanks / target dummies | Skeleton: absent/`None` | From raid settings | Low for ret individual |
| Result used | `raidMetrics.dps.avg/stdev` only | Full `RaidSimResult` + UI metrics | None for ranking math |
| Race | Input or default Human | UI selection | Medium if wrong race vs Blood Elf preset expectations |

---

## 5. Enchant & gem handling (including missing enchant)

### Ticket `.scratch/carry-forward/issues/14-carry-missing-enchant-on-swap.md`

**Claim in ticket:** if worn slot has no enchant, candidate can still sim **with** an enchant (skeleton/default left in place).

**What the code does today**

1. `swapItemAt` only sets `out.enchant` when `spec.enchant && isEnchantable(itemId)` (`rank.ts` 408–410). Worn bare → no `enchant` on the new `SimItemSpec`.
2. `toProtoItem` only emits `enchant` when truthy (`compose.ts` 48).
3. `compose` **assigns** `slot.equipment = { items: player.equipment.map(...) }` — full replace, not a merge with skeleton items (`compose.ts` 39).
4. Upstream Go: enchant applied only if `itemSpec.Enchant != 0` (`database.go` 437–444). No “default enchant” registration found in CLI `sim` path.

**Conclusion from primary sources:** skeleton equipment enchants should **not** survive onto a candidate when the worn slot is bare. The ticket’s “leave skeleton/default enchants” mechanism is **not** supported by current `compose`/`swapItemAt`. Remaining explanations for the user symptom are **hypotheses** (wrong observation row, older build, comparing to UI profile that has enchants, gem-fill DPS mistaken for “enchanted,” etc.) — see §6.

**When worn **has** an enchant:** we copy the effect id onto enchantable candidates (same spirit as UI `withItem`, weaker applicability check). UI clears enchant explicitly via enchant tab `withEnchant(null)` (`selector_modal.tsx` 222–224).

**Gems:** UI pads empty sockets with `0`; we omit empty `gems` arrays or include `0`s from the filler. Go accepts both. Candidate **new** items get palette EP fill; UI does not auto-fill from EP on picker replace.

**Phase 0 note:** `docs/phase0-findings.md` described an eligibility-aware **synthesis** policy (fill missing eligible enchants from preset on baseline **and** candidates alike). Current `packages/core/src` has **no** such synthesizer in the rank path — only copy-on-swap. Synthesis is historical policy text, not live behavior.

---

## 6. Ranked hypotheses — “upgrade shows as downgrade”

Grounded in the diff. All are **hypothesis** / **untested** against a named wrong ranking row unless noted.

1. **Candidate gem fill hurts a real upgrade** — New item gets `fillCandidateGems` (hit/expertise EP zeroed); worn baseline keeps log gems. Bad fill / broken socket bonus / meta interaction after `repairMeta` → negative Δ. *Related confirmed history:* same-item used to always re-fill (`.scratch/handoffs/same-item-delta-diagnosis.md`); same-id preserve is now in tree — **different-id** fill is still the asymmetry.
2. **Preset APL/buffs/consumes/encounter ≠ what the user compares in the UI** — Standing assumption (`disclosure.ts`). Close BiS swaps reorder under wrong raid buff or rotation. **Untested** per row.
3. **Incompatible enchant copied** — Worn enchant id applied because `isEnchantable` is true, but UI would have dropped it via `enchantAppliesToItem`. Candidate sims with wrong (or extra) enchant stats. **Untested**.
4. **Race default Human** while character/UI is Blood Elf (or vice versa) — Racials change absolute DPS and can flip tight comparisons. **Untested** without checking `RankInput.race` on the bad run.
5. **Professions / ring enchants** — Skeleton Eng+BS; UI would strip finger enchants without Enchanting. Unlikely for ret BiS rings (usually unenchanted) but possible for crafted enchanter profiles. **Untested**.
6. **Missing-enchant “inflation” (ticket #14)** — Candidate has an enchant while worn does not. **Not explained by current compose/swap**; if reproduced on tip, treat as a bug hunt with JSON dumps (§7), not as confirmed skeleton leak.
7. **wowsimcli vs UI engine mismatch** — Same `RegisterAll` + raid sim; CLI has full DB, UI sends subset DB. For normal catalog gear on pinned `v0.0.101`, **unlikely** as primary cause (**hypothesis**: low priority).

---

## 7. Recommended next experiments (cheapest falsifiers)

Exact commands from repo root `C:/Users/dgree/Code/lulz/tbc-gear-prio`. Prefer dumping request JSON over re-ranking the full pool.

### A. Prove/falsify bare-slot enchant leak (ticket #14)

1. Take baseline equipment from a known character (or fixture).
2. Build one candidate swap for a slot whose worn `enchant` is absent; write `compose(...)` output to disk (small `tsx` probe, or extend existing `.scratch/probe-belt-*.ts` pattern).
3. Assert swapped slot has **no** `enchant` key; other slots unchanged.
4. Optional: run CLI:

```bash
vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe sim --infile /path/to/cand.json --outfile /path/to/cand.out.json
```

If `enchant` is absent in infile and DPS still looks “enchanted,” compare to the same request with an explicit known enchant id — **hypothesis** would then move to engine/DB, not compose.

### B. Gem-fill vs preserve (upgrade-as-downgrade)

1. For a named “should be upgrade” item id, dump candidate equipment gems vs worn.
2. Re-sim twice: (1) our filled gems; (2) worn gems reorganized / empty sockets only — same enchant rules.
3. If (2) flips sign of Δ, gem fill is the cause.

Diag precedent: `npx tsx .scratch/diag-same-item-gems.ts` (same-item; already documented).

### C. Preset vs UI parity

1. In wowsims UI, load the same gear + export CLI JSON (`IndividualCLIExporter` — strips `database`).
2. Diff against our `compose` output (ignore `simOptions` / `requestId`).
3. Fields that differ outside equipment are preset-freeze gaps.

### D. Enchant applicability

Pick a worn enchant + candidate item where `enchantAppliesToItem` is false upstream but `isEnchantable` is true; dump whether we still emit `enchant`.

### E. Race

Re-rank one wrong row with `RankInput.race` set to the character’s actual race; compare Δ sign.

### F. Binary sanity

```bash
vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe version
# expect: v0.0.101
python scripts/check_raid_sim_skeleton.py --spec ret --tier p2
```

---

## 8. Sources

| Source | Role |
|--------|------|
| `data/wowsims.lock.json` | Pin tag `v0.0.101`, commit `8aa378b…` |
| `.scratch/wowsims-tbc-new-src/` | Sparse working tree of that commit (**do not commit**) |
| `packages/core/src/seams/cli-sim-runner.ts` | Our spawn + result parse |
| `packages/core/src/compose.ts` | Patch surface |
| `packages/core/src/rank.ts` | Swap / gem / enchant / compose loop |
| `packages/core/src/candidate-gems.ts` | EP gem fill |
| `packages/core/src/disclosure.ts` | Standing assumptions |
| `packages/core/src/slots.ts` / `logged-gear.ts` | WCL → ItemSpec |
| `data/presets/ret/p2.raid-sim-skeleton.json` | Golden request |
| `scripts/check_raid_sim_skeleton.py` | Skeleton drift checks |
| `test/fixtures/slamaltman.raid-sim-request.json` | Sample composed request |
| `vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe` | Pinned CLI |
| `PLAN.md` §5.3, §8.2 | Designed seams |
| `docs/verification-log.md`, `docs/phase0-findings.md` | Historical measurements / synthesis policy text |
| `.scratch/carry-forward/issues/14-carry-missing-enchant-on-swap.md` | Missing-enchant ticket |
| `.scratch/handoffs/same-item-delta-diagnosis.md` | Same-item gem-fill diagnosis |
| Upstream `cmd/wowsimcli/cmd/basic_sim.go` | CLI sim |
| Upstream `cmd/wowsimcli/cmd/decode_link.go` | Share-link decode |
| Upstream `ui/core/sim.ts` | UI request build + hygiene |
| Upstream `ui/core/player.tsx` | `database` embedding |
| Upstream `ui/core/proto_utils/equipped_item.ts` | `withItem` / `asSpec` |
| Upstream `ui/core/components/gear_picker/selector_modal.tsx` | Picker equip behavior |
| Upstream `ui/core/components/individual_sim_ui/exporters/individual_cli_exporter.tsx` | Strips `database` for CLI |
| Upstream `sim/core/database.go` / `database_load.go` | Enchant apply + `with_db` load |
| Upstream `sim/core/character.go` | Merges `player.Database` if present |
| Upstream `makefile` | `with_db` on wowsimcli; wasm without |

**Clone note:** created for this research under `.scratch/wowsims-tbc-new-src/`; leave untracked / do not land.
