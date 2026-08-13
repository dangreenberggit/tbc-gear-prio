Status: closed
Type: cleanup
Origin: set-bonus 4pc-invisible investigation, 2026-08-10 (`.scratch/set-bonus-value/design-review-2026-08-10.md`)
Blocks: none
Blocked by: none
Closed: 2026-08-10 (commit 426a82e)

# slot dead-zone detector over-collects

Low priority. A mechanical "best delta per slot ≈ 0" scan over-collects
three different phenomena, and any future dead-zone detection must
distinguish them rather than treat gap magnitude as a single signal:

1. **Genuine set-break tolls.** Feral chest/shoulder in every
   setContext-bearing artifact: gaps of −73 to −112 DPS between the worn
   item (0.00) and the runner-up. Caused by every candidate in those slots
   displacing a worn Malorne Harness piece (see ticket 90). Real defect,
   real toll.
2. **Benign "pool has nothing better".** Ret slots (shoulder, head, hands,
   wrist, etc.) show gaps of −0.2 to −16 DPS. Not a toll, not a defect — the
   worn item is simply the best available in that pool.
3. **Unique-effect items with no set at all.** Feral head shows gaps of
   −202 to −220 DPS with no set involved: the worn item is Wolfshead Helm,
   `setId: null`, verified to carry no `setContext` and no set-break note
   (`verification.md` V0c states this explicitly). It is a unique on-shift
   energy effect that no stat-stick candidate can match — structurally
   similar symptom to (1), unrelated cause.

Design review (`.scratch/set-bonus-value/design-review-2026-08-10.md`, §1.4):
"the mechanical detector 'best delta ≤ 0' over-collects badly. The
signature that isolates the [set-break] pathology is a dead zone whose worn
item carries a `setId` that is at or above an implemented threshold,
together with a large runner-up gap." Report items currently carry no
`setId` field (confirmed field list: `rank, itemId, name, slot, source,
deltaDps, deltaPct, se, seMethod, bisTags, belowCutoff, sources,
hitRegression, setContext, belowCutoffInView`), so isolating case (1) needs
a join against the worn item's `setId` in `data/items/index.json`, done in
the engine, not the renderer.

**Untested for ret:** the "benign" classification for ret dead zones rests
on runner-up gap magnitude (−0.2 to −16) alone, not on confirmed absence of
set membership — ret report items carry no `setId` and there is no
committed ret artifact with `setContext` to check against (see the handoff
for corpus limits). A gap under 1 DPS is not worth naming as a toll either
way, but this has not been verified by the `setId` join described above.

Record this so the over-collection is not rediscovered as a "finding" —
future work here should join worn items against `setId` from the start.

## Correction (2026-08-10, adversarial audit): four dead slots, not two

The earlier claim "only chest and shoulder lack positive candidates" is
wrong. A full per-slot sweep of `.scratch/rank-reports/shredzepelin-p3.json`
finds **four** slots with no positive candidate: chest, head, shoulder, and
ranged. Verify:

```
node -e "const j=require('./.scratch/rank-reports/shredzepelin-p3.json');const by={};for(const i of j.ranking.items)(by[i.slot]??=[]).push(i.deltaDps);for(const s of Object.keys(by).sort())console.log(s,by[s].length,Math.max(...by[s]).toFixed(2))"
```

Head is case (3) above (Wolfshead Helm, `setId: null`, already accounted
for). **Ranged is a fourth, previously unrecorded case: pool thinness**, not
a toll and not a unique-effect item — the ranged/idol pool for this universe
has only 4 items and the worn item happens to already be the best of them
(leader Everbloom Idol, `setContext: None`). This is closer to case (2)
"benign — pool has nothing better" than case (1) or (3), but the pool is
unusually small (4 items vs dozens for most slots), which is worth naming as
its own flavour rather than folding silently into case (2).

This **weakens but does not destroy** the "only set-holding slots are dead"
natural experiment used elsewhere in this investigation (e.g.
`worn-set-double-count-trace.md`'s regression table): chest and shoulder
remain the only slots whose **worn item belongs to a set** — that narrower
claim still holds and is what the regression evidence in ticket 92 rests on.
The broader "only two slots are dead" claim does not hold; there are four,
for three different reasons (two set-break tolls, one unique-effect item,
one thin pool).


---

## Disposition (2026-08-10) - FIXED, commit `426a82e`

New module `packages/core/src/dead-slots.ts` classifies **why** a slot is dead
rather than counting dead slots, joining the worn item's `setId` in the engine
(the renderer has no access to `setId` at all). Four causes, matching this
ticket's own correction:

- `set-break-toll` - worn item's set is at or above an implemented threshold
  (feral chest/shoulder, Malorne 640).
- `unique-effect` - no set, runner-up gap past `UNIQUE_EFFECT_GAP_DPS` (-50):
  Wolfshead Helm's slot at -202.
- `thin-pool` - fewer than `THIN_POOL_CANDIDATES` (4) candidates, so "worn item
  is best" says nothing: the feral ranged/idol pool.
- `benign-nothing-better` - a real pool, no set, nothing better; not a defect.

Tests in `packages/core/test/dead-slots.test.ts` cover all four known cases from
`.scratch/rank-reports/shredzepelin-p3.json`.

The set-break classification is now backed by measurement rather than inference:
the Malorne 2pc that every chest/shoulder candidate forfeits is worth
**131.1 +/- 6.6 DPS** (ticket 92), so those slots carry a real toll of roughly
that size - not a measurement fault.

**Still untested for ret**, as the ticket flagged: there is no committed ret
artifact with `setContext`, and the "benign" classification for ret dead zones
still rests on gap magnitude rather than a confirmed `setId` join. The classifier
makes that check possible; running it costs one `pnpm rank` on `ret-p3` with
`--with-set-potential`, **not run here**.

---

## Verification note (2026-08-11, ret catch-up round) — ret dead zones moot in this run, and no toll possible; ticket stays closed

The `setId` join this disposition asked for has now been run, on the first
ret setContext artifact
(`.scratch/set-bonus-value/ret-catchup/03-verify.md` task 3; re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`).

**Benign confirmed by the join, not just by gap magnitude.** 12 of 14 slots
are alive (best delta > 0) — the old ret "dead zones" (shoulder/head/hands/
wrist) are simply not dead in this run. The setId join across all 16 worn
items finds exactly one set piece: 30129 Crystalforge Breastplate (set 629)
at count 1, below any implemented threshold, so **no ret slot can be a
set-break toll**. Nothing reclassifies.

Two classifier blind spots surfaced by the same derivation, recorded here
and filed as **ticket 124** (severity low; reopen-worthy for *this* ticket
only if a ret artifact ever shows a wrongly-suppressed warning, which these
are not — both are silent skips, not wrong verdicts):

- worn Libram 27484 is absent from the ret-p3 universe, so the ranged slot
  is silently dropped before classification (`wornRowOf` finds no zero row);
- both worn trinkets rank at exactly 0 in the merged two-slot trinket
  bucket, so `wornRowOf` is ambiguous → null → skipped; dual-slot buckets
  with tied owned rows are unclassifiable for any character.
