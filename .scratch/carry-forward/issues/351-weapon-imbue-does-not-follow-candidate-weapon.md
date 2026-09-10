Status: open
Type: bug
Origin: .scratch/stage-gate/342-learn-from-upstream/comparison.md
Blocks: none
Blocked by: none

# The pinned weapon stone does not follow the candidate weapon's type

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

The feral skeleton pins an Adamantite Weightstone. Weapon candidates are simmed
with that stone whatever they are, so a dagger candidate is priced holding a
stone only blunt weapons can use, and an off-hand candidate keeps a stone
upstream would zero.

The stone lives in `consumables.mhImbueId`, not in the item's `enchant`, and
`compose` (`packages/core/src/compose.ts`) never touches consumables. It
`structuredClone`s the skeleton, deletes `simOptions` and `requestId`, then
writes only `slot.name`, `slot.race`, `slot.equipment` and optionally
`slot.database`. So the skeleton's imbue passes through unchanged for the
baseline and for every candidate alike.

Our enchant carry-over cannot cover this. `swapItemAt` validates the carried
enchant with `enchantAppliesToItem` (`U/engine/enchants.ts`, a bridge onto
upstream's own predicate), but that answers only whether a *permanent* enchant
effect id is legal on an item. A weapon stone is a consumable in our request
model, and nothing in the swap path reads or writes consumables.

## Exposure, measured

Of the two skeletons in `data/presets/`, only feral p2 pins an imbue
(`"mhImbueId": 34340`, Adamantite **Weightstone** — the blunt one); ret carries
no imbue field. The committed fixture
`test/fixtures/shredzepelin-cat.raid-sim-request.json` pins the same value.

Counted from the committed `data/items/index.json`, with `WeaponType` values read
from the generated `packages/core/src/proto/common_pb.ts` (Axe 1, Dagger 2,
Fist 3, Mace 4, OffHand 5, Polearm 6, Shield 7, Staff 8, Sword 9) and the
sharp/blunt split taken from upstream's `isSharpWeaponType`/`isBluntWeaponType`
(`sim/core/bulk/weapons.go`):

| universe | weapon entries | sharp — wrong stone | blunt — correct | off-hand — should be 0 |
| --- | --- | --- | --- | --- |
| feral-p2 | 36 | 7 (Dagger) | 22 (Mace 11, Staff 9, Fist 2) | 7 |
| feral-p3 | 56 | 12 | 33 | 11 |
| feral-p4 | 66 | 16 | 39 | 11 |
| feral-p5 | 86 | 23 | 50 | 13 |

Re-derive with the enum values above against `data/items/index.json` and each
`data/universes/feral-p*.json`'s `entries[].itemId` where `slot === "weapon"`.

Every other spec is unaffected **only because its skeleton carries no imbue
field** — an accident of which two presets exist, not a property of the pipeline.
Adding an imbue to any future skeleton arms this for that spec.

## What the engine actually does with the stone — read this before acting

The counts above say which candidates carry a stone that does not match their
weapon. They do **not** say those candidates are mispriced, and for feral the
naive fix would make things worse. Established by reading the fork's engine:

- **The generic path treats the two stones as near-identical and ignores weapon
  type.** `registerStaticImbue` (`sim/core/consumes.go:683`) gives 29453 (694)
  and 34340 (720) the same `MeleeCritRating +14` and `+12` auto-attack base
  damage. The only in-switch difference is the sharpstone's ranged-crit
  correction at line 718 (`-(14 / PhysicalCritRatingPerCritPercent)`, about
  −0.63% ranged crit), which is inert for a melee-only character. Neither branch
  inspects the equipped weapon's type.

- **That generic path does not run for the feral preset's main hand.**
  `consumes.go:81` reaches `registerStaticImbue` for the MH only when
  `partyBuffs.WindfuryTotem == TristateEffectMissing`, and the feral p2 skeleton
  pins `"windfuryTotem": "TristateEffectImproved"`.

- **The druid sim has a SECOND stone implementation that hardcodes one id.**
  `sim/druid/forms.go:51-56`:

  ```go
  func (druid *Druid) weaponImbueFlatDamage() float64 {
      if druid.Consumables.MhImbueId == 34340 { // Adamantite Weightstone
          return 12
      }
      return 0
  }
  ```

  `GetCatWeapon` (58) and `GetBearWeapon` (72) fold that into the unscaled
  main-hand damage *before* the divide by swing speed, so it arrives as roughly
  `12 / swingSpeed` per paw swing rather than a flat 12. Verified: `34340`
  appears exactly once in `sim/druid/` and `29453` appears **zero** times. Added
  by fork commit `db05fed93` — "fix adamantite weightstone not giving paw
  damage". Nothing in that commit explains why the sharpstone was left out.

### What that means for this ticket

1. **Today, all feral weapon candidates share one stone id and therefore one
   damage model.** The stone is pinned at 34340 for every candidate, so sharp
   and blunt candidates are currently priced alike. There is no live sharp-vs-
   blunt asymmetry from this.
2. **Adopting upstream's rule would create one.** Rewriting a dagger candidate's
   stone to 29453 makes `weaponImbueFlatDamage` return 0, so sharp candidates
   would lose a paw bonus that blunt candidates keep — two candidates in the same
   slot ranked under different damage models. That is a worse failure than the
   mismatch it fixes.
3. **So the fork-engine omission is the thing to settle first.** If a sharpstone
   and a weightstone give the same melee bonus in TBC, `forms.go` omitting 29453
   is a fork bug; fix that and upstream's rule becomes safe to adopt. If they
   genuinely differ for a feral, then the pinned stone is a preset question, not
   a candidate-adjustment question.

What survives unconditionally: our composed request never adjusts the stone
where upstream's does, and off-hand candidates keep a stone upstream would zero.
Whether we should mirror that depends on the answers above.

### Two incidental findings from the same reading

Both are separate from this ticket's question. File them separately if they
matter; they are recorded here so the reading is not lost.

- **Possible double application on the feral path.** `AutoAttacks.MH()` returns a
  pointer to the live weapon (`sim/core/attack.go:205-207`), and
  `applyConsumeEffects` runs after the form aura is registered, so the core
  switch's `+= 12` may mutate a paw weapon that `GetCatWeapon` had already folded
  the bonus into — once scaled, once flat. **Code-reading inference, not
  measured.**
- **Upstream adjusts at the source of truth; we bypass that seam.** This is the
  clearest statement of why we diverge. `Gear.adjustImbues`
  (`ui/core/proto_utils/gear.ts:398`) has three callers in the fork:
  `Player.setGear` (`ui/core/player.tsx:713`), the WASM bulk path
  (`ui/core/wasm/bulk_sim/batch.ts:34`), and `Sim.runRaidSimLightweight`
  (`ui/core/sim.ts:727`, reached from `sim_ui.tsx:358`). The first is the
  important one — its own comment says it corrects the stone "before emitting, so
  that any gearChangeEmitter listener ... sees the corrected value", i.e. every
  gear change through the normal UI re-derives the stone. That is the "frontend
  auto-switch" upstream's Go comment refers to.

  Our engine never goes through `Player.setGear`: it composes a request from a
  pinned skeleton plus a swapped equipment array
  (`packages/core/src/compose.ts`), and `upgrades/adapters/wasm_sim_runner.ts`
  dispatches `raidSimAsync` with no `adjustImbues` call. So the divergence is not
  that upstream added a rule we lack; it is that we bypass the seam where
  upstream applies it. Worth weighing when choosing where our fix belongs — an
  adjustment at the adapter boundary would mirror upstream's placement more
  closely than one inside the engine's swap logic.

## Where it came from

Ticket 342's upstream comparison. Upstream has the rule we lack:
`adjustWeaponImbueID` (`sim/core/bulk/weapons.go`, upstream
`feature/backend-reforge` @ `cbf6b75a8`) rewrites the Adamantite sharpening
stone (29453) / weightstone (34340) pair to match the equipped weapon —
sharpening for Axe/Dagger/Polearm/Sword, weightstone for Fist/Mace/Staff, and
**0** when neither family fits (no weapon, a shield, or an off-hand-only item).
`adjustCandidateImbues` applies it per candidate to both hands. Any other imbue
id passes through untouched.

Upstream's own comment gives the reason: "mirroring the frontend auto-switch so
bulk sim combos use the correct stone." That phrase matters — the Go function is
mirroring behaviour that already exists in the TypeScript frontend, where
`Player.setGear` (`ui/core/player.tsx:713`) re-derives the stone on every gear
change. So this is not a bulk-sim-specific rule; it is upstream keeping one
invariant in two places. See the second incidental finding below for why that
reframes where our fix would belong.

## The existing disclosure does not cover this

`disclosure.ts` already reasons about temporary enchants and concludes they are
harmless: WCL's `temporaryEnchant` is omitted because it is "constant across
baseline and candidates, so deltas survive." That is sound for a *missing*
imbue. It does not hold here, where the skeleton supplies a **present, pinned**
imbue that stays fixed while the weapon under it changes family — constant-
across-candidates is the bug, not the mitigation. The disclosure text should be
revisited alongside the fix so it stops asserting more than it establishes.

## Why this is filed rather than fixed

The predicate is trivial; the plumbing is not.

- `isSharpWeaponType`/`isBluntWeaponType`/`adjustWeaponImbueID` are pure and
  directly unit-testable, and the data is already on hand — `weaponType` is
  projected in `packages/core/src/items.ts` and present in the committed index.
- **The composed-request contract is the cost.** `candidateSwapWithRepairs`
  returns equipment only, and `composeFor` rewrites just name/race/equipment/
  database. Making the imbue follow the candidate means either the swap returns
  a consumables patch alongside its equipment, or `composeFor` grows a
  per-candidate consumables override. Either way the per-candidate loop, the
  bulk screening path via `composeForBulk`, and the set-completion package path
  all have to agree, or the routes drift on what they price.
- **Fixtures move.** `test/fixtures/shredzepelin-cat.raid-sim-request.json` pins
  `mhImbueId: 34340`, so any recorded candidate request for a sharp weapon-slot
  swap changes bytes, and the sharp-weapon case needs a fixture it does not have
  today.

That is control flow plus a new fixture, which ticket 342's size rule sends to a
ticket rather than into that branch.

## What is NOT claimed

- **Not measured in DPS.** Confirmed by reading: the stone does not follow the
  candidate, the field reaches the sim, the counts above are real, and the two
  engine paths behave as described in "What the engine actually does". **Not**
  confirmed: any DPS number, on either side of a change.
- **No ranking is known to be wrong, and the naive fix would make feral worse.**
  On the feral path both stones currently produce the same +12
  (`forms.go:51-56` grants it for the weightstone id, and the generic path is
  windfury-suppressed), so sharp and blunt candidates are priced alike today.
  Applying upstream's rule would zero the bonus for daggers. So this is not a
  "we are underpricing sharp candidates" ticket; it is a "our request does not
  match what upstream's request would say, and the engine's own handling is
  itself suspect" ticket.
- **Not established: that upstream's rule is the right rule for us.** Upstream
  adjusts the stone because its frontend auto-switches. Whether we should mirror
  that, or instead treat `forms.go`'s id-equality check as the defect, is the
  open question this ticket carries.

## What to do

1. **Settle the TBC rule first — it is a reading task, not a sim run.** Do a
   weightstone and a sharpstone give the same melee bonus in TBC? Upstream's own
   `registerStaticImbue` models them identically apart from a ranged-crit
   correction, which says yes for melee. If they are the same for a feral, then
   `forms.go:51-56` granting +12 only for the weightstone id is a **fork-engine
   bug**, and our missing adjustment is cosmetic by comparison. Decide which of
   the two is the real defect before writing any code.
2. **Then decide whether we mirror upstream at all.** Two coherent positions:
   mirror `adjustWeaponImbueID` so our request says what upstream's would (and
   accept that feral daggers lose the +12 until `forms.go` is fixed), or leave
   our request alone and file the `forms.go` id-equality check upstream-side.
   Record the choice and the reason; do not do both silently.
3. **Only if step 2 chooses to mirror**: add the pure predicates in
   `packages/core/src/` with their own unit tests (the intricate-pure-function
   case in AGENTS.md), covering the zero-when-neither-family-fits branch and the
   pass-through for any other imbue id.
4. Decide where the override enters the composed request — swap-returns-a-patch
   or `composeFor` override — and make the loop, `composeForBulk` and the package
   path share one answer.
5. Re-record the affected fixtures and add one for the sharp-weapon candidate.
6. Update the `disclosure.ts` temporary-enchant note so it no longer asserts
   deltas survive in the pinned-imbue case. **Do this regardless of step 2** —
   the note over-asserts either way.
7. If any fork engine file is edited, run the full cycle in
   `docs/agents/known-traps.md` ("Before editing a ported engine file").

If a DPS measurement is wanted for sizing, sim one feral weapon-slot dagger
candidate at `mhImbueId: 34340` versus 29453 — but read the result as "what the
proposed change would cost", not as "how wrong we are today", per the engine
section above.

## Acceptance

- [x] The TBC question is answered and written down: do the two stones give the
      same melee bonus, and is `forms.go`'s id-equality check therefore a
      fork-engine bug?
- [x] A recorded decision on whether to mirror `adjustWeaponImbueID` at all,
      with its reason — including the consequence for feral dagger candidates if
      we do.
- [ ] If we mirror: the imbue follows the candidate weapon's type family
      (including the zero case for off-hand-only items and shields), all three
      compose paths agree, and fixtures are re-recorded.
- [x] The `disclosure.ts` temporary-enchant note no longer asserts deltas
      survive in the pinned-imbue case.
- [x] `pnpm verify` green, E-W3 green on Node >= 22.5.0 (it cannot collect on
      Node 20 — `node:sqlite` is missing).

## Notes

Found by reading, not by a failing test or a bad row. Related: 342 (the
comparison that surfaced this), 350 (the other finding from the same pass), 343
(gem optimizer for candidates — the adjacent "re-tune consumables/gems per
candidate" question, deliberately separate).

## Decision (2026-09-10)

**Q2 answered: the two stones give identical melee bonuses.** In
`vendor/tbc-new-fork/sim/core/consumes.go`, `registerStaticImbue` gives
Adamantite Sharpstone (29453, case at :708) and Adamantite Weightstone (34340,
case at :734) the same `stats.MeleeCritRating +14` and the same `+12` to MH/OH
BaseDamageMin/Max. The only difference is the sharpstone's ranged-crit
compensation at :732, which is inert for a melee-only character.

```
$ grep -n "34340\|29453" vendor/tbc-new-fork/sim/druid/forms.go
52:	if druid.Consumables.MhImbueId == 34340 { // Adamantite Weightstone
```

**Therefore `sim/druid/forms.go:52`'s id-equality check is the defect**, by this
ticket's own step-1 rule: equal melee bonuses in TBC mean granting the paw
bonus for one stone id only is wrong. Filed as **ticket 364**.

**provenance: upstream.** Measured, not inferred. The `upstream` remote
(`https://github.com/wowsims/tbc-new.git`) had never been fetched, so earlier
ancestry checks against the pin's own history could not distinguish upstream
commits from fork-native ones. Fetched and re-measured:

```
$ git -C vendor/tbc-new-fork fetch upstream feature/backend-reforge
 * [new branch]          feature/backend-reforge -> upstream/feature/backend-reforge
$ git -C vendor/tbc-new-fork merge-base --is-ancestor db05fed93 upstream/feature/backend-reforge; echo $?
0
```

`db05fed93` ("fix adamantite weightstone not giving paw damage", Bisonpasfuté,
2026-05-23) is an ancestor of upstream's own branch, so the check reaches us
from upstream rather than being fork-native.

**Decision: do not mirror `adjustWeaponImbueID` on this branch.** With
`forms.go:52` unchanged, rewriting a dagger candidate's stone to 29453 makes
`weaponImbueFlatDamage` return 0, so sharp candidates would lose a paw bonus
that blunt candidates keep — two candidates in the same slot ranked under
different damage models. That is the failure this ticket's "What that means"
item 2 already names, and it is worse than the mismatch it would fix. Steps 3–5
of this ticket stay untaken.

**Done here:** the `disclosure.ts` temporary-enchant note no longer asserts that
deltas survive; it now states that a skeleton-pinned `mhImbueId` is carried
unchanged into every candidate, including weapon candidates of the other stone
family and off-hand items. Corrected in both engine copies with the
ported-engine cycle, and `packages/core/test/disclosure.test.ts` now asserts the
detail names the pinned imbue so the copies cannot drift back.

`Status:` stays `open`: acceptance box 3 is conditional on a future decision to
mirror, which this decision defers rather than settles.
