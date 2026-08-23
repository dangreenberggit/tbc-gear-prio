Status: closed
Type: wasted work (measured)
Origin: fix-round review of `feat/candidate-pool`, Carmack axis, 2026-08-15
Blocks: none
Blocked by: none

# Racing throws away the screening pass's most useful outputs

`screenCandidate` (`packages/core/src/rank.ts`) tries every slot in
`simSlotsForPoolSlot` and returns a bare `number` — the max delta. It discards
two things it already had:

1. **The winning slot.** `runCandidate` then re-tries *every* slot at full
   iterations. For paired slots (finger, trinket) that is a second
   full-iteration sim per candidate whose screening already ranked the two
   placements. Screening at 1000 iterations discriminates finger1-vs-finger2
   far better than it discriminates global rank 149 from 151 — a judgement
   the branch already trusts it for. **Estimated: 169 full sims → ~132, about
   13% more wall-clock on WASM**, for one extra field on a return type.
2. **`stdev`.** Screened rows ship a hardcoded `se: 0`
   (`rank.ts`, screened-row builder). The screen measured a real stdev;
   `stdev/√iterations` is a defensible screening SE. Shipping `0` states
   false precision on the one row type whose whole point is that it was
   measured imprecisely. Either carry the number or make the field optional.

Per-sim cache keys include iterations (F6), so screens and full sims are
distinct rows and both persist — across runs that is real reuse and worth
having. **Within** a run, the 277 screening observations collapse to 240
scalars and are then unreferenced.

## Done when

- [ ] The screened winning slot is reused by the full-iteration pass, or a
      measurement shows why it cannot be.
- [ ] Screened rows carry an honest SE or an explicitly absent one.
- [ ] The full-sim count on the ret tuning fixture is re-measured and recorded
      against the current 169.


## Closed 2026-08-23 — moot: racing is gone from the fork engine

Racing was deleted from the fork's ported engine in fork commit `f70378155`
("Remove racing; full-sweep every eligible candidate"), porting core's
`28b00f9` / ADR-0026. `screenCandidate`, the screening progress stage,
`screeningSkips`, the promotion rule and `promotion.ts` are all gone, and E-W3
passes against core with the screening path removed.

There is no screening pass left to reuse outputs from or to emit progress for,
so this ticket describes code that no longer exists. Q1 in the finish-the-tab
plan reached the same place by its pre-stated rule: candidate (c), the full
sweep, wins. The fork-side racing-vs-full-sweep comparison was never measured —
see ticket 273 — but it cannot reopen the deletion, which rests on ADR-0026's
core measurements and the E-W3 parity the removal passed.
