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

## Where it came from

Ticket 342's upstream comparison. Upstream has the rule we lack:
`adjustWeaponImbueID` (`sim/core/bulk/weapons.go`, upstream
`feature/backend-reforge` @ `cbf6b75a8`) rewrites the Adamantite sharpening
stone (29453) / weightstone (34340) pair to match the equipped weapon —
sharpening for Axe/Dagger/Polearm/Sword, weightstone for Fist/Mace/Staff, and
**0** when neither family fits (no weapon, a shield, or an off-hand-only item).
`adjustCandidateImbues` applies it per candidate to both hands. Upstream's own
comment gives the reason: "mirroring the frontend auto-switch so bulk sim combos
use the correct stone." Any other imbue id passes through untouched.

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

- **Not measured in DPS.** Confirmed: the wrong stone is pinned, the field
  reaches the sim, and the counts above are real. **Not** confirmed: that the
  sharpening/weightstone difference reorders any row. The two stones are
  different items, so a difference is expected, but its size is unmeasured.
- **No ranking is known to be wrong.** Directionally, the error is shared by all
  sharp candidates and absent from blunt ones, so it biases sharp against blunt
  within the weapon slot rather than shifting the whole slot uniformly — which is
  exactly the pattern a same-run delta does *not* cancel. Still unmeasured.

## What to do

1. **Measure first, cheaply**: sim one feral weapon-slot dagger candidate twice,
   once with `mhImbueId: 34340` and once with 29453, and record the DPS gap. That
   sizes the whole ticket, and a gap below the row cutoff would justify recording
   a bound instead of building the plumbing.
2. If it matters, add the pure predicates in `packages/core/src/` with their own
   unit tests (the intricate-pure-function case in AGENTS.md), covering the
   zero-when-neither-family-fits branch and the pass-through for any other imbue
   id.
3. Decide where the override enters the composed request — swap-returns-a-patch
   or `composeFor` override — and make the loop, `composeForBulk` and the package
   path share one answer.
4. Re-record the affected fixtures and add one for the sharp-weapon candidate.
5. Update the `disclosure.ts` temporary-enchant note so it no longer asserts
   deltas survive in the pinned-imbue case.
6. Port to the fork copy with the full cycle in `docs/agents/known-traps.md`
   ("Before editing a ported engine file").

## Acceptance

- [ ] The DPS gap between the two Adamantite stones on one feral dagger
      candidate is measured and recorded.
- [ ] Either the imbue follows the candidate weapon's type family (including the
      zero case for off-hand-only items and shields), or the gap is shown
      immaterial and a bound is recorded instead.
- [ ] If implemented: all three compose paths agree, fixtures re-recorded, and
      the `disclosure.ts` note corrected.
- [ ] `pnpm verify` green, E-W3 green on Node >= 22.5.0 (it cannot collect on
      Node 20 — `node:sqlite` is missing).

## Notes

Found by reading, not by a failing test or a bad row. Related: 342 (the
comparison that surfaced this), 350 (the other finding from the same pass), 343
(gem optimizer for candidates — the adjacent "re-tune consumables/gems per
candidate" question, deliberately separate).
