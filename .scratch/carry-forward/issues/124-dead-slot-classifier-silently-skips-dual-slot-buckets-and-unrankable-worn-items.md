Status: open (part 1 done; part 2 remains)
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

- [x] The ranged slot receives a classification (or an explicitly-warned skip
      cause), pinned by tests built from this artifact's shapes. Done on
      `feat/ret-p3-data` commit `2e6b257`, part of closing ticket 163: a new
      `worn-unrankable` `DeadSlotCause`, fed by `classifyDeadSlots`'s new
      `wornUnrankable` option, populated in `rank.ts` by diffing
      `equippedIds` against ranked item ids and resolving survivors through
      `getItem`. Re-ran the real ret-p3 ranking
      (`.scratch/handoffs/wowsims-tab/ret-p3-ranking/`, PROVENANCE.md updated)
      and confirmed `plausibilityWarnings` now carries a `worn-unrankable`
      entry for `ranged` naming Libram of Avengement, instead of silence.
      Direct unit tests in `dead-slots.test.ts` and `plausibility.test.ts`
      pin the classifier and message at the module interface.
- [ ] The trinket slot's part is **not** done by this change. Its cause is
      different from ranged's: both worn trinkets (28830, 29383) score
      `deltaDps === 0` and tie as the pool's `best`, so `best > 0` is false
      but `wornRowsOf` finds two owned rows in one bucket — a live ambiguity
      inside a normally-classifiable slot, not a worn item missing from the
      pool. `worn-unrankable` does not apply here; the sketch's item 1 (accept
      multiple owned rows for dual-slot buckets, classify against the better
      of them) is still unimplemented. Re-verify with the same command in
      PROVENANCE.md — the current `slamaltman-p3.json` shows both trinket rows
      at `deltaDps: 0`, no `benign-nothing-better`/other classification for
      `trinket`, and no warning fires for it (`plausibilityWarnings` has
      exactly one entry, for `ranged`).
- [x] No fabricated verdicts: `worn-unrankable` states no `wornSetId` (the
      pool-based set-toll join never ran for it) and does not claim
      "no positive candidate" when a row happens to look positive — see the
      `dead-slots.test.ts` "bypasses the best>0 gate" test.
- [x] `pnpm verify` green (typecheck, lint, format, 769 tests, all script
      gates) on commit `2e6b257`.
