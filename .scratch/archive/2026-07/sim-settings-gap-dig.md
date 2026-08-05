# Sim-settings gap dig — evidence (slamaltman / tip)

**Date:** 2026-07-28  
**Branch tip:** `phase-1/five-seed-spread` @ `5474912` (“Migrate worn gems onto candidate items instead of full EP re-gem.”)  
**Question:** What is still wrong (or looks wrong) such that a real upgrade can show as a downgrade — beyond vibes from the CLI-vs-UI research note.  
**Pin:** `wowsimcli` `v0.0.101` (`data/wowsims.lock.json`)

Probe artifacts: `.scratch/probe-sim-gaps/`  
Probe scripts (untracked, not product code): `dump-and-ab.ts`, `extra-ab.ts`

---

## 1. Executive summary

On tip, for slamaltman’s offline WCL gear, the two named “should be upgrades” are still upgrades under every gem policy we tried. Belt of One-Hundred Deaths stays about **+14 to +32 DPS** vs baseline; Torch of the Damned stays about **+38 DPS** (no sockets, so gem policy does not matter). **Gem fill does not flip these two into downgrades.**

What *is* broken or badly mismatched:

1. **Race default is Human; the frozen ret skeleton and the user’s wowsims JSON are Blood Elf.** Rank reports for slamaltman ran as Human. Absolute baseline differs by **~40 DPS** (Human higher). Weapon-type interactions with the Human sword racial change *how large* a mace upgrade looks, without flipping Torch negative in this fixture.
2. **Compose only patches name / race / equipment.** Everything else (talents, APL, buffs, consumes, professions, encounter, …) is the skeleton. That world matches the user’s raid/party/debuff/encounter *and* talents/professions in the import we have — but **not** rotation shape: skeleton carries a full APL block that the IndividualSimSettings export does not. Stripping that APL was previously measured to collapse DPS from ~2043 → ~674.
3. **Tip gem policy (migrate worn + fill empties) is live and confirmed** for the belt: worn Bold Living Ruby + Pulsing Amethyst are kept; no empty sockets left to EP-fill. Old full-EP fill (Bold Crimson Spinel ×2) is still ~5.5 DPS better than migrate for this belt — and that full-EP number is exactly what the older rank reports recorded.
4. **User website gear ≠ offline pipeline gear** (cloak, trinket order, several gem fills). Comparing a UI import A/B to an offline rank row is comparing different characters’ kits.

Same-item “I am a downgrade of myself” was a real bug; tip preserves same-id gems and the P3 universe report now shows those worn rows at **Δ = 0**. Remaining “upgrades look like downgrades” for *new* items is **not** reproduced by belt/torch on this fixture under tip gem migrate. The largest confirmed *settings* landmine for wrong absolute / wrong relative weapon ordering is **race**.

---

## 2. Confirmed broken or suspicious gaps (ranked)

### 1. Race: tip/rank default Human vs skeleton + UI Blood Elf — **confirmed**

| Source | Race |
|--------|------|
| `rank.ts` when `RankInput.race` omitted | **`RaceHuman`** |
| `data/presets/ret/p2.raid-sim-skeleton.json` player | `RaceBloodElf` |
| `data/presets/ret/p2.individual-sim-settings.json` | `RaceBloodElf` |
| `.scratch/wowsims-import/slamaltman-before-user.json` | `RaceBloodElf` |
| `test/fixtures/slamaltman.raid-sim-request.json` | `RaceHuman` (hand-composed Phase 0) |
| `.scratch/rank-reports/slamaltman-p3-universe.json` assumptions | `RaceHuman` |

Measured (3000 iter, seed 42, same equipment):

| Race | Baseline DPS |
|------|----------------|
| Human (tip default) | **2042.85** |
| Blood Elf (skeleton / UI) | **2003.26** |
| Absolute gap | **−39.59** Blood Elf vs Human |

Lionheart Executioner is a **sword**; Torch of the Damned is a **mace**. Human sword racial applies on the worn sword baseline and drops when you swap to a mace. Measured Torch Δ: Human **+37.87**, Blood Elf **+43.64**. Still an upgrade both ways; Human **understates** the mace upgrade vs a Blood Elf UI profile.

**Plain English:** the ranker silently treats the character as Human. The preset and the user’s wowsims profile are Blood Elf. That changes absolute DPS a lot and nudges weapon comparisons; it is a real settings bug relative to “match the UI / skeleton,” not a gem bug.

### 2. Tip migrate+fill vs old full EP fill — **confirmed behavior; does not flip belt/torch sign**

Tip `swapItemAt` (different item id): `migrateGemsToItem` then `fillEmptyCandidateGems`.

Belt 30106 vs worn Endless Pit 28779 (both yellow+blue sockets):

| Policy | Waist gems | Δ DPS vs Human baseline |
|--------|------------|-------------------------|
| tip migrate + fill empty | `[24027, 31118]` Bold Living Ruby + Pulsing Amethyst | **+26.46** |
| migrate only (no fill) | same | **+26.46** (no empties) |
| full EP fill (old) | `[32193, 32193]` Bold Crimson Spinel ×2 | **+31.98** |
| empty holes | `[0, 0]` | **+14.34** |
| matched epic (optional UI file) | `[32193, 32211]` Bold + Sovereign | **+29.40** |

Notes:

- Full-EP **+31.980601…** bit-matches `.scratch/rank-reports/slamaltman-p3-*.json` belt row → those reports were generated under **old full EP fill**, not tip migrate.
- UI folder `.scratch/wowsims-import/slamaltman-after-100deaths.json` also uses Bold×2 — the old pipeline fill story, not migrate.
- Socket bonus on 30106 is **+3 Agility** only if colors match; migrate (red on yellow + purple on blue) and Bold×2 both fail a full color match. Matched epic still loses to Bold×2 in this sim (**+29.40 vs +31.98**).

Torch 32332: no sockets; all gem policies identical; enchant **2673 Mongoose** copied from Lionheart. Δ **+37.87** Human / **+43.64** Blood Elf.

**Plain English:** gem policy still changes belt DPS by tens of points, but for these two famous upgrades it never goes negative. “Upgrade looks like downgrade” is **not** explained by tip migrate for belt/torch on this character.

### 3. Frozen non-equipment world vs UI export — **mostly same buffs; rotation packaging differs**

Compose patches **only** `name`, `race`, `equipment` (`packages/core/src/compose.ts`). Never touched:

- Player: `talentsString`, `rotation`, `consumables`, `profession1/2`, `buffs`, `bonusStats`, `cooldowns`, `itemSwap`, `healingModel`, `distanceFromTarget`, `reactionTimeMs`, `retributionPaladin`, `class`, `apiVersion`
- Raid: `buffs`, `debuffs`, `parties`, `numActiveParties`
- Encounter (entire object)
- Top-level: `type` (`SimTypeIndividual`); `simOptions` / `requestId` stripped in compose (runner re-injects options)

Diff skeleton player vs `.scratch/wowsims-import/slamaltman-before-user.json` player (equipment/name ignored):

| Field | Skeleton | UI import | What it controls |
|-------|----------|-----------|------------------|
| `race` | BloodElf | BloodElf | Racials (Human sword skill / BE Arcane Torrent, etc.) — **rank overwrites to Human** |
| `talentsString` | same | same | Talent tree |
| `profession1/2` | Eng + BS | Eng + BS | Profession perks; UI also strips ring enchants if not Enchanter |
| `consumables` active ids | same pot/flask/food/sappers/scrolls | same | What you actually drink/eat |
| `consumables.potions` / `conjuredItems` menus | present | absent | UI dropdown lists; **inert for ret APL** (PLAN.md) |
| `buffs` / raid / party / debuffs / encounter | **byte-same** as UI import | same | Raid world and fight profile |
| `bonusStats`, `cooldowns`, `itemSwap`, … | empty / same | same | Extra fake stats, CD APL hooks, mid-fight gear swap |
| **`rotation`** | `TypeSimple` **plus** full APL (`prepullActions`, `priorityList`, `groups`, `valueVariables`) from pinned `ret_default.apl.json` | `TypeSimple` + `simple` only (**no APL keys**) | What abilities fire. APL block is **load-bearing** on CLI |

Measured earlier (`docs/verification-log.md`, 2026-07-27, same binary/fixture family):

| Rotation variant | DPS |
|------------------|-----|
| Skeleton (TypeSimple + APL) | ~2042.85 |
| Prepull stripped | ~789 |
| Only `type` + `simple` (no APL) | ~673.74 |
| TypeAPL or vendor APL alone | ~2042.85 |

**Plain English:** if someone feeds the **website JSON import** into a mental model of “what the UI sims,” that file does **not** carry the APL the CLI skeleton uses. Live UI may still run a simple rotation path without those APL keys — absolute DPS will not match our CLI. Buffs/consumes/talents/professions in the import we have **do** match the skeleton; race matches skeleton but **not** tip rank.

### 4. Pipeline gear ≠ user UI gear — **confirmed (settings-adjacent)**

From `.scratch/wowsims-import/README.md` (re-checked against dumps):

| Slot | User before | Offline slamaltman baseline |
|------|-------------|------------------------------|
| Back | Razor-Scale Battlecloak `30098` | Drape of the Dark Reavers `28672` |
| Trinkets | Brooch / DST | DST / Brooch (swapped) |
| Head / chest / waist gems | differ | see README |

So “UI says belt is +X” vs “offline rank says +Y” can disagree even with identical belt gem policy.

### 5. Enchant copy weaker than UI — **hypothesis, not hit on belt/torch**

We copy worn enchant id if `isEnchantable(newId)`. UI uses `enchantAppliesToItem`. Belt: neither waist is enchantable; no enchant on worn or candidate. Torch: Mongoose copied; both 2H weapons. No evidence here of phantom enchants (ticket #14 skeleton-leak story remains unsupported — compose replaces full `equipment.items`).

### 6. Same-item gem wipe — **fixed on tip**

Prior diagnosis: same id always EP-refilled → worn pieces looked like ± upgrades of themselves. Tip preserves same-id gems; universe report worn rows for Endless Pit / Bladespire / Crystalforge / Gizmatic / Stranger show **Δ = 0**.

### 7. UI-only hygiene we never run — **low for this ret profile**

Upstream UI before sim: strip inactive meta; strip finger enchants if not Enchanter; embed `player.database` (CLI uses `with_db` instead). Slamaltman rings unenchanted; professions Eng+BS. Not implicated for this fixture.

---

## 3. Experiment results (commands + numbers)

### Commands

```bash
# Tip compose dumps + gem-policy A/B (Human + Blood Elf baselines / tip race flip)
npx tsx .scratch/probe-sim-gaps/dump-and-ab.ts

# Matched epic belt gems + Cataclysm's Edge sword racial check
npx tsx .scratch/probe-sim-gaps/extra-ab.ts

# Binary
vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe version
# → v0.0.101
```

All sims: **iterations=3000**, **seed=42**, offline slamaltman gear via `equipmentFromLoggedGear` + ret P2 skeleton.

### Dumped requests (after compose)

| File | Role |
|------|------|
| `.scratch/probe-sim-gaps/baseline-human.req.json` | Tip-default race |
| `.scratch/probe-sim-gaps/baseline-bloodelf.req.json` | Skeleton/UI race |
| `.scratch/probe-sim-gaps/belt-100deaths-tip-migrate-fill.req.json` | Tip gem path |
| `.scratch/probe-sim-gaps/torch-of-the-damned-tip-migrate-fill.req.json` | Tip weapon swap |
| `.scratch/probe-sim-gaps/equipment-compare.json` | Gem/enchant summaries |
| `.scratch/probe-sim-gaps/ab-results.json` | DPS table |
| `.scratch/probe-sim-gaps/extra-ab.json` | Matched gems + Edge |

**Migrate on tip (belt):** worn `[24027, 31118]` → candidate `[24027, 31118]`; enchant absent both sides; `isEnchantable(30106) === false`.

**Torch:** enchant `2673` carried; gems empty both sides.

### A/B DPS (vs same-race baseline)

| Case | Race | DPS | Δ |
|------|------|-----|---|
| Baseline | Human | 2042.85 | 0 |
| Baseline | Blood Elf | 2003.26 | 0 |
| Belt tip migrate+fill | Human | 2069.31 | **+26.46** |
| Belt full EP | Human | 2074.83 | **+31.98** |
| Belt migrate only | Human | 2069.31 | **+26.46** |
| Belt empty | Human | 2057.19 | **+14.34** |
| Belt tip migrate+fill | Blood Elf | 2051.19 | **+47.94** |
| Belt matched epic `[32193,32211]` | Human | — | **+29.40** |
| Torch (any gem policy) | Human | 2080.72 | **+37.87** |
| Torch tip | Blood Elf | 2046.90 | **+43.64** |
| Cataclysm’s Edge `30902` | Human | — | **+24.38** |
| Cataclysm’s Edge | Blood Elf | — | **+26.34** |

Torch remains ahead of Cataclysm’s Edge under both races on this fixture.

### Professions (tip rank)

Skeleton + UI import + composed dumps: **Engineering + Blacksmithing**. Not read from WCL (`disclosure.ts` `professions-excluded`). Matches user import; not a slamaltman-specific mismatch.

---

## 4. Next cheapest falsifiers (if still unclear)

1. **Name the row that still looks like a downgrade** (item id + rank HTML/JSON). Re-dump that one candidate’s request on tip; do not generalize from belt/torch.
2. **Re-rank slamaltman with `RankInput.race: "RaceBloodElf"`** and diff top weapons / belts vs Human report — cheap check that race reorders close rows.
3. **UI live run vs CLI:** export CLI JSON from Individual CLI exporter (strips `database`) after loading the same gear, or decode a share link; diff non-equipment fields against `compose` output. Especially confirm whether the live UI player proto includes APL keys when type is Simple.
4. **Item with more sockets than worn** (e.g. 3-socket chest replacing 2-socket): tip fill-empty will EP-fill the extra hole — A/B migrate-only vs tip vs full EP for a known BiS piece.
5. **Enchant applicability trap:** pick a candidate where `isEnchantable` is true but upstream `enchantAppliesToItem` is false; assert whether we still emit `enchant`.
6. **Do not** keep chasing ticket #14 skeleton enchant leak without a dump showing `enchant` on a bare worn slot — compose evidence says that mechanism is gone.

---

## 5. Sources

| Source | Role |
|--------|------|
| Tip `packages/core/src/rank.ts` (`swapItemAt`, race default) | Product path |
| `packages/core/src/migrate-gems.ts`, `candidate-gems.ts` | Migrate + fill-empty |
| `packages/core/src/compose.ts` | Patch surface |
| `packages/core/src/disclosure.ts` | Standing assumptions |
| `data/presets/ret/p2.raid-sim-skeleton.json` | Frozen RaidSimRequest |
| `test/fixtures/slamaltman.raid-sim-request.json` | Phase 0 Human compose fixture |
| `.scratch/wowsims-import/*` | User IndividualSimSettings (Blood Elf) |
| `.scratch/rank-reports/slamaltman-p3-universe.json` | Prior Human + full-EP belt Δ |
| `.scratch/handoffs/wowsims-cli-vs-ui-sim-path.md` | Prior CLI vs UI map |
| `.scratch/handoffs/same-item-delta-diagnosis.md` | Same-item gem wipe (fixed) |
| `docs/verification-log.md` (2026-07-27 APL section) | APL load-bearing measurement |
| `.scratch/probe-sim-gaps/*` | This dig’s dumps and numbers |
| Upstream `.scratch/wowsims-tbc-new-src/ui/core/proto_utils/equipped_item.ts` | UI `withItem` / enchantAppliesToItem |
| `vendor/wowsims/db.json` | Item sockets / weaponType / enchant names |

**Claims above cite either a re-runnable command in §3 or a committed/scratch path.** Speculative leftovers are labelled hypothesis in §2 / §4.
