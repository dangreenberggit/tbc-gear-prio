Status: closed
Type: bug
Origin: user review of slamaltman P3 universe rank (post gem-preserve)
Blocks: none
Blocked by: none

# Carry the worn slot’s enchant (including “none”) onto candidate swaps

## Problem

User observed: when ranking a candidate into a slot, if the player has **no
enchant** on that slot, the upgrade can still look like it sims **with** an
enchant (or a better one).

## What research found (2026-07-28)

Primary-source write-up:
`.scratch/handoffs/wowsims-cli-vs-ui-sim-path.md` §5.

On **current tip**, `compose` fully replaces equipment and `swapItemAt` only
sets `enchant` when the worn slot already has one. Skeleton enchants should
**not** leak onto a bare worn slot. Go treats missing/`0` as no enchant.

So the original “skeleton default enchant left in place” mechanism is **not
supported by the code as written**. The user symptom may still be real — but
needs a reproduced request JSON dump (experiment A in that handoff) before we
fix a leak that isn’t there, or we should reframe the bug to whatever the
dump shows (e.g. gem fill mistaken for enchant, UI comparison with different
enchants, incompatible enchant copy when worn *has* an enchant).

## Done when

- Either: a tip repro shows candidate infile with an `enchant` when worn slot
  was bare → fix that path and add a regression test; **or**
- User confirms the visual was something else and this ticket is closed /
  retargeted (e.g. to UI-style `enchantAppliesToItem` on copy, or gem-fill
  vs preserve for new items).

## Closed 2026-08-02 — the leak does not exist; the likelier cause is fixed

Took the ticket's own instruction and reproduced against tip before changing
anything. **The bare-slot leak is not real, and this is a measured negative,
not an absence of evidence.**

The skeleton is not innocent — `p2.raid-sim-skeleton.json` carries an enchant
in **nine** slots:

```
[[0,3003],[2,2986],[3,368],[4,2661],[5,2647],[6,684],[8,3012],[9,2657],[14,2673]]
```

Composing a player who wears one item in **slot 0** (which the skeleton
enchants with 3003) and has no enchant of their own:

```
worn slot 0 was bare of enchant; composed = {"id":28430}
enchants anywhere in composed request: 0
```

`compose` assigns `slot.equipment = {items: ...}` wholesale rather than
merging into the skeleton's, so nothing of the skeleton's equipment survives.
The originally hypothesised mechanism cannot fire.

Pinned as a regression test in `compose.test.ts` ("does not leak the
skeleton's enchants onto bare worn slots"), which asserts the skeleton
genuinely has enchanted slots first, so it cannot pass vacuously.

### What the user most likely saw

The ticket's own Notes line — "prefer UI-style applicability when worn *has*
an enchant" — describes a defect that **was** real and is now fixed under
ticket 15: `swapItemAt` gated on `isEnchantable(itemId)`, which is
slot-level, so a worn 2H enchant (e.g. Savagery) was copied onto a candidate
one-hander that cannot carry it. That is a wrongly-*copied* enchant, matching
"the upgrade sims with a better enchant than it should," and it needed the
worn slot to have an enchant — not to be bare.

`rank.ts` now calls `enchantAppliesToItem`, the port of the UI's rule.

### Still open elsewhere, deliberately

The Notes' last line — new-item **gem fill** vs the UI keeping worn gems —
is a different mechanism and is not closed by this. It is unrelated to
enchants and belongs in its own ticket if it is still wanted.

## Notes

- Prefer UI-style applicability when worn **has** an enchant (weaker
  `isEnchantable` only today) — separate from “bare → none.”
- Closest open product gap from the same research: **new-item gem fill** vs
  UI keeping worn gems — top hypothesis for “real upgrade looks like a
  downgrade.”
