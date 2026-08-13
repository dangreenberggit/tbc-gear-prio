Status: open
Type: gap
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/03-verify.md` task 3)

# Dead-slot classifier silently skips dual-slot buckets and unrankable worn items

The ret artifact (re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`)
has exactly two dead slots (no positive candidate), and `classifyDeadSlots`
drops **both** before classification, for two different unrecorded reasons:

1. **`ranged`** (n=4, best −13.81): the worn Libram of Avengement 27484 is
   not in the ret-p3 universe, so no row has `deltaDps === 0`, `wornRowOf`
   returns null, and the slot is skipped (dead-slots.ts:140-145 — the
   documented "honest" outcome; ticket 41's worn-item-uncomparable case).
   Would have been thin-pool territory if classifiable.
2. **`trinket`** (n=21, best 0.00): both worn trinkets (28830, 29383) rank at
   exactly 0, so `wornRowOf` finds two zeroed owned rows → ambiguous → null →
   skipped (dead-slots.ts:172-173). **Structural: the merged two-slot trinket
   (and finger) bucket always has two owned rows, so those slots can never be
   classified for any character** whenever both owned rows tie. Feral never
   hit this (its trinket slot had positive candidates).

Both skips are deliberate design (ambiguity resolves to null rather than a
fabricated verdict — the cfc77c9 lesson), so no wrong warning is emitted.
The gap is that the plausibility layer's silence now rests on blind spots:
plausibility.ts:60-63's own comment already warns "treat a missing warning as
weak evidence", and on ret that is literally the situation for 2/2 dead
slots. Severity low — filed because the trinket case is structural, not
fixture luck.

Sketch, hypothesis/untested: (1) let `wornRowOf` accept multiple owned rows
for dual-slot buckets and classify against the better of them; (2) when the
worn item is absent from the universe, classify as its own cause
(`worn-unrankable`, warned in its own words) rather than skipping — parallel
to how `unknown-item` was carved out.

## Acceptance criteria

- [ ] The ret artifact's trinket and ranged slots receive classifications
      (or explicitly-warned skip causes), pinned by tests built from this
      artifact's shapes.
- [ ] No fabricated verdicts: ambiguity that cannot be resolved still warns
      as "unclassifiable", never guesses.
- [ ] `pnpm verify` green.
