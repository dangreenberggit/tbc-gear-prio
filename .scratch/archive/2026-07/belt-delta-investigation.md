# Belt ΔDPS investigation — CLI/sim request inputs

**Branch:** `phase-1/five-seed-spread`  
**When:** 2026-07-28  
**Symptom:** Single-slot upgrade Δ for Belt of One-Hundred Deaths (30106) vs Girdle of the Endless Pit (28779) looked low vs an independent wowsims comparison on slamaltman. After Loop 4 gem-fill softcap fix, pipeline prints **~+31.98**. Parent asked whether remaining understatement is still an **input** bug (equipment JSON / compose / gems / enchants / skeleton).

## Root cause

**No remaining equipment/request-input bug for this belt case.**

The earlier understatement (~+23.6) was the Loop 4 gem-fill bug (uncapped hit EP preferred Glinting+Sovereign over Bold×2). After softcap-aware fill, live wowsimcli on the same compose path reproduces the rank report Δ exactly.

Residual gap vs a careful manual comparison is **not** “we send the wrong waist item/gems/enchants.” Likely comparison or known standing differences (see Open questions).

## Evidence

### 1. Exact equipment JSON (compose → wowsimcli)

Command (scratch probe): `pnpm exec tsx .scratch/probe-belt-payload.ts`  
Artifacts: `.scratch/probe-belt-base-req.json`, `.scratch/probe-belt-swap-req.json`

| | Waist payload |
|--|--|
| Baseline | `{"id":28779,"gems":[24027,31118]}` |
| Candidate | `{"id":30106,"gems":[32193,32193]}` (Bold Crimson Spinel ×2) |

All other 16 slots **byte-identical** between baseline and swap. Full composed equipment matches `test/fixtures/slamaltman.raid-sim-request.json` equipment for baseline (`equip equal true`).

No missing permanent enchants vs WCL for this character: every WCL `permanentEnchant` is present on the composed request; waist/neck/trinkets correctly have none (not enchantable in TBC / wowsims `enchants[]`).

No undergemming: every socketed equipped item has `gems.length === socketsFor(id).length` with all ids > 0 (fixture-wide: 0 gem-count mismatches across 25 combatants).

### 2. WCL → equipment path

- `mapWclGearToSim` / `equipmentFromLoggedGear` preserve id, `permanentEnchant` → `enchant`, and gem ids.
- MH `temporaryEnchant: 2639` is **intentionally omitted** (standing assumption `weapon-imbue-omitted`; no effectId→itemId imbue table in pinned `db.json`). Constant across baseline and candidates.
- Compose replaces `player.equipment` wholesale; does not strip gems or drop enchant fields when present. Empty offhand is `{}` (protojson empty ItemSpec).

### 3. Candidate gem fill (already fixed in Loop 4)

`fillCandidateGems(30106, gemsForPhase(3), p2 EP)` → `[32193, 32193]`.

Live wowsimcli (seed 42, 3000 iter, P2 skeleton), Δ vs logged gemmed 28779:

| 30106 gems | Δ DPS |
|--|--|
| Bold×2 (current fill) | **+31.98** |
| Glinting+Sovereign (old fill) | +23.63 |
| Bold+Jagged | +28.33 |
| Delicate×2 | +27.46 |
| Bold+Smooth | +26.24 |

Bold×2 also beats matched/orange layouts on this set. Socket bonus on 30106 is +3 agi (stat[1]); breaking it for two Bolds is correct by live sim.

Meta (32409, min 2R/2Y/2B): baseline active (9/2/3); after Bold×2 swap still active (9/2/2). No silent meta drop.

### 4. Live spot-check (post-investigation, no new code fix)

```
base 2042.8476
swap 2074.8282
delta 31.9806
bare28779 2029.9916
swap vs bare 44.8366
```

Matches rank JSON `deltaDps: 31.9806…` for item 30106. Comparing to **bare** 28779 inflates Δ by ~13 (the logged belt gems).

### 5. Skeleton / non-gear fields

Compose overlays **name, race, equipment only**. Talents / APL / buffs / consumes / encounter stay on pinned `data/presets/ret/p2.raid-sim-skeleton.json` even at `maxPhase: 3` (disclosed). That can change absolute DPS and, modestly, item deltas vs a web session on a different preset — but it is **not** a corrupt equipment payload.

## Files changed

**None** (investigation only). Loop 4 gem-fill fix already in tree:

- `packages/core/src/candidate-gems.ts`
- `packages/core/test/candidate-gems.test.ts`

Scratch probes written/used (untracked): `.scratch/probe-belt-payload.ts`, prior `.scratch/probe-belt-*.ts`.

## Before / after Δ

| Stage | 30106 Δ vs logged 28779 |
|--|--|
| Pre Loop 4 (Glinting fill) | ~+23.6 |
| Post Loop 4 / this recheck | **~+31.98** |
| Same setup vs **bare** 28779 | ~+44.8 (not what rank prints) |

No further Δ move from this investigation (no additional fix).

## Open questions

1. **External comparison baseline** — Did the manual wowsims run replace gemmed Endless Pit, or a bare/under-gemmed belt? Bare comparison alone explains ~+45 vs our ~+32.
2. **External gemming on 30106** — Our fill is Bold×2 and wins the combos tested; a web auto-gem that differs should be diffed against the composed waist JSON above, not against a target DPS number.
3. **Preset mismatch** — Web import on a P3 APL/buffs/consumes profile vs our P2 skeleton can move deltas without any equipment bug.
4. **MH imbue** — Still omitted; if a manual run adds sharpening stone / weightstone, absolute DPS rises. Symmetry says Δ should mostly survive; untested whether Δ shifts materially with imbue present.
5. **Latent WCL gem-hole collapse** — `toItemSpec` filters `id > 0` and can collapse empty middle sockets if WCL ever sends sparse gem arrays. **0 sparse cases** in `slamaltman.raw.json` (147 gemmed slots). Not implicated here; only fix with a real sparse fixture + clarified WCL convention.

## Repro

```bash
pnpm exec tsx .scratch/probe-belt-payload.ts
# optional: compare equipment to golden
node -e "const g=require('./test/fixtures/slamaltman.raid-sim-request.json'); const b=require('./.scratch/probe-belt-base-req.json'); console.log(JSON.stringify(g.raid.parties[0].players[0].equipment)===JSON.stringify(b.raid.parties[0].players[0].equipment))"
```
