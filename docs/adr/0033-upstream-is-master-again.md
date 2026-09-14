# ADR-0033 — Upstream is `master` again; the pin follows the merged reforge work

**Status:** accepted
**Date:** 2026-09-14
**Related:** [`ADR-0030`](0030-build-from-feature-backend-reforge-on-both-pins.md) (Decision 1 superseded here, Decision 2 kept), `PLAN.md` §8, §9; tickets `.scratch/carry-forward/issues/354-sync-wowsims-check-misreports-drift-on-a-ref-pin.md` (closed here), `357-build-from-source-can-leak-a-git-worktree-registration.md` (closed here), `390-bulk-screen-fixture-api-v14-is-now-the-live-version.md` (filed here)

## Context

ADR-0030 pinned both the engine (`data/wowsims.lock.json`) and the fork
(`data/wowsims-fork.lock.json`) to a commit on upstream's
`feature/backend-reforge`, because the reforge work this repo depends on lived
only on that branch.

On 2026-09-13 upstream merged that branch to `master` as PR #385
(`3163bcfaf791ed9818463e07fa6ba438c0099d6e`) and **deleted the branch**. The
premise of ADR-0030 Decision 1 — that the work is reachable only from a feature
branch — no longer holds, and the deletion actively broke
`sync_wowsims.py --check`, whose watched ref could no longer be resolved.

Measured at execution, 2026-09-14:

- `master` tip is `17a8fb28c5ad14b649acecdaacd488594048f467`, three commits past
  the PR-385 merge (`compare/3163bcf...master` → `{ahead:3, behind:0}`).
- The old engine pin `ec5c5f2` is 82 ahead / 0 behind `master` — a
  fast-forward-shaped move, not a divergence.
- A dry-run merge of `17a8fb2` into the fork conflicts in exactly two files,
  `package-lock.json` and `sim/hunter/item_sets.go`. Pinning the merge commit
  `3163bcf` instead gives the **identical** conflict set, and the three commits
  after it touch none of the fork's 13 modified upstream files — one of them is
  upstream correcting `current_version_number` 15 → 14, which pinning `3163bcf`
  would freeze at the wrong value.

## Decision

### 1. Both pins name `master` tip `17a8fb28c5ad14b649acecdaacd488594048f467`

The watched ref is `master`. This supersedes ADR-0030 Decision 1's branch name;
the rest of that decision — one commit named by both pins, engine first, fork
second — is unchanged.

`--watch-ref` was a keyed upsert with no removal path, so the deleted
`feature/backend-reforge` entry could not be dropped without hand-editing the
lock, which no gate would see. `sync_wowsims.py --unwatch-ref --ref <name>` is
that removal path, added here.

### 2. `wowsimcli` is still built from source — and the tag trigger has now fired

ADR-0030 Decision 2 (build from source rather than downloading a release zip) is
**kept**, and its reproducibility proof re-run here: two builds of
`17a8fb28…` produced the identical
`sha256=9f37d916472d3a2bb49051051f5e9a7a1a74f649ddca129e02aa9bb4c5d363ea`.

ADR-0030's trigger for revisiting this was: move to the first tag whose
`gh api repos/wowsims/tbc-new/compare/3163bcf...<tag> --jq .behind_by` is `0`,
then restore the zip download path.

**That trigger now fires.** Upstream cut `v0.0.137` between this chunk's
planning and its execution; `v0.0.137` resolves to
`17a8fb28c5ad14b649acecdaacd488594048f467` — the same commit as the `master` tip
— and `compare/3163bcf...v0.0.137` gives `{ahead:3, behind:0}`.

It is recorded here and **deliberately not acted on**. Restoring the zip
download path is a separate decision with its own scope (it changes how every
fresh clone obtains the binary, and `fetch_wowsimcli.py`'s release path has not
been exercised since ADR-0030). The pin stays a sha, built from source, until
that decision is taken on its own terms.

### 3. `--check` on a sha pin compares against its watched ref

`do_check` was written for tag pins: it called `latest_tag()` unconditionally and
compared the pin against it, so a sha pin reported `new release available`
forever and read `CURRENT_PHASE` from a commit the pin may never contain (ticket
354). Tags are cut from `master`, and a sha pin's own ref need not be an ancestor
of any tag.

A sha pin now compares against the sole entry in `watchedRefs` and reads the
content tier from **that** tip. The release tag is still printed, as an
informational line rather than drift, so the Decision 2 trigger above stays
visible on every run. An unresolvable watched ref appends drift instead of
raising — the state this repo was in between the branch deletion and this ADR.

"Sole" is enforced rather than assumed (ticket 392). `--watch-ref` refuses a
second, differing ref and names the `--unwatch-ref` that would free the slot;
refreshing the ref already watched still works, since that is how its recorded
tip moves. If a hand-edited lock holds more than one, `--check` reports that the
comparison cannot be resolved instead of picking a ref by JSON key order.

**`pnpm verify` does not run `sync_wowsims.py --check`.** The verify chain ends
at `upstream-drift:warn`, which exits 0 on every branch by design. A green
`pnpm verify` says nothing about the pin state; the `--check` line is a separate
manual command and belongs in the execution record on its own.

## Consequences

1. `sync_wowsims.py --check` exits 0 saying `in sync.` again, for the first time
   since the branch deletion.
2. The fork branch `feat/upgrades-tab` now contains the upstream merge. **The
   fork commit is not pushed**: `data/wowsims-fork.lock.json` carries
   `pushed: false`, and the push is an owner-authorised act.
3. That gap is real and unguarded. No gate checks whether a fork commit was
   pushed — `git ls-remote` appears in no executable file and the `pushed`
   boolean has no code readers — so a core branch can merge to `dev` while its
   pin names a fork commit that exists on one disk. ADR-0030 Consequence 4
   accepted this risk; it still applies, and `ls-remote` remains the only proof.
   `docs/agents/upstream-catch-up.md` records the push-and-verify order.
4. `current_version_number` drops 15 → 14 with this pin, which is upstream's own
   correction. Ticket 390 records that two test files hold `api-v15` as a
   self-contained literal and that `api-v14` is their deliberate cache-miss
   sentinel — latent, not breaking, because fixtures key on a commit sha.

5. **One-handed weapons lose Two-Handed Weapon Specialization's damage bonus.**
   This pin corrects an upstream bug: `sim/paladin/talents.go` changed
   `applyTwoHandedWeaponSpecialization` from `AddStaticMod` to `AddDynamicMod`
   gated on `GetMainHandType() == proto.HandType_HandTypeTwoHand`, with a
   `RegisterItemSwapCallback`. The **old** engine granted that talent's damage
   bonus regardless of main-hand weapon type; the new one grants it only to a
   genuinely two-handed main hand. The fix is **upstream's**, not this repo's.

   Measured across the two pins on the committed ret P2 skeleton at 25000
   iterations with the committed seed, both pins exactly deterministic:

   - Two-handed main hand (what this project actually sims): **-0.67 DPS against
     a 3-sigma band of 3.11** — unchanged within resolution. Three designed
     single-item swaps that keep a 2H main hand are likewise all in band.
   - One-handed main hand: **-80.35 DPS against a band of 2.16**
     (1512.944 → 1432.590). Reproduced by a second, unrelated one-handed weapon
     to within 0.002 DPS, with a fresh two-handed weapon as an in-band null
     control.

   Consequence for this project: **ret rankings produced on the new pin score
   one-handed weapons roughly 80 DPS lower relative to two-handed than the old
   pin did.** Any ret ranking previously published that compared 1H against 2H
   was inflated on the 1H side. Rankings that only ever compared two-handed
   weapons are unaffected within resolution.

   This is recorded as an **accepted upstream fix, not a defect** — no ticket is
   filed for it. Its stated limits: native CLI transport rather than the tab's
   WASM build; ret only; and nothing isolating the other engine changes listed
   below, each of which moved in the same range and none of which was simmed.
   Upstream's own committed `TestRetribution-Average-Default` moves
   1937.80314 → 1938.75168 (+0.95), inside noise; its `AllItems` rows run at
   **20 iterations** and cannot separate an engine change from RNG, so they are
   not per-item evidence.

   The measurement above was made with `wowsimcli-windows.exe` built from each
   pin — `vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/`
   and `vendor/wowsimcli-17a8fb28c5ad14b649acecdaacd488594048f467-win32-x64/` —
   against the committed input `data/presets/ret/p2.raid-sim-skeleton.json` at
   **25000 iterations** with seed **443754031**, which makes each pin exactly
   deterministic. Baseline (2H main hand): 1909.9763 → 1909.3043, a change of
   −0.672 against a 3σ band of 3.107. One-handed main hand, swapping in 35110
   (Brutal Gladiator's Waraxe): 1512.9438 → 1432.5899, −80.354 against a band of
   2.161; the independent second one-hander 35101 (Slicer) gives −80.3555,
   differing by 0.0016. The in-band single-item swaps were 34247 (Apolyon, 2H),
   34472 (trinket), 34561 (feet), with 33465 (Staff of Primal Fury, 2H) as the
   null control. A fuller working note lives at
   `.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md`, which is
   gitignored — everything needed to re-run the measurement is above.

   **Other engine changes in the same range, present but unmeasured.** No DPS
   magnitude is claimed for any of these; they are recorded so a later reader
   chasing a ranking shift has the candidate list. Seal of Vengeance goes from 15
   to 20 PPM (`sim/paladin/seals.go`, `NewStaticLegacyPPMManager`), a 33%
   proc-rate rise on a seal whose damage scales with weapon speed, so it moves
   fast-versus-slow weapon value for ret. `ItemSetJusticarArmor` 2pc and
   `ItemSetLightbringerArmor` 4pc flip `SpellMod_DamageDone_Pct` → `_Flat`
   (`sim/paladin/item_sets.go`) — these are **set bonuses on ranked items**, not
   talent bookkeeping. A proc-suppression pass runs across ranked gear: seals and
   their judgements gain `SpellFlagSuppressEquipProcs` (`sim/paladin/seals.go`),
   the two Skyfire metagems gain `SpellFlagsExclude: SpellFlagSuppressEquipProcs`
   and `ClassSpellsOnly` (`sim/common/tbc/metagems.go`), and Mongoose,
   Executioner, Deathfrost, Despair, Blinkstrike, World Breaker and Syphon of the
   Nathrezim gain `SpellFlagsExclude: SpellFlagSuppressWeaponProcs` — while The
   Twin Blades of Azzinoth excludes `SuppressEquipProcs` rather than
   `SuppressWeaponProcs` (`sim/common/tbc/enchants.go`,
   `sim/common/tbc/items_weapons.go`; 63 insertions, 31 deletions across the
   two). In `sim/paladin/talents.go`, `applyImprovedSealOfRighteousness`,
   `applyHealingLight` and `applyImprovedHolyShield` convert `DamageDone_Pct` →
   `DamageDone_Flat`, and `applyBenediction` and `applyPurifyingPower` convert
   `PowerCost_Pct` → `PowerCost_Pct_Add`.

   Source for this list:
   `git -C vendor/tbc-new-fork diff ec5c5f205e61049d730e460967f8488774a7fe2a 17a8fb28c5ad14b649acecdaacd488594048f467 -- sim/paladin/seals.go sim/paladin/item_sets.go sim/paladin/talents.go sim/common/tbc/metagems.go sim/common/tbc/enchants.go sim/common/tbc/items_weapons.go`
   (the fork clone is gitignored; the same range is readable from any clone of
   `wowsims/tbc-new`).

6. **Upstream's own P3 BiS reference sets moved for two specs.** Three gear-set
   files changed in this range and `data/wowsims.lock.json` carries their new
   sha256 values. Mage P3 ranged goes `32363` → `28783` in both
   `mage_p3_staff.gear.json` and `mage_p3_sword.gear.json`; shadow priest P3
   (`shadow_p3.gear.json`) moves ranged `29982` → `32343` and neck `30666` →
   `35319` (with gem `32196`). `35319` is one of the three Season 3 Vindicator
   items upstream reclassified phase 4 → 3 in the same range, so the two data
   corrections are connected rather than independent. The committed universes
   follow upstream faithfully: the `bisTags` / `bisSets` entries in
   `mage-p3/p4/p5` and `shadow-p3/p4/p5` move onto the new ids. No other class's
   gear sets changed in this range. Source:
   `git -C vendor/tbc-new-fork diff ec5c5f205e61049d730e460967f8488774a7fe2a 17a8fb28c5ad14b649acecdaacd488594048f467 -- ui/mage/dps/gear_sets/ ui/priest/dps/gear_sets/`.

7. **Open item, not taken here:** `packages/core/test/fixtures/synthetic-roster-recordings.json`
   is still stamped `simVersion ec5c5f2`. A green `pnpm verify` therefore proves
   nothing about engine behaviour at the new pin — the recordings answer for the
   old engine. Re-recording that fixture is a separate decision nobody has taken.
