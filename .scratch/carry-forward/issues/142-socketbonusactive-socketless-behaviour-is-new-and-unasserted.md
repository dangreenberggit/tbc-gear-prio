Status: open
Type: cleanup
Origin: docs/reviews/feat-set-bonus-value.md round 5 (domain 5-D2, 5-D4)
Blocks: none
Blocked by: none

# `socketBonusActive` gained a socketless behaviour neither predecessor had

`2f32a2b` consolidated two predicates into one `socketBonusActive`
(`packages/core/src/meta.ts`). The new definition opens with:

    if (sockets.length === 0) return true;

The old `socketsMatch` (meta-repair) had the equivalent. The old
`allSocketsMatched` (candidate-gems) did **not**: with `sockets = []` it fell
through to `sawColoured = false, metaEmpty = false` and returned `false`. So
`layoutScore` flipped `false` -> `true` for socketless items.

Verified: `socketBonusActive([], []) === true`.

Benign today — `layoutScore` then reads `getItem(itemId)?.socketBonus`, and a
socketless item's bonus is an all-zero array scoring 0 EP, so no number moves.
But the commit is framed as one-definition-from-two, and this is a third
behaviour, unasserted and uncommented.

## Fix

Add a test pinning "socketless => vacuously active, contributes 0", and a
one-line comment saying why, so a future socket-bonus change cannot credit a
bonus to an item with nowhere to put a gem.

## Also (5-D4): record what to do when `DetectedSpecId` widens

`SPEC_PREFERRED_METAS` is a one-row table. The comment justifies this with "a
spec the pipeline cannot detect cannot reach this code" — correct today, since
`DetectedSpecId` is `"ret" | "feral" | "feral-tank"`.

The safety rests entirely on that union staying narrow. If a caster spec ever
becomes detectable, the fail-loud path degrades it to an empty meta socket
rather than seating the 34220 the research already establishes — a silent
quality regression rather than an error. Add a line to the comment saying what
to do when the union widens.
