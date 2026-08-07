Status: closed
Type: bug
Origin: sme-rank-review on phase-2/trust (PLAN.md §14 Phase 2, gate box "≥3 real characters produce believable shortlists")
Blocks: phase-2
Blocked by: none

# A worn ring is duplicated into the other finger and sold as an upgrade

Found by `sme-rank-review` on two characters at once, both of which returned
**do-not-trust** and both of which led with this row:

- [`../../handoffs/sme-rank-judgment-ret-slamaltman.md`](../../handoffs/sme-rank-judgment-ret-slamaltman.md)
- [`../../handoffs/sme-rank-judgment-feral-nexess.md`](../../handoffs/sme-rank-judgment-feral-nexess.md)

It is a **ranking-engine** bug, not a pool bug, and it is not ticket 41. Ticket
41 is about worn items *missing* from their universe. This is a worn item that
is present, comparable, and **scored against a copy of itself**.

## What a player sees

| character | ring he is wearing | shown at | claimed gain |
|---|---|---|---|
| slamaltman (ret) | Shapeshifter's Signet | **#2** | **+22.40 DPS (1.12%)** |
| nexess (feral) | Ring of Lethality | #12 | +8.48 DPS (0.40%) |

For slamaltman that is the second-largest number on the board. Both rows carry
`owned: true`, so the engine knows he is wearing it and prints the gain anyway.

## The mechanism

`simSlotsForPoolSlot` correctly returns **both** finger slots
([`pool.ts:193`](../../../packages/core/src/pool.ts:193)), and the candidate
loop keeps the **best** of the two swaps
([`rank.ts:499`](../../../packages/core/src/rank.ts:499)). For a ring the
character already wears in `finger2`:

- swapping it into `finger2` is an identity swap → delta `0.00`
- swapping it into `finger1` **replaces the other ring with a second copy** →
  a real, positive sim delta

`max(0, +22.40)` wins, so the false row is what ships. The sim is not wrong; it
is being asked to equip two copies of one ring, which the game does not allow
(both are unique-equipped in any case).

This is why the stronger of the two worn rings is always the one that appears.
In both characters the finger2 ring outclasses the finger1 ring:

| character | finger1 (scores 0) | finger2 (scores a false gain) |
|---|---|---|
| nexess | Overseer's Signet | Ring of Lethality |
| slamaltman | Ring of a Thousand Marks | Shapeshifter's Signet |

`owned` is computed at [`rank.ts:445`](../../../packages/core/src/rank.ts:445)
and used only as a display flag at
[`rank.ts:544`](../../../packages/core/src/rank.ts:544). Nothing consumes it to
constrain the swap, and `equipmentForCandidateSwap` →`swapItemAt` does not
dedupe against the rest of the equipment array.

## Why trinkets are unaffected

Trinkets take the same both-slots path and come out correct — every worn
trinket on both characters scores exactly `0.000`. The difference is that both
characters wear two trinkets of comparable value, so no duplication beats the
identity swap. **Trinkets are not structurally safe; they got lucky.** A
character wearing one strong and one weak trinket would show the same false row.

Same for any future paired slot.

## Reproduce

Ranks are committed under `.scratch/rank-reports/`:

```bash
python -c "
import json
for c in ['nexess','slamaltman']:
    d=json.load(open(f'.scratch/rank-reports/sme-2026-08-06-{c}.json'))
    print('==',c)
    for it in d['ranking']['items']:
        if it.get('owned') and it['deltaDps'] != 0:
            print(f\"   rank={it['rank']} {it['name']} slot={it['slot']} choice={it.get('slotChoice')} delta={it['deltaDps']:.2f}\")
"
```

Expected after the fix: **no output** — no owned item may carry a non-zero
delta. To regenerate the ranks (~15 min each, offline from committed fixtures):

```bash
pnpm rank --region US --realm dreamscythe --character slamaltman --offline
pnpm rank --region US --realm dreamscythe --character nexess --spec feral --offline
```

## The fix

A candidate swap must never produce equipment holding two copies of one item.
The narrow version is to skip a slot attempt when the item is already equipped
in a *different* slot of that pair, which leaves the identity swap (delta 0) as
the only outcome for a worn ring — matching what every non-paired slot already
does today.

Worth preferring a check that reads on the equipment array rather than one
special-cased to fingers, so trinkets and any later paired slot inherit it.

Note that a delta of exactly `0.00` for a worn item is also not ideal as
*advice* — "your own ring is a 0 DPS upgrade" is a strange row to print — but
that is a presentation question and is out of scope here. This ticket is about
the number being **wrong**.

## Fixed 2026-08-06 on `phase-2/trust`

`3c18776` (guard + regression test) and `4bde8f2` (`ENGINE_VERSION` bump).

The guard sits in the candidate loop, before the swap is composed: if the item
is already worn at a *different* slot index, that placement is skipped, leaving
the identity swap as the only outcome. It reads off the equipment array rather
than naming fingers, so trinkets and any later paired slot inherit it.

**`ENGINE_VERSION` 1 → 2 was part of the fix, not housekeeping.** The change
moves our own arithmetic and no hashed input, so `contentHash` was byte-identical
before and after — confirmed on both re-ranked characters. Without the bump a
cached ranking would serve the false row forever, which is precisely what that
constant's comment warns about.

Re-ranked both characters offline from the committed fixtures. Exactly **one row
changed on each**, and every other delta is bit-identical:

| character | row | before | after |
|---|---|---|---|
| slamaltman | Shapeshifter's Signet (was #2) | +22.40 | **0** |
| nexess | Ring of Lethality (was #12) | +8.48 | **0** |

Both now resolve to the finger they are actually worn in (`slotChoice:
"finger2"`) and fall below the cutoff, so neither appears on the shortlist.
slamaltman's shortlist went 13 → 12 rows, nexess's 15 → 14. Baselines unmoved.

`pnpm verify` green: **358 tests, 32 files**.

Verification command from "Reproduce" above now prints nothing for both
characters.

**The two do-not-trust verdicts are not lifted by this.** Each review raised
findings beyond the ring — see ticket 47 — so the "≥3 real characters produce
believable shortlists" gate box stays open pending a re-review.

## Done when

- No item with `owned: true` reports a non-zero delta, on any character.
- A regression test pins the paired-slot case: a character wearing a strong ring
  in `finger2` and a weak one in `finger1` must not rank the worn ring as a gain.
  The test belongs at the `rankUpgrades` interface through the recorded
  adapters, per AGENTS.md § Testing.
- Both shortlists are re-ranked and re-reviewed, since every number below the
  false row inherits the doubt it casts.
