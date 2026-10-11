Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: defect
Origin: ticket 311 close, 2026-10-11 (check of the seven unguarded `agent.(HunterAgent)` assertions named in 311's 2026-08-29 note)
Blocks: none
Blocked by: none
Related: 311, 532, 573

# A non-hunter wearing 4 Beast Lord or Cryptstalker pieces panics the sim

## What happens

Upstream's `sim/hunter/item_sets.go` (fork `316326a95`) asserts
`agent.(HunterAgent).GetHunter()` with no comma-ok guard in these set
bonuses:

- Cryptstalker Armor (set 530) 4pc, `:25`, and 6pc, `:63`
- Beast Lord Armor (set 650) 4pc, `:96`

`applyItemSetBonusEffects` (`sim/core/item_sets.go:206-231`) applies every
set bonus whose piece count is met, with no class check (it checks only a
required profession). It also applies the bonuses of item-swap gear. So a
warrior, paladin or shaman who wears 4 pieces of either set reaches an
unchecked assertion. In Go that assertion panics with
`... is not hunter.HunterAgent`, the same message ticket 311 recorded for
Beast-tamer's Shoulders. The panic is read from the code; no sim was run
for this ticket.

Cryptstalker also fails at 2 pieces on upstream code, for a different
reason: ticket 532 confirmed a nil pointer dereference in its 2pc
(`sim/core/spell_mod.go:790`).

## Who can wear these pieces

None of the pieces of either set has a `classAllowlist` in
`vendor/tbc-new-fork/assets/database/db.json` (only the Ring of the
Cryptstalker, 23067, has `[3]`). The fork's `canEquipItem`
(`ui/sim/proto/items.ts:41-45`) refuses an item only through that list,
and `data/equip-eligibility.json` (exported from `canEquipItem`) lists all
5 Beast Lord pieces and all 8 Cryptstalker armor pieces for DpsWarrior,
ProtectionWarrior, RetributionPaladin, HolyPaladin, ProtectionPaladin,
ElementalShaman, EnhancementShaman and RestorationShaman. So the site's
gear picker lets those specs equip them (read from the code and the
export; not clicked in the site).

## What the tab does today

The tab's candidate lists never offer these pieces to a non-hunter:

- No `*.universe.json` under
  `vendor/tbc-new-fork/ui/features/upgrades/model/data/` holds any Beast
  Lord piece (27474, 27801, 27874, 28228, 28275), the hunter lists included.
  Re-run: `grep -lw 28228 vendor/tbc-new-fork/ui/features/upgrades/model/data/*.universe.json`
  prints nothing.
- Cryptstalker pieces are only in the hunter lists, because
  `data/class-restricted-sets.json` names set 530 as hunter-only and
  `scripts/assemble_universe.py:1503-1511` drops it from other classes.

So a candidate swap cannot raise a non-hunter's count to 4. The panic is
reached only when the player's own worn or item-swap gear already holds 4
pieces, and then every sim of that character on the site fails, not only
the tab's. What the tab shows for a baseline that panics was not checked
(hypothesis, untested: the run fails with an error).

## The fix and who decides it

The fix is a comma-ok guard in an upstream wowsims file, which needs the
owner's OK of the exact edit (no edits to existing wowsims files without
it). The guards already exist: fork branch
`fix/engine-item-swap-and-off-class-guards` at `fa57ef5b7` guards all
seven assertions 311 listed plus the Cryptstalker 2pc and 8pc
(`git -C vendor/tbc-new-fork diff 42c75dc9 fa57ef5b7 -- sim/hunter/item_sets.go`).
Ticket 573 holds the owner's decision on that branch.

## Done when

The owner decides between asking upstream for the guard, approving the
exact edit in the fork, or accepting the panic for this gear, and this
ticket records the decision. If 573's decision covers it, close this
ticket with 573.
