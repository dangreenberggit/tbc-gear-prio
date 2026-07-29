Status: open
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

## Notes

- Prefer UI-style applicability when worn **has** an enchant (weaker
  `isEnchantable` only today) — separate from “bare → none.”
- Closest open product gap from the same research: **new-item gem fill** vs
  UI keeping worn gems — top hypothesis for “real upgrade looks like a
  downgrade.”
