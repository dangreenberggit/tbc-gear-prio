Status: closed
Closed: b16e0b1
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 6 (adversarial 6-A1)
Blocks: none
Blocked by: none

# Two owned zero-delta rows make the whole slot vanish, warning and all

`cfc77c9` fixed round-2 finding 2-A1 (the classifier picked an arbitrary
`deltaDps === 0` row as the worn one, which could suppress a real
`set-break-toll`) by resolving ambiguity to `null`. The caller then drops the
slot:

    packages/core/src/dead-slots.ts:140  wornRowOf -> null when zeroed.length !== 1
    packages/core/src/dead-slots.ts:172  if (!wornRow) continue;

So an arbitrary pick became a **silent drop**. The observable outcome is the
same as the bug it replaced: the slot disappears from `classifyDeadSlots`,
`deadSlotWarnings` returns `[]`, and a dead slot with a real `set-break-toll`
produces no warning, no error, and a clean-looking report.

Reproduced against `dist/` — two equipped rings, both identity swaps:

    rows = [ {finger, 100, deltaDps: 0, owned: true},
             {finger, 200, deltaDps: 0, owned: true},
             {finger, 300, deltaDps: -300} ]
    classifyDeadSlots(rows, {})  ->  []

**This is reachable on every run for a common gear shape.** `owned` is
item-id based (`rank.ts:704`), and the paired-slot dedupe guard
(`rank.ts:730`) leaves each equipped ring or trinket with only its identity
swap — i.e. `deltaDps === 0, owned: true`. Any character wearing two rings
that are both in the pool hits it.

The commit message argues `null` is "the honest outcome when the worn item
cannot be identified". But here the ambiguity is an artifact of grouping by
**pool slot** (`finger`) while `owned` is **per item**; both rows are correctly
identified worn items. The honest outcome is two dead-slot entries, or one per
equipped item — not silence.

The fix's own tests never construct a two-`owned` slot, which is why it shipped
green.

## Fix

Group by equipped item rather than by pool slot for paired slots, or return one
`DeadSlot` per owned zero row. Whatever the shape, a slot that cannot be
classified must still produce a warning — dropping it is the failure mode the
original finding was filed about.

Cross-reference open ticket 86: different call site (`piecesAfterSwap` in
`applySetContext`), same root ambiguity in what `owned` means.

## Resolution (b16e0b1)

`wornRowOf` became `wornRowsOf`, returning every owned zero row, and
`classifyDeadSlots` emits one entry per worn item instead of dropping the slot.
The ambiguity was an artifact of grouping by pool slot while `owned` is per item
id -- both rows were correctly identified worn items.

Test observed failing before the fix and passing after:

    pnpm vitest run packages/core/test/dead-slots.test.ts \
      -t "classifies both worn rings"

Pre-fix output: `AssertionError: expected [] to deeply equal [ 11934, 11979 ]`.
