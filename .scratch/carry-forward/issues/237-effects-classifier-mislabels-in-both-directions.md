Status: open
Type: bug (data artifact labels; no shipped-code impact yet)
Origin: ticket 226 diagnostics, 2026-08-19 — both directions confirmed by
  direct sims against the pin, per 226's "cite a run, not a reading of Go"
  requirement; handoff at `.scratch/handoffs/ticket-226-direct-sims.md`
Blocks: none
Blocked by: none

# `sim-implemented-effects.json` is wrong in both directions, and a sim proves it

`data/sim-implemented-effects.json` sorts item ids into
`implementedEffectItemIds` and `stubOnlyItemIds`. Ticket 226's diagnostics
found the artifact misleading in **both** directions on the same fixture, and
in each case a direct sim against the pinned `wowsimcli` v0.0.101 settled it
rather than a reading of the Go source.

The file's own `_comment` already warns that the lists are informational and
that `assemble_universe.py` does not consult them. This ticket is not that
caveat — it is two specific, measured errors.

## Direction 1: a real effect classified as neither

Wolfshead Helm (8345) appears in **neither** list:

```
python -c "import json; d=json.load(open('data/sim-implemented-effects.json')); print(8345 in d['implementedEffectItemIds'], 8345 in d['stubOnlyItemIds'])"
# False False
```

Its +20-energy-on-shift is fully implemented in the pinned fork, but through
`HasItemEquipped` inside the druid form code rather than through
`core.NewItemEffect`, which is the shape `scripts/generate_sim_implemented_effects.py`
recognises:

```
grep -n "8345\|Wolfshead" vendor/tbc-new-fork/sim/druid/forms.go
# 92:	wolfsheadEquipped := druid.HasItemEquipped(8345, []proto.ItemSlot{proto.ItemSlot_ItemSlotHead})
# 147:					// Wolfshead Helm: +20 energy on shift into Cat.
```

**The effect measurably fires.** Emptying the head slot on the feral P3
baseline costs **284.06 DPS** at 30,000 iterations — far more than the helm's
stat line is worth, and the reason eighteen candidate helms in ticket 226 look
like a cliff:

```
npx tsx packages/core/test/measure-ticket-226-direct.ts --part b
```

So the generator's pattern match misses a whole class of implementation:
class-specific effects wired directly into spec code by item id.

## Direction 2: `impl` items that contribute exactly nothing

Ten trinkets on the feral P3 fixture share a delta of -31.33 DPS, and all of
them are in `implementedEffectItemIds`. Three were re-simmed directly at
30,000 iterations and each returns **1920.64 DPS — byte-identical to emptying
the trinket slot entirely**:

```
npx tsx packages/core/test/measure-ticket-226-direct.ts --part c
# trinket1 emptied (was 28034)              1920.64 DPS  Δ -33.92
# 28528 Moroes' Lucky Pocket Watch          1920.64 DPS  Δ -33.92
# 32486 Ashtongue Talisman of Equilibrium    1920.64 DPS  Δ -33.92
# 32496 Memento of Tyrande                  1920.64 DPS  Δ -33.92
```

Wearing them is indistinguishable from wearing nothing. `impl` means "a
registration exists somewhere in the fork", not "this proc fires for this spec
in this rotation" — and the label reads as the latter.

The same shape appears on the ret P2 row (28528, 28785, 30621 all at -47.73),
so this is not feral-specific.

## Why it matters

Ticket 226 used these labels as its first lead and had to discard them:
`stub` on Wolfshead pointed away from the real explanation, and `impl` on the
trinkets pointed away from the fact that they contribute nothing. Ticket 171
reached a correct conclusion partly *because* the labels happened to agree
with it that time. A reader who trusts the labels will be misled in either
direction.

Nothing ships off this file today — `assemble_universe.py` does not read it —
so this is a correctness problem in a diagnostic artifact, not a user-facing
bug. It is filed because the next person to debug a scoring shape will reach
for it exactly as ticket 226 did.

## Acceptance criteria

- [ ] `scripts/generate_sim_implemented_effects.py` recognises effects wired
      by `HasItemEquipped(<itemId>, ...)` in spec code, not only
      `core.NewItemEffect`. Wolfshead Helm (8345) must land in
      `implementedEffectItemIds` after the change, and the regenerated file
      must pass `pnpm verify`'s byte-compare gate.
- [ ] Decide and record what `implementedEffectItemIds` is claiming. If it
      cannot mean "this proc contributes for this spec" — and the trinket
      measurement shows it cannot — then either rename the key or extend the
      `_comment` so the limitation is stated where a reader will hit it,
      rather than being rediscovered by a sim.
- [ ] Re-run the two commands above and confirm the labels now agree with the
      measurements, or record why a remaining disagreement is acceptable.

## Out of scope

- Changing pool membership rules on the strength of these labels. Ticket 171
  already excludes stub-only items; whether inert-but-`impl` items should also
  be excluded is ticket 227's product question, not this one.
- Re-pinning `vendor/tbc-new-fork`.
- Ticket 226's three shapes, which are diagnosed and closed.

## Renumbered from 233 (2026-08-19)

Filed as `233`, colliding with the adaptive-CI screening ticket that ticket
225 had already given that number. Renumbered to `237`; the citations in
tickets 226, 227 and 234 and in
`.scratch/handoffs/ticket-226-direct-sims.md` were updated to match.
