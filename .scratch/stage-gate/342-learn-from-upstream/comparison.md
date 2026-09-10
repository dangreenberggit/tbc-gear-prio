# Upstream comparison for the four kept features (ticket 342)

Fork HEAD: `6d0edd69d237e725de8ec5d034c28aa10171bd21` (`feat/upgrades-tab`), working tree clean at read time.
Upstream ref: `origin/feature/backend-reforge` @ `cbf6b75a889e52c4106351976db66efd914ea349`, equal to `watchedRefs["feature/backend-reforge"].commit` in `data/wowsims.lock.json` and an ancestor of the fork HEAD. Every upstream claim below is stamped to this commit.
E-W3 status: **ran and passed** — `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` on Node 22.16.0 reports `1 passed | 1 skipped (2)`; the passing test is "the ported fork engine reproduces this repo's ranked deltas" and the skipped entry is only the placeholder `it.skip` that fires when the fork's protos are absent. On the default `C:\Program Files\nodejs\node.exe` (v20.18.1) the suite fails to collect with `Error: No such built-in module: node:sqlite`; `package.json` requires `node >=22.5.0`, so every parity claim in this document was measured on Node 22.16.0.

Scope note: this is a read-and-compare pass. Upstream code is reference material only (ADR-0025); nothing here imports from or re-pins upstream.

## Summary

Two of the four features are keep-as-is. Two produced a real finding, and both are ticketed rather than implemented, because each changes `rankUpgrades` control flow — the plan's size rule sends those to a ticket.

| Feature | Verdict | Outcome |
| --- | --- | --- |
| F1 multi-slot best-of | adopt + note | ticket 350 (two-hander does not clear the off hand) |
| F2 per-swap gem/meta repair | adopt + note | ticket 351 (weapon-stone imbue does not follow the candidate weapon) |
| F3 per-request item-database injection | keep-as-is | nothing adopted; our adapter *is* upstream's single-sim path |
| F4 resumable-Stop partial work | keep-as-is | nothing adopted; ours retains strictly more |

The concurrency question is handed to ticket 344 with no verdict, per that ticket's own request to coordinate.

Both findings are latent correctness bugs in the *engine*, not in the fork port alone: F1's missing off-hand clear and F2's absent imbue adjustment are present identically in `packages/core/src/rank.ts` and in the fork copy. Neither is a case where upstream is merely tidier — each is a rule upstream applies that we do not.

## Where the code is

Fork paths are relative to `vendor/tbc-new-fork/`; `U/` abbreviates `ui/core/components/individual_sim_ui/upgrades/`. Line numbers observed at fork HEAD `6d0edd69d` (see the header) — locate by symbol, not by line, since these drift.

| Feature | Ours | Upstream (@ `cbf6b75a8`) |
| --- | --- | --- |
| F1 | `U/engine/pool.ts:simSlotsForPoolSlot` (303), `itemFitsSimSlot` (275), `DUAL_WIELD_SPECS` (251); `U/engine/rank.ts:mainHandIsOneHanded` (588), `attemptEligibility` (771), `runCandidate` (968) | `sim/core/bulk/weapons.go:getAllWeaponCombos` (78), `weaponComboMatchesSettings` (180), `matchesWeaponTypeFilter` (169); `generator.go:initGroupedSlotPairs` (192), `populateItemsForCombo` (291), `buildGearForCombo` (268); `slots.go:isSecondaryItemSlot` (124), `getBulkItemSlotFromSlot` (128); `item_keys.go:dedupeCandidateOptions` (45); commit `bb4e77528` "Fix 2x2H and 2H+OH bug" |
| F2 | `U/engine/rank.ts:candidateSwapWithRepairs` (2004), `swapItemAt` (2026), `metaPreferenceDisclosure` (2052), `fillOptsForSwap` (2059), `applyRepairedGems` (2083); `U/engine/meta-repair.ts`; `U/engine/candidate-gems.ts`; `U/engine/enchants.ts:enchantAppliesToItem` (27) | `sim/core/bulk/item_rules.go:replaceItem` (10), `createSelectedItem` (28), `applyMetaGem` (45), `enchantAppliesToItem` (72), `getEligibleEnchantSlots` (92), `getEligibleItemSlots` (107), `canEquipItem` (124); `weapons.go:adjustWeaponImbueID` (36), `adjustCandidateImbues` (58), `isSharpWeaponType` (15), `isBluntWeaponType` (24) |
| F3 | `U/adapters/sim_database.ts:simDatabaseFor` (35); `U/engine/rank.ts` `Deps.simDatabaseFor` (170), `composeFor` (490), `composeForBulk` (527) | `ui/core/components/individual_sim_ui/bulk/utils.ts:makeBulkItemDatabaseFromSpecs` (108), `makeBulkGearDatabase` (59); `ui/core/sim.ts:makeBulkBaseRequest` (326), the merge at (332) and (530); `ui/core/proto_utils/database.ts:mergeSimDatabases` (430) |
| F4 | `U/engine/rank.ts` abort checks (1213, 1216, 1221, 1229, 1246) and the `if (aborted)` partial return (1413); `PartialRanking` in `U/engine/types.ts`; `upgrades_tab.tsx` Stop wiring (945, 1322, 1726) | `ui/core/wasm/bulk_sim/batch.ts` abort checks (58, 102, 133); `index.ts` abort returns (76, 115, 151); `reforge.ts:buildBulkSimReforgeRequest` (193) and its `aborted` branch (74) |
| Concurrency | `U/engine/promise-pool.ts:promisePool`; tests `packages/core/test/promise-pool.test.ts` | `ui/core/wasm/bulk_sim/batch.ts:101` (`queue` from `async`, imported at line 1) |

## F1 — Per-item multi-slot best-of

### What each side enumerates

Ours resolves a *placement list* per pool slot and keeps the single best placement. `simSlotsForPoolSlot` (`pool.ts:303`) returns `["finger1","finger2"]`, `["trinket1","trinket2"]`, and for `weapon` either `["mainhand","offhand"]` when the spec is in `DUAL_WIELD_SPECS` (rogue, enh, warrior, hunter — `pool.ts:251`) or `["mainhand"]` otherwise. `itemFitsSimSlot` (`pool.ts:275`) then filters by the candidate's own hand type: the off hand is an allowlist (`HandTypeOneHand | HandTypeOffHand`), the main hand is everything except `HandTypeOffHand`. `runCandidate` (`rank.ts:968`) sims each surviving placement and keeps the max-delta one, recording `slotChoice` only when more than one placement existed.

Upstream enumerates *combinations* over a whole selected item set. `initGroupedSlotPairs` (`generator.go:192`) builds all unordered ring and trinket pairs, skipping `Unique` same-id pairs and same non-zero `LimitCategory` pairs; `getAllWeaponCombos` (`weapons.go:78`) emits `[2H, nil]` per two-hander, the MH×OH cross product, and for dual-wielders both orderings plus `[x,x]` when two copies were selected.

The structural difference is the whole story: **ours changes exactly one equipment index per candidate** (`swapItemAt`, `rank.ts:2032`, maps over `equipment` and rewrites only `slotIndex`), so there is no combination space. Upstream's `Unique`/`LimitCategory` pair exclusions, its `weaponCopyCounts` gate and its ordering logic have no counterpart in ours because they answer a question we never ask.

Cases upstream handles that we do not — two new rings at once, MH+OH both new, the same non-unique ring in both fingers — are all one-row-per-item consequences, and the second is already a recorded scope decision: `attemptEligibility`'s `wornAt` guard (`rank.ts:812`) blocks the legal second-copy row, with the comment at `rank.ts:800-811` explaining that relaxing the guard alone would not produce the row honestly (the best-across-slots fold would overwrite the worn item's identity row) and pointing at tickets 308 and 309. That is settled, not a gap.

### Does `bb4e77528` describe a bug we also have

Partly — and the half we have is real.

The commit has two halves. It deleted a `playerIsFuryWarrior` branch that emitted `[2H_i, 2H_j]` (a two-hander in each hand), and it added a defensive clear in `buildGearForCombo`:

```go
if mh := gear.GetItemBySlot(proto.ItemSlot_ItemSlotMainHand); mh != nil && mh.HandType == proto.HandType_HandTypeTwoHand {
    gear[proto.ItemSlot_ItemSlotOffHand] = core.Item{}
}
```

The **2x2H half cannot reach us.** `itemFitsSimSlot` bars a two-hander from `offhand` (the allowlist admits only `HandTypeOneHand`/`HandTypeOffHand`), and `swapItemAt` writes one index, so no code path assembles a weapon pair.

The **2H+OH half does reach us.** Our only hand-compatibility guard is one-directional (`rank.ts:791`):

```ts
if (slotName === "offhand" && !mainHandIsOneHanded) return { kind: "skip" };
```

with `mainHandIsOneHanded` (`rank.ts:588`) reading the worn main hand once off the immutable baseline. That guard fires only when the *candidate* targets the off hand. The mirror case is unguarded: for a dual-wield spec currently wearing 1H + off-hand, a two-handed candidate passes `itemFitsSimSlot("mainhand")` (main hand excludes only `HandTypeOffHand`), passes `attemptEligibility` (the slot name is `mainhand`, so line 791 never fires), and `swapItemAt` writes the two-hander into the main-hand index **while leaving the worn off-hand item in place**. The composed request then describes 2H + off-hand — the illegal gear upstream's clear now defends against.

The same shape is in core, though **spelled differently**: `packages/core/src/rank.ts` has no `attemptEligibility` function at all (grep returns zero hits) — it has `mainHandIsOneHanded` at 728, the same guard inlined in the `runCandidate` slot loop as `if (slotName === "offhand" && !mainHandIsOneHanded) continue;` at 920, and the one-index `swapItemAt` at 2089. So the gap is engine-wide rather than a port artifact, but anyone fixing it should grep for the condition, not the function name.

Whether the fork's equip logic silently drops the off hand, counts both, or rejects the set is not measured here. Either way the request is not the gear the row claims to price, so two-hander rows for a dual-wielding character are unsound.

The fix is a design call, not a mechanical port, which is why this is ticketed. Copying upstream's clear would make the row a *two-item* swap (losing the off hand's stats) priced under a one-item row — precisely the semantics the codebase already rejected for the mirror case at `rank.ts:785-790` ("prices a two-item swap under a one-item row: the delta would silently include losing the two-hander, which is not what the row claims"). Consistency with that recorded position argues for **skipping** the attempt instead, mirroring the existing off-hand skip. Ticket 350 holds the decision.

### Deduplication of identical placements

Upstream dedupes twice: `dedupeCandidateOptions` (`item_keys.go:45`) collapses options per bulk slot by `buildItemSpecKey` (`{id, randomSuffix}`, ignoring enchant and gems), with `initWeaponCopyCounts` (`generator.go:185`) snapshotting counts *before* the collapse so `[x,x]` combos survive; and `buildItemSpecFingerprintKey` (`item_keys.go:28`, keyed on `{id, randomSuffix, enchant, gemsHash}`) is used in `initSelectedItems` to decide whether a user-added item duplicates an equipped one.

Ours has no analogue and needs none: the pool is one entry per item id and `runCandidate` emits at most one row per item, so two placements of the same item are *compared*, never deduped. The nearest thing is `attemptEligibility`'s `wornAt` guard suppressing the worn item's second placement.

**Verdict: adopt + note** — the ring/trinket best-of, the off-hand eligibility guard, the `HandTypeMainHand` exclusion and the absence of a dedup pass are all either equivalent to upstream or deliberate documented scope decisions (tickets 308/309), so the feature stays as it is. The note is the second half of `bb4e77528`: `attemptEligibility` (`rank.ts:771`) guards the off-hand direction only, so a two-handed candidate entering `mainhand` leaves a worn off-hand item in the composed request, in both `U/engine/rank.ts` and `packages/core/src/rank.ts`. Ticketed as 350 rather than implemented, because both candidate fixes — skip the attempt, or clear the slot and re-price — change which rows `rankUpgrades` produces for dual-wield specs, which the size rule sends to a ticket.

## F2 — Per-swap gem/meta repair

### What each side carries over and validates

Upstream's `replaceItem` (`item_rules.go:10`) starts from the worn item's spec and then overwrites id and random suffix; carries the enchant **but validates it**, zeroing it when `enchantAppliesToItem` fails (`item_rules.go:15-17`); and **does not carry gems** — `applyMetaGem` (45) returns a zero array sized to the new item's sockets, copying only the meta gem, and only when both worn and new item are `ItemTypeHead`. The comment at `item_rules.go:37-44` says why: the gem/reforge pre-pass re-gems every candidate anyway.

Ours does strictly more on gems and the same on enchants. `swapItemAt` (`rank.ts:2026`) migrates the worn gems onto the new item (`migrateGemsToItem`) and fills only what migration left empty (`fillEmptyCandidateGems` with `fillOptsForSwap`), then `candidateSwapWithRepairs` runs `repairAndMinimize` across all 17 slots and writes back via `applyRepairedGems`. Enchant carry-over is validated by the same predicate upstream uses — `U/engine/enchants.ts:enchantAppliesToItem` (27) is a thin bridge onto upstream's own `proto_utils/utils.ts` predicate, not a reimplementation.

So on gems and enchants we are at parity or ahead, and the gem difference is a deliberate documented divergence (`candidate-gems.ts:294-303` keeps every worn gem and explicitly warns against moving toward upstream's re-gem button).

### The rule we lack: weapon-stone imbues

`adjustWeaponImbueID` (`weapons.go:36`) rewrites the Adamantite sharpening/weightstone pair to match the equipped weapon: sharpening stone (29453) for Axe/Dagger/Polearm/Sword (`isSharpWeaponType`, 15), weightstone (34340) for Fist/Mace/Staff (`isBluntWeaponType`, 24), and **0** when neither family fits — no weapon, a shield, or an off-hand-only item. `adjustCandidateImbues` (58) applies it to both hands per candidate. Upstream's own comment at 56-57 states the intent: "mirroring the frontend auto-switch so bulk sim combos use the correct stone."

We have no counterpart, and our enchant carry-over cannot cover it, because **a weapon stone is not an enchant in our data model** — it is a consumable (`Consumables.mhImbueId`). `enchantAppliesToItem` answers only whether a *permanent* enchant effect id is legal on an item.

The field that would differ is `raid.parties[0].players[0].consumables.mhImbueId`, not the ItemSpec's `enchant`. Verified directly: `compose` (`packages/core/src/compose.ts`) `structuredClone`s the skeleton, deletes `simOptions` and `requestId`, and writes only `slot.name` (45), `slot.race` (46), `slot.equipment` (47) and optionally `slot.database` (48). Consumables pass through untouched from the pinned skeleton, identically for baseline and every candidate.

And a skeleton does pin a stone. Of the two skeletons in `data/presets/`, feral p2 carries `"mhImbueId": 34340` (Adamantite **Weightstone**, the blunt one) and ret carries no imbue field at all. Measured against the committed `data/items/index.json`, using the `WeaponType` values from the generated `packages/core/src/proto/common_pb.ts` (Axe 1, Dagger 2, Fist 3, Mace 4, OffHand 5, Polearm 6, Shield 7, Staff 8, Sword 9):

| Universe | weapon entries | sharp (wrong stone) | blunt (correct) | off-hand (should be 0) |
| --- | --- | --- | --- | --- |
| feral-p2 | 36 | 7 (Dagger) | 22 (Mace 11, Staff 9, Fist 2) | 7 |
| feral-p3 | 56 | 12 | 33 | 11 |
| feral-p4 | 66 | 16 | 39 | 11 |
| feral-p5 | 86 | 23 | 50 | 13 |

So on the feral path a dagger candidate is priced holding a weightstone that does not match its weapon family, and an off-hand candidate keeps a stone upstream would zero. The other specs are safe only because their skeleton carries no imbue field — an accident of which two presets exist, not a property of the pipeline.

**The engine's handling makes this concrete, and not in the direction a first reading suggests.** Established by reading the fork's engine after the first draft of this section (the domain review of this branch forced the check):

- The **generic** path treats the two stones as near-identical and never inspects weapon type. `registerStaticImbue` (`sim/core/consumes.go:683`) gives 29453 (694) and 34340 (720) the same `MeleeCritRating +14` and `+12` auto-attack base damage; the only in-switch difference is the sharpstone's ranged-crit correction at 718, which is inert for a melee-only character.
- That generic path does not even run for the feral preset's main hand: `consumes.go:81` gates it on `partyBuffs.WindfuryTotem == TristateEffectMissing`, and the feral p2 skeleton pins `"windfuryTotem": "TristateEffectImproved"`.
- **The druid sim has its own second stone implementation, and it hardcodes one id.** `sim/druid/forms.go:51-56`:

  ```go
  func (druid *Druid) weaponImbueFlatDamage() float64 {
      if druid.Consumables.MhImbueId == 34340 { // Adamantite Weightstone
          return 12
      }
      return 0
  }
  ```

  `GetCatWeapon` (58) and `GetBearWeapon` (72) fold that into the unscaled main-hand damage *before* dividing by swing speed, so it lands as roughly `12 / swingSpeed` per paw swing. Verified: `34340` occurs exactly once in `sim/druid/` and `29453` occurs **zero** times, added by fork commit `db05fed93` — "fix adamantite weightstone not giving paw damage".

The consequence is the ranking-relevant one, and it exists **today, without any fix**: for a feral, a blunt candidate (weightstone-eligible) and a sharp candidate are not merely priced with a mismatched stone — with the stone pinned at 34340 they are priced under the *same* id and so the same model, but the moment anything makes the stone follow the weapon, sharp candidates lose the paw bonus that blunt candidates keep. So the two possible states are "all candidates share one stone and one model" (today) and "sharp and blunt candidates use different damage models" (after adopting upstream's rule). Neither is obviously right, and the choice is not ours alone to make: if a sharpstone and a weightstone give the same melee bonus in TBC, then `forms.go` omitting 29453 is a fork-engine bug and fixing *that* is what makes upstream's rule safe to adopt.

Ticket 351 carries both questions and deliberately puts the TBC rule and the `forms.go` omission ahead of any plumbing on our side.

Note that `disclosure.ts:54-58` already reasons about this class of thing and its reasoning does **not** cover this case: it argues a *missing* temporary enchant is harmless because it is "constant across baseline and candidates, so deltas survive". Here the imbue is present and pinned while the weapon under it changes family — constant-across-candidates is the bug, not the mitigation. That disclosure text should be revisited alongside the fix.

Not re-compared: `socketBonusActive` and the meta/socket-bonus predicates against `reforge_optimizer/gear.go` — ADR-0025 covers those.

**Verdict: adopt + note** — the gem and enchant handling stays as it is (ours carries and repairs more than upstream, deliberately, and shares upstream's own enchant predicate). The note is the weapon stone: upstream keeps it matched to the equipped weapon's type family in two places — `adjustWeaponImbueID` (`weapons.go:36`) on the bulk path, and `Player.setGear` (`ui/core/player.tsx:713`) on every gear change through the UI, which is the "frontend auto-switch" the Go comment says it mirrors — and our engine passes through neither, because it composes from a pinned skeleton and never touches consumables. Ticketed as 351 rather than implemented, on two grounds. First the size rule: a per-candidate consumables override changes the composed-request contract that the loop, `composeForBulk` and the package path all share, and moves `test/fixtures/shredzepelin-cat.raid-sim-request.json`, so it is control flow plus a new fixture. Second, and more important, **the fix is not yet known to be an improvement** — `sim/druid/forms.go:51-56` grants the paw-damage bonus for id 34340 only (`29453` appears nowhere in `sim/druid/`), so making the stone follow the weapon would rank sharp and blunt feral candidates under different damage models. Whether that fork-engine omission or our missing adjustment is the real defect is the question ticket 351 puts first. No DPS figure was measured on either side.

## F3 — Per-request item-database injection

Our adapter is not a reimplementation of upstream's path; it *is* upstream's single-sim path. `U/adapters/sim_database.ts:simDatabaseFor` (35) calls `Database.getSync()`, `db.lookupEquipmentSpec(spec)`, then `SimDatabase.toJson(gear.toDatabase(db))` — so the row building is literally `BaseGear.toDatabase` (`ui/core/proto_utils/gear.ts:145`), the same helper upstream attaches to every normal page sim via `toProto`/`makeRaidSimRequest`.

Upstream's *bulk* helper `makeBulkGearDatabase` (`bulk/utils.ts:59`, reached through `makeBulkItemDatabaseFromSpecs` at 108) builds the same five repeated fields from the same `Database` singleton, with two differences: it dedupes by semantic key (`id`, `effectId`, `ilvl`) where `Gear.toDatabase` uses `distinct` with the default comparator after proto conversion, and its `itemEffectRandPropPoints` sweeps every `item.scalingOptions[*].ilvl` where ours covers only the equipped ilvl. For TBC `scalingOptions` is effectively a single entry, so the sets coincide in practice, but upstream's is the wider one by construction.

Could our adapter call the upstream helper instead? No, on two counts. **Signature**: `makeBulkItemDatabaseFromSpecs(db, baselineGear, itemSpecs)` wants a baseline `Gear` plus a flat list of loose candidate `ItemSpec`s — the split `makeBulkBaseRequest` has (`sim.ts:329-331`). Our adapter receives one complete gear set as `readonly SimItemSpec[]` (a local structural type in `engine/slots.ts`) and has no baseline/extras split at that layer. **Semantics**: calling it degenerately as `makeBulkItemDatabaseFromSpecs(db, gear, [])` would run `makeBulkGearDatabase`, a different function from `gear.toDatabase(db)` — so the request would *not* stay byte-identical, and the drift (id-keyed dedupe, wider ilvl sweep) is exactly what the byte-identity invariants at `rank.ts:496-503` and the adapter's own doc comment (lines 11-17) exist to protect. `gear.toDatabase(db)` is "what a normal page sim sends"; that is the invariant we want.

Upstream's worker-side assumption does differ, and it is structurally the same idea as ours: it merges into `player.database` once per *base* request (`sim.ts:332`, `sim.ts:530`) over the union of baseline plus every gear set, where we call `simDatabaseFor` per gear set and union the protojson ourselves in `composeForBulk` (`rank.ts:527-559`). One asymmetry worth recording: upstream's `player.database ? mergeSimDatabases(...) : bulkItemDatabase` is *additive onto whatever the skeleton already carried*, whereas `composeForBulk` builds the union from scratch and `compose` overwrites `slot.database` wholesale. That is benign today because our union already includes the baseline gear, but it is a real difference if a skeleton ever carries a database we need to preserve.

`Database.mergeSimDatabases` (`database.ts:430`) *is* reachable and would replace `composeForBulk`'s hand-rolled `JSON.stringify`-keyed field union with semantic-key dedupe, also covering `spellEffects`/`consumables`. Not adopted: the engine handles the database as opaque protojson by design (`rank.ts:170-172` — "the engine never inspects it"), so calling a typed-proto helper from `engine/` would drag `SimDatabase` across the port's layering boundary. That is an architecture change with no defect behind it.

**Verdict: keep-as-is** — nothing adopted. Our adapter already routes through `Gear.toDatabase`, upstream's own single-sim helper, so there is no idiom to borrow; upstream's bulk helper is neither type-reachable from our `SimItemSpec[]` signature nor byte-identical if forced, and swapping it in would break the invariant that a per-candidate browser request matches what a normal page sim sends. `mergeSimDatabases` in `composeForBulk` is reachable but would move typed protos into `engine/`, which the port's layering forbids, for no correctness gain. Two upstream behaviours are recorded above as observations, neither a defect today: the additive-merge asymmetry, and the narrower `itemEffectRandPropPoints` ilvl sweep inherited from `Gear.toDatabase` (a shared wowsims file we must not edit, so matching it is the point).

## F4 — Resumable-Stop partial work

On abort we return a fully shaped result. `rank.ts:1413-1425` builds `PartialRanking = { ...rankingBase, complete: false }`, writes it to the job record and returns it. Every landed row is in `rankingBase.items`, plus one self-identifying placeholder per candidate Stop never reached (`simmed: false`, `rank: null`), so the row count stays the full candidate set and unmeasured rows cannot be mistaken for zero-delta measurements. Substitutions, caps, assumptions, baseline, set bonuses and `screeningFallbacks` all ride along. The one thing a partial never gets is a ranking-cache row — the branch returns before the `store.put(rankingCacheKey(...))` at 1428, and the comment at 1414-1418 marks that as the enforcement rather than a convention. Per-sim rows already landed via `cacheSimResult` inside `runCandidate`, so a re-run resumes cheaply.

Upstream splits retention by artifact kind. Its **reforge pre-pass keeps partial work**: `reforge.ts:74-75` returns `buildBulkSimReforgeRequest(..., true)`, which sets `optimizedCandidates: aborted ? partialOptimizedCandidates : []` (203) so the frontend can still write cache entries (comment at 190-192), and the collector is index-preserving. Its **simming stages discard it**: `index.ts:115` and `index.ts:151` both return `makeAndSendBulkSimError(ErrorOutcomeAborted, onProgress)` with the third argument omitted, so it defaults to `[]` and `stageResult.results`/`latestBaseline` are simply dropped. Only `index.ts:76-78` carries anything, and what it carries is the reforge partial. That asymmetry is coherent: a solved `EquipmentSpec` is complete per candidate and content-keyed, while a mid-stage DPS set is half-baked — the stage machinery culls survivors between stages (`index.ts:140-143`), so a partial stage is not a valid ranking of anything.

Check points, ours: before the screening pass (1213), pre-dispatch filter (1216), initial seed (1221), per-task at dispatch (1229), post-drain re-read (1246, load-bearing — an abort raised while the last task was in flight sets no wrapper flag), and the terminal branch (1413). Upstream: `batch.ts:58` (top of the single-candidate run), `batch.ts:102` (per task), `batch.ts:133` (error escalates to a global abort), `reforge.ts:48/54/59/74`, `index.ts:115/151`.

Three check points upstream has that we lack, and one we have that it lacks:

- **Upstream threads the signal into the worker/sim call itself** (`batch.ts:65,68` pass `signals` into `runConcurrentSim`/`raidSimAsync`). Our `SimRunner` seam takes no signal on the per-candidate path, and `rank.ts:1224-1226` states deliberately that nothing in flight is torn down. We do have the capability on the bulk route (ticket 347 threads `deps.signal` into the screening request), so this is a route asymmetry, not a missing capability.
- **Upstream escalates a candidate error into a global abort** (`batch.ts:133`). We do the opposite on purpose — a panicking candidate is dropped and disclosed in `substitutions` (ticket 122) and the run continues.
- **Upstream checks between retry attempts** (`reforge.ts:54,59`), which has no analogue because we have no two-attempt inner structure.
- **We check before the screening dispatch as a whole** (1213) and turn the post-drain re-read into a *result-shape* decision rather than an error return.

On a cheaper retention shape (observation only — Stop UX is ticket 286's ruling): the tab keeps the partial in memory and deliberately does not render it. `upgrades_tab.tsx:1726-1735` records the ruling verbatim — Stop resets the tab rather than showing a partial table with withheld view controls, the `PartialRanking` stays on state for cheap retention, and `stopped` renders the same empty table as `idle` (substitutions still render, since they describe the abandoned run's inputs). Mapped onto us, upstream's partition already matches where our code sits: our per-candidate `cacheSimResult` rows are the reforge analogue (complete per candidate, content-keyed, written as they land, surviving Stop) and the assembled `PartialRanking` is the stage-results analogue. Upstream's shape therefore argues *for* the 286 ruling, not against it. The one difference worth naming: upstream carries its retained partial on the abort return value itself, so there is one holding place, where we have two (the job store and `this.state`) and nothing reads either.

**Verdict: keep-as-is** — nothing adopted. Ours retains strictly more than upstream's simming path, which discards partial stage results entirely (`index.ts:115/151`), and the one place upstream does retain (`reforge.ts:75` → `index.ts:77`) is the analogue of our per-sim cache, which already survives Stop. Upstream's retain-the-reusable-input / discard-the-half-finished-output split is the same partition our code already draws, and it independently supports ticket 286's ruling. The two upstream check points we lack are recorded above as observations: threading the abort signal into the per-candidate sim call (we have it on the bulk route only), and escalating a candidate error into a global abort (a deliberate opposite, ticket 122).

## Concurrency (hand-off to 344)

No verdict here. Ticket 344 theme 3 owns the fold-or-keep decision for `promise-pool.ts` versus `async.queue`, and asked 342 to coordinate; this section supplies the measurement it needs. **Decision: ticket 344.**

Our two guarantees hold and both are pinned by name:

- **Result-at-index determinism.** `promise-pool.ts` preallocates `new Array(tasks.length)`, each worker captures its index before incrementing the cursor, and writes `results[index] = await task()`. Nothing appends. Pinned by "keys results by input position, not arrival order" (`promise-pool.test.ts:81`), which makes task 0 the slowest and asserts input order out.
- **Lowest-index error wins.** The catch block overwrites the stored error only when `index < firstErrorIndex`, and the pool throws that one. Pinned by "rejects with the lowest-index error, not the first to reject" (line 4) and "surfaces the same error at every pool size" (line 20). The code comment states the reason: a time-ordered winner would make the surfaced error depend on pool size and sim latency.

Does `async.queue` as used at `batch.ts:101-141` provide them?

- **Result-at-index: not from the library — upstream hand-rolls it, then drops it at the boundary.** `async.queue` has no index semantics; upstream carries `idx` in the task payload (`push({ candidate, idx })`, 139) and writes `results[idx] = candidateResult` (135). Two differences from ours: the array is declared `= []` rather than preallocated, so it grows sparsely and `results.length` is meaningless until the highest index lands; and line 141 `.filter(result => !!result)` **compacts** it before returning, so returned positions no longer correspond to input indices. That is safe there only because every consumer keys off `candidate.index` carried inside the payload rather than off array position.
- **Lowest-index error: not as a pool property, but the outcome is recovered at the consumer.** `batch.ts:138-140` races `queue.error()` against `drain()`, which is pure wall-clock with no index tie-break. But the worker does not reject on a candidate error — it inspects `candidateResult.error` and calls `signals.abort.trigger()` (132-133), so the first observed failure stops everything and the multi-rejection case is largely unreachable. Then `index.ts:121` selects the error by `stageResult.results.find(r => r.error)?.error` over the input-index-ordered array, which yields the lowest surviving index's error. So upstream reaches a comparable lowest-index-wins outcome by error-as-data plus an ordered `find` at the consumer, rather than as a guarantee of the pool.

The structural difference in one line, for 344 to weigh: ours makes the pool responsible for both guarantees and tests them there; upstream keeps the pool dumb, carries the index in the payload, selects the error at the consumer, and relies on a first-error global abort to make multi-rejection rare. A fold onto `async.queue` is therefore possible but would move both guarantees out of a tested 69-line unit and into call-site conventions, and would need the `.filter()` compaction replaced to keep result-at-index.

## Adopt verdicts and their disposition

| Verdict | Feature | Classification | Where it went |
| --- | --- | --- | --- |
| adopt + note | F1 two-hander does not clear a worn off hand | **ticket** — changes which rows `rankUpgrades` emits for dual-wield specs | `.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md` |
| adopt + note | F2 weapon stone does not follow the candidate weapon | **ticket** — needs a consumables patch through the composed-request contract plus fixture churn | `.scratch/carry-forward/issues/351-weapon-imbue-does-not-follow-candidate-weapon.md` |

No adoption met the implement-here bar (adapter-only change, a ported engine file with a unit test to extend, or a comment). Both findings are control-flow changes with fixture consequences, so both are ticketed, and no fork engine file was edited by this pass — the PROVENANCE/re-pin cycle was therefore not triggered.
