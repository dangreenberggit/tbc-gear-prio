Status: open
Type: bug
Origin: .scratch/stage-gate/reforge-catchup-leftovers/brief.md
Blocks: none
Blocked by: none

# `sim/druid/forms.go` grants the paw imbue bonus for the weightstone id only

**What is NOT claimed: no DPS number, on either side of a change.** This is a
reading result plus a measured provenance check. Nothing here says how much
feral output moves.

## What

`vendor/tbc-new-fork/sim/druid/forms.go:52` grants the flat paw damage bonus
only when the pinned main-hand imbue is the Adamantite **Weightstone**:

```go
func (druid *Druid) weaponImbueFlatDamage() float64 {
	if druid.Consumables.MhImbueId == 34340 { // Adamantite Weightstone
		return 12
	}
	return 0
}
```

The two Adamantite stones give **identical melee bonuses** in the fork's own
generic path. `registerStaticImbue` (`sim/core/consumes.go:697`) handles
Sharpstone 29453 at case :708 and Weightstone 34340 at case :734, both granting
`stats.MeleeCritRating +14` and `+12` to MH/OH `BaseDamageMin/Max`. The only
difference is the sharpstone's ranged-crit compensation at :732
(`-(14 / PhysicalCritRatingPerCritPercent)`), inert for a melee-only character.

Since the melee bonuses are equal in TBC, granting the paw bonus for one id and
not the other is a defect. `29453` appears zero times under `sim/druid/`.

## provenance: upstream (measured)

The word is right; the **first citation for it was circular** and is corrected
here (pre-merge review of `feat/reforge-catchup-leftovers`).

That first attempt fetched `upstream/feature/backend-reforge` and ran
`merge-base --is-ancestor db05fed93 upstream/feature/backend-reforge` → 0. But
the fetched ref resolves to `ec5c5f2`, which is exactly the lock's
`branchedFrom` — so the test asked "is this commit an ancestor of the commit we
already merged", which was true before the fetch and says nothing about who
wrote it. A property measured against one option is not a comparison
(`AGENTS.md` § Durable claims).

The discriminating measurement is containment in the upstream mainline mirror —
a fork-native commit would not be on it:

```
$ git -C vendor/tbc-new-fork merge-base --is-ancestor db05fed93 origin/master; echo $?
0
$ git -C vendor/tbc-new-fork rev-parse upstream/feature/backend-reforge origin/feature/backend-reforge origin/master
ec5c5f205e61049d730e460967f8488774a7fe2a   # == lock branchedFrom, hence circular
cbf6b75a889e52c4106351976db66efd914ea349
d7d89da2a2f473f2c9848856f77edb18b2a86025
```

`db05fed93` — "feat(balance+feral): add Starfire Rank 6 + add new Balance APL +
fix adamantite weightstone not giving paw damage", Bisonpasfuté, 2026-05-23 — is
an ancestor of `origin/master` (`origin/HEAD -> origin/master`, the fork's
mirror of wowsims master), and touches `assets/database/db.bin`,
`proto/common.proto` and both druid test-results files: an upstream-shaped
change, not a local edit. So the defect reaches us from upstream rather than
being introduced in the fork.

**What is NOT claimed:** the author's affiliation. `Bisonpasfuté` is a
contributor name, not evidence of upstream membership — the containment in
`origin/master` is what carries the claim.

## The fix, and why it is not this branch

The fix is to grant the bonus for 29453 as well as 34340 in
`weaponImbueFlatDamage`.

**Editing `sim/druid/forms.go` moves feral sim numbers.** `GetCatWeapon` and
`GetBearWeapon` fold that value into unscaled main-hand damage before the divide
by swing speed, so it arrives as roughly `12 / swingSpeed` per paw swing. Any
change pairs with a re-baseline of the committed feral fixtures and recorded
results, which is its own piece of work — see ticket 353's re-baseline path.
That is why this is filed rather than fixed here.

It is also the precondition ticket 351 named: while this stands, mirroring
upstream's `adjustWeaponImbueID` would *introduce* a sharp-vs-blunt asymmetry,
because a dagger candidate rewritten to 29453 would lose a bonus blunt
candidates keep. 351's recorded decision is therefore not to mirror yet.

## What to do

1. Add 29453 to `weaponImbueFlatDamage` in `vendor/tbc-new-fork/sim/druid/forms.go`.
2. Re-baseline the feral fixtures and any recorded results that move.
3. Consider upstreaming it, since the defect is upstream's (provenance above).
4. Then revisit ticket 351 step 2, which is blocked on this being settled.

## Acceptance

- [ ] `weaponImbueFlatDamage` grants the bonus for both Adamantite stone ids.
- [ ] Feral fixtures/results re-baselined, with the DPS movement recorded.
- [ ] Ticket 351 step 2 revisited with this no longer in the way.

## Notes

Answered ticket 351's step-1 reading question. Related: 351 (the ticket that
asked it), 353 (re-baselining committed sim numbers), 350 (the other finding
from the same pass).
