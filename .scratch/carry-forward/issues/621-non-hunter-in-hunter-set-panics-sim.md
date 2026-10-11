Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Out-of-scope)
Type: defect
Origin: ticket 311 close, 2026-10-11 (check of the seven unguarded `agent.(HunterAgent)` assertions named in 311's 2026-08-29 note)
Blocks: none
Blocked by: none
Related: 311, 532, 573

# Wearing 4 pieces of another class's set (Beast Lord, Cryptstalker, Bold Armor) panics the sim

## What happens

Some upstream set bonuses assert the wearer's class with no comma-ok
guard. At fork `316326a95`:

- `sim/hunter/item_sets.go`, `agent.(HunterAgent).GetHunter()`:
  Cryptstalker Armor (set 530) 4pc, `:25`, and 6pc, `:63`; Beast Lord
  Armor (set 650) 4pc, `:96`.
- `sim/warrior/items.go:24`, `agent.(WarriorAgent).GetWarrior()`: Bold
  Armor (set 653) 4pc.

`applyItemSetBonusEffects` (`sim/core/item_sets.go:206-231`) applies every
set bonus whose piece count is met, with no class check (it checks only a
required profession). It also applies the bonuses of item-swap gear. So a
player of another class who wears 4 pieces of one of these sets reaches an
unchecked assertion, and Go panics with `... is not <class>Agent`, the
message ticket 311 recorded for Beast-tamer's Shoulders.

For Bold Armor the panic is measured: ticket 532's red run (closed) records
"Bold Armor 5pc, ret paladin | FAIL:
`*retribution.RetributionPaladin is not warrior.WarriorAgent`,
`sim/warrior/items.go:24`" (`532-off-class-cryptstalker-sims-fail.md:243`).
For the hunter sets the panic is read from the code; no sim was run for
this ticket.

Two related failures that are not this assertion:

- Cryptstalker 2pc fails on another class with a nil pointer dereference
  (`sim/core/spell_mod.go:790`), measured in ticket 532.
- Bold Armor 2pc does not panic on a paladin but changes its DPS: the
  shout cost mask names unrelated paladin spells (532's reviewer F3,
  372.951623 against the no-bonus 371.769934; `532-...md:260-262`).

## Who can wear these pieces

No piece of these sets has a `classAllowlist` in
`vendor/tbc-new-fork/assets/database/db.json` (only the Ring of the
Cryptstalker, 23067, has `[3]`). The fork's `canEquipItem`
(`ui/sim/proto/items.ts:41-45`) refuses an item only through that list, so
`data/equip-eligibility.json` (exported from `canEquipItem`) lists:

- all 5 Beast Lord pieces and all 8 Cryptstalker armor pieces for
  DpsWarrior, ProtectionWarrior, RetributionPaladin, HolyPaladin,
  ProtectionPaladin, ElementalShaman, EnhancementShaman and
  RestorationShaman;
- all 5 Bold Armor pieces (27475, 27803, 27977, 28205, 28350) for
  HolyPaladin, ProtectionPaladin and RetributionPaladin, as well as the two
  warrior specs. Re-run:
  `python -c "import json;d=json.load(open('data/equip-eligibility.json'));b={27475,27803,27977,28205,28350};print({s:len(b&set(v)) for s,v in d['specs'].items() if b&set(v)})"`.

So the site's gear picker lets those specs equip them (read from the code
and the export; not clicked in the site).

## What the tab does today

The tab's candidate lists never offer these pieces to another class:

- No `*.universe.json` under
  `vendor/tbc-new-fork/ui/features/upgrades/model/data/` holds any Beast
  Lord piece (27474, 27801, 27874, 28228, 28275) or any Bold Armor piece,
  the hunter and warrior lists included. Re-run:
  `grep -lw -e 28228 -e 28205 vendor/tbc-new-fork/ui/features/upgrades/model/data/*.universe.json`
  prints nothing.
- Cryptstalker pieces are only in the hunter lists, because
  `data/class-restricted-sets.json` names set 530 as hunter-only and
  `scripts/assemble_universe.py:1503-1511` drops it from other classes.

So a candidate swap cannot raise another class's count to 4. The panic is
reached only when the player's own worn or item-swap gear already holds 4
pieces, and then every sim of that character on the site fails, not only
the tab's. What the tab shows for a baseline that panics was not checked
(hypothesis, untested: the run fails with an error).

## The fix and the decision

The only fix that helps the whole site is a comma-ok guard in the upstream
wowsims files. The guards already exist on the parked fork branch
`fix/engine-item-swap-and-off-class-guards` at `fa57ef5b7` (ticket 573):
all seven hunter assertions 311 listed plus the Cryptstalker 2pc and 8pc,
and the Bold Armor 2pc and 4pc. Re-run:
`git -C vendor/tbc-new-fork diff 42c75dc9 fa57ef5b7 -- sim/hunter/item_sets.go sim/warrior/items.go`.

Decided by the session on 2026-10-11: no work is planned on this ticket.
It stays open and filed, and the fix stays on the parked branch. The
reason is the owner's rule for upstream engine fixes, session `ef13ce60`,
2026-10-08T16:03Z:

> Wowsims engine fix ideas are ok but they are not at all the focus,
> they're not at all what I asked for, and should be filed away
> separately.

(`.scratch/handoffs/cleanup-upstream-footprint-HANDOFF.md:201`;
`.scratch/stage-gate/565-upstream-sync-tanstack/owner-words.md:98`.)

## Done when

Ticket 573 closes. If its decision lands the guards in the fork or
upstream, close this ticket as fixed with it; if the branch is deleted,
close this ticket with that decision recorded.
