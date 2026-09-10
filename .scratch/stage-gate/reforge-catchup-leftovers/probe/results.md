# Q1 — what the fork engine does with a 2H + off-hand equipment spec

Executed 2026-09-10 on `feat/reforge-catchup-leftovers`, repo root
`C:\Users\dgree\Code\lulz\tbc-gear-prio` (`R`), fork clone
`R\vendor\tbc-new-fork` (`F`) at `6ef5679888430118895d59043e81e542d61c7527`.

Every command below was run in this session and its output pasted. No line
number here was taken from a handoff document.

## Inputs available

```
$ ls test/fixtures/*.raid-sim-request.json
test/fixtures/shredzepelin-cat.raid-sim-request.json
test/fixtures/slamaltman.raid-sim-request.json
```

Player keys and weapon slots, read with `python -c`:

| Fixture | Player key | index 14 (main hand) | index 15 (off hand) |
| --- | --- | --- | --- |
| `shredzepelin-cat.raid-sim-request.json` | `feralCatDruid` | 28658 | absent |
| `slamaltman.raid-sim-request.json` | `retributionPaladin` | 28430 | absent |

Both pin `simOptions` `{iterations: 3000, randomSeed: "42", debugFirstIteration: false}`.

```
$ ls data/presets/*/p2.raid-sim-skeleton.json
data/presets/feral/p2.raid-sim-skeleton.json
data/presets/ret/p2.raid-sim-skeleton.json
```

**Correction to the plan's C27.** The plan states the only skeleton
`cli-wiring.ts` can load is feral. There are two — feral and ret. The
conclusion is unaffected, though the reason needs stating carefully (corrected
at the pre-merge review, finding D2): it is **not** that a druid or paladin
cannot physically equip an off-hand item — feral-p3 carries 11
`HandTypeOffHand` held items (*Talisman of Nightbane*, *Fathomstone*,
*Blind-Seers Icon* and others), and a druid can wear them in TBC. It is that
`DUAL_WIELD_SPECS` (`packages/core/src/pool.ts`) omits feral and ret, so
`simSlotsForPoolSlot` never offers either spec an off-hand **placement**. The
ranker therefore cannot compose a 1H+OH set for them, which is what Q1 needs —
so neither loadable skeleton can express the set, whatever the specs could wear
in the game.

`packages/core/src/cli-wiring.ts:126-128` loads
`data/presets/${spec}/p2.raid-sim-skeleton.json`, so only those two specs are
loadable at all.

The three dual-wield specs carry EP weights and nothing else:

```
$ ls data/presets/enh data/presets/warrior data/presets/hunter
data/presets/enh:
fallback.ep-weights.json
p3.ep-weights.json

data/presets/hunter:
fallback.ep-weights.json

data/presets/warrior:
fallback.ep-weights.json
p2.ep-weights.json
```

## Why no probe ran

**The spec point.** Ticket 350 is reachable only for the four specs in
`DUAL_WIELD_SPECS`, and the two specs we have inputs for are excluded by
design:

```
$ grep -n -B6 "DUAL_WIELD_SPECS" packages/core/src/pool.ts | head -20
367- * every dual-wielding hunter.
368- *
369- * Ret and feral are absent deliberately: neither can put anything in the off
370- * hand, so `"weapon"` keeps mapping to mainhand alone and their rankings are
371- * bit-for-bit what they were.
372- */
373:const DUAL_WIELD_SPECS: ReadonlySet<SpecId> = new Set<SpecId>([
```

The set is `rogue`, `enh`, `warrior`, `hunter` (`pool.ts:373-378`). Writing an
off-hand item into the feral fixture's index 15 would build a set the ranker
never composes, so the result would describe the Go equip layer's handling of
an arbitrary proto rather than our path.

**The hand-authoring point.** A request for an enh, warrior or hunter player
would have to be written by hand. `packages/core/test/direct-sim-support.ts:15`
warns against exactly that:

> hand-built character JSON (the ticket 106 style) can differ from what
> `rank.ts` actually sends in gems and buffs

So both halves of Q1 — whether the off-hand stats count, and whether the
off-hand swing happens — are **unmeasurable from committed inputs**.

## Reading

Reading only. Nothing in this section was executed as a sim.

**No hand-type check gates the off-hand weapon.** `IsDualWielding` is set from
the off-hand swing speed alone:

```
$ grep -n "IsDualWielding" F/sim/core/attack.go | head -3
405:	IsDualWielding bool
441:		IsDualWielding: options.OffHand.SwingSpeed != 0,
```

**The only filter is the off-hand item's own weapon type**, in
`F/sim/core/character.go:560-568`:

```go
func (character *Character) GetOHWeapon() *Item {
	weapon := character.OffHand()
	if weapon.ID == 0 ||
		weapon.WeaponType == proto.WeaponType_WeaponTypeShield ||
		weapon.WeaponType == proto.WeaponType_WeaponTypeOffHand {
		return nil
	} else {
		return weapon
	}
}
```

`WeaponFromOffHand` (`F/sim/core/attack.go:108-114`) returns a zero `Weapon{}`
when that is nil. **No caller blanks the off-hand weapon because the main hand
is `HandTypeTwoHand`** — the check does not exist on this path.

That splits the reading by what the worn off-hand item is:

- A **dedicated off-hand item** (`WeaponTypeOffHand`) or a shield → `GetOHWeapon`
  returns nil → zero weapon → `SwingSpeed == 0` → `IsDualWielding` false. No
  off-hand swing. Its **stats still apply**, because stats come from the
  equipment set, not from the weapon struct.
- A **real one-handed weapon** left in the off hand → returned as a weapon →
  non-zero swing speed → `IsDualWielding` true. Reading suggests the swing
  **counts**, alongside the two-hander in the main hand.

**The defensive clear exists only in the bulk generator**, which the `raidsim`
path our engine uses does not pass through (`F/sim/core/bulk/generator.go:335`):

```go
if mh := gear.GetItemBySlot(proto.ItemSlot_ItemSlotMainHand); mh != nil && mh.HandType == proto.HandType_HandTypeTwoHand {
	gear[proto.ItemSlot_ItemSlotOffHand] = core.Item{}
}
```

`F/sim/core/database.go:362-374`, the equip admission path, contains no such
clear.

**This is reading, not measurement.** It says what the code appears to do; it
does not say what a run produces.

## Live observation

**Unavailable — neither rejects nor not-rejects.**

The plan expected the enhancement page to supply a partial Q1 observation: the
tab composes two-hander candidates for enh itself, so a *rejects* outcome would
show as a run error or missing rows. The run never reached that question.

Served the freshly built `F/dist` on `http://127.0.0.1:8099`, opened
`/tbc/shaman/enhancement/`, Upgrades tab, pressed Run. The default gear wears
*Syphon of the Nathrezim* in **both** weapon slots — the 1H+OH shape Q1 needs.
The ranking aborted immediately:

```
Ranking failed: sim error (0): No item with id: 30832 Stack Trace: goroutine 10 [running]:
  ... core.NewItem      F/sim/core/database.go:489
  ... core.toItem       F/sim/core/item_swaps.go:500
  ... core.(*Character).enableItemSwap  F/sim/core/item_swaps.go:57
```

The panic is in the **item-swap** path, not in candidate composition, so it
fires before any two-hander candidate is priced. Cause, read from source:

- `F/ui/shaman/enhancement/sim.ts:96` sets the page default
  `itemSwap: Presets.P1_TRUNCHEON_ITEMSWAP_PRESET.itemSwap`.
- That preset references item 30832 (*Gavel of Unearthed Secrets*) —
  `F/ui/shaman/enhancement/gear_sets/p1.truncheon.itemswap.json:17`.
- `enableItemSwap` (`F/sim/core/item_swaps.go:50-57`) calls `toItem` on every
  swap entry unconditionally, and `NewItem` (`F/sim/core/database.go:485-490`)
  **panics** rather than erroring when the id is absent from `itemsByID`.
- The request's embedded `SimDatabase` is built by ticket 212's
  `simDatabaseFor` from the *composed equipment* only. Item-swap items are
  neither worn nor the candidate, so 30832 never enters the request.

30832 **is** present in `F/assets/database/db.json` and in
`R/data/items/index.json`, so this is a request-assembly gap, not missing data.
It is recorded in ticket 362.

Consequence for Q1: this observation separates nothing. It is not evidence of
rejects, and not evidence of not-rejects.

## What a measurement needs

Recorded so the future fixture (ticket 365) is not built to the wrong shape.

- **A stat-only off-hand delta cannot be resolved at the fixture's iteration
  count.** The committed feral result has `dps.avg = 2152.0765440146747`,
  `stdev = 127.9659250680645`, `iterationsDone 3000`, so the 3σ floor on the
  mean is `3 · 127.966 / √3000 = 7.01 DPS`. A +8 Agility off-hand on a ~2152
  DPS character sits well inside that.
- **The effect must be the off-hand swing**, not the off-hand stats: a 1H+OH
  set versus the same set with a two-hander in the main hand and the off hand
  left in place.
- **Compare with a tolerance, never exact equality.** Same seed, same
  `simVersion` and same core count give bit-identical results, but across core
  counts the sim splits iterations over `runtime.NumCPU()` shards and agrees
  only to ~1e-12 DPS (`R/docs/plans/compute-topology.md:177`); the standing
  rule at `:207-209` is that live-binary float assertions use `toBeCloseTo`.
- **Raise iterations** until the 3σ floor is well under the expected effect.
- Runner: the pinned CLI, `R/vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64`.

**Scope of that word, added at the pre-merge review (finding A4).**
"Unmeasurable" here means *not without hand-authoring a request* — it is not a
claim that the question is unanswerable in principle. Two things would reverse
it: fixing ticket 362, which would restore the live enhancement observation
this run lost, or building the recorded dual-wield fixture ticket 365 asks for.
The barrier is that a hand-built request is not what `rank.ts` sends
(`packages/core/test/direct-sim-support.ts`), which is a reason to distrust a
hand-built measurement, not a proof that none can exist.

OUTCOME: unmeasurable-from-committed-inputs
